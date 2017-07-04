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
  console.log('checking if id ' + id + ' is in pool' + ' and model name is ' + modelName);
  idx = modelName + id;
  console.log('envelopes length ' + actorEnvelopes.values().length );
  if (!actorEnvelopes.get(idx)) {
    console.log('before lock in pool for id , actor not in pool ' + id );
    var actorEntity = context.actorEntity;
    var key = actorEntity._version;
    actorEntity.constructor.instanceLocker().acquire(actorEntity, options, key, function (cb) {
      if (!actorEnvelopes.get(idx)) {
        console.log('inside lock in pool for id , perform startup operation ' + id );
        var envelope = {};
        if (context.doNotDelete) {
          envelope.doNotDelete = 1;
        } else {
          envelope.doNotDelete = 0;
        }
        envelope.actorId = id;
        envelope.modelName = modelName;
        actorEntity.performStartOperation(context.journalEntity, options, envelope, function (err) {
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
        console.log('actor in pool , inside lock ' + id);
        var envl = actorEnvelopes.get(idx);
        if (context.doNotDelete) {
          envl.doNotDelete++;
        }
        context.envelope = envl;
        return cb(null, context);
      }
    }, function (err, ret) {
      console.log('Ending lock function for id ' + id );
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

  if (currentEnvelopes.legnth === 0) {
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
