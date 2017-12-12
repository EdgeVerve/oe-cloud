'use strict';

var loopback = require('loopback');
var async = require('async');
var log = require('oe-logger')('eventHistoryManager');
var _ = require('lodash');
var os = require('os');
var process = require('process');
var currHostName = process.env.HOSTNAME || os.hostname();
var crypto = require('crypto');
var UUID = require('node-uuid');
var currHostUUID = UUID.v4();
var REPLAY_DELAY;
var REPLAY_JOB_INTERVAL;
// var PRESIST_TO_DB_INTERVAL;
// var MAX_RETRY;
var RETRY_TIME_INTERVAL;
var ignoreScopeOptions = {
  ignoreAutoScope: true,
  fetchAllScopes: true
};
var eventHistoryMap = {};
var eventHistoryRecoveryMap = {};
var ctxMap = {};
// var _historyChanged = false;
var SavePointModel;
// var appInstance;
// var broadcasterClient = require('./common/broadcaster-client.js');

// var myEE = broadcasterClient.eventEmitter;
// var INSTANCES_TO_FETCH;
// var SERVER_RECOVERY_INTERVAL;
// var recoveryAvailable = {};

// var EventHistoryModel;

// var STATUS_UNDEFINED = 'undefined';
// var STATUS_RECOVERY_FINSHED = 'RecoveryFinished';
// var STATUS_TO_BE_RECOVERED = 'ToBeRecovered';
// var STATUS_IN_RECOVERY = 'InRecovery';

// var currentlyRecovering = {};

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
  // if (eventHistory.retryTimes === MAX_RETRY) {
  if (!eventHistory.ctx.fromRecovery && eventHistory.timestamp.getTime() < Date.now() - RETRY_TIME_INTERVAL) {
    // TODO save to another collection for visibility
    log.warn(ctx, 'observer for model: ' + modelName + ' reached max retries');
    delete eventHistoryMap[key];
    delete ctxMap[key];
    // _historyChanged = true;
    cb();
  } else if (eventHistory.ctx.fromRecovery === true && eventHistory.created.getTime() < Date.now() - RETRY_TIME_INTERVAL) {
    // TODO report to recovery service.
    log.warn(ctx, 'observer for model: ' + modelName + ' reached max retries');
    delete eventHistoryRecoveryMap[key];
    delete ctxMap[key];
    // _historyChanged = true;
    cb();
  } else {
    checkModelInstance(model, version, operation, ctx.options, function (error, vaild) {
      if (!vaild) {
        log.debug(ctx, 'No model instance for Event history ', modelName, ' with version ', version);
        var key = version + modelName + operation;
        !eventHistory.ctx.fromRecovery ? delete eventHistoryMap[key] : delete eventHistoryRecoveryMap[key];
        delete ctxMap[key];
        // _historyChanged = true;
        cb();
      } else {
        executeObservers(eventHistory, model, version, ctx, function (err) {
          eventHistory.retryTimes++;
          if (!err) {
            log.debug(ctx, 'replayJob finished with no errors removing event histroy entry');
            var key = version + modelName + operation;
            !eventHistory.ctx.fromRecovery ? delete eventHistoryMap[key] : delete eventHistoryRecoveryMap[key];
            delete ctxMap[key];
            // _historyChanged = true;
          }
          return cb();
        });
      }
    });
  }
}

function eventReplayJob() {
  console.log('eventReplayJob new keys: ' + Object.keys(eventHistoryMap).length + ", recovery keys: " + Object.keys(eventHistoryRecoveryMap).length);

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
    persistToDB();
    setTimeout(eventReplayJob, REPLAY_JOB_INTERVAL);
  });
}

function filterEvents() {
  var resMap = {};
  if (!eventHistoryMap) {
    return {};
  }
  var keys;
  var event;
  var timeSinceLastReplay;

  keys = Object.keys(eventHistoryMap).concat(Object.keys(eventHistoryRecoveryMap));
  for (var key of keys) {
    event = eventHistoryMap[key] || eventHistoryRecoveryMap[key];
    timeSinceLastReplay = new Date() - event.timestamp;
    if ((timeSinceLastReplay > REPLAY_DELAY) && (event.retryTimes === 0 || timeSinceLastReplay > Math.pow(2, event.retryTimes) * REPLAY_JOB_INTERVAL)) {
      resMap[key] = event;
    }
  }

  return resMap;
}

var prevTimestemp = new Date();
var inHotSpot = false;
function persistToDB() {
  var instance = {
    hostName: currHostName,
    hostUUID: currHostUUID,
    timestamp: getMinTimestamp(),
    doStartUpOperation: true
  };
  if ( !inHotSpot && instance.timestamp.getTime() === prevTimestemp.getTime()) {
    console.log('HotSpot At ' + prevTimestemp.getTime());
    inHotSpot = true;
  } else if (inHotSpot && instance.timestamp.getTime() > prevTimestemp.getTime() ) {
    inHotSpot = false;
  }
  // console.log('Persisted ' + instance.timestamp.getTime());
  prevTimestemp = instance.timestamp;
  SavePointModel.create(instance, ignoreScopeOptions, function (err) {
    if (err) {
      log.debug(log.defaultContext(), err);
    }
  });
  // }
  // setTimeout(persistToDB, PRESIST_TO_DB_INTERVAL);
}

function getMinTimestamp() {
  var minTimestamp = new Date();
  Object.keys(eventHistoryMap).forEach(function (key) {
    minTimestamp = Math.min(minTimestamp, eventHistoryMap[key].timestamp);
  });
  return new Date(minTimestamp);
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
  if (ctx.fromRecovery === true) {
    console.log('Registered an event from recovery service.');
    eventHistory.ctx.fromRecovery = true;
    eventHistory.created = new Date();
    eventHistoryRecoveryMap[key] = eventHistory;
  } else if (!eventHistoryMap[key]) {
    // _historyChanged = true;
    eventHistoryMap[key] = eventHistory;
  }
  ctxMap[key] = ctx;
}

function updateEventHistory(modelName, version, operation, observerId) {
  log.debug(log.defaultContext(), 'observer id: ', observerId, ' for model: ', modelName, ' ', version, ' completed');
  var key = version + modelName + operation;
  var eventHistory = eventHistoryMap[key] || eventHistoryRecoveryMap[key];
  if (eventHistory && eventHistory.observerArray) {
    eventHistory.observerArray.push(observerId);
    // _historyChanged = true;
  }
}

function removeEventHistory(modelName, version, operation, msg) {
  log.debug('removing event due to: ' + msg);
  var key = version + modelName + operation;
  delete eventHistoryMap[key];
  delete eventHistoryRecoveryMap[key];
  delete ctxMap[key];
  // _historyChanged = true;
}

function config(app) {
  REPLAY_DELAY = app.get('eventReliabilityReplayThreshold');
  REPLAY_JOB_INTERVAL = app.get('eventReliabilityReplayInterval');
  // PRESIST_TO_DB_INTERVAL = app.get('eventReliabilityDbPersistenceInterval');
  RETRY_TIME_INTERVAL = app.get('eventReliabilityRetryTimeInterval');
  // MAX_RETRY = app.get('eventReliabilityMaxRetry');
  // INSTANCES_TO_FETCH = app.get('eventHistoryStartUpInstancesToFetch');
  // SERVER_RECOVERY_INTERVAL = app.get('eventHistoryStartUpInterval');
  return;
}

function init(app) {
  var config = require('../server/config');
  REPLAY_DELAY = app.get('eventReliabilityReplayThreshold') || config.eventReliabilityReplayThreshold;
  REPLAY_JOB_INTERVAL = app.get('eventReliabilityReplayInterval') || config.eventReliabilityReplayInterval;
  // PRESIST_TO_DB_INTERVAL = app.get('eventReliabilityDbPersistenceInterval') || config.eventReliabilityDbPersistenceInterval;
  // MAX_RETRY = app.get('eventReliabilityMaxRetry') || config.eventReliabilityMaxRetry;
  RETRY_TIME_INTERVAL = app.get('eventReliabilityRetryTimeInterval') || config.eventReliabilityRetryTimeInterval;
  SavePointModel = loopback.getModel('SavePoint');
  // appInstance = app;
  setTimeout(eventReplayJob, REPLAY_JOB_INTERVAL);
  // setTimeout(persistToDB, PRESIST_TO_DB_INTERVAL);

/*  INSTANCES_TO_FETCH = app.get('eventHistoryStartUpInstancesToFetch') || config.eventHistoryStartUpInstancesToFetch;
  SERVER_RECOVERY_INTERVAL = app.get('eventHistoryStartUpInterval') || config.eventHistoryStartUpInterval;
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
  } */
}


module.exports = {
  init: init,
  config: config,
  create: createEventHistory,
  update: updateEventHistory,
  remove: removeEventHistory
  /* ,
  recovery: recovery */
};
