/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

var async = require('async');
var loopback = require('loopback');
var log = require('../../../lib/logger')('BaseActorEntity');
var actorPool = require('../../../lib/actor-pool');
var assert = require('assert');

module.exports = function baseActorEntity(BaseActorEntity) {
  BaseActorEntity.setup = function setup() {
    BaseActorEntity.base.setup.call(this);
    var BaseActor = this;
    BaseActor.disableRemoteMethod('__get__state', false);
    BaseActor.disableRemoteMethod('__create__state', false);
    BaseActor.disableRemoteMethod('__update__state', false);
    BaseActor.disableRemoteMethod('__destroy__state', false);
    BaseActor.remoteMethod(
      'initActor', {
        http: {
          path: '/initActor',
          verb: 'post'
        },
        isStatic: false,
        accepts: {
          arg: 'filter',
          type: 'object'
        },
        returns: {
          arg: 'response',
          type: 'object',
          root: true
        }
      });
    BaseActor.remoteMethod(
      'validateAndReserveAtomicAction', {
        http: {
          path: '/validateAndReserveAtomicAction',
          verb: 'post'
        },
        isStatic: false,
        accepts: {
          arg: 'filter',
          type: 'object'
        },
        returns: {
          arg: 'response',
          type: 'object',
          root: true
        }
      });
    BaseActor.remoteMethod(
      'nonAtomicAction', {
        http: {
          path: '/nonAtomicAction',
          verb: 'post'
        },
        isStatic: false,
        accepts: {
          arg: 'filter',
          type: 'object'
        },
        returns: {
          arg: 'response',
          type: 'object',
          root: true
        }
      });
  };

  BaseActorEntity.disableRemoteMethod('__get__state', false);
  BaseActorEntity.disableRemoteMethod('__create__state', false);
  BaseActorEntity.disableRemoteMethod('__update__state', false);
  BaseActorEntity.disableRemoteMethod('__destroy__state', false);

  BaseActorEntity.remoteMethod(
    'initActor', {
      http: {
        path: '/initActor',
        verb: 'post'
      },
      isStatic: false,
      accepts: {
        arg: 'filter',
        type: 'object'
      },
      returns: {
        arg: 'response',
        type: 'object',
        root: true
      }
    });

  BaseActorEntity.remoteMethod(
    'validateAndReserveAtomicAction', {
      http: {
        path: '/validateAndReserveAtomicAction',
        verb: 'post'
      },
      isStatic: false,
      accepts: {
        arg: 'filter',
        type: 'object'
      },
      returns: {
        arg: 'response',
        type: 'object',
        root: true
      }
    });

  BaseActorEntity.remoteMethod(
    'nonAtomicAction', {
      http: {
        path: '/nonAtomicAction',
        verb: 'post'
      },
      isStatic: false,
      accepts: {
        arg: 'filter',
        type: 'object'
      },
      returns: {
        arg: 'response',
        type: 'object',
        root: true
      }
    });


  BaseActorEntity.prototype.getActorFromMemory = function getActorFromMemory(envelope, options, cb) {
    var self = this;
    this.calculatePendingBalance(envelope, options, function calculatePendingBalance(err, actorData) {
      if (err) {
        return cb(err);
      }
      var copy = JSON.parse(JSON.stringify(self.__data));
      copy.state = {};
      copy.state.stateObj = actorData;
      return cb(null, copy);
    });
  };


  function calculateValues(array, func, entityId, startingStateObj) {
    return array.filter(x => x.entityId === entityId).reduce(func, startingStateObj);
  }


  BaseActorEntity.prototype.initActor = function initActor(context, options, cb) {
    context.actorEntity = this;
    return actorPool.getOrCreateInstance(context, options, function getOrCreateInstance(err, ctx) {
      if (err) {
        return cb(err);
      }
      delete ctx.actorEntity;
      return cb(null, ctx);
    });
  };

  BaseActorEntity.prototype.createMessage = function baseActorEntityCreateMessage(activity, journalEntityType, journalEntityVersion, journalEntityTime) {
    var message = {};
    message.isProcessed = false;
    message.retryCount = 0;
    message.instructionType = activity.instructionType;
    message.payload = activity.payload;
    message.activity = activity;
    message.version = journalEntityVersion;
    message.time = journalEntityTime;
    message.journalEntityType = journalEntityType;
    return message;
  };

  BaseActorEntity.prototype.addMessage = function baseActorEntityAddMessage(message, options) {
    var id = this.__data.id;
    var modelName = this.constructor.modelName;
    assert(!!id);
    assert(!!modelName);
    // this should be getOrCreate otherwise we will fail when instance is out of lru
    var envelope = actorPool.getEnvelope(modelName, id);
    assert(!!envelope);
    envelope.msg_queue.push(message);
  };


  BaseActorEntity.prototype.validateAndReserveAtomicAction = function validateAndReserveAtomicAction(context, options, cb) {
    var self = this;
    var id = this.__data.id;
    var modelName = this.constructor.modelName;
    assert(!!id);
    assert(!!modelName);
    // this should be getOrCreate otherwise we will fail when instance is out of lru
    var envelope = actorPool.getEnvelope(modelName, id);
    assert(!!envelope);
    this.calculatePendingBalance(envelope, options, function calculatePendingBalance(err, actorData) {
      if (err) {
        return cb(err);
      }
      assert(!!context.activity);
      var validation = self.validateCondition(actorData, context.activity);
      if (validation === true) {
        self.reserveAmount(context);
        return cb(null, true);
      }
      return cb(null, false);
    });
  };

  BaseActorEntity.prototype.atomicAction = function baseActorEntityAtomicAction(message, state, envelope) {
    this.atomicInstructions(state.__data.stateObj, message.activity);
  };

  // should be async
  BaseActorEntity.prototype.reserveAmount = function reserveAmount(context) {
    var journalEntity = context.journalEntity;
    var journalEntityType = journalEntity._type;
    var journalEntityVersion = journalEntity._version;
    var journalEntityTime = journalEntity._createdOn || journalEntity._modifiedOn;

    assert(!!journalEntityType);
    assert(!!journalEntityVersion);
    assert(!!journalEntityTime);

    var message = this.createMessage(context.activity, journalEntityType, journalEntityVersion, journalEntityTime);
    this.addMessage(message, context.options);
  };

  BaseActorEntity.prototype.nonAtomicAction = function baseActorEntityNonAtomicAction(context, options, cb) {
    var journalEntity = context.journalEntity;
    var journalEntityType = journalEntity._type;
    var journalEntityVersion = journalEntity._version;
    var journalEntityTime = journalEntity._createdOn || journalEntity._modifiedOn;

    assert(!!journalEntityType);
    assert(!!journalEntityVersion);
    assert(!!journalEntityTime);

    var message = this.createMessage(context.activity, journalEntityType, journalEntityVersion, journalEntityTime);
    this.addMessage(message, options);
    return cb();
  };

  BaseActorEntity.prototype.removeMessage = function baseActorEntityRemoveMessage(message) {
    var index = this.msg_queue.indexOf(message);
    if (index > -1) {
      this.msg_queue.splice(index, 1);
    }
  };

  function prepareMessagesForProcessing(envelope) {
    var messages = envelope.msg_queue.slice(0);
    messages.sort(function sortFn(a, b) {
      var key1 = a.time;
      var key2 = b.time;

      if (key1 < key2) {
        return -1;
      } else if (key1 === key2) {
        return 0;
      }
      return 1;
    });
    return messages;
  }

  BaseActorEntity.prototype.processMessagesBackground = function baseActorEntityProcessMessagesBackground(envelope, options, actorCb) {
    var messages = prepareMessagesForProcessing(envelope);

    var self = this;

    if (messages.length === 0) {
      return actorCb();
    }

    self.state(false, options, function state(err, stateObj) {
      if (err) {
        return actorCb(err);
      } else if (!stateObj) {
        var err1 = new Error('Actor state not found');
        err1.retriable = false;
        return actorCb(err1);
      }
      async.eachSeries(messages, function messagesEach(message, cb) {
        self.processMessageBackground(envelope, message, stateObj, options, cb);
      }, function eachSeriesCb(err) {
        if (err) {
          log.error(options, err);
          return actorCb(err);
        }
        self.state.update(stateObj.__data, options, function stateUpdate(error) {
          if (error) {
            log.error(options, 'error while persisting actor ' + error);
            return actorCb();
          }
          envelope.actorLastPersistedOn = new Date();
          envelope.msg_queue = envelope.msg_queue.filter(x => (!(x.isProcessed)));
          return actorCb();
        });
      });
    });
  };


  BaseActorEntity.prototype.MAX_RETRY_COUNT = 3;

  BaseActorEntity.prototype.processPendingMessage = function baseActorEntityProcessPendingMessage(message, atomicAmount) {
    return atomicAmount;
  };

  BaseActorEntity.prototype.calculatePendingBalance = function baseActorEntityCalculatePendingBalance(envelope, options, cb) {
    var self = this;
    this.state(false, options, function state(err, state) {
      if (err) {
        return cb(err);
      }
      var actorData = state.__data.stateObj;
      var messages = envelope.msg_queue;
      for (var i = 0; i < messages.length; i++) {
        var message = messages[i];
        if (envelope.isCurrentlyProcessing || !message.isProcessed) {
          actorData = self.processPendingMessage(message, actorData);
        }
      }
      return cb(null, actorData);
    });
  };


  BaseActorEntity.prototype.processMessageBackground = function baseActorEntityProcessMessageBackground(envelope, message, state, options, cb) {
    if (this.atomicTypes.indexOf(message.instructionType) !== -1) {
      this.processAtomicMessage(envelope, message, state, options, cb);
    } else if (this.nonAtomicTypes.indexOf(message.instructionType) !== -1) {
      this.processNonAtomicMessage(envelope, message, state, cb);
    }
  };

  BaseActorEntity.prototype.processAtomicMessage = function baseActorEntityProcessAtomicMessage(envelope, message, state, options, cb) {
    if (message.isProcessed === true) {
      return cb();
    }
    var loopbackModelsCollection = [];
    // var instanceModelName;
    // instanceModelName = this._type;
    loopbackModelsCollection = this.associatedModels.map(function associatedModelsMap(instanceModelName) {
      return loopback.getModel(instanceModelName);
    });
    var self = this;

    async.each(loopbackModelsCollection, function asynchEachOne(model, asyncCB) {
      var query = {
        where: { _version: message.version }
      };
      model.findOne(query, options, function modelFindOne(err, result) {
        if (err) {
          return asyncCB(err);
        } else if (!result) {
          return asyncCB();
        } else if (result) {
          self.atomicAction(message, state, envelope);
          envelope.actorLastUpdatedOn = message.time;
          message.isProcessed = true;
          return asyncCB();
        }
      });
    }, function asyncFinalCallback(error) {
      if (error) {
        return cb(error);
      }
      if (!message.isProcessed) {
        log.warn(options, 'message processing failed');
        message.retryCount += 1;
        if (message.retryCount > self.MAX_RETRY_COUNT) {
          log.error(options, 'did not find appropriate journal entry for debit : ' + message);
          message.isProcessed = true;
        }
      }
      return cb();
    });
  };

  BaseActorEntity.prototype.processNonAtomicMessage = function baseActorEntityProcessNonAtomicMessage(envelope, message, state, cb) {
    if (message.isProcessed === true) {
      return cb();
    }
    this.nonAtomicInstructions(state.__data.stateObj, message.activity);
    envelope.actorLastUpdatedOn = message.time;
    message.isProcessed = true;
    return cb();
  };


  function filterInstances(array, currentJournalEntity) {
    var filtered = [];
    for (var i = 0; i < array.length; i++) {
      var cur = array[i];
      if (cur.id !== currentJournalEntity.id) {
        var found = false;
        if (cur.atomicActivitiesList) {
          for (var x = 0; x < cur.atomicActivitiesList.length; x++) {
            var atomic = cur.atomicActivitiesList[x];
            if (atomic.entityId === this.id && atomic.modelName === this.type) {
              found = true;
              break;
            }
          }
        }
        if (!found && cur.nonAtomicActivitiesList) {
          for (var y = 0; y < cur.atomicActivitiesList.length; y++) {
            var nonAtomic = cur.atomicActivitiesList[y];
            if (nonAtomic.entityId === this.id && nonAtomic.modelName === this.type) {
              found = true;
              break;
            }
          }
        }
        if (found) {
          filtered.push[array[i]];
        }
      }
    }
    return filtered;
  }

  BaseActorEntity.prototype.performStartOperation = function baseActorEntityPerformStartOperation(currentJournalEntity, options, envelope, cb) {
    var instanceModel = loopback.getModel(this._type);
    var loopbackModelsCollection = [];
    loopbackModelsCollection = instanceModel.prototype.associatedModels.map(function associatedModelsMap(obj) {
      return loopback.getModel(obj);
    });
    envelope.msg_queue = [];
    envelope.actorLastPersistedOn = currentJournalEntity._modifiedOn;
    envelope.actorLastUpdatedOn = new Date();
    envelope.isCurrentlyProcessing = false;
    var self = this;
    this.state(false, options, function state(err, state) {
      if (err) {
        return cb(err);
      } else if (!state) {
        var err1 = new Error('Actor state not found');
        err1.retriable = false;
        return cb(err1);
      }
      var query = {
        where: { _modifiedOn: { gt: state.lastUpdated } }
      };
      async.each(loopbackModelsCollection, function asyncEachOne(model, asyncCb) {
        model.find(query, options, function modelFind(err, returnedInstances) {
          if (err) {
            log.error(options, 'err in actor startup is ', err);
            return asyncCb(err);
          } else if (returnedInstances.length === 0) {
            return asyncCb();
          }
          returnedInstances = filterInstances(returnedInstances, currentJournalEntity);
          for (var i = 0; i < returnedInstances.length; i++) {
            var currentArray;
            if (returnedInstances[i].atomicActivitiesList && returnedInstances[i].atomicActivitiesList.length > 0) {
              currentArray = returnedInstances[i].atomicActivitiesList;
              state.stateObj = calculateValues(currentArray, self.atomicInstructions, self.id.toString(), state.stateObj);
            }
            if (returnedInstances[i].nonAtomicActivitiesList && returnedInstances[i].nonAtomicActivitiesList.length > 0) {
              currentArray = returnedInstances[i].nonAtomicActivitiesList;
              state.stateObj = calculateValues(currentArray, self.nonAtomicInstructions, self.id.toString(), state.stateObj);
            }
            log.debug(options, self._type + ' ' + self.id + ' Starting Balance ' + self);
          }
          return asyncCb();
        });
      }, function asyncFinalCallback(err) {
        if (err) {
          return cb(err);
        }
        return cb();
      });
    });
  };

  BaseActorEntity.observe('after save', function BaseActorEntityAfterSave(ctx, next) {
    if ((ctx.instance && ctx.instance._isDeleted) || (ctx.data && ctx.data._isDeleted)) {
      next();
    } else if (ctx.instance && ctx.isNewInstance === true) {
      var curTime = new Date();
      var stateData = {};
      stateData.stateObj = ctx.instance.stateObj;
      stateData.actorId = ctx.instance.id;
      stateData.lastUpdated = curTime;
      ctx.instance.state.create(stateData, ctx.options, function stateCreate(err, instance) {
        if (err) {
          return next(err);
        }
        log.debug(ctx.options, 'created instance of State ', instance);
        return next();
      });
    } else {
      return next();
    }
  });

  BaseActorEntity.observe('after save', function deleteFromMemorypool(ctx, next) {
    if ((ctx.instance && ctx.instance._isDeleted) || (ctx.data && ctx.data._isDeleted)) {
      log.debug(ctx.options, 'calling memory pool destroy');
      actorPool.destroy(ctx.instance._type, ctx.instance.id);
    }
    next();
  });
};


