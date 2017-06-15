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
var eventHistoryArray = [];
var eventReplayJobInterval;
var persistToDBInterval;
var EventHistoryModel; 
var _historyChanged = false;

function checkModelInstance(model, version, operation, cb) {
  var query = {
    where: {
      _version: version
    }
  };
  if (operation === 'after delete') {
    model.find(query, fetchDeleted, function (error, instance) {
      if (error || instance === null || instance.length === 0) {
        cb(error, false);
      } else {
        cb(null, true);
      }
    });
  } else {
    model.find(query, ignoreScopeOptions, function (error, instance) {
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

function handleEventHistory(eventHistory) {
  var modelName = eventHistory.modelName;
  var model = loopback.getModel(modelName);
  var version = eventHistory.version;
  var ctx = eventHistory.ctx;
  var operation = eventHistory.operation;
  if (eventHistory.retryTimes === MAX_RETRY) {
    // TODO save to another collection for visibility
    log.warn(ctx, 'observer for model: ' + modelName + ' reached max retries');
    _.remove(eventHistoryArray, (e) => (e) => { return e.version === version && e.modelName === modelName && e.operation === operation; });
    _historyChanged = true;
    return;
  }
  checkModelInstance(model, version, operation, function (error, vaild) {
    if (!vaild) {
      log.error(ctx, 'No model instance for Event history ', model.modelName, ' with version ', version);
      _.remove(eventHistoryArray, (e) => (e) => { return e.version === version && e.modelName === modelName && e.operation === operation; });
      _historyChanged = true;
    } else {
      executeObservers(eventHistory, model, version, ctx, function (err) {
        eventHistory.retryTimes++;
        if (!err) {
          log.debug(ctx, 'replayJob finished with no errors removing event histroy entry');
          _.remove(eventHistoryArray, (e) => (e) => { return e.version === version && e.modelName === modelName && e.operation === operation; });
          _historyChanged = true;
        }
      });
    }
  });
}

function eventReplayJob() {
  log.debug(log.defaultContext(), 'Executing replay job');
  eventHistoryArray.filter(filterEvent).forEach(handleEventHistory);
}

function filterEvent(event) {
  var timeSinceLastReplay = new Date() - event.timestamp;
  return timeSinceLastReplay > REPLAY_DELAY &&
    (event.retryTimes === 0 || timeSinceLastReplay > Math.pow(2, event.retryTimes) * REPLAY_JOB_INTERVAL);
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
      } else {
        instance.timestamp = new Date();
        instance.updateAttributes(instance.__data, { fetchAllScopes: true, ctx: { tenantId: 'default' } }, function (error, savedRec) {
          if (error) {
            log.error(log.defaultContext(), 'persistToDB: update timestamp of event history instance error: ', error);
          } else {
            log.info(log.defaultContext(), 'persistToDB: saved event history instance');
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
        log.debug(log.defaultContext(), 'persistToDB: this is eventHistoryArray: ', JSON.stringify(eventHistoryArray));
        var eventHistoryToSave = [];
        eventHistoryArray.forEach(function (eventHistory) {
          var evH = createEventHistoryToStore(eventHistory);
          eventHistoryToSave.push(evH);
        }, this);
        var instance = {
          eventHistoryArray: eventHistoryToSave,
          hostName: os.hostname(),
          timestamp: new Date()
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
  eventHistory.ctx = ctx;
  eventHistory.timestamp = new Date();
  eventHistory.retryTimes = 0;
  eventHistory.operation = operation;
  var eventFound = eventHistoryArray.find(function (event) {
    return event.id === md5(modelName + version);
  });
  if (!eventFound) {
    _historyChanged = true;
    eventHistoryArray.push(eventHistory);
  }
}

function createEventHistoryToStore(eventHistoryOrig) {
  var eventHistory = {};
  eventHistory.modelName = eventHistoryOrig.modelName;
  eventHistory.version = eventHistoryOrig.version;
  eventHistory.id = md5(eventHistoryOrig.modelName + eventHistoryOrig.version);
  eventHistory.observerArray = eventHistoryOrig.observerArray.splice(0);
  eventHistory.ctx = {};
  eventHistory.ctx.options = JSON.stringify(eventHistoryOrig.ctx.options);
  eventHistory.ctx.instance = {};
  eventHistory.ctx.data = {};
  eventHistory.ctx.Model = {};
  if (eventHistoryOrig.ctx.instance) {
    eventHistory.ctx.instance._version = eventHistoryOrig.ctx.instance._version;
    eventHistory.ctx.instance.__data = eventHistoryOrig.ctx.instance.__data;
  }
  eventHistory.ctx.data = eventHistoryOrig.ctx.data;
  eventHistory.timestamp = eventHistoryOrig.timestamp;
  eventHistory.retryTimes = eventHistoryOrig.retryTimes;
  eventHistory.operation = eventHistoryOrig.operation;
  return eventHistory;
}

function updateEventHistory(modelName, version, operation, observerId) {
  log.debug(log.defaultContext(), 'observer id: ', observerId, ' for model: ', modelName, ' ', version, ' completed');
  var eventHistory = _.find(eventHistoryArray, (e) => { return e.version === version && e.modelName === modelName && e.operation === operation; });
  if (eventHistory && eventHistory.observerArray) {
    eventHistory.observerArray.push(observerId);
    _historyChanged = true;
  }
}

function removeEventHistory(modelName, version, operation, msg) {
  log.debug('removing event due to: ' + msg);
  _.remove(eventHistoryArray, (e) => { return e.version === version && e.modelName === modelName && e.operation === operation; });
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
    log.debug(log.defaultContext(), 'setting new values to constants: ', REPLAY_DELAY, ' ', PRESIST_TO_DB_INTERVAL);
    clearInterval(eventReplayJobInterval);
    clearInterval(persistToDBInterval);
    eventReplayJobInterval = setInterval(eventReplayJob, REPLAY_JOB_INTERVAL);
    persistToDBInterval = setInterval(persistToDB, PRESIST_TO_DB_INTERVAL);
    cb();
  } else {
    var eventHistoryModel = getEventHistoryModel();
    eventHistoryModel.find({ where: { hostName: os.hostname() } }, ignoreScopeOptions, function (err, instances) {
      if (err) {
        log.error(log.defaultContext(), 'failed to load event history instances from db with error: ', err);
        cb(err);
      } else {
        if (instances.length !== 0) {
          log.debug(log.defaultContext(), 'loaded ', instances.length, ' event history instances from db');
          eventHistoryArray = instances[0].eventHistoryArray;
          var version;
          var data;
          eventHistoryArray.forEach(function (eventHistory) {
            eventHistory.ctx.options = JSON.parse(eventHistory.ctx.options);
            version = eventHistory.ctx.instance._version;
            data = eventHistory.ctx.instance.__data;
            eventHistory.ctx.Model = eventHistory.ctx.instance = loopback.getModel(eventHistory.modelName);
            eventHistory.ctx.instance._version = version;
            for (var key in data) {
              if (key !== 'id' || key[0] !== '-') {
                eventHistory.ctx.instance[key] = data[key];
              }
            }
            eventHistory.ctx.instance.__data = data;
          }, this);
        }
        eventHistoryModel.findOne({}, { fetchAllScopes: true, ctx: { tenantId: 'default' } }, function (err, instance) {
          if (err) {
            // TO DO - error handling here
            return cb();
          } else if (instance) {
            // initiate lastPersistedBeforeServerDownTime
            lastPersistedBeforeServerDownTime = instance.timestamp;
          }
          // call fetchModels with START_UP_INTERVAL
          if (lastPersistedBeforeServerDownTime !== undefined) {
            setTimeout(fetchModels, START_UP_INTERVAL);
          }
          eventReplayJobInterval = setInterval(eventReplayJob, REPLAY_JOB_INTERVAL);
          persistToDBInterval = setInterval(persistToDB, PRESIST_TO_DB_INTERVAL);
          firstInit = false;
          cb();
        });
      }
    });
  }
}

function fetchModels() {
  continueStartUp = false;
  var app = appInstance;
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
                log.info({ fetchAllScopes: true, ctx: { tenantId: 'default' } }, 'instance marked as processed');
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
                createEventHistory(savedRec._type, savedRec._version, 'loaded', ctx);
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
    if (lastPersistedBeforeServerDownTime !== undefined && continueStartUp) {
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