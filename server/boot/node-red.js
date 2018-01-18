/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/* eslint-disable no-console, no-loop-func */
var nodeRed = require('loopback-connector-nodes-for-Node-RED');
var loopback = require('loopback');
var _ = require('lodash');
var messaging = require('../../lib/common/global-messaging');
var uuidv4 = require('uuid/v4');
var fs = require('fs');
var path = require('path');
var async = require('async');
var _log = require('oe-logger')('node-red');


// Atul : this function returns value of autoscope fields as concatination string.
// This should been made as utility function and should not tied to node-red in general.
// file name is changed to zzz-node-red.js to ensure that node-red is started after all data is loaded. needs to think better to avoid this kind of fix
function getAutoscopeField(model, callContext) {
  var field = model.modelName;
  if (model.settings && model.settings.autoscope && model.settings.autoscope.length > 0) {
    for (var i = 0; i < model.settings.autoscope.length; ++i) {
      var f = model.settings.autoscope[i];
      field += '-' + callContext.ctx[f];
    }
  }
  return field;
}

var levelNames = {
  10: 'fatal',
  20: 'error',
  30: 'warn',
  40: 'info',
  50: 'debug',
  60: 'trace',
  98: 'audit',
  99: 'metric'
};

function initLogger(settings) {
  return logger;
}

function logger(msg) {
  var level = levelNames[msg.level];
  delete msg.level;
  delete msg.timestamp;
  switch (level) {
    case 'metric':
      _log.trace(_log.defaultContext(), msg);
      break;
    case 'audit':
      _log.trace(_log.defaultContext(), msg);
      break;
    case 'trace':
      _log.trace(_log.defaultContext(), msg);
      break;
    case 'debug':
      _log.debug(_log.defaultContext(), msg);
      break;
    case 'info':
      _log.info(_log.defaultContext(), msg);
      break;
    case 'warn':
      _log.warn(_log.defaultContext(), msg);
      break;
    case 'error':
      _log.error(_log.defaultContext(), msg);
      break;
    case 'fatal':
      _log.fatal(_log.defaultContext(), msg);
      break;
    default:
      break;
  }
}

module.exports = function startNodeRed(server, callback) {
  if (server.get('disableNodered') === true) {
    console.log('\n===================================================================\n');
    console.log('INFO: Node-Red is disabled via config.json: (disableNodered: true)');
    console.log('\n===================================================================\n');

    return callback();
  }
  var nodeRedPort = server.get('nodeRedPort');
  var port = nodeRedPort ? nodeRedPort : 3001;
  var nodeRedUserDir = server.get('nodeRedUserDir');
  if (!nodeRedUserDir) {
    nodeRedUserDir = 'nodered/';
  }
  var nodeRedMetrics = server.get('nodeRedMetrics') || false;
  var nodeRedAudit = server.get('nodeRedAudit') || false;
  var settings = {
    httpAdminRoot: '/red',
    httpNodeRoot: '/redapi',
    userDir: nodeRedUserDir,
    nodesDir: '../nodes',
    flowFile: 'node-red-flows.json',
    logging: {
      'oe-logger': {
        handler: initLogger,
        level: 'metric',
        metrics: nodeRedMetrics,
        audit: nodeRedAudit
      }
    },
    server: server,
    flowFilePretty: true,
    functionGlobalContext: {
      loopback: require('loopback'),
      logger: require('oe-logger')('node-red-flow')
    }
    // enables global context
  };
  var clientGlobalContext = server.get('nodeRedGlobalContext');
  if (clientGlobalContext) {
    var keys = Object.keys(clientGlobalContext);
    var globalContext = settings.functionGlobalContext;
    keys.forEach(function addToGlobalContext(key) {
      if (clientGlobalContext[key]) {
        globalContext[key.replace('.', '_')] = require(key);
      }
    });
  }


  var app = settings.server;
  var RED = nodeRed.RED;
  var redNodes = RED.nodes;
  var originalCreateNode = redNodes.createNode;
  var flagOnce = true;
  redNodes.createNode = function createNodes(node, def) {
    originalCreateNode(node, def);
    node.callContext = def.callContext;
    if (flagOnce) {
      flagOnce = false;
      node.constructor.super_.prototype._receive = node.constructor.super_.prototype.receive;
      node.constructor.super_.prototype.receive = function receiveFn(msg) {
        if (!msg) {
          msg = {};
        }
        msg.callContext = this.callContext;
        this._receive(msg);
      };
      node.constructor.super_.prototype._on_ = node.constructor.super_.prototype._on;
      node.constructor.super_.prototype._on = function onEventHandlerFn(event, callback) {
        return this._on_(event, function onEventCb(msg) {
          if (!msg) {
            msg = {};
          }
          msg.callContext = this.callContext;
          callback.call(this, msg);
        });
      };
    }
  };
  var flowModel = loopback.findModel('NodeRedFlow');
  flowModel.observe('after save', function flowModelAfterSave(ctx, next) {
    messaging.publish('reloadNodeRedFlows', uuidv4());
    next();
  });

  if (server.get('useDefaultNodeRedStorage')) {
    nodeRed.start({
      port: port,
      settings: settings
    }, function applicationCallback() {
      return callback();
    });
    return;
  }

  // Rakesh : body-parser is used as req.body is getting lost
  var bodyParser = require('body-parser');
  // 1mb limit is used to avoid request entity too large exception
  var jsonremoting = {
    limit: '1mb'
  };
  var urlencoded = {
    limit: '1mb'
  };
  if (app.get('remoting') && app.get('remoting').json) {
    jsonremoting = app.get('remoting').json;
  }
  if (app.get('remoting') && app.get('remoting').urlencoded) {
    urlencoded = app.get('remoting').urlencoded;
  }
  app.use(bodyParser.json(jsonremoting));
  app.use(bodyParser.urlencoded(urlencoded));
  var storageModule = require('../../lib/db-storage-for-node-red.js');
  settings.storageModule = storageModule;
  var credSplitFileName = 'red_credentials_map.json';
  // Atul : this REST end point is used to get credentials. it will query NodeRedFlow model and return credential information for the node
  // Since it uses context, credentials for requested nodes belong to current context will be returned.
  // if field type of 'password' it will return it as 'has_password'
  if (!server.get('nodeRedSplitToFiles')) {
    app.get(settings.httpAdminRoot + '/credentials1/:nodeType/:nodeId', function getHttpAdminRoot(req, res) {
      if (!req.accessToken) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      var nodeId = req.params.nodeId;
      var nodeType = req.params.nodeType;
      if (!nodeId || !nodeType) {
        return res.json({});
      }
      var flowArray = [];

      var autoscopeField = getAutoscopeField(flowModel, req.callContext);
      flowModel.find({ where: { name: autoscopeField } }, req.callContext, function flowModelFindCb(err, results) {
        if (err) {
          return res.status(500).json({ error: 'Internal server error', message: 'no flow found' });
        }
        results.forEach(function forEachResult(r) {
          r.flow.forEach(function prepareFlowArray(f) {
            flowArray.push(f);
          });
        });

        for (var i = 0; i < flowArray.length; ++i) {
          if (flowArray[i].id === nodeId) {
            if (!flowArray[i].credentials) {
              return res.json({});
            }
            var definition = redNodes.getCredentialDefinition(nodeType);
            var sendCredentials = {};
            for (var cred in definition) {
              if (definition.hasOwnProperty(cred)) {
                if (definition[cred].type === 'password') {
                  var key = 'has_' + cred;
                  sendCredentials[key] = flowArray[i].credentials[cred] !== null && flowArray[i].credentials[cred] !== '';
                  continue;
                }
                sendCredentials[cred] = flowArray[i].credentials[cred] || '';
              }
            }
            return res.json(sendCredentials);
          }
        }
        return res.json({});
      });
    });
  }


  // Dipayan: disabling file import into the flows. exported file would be used only for migration, using DB migration process
  app.get(settings.httpAdminRoot + '/library/flows', function getFlowsArrayCb(req, res) {
    // return res.json(redNodes.getFlows());
    var flowArray = { 'f': ['Import from file is disabled.'] };
    return res.json(flowArray);
  });

  // Dipayan: disabling file import into the flows. exported file would be used only for migration, using DB migration process
  app.get(settings.httpAdminRoot + '/library/flows/*', function getFlowsArrayCb(req, res) {
    // return res.json(redNodes.getFlows());
    return res.status(403).json({ error: 'Import from file is disabled.' });
  });
  // Atul/Ori : Handle GET /red/flows request here. This will go to loopback model and gets the flow and return same to client.
  // this will bypass default api handling of node-red. This will ensure context specific data to be given to client.
  app.get(settings.httpAdminRoot + '/flows', function getFlowsCb(req, res) {
    if (!req.accessToken) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    // return res.json(redNodes.getFlows());
    var flowArray = [];

    if (server.get('nodeRedSplitToFiles')) {
      getFlowsFromFiles(function (err, allFlowsFromFiles) {
        if (err) {
          return res.status(500).json({ error: 'internal server error', message: 'no nodered flows found' + err });
        }
        res.json(allFlowsFromFiles);
      });
    } else {
      var autoscopeField = getAutoscopeField(flowModel, req.callContext);
      flowModel.find({ where: { name: autoscopeField } }, req.callContext, function flowModelFind(err, results) {
        if (err) {
          return res.status(500).json({ error: 'internal server error', message: 'no nodered flows found' + err });
        }
        results.forEach(function resultsForEach(r) {
          r.flow.forEach(function prepareFlowsArray(f) {
            flowArray.push(f);
          });
        });
        if (results.length > 0) {
          res.cookie('_version', results[0]._version, { httpOnly: true, secure: (process.env.PROTOCOL && process.env.PROTOCOL === 'https' ? true : false) });
        }
        if (results.length === 0) {
          return res.json({ flows: flowArray, rev: null });
        }
        return res.json({ flows: flowArray, rev: results[0]._version });
      });
    }
  });

  // Atul : Following end point is used to lock or unlock the flows.
  // Flow would be locked/unlocked per autoscope - tenant
  // user needs to pass {"locked":true, "rev" : <version>} to lock the flow
  // once flow is locked, noone can deploy/change flows. it needs to be unlocked with locked = false flag with same end point
  app.post(settings.httpAdminRoot + '/lock', function postFlowsCb(req, res) {
    if (!req.accessToken) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    var autoscopeField = getAutoscopeField(flowModel, req.callContext);
    if (req && req.body && (req.body.locked || req.body.locked === false)) {
      flowModel.find({ where: { name: autoscopeField } }, req.callContext, function flowModelFindCb(err, results) {
        if (err || !results || !results[0]) {
          console.log(err);
          return res.status(500).json({ error: 'Internal server error', message: 'flow not found.' });
        }
        if (results.length > 1) {
          return res.status(500).json({ error: 'Internal server error', message: 'There were more flows found for a unique context.' });
        }
        var version = results[0]._version;
        if (version !== req.body.rev) {
          return res.status(400).json({ error: 'version mismatched' });
        }
        var locked = req.body.locked ? true : false;
        results[0].updateAttributes({locked: locked, _version: version}, req.callContext, function (err, r) {
          if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Internal server error', message: 'flow not found.' });
          }
          res.cookie('_version', r._version, { httpOnly: true, secure: (process.env.PROTOCOL && process.env.PROTOCOL === 'https' ? true : false) });
          return res.status(200).json({ rev: r._version });
        });
      });
    } else {
      return res.status(400).json({error: 'Invalid request' });
    }
  });
  // Atul/Ori : Handle POST /red/flows request here. It will store flows posted by client to database
  // this will bypass default api handling of node-red. This will ensure context specific data is stored.
  // It does following in order
  // 1. get all flows for the context (eg current tenant if autoscope is tenant )
  // 2. if flows are present then saves id and version field. Also stores existing flows (actually nodes) into flowArry collection
  // 3. Retrieves all nodes which are active with node-red by calling redNodes.getFlow()
  // 4. It create new entry into allflows or update existing entry based on id and type field of node
  // 5. Calculate entries to be removed
  // 6. Thus create allflows collection that needs to be updated to node-red by calling setNodes()
  // 7. call upsert operation for tenant record.
  // TODO : since flow id generated at client, this can potentially modify flow of other tenant.
  // TODO : it stops and start flow. Need to figure out a way so that not all flows stops. There is logic at node red to find delta. this needs to be visited
  // TODO : Need to work on credential and other storage
  // TODO : Code cleanup
  // TODO : handlign all the end points. Right now only /flows end point is being handled.
  // TODO : Along with authentication, authorization should also be implemented.
  // TODO : Data Personalization mixin change : Right now tenant can modify default tenant data. This should have been prevented. To solve this problem, flow name is concatination of all autoscope fields
  app.post(settings.httpAdminRoot + '/flows', function postFlowsCb(req, res) {
    if (!req.accessToken) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    var reqFlows = req.body.flows;
    var deploymentType = req.get('Node-RED-Deployment-Type') || 'full';

    if (deploymentType === 'reload') {
      return res.status(404).json({ error: 'Invalid Node-RED-Deployment-Type in header', message: 'Node-RED-Deployment-Type \'reload\' is not supported for HTTP POST.' });
    }
    var autoscopeField = getAutoscopeField(flowModel, req.callContext);
    // Adding simple ctx with tenantId default, as file based node-red flows are not multi-tenant at this moment
    // TODO: if multi tenat support required in file based node-red flows, use req.callContext
    var reqCallContext = { ctx: { tenantId: 'default' } };
    var nodesToRemove = [];
    var dbFlows = [];
    var allflows = redNodes.getFlows();
    allflows = allflows && allflows.flows ? allflows.flows : [];
    // allflows = allflows || [];

    if (server.get('nodeRedSplitToFiles')) {
      var dir = settings.userDir;
      var tabs = [];
      var nodes = [];
      var creds = [];
      allflows = _.cloneDeep(reqFlows);
      allflows.forEach(function (obj) {
        obj.callContext = reqCallContext;
      });
      reqFlows.every(function (flow) {
        if (flow.type === 'tab') {
          tabs.push(flow);
        } else {
          return false;
        }
        return true;
      });
      nodes = reqFlows.slice(tabs.length);
      creds = reqFlows.filter(function (c) {
        if (c.z === '') {
          delete c.credentials;
          c.callContext = reqCallContext;
          return true;
        }
      });
      var tabNames = tabs.map(function (tab) {
        return 'red_' + tab.label + '_' + tab.id + '.json';
      });
      fs.readdir(dir, function (err, results) {
        if (err) {
          return res.status(500).json({ error: 'unexpected_error', message: 'ERROR : NODE RED WAS NOT ABLE TO SAVE FLOWS TO FILE' });
        }
        var files = results.filter(function (file) {
          return (file.startsWith('red_') && path.extname(file) === '.json');
        });
        // delete the flow files for which flows are deleted
        files.forEach(function (file) {
          if (tabNames.indexOf(file) < 0) {
            fs.unlinkSync(path.join(dir, file));
          }
        });
        // update or add new flow files
        var order = 0;
        tabs = tabs.map(function (tab) {
          tab.order = order++;
          return tab;
        });
        async.concat(tabs, function (tab, cb) {
          var fName = path.join(dir, 'red_' + tab.label + '_' + tab.id + '.json');
          var flow = nodes.filter(function (f) {
            delete f.credentials;
            return f.z === tab.id;
          });
          flow.push(tab);
          flow.forEach(function (obj) {
            obj.callContext = reqCallContext;
          });

          fs.writeFile(fName, JSON.stringify(flow, null, 2), function (err) {
            if (err) {
              return cb({ error: 'unexpected_error', message: 'ERROR : NODE RED WAS NOT ABLE TO SAVE FLOWS TO FILE' });
            }
            cb();
          });
        }, function (err) {
          if (err) {
            console.error(err);
          }
          fs.writeFile(path.join(dir, credSplitFileName), JSON.stringify(creds, null, 2), function (err) {
            if (err) {
              console.error(err);
            }
            redNodes.setFlows(allflows, deploymentType).then(function setFlowsCb() {
              return res.status(200).json({ rev: reqFlows.rev });
            }).otherwise(function setFlowsOtherwiseCb(err) {
              console.log(' *** ERROR : NODE RED WAS NOT ABLE TO LOAD FLOWS *** ', err);
              return res.status(500).json({ error: 'unexpected_error', message: 'ERROR : NODE RED WAS NOT ABLE TO LOAD FLOWS' });
            });
          });
          // return res.status(200).end();
        });
      });
    } else {
      flowModel.find({ where: { name: autoscopeField } }, req.callContext, function findCb(err, results) {
        if (err) {
          return res.status(500).json({ error: 'Internal server error', message: 'flow not found.', err });
        }
        if (results.length > 1) {
          return res.status(500).json({ error: 'Internal server error', message: 'There were more flows found for a unique context.' });
        }
        var id;
        var version;
        if (results.length === 1 && results[0]._version) {
          id = results[0].id;
          version = results[0]._version;
          if (version !== req.body.rev) {
            return res.status(409).json({ code: 'version_mismatch' });
          }
          if (results[0].locked) {
            return res.status(403).json({ error: 'flow is locked. please unlock it first', message: 'Flow is locked'});
          }
        } else {
          version = uuidv4();
        }
        results.forEach(function resultsForEach(r) {
          r.flow.forEach(function prepareDbFlow(f) {
            dbFlows.push(f);
          });
        });
        var f = null;
        var index = null;
        var len = dbFlows.length;
        // find out flows which exist in database but not part of POST request - mark for deletion from database
        for (var i = 0; i < len; ++i) {
          f = dbFlows[i];
          index = _.findIndex(reqFlows, function findIndexFn(o) {
            return (o.id === f.id && o.type === f.type);
          });
          if (index < 0) {
            nodesToRemove.push(f);
          }
        }
        // find out flows which exist node-red and also part of POST request, take from what being posted.
        // if credentials are being posted (it may be partially posted), union it with stored credential and save back.
        len = reqFlows.length;
        for (i = 0; i < len; ++i) {
          f = reqFlows[i];
          f.callContext = req.callContext;
          index = _.findIndex(allflows, function findIndexFn(o) {
            return (o.id === f.id && o.type === f.type);
          });
          if (index >= 0) {
            mergeCredentials(f);
            allflows[index] = f;
          } else {
            allflows.push(f);
          }
        }


        len = nodesToRemove.length;
        for (i = 0; i < len; ++i) {
          f = nodesToRemove[i];
          _.remove(allflows, function removeFn(o) {
            return (o.id === f.id && o.type === f.type);
          });
        }
        var obj = { name: autoscopeField, flow: reqFlows, id: id, _version: version };
        flowModel.upsert(obj, req.callContext, function upsertCb(err, results) {
          if (err) {
            console.log(' *** ERROR : NODE RED WAS NOT ABLE TO LOAD FLOWS *** ', err);
            return res.status(500).json({ error: 'unexpected_error', message: 'ERROR : NODE RED WAS NOT ABLE UPDATE FLOWS IN DB' });
          }
          redNodes.setFlows(allflows, deploymentType).then(function setFlowsCb() {
            res.cookie('_version', results._version, { httpOnly: true, secure: (process.env.PROTOCOL && process.env.PROTOCOL === 'https' ? true : false) });
            // return res.status(200).end();
            return res.status(200).json({ rev: results._version });
          }).otherwise(function setFlowsOtherwiseCb(err) {
            console.log(' *** ERROR : NODE RED WAS NOT ABLE TO LOAD FLOWS *** ', err);
            return res.status(500).json({ error: 'unexpected_error', message: 'ERROR : NODE RED WAS NOT ABLE TO LOAD FLOWS' });
          });
        });
      });
    }

    /* function to merge credentials for saving in db
         * @param {object} flow object
         * @return {object} merged flow object
         * */
    function mergeCredentials(f) {
      // dbFlows = existingFlows || dbFlows;
      var index2 = _.findIndex(dbFlows, function findIndexFn(o) {
        return (o.id === f.id && o.type === f.type);
      });
      if (index2 >= 0) {
        var nodeType = f.type.replace(/\s+/g, '-');
        var definition = redNodes.getCredentialDefinition(nodeType);
        var savedCredentials = dbFlows[index2].credentials || {};
        var newCreds = f.credentials || {};
        if (!definition) { return; }
        for (var cred in definition) {
          if (definition.hasOwnProperty(cred)) {
            if (typeof newCreds[cred] === 'undefined') {
              continue;
            }
            if (definition[cred].type === 'password' && newCreds[cred] === '__PWRD__') {
              continue;
            }
            if (newCreds[cred].length === 0 || /^\s*$/.test(newCreds[cred])) {
              delete savedCredentials[cred];
              continue;
            }
            savedCredentials[cred] = newCreds[cred];
          }
        }
        f.credentials = savedCredentials;
      }
    }
  });

  /* function to get all flows from split json files
     * @param function - callback function
     * */
  function getFlowsFromFiles(callback) {
    var dir = settings.userDir;
    fs.readdir(dir, function (err, results) {
      if (err) {
        return callback(err, null);
      }
      var files = results.filter(function (file) {
        return (file.startsWith('red_') && path.extname(file) === '.json');
      });

      async.concat(files, function (file, cb) {
        fs.readFile(path.join(dir, file), function (err, contents) {
          if (err) {
            return cb({ error: 'Internal server error', message: 'No nodered flows found' });
          }
          cb(null, JSON.parse(contents));
        });
      }, function (err, flowArray) {
        if (err) {
          return callback(err);
        }
        return callback(null, { flows: _.sortBy(flowArray, 'order') });
      });
    });
  }

  // / this function reloads all the flows from database.
  // / this function is being exported from this module so that it can be easily called.
  function reload(redNodes, callback) {
    if (server.get('nodeRedSplitToFiles')) {
      var dir = settings.userDir;
      fs.readdir(dir, function (err, results) {
        if (err) {
          callback(err);
        }
        var files = results.filter(function (file) {
          return (file.startsWith('red_') && path.extname(file) === '.json');
        });
        async.concat(files, function (file, cb) {
          fs.readFile(path.join(dir, file), function (err, contents) {
            if (err) {
              return cb({ error: 'Internal server error', message: 'No nodered flows found' });
            }
            cb(null, JSON.parse(contents));
          });
        }, function (err, flowArray) {
          if (err) {
            callback(err);
          } else {
            redNodes.setFlows(flowArray).then(function setFlowsFn() {
              callback();
            }).otherwise(function setFlowsOtherwiseFn(err) {
              console.log('node red error');
              callback(err);
            });
          }
        });
      });
    } else {
      console.log(' *** NODE-RED : RELOADING FLOWS *** ');
      var flowArray = [];
      var options = {};
      options.ignoreAutoScope = true;
      options.fetchAllScopes = true;
      var flowModel = loopback.findModel('NodeRedFlow');
      flowModel.find({}, options, function findCb(err, results) {
        if (err) {
          callback(err);
        }
        results.forEach(function resultsForEach(r) {
          r.flow.forEach(function prepareFlowArrayFn(f) {
            flowArray.push(f);
          });
        });
        if (flowArray.length > 0) {
          redNodes.setFlows(flowArray).then(function setFlowsFn() {
            callback();
          }).otherwise(function setFlowsOtherwiseFn(err) {
            console.log('node red error');
            callback(err);
          });
        } else {
          return callback();
        }
      });
    }
  }


  // When reloadNodeRedFlows event is received, reload all node red flows.
  messaging.subscribe('reloadNodeRedFlows', function reloadNodeRedFlowsFn(version) {
    reload(redNodes, function reloadFn() {});
  });

  // Atul : As per sachin's comments, moving code from loopback-connector-for-NODE-RED /node-red.js .
  // This is done so that 'NodeRedFlow' model is not tightly attached to loopback-connector- for -NODE - RED
  nodeRed.start({
    port: port,
    settings: settings
  }, function applicationCallback() {
    reload(redNodes, callback);
    // callback();
  });
};
