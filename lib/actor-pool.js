/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var loopback = require('loopback');
var async = require('async');
var LRU = require('lru-cache');
var config = require('../server/config.js');
var MEMORY_POOL_SIZE = config.memoryPoolSize;
var log = require('oe-logger')('memory-pool');
var actorsChunkSize = config.memoryPoolChunk;

var actorEnvelopes = new LRU({
  max: MEMORY_POOL_SIZE,
  dispose: function (key, value) {
    log.info(log.defaultContext(), 'removing actor: ', key, ' from LRU');
  }
});

var PROCESS_QUEUE_INTERVAL;

function getOrCreate(context, options, initCb) {
  var modelName;
  var id;
  var idx;

  modelName = context.activity.modelName;
  id = '' + context.activity.entityId;
  idx = modelName + id;
  var actorEntity = context.actorEntity;
  if (!actorEnvelopes.get(idx)) {
    var key = actorEntity._version;
    actorEntity.constructor.instanceLocker().acquire(actorEntity, options, key, function (cb) {
      if (!actorEnvelopes.get(idx)) {
        var envelope = {};
        if (context.doNotDelete) {
          envelope.doNotDelete = 1;
        } else {
          envelope.doNotDelete = 0;
        }
        envelope.actorId = id;
        envelope.modelName = modelName;
        if (options.ctx.noInstanceCache && actorEntity.constructor.settings.noBackgroundProcess) {
          envelope.noCacheTime = Date.now();
        }
        actorEntity.performStartOperation(context.journalEntityId, options, envelope, function (err) {
          if (err) {
            actorEnvelopes.del(idx);
            return cb(err);
          }
          envelope.options = options;
          actorEnvelopes.set(idx, envelope);
          context.envelope = envelope;
          return cb();
        });
      } else {
        var envl = actorEnvelopes.get(idx);
        if (context.doNotDelete) {
          envl.doNotDelete++;
        }
        context.envelope = envl;
        return cb(null, context);
      }
    }, function (err, ret) {
      if (err) {
        return initCb(err, context);
      }
      return initCb(null, context);
    });
  } else {
    var envelope = actorEnvelopes.get(idx);
    if (context.doNotDelete) {
      envelope.doNotDelete++;
    }
    if (envelope.noCacheTime && actorEntity.constructor.settings.noBackgroundProcess) {
      if (Date.now() - envelope.noCacheTime < actorEntity.constructor.settings.noCacheTime) {
        delete envelope.updatedActor;
        envelope.msg_queue = [];
        options.ctx.noInstanceCache = true;
      } else {
        delete envelope.noCacheTime;
        delete options.ctx.noInstanceCache;
      }
    } else if (options.ctx.noInstanceCache && actorEntity.constructor.settings.noBackgroundProcess) {
      envelope.noCacheTime = Date.now();
      delete envelope.updatedActor;
      envelope.msg_queue = [];
    }
    context.envelope = envelope;
    return initCb(null, context);
  }
}

function destroy(modelName, id) {
  log.debug(log.defaultContext(), 'removing actor envelope from memory\n', 'model: ' + modelName, '\n', 'id: ', id);
  var idx = modelName + id;
  if (typeof actorEnvelopes.get(idx) !== 'undefined') {
    actorEnvelopes.del(idx);
  }
}

function processMemoryMessages() {
  var tasks = [];

  var currentEnvelopes = actorEnvelopes.values();

  if (currentEnvelopes.length === 0) {
    setTimeout(processMemoryMessages, PROCESS_QUEUE_INTERVAL);
    return;
  }
  async.each(currentEnvelopes, function (actorEnvelope, cb) {
    if (actorEnvelope.isCurrentlyProcessing === false && actorEnvelope.msg_queue.length > 0) {
      tasks.push(function (asyncCB) {
        if (actorEnvelope.isCurrentlyProcessing === true || actorEnvelope.msg_queue.length === 0) {
          return asyncCB();
        }
        actorEnvelope.isCurrentlyProcessing = true;
        if (typeof actorEnvelope.actor !== 'undefined') {
          actorEnvelope.actor.processMessagesBackground(actorEnvelope, actorEnvelope.options, function () {
            actorEnvelope.isCurrentlyProcessing = false;
            return asyncCB();
          });
        } else {
          var actorModel = loopback.getModel(actorEnvelope.modelName, actorEnvelope.options);
          var query = { where: { id: actorEnvelope.actorId }, limit: 1 };
          actorModel.find(query, actorEnvelope.options, function (err, result) {
            if (err) {
              logError(err);
              actorEnvelope.isCurrentlyProcessing = false;
              return asyncCB(err);
            } else if (!result[0]) {
              actorEnvelopes.del(actorEnvelope.modelName + actorEnvelope.actorId);
              return asyncCB();
            }
            var actor = result[0];
            actorEnvelope.actor = actor;
            actor.processMessagesBackground(actorEnvelope, actorEnvelope.options, function () {
              actorEnvelope.isCurrentlyProcessing = false;
              return asyncCB();
            });
          });
        }
      });
    }
    return cb();
  });

  async.parallelLimit(tasks, actorsChunkSize, function (err, results) {
    logError(err);
    setTimeout(processMemoryMessages, PROCESS_QUEUE_INTERVAL);
  });
}


function logError(err) {
  if (err) {
    log.error(log.defaultContext(), err);
  }
}


function initWithCustomInterval(app) {
  PROCESS_QUEUE_INTERVAL = app.get('memoryInterval') || config.memoryInterval;
  setTimeout(processMemoryMessages, PROCESS_QUEUE_INTERVAL);
}

module.exports.getOrCreateInstance = getOrCreate;
module.exports.destroy = destroy;

module.exports.initPool = function initPool(app) {
  initWithCustomInterval(app);
};

module.exports.getEnvelope = function getEnvelope(modelName, id) {
  var envelope = actorEnvelopes.get(modelName + id);
  return envelope;
};

module.exports.getEnvelopeAndReserve = function getEnvelope(modelName, id) {
  var envelope = actorEnvelopes.get(modelName + id);
  if (envelope !== null && typeof envelope !== 'undefined') {
    envelope.doNotDelete++;
  }
  return envelope;
};
