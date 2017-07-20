/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries.
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/
var async = require('async');
var loopback = require('loopback');
var log = require('oe-logger')('BaseActorEntity');
var actorPool = require('../../../lib/actor-pool');
var config = require('../../../server/config');
var DB_LOCK_MODE = config.dbLockMode;
var StateModel;
var associatedModelsMap = {};

module.exports = function (BaseActorEntity) {
  BaseActorEntity.setup = function () {
    BaseActorEntity.base.setup.call(this);
    var BaseActor = this;
    BaseActor.disableRemoteMethod('__get__state', false);
    BaseActor.disableRemoteMethod('__create__state', false);
    BaseActor.disableRemoteMethod('__update__state', false);
    BaseActor.disableRemoteMethod('__destroy__state', false);
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
      'validateNonAtomicAction', {
        http: {
          path: '/validateNonAtomicAction',
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
      'journalSaved', {
        http: {
          path: '/drainMailBox',
          verb: 'post'
        },
        isStatic: false,
        accepts: {
          arg: 'activity',
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
    'validateNonAtomicAction', {
      http: {
        path: '/validateNonAtomicAction',
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
    this.calculatePendingBalance(envelope, options, function (err, actorData) {
      if (err) {
        return cb(err);
      }
      var copy = JSON.parse(JSON.stringify(self.__data));
      copy.state = {};
      copy.state.stateObj = actorData;
      return cb(null, copy);
    });
  };

  function calculateVals(array, func, entityId, startingObj) {
    var startingStateObj = startingObj.stateObj;
    var startingSeqNum = startingObj.seqNum;
    var resultState = array.filter(x => x.entityId === entityId).reduce(func, startingStateObj);
    var resultSeqNum = array.map(x => x.seqNum).reduce(Math.max, startingSeqNum);
    var resultObj = { resultState: resultState, resultSeqNum: resultSeqNum };
    return resultObj;
  }

  BaseActorEntity.prototype.createMessage = function (activity, journalEntityType, journalEntityVersion) {
    var message = {};
    message.isProcessed = false;
    message.retryCount = 0;
    message.skipCount = 0;
    message.instructionType = activity.instructionType;
    message.payload = activity.payload;
    message.activity = activity;
    message.version = journalEntityVersion;
    message.journalEntityType = journalEntityType;
    message.seqNum = activity.seqNum;
    message.journalStatus = null;
    return message;
  };

  BaseActorEntity.prototype.addMessage = function (message, context) {
    context.envelope.msg_queue.push(message);
  };

  BaseActorEntity.prototype.validateAndReserveAtomicAction = function (context, options, cb) {
    var self = this;
    context.actorEntity = this;
    context.doNotDelete = true;
    actorPool.getOrCreateInstance(context, options, function (err, ctx) {
      if (err) {
        return cb(err, { validation: false });
      }
      var envelope = ctx.envelope;
      self.constructor.instanceLocker().acquire(self, options, self._version, function (releaseLockCb) {
        self.calculatePendingBalance(envelope, options, function (err, actorData) {
          if (err) {
            return releaseLockCb(err);
          }
          var validation = self.validateCondition(actorData, ctx.activity);
          if (validation === true) {
            envelope.seqNum = envelope.seqNum + 1;
            ctx.activity.seqNum = envelope.seqNum;
            self.reserveAmount(ctx);
            envelope.doNotDelete--;
            return releaseLockCb(null, true);
          }
          return releaseLockCb(null, false);
        });
      }, function (err, isValid) {
        if (err) {
          return cb(err);
        } else if (!isValid) {
          return cb(null, { validation: false });
        }
        return cb(null, { validation: true, seqNum: envelope.seqNum });
      });
    });
  };

  BaseActorEntity.prototype.validateNonAtomicAction = function (context, options, cb) {
    context.actorEntity = this;
    context.doNotDelete = true;
    var self = this;
    actorPool.getOrCreateInstance(context, options, function (err, ctx) {
      if (err) {
        return cb(err, { validation: false });
      }
      var envelope = ctx.envelope;
      envelope.seqNum = envelope.seqNum + 1;
      ctx.activity.seqNum = envelope.seqNum;
      self.nonAtomicAction(ctx, function () {
        envelope.doNotDelete--;
        return cb(null, { validation: true, seqNum: envelope.seqNum });
      });
    });
  };
  // should be async
  BaseActorEntity.prototype.reserveAmount = function (context) {
    var journalEntity = context.journalEntity;
    var journalEntityType = journalEntity._type;
    var journalEntityVersion = journalEntity._version;

    var message = this.createMessage(context.activity, journalEntityType, journalEntityVersion);
    this.addMessage(message, context);
  };

  BaseActorEntity.prototype.nonAtomicAction = function (context, cb) {
    var journalEntity = context.journalEntity;
    var journalEntityType = journalEntity._type;
    var journalEntityVersion = journalEntity._version;
    var message = this.createMessage(context.activity, journalEntityType, journalEntityVersion);
    this.addMessage(message, context);
    return cb();
  };

  BaseActorEntity.prototype.removeMessage = function (message) {
    var index = this.msg_queue.indexOf(message);
    if (index > -1) {
      this.msg_queue.splice(index, 1);
    }
  };

  BaseActorEntity.prototype.processMessagesBackground = function (envelope, options, actorCb) {
    var messages = envelope.msg_queue.slice(0);
    var self = this;

    if (messages.length === 0) {
      return actorCb();
    }

    var stateModel = getStateModel();
    stateModel.findById(this.stateId, options, function (err, stateObj) {
      if (err) {
        log.error(options, 'error in finding state: ', err);
        return actorCb(err);
      } else if (!stateObj) {
        err = new Error('Actor state not found');
        err.retriable = false;
        log.error(options, err);
        return actorCb(err);
      }
      async.eachSeries(messages, function (message, cb) {
        self.processMessage(envelope, message, stateObj, options, cb);
      }, function (err) {
        if (err) {
          log.error(options, err);
          return actorCb(err);
        }
        stateObj.__data.seqNum = envelope.processedSeqNum;
        self.constructor.instanceLocker().acquire(self, options, self._version, function (releaseLockCb) {
          stateObj.updateAttributes(stateObj.__data, options, function (error, state) {
            if (error) {
              log.error(options, 'error while persisting actor ', error);
              return releaseLockCb(error);
            }
            envelope.msg_queue = envelope.msg_queue.filter(x => (!(x.isProcessed)));
            return releaseLockCb();
          });
        }, function (err, ret) {
          if (err) {
            return actorCb(err);
          }
          return actorCb();
        });
      });
    });
  };

  BaseActorEntity.prototype.MAX_RETRY_COUNT = 10;

  BaseActorEntity.prototype.processPendingMessage = function (message, atomicAmount) {
    return atomicAmount;
  };

  BaseActorEntity.prototype.calculatePendingBalance = function (envelope, options, cb) {
    var self = this;
    var stateModel = getStateModel();
    stateModel.findById(this.stateId, options, function (err, state) {
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

  BaseActorEntity.prototype.processMessage = function (envelope, message, state, options, cb) {
    if (message.isProcessed === true) {
      return cb();
    }

    var self = this;

    var actualProcess = function (cb) {
      if (self.atomicTypes.indexOf(message.instructionType) !== -1) {
        self.atomicInstructions(state.__data.stateObj, message.activity);
      } else if (self.nonAtomicTypes.indexOf(message.instructionType) !== -1) {
        self.nonAtomicInstructions(state.__data.stateObj, message.activity);
      }
      envelope.processedSeqNum = Math.max(message.seqNum, envelope.processedSeqNum);
      message.isProcessed = true;
      return cb();
    };

    if (message.journalStatus === 'saved') {
      return actualProcess(cb);
    }
    var model = loopback.getModel(message.journalEntityType, options);
    var query = {
      where: { _version: message.version }
    };
    model.findOne(query, options, function (err, result) {
      if (err) {
        log.error(options, 'error in processMessage: ', err);
        return cb(err);
      } else if (!result) {
        if (!message.isProcessed) {
          message.retryCount += 1;
          if (message.retryCount > self.MAX_RETRY_COUNT) {
            log.error(options, 'did not find appropriate journal entry for ', message.instructionType, ' : ', message);
            message.isProcessed = true;
          }
          return cb();
        }
      } else if (result) {
        actualProcess(cb);
      }
    });
  };

  function filterfunc(filter, entry) {
    return ((entry.entityId === filter.entityId) && (entry.modelName === filter.modelName) && (entry.seqNum > filter.seqNum));
  }

  function filterActivities(activitiesArray, filterBy) {
    var filteredctivities = [];
    for (var k = 0; k < activitiesArray.length; k++) {
      if (filterfunc(filterBy, activitiesArray[k])) {
        filteredctivities.push(activitiesArray[k]);
      }
    }
    return filteredctivities;
  }

  function filterResults(array, filterBy) {
    var filteredArray = [];
    for (var i = 0; i < array.length; i++) {
      var currJournal = array[i];
      if (currJournal.id !== filterBy.journalId) {
        currJournal.atomicActivitiesList = filterActivities(currJournal.atomicActivitiesList, filterBy);
        currJournal.nonAtomicActivitiesList = filterActivities(currJournal.nonAtomicActivitiesList, filterBy);
        if (currJournal.atomicActivitiesList.length > 0 || currJournal.nonAtomicActivitiesList.length > 0) {
          filteredArray.push(currJournal);
        }
      }
    }
    return filteredArray;
  }

  BaseActorEntity.prototype.updateStateData = function (activitiesList, startingObj, state, instruction) {
    if (activitiesList && activitiesList.length > 0) {
      var resultObj = calculateVals(activitiesList, instruction, this.id.toString(), startingObj);
      state.stateObj = resultObj.resultState;
      state.seqNum = resultObj.resultSeqNum;
    }
  };

  function createFilterObj(envelope, state, currentJournalEntity) {
    var filterBy = {};
    filterBy.modelName = envelope.modelName;
    filterBy.entityId = envelope.actorId;
    filterBy.seqNum = state.seqNum;
    filterBy.journalId = currentJournalEntity.id;
    return filterBy;
  }

  BaseActorEntity.prototype.performStartOperation = function (currentJournalEntity, options, envelope, cb) {
    var loopbackModelsCollection = getAssociatedModels(this.constructor.modelName, options);
    envelope.msg_queue = [];
    envelope.isCurrentlyProcessing = false;
    var self = this;
    var stateModel = getStateModel();
    stateModel.findById(this.stateId, options, function (err, state) {
      if (err) {
        log.error(options, 'err in actor startup is ', err);
        return cb(err);
      } else if (!state) {
        err = new Error('Actor state not found');
        err.retriable = false;
        return cb(err);
      }
      envelope.processedSeqNum = envelope.seqNum = state.__data.seqNum;
      var query = {};
      if (self.getDataSource().name === 'evmongodb') {
        query = {
          where: {
            or: [
              { atomicActivitiesList: { elemMatch: { entityId: envelope.actorId, modelName: envelope.modelName, seqNum: { $gte: state.seqNum } } } },
              { nonAtomicActivitiesList: { elemMatch: { entityId: envelope.actorId, modelName: envelope.modelName, seqNum: { $gte: state.seqNum } } } }
            ]
          }
        };
      } else {
        query = { where: { startup: { regexp: '[0-9a-zA-Z]*' + envelope.modelName + envelope.actorId + '[0-9a-zA-Z]*' } } };
      }
      async.each(loopbackModelsCollection, function (model, asyncCb) {
        model.find(query, options, function (err, returnedInstances) {
          if (err) {
            log.error(options, 'err in actor startup is ', err);
            return asyncCb(err);
          } else if (returnedInstances.length === 0) {
            log.debug('did not find journal instances in startup');
            return asyncCb();
          }
          var filterBy = createFilterObj(envelope, state, currentJournalEntity);
          returnedInstances = filterResults(returnedInstances, filterBy);
          for (var i = 0; i < returnedInstances.length; i++) {
            var startingObj = { stateObj: state.stateObj, seqNum: state.seqNum };
            self.updateStateData(returnedInstances[i].atomicActivitiesList, startingObj, state, self.atomicInstructions);
            self.updateStateData(returnedInstances[i].nonAtomicActivitiesList, startingObj, state, self.nonAtomicInstructions);
            log.debug(options, self._type, ' ', self.id, ' Starting Balance ', self);
          }
          envelope.processedSeqNum = envelope.seqNum = state.seqNum;
          state.updateAttributes(state.__data, options, function (error, state) {
            if (error) {
              log.error(options, 'error while persisting actor ', error);
              return asyncCb(error);
            }
            return asyncCb();
          });
        });
      }, function (err) {
        if (err) {
          return cb(err);
        }
        return cb();
      });
    });
  };

  BaseActorEntity.prototype.journalSaved = function (activity, options, cb) {
    var self = this;
    var id = this.__data.id;
    var modelName = this.constructor.modelName;
    var setMessageStatus = function (currentEnvelope) {
      currentEnvelope.msg_queue.forEach(function (message) {
        if (message.seqNum === activity.seqNum) {
          message.journalStatus = 'saved';
          return;
        }
      }, this);
    };
    var processEnvelope = function () {
      var currentEnvelope = actorPool.getEnvelopeAndReserve(modelName, id);
      if (currentEnvelope.isCurrentlyProcessing) {
        return cb();
      }
      currentEnvelope.isCurrentlyProcessing = true;
      self.processMessagesBackground(currentEnvelope, options, function (err) {
        currentEnvelope.isCurrentlyProcessing = false;
        if (err) {
          return cb(err);
        }
        envelope.doNotDelete--;
        if (envelope.doNotDelete === 0 && envelope.msg_queue.length === 0) {
          actorPool.destroy(modelName, id);
        }
        return cb();
      });
    };
    var envelope = actorPool.getEnvelope(modelName, id);
    if (envelope === null || typeof envelope === 'undefined') {
      return cb();
    }
    setMessageStatus(envelope);
    if (options.lockMode === DB_LOCK_MODE) {
      processEnvelope();
    } else {
      return cb();
    }
  };

  var updateStateId = function (ctx, instance, value, cb) {
    var data = {
      stateId: value,
      _version: instance._version
    };
    instance.updateAttributes(data, ctx.options, function (err, res) {
      if (err) {
        log.error(log.defaultContext(), err);
        return cb(err);
      }
      return cb();
    });
  };


  BaseActorEntity.observe('after save', function (ctx, next) {
    if ((ctx.instance && ctx.instance._isDeleted) || (ctx.data && ctx.data._isDeleted)) {
      next();
    } else if (ctx.instance && ctx.isNewInstance === true) {
      var stateData = {};
      stateData.stateObj = ctx.instance.stateObj;
      var stateModel = getStateModel();
      stateModel.create(stateData, ctx.options, function (err, instance) {
        if (err) {
          return next(err);
        }
        log.debug(ctx.options, 'created instance of State ', instance);
        if (ctx.instance.stateId) {
          return next();
        }
        var stateId = instance.id.toString();
        return updateStateId(ctx, ctx.instance, stateId, next);
      });
    } else {
      return next();
    }
  });

  BaseActorEntity.observe('after delete', function deleteFromMemorypool(ctx, next) {
    if (ctx.id) {
      log.debug(ctx.options, 'calling memory pool destroy on:', ctx.Model.modelName, ctx.id);
      actorPool.destroy(ctx.Model.modelName, ctx.id);
    }
    next();
  });

  function getStateModel() {
    if (!StateModel) {
      StateModel = loopback.getModel('State');
    }
    return StateModel;
  }

  function getAssociatedModels(actorType, options) {
    if (!associatedModelsMap[actorType]) {
      var instanceModel = loopback.getModel(actorType, options);
      associatedModelsMap[actorType] = [];
      associatedModelsMap[actorType] = instanceModel.prototype.associatedModels.map(function (obj) {
        return loopback.getModel(obj, options);
      });
    }
    return associatedModelsMap[actorType];
  }
};
