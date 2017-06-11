var async = require('async');
var logger = require('oe-logger');
var log = logger('journal-entity');
var loopback = require('loopback');
var profiler = require('v8-profiler');
var fs = require('fs');
var number = 0;
var ignoreScopeOptions = {
  ignoreAutoScope: true,
  fetchAllScopes: true
};
var actorModelsMap = {};

module.exports = function (BaseJournalEntity) {
  var performAtomicOperation = function (journalEntity, operationContexts, next) {
    if (operationContexts.length === 0) {
      return next();
    }
    var startup = '';

    async.eachSeries(operationContexts, function (operationContext, callback) {
      var actor = operationContext.actorEntity;
      actor.validateAndReserveAtomicAction(operationContext, operationContext.options, function (err, validationObj) {
        if (err) {
          return callback(err);
        } else if (validationObj.validation === false) {
          var error2 = new Error('validation failed on atomic operation');
          error2.retriable = false;
          return callback(error2);
        }
        operationContext.activity.seqNum = validationObj.seqNum;
        startup = startup + operationContext.activity.modelName + operationContext.activity.entityId + '$';
        return callback();
      });
    }, function (err) {
      if (err) {
        return next(err);
      }
      return next(null, startup);
    });
  };

  var performNonAtomicOperation = function (journalEntity, operationContexts, next) {
    if (operationContexts.length === 0) {
      return next();
    }
    var startup = '';
    async.each(operationContexts, function (operationContext, cb) {
      var actor = operationContext.actorEntity;
      delete operationContext.actorEntity;
      var options = operationContext.options;
      delete operationContext.options;
      actor.validateNonAtomicAction(operationContext, options, function (err, validationObj) {
        if (err) {
          return cb(err);
        } else if (!validationObj.validation) {
          var error = new Error('Validation on non atomic activity failed');
          error.retriable = false;
          return cb(error);
        }
        operationContext.activity.seqNum = validationObj.seqNum;
        startup = startup + operationContext.activity.modelName + operationContext.activity.entityId + '$';
        return cb();
      });
    }, function (err) {
      if (err) {
        return next(err);
      }
      return next(null, startup);
    });
  };

  BaseJournalEntity.prototype.performOperations = function (ctx, next) {
    var instance = ctx.instance;
    var options = ctx.options;
    var atomicActivityList = instance.atomicActivitiesList;
    var nonAtomicActivityList = instance.nonAtomicActivitiesList;

    var createOperationContext = function (activity, callback) {
      var Model = getActorModel(activity.modelName);
      var operationContext = {};
      var query = {where: {id: activity.entityId}, limit: 1};
      Model.find(query, options, function (err, actor) {
        if (err) {
          return callback(err);
        } else if (actor.length === 0) {
          return callback(new Error('Invalid activity. No actor with id ' + activity.entityId));
        } else if (actor.length > 1) {
          return callback(new Error('Something went wrong. Too many actors with id ' + activity.entityId));
        }
        operationContext.activity = activity;
        operationContext.journalEntity = instance.toObject();
        operationContext.journalEntity._type = ctx.Model.definition.name;
        operationContext.activity = activity;
        operationContext.actorEntity = actor[0];
        if (!options.actorInstancesMap) {
          options.actorInstancesMap = {};
        }
        options.actorInstancesMap[activity.entityId] = actor[0];
        operationContext.options = options;
        return callback(null, operationContext);
      });
    };

    var mapAndPreformAtomic = function (atomicActivityList, cb) {
      async.map(atomicActivityList, createOperationContext, function (err, operationContexts) {
        if (err) {
          return cb(err);
        }
        performAtomicOperation(instance, operationContexts, function (err, res) {
          if (err) {
            return cb(err);
          }
          return cb(null, res);
        });
      });
    };

    var mapAndPreformNonAtomic = function (nonAtomicActivityList, cb) {
      async.map(nonAtomicActivityList, createOperationContext, function (err, operationContexts) {
        if (err) {
          return cb(err);
        }
        performNonAtomicOperation(instance, operationContexts, function (err, res) {
          if (err) {
            return cb(err);
          }
          return cb(null, res);
        });
      });
    };

    if (atomicActivityList && nonAtomicActivityList && atomicActivityList.length && nonAtomicActivityList.length) {
      mapAndPreformAtomic(atomicActivityList, function (err, resAtomic) {
        if (err) {
          return next(err);
        }
        mapAndPreformNonAtomic(nonAtomicActivityList, function (err, resNonAtomic) {
          if (err) {
            return next(err);
          }
          instance.startup = (resAtomic + resNonAtomic).slice(0, -1);
          return next();
        });
      });
    } else if (atomicActivityList && atomicActivityList.length) {
      mapAndPreformAtomic(atomicActivityList, function (err, res) {
        if (err) {
          return next(err);
        }
        instance.startup = ('' + res).slice(0, -1);
        return next();
      });
    } else if (nonAtomicActivityList && nonAtomicActivityList.length) {
      mapAndPreformNonAtomic(nonAtomicActivityList, function (err, res) {
        if (err) {
          return next(err);
        }
        instance.startup = ('' + res).slice(0, -1);
        return next();
      });
    } else {
      return next();
    }
  };

  BaseJournalEntity.prototype.performBusinessValidations = function (cb) {
    log.error('No business validations were implemented. Please Implement, and run again.');
    throw new Error('No business validations were implemented. Please Implement, and run again.');
  };

  var writePending = function (ctx, next) {
    var pendingModel = loopback.findModel('PendingJournal');
    var pending = {};
    pending.savedCtx = JSON.stringify(ctx.options);
    pending.savedData = JSON.stringify(ctx.instance.__data);
    pending.journalName = ctx.Model.modelName;
    pending.instanceVersion = ctx.instance._version;
    pending.status = 'pending';
    pending.isFirstPending = true;

    pendingModel.create(pending, ignoreScopeOptions, function (err, res) {
      if (err) {
        log.error(log.defaultContext(), err);
      } else {
        var error = new Error('Pending ' + res.id.toString());
        error.status = 500;
        next(error);
      }
    });
  };

  BaseJournalEntity.observe('before save', function (ctx, next) {
    profiler.startProfiling('' + number)
    if (ctx.isNewInstance === false || !(ctx.instance)) {
      var err = new Error('Cannot update existing journal entry');
      err.retriable = false;
      return next(err);
    }

    ctx.options.journalProcessStartTime = new Date();
    var instance = ctx.instance;
    instance.performBusinessValidations(function (err) {
      if (err) {
        log.error(ctx.options, err.message);
        if (err && err.retriable === false) {
          next(err);
        } else if (err) {
          if (instance.fromPending === true) {
            return next(err);
          }
          return writePending(ctx, next);
        }
      } else {
        BaseJournalEntity.prototype.performOperations(ctx, function (err, result) {
          if (err && err.retriable === false) {
            next(err);
          } else if (err) {
            if (instance.fromPending === true) {
              return next(err);
            }
            return writePending(ctx, next);
          } else {
             var prof = profiler.stopProfiling('' + number);
             number ++;
            prof.export(function(error, result) {
                fs.writeFileSync('profile' + number + '.json', result);
            });
            return next();
          }
        });
      }
    });
  });

  BaseJournalEntity.observe('after delete', function (ctx, next) {
    var err = new Error('Cannot delete journal entry');
    err.retriable = false;
    next(err);
  });

  var actualDrainActorMailBox = function (activityList, options, callback) {
    async.each(activityList, function (activity, cb) {
      var actor = options.actorInstancesMap[activity.entityId];
      if (actor) {
        actor.journalSaved(activity, options, function (err) {
          if (err) {
            return cb(err);
          }
          cb();
        });
      } else {
        var err = new Error('Invalid activity. No actor with id ' + activity.entityId);
        err.retriable = false;
        return cb(err);
      }
    }, function (err) {
      if (err) {
        return callback(err);
      }
      return callback();
    });
  };

  BaseJournalEntity.observe('after save', function drainActorMailBox(ctx, next) {
    var atomicActivitiesList = ctx.instance.atomicActivitiesList;
    var nonAtomicActivitiesList = ctx.instance.nonAtomicActivitiesList;
    actualDrainActorMailBox(atomicActivitiesList, ctx.options, function (err) {
      if (err) {
        return next(err);
      }
      actualDrainActorMailBox(nonAtomicActivitiesList, ctx.options, function (err) {
        if (err) {
          return next(err);
        }
        return next();
      });
    });
  });

  function getActorModel(modelName) {
    if (!actorModelsMap[modelName]) {
      actorModelsMap[modelName] = loopback.getModel(modelName);
    }
    return actorModelsMap[modelName];
  }
};
