/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var async = require('async');
var logger = require('../../../lib/logger');
var log = logger('journal-entity');
var loopback = require('loopback');

module.exports = function baseJournalEntity(BaseJournalEntity) {
  var performAtomicOperation = function performAtomicOperation(journalEntity, operationContexts, next) {
    var numProcessed = 0;
    operationContexts.forEach(function operationContextsForEach(operationContext) {
      var actor = operationContext.actorEntity;
      var key = actor._version;
      actor.constructor.instanceLocker().acquire(key, function lockerAcquire(cb) {
        delete operationContext.actorEntity;
        actor.validateAndReserveAtomicAction(operationContext, operationContext.options, function validateAndReserveAtomicAction(err, validation) {
          if (err) {
            return cb(err);
          }
          if (validation === false) {
            return cb(new Error('validation failed on atomic operation'));
          }
          numProcessed++;
          return cb();
        });
      },
        function finalForEachCb(err, ret) {
          if (err) {
            return next(err);
          }
          if (numProcessed === operationContexts.length) {
            return next();
          }
        });
    });
  };

  BaseJournalEntity.prototype.prepareAtomicOperation = function prepareAtomicOperation(ctx, next) {
    var instance = ctx.instance;
    var options = ctx.options;
    var atomicActivityList = instance.__data.atomicActivitiesList;

    var createOperationContext = function createOperationContext(activity, callback) {
      var Model = loopback.getModel(activity.modelName);
      var operationContext = {};
      Model.findById(activity.entityId, options, function modelFindById(err, actor) {
        if (err) {
          return callback(new Error(err));
        } else if (actor.length === 0) {
          return callback(new Error('Invalid non atomic activity. No actor with id ' + activity.entityId));
        } else if (actor.length > 1) {
          return callback(new Error('Something went wrong. Too many actors with id ' + activity.entityId));
        }
        operationContext.activity = activity;
        operationContext.journalEntity = instance.toObject();
        operationContext.journalEntity._type = ctx.Model.definition.name;
        return actor.initActor(operationContext, options, function initActor(err, context) {
          if (err) {
            return callback(err);
          }
          context.actorEntity = actor;
          context.options = options;
          return callback(null, context);
        });
      });
    };

    async.map(atomicActivityList, createOperationContext, function asyncMapFn(err, operationContexts) {
      if (err) {
        return next(err);
      }
      return performAtomicOperation(instance, operationContexts, next);
    });
  };

  var performNonAtomicOperation = function performNonAtomicOperation(err, context, next) {
    if (err) {
      return next(err);
    }
    var options = context.options;
    delete context.options;
    var actorEntity = context.actorEntity;
    delete context.actorEntity;
    actorEntity.nonAtomicAction(context, options, next);
  };

  BaseJournalEntity.prototype.performBusinessValidations = function performBusinessValidations(cb) {
    log.error('No business validations were implemented. Please Implement, and run again.');
    throw new Error('No business validations were implemented. Please Implement, and run again.');
  };

  BaseJournalEntity.prototype.processNonAtomicJournalEntity = function processNonAtomicJournalEntity(ctx, next) {
    var instance = ctx.instance;
    var options = ctx.options;
    var nonAtomicActivities = instance.__data.nonAtomicActivitiesList;

    if (nonAtomicActivities && nonAtomicActivities.length > 0) {
      async.each(nonAtomicActivities, function asyncEachOne(activity, cb) {
        var Model = loopback.getModel(activity.modelName);
        var query = { where: { id: activity.entityId }, limit: 1 };
        Model.find(query, options, function modelFind(err, result) {
          if (err) {
            return cb(new Error(err));
          } else if (result.length === 0) {
            var error = new Error('Invalid non atomic activity. No actor with id ' + activity.entityId);
            error.retriable = false;
            return cb(error);
          } else if (result.length > 1) {
            var error2 = new Error('Something went wrong. Too many actors with id ' + activity.entityId);
            error2.retriable = false;
            return cb(error2);
          }
          var context = {};
          context.activity = activity;
          context.journalEntity = instance.toObject();
          context.journalEntity._type = instance._type;
          var actorEntity = result[0];
          return actorEntity.initActor(context, options, function initActor(err, context) {
            context.actorEntity = actorEntity;
            context.options = options;
            performNonAtomicOperation(err, context, function performNonAtomicOperation(err) {
              cb(err);
            });
          });
        });
      }, function asyncFinalCb(err) {
        if (err) {
          return next(err);
        }
        return next();
      });
    } else {
      return next();
    }
  };


  BaseJournalEntity.observe('before save', function baseJournalEntityBeforeSave(ctx, next) {
    if (ctx.isNewInstance === false || !(ctx.instance)) {
      var err = new Error('Cannot update existing journal entry');
      err.retriable = false;
      return next(err);
    }
    ctx.instance.__data._modifiedOn = new Date();
    var instance = ctx.instance;
    var atomicActivityList = instance.__data.atomicActivitiesList;
    instance.performBusinessValidations(function performBusinessValidations(err) {
      if (err) {
        log.error(ctx.options, err.message);
        return next(err);
      }
      if (!atomicActivityList || atomicActivityList.length === 0) {
        log.debug(ctx.options, 'No atomic operations. Proceeding transaction logic.');
        next();
      } else {
        log.debug(ctx.options, 'Preparing atomic operations, and proceeding transaction logic.');
        BaseJournalEntity.prototype.prepareAtomicOperation(ctx, next);
      }
    });
  });

  BaseJournalEntity.observe('after save', function baseJournalEntityAfterSave(ctx, next) {
    if ((ctx.instance && ctx.instance._isDeleted) || (ctx.data && ctx.data._isDeleted)) {
      next();
    } else {
      BaseJournalEntity.prototype.processNonAtomicJournalEntity(ctx, next);
    }
  });

  BaseJournalEntity.observe('after delete', function baseJournalEntityAfterDelete(ctx, next) {
    var err = new Error('Cannot delete journal entry');
    err.retriable = false;
    next(err);
  });
};
