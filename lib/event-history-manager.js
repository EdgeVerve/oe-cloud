/**
*
* ©2016-2018 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
* Bangalore, India. All Rights Reserved.
*
*/

var loopback = require('loopback');
var async = require('async');
var log = require('oe-logger')('eventHistoryManager');
var broadcasterClient = require('./common/broadcaster-client.js');
var myEE = broadcasterClient.eventEmitter;
var _ = require('lodash');
var os = require('os');
var process = require('process');
var currHostName = process.env.HOSTNAME || os.hostname();
var crypto = require('crypto');
var REPLAY_DELAY;
var REPLAY_JOB_INTERVAL;
var PRESIST_TO_DB_INTERVAL;
var MAX_RETRY;
var INSTANCES_TO_FETCH;
var SERVER_RECOVERY_INTERVAL;
var recoveryAvailable = {};
var ignoreScopeOptions = {
  ignoreAutoScope: true,
  fetchAllScopes: true
};
var eventHistoryMap = {};
var ctxMap = {};
var EventHistoryModel;
var _historyChanged = false;

var STATUS_UNDEFINED = 'undefined';
var STATUS_RECOVERY_FINSHED = 'RecoveryFinished';
var STATUS_TO_BE_RECOVERED = 'ToBeRecovered';
var STATUS_IN_RECOVERY = 'InRecovery';

var currentlyRecovering = {};

function checkModelInstance(model, version, operation, options, cb) {
  var query = {
    where: {
      _version: version
    }
  };
  if (operation === 'after delete') {
    var filter = { where: {_version: version}, fetchDeleted: true };
    model.find(filter, options, function (error, instance) {
      if (error || instance === null || instance.length === 0) {
        cb(error, false);
      } else {
        cb(null, true);
      }
    });
  } else {
    model.find(query, options, function (error, instance) {
      if (error || instance === null || instance.length === 0) {
        cb(error, false);
      } else {
        cb(null, true);
      }
    });
  }
}

function executeBaseObservers(eventHistory, model, version, ctx, cb) {
  if (model.base && model.base._fsObservers) {
    executeObservers(eventHistory, model.base, version, ctx, cb);
  } else {
    cb();
  }
}

function executeObservers(eventHistory, model, version, ctx, finalcb) {
  executeBaseObservers(eventHistory, model, version, ctx, function (err) {
    if (err) {
      return finalcb(err);
    }
    var observerStatus = eventHistory.observerArray;
    var operation = eventHistory.operation;
    // Get all the observer ids for this model.
    var registeredObserverIds = model._fsObservers[operation] && model._fsObservers[operation].observerIds || [];
    var recoveryAvailableObservers = model._fsObservers[operation] && model._fsObservers[operation].observers || [];
    // Check if each observer was executed for event @ this timestamp
    async.each(registeredObserverIds, function (id, cb) {
      if (_.indexOf(observerStatus, id) === -1) {
        // observer was not executed. we need to retrigger the event.
        log.debug(ctx, 'Event @', model.modelName, ' Observer -', id, ' -Failed');
        var observer = _.find(recoveryAvailableObservers, function (x) { return x.getId() === id; });
        observer.execute(model.modelName, version, operation, ctx, cb);
      } else {
        cb();
      }
    }, function (err) {
      return finalcb(err);
    });
  });
}

function handleEventHistory(eventHistory, cb) {
  var modelName = eventHistory.modelName;
  var version = eventHistory.version;
  var operation = eventHistory.operation;
  var key = version + modelName + operation;
  var ctx;
  if (ctxMap[key]) {
    ctx = ctxMap[key];
  } else {
    ctx = eventHistory.ctx;
  }
  var model = loopback.getModel(modelName);
  ctx.model = model;
  if (typeof ctx.options !== 'object') {
    ctx.options = JSON.parse(ctx.options);
  }
  if (eventHistory.retryTimes === MAX_RETRY) {
    // TODO save to another collection for visibility
    log.warn(ctx, 'observer for model: ' + modelName + ' reached max retries');
    delete eventHistoryMap[key];
    delete ctxMap[key];
    _historyChanged = true;
    cb();
  } else {
    checkModelInstance(model, version, operation, ctx.options, function (error, vaild) {
      if (!vaild) {
        log.debug(ctx, 'No model instance for Event history ', modelName, ' with version ', version);
        var key = version + modelName + operation;
        delete eventHistoryMap[key];
        delete ctxMap[key];
        _historyChanged = true;
        cb();
      } else {
        executeObservers(eventHistory, model, version, ctx, function (err) {
          eventHistory.retryTimes++;
          if (!err) {
            log.debug(ctx, 'replayJob finished with no errors removing event histroy entry');
            var key = version + modelName + operation;
            delete eventHistoryMap[key];
            delete ctxMap[key];
            _historyChanged = true;
          }
          return cb();
        });
      }
    });
  }
}

function eventReplayJob() {
  log.debug(log.defaultContext(), 'Executing replay job');
  var resMap = filterEvents();
  async.each(resMap, function (event, cb) {
    handleEventHistory(event, cb);
  }, function (err) {
    if (err) {
      log.debug(log.defaultContext(), err);
    } else {
      log.debug(log.defaultContext(), 'replayJob finished with no error on all relevant events');
    }
    setTimeout(eventReplayJob, REPLAY_JOB_INTERVAL);
  });
}

function filterEvents() {
  var resMap = {};
  if (!eventHistoryMap) {
    return {};
  }
  var keys = Object.keys(eventHistoryMap);
  for (var key of keys) {
    var event = eventHistoryMap[key];
    var timeSinceLastReplay = new Date() - event.timestamp;
    if (event.ranOnce && (timeSinceLastReplay > REPLAY_DELAY) && (event.retryTimes === 0 || timeSinceLastReplay > Math.pow(2, event.retryTimes) * REPLAY_JOB_INTERVAL)) {
      resMap[key] = event;
    }
  }
  return resMap;
}

function getEventHistoryModel() {
  if (!EventHistoryModel) {
    EventHistoryModel = loopback.getModel('EventHistory');
  }
  return EventHistoryModel;
}

function getMinTimestamp() {
  var minTimestamp = new Date();
  Object.keys(eventHistoryMap).forEach(function (key) {
    minTimestamp = Math.min(minTimestamp, eventHistoryMap[key].timestamp);
  });
  return minTimestamp;
}

function persistToDB() {
  var eventHistoryModel = getEventHistoryModel();
  if (_historyChanged) {
    log.debug(log.defaultContext(), 'Executing persist to db job');
    eventHistoryModel.destroyAll({or: [
      {and: [{hostName: currHostName}, {status: STATUS_UNDEFINED}]},
      {and: [{hostName: currHostName}, {status: STATUS_RECOVERY_FINSHED}]}
    ]}, ignoreScopeOptions, function (err, info) {
      if (err) {
        log.debug(log.defaultContext(), 'persistToDB: ', err);
      } else {
        if (typeof info !== 'undefined') {
          log.debug(log.defaultContext(), 'persistToDB: deleted ', info.count, ' eventHistory instances');
        }
        var instance = {
          hostName: currHostName,
          timestamp: getMinTimestamp(),
          doStartUpOperation: true
        };
        _historyChanged = false;
        eventHistoryModel.create(instance, ignoreScopeOptions, function (err) {
          if (err) {
            log.debug(log.defaultContext(), err);
          }
        });
      }
      setTimeout(persistToDB, PRESIST_TO_DB_INTERVAL);
    });
  }
}

function md5(str) {
  var hash = crypto.createHash('md5');
  hash.update(str);
  return hash.digest('hex');
}

function createEventHistory(modelName, version, operation, ctx) {
  log.debug(ctx, 'creating a new entry with: ', modelName, ' ', version);
  var eventHistory = {};
  eventHistory.ranOnce = false;
  eventHistory.modelName = modelName;
  eventHistory.version = version;
  eventHistory.id = md5(modelName + version);
  eventHistory.observerArray = [];
  eventHistory.ctx = {};
  eventHistory.ctx.options = JSON.stringify(ctx.options);
  eventHistory.ctx.instance =  {};
  var instance = ctx.instance || ctx.currentInstance;
  if (instance) {
    eventHistory.ctx.instance._version = instance._version;
    eventHistory.ctx.instance.__data = instance.__data;
    eventHistory.timestamp = instance.currentUpdateTime;
  }
  if (ctx.data) {
    eventHistory.ctx.data = ctx.data;
  }
  eventHistory.retryTimes = 0;
  eventHistory.operation = operation;
  var key = version + modelName + operation;
  if (!eventHistoryMap[key]) {
    _historyChanged = true;
    eventHistoryMap[key] = eventHistory;
    ctxMap[key] = ctx;
  }
}

function updateEventHistory(modelName, version, operation, observerId) {
  log.debug(log.defaultContext(), 'observer id: ', observerId, ' for model: ', modelName, ' ', version, ' completed');
  var key = version + modelName + operation;
  var eventHistory = eventHistoryMap[key];
  if (eventHistory && eventHistory.observerArray) {
    eventHistory.observerArray.push(observerId);
    _historyChanged = true;
  }
}

function updateRanOnce(modelName, version, operation, observerId) {
  var key = version + modelName + operation;
  var eventHistory = eventHistoryMap[key];
  if (eventHistory) {
    eventHistory.ranOnce = true;
  }
}

function removeEventHistory(modelName, version, operation, msg) {
  log.debug('removing event due to: ' + msg);
  var key = version + modelName + operation;
  delete eventHistoryMap[key];
  delete ctxMap[key];
  _historyChanged = true;
}

var appInstance;

function config(app) {
  REPLAY_DELAY = app.get('eventReliabilityReplayThreshold');
  REPLAY_JOB_INTERVAL = app.get('eventReliabilityReplayInterval');
  PRESIST_TO_DB_INTERVAL = app.get('eventReliabilityDbPersistenceInterval');
  MAX_RETRY = app.get('eventReliabilityMaxRetry');
  INSTANCES_TO_FETCH = app.get('eventHistoryStartUpInstancesToFetch');
  SERVER_RECOVERY_INTERVAL = app.get('eventHistoryStartUpInterval');
  return;
}

function init(app) {
  var config = require('../server/config');
  REPLAY_DELAY = app.get('eventReliabilityReplayThreshold') || config.eventReliabilityReplayThreshold;
  REPLAY_JOB_INTERVAL = app.get('eventReliabilityReplayInterval') || config.eventReliabilityReplayInterval;
  PRESIST_TO_DB_INTERVAL = app.get('eventReliabilityDbPersistenceInterval') || config.eventReliabilityDbPersistenceInterval;
  MAX_RETRY = app.get('eventReliabilityMaxRetry') || config.eventReliabilityMaxRetry;
  INSTANCES_TO_FETCH = app.get('eventHistoryStartUpInstancesToFetch') || config.eventHistoryStartUpInstancesToFetch;
  SERVER_RECOVERY_INTERVAL = app.get('eventHistoryStartUpInterval') || config.eventHistoryStartUpInterval;
  appInstance = app;
  setTimeout(eventReplayJob, REPLAY_JOB_INTERVAL);

  var eventHistoryModel = getEventHistoryModel();
  eventHistoryModel.find({ where: { hostName: currHostName } }, ignoreScopeOptions, function (err, results) {
    if (err) {
      setTimeout(persistToDB, PRESIST_TO_DB_INTERVAL);
      return;
    }
    async.each(results, function (instance, cb) {
      if (!instance.status) {
        instance.updateAttribute('status',  STATUS_TO_BE_RECOVERED, ignoreScopeOptions, function (err) {
          cb(err);
        });
      } else {
        cb();
      }
    }, function (err) {
      if (err || !err) {
        setTimeout(persistToDB, PRESIST_TO_DB_INTERVAL);
      }
    });
  });

  // if (!process.env.USE_BROADCASTER) {
  if (!broadcasterClient.getUseBroadcaster()) {
    recovery(currHostName, function (err) {
      if (err) {
        log.debug(log.defaultContext(), 'failed to do recovery of server: ', currHostName, ' with error: ', err);
      // TO DO - error handling here
      } else {
        log.debug(log.defaultContext(), 'recovered server successfully');
      }
    });
  }
}

myEE.on('event reliability recovery', function (recoveryHostNameArr) {
  log.debug(log.defaultContext(), 'Started recovery of: ', recoveryHostNameArr, ' in host: ', currHostName);

  async.each(recoveryHostNameArr, function (hostname, asyncCb) {
    if (typeof appInstance === 'undefined') {
      broadcasterClient.recoveryFail(hostname);
      asyncCb(new Error('This host is not readfy for recovery'));
    } else if (!currentlyRecovering[hostname]) {
      currentlyRecovering[hostname] = hostname;
      recovery(hostname, asyncCb);
    } else {
      asyncCb();
    }
  }, function (err) {
    if (err) {
      log.debug(log.defaultContext(), 'error while recovery of dead nodes', err);
    } else {
      log.debug(log.defaultContext(), 'finished recovery for all dead nodes');
    }
  });
});

function recovery(hostname, cb) {
  var eventHistoryModel = getEventHistoryModel();
  var query = {
    where: {
      and: [
        {
          hostName: hostname
        },
        {
          or: [
            { status: STATUS_TO_BE_RECOVERED},
            { status: STATUS_UNDEFINED}
          ]
        }
      ]
    }
  };
  eventHistoryModel.find(query, ignoreScopeOptions, function (err, results) {
    if (err) {
      log.debug(log.defaultContext(), 'Recovery failed due to: failed to load event history instances from db with error: ', err);
      broadcasterClient.recoveryFail(hostname);
      cb();
    } else if (!results || results.length === 0) {
      log.debug(log.defaultContext(), 'Recovery failed due to: No event history record in DB. Cannot continue recovery');
      broadcasterClient.recoveryFail(hostname);
      cb();
    } else {
      var resultsToBeRecovered = results.filter(function (instance) {
        return instance.status === STATUS_TO_BE_RECOVERED;
      });
      if (resultsToBeRecovered.length === 0) {
        resultsToBeRecovered = results;
      }
      async.each(resultsToBeRecovered, function (instance, eventHistoryInstanceCB) {
        if (instance) {
          instance.updateAttribute('status',  STATUS_IN_RECOVERY, ignoreScopeOptions, function (err) {
            if (err) {
              log.debug(log.defaultContext(), 'Failed to update eventHistory status');
            }
            log.debug(log.defaultContext(), 'loaded event history instance from db');
            if (typeof instance.timestamp !== 'undefined' && instance.doStartUpOperation) {
              // call fetchModels with SERVER_RECOVERY_INTERVAL
              var hostNameToRecover = instance.hostName;
              var recoveryTimeScopePerModelMap = {};
              recoveryTimeScopePerModelMap.Initial = instance.timestamp;
              recoveryTimeScopePerModelMap.persist = instance.latestUpdatePerModel;
              recoveryAvailable[hostNameToRecover] = {};
              setTimeout(fetchModels.bind(this, instance, hostNameToRecover, recoveryTimeScopePerModelMap, function (err, failedHostName) {
                if (failedHostName) {
                  broadcasterClient.recoveryFail(hostNameToRecover);
                }
                eventHistoryInstanceCB(err);
              }), SERVER_RECOVERY_INTERVAL);
            }
          });
        }
      }, function (err) {
        if (err || !err) {
          delete currentlyRecovering[hostname];
          cb(err);
        }
      });
    }
  });
}

function createContext(rec, Model) {
  var ctx = {};
  ctx.instance = rec;
  ctx.Model = Model;
  if (rec._fsCtx) {
    try {
      ctx.options = JSON.parse(rec._fsCtx);
    } catch (e) {
      log.debug(log.defaultContext(), 'failed to parse _fsCtx: ', e);
      ctx.options = ignoreScopeOptions;
    }
  }
  var context = {};
  context.modelName = rec._type;
  context.version = rec._version;
  context.trigger = 'after save';
  context.ctx = ctx;
  return context;
}

function fetchLimit(hostNameToRecover, Model, query, property, cb) {
  Model.find(query, { fetchAllScopes: true, ctx: { tenantId: 'default' } }, function (err, results) {
    if (err) {
      log.debug(log.defaultContext(), 'failed to fetch instances from DB', err);
      return cb(err);
    }
    if (results) {
      if (results.length === INSTANCES_TO_FETCH) {
        recoveryAvailable[hostNameToRecover].recovery = true;
        recoveryAvailable[hostNameToRecover][Model.modelName] = true;
      }
      if (results.length < INSTANCES_TO_FETCH) {
        recoveryAvailable[hostNameToRecover][Model.modelName] = false;
      }
      if (results.length !== 0) {
        var maxTime = results[results.length - 1][property];
      }
      async.each(results, function (rec, asyncCb) {
        var context = createContext(rec, Model);
        rec.createEventHistory(context, context.ctx.options, function (err) {
          if (err) {
            log.debug(log.defaultContext(), 'failed to create eventHistory remotely', err);
            return asyncCb(err);
          }
          log.debug(log.defaultContext(), 'created eventHistory remotely successfully');
          return asyncCb();
        });
      }, function (err) {
        if (err) {
          log.debug(log.defaultContext(), err);
          cb(err);
        } else {
          cb(null, maxTime);
        }
      });
    }
  });
}

function fetchModels(eventHistoryInstance, hostNameToRecover, recoveryTimeScopePerModelMap, cb) {
  if (!hostNameToRecover) {
    log.error(log.defaultContext, 'hostname is undefined');
    return cb();
  }
  var thisInstance = eventHistoryInstance;
  log.debug(log.defaultContext, 'Event history fetchModels ');
  recoveryAvailable[hostNameToRecover].recovery = false;
  var app = appInstance;
  async.each(Object.keys(app.models), function (model, callbackFM) {
    if (app.models[model].definition.settings.mixins && app.models[model].definition.settings.mixins.FailsafeObserverMixin
    && app.models[model].modelName !== 'BaseEntity') {
      var Model = app.models[model];
      if (recoveryAvailable[hostNameToRecover][Model.modelName] === false) {
        callbackFM();
      } else {
        getRecoveryTimeScope(eventHistoryInstance, hostNameToRecover, Model, recoveryTimeScopePerModelMap, function (e) {
          callbackFM();
        });
      }
    } else {
      callbackFM();
    }
  }, function (err) {
    if (err) {
      log.debug(log.defaultContext(), 'Recovery for ', hostNameToRecover, ' failed with error: ', err);
      broadcasterClient.recoveryFail(hostNameToRecover);
      cb(err);
    } else if (recoveryAvailable[hostNameToRecover].recovery) {
      setTimeout(fetchModels.bind(this, eventHistoryInstance, hostNameToRecover, recoveryTimeScopePerModelMap, cb), SERVER_RECOVERY_INTERVAL);
    } else if (!recoveryAvailable[hostNameToRecover].recovery) {
      log.debug(log.defaultContext(), 'Recovery for ', hostNameToRecover, ' finished successfully!');
      thisInstance.updateAttribute('status',  STATUS_RECOVERY_FINSHED, ignoreScopeOptions, function (err) {
        if (err) {
          cb(err);
        } else {
          broadcasterClient.recoverySuccess(hostNameToRecover);
          cb();
        }
      });
    }
  });
}

function getRecoveryTimeScope(eventHistoryInstance, hostNameToRecover, Model, recoveryTimeScopePerModelMap, callbackFM) {
  if (!recoveryTimeScopePerModelMap[Model.modelName]) {
    recoveryTimeScopePerModelMap[Model.modelName] = {};
  }
  if (recoveryTimeScopePerModelMap.persist && recoveryTimeScopePerModelMap.persist[Model.modelName]) {
    recoveryTimeScopePerModelMap[Model.modelName].upperBound = recoveryTimeScopePerModelMap.persist[Model.modelName];
    recoveryTimeScopePerModelMap[Model.modelName].lowerBound = recoveryTimeScopePerModelMap.Initial;
    recoverModel(hostNameToRecover, Model, recoveryTimeScopePerModelMap, callbackFM);
  } else {
    var upperBounds = [];
    var queryMapLatestUpdateTime = {
      scenarioPrevious: {where: { currentHostName: hostNameToRecover }, order: 'currentUpdateTime ASC', limit: 1, property: 'currentUpdateTime'},
      scenarioCurrent: {where: {and: [{ currentHostName: {neq: hostNameToRecover} }, {oldHostName: hostNameToRecover}]}, order: 'oldUpdateTime ASC', limit: 1, property: 'oldUpdateTime' }
    };
    async.each(Object.keys(queryMapLatestUpdateTime), function (key, cbRecoveryTimeScope) {
      var query = queryMapLatestUpdateTime[key];
      Model.find(query, ignoreScopeOptions, function (err, results) {
        if (err) {
          cbRecoveryTimeScope(err);
        } else if (results.length === 0) {
          cbRecoveryTimeScope(new Error('No recoerds found'));
        } else {
          upperBounds.push(new Date(results[0][query.property]));
          cbRecoveryTimeScope();
        }
      });
    }, function (err) {
      if (err) {
        recoveryTimeScopePerModelMap[Model.modelName].upperBound = new Date().toISOString();
      } else {
        recoveryTimeScopePerModelMap[Model.modelName].upperBound = new Date(Math.max.apply(null, upperBounds)).toISOString();
      }

      recoveryTimeScopePerModelMap[Model.modelName].lowerBound = recoveryTimeScopePerModelMap.Initial;
      // use paralle
      var upperBounds = recoveryTimeScopePerModelMap.persist || {};
      upperBounds[Model.modelName] = recoveryTimeScopePerModelMap[Model.modelName].upperBound;
      // setTimeout(eventHistoryInstance.updateAttribute.bind(eventHistoryInstance.updateAttribute, 'latestUpdatePerModel', upperBounds, ignoreScopeOptions, function () {
      //   console.log("Saved To DB");
      // }), 0);
      eventHistoryInstance.updateAttribute('latestUpdatePerModel', upperBounds, ignoreScopeOptions, function () {});
      recoverModel(hostNameToRecover, Model, recoveryTimeScopePerModelMap, callbackFM);
    });
  }
}

function recoverModel(hostNameToRecover, Model, recoveryTimeScopePerModelMap, callbackFM) {
  var queryMapFetchModel = {};
  queryMapFetchModel.previousHost = generateQuery('PREVIOUS', recoveryTimeScopePerModelMap, Model, hostNameToRecover);
  queryMapFetchModel.currentHost = generateQuery('CURRENT', recoveryTimeScopePerModelMap, Model, hostNameToRecover);

  async.each(Object.keys(queryMapFetchModel), function (key, cbRecoverModel) {
    var query = queryMapFetchModel[key];
    fetchLimit(hostNameToRecover, Model, query, query.property, function (err, MaxTime) {
      if (err) {
        cbRecoverModel(err);
      } else {
        recoveryTimeScopePerModelMap[Model.modelName] = recoveryTimeScopePerModelMap[Model.modelName] || {};
        recoveryTimeScopePerModelMap[Model.modelName].timeToRecover = MaxTime;
        cbRecoverModel();
      }
    });
  }, function (err) {
    callbackFM(err);
  });
}

var generateQuery = function (scenario, recoveryTimeScopePerModelMap, Model, hostNameToRecover) {
  var recoveryTimeScope = recoveryTimeScopePerModelMap[Model.modelName];
  var order = scenario === 'PREVIOUS' ? 'oldUpdateTime' : 'currentUpdateTime';

  var query = {};
  query = {};
  query.property = order;
  query.limit = INSTANCES_TO_FETCH;
  query.order = [order + ' ASC'];
  if (scenario === 'PREVIOUS') {
    query.where = {and: [
      {'oldUpdateTime': {gte: new Date(recoveryTimeScope.lowerBound)}},
      {'oldUpdateTime': {lte: new Date(recoveryTimeScope.upperBound)}},
      {'oldHostName': hostNameToRecover},
      {'currentHostName': {neq: hostNameToRecover} }
    ]};
  } else {
    // scenario === 'CURRENT'
    query.where = {and: [
      {'currentUpdateTime': {gte: new Date(recoveryTimeScope.lowerBound)}},
      {'currentUpdateTime': {lte: new Date(recoveryTimeScope.upperBound)}},
      {'currentHostName': hostNameToRecover}
    ]};
  }

  return query;
};

module.exports = {
  init: init,
  config: config,
  create: createEventHistory,
  update: updateEventHistory,
  remove: removeEventHistory,
  recovery: recovery,
  updateRanOnce: updateRanOnce
};
