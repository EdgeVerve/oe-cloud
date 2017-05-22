/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
var async = require('async');
var LRU = require('lru-cache');
var uuid = require('node-uuid');
var config = require('../server/config.js');
var MEMORY_POOL_SIZE = config.memoryPoolSize;
var log = require('./logger')('memory-pool');

var actorEnvelopes = new LRU({
  max: MEMORY_POOL_SIZE,
  dispose: function dispose(key, value) {
    log.info(log.defaultContext(), 'removing actor: ', key, ' from LRU');
  }
});
var firstInit = true;
var PROCESS_QUEUE_INTERVAL;
var SET_MIN_STATE_INTERVAL;

var singleState = (function singleStateFn() {
  var currentMinimum = new Date();

  return {
    getMinimum: function getMinimumFn() {
      return currentMinimum;
    },

    setMinimum: function setMinimumFn(newMinimum) {
      currentMinimum = newMinimum;
      return;
    }
  };
})();

function getOrCreate(context, options, initCb) {
  var modelName;
  var id;
  var idx;

  modelName = context.activity.modelName;
  id = '' + context.activity.entityId;
  idx = modelName + id;
  if (!actorEnvelopes.get(idx)) {
    var key = context.actorEntity._version;
    context.actorEntity.constructor.instanceLocker().acquire(key, function instanceLockerAcquireFn(cb) {
      if (!actorEnvelopes.get(idx)) {
        var envelope = {};
        envelope.actorId = id;
        envelope.modelName = modelName;
        actorEnvelopes.set(idx, envelope);
        return context.actorEntity.performStartOperation(context.journalEntity, options, envelope, function performStartOperationCbFn(err) {
          if (err) {
            actorEnvelopes.del(idx);
            return cb(err);
          }
          context.envelope = envelope;
          return cb();
        });
      }
    }, function instanceLockerAcquireCbFn(err) {
      if (err) {
        return initCb(err, context);
      }
      return initCb(null, context);
    });
  } else {
    var envelope = actorEnvelopes.get(idx);
    context.envelope = envelope;
    return initCb(null, context);
  }
}

function destroy(modelName, id) {
  log.debug(log.defaultContext(), 'removing actor from memory\n' + 'model: ' + modelName + '\n' + 'id: ' + id);
  var idx = modelName + id;
  if (typeof actorEnvelopes.get(idx) !== 'undefined') {
    actorEnvelopes.del(idx);
  }
}

function processMemoryMessages() {
  actorEnvelopes.values().forEach(function actorEnvelopesForEachFn(actorEnvelope) {
    if (typeof actorEnvelope.isCurrentlyProcessing !== 'undefined' && actorEnvelope.isCurrentlyProcessing === false) {
      actorEnvelope.isCurrentlyProcessing = true;
      var actorModel = loopback.getModel(actorEnvelope.modelName);
      var query = { where: { id: actorEnvelope.actorId }, limit: 1 };
      var options = { 'fetchAllScopes': true };
      actorModel.find(query, options, function actorModelFindFn(err, result) {
        if (err) {
          logError(err);
          actorEnvelope.isCurrentlyProcessing = false;
        } else if (!result[0]) {
          actorEnvelopes.del(actorEnvelope.modelName + actorEnvelope.actorId);
        } else {
          var actor = result[0];
          actor.processMessagesBackground(actorEnvelope, options, function processMessagesBackgroundFn() {
            actorEnvelope.isCurrentlyProcessing = false;
          });
        }
      });
    }
  });
}


function logError(err) {
  if (err) {
    log.error(log.defaultContext(), err);
  }
}


function checkIfMinimum(actorEnvelope, callback) {
  var currentMinimum = singleState.getMinimum();
  if (currentMinimum > actorEnvelope.actorLastPersistedOn) {
    singleState.setMinimum(actorEnvelope.actorLastPersistedOn);
  }
  return callback();
}

function setMinState() {
  async.each(actorEnvelopes.values(), checkIfMinimum, function setMinStateAsyncFn() {
    var minStateModel = loopback.getModel('MinimumState');
    minStateModel.findOne({}, { fetchAllScopes: true, ctx: { tenantId: 'default' } }, function minStateModelFindOneCbFn(err, instance) {
      var instanceId;
      if (err) {
        // TO DO: better error handling
        log.error(log.defaultContext(), err);
      } else if (instance !== null) {
        instanceId = instance.id;
      } else {
        instanceId = uuid.v4();
      }

      var currentMinimum = singleState.getMinimum();
      var data = { time: currentMinimum, id: instanceId };

      minStateModel.upsert(data, { ctx: { tenantId: 'default' } }, function minStateModelUpsertCbFn(err, instance) {
        if (err) {
          log.error(log.defaultContext(), err);
          // TO DO: better error handling
        }
      });
    });
  });
}

function initWithCustomInterval(app) {
  if (!firstInit) {
    clearInterval(PROCESS_QUEUE_INTERVAL);
    clearInterval(SET_MIN_STATE_INTERVAL);
  }
  PROCESS_QUEUE_INTERVAL = setInterval(processMemoryMessages, app.get('memoryInterval') || config.memoryInterval);
  SET_MIN_STATE_INTERVAL = setInterval(setMinState, app.get('minStateInterval') || config.minStateInterval);

  firstInit = false;
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
