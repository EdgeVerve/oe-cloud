/**
*
* 2016-2018 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
* Bangalore, India. All Rights Reserved.
*
*/

'use strict';

var loopback = require('loopback');
var async = require('async');
var log = require('oe-logger')('eventHistoryManager');
var _ = require('lodash');
var os = require('os');
var process = require('process');
var currHostName = process.env.HOSTNAME || os.hostname();
var crypto = require('crypto');
var uuidv4 = require('uuid/v4');
var currHostUUID = uuidv4();
var REPLAY_DELAY;
var REPLAY_JOB_INTERVAL;
var MAX_RETRY;
var ignoreScopeOptions = {
  ignoreAutoScope: true,
  fetchAllScopes: true
};
var eventHistoryMap = {};
var ctxMap = {};
var savePointInstance;


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
  if (eventHistory.created.getTime() < Date.now() - MAX_RETRY ) {
    log.warn(ctx, 'observer for model: ' + modelName + ' reached max retries');
    delete eventHistoryMap[key];
    delete ctxMap[key];
    logFail(eventHistory, 'EXCEED_MAX_RETRY');
    cb();
  } else {
    checkModelInstance(model, version, operation, ctx.options, function (error, vaild) {
      if (!vaild) {
        log.debug(ctx, 'No model instance for Event history ', modelName, ' with version ', version);
        var key = version + modelName + operation;
        delete eventHistoryMap[key];
        delete ctxMap[key];
        logFail(eventHistory, 'NOT_VALID');
        // _historyChanged = true;
        cb();
      } else {
        executeObservers(eventHistory, model, version, ctx, function (err) {
          eventHistory.retryTimes++;
          if (!err) {
            log.debug(ctx, 'replayJob finished with no errors removing event histroy entry');
            var key = version + modelName + operation;
            delete eventHistoryMap[key];
            delete ctxMap[key];
            logFail(eventHistory, 'SUCCESS');
            // _historyChanged = true;
          }
          return cb();
        });
      }
    });
  }
}

function logFail(eventHistory, status, i) {
  i = i || 0;
  var FailedObserverLogModel = loopback.getModel('FailedObserverLog');
  var hasFailedObserverLog = eventHistory.hasFailedObserverLog;
  var filter = { where: {and: [{'version': eventHistory.version}, {'modelName': eventHistory.modelName}]}};

  if (!hasFailedObserverLog && status === 'EXCEED_MAX_RETRY') {
    var instance = {};
    instance.modelName = eventHistory.modelName;
    instance.version = eventHistory.ctx.instance ? eventHistory.ctx.instance._version : null;
    instance.timestamp = eventHistory.timestamp;
    instance.operation = eventHistory.operation;
    instance.created = new Date();
    instance.hostName = currHostName;
    instance.hostUUID = currHostUUID;
    instance.status = 'EXCEED_MAX_RETRY';

    FailedObserverLogModel.create(instance, ignoreScopeOptions, function (err) {
      if (err) {
        log.error(log.defaultContext(), err.message);
        if (i < 10) setTimeout(logFail, 2000, eventHistory, status, ++i);
        else  {
          log.error(log.defaultContext(), 'Failed permenently to log error for Model: ' + instance.modelName + ', version : ' + instance.version);
          log.error(log.defaultContext(), err);
        }
      }
    });
  } else if (hasFailedObserverLog && status === 'NOT_VALID') {
    FailedObserverLogModel.findOne(filter, ignoreScopeOptions, (err, instance) => {
      if (err || !instance) {
        if (i < 10) setTimeout(logFail, 2000, eventHistory, status, ++i);
        else log.error(log.defaultContext(), err);
      } else {
        instance.updateAttribute('status', 'NOT_VALID', ignoreScopeOptions, (err, res) => {}); // eslint-disable-line handle-callback-err
      }
    });
  } else if (hasFailedObserverLog && status === 'SUCCESS') {
    FailedObserverLogModel.findOne(filter, ignoreScopeOptions, (err, instance) => {
      if (err || !instance) {
        if (i < 10) setTimeout(logFail, 2000, eventHistory, status, ++i);
        else log.error(log.defaultContext(), err);
      } else {
        instance.updateAttribute('status', 'SUCCESS', ignoreScopeOptions, (err, res) => {}); // eslint-disable-line handle-callback-err
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

  keys = Object.keys(eventHistoryMap);
  for (var key of keys) {
    event = eventHistoryMap[key];
    timeSinceLastReplay = new Date() - event.timestamp;
    if (event.ranOnce && (timeSinceLastReplay > REPLAY_DELAY) && (event.retryTimes === 0 || timeSinceLastReplay > Math.pow(2, event.retryTimes) * REPLAY_JOB_INTERVAL)) {
      resMap[key] = event;
    }
  }

  return resMap;
}

function persistToDB() {
  if (!savePointInstance) return createSavePoint();
  savePointInstance.updateAttribute('timestamp',  getMinTimestamp(), ignoreScopeOptions, (err) => {
    if (err) {
      // console.log(err);
      createSavePoint();
    }
  });
}

function getMinTimestamp() {
  var minTimestamp = Date.now();
  Object.keys(eventHistoryMap).forEach(function (key) {
    if (eventHistoryMap[key].ctx.fromRecovery) return;
    minTimestamp = Math.min(minTimestamp, eventHistoryMap[key].timestamp.getTime());
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
  eventHistory.created = new Date();
  eventHistory.ctx = {};
  eventHistory.fromRecovery = ctx.fromRecovery === true;
  eventHistory.hasFailedObserverLog = ctx.hasFailedObserverLog === true;
  eventHistory.ranOnce = ctx.fromRecovery === true ? true : false;
  eventHistory.ctx.options = JSON.stringify(ctx.options);
  eventHistory.ctx.instance =  {};
  var instance = ctx.instance || ctx.currentInstance;
  eventHistory.timestamp = new Date();
  if (instance) {
    eventHistory.ctx.instance._version = instance._version;
    eventHistory.ctx.instance.__data = instance.__data;
    eventHistory.timestamp = instance._modifiedOn;
  }
  if (ctx.data) {
    eventHistory.ctx.data = ctx.data;
  }
  eventHistory.retryTimes = 0;
  eventHistory.operation = operation;
  var key = version + modelName + operation;
  if (!eventHistoryMap[key]) {
    eventHistoryMap[key] = eventHistory;
  }
  ctxMap[key] = ctx;
}

function updateEventHistory(modelName, version, operation, observerId) {
  log.debug(log.defaultContext(), 'observer id: ', observerId, ' for model: ', modelName, ' ', version, ' completed');
  var key = version + modelName + operation;
  var eventHistory = eventHistoryMap[key];
  if (eventHistory && eventHistory.observerArray) {
    eventHistory.observerArray.push(observerId);
    // _historyChanged = true;
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
  // _historyChanged = true;
}

function config(app) {
  REPLAY_DELAY = app.get('eventReliabilityReplayThreshold');
  REPLAY_JOB_INTERVAL = app.get('eventReliabilityReplayInterval');
  MAX_RETRY = app.get('eventReliabilityMaxRetryInterval');
  return;
}

function init(app) {
  var config = require('../server/config');
  REPLAY_DELAY = app.get('eventReliabilityReplayThreshold') || config.eventReliabilityReplayThreshold;
  REPLAY_JOB_INTERVAL = app.get('eventReliabilityReplayInterval') || config.eventReliabilityReplayInterval;
  MAX_RETRY = app.get('eventReliabilityMaxRetryInterval') || config.eventReliabilityMaxRetryInterval;

  createSavePoint();

  setTimeout(eventReplayJob, REPLAY_JOB_INTERVAL);
}


function createSavePoint() {
  var SavePointModel = loopback.getModel('SavePoint');
  // var filter = { where: {and: [{'hostName': currHostName}, {'hostUUID': currHostUUID}]}};
  var filter = { 'hostName': currHostName, 'hostUUID': currHostUUID};

  SavePointModel.destroyAll(filter, ignoreScopeOptions, (err, instance) => {
    if (err) return setTimeout(createSavePoint, 1000);

    var savePoint = {
      hostName: currHostName,
      hostUUID: currHostUUID,
      timestamp: getMinTimestamp(),
      doStartUpOperation: true
    };
    SavePointModel.create(savePoint, ignoreScopeOptions, function (err, instance) {
      if (err || !instance) {
        log.debug(log.defaultContext(), err);
        return setTimeout(createSavePoint, 2000);
      }
      savePointInstance = instance;
      // return savePointInstance;
    });
  });
}


module.exports = {
  init: init,
  config: config,
  create: createEventHistory,
  update: updateEventHistory,
  remove: removeEventHistory,
  updateRanOnce: updateRanOnce
};
