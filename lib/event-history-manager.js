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
var continueStartUp = {};
var ignoreScopeOptions = {
  ignoreAutoScope: true,
  fetchAllScopes: true
};
var eventHistoryMap = {};
var ctxMap = {};
var EventHistoryModel;
var _historyChanged = false;

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
    var failSafeObservers = model._fsObservers[operation] && model._fsObservers[operation].observers || [];
    // Check if each observer was executed for event @ this timestamp
    async.each(registeredObserverIds, function (id, cb) {
      if (_.indexOf(observerStatus, id) === -1) {
        // observer was not executed. we need to retrigger the event.
        log.debug(ctx, 'Event @', model.modelName, ' Observer -', id, ' -Failed');
        var observer = _.find(failSafeObservers, function (x) { return x.getId() === id; });
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
    if ((timeSinceLastReplay > REPLAY_DELAY) && (event.retryTimes === 0 || timeSinceLastReplay > Math.pow(2, event.retryTimes) * REPLAY_JOB_INTERVAL)) {
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
    eventHistoryModel.destroyAll({ hostName: currHostName }, ignoreScopeOptions, function (err, info) {
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

function removeEventHistory(modelName, version, operation, msg) {
  log.debug('removing event due to: ' + msg);
  var key = version + modelName + operation;
  delete eventHistoryMap[key];
  delete ctxMap[key];
  _historyChanged = true;
}

var appInstance;

function init(app) {
  var config = require('../server/config');
  REPLAY_DELAY = app.get('eventReliabilityReplayThreshold') || config.eventReliabilityReplayThreshold;
  REPLAY_JOB_INTERVAL = app.get('eventReliabilityReplayInterval') || config.eventReliabilityReplayInterval;
  PRESIST_TO_DB_INTERVAL = app.get('eventReliabilityDbPersistenceInterval') || config.eventReliabilityDbPersistenceInterval;
  MAX_RETRY = app.get('eventReliabilityMaxRetry') || config.eventReliabilityMaxRetry;
  INSTANCES_TO_FETCH = app.get('eventHistoryStartUpInstancesToFetch') || config.eventHistoryStartUpInstancesToFetch;
  SERVER_RECOVERY_INTERVAL = app.get('eventHistoryStartUpInterval') || config.eventHistoryStartUpInterval;
  appInstance = app;
  setInterval(eventReplayJob, REPLAY_JOB_INTERVAL);
  setInterval(persistToDB, PRESIST_TO_DB_INTERVAL);
  if (!process.env.USE_BROADCASTER) {
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
  console.log('------Started recovery of: ', recoveryHostNameArr, ' in host: ', currHostName, '------');
  async.each(recoveryHostNameArr, function (hostname, asyncCb) {
    console.log('------Started recovery of: ', hostname, ' in host: ', currHostName, '------');
    recovery(hostname, asyncCb);
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
  eventHistoryModel.findOne({ where: { hostName: hostname } }, ignoreScopeOptions, function (err, instance) {
    if (err) {
      log.debug(log.defaultContext(), 'failed to load event history instances from db with error: ', err);
      console.log('------recovery for ', hostname, ' failed!!!!!!! ', err);
      broadcasterClient.recoveryFail(hostname);
      cb();
    } else if (instance.length === 0) {
      log.debug(log.defaultContext(), 'No event history record in DB. Cannot continue recovery');
      console.log('------recovery for ', hostname, ' failed!!!!!!!');
      broadcasterClient.recoveryFail(hostname);
      cb();
    } else if (instance) {
      log.debug(log.defaultContext(), 'loaded event history instance from db');
      if (typeof instance.timestamp !== 'undefined' && instance.doStartUpOperation) {
        // call fetchModels with SERVER_RECOVERY_INTERVAL
        var hostNameToRecover = instance.hostName;
        var timeToRecover = instance.timestamp;
        var timeToRecoverPerModelMap = {};
        timeToRecoverPerModelMap.Initial = timeToRecover;
        continueStartUp[hostNameToRecover] = {};
        setTimeout(fetchModels.bind(this, hostNameToRecover, timeToRecoverPerModelMap, cb), SERVER_RECOVERY_INTERVAL);
      }
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
        continueStartUp[hostNameToRecover].recovery = true;
      }
      if (results.length < INSTANCES_TO_FETCH) {
        continueStartUp[hostNameToRecover][Model.modelName] = false;
      }
      if (results.length !== 0) {
        var maxTime = results[results.length - 1][property];
        console.log('------for host: ', hostNameToRecover, ' for model: ', Model.modelName, ' fetched ', results.length, ' records');
      }
      async.each(results, function (rec, asyncCb) {
        var context = createContext(rec, Model);
        rec.createEventHistory(context, context.ctx.options, function (err) {
          if (err) {
            log.debug(log.defaultContext(), 'failed to create eventHistory remotely', err);
            // TODO error handling
            return asyncCb(err);
          }
          log.debug(log.defaultContext(), 'created eventHistory remotely successfully');
          return asyncCb();
        });
      }, function (err) {
        if (err) {
          log.debug(log.defaultContext(), err);
          return cb(err);
        }
        cb(null, maxTime);
      });
    }
  });
}

function fetchModels(hostNameToRecover, timeToRecoverPerModelMap, cb) {
  log.debug(log.defaultContext, 'Event history fetchModels ');
  continueStartUp[hostNameToRecover].recovery = false;
  var app = appInstance;
  var initalTime = timeToRecoverPerModelMap.Initial;
  delete timeToRecoverPerModelMap.Initial;
  async.each(Object.keys(app.models), function (model, callback) {
    if (app.models[model].definition.settings.mixins &&
      app.models[model].definition.settings.mixins.FailsafeObserverMixin) {
      var Model = app.models[model];
      if (continueStartUp[hostNameToRecover][Model.modelName] === false) {
        callback();
      } else {
        var timeToRecoverOld;
        var timeToRecoverCurr;
        if (initalTime) {
          timeToRecoverOld = initalTime;
          timeToRecoverCurr = initalTime;
        } else if (timeToRecoverPerModelMap[Model.modelName]) {
          timeToRecoverOld = timeToRecoverPerModelMap[Model.modelName].timeToRecoverOld;
          timeToRecoverCurr = timeToRecoverPerModelMap[Model.modelName].timeToRecoverCurr;
        }
        if (typeof timeToRecoverOld === 'undefined' && typeof timeToRecoverCurr === 'undefined') {
          return callback();
        }
        if (typeof timeToRecoverOld !== 'undefined') {
          var queryOld = {};
          queryOld.limit = INSTANCES_TO_FETCH;
          queryOld.order = ['oldUpdateTime ASC'];
          queryOld.where = {and: [{'oldUpdateTime': {gte: timeToRecoverOld}}, {'oldHostName': hostNameToRecover}, {'currentHostName': {neq: hostNameToRecover} }]};
          fetchLimit(hostNameToRecover, Model, queryOld, 'oldUpdateTime', function (err, MaxTimeOld) {
            if (err) {
              return callback(err);
            }
            timeToRecoverPerModelMap[Model.modelName] = timeToRecoverPerModelMap[Model.modelName] || {};
            timeToRecoverPerModelMap[Model.modelName].timeToRecoverOld = MaxTimeOld;
            if (typeof timeToRecoverCurr !== 'undefined') {
              var queryCurr = {};
              queryCurr.limit = INSTANCES_TO_FETCH;
              queryCurr.order = ['currentUpdateTime ASC'];
              queryCurr.where = {and: [{'currentUpdateTime': {gte: timeToRecoverCurr}}, {'currentHostName': hostNameToRecover}]};
              fetchLimit(hostNameToRecover, Model, queryCurr, 'currentUpdateTime', function (err, maxTimeCurr) {
                if (err) {
                  return callback(err);
                }
                timeToRecoverPerModelMap[Model.modelName] = timeToRecoverPerModelMap[Model.modelName] || {};
                timeToRecoverPerModelMap[Model.modelName].timeToRecoverCurr = maxTimeCurr;
                return callback();
              });
            }
          });
        } else if (typeof timeToRecoverCurr !== 'undefined') {
          var query = {};
          query.limit = INSTANCES_TO_FETCH;
          query.order = ['currentUpdateTime ASC'];
          query.where = {and: [{'currentUpdateTime': {gte: timeToRecoverCurr}}, {'currentHostName': hostNameToRecover}]};
          fetchLimit(hostNameToRecover, Model, query, 'currentUpdateTime', function (err, maxTimeCurr) {
            if (err) {
              return callback(err);
            }
            timeToRecoverPerModelMap[Model.modelName] = timeToRecoverPerModelMap[Model.modelName] || {};
            timeToRecoverPerModelMap[Model.modelName].timeToRecoverCurr = maxTimeCurr;
            return callback();
          });
        }
      }
    } else {
      callback();
    }
  }, function (err) {
    if (err) {
      log.debug(log.defaultContext(), 'error in fetching models', err);
      console.log('------recovery for ', hostNameToRecover, ' failed!!!!!!!', err);
      broadcasterClient.recoveryFail(hostNameToRecover);
      cb(err);
    } else if (continueStartUp[hostNameToRecover].recovery) {
      setTimeout(fetchModels.bind(this, hostNameToRecover, timeToRecoverPerModelMap, cb), SERVER_RECOVERY_INTERVAL);
    } else if (!continueStartUp[hostNameToRecover].recovery) {
      console.log('------recovery for ', hostNameToRecover, ' finished successfully!');
      broadcasterClient.recoverySuccess(hostNameToRecover);
      cb();
    }
  });
}

module.exports = {
  init: init,
  create: createEventHistory,
  update: updateEventHistory,
  remove: removeEventHistory
};
