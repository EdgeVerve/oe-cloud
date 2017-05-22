/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
var async = require('async');
var log = require('./logger.js')('eventHistoryManager');
var _ = require('lodash');
var os = require('os');
var crypto = require('crypto');
var REPLAY_DELAY;
var REPLAY_JOB_INTERVAL;
var PRESIST_TO_DB_INTERVAL;
var MAX_RETRY;
var ignoreScopeOptions = {
  ignoreAutoScope: true,
  fetchAllScopes: true
};
var firstInit = true;
var eventHistoryArray = [];
var eventReplayJobInterval;
var persistToDBInterval;
var historyChanged = false;

function checkModelInstance(model, version, cb) {
  var query = {
    where: {
      _version: version
    }
  };
  model.find(query, ignoreScopeOptions, function modelFindCb(error, instance) {
    if (error || instance === null || instance.length === 0) {
      cb(error, false);
    } else {
      cb(null, true);
    }
  });
}

function executeBaseObservers(eventHistory, model, version, ctx, cb) {
  if (model.base && model.base._fsObservers) {
    executeObservers(eventHistory, model.base, version, ctx, cb);
  } else {
    cb();
  }
}

function executeObservers(eventHistory, model, version, ctx, finalcb) {
  executeBaseObservers(eventHistory, model, version, ctx, function executeBaseObserversFn(err) {
    if (err) {
      finalcb(err);
    }
    var observerStatus = eventHistory.observerArray;
    // Get all the observer ids for this model.
    var registeredObserverIds = model._fsObservers['after save'] && model._fsObservers['after save'].observerIds || [];
    var failSafeObservers = model._fsObservers['after save'] && model._fsObservers['after save'].observers || [];
    // Check if each observer was executed for event @ this timestamp
    async.each(registeredObserverIds, function asyncEachCbFn(id, cb) {
      if (_.indexOf(observerStatus, id) === -1) {
        // observer was not executed. we need to retrigger the event.
        log.debug(ctx, 'Event @', model.modelName, ' Observer -', id, ' -Failed');
        var observer = _.find(failSafeObservers, function findFn(x) { return x.getId() === id; });
        observer.execute(model.modelName, version, ctx, cb);
      } else {
        cb();
      }
    }, function AsyncEachCallbackFn(err) {
      finalcb(err);
    });
  });
}

function handleEventHistory(eventHistory) {
  var modelName = eventHistory.modelName;
  var model = loopback.getModel(modelName);
  var version = eventHistory.version;
  var ctx = eventHistory.ctx;
  if (eventHistory.retryTimes === MAX_RETRY) {
    // TODO save to another collection for visibility
    log.warn(ctx, 'observer for model: ' + modelName + ' reached max retries');
    _.remove(eventHistoryArray, (e) => { return e.version === version && e.modelName === modelName; });
    return;
  }
  checkModelInstance(model, version, function checkModelInstanceFn(error, vaild) {
    if (!vaild) {
      log.error(ctx, 'No model instance for Event history');
      _.remove(eventHistoryArray, (e) => { return e.version === version && e.modelName === modelName; });
    } else {
      executeObservers(eventHistory, model, version, ctx, function executeObserversFn(err) {
        eventHistory.retryTimes++;
        if (!err) {
          log.debug(ctx, 'replayJob finished with no errors removing event histroy entry');
          _.remove(eventHistoryArray, (e) => { return e.version === version && e.modelName === modelName; });
          historyChanged = true;
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


function persistToDB() {
  // return;
  log.debug(log.defaultContext(), 'Executing persist to db job');
  var eventHistoryModel = loopback.getModel('EventHistory');
  var ignoreScopeOptions = {
    ignoreAutoScope: true,
    fetchAllScopes: true
  };
  if (!historyChanged) {
    return;
  }
  eventHistoryModel.destroyAll({ hostName: os.hostname() }, ignoreScopeOptions, function eventHistoryModelDestroyAllFn(err, info) {
    if (err) {
      log.error(log.defaultContext(), 'persistToDB: ', err);
    } else {
      if (typeof info !== 'undefined') {
        log.info(log.defaultContext(), 'persistToDB: deleted ', info.count, ' eventHistory instances');
      }
      log.debug(log.defaultContext(), 'persistToDB: this is eventHistoryArray: ', JSON.stringify(eventHistoryArray));
      var eventHistoryToSave = [];
      eventHistoryArray.forEach(function eventHistoryArrayForEachFn(eventHistory) {
        var evH = createEventHistoryToStore(eventHistory);
        eventHistoryToSave.push(evH);
      }, this);
      var instance = {
        eventHistoryArray: eventHistoryToSave,
        hostName: os.hostname(),
        timestamp: new Date()
      };
      historyChanged = false;
      eventHistoryModel.create(instance, ignoreScopeOptions, function eventHistoryModelCreateCbFn(err) {
        if (err) {
          log.error(log.defaultContext(), err);
        }
      });
    }
  });
}

function md5(str) {
  var hash = crypto.createHash('md5');
  hash.update(str);
  return hash.digest('hex');
}

function createEventHistory(modelName, version, ctx) {
  log.debug(ctx, 'creating a new entry with: ', modelName, ' ', version);
  var eventHistory = {};
  eventHistory.modelName = modelName;
  eventHistory.version = version;
  eventHistory.id = md5(modelName + version);
  eventHistory.observerArray = [];
  eventHistory.ctx = ctx;
  eventHistory.timestamp = new Date();
  eventHistory.retryTimes = 0;
  historyChanged = true;
  eventHistoryArray.push(eventHistory);
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
  return eventHistory;
}

function updateEventHistory(modelName, version, observerId) {
  log.debug(log.defaultContext(), 'observer id: ', observerId, ' for model: ', modelName, ' ', version, ' completed');
  var eventHistory = _.find(eventHistoryArray, function eventHistoryFindFn(event) { return event.modelName === modelName && event.version === version; });
  if (eventHistory && eventHistory.observerArray) {
    eventHistory.observerArray.push(observerId);
    historyChanged = true;
  }
}

function removeEventHistory(modelName, version, msg) {
  log.debug('removing event due to: ' + msg);
  _.remove(eventHistoryArray, (e) => { return e.version === version && e.modelName === modelName; });
}

var appInstance;
function init(app) {
  var config = require('../server/config');
  REPLAY_DELAY = app.get('eventReliabilityReplayThreshold') || config.eventReliabilityReplayThreshold;
  REPLAY_JOB_INTERVAL = app.get('eventReliabilityReplayInterval') || config.eventReliabilityReplayInterval;
  PRESIST_TO_DB_INTERVAL = app.get('eventReliabilityDbPersistenceInterval') || config.eventReliabilityDbPersistenceInterval;
  MAX_RETRY = app.get('eventReliabilityMaxRetry') || config.eventReliabilityMaxRetry;
  appInstance = app;

  intervalInit(function intervalInitFn(err) {
    if (err) {
      var interval = setInterval(intervalInit, 5000, function setIntervalCbFn(err) {
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
    var eventHistoryModel = loopback.getModel('EventHistory');
    eventHistoryModel.find({ where: { hostName: os.hostname() } }, ignoreScopeOptions, function eventHistoryModelFindCbFn(err, instances) {
      if (err) {
        log.error(log.defaultContext(), 'failed to load event history instances from db with error: ', err);
        cb(err);
      } else {
        if (instances.length !== 0) {
          log.debug(log.defaultContext(), 'loaded ', instances.length, ' event history instances from db');
          eventHistoryArray = instances[0].eventHistoryArray;
          var version;
          var data;
          eventHistoryArray.forEach(function eventHistoryArrayForEachFn(eventHistory) {
            eventHistory.ctx.options = JSON.parse(eventHistory.ctx.options);
            version = eventHistory.ctx.instance._version;
            data = eventHistory.ctx.instance.__data;
            eventHistory.ctx.Model = eventHistory.ctx.instance = loopback.getModel(eventHistory.modelName);
            eventHistory.ctx.instance._version = version;
            eventHistory.ctx.instance.__data = data;
          }, this);
        }
        eventHistoryModel.findOne({}, { fetchAllScopes: true, ctx: { tenantId: 'default' } }, function eventHistoryModelFindONeFn(err, instance) {
          if (err) {
            // TO DO - error handling here
            return cb();
          } else if (instance) {
            fetchModels(appInstance, instance.timestamp, function fetchModelsFn(error) {
              eventReplayJobInterval = setInterval(eventReplayJob, REPLAY_JOB_INTERVAL);
              persistToDBInterval = setInterval(persistToDB, PRESIST_TO_DB_INTERVAL);
              firstInit = false;
              cb();
            });
          } else {
            eventReplayJobInterval = setInterval(eventReplayJob, REPLAY_JOB_INTERVAL);
            persistToDBInterval = setInterval(persistToDB, PRESIST_TO_DB_INTERVAL);
            firstInit = false;
            cb();
          }
        });
      }
      /*
      eventReplayJobInterval = setInterval(eventReplayJob, REPLAY_JOB_INTERVAL);
              persistToDBInterval = setInterval(persistToDB, PRESIST_TO_DB_INTERVAL);
              firstInit = false;
              cb();
              */
    });
  }
}

function fetchModels(app, fromTime, cb) {
  var relevantEntries = [];

  var query = {};
  query.where = { _modifiedOn: { gt: fromTime } };

  async.each(Object.keys(app.models), processModel, processEntries);

  function processModel(model, callback) {
    if (app.models[model].definition.settings.mixins &&
      app.models[model].definition.settings.mixins.FailsafeObserverMixin) {
      return findAllEntities(app.models[model], callback);
    }
    return callback();
  }

  function findAllEntities(model, callback) {
    model.find(query, { fetchAllScopes: true, ctx: { tenantId: 'default' } }, function modelFindFn(err, returnedInstances) {
      if (err) {
        // TO DO - error handling here
        return callback(err);
      }
      if (returnedInstances.length === 0) {
        return callback();
      }
      relevantEntries = relevantEntries.concat(returnedInstances);
      return callback();
    });
  }

  function processEntries() {
    relevantEntries.forEach(function relevantEntriesForEachFn(model) {
      var ctx = {};
      ctx.instance = model;
      ctx.Model = loopback.getModel(model._type);
      ctx.options = JSON.parse(model._fsCtx);
      createEventHistory(model._type, model._version, ctx);
    }, this);
    cb();
  }
}

module.exports = {
  init: init,
  create: createEventHistory,
  update: updateEventHistory,
  remove: removeEventHistory
};
