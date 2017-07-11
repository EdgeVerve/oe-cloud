var loopback = require('loopback');
var async = require('async');
var log = require('oe-logger')('eventHistoryManager');
var _ = require('lodash');
var os = require('os');
var crypto = require('crypto');
var REPLAY_DELAY;
var REPLAY_JOB_INTERVAL;
var PRESIST_TO_DB_INTERVAL;
var MAX_RETRY;
var INSTANCES_TO_FETCH;
var START_UP_INTERVAL;
var lastPersistedBeforeServerDownTime;
var continueStartUp = false;
var serverUpTime;
var doStartUpOperation = false;
var ignoreScopeOptions = {
  ignoreAutoScope: true,
  fetchAllScopes: true
};
var fetchDeleted = {
  ignoreAutoScope: true,
  fetchAllScopes: true,
  fetchDeleted: true
};
var firstInit = true;
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
      finalcb(err);
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
      finalcb(err);
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
        log.error(ctx, 'No model instance for Event history ', modelName, ' with version ', version);
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
          cb();
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
      log.error(log.defaultContext(), err);
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

function persistToDB() {
  var eventHistoryModel = getEventHistoryModel();
  if (!_historyChanged) {
    eventHistoryModel.findOne({}, { fetchAllScopes: true, ctx: { tenantId: 'default' } }, function (err, instance) {
      if (err) {
        log.error(log.defaultContext(), 'persistToDB: find one event history instance error: ', err);
      } else if (instance) {
        instance.timestamp = new Date();
        instance.doStartUpOperation = true;
        instance.updateAttributes(instance.__data, { fetchAllScopes: true, ctx: { tenantId: 'default' } }, function (error, savedRec) {
          if (error) {
            log.error(log.defaultContext(), 'persistToDB: update timestamp of event history instance error: ', error);
          } else {
            log.debug(log.defaultContext(), 'persistToDB: updated timestamp of event history instance');
          }
        });
      }
    });
  } else {
    log.trace(log.defaultContext(), 'Executing persist to db job');
    eventHistoryModel.destroyAll({ hostName: os.hostname() }, ignoreScopeOptions, function (err, info) {
      if (err) {
        log.error(log.defaultContext(), 'persistToDB: ', err);
      } else {
        if (typeof info !== 'undefined') {
          log.debug(log.defaultContext(), 'persistToDB: deleted ', info.count, ' eventHistory instances');
        }
        log.debug(log.defaultContext(), 'persistToDB: this is eventHistoryMap: ', JSON.stringify(eventHistoryMap));
        var instance = {
          eventHistoryMap: eventHistoryMap,
          hostName: os.hostname(),
          timestamp: new Date(),
          doStartUpOperation: true
        };
        _historyChanged = false;
        eventHistoryModel.create(instance, ignoreScopeOptions, function (err) {
          if (err) {
            log.error(log.defaultContext(), err);
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
  eventHistory.ctx.instance = {};
  if (ctx.instance) {
    eventHistory.ctx.instance._version = ctx.instance._version;
    eventHistory.ctx.instance.__data = ctx.instance.__data;
  }
  if (ctx.data) {
    eventHistory.ctx.data = ctx.data;
  }
  eventHistory.timestamp = new Date();
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
  // initialize INSTANCES_TO_FETCH and START_UP_INTERVAL for startup
  INSTANCES_TO_FETCH = app.get('eventHistoryStartUpInstancesToFetch') || config.eventHistoryStartUpInstancesToFetch;
  START_UP_INTERVAL = app.get('eventHistoryStartUpInterval') || config.eventHistoryStartUpInterval;
  appInstance = app;
  // initialize serverUpTime for startup
  serverUpTime = new Date();

  intervalInit(function (err) {
    if (err) {
      var interval = setInterval(intervalInit, 5000, function (err) {
        if (typeof err === 'undefined') {
          clearInterval(interval);
        }
      });
    }
  });
}

function intervalInit(cb) {
  if (!firstInit) {
    cb();
  } else {
    var eventHistoryModel = getEventHistoryModel();
    eventHistoryModel.findOne({ where: { hostName: os.hostname() } }, ignoreScopeOptions, function (err, instance) {
      if (err) {
        log.error(log.defaultContext(), 'failed to load event history instances from db with error: ', err);
        cb(err);
      } else {
        if (instance) {
          log.debug(log.defaultContext(), 'loaded event history instance from db');
          eventHistoryMap = instance.eventHistoryMap;
          // initialize lastPersistedBeforeServerDownTime
          lastPersistedBeforeServerDownTime = instance.timestamp;
          doStartUpOperation = instance.doStartUpOperation;
        }
        // call fetchModels with START_UP_INTERVAL
        if (typeof lastPersistedBeforeServerDownTime !== 'undefined' && doStartUpOperation) {
          setTimeout(fetchModels, START_UP_INTERVAL);
        }
        setInterval(eventReplayJob, REPLAY_JOB_INTERVAL);
        setInterval(persistToDB, PRESIST_TO_DB_INTERVAL);
        firstInit = false;
        cb();
      }
    });
  }
}

function fetchModels() {
  continueStartUp = false;
  var app = appInstance;
  log.info(log.defaultContext, 'Event history fetchModels ');
  async.each(Object.keys(app.models), function (model, callback) {
    if (app.models[model].definition.settings.mixins &&
      app.models[model].definition.settings.mixins.FailsafeObserverMixin) {
      var Model = app.models[model];
      var query = {};
      query.limit = INSTANCES_TO_FETCH;
      query.where = { and: [ { _modifiedOn: { gte: lastPersistedBeforeServerDownTime } }, { _modifiedOn: { lt: serverUpTime } }, { _processed: false } ] };
      Model.find(query, { fetchAllScopes: true, ctx: { tenantId: 'default' } }, function (err, results) {
        if (err) {
          return callback(err);
        }
        if (results) {
          if (results.length !== 0) {
            continueStartUp = true;
          }
          results.forEach(function (rec) {
            rec._processed = true;
            rec.updateAttributes(rec.__data, { fetchAllScopes: true, ctx: { tenantId: 'default' } }, function (error, savedRec) {
              if (error) {
                log.error({ fetchAllScopes: true, ctx: { tenantId: 'default' } }, 'error while marking instance as precessed ', error);
                // TO DO - error handling here
                // return cb(error);
              } else {
                log.debug({ fetchAllScopes: true, ctx: { tenantId: 'default' } }, 'instance marked as processed');
                var ctx = {};
                ctx.instance = savedRec;
                ctx.Model = Model;
                if (savedRec._fsCtx) {
                  try {
                    ctx.options = JSON.parse(savedRec._fsCtx);
                  } catch (e) {
                    log.error(log.defaultContext(), 'failed to parse _fsCtx: ', e);
                  }
                }
                createEventHistory(savedRec._type, savedRec._version, 'after save', ctx);
              }
            });
          }, this);
          callback();
        }
      });
    } else {
      callback();
    }
  }, function () {
    if (typeof lastPersistedBeforeServerDownTime !== 'undefined' && continueStartUp) {
      setTimeout(fetchModels, START_UP_INTERVAL);
    }
  });
}

module.exports = {
  init: init,
  create: createEventHistory,
  update: updateEventHistory,
  remove: removeEventHistory
};
