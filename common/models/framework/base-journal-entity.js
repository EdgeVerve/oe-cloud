/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var async = require('async');
var logger = require('oe-logger');
var log = logger('journal-entity');
var loopback = require('loopback');
var actorModelsMap = {};
var defaultOptions = {
  'ctx': {
    'remoteUser': 'admin',
    'tenantId': 'default'
  }
};

module.exports = function (BaseJournalEntity) {
  BaseJournalEntity.setup = function () {
    BaseJournalEntity.base.setup.call(this);
    var BaseJournal = this;
    BaseJournal.on('dataSourceAttached', function onAttach(Model) {
      if (Model.dataSource.name === 'loopback-connector-postgresql') {
        Model.findOrCreate({where: {'id': 'xxx' }}, {'id': 'xxx'}, defaultOptions, function (err, instance, created) {
          if (err) {
            log.debug('did not create dummy record ', Model.modeName);
          }
          if (!created) {
            return;
          }
          var modelQuery = 'select tgname from pg_trigger where not tgisinternal and ' +
          'tgrelid = \'' + BaseJournal.modelName + '\'::regclass';
          Model.dataSource.connector.query(modelQuery, [], defaultOptions, function (err, result) {
            if (err || result.length === 0) {
              modelQuery = 'CREATE TRIGGER \"onCreate\" BEFORE INSERT ' +
              ' ON public.' + Model.modelName.toLowerCase() +
              ' FOR EACH ROW ' +
              ' EXECUTE PROCEDURE public.create_activities(); ';
              Model.dataSource.connector.query(modelQuery, [], defaultOptions, function (err, result) {
                if (err) {
                  log.debug('could not insert trigger function on model');
                }
              });
            }
          });
        });
      }
    });
  };
  BaseJournalEntity.on('dataSourceAttached', function onAttach(Model) {
    if (Model.dataSource.name === 'loopback-connector-postgresql') {
      var modefiedQuery = 'select proname from pg_proc where proname = \'create_activities\'';
      Model.dataSource.connector.query(modefiedQuery, [], defaultOptions, function (err, result) {
        if (err) {
          log.debug('could not read pg table');
        }
        if (result.length === 0) {
          modefiedQuery = 'CREATE FUNCTION public.create_activities() ' +
          ' RETURNS trigger ' +
          ' LANGUAGE \'plpgsql\' ' +
          ' COST 100 ' +
          ' VOLATILE NOT LEAKPROOF ' +
          ' AS $BODY$ ' +
          ' DECLARE ' +
          ' m   integer; ' +
          ' BEGIN ' +
          ' FOR m IN SELECT generate_subscripts(new.atomicactivitieslist,1) as s ' +
          ' LOOP ' +
          ' INSERT INTO actoractivity(modelname,entityid,seqnum,instructiontype,atomic,payloadtxt) ' +
          ' VALUES(new.atomicactivitieslist[m]->>\'modelName\',new.atomicactivitieslist[m]->>\'entityId\',cast (new.atomicactivitieslist[m]->>\'seqNum\' as int),new.atomicactivitieslist[m]->>\'instructionType\',true,new.atomicactivitieslist[m]->>\'payload\'); ' +
          ' END LOOP; ' +
          ' FOR m IN SELECT generate_subscripts(new.nonatomicactivitieslist,1) as s ' +
          ' LOOP ' +
          ' INSERT INTO actoractivity(modelname,entityid,seqnum,instructiontype,atomic,payloadtxt) ' +
          '  VALUES(new.nonatomicactivitieslist[m]->>\'modelName\',new.nonatomicactivitieslist[m]->>\'entityId\',cast (new.nonatomicactivitieslist[m]->>\'seqNum\' as int),new.nonatomicactivitieslist[m]->>\'instructionType\',false,new.nonatomicactivitieslist[m]->>\'payload\'); ' +
          ' END LOOP; ' +
          ' return new; ' +
          ' END ' +
          ' $BODY$; ' +
          ' ALTER FUNCTION public.create_activities() ' +
          ' OWNER TO postgres; ';
          Model.dataSource.connector.query(modefiedQuery, [], defaultOptions, function (err, result) {
            if (err) {
              log.debug('could not insert trigger function');
            }
          });
        }
      });
    }
  });

  var performAtomicOperation = function (journalEntity, operationContexts, next) {
    if (operationContexts.length === 0) {
      return next();
    }
    var startup = '';

    var seen = {};
    var hasDuplicates = operationContexts.some(function (currentObject) {
      return seen.hasOwnProperty(currentObject.actorEntity.id) || (seen[currentObject.actorEntity.id] = false);
    });

    var asyncFunc  = async.each;
    if (hasDuplicates) {
      asyncFunc = async.eachSeries;
    }
    // async.eachSeries(operationContexts, function (operationContext, callback) {
    asyncFunc(operationContexts, function (operationContext, callback) {
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
        if (validationObj.updatedActor) {
          operationContext.activity.updatedActor = validationObj.updatedActor;
        }
        return callback();
      });
    }, function (err) {
      if (err) {
        return next(err);
      }
      return next(null, startup);
    });
  };

  var performNonAtomicOperation = function (journalEntity, operationContext, next) {
    var startup = '';
    var actor = operationContext.actorEntity;
    delete operationContext.actorEntity;
    var options = operationContext.options;
    delete operationContext.options;
    return actor.validateNonAtomicAction(operationContext, options, function (err, validationObj) {
      if (err) {
        return next(err);
      } else if (!validationObj.validation) {
        var error = new Error('Validation on non atomic activity failed');
        error.retriable = false;
        return next(error);
      }
      operationContext.activity.seqNum = validationObj.seqNum;
      startup = operationContext.activity.modelName + operationContext.activity.entityId;
      if (validationObj.updatedActor) {
        operationContext.activity.updatedActor = validationObj.updatedActor;
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
      var Model = getActorModel(activity.modelName, ctx.options);
      activity.modelName = Model.modelName;
      var operationContext = {};
      var query = { where: { id: activity.entityId }, limit: 1 };
      Model.find(query, options, function (err, actor) {
        if (err) {
          return callback(err);
        } else if (actor.length === 0) {
          return callback(new Error('Invalid activity. No actor with id ' + activity.entityId));
        } else if (actor.length > 1) {
          return callback(new Error('Something went wrong. Too many ctors with id ' + activity.entityId));
        }
        operationContext.activity = activity;
        operationContext.journalEntityId = instance.id;
        operationContext.journalEntityVersion = instance._version;
        operationContext.journalEntityType = ctx.Model.definition.name;
        operationContext.activity = activity;
        operationContext.actorEntity = actor[0];
        if (!ctx.hookState.actorInstancesMap) {
          ctx.hookState.actorInstancesMap = {};
        }
        ctx.hookState.actorInstancesMap[activity.entityId] = actor[0];
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

    var createAndPerformeNonAtomic = function (activity, cb) {
      createOperationContext(activity, function (err, operationContext) {
        if (err) {
          return cb(err);
        }
        performNonAtomicOperation(instance, operationContext, function (err, res) {
          if (err) {
            return cb(err);
          }
          return cb(null, res);
        });
      });
    };

    var mapAndPreformNonAtomic = function (nonAtomicActivityList, cb) {
      async.map(nonAtomicActivityList, createAndPerformeNonAtomic, function (err, results) {
        if (err) {
          return cb(err);
        }
        return cb(null, results.join('$') );
      });
    };

    if (atomicActivityList && atomicActivityList.length || nonAtomicActivityList && nonAtomicActivityList.length) {
      mapAndPreformAtomic(atomicActivityList, function (err, resAtomic) {
        if (err) {
          return next(err);
        }
        mapAndPreformNonAtomic(nonAtomicActivityList, function (err, resNonAtomic) {
          if (err) {
            return next(err);
          }
          instance.startup = (resAtomic + resNonAtomic);
          return next();
        });
      });
    } else {
      return next();
    }
  };

  BaseJournalEntity.prototype.performBusinessValidations = function (options, cb) {
    log.error('No business validations were implemented. Please Implement, and run again.');
    throw new Error('No business validations were implemented. Please Implement, and run again.');
  };

  BaseJournalEntity.observe('before save', function (ctx, next) {
    if (ctx.isNewInstance === false || !(ctx.instance)) {
      var err = new Error('Cannot update existing journal entry');
      err.retriable = false;
      return next(err);
    }

    if (ctx.instance.id === 'xxx') {
      return next();
    }

    var instance = ctx.instance;
    instance.performBusinessValidations(ctx.options, function (err) {
      if (err) {
        log.error(ctx.options, err.message);
        next(err);
      } else {
        BaseJournalEntity.prototype.performOperations(ctx, function (err, result) {
          if (err) {
            Object.keys(ctx.hookState.actorInstancesMap).forEach(function (key) {
              var actor = ctx.hookState.actorInstancesMap[key];
              if (actor.constructor.settings.noBackgroundProcess) {
                actor.clearActorMemory(actor, ctx.options, function () {

                });
              }
            });
            next(err);
          } else {
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

  BaseJournalEntity.observe('after save', function drainActorMailBox(ctx, next) {
    var atomicActivitiesList = ctx.instance.atomicActivitiesList;
    var nonAtomicActivitiesList = ctx.instance.nonAtomicActivitiesList;
    var activities = atomicActivitiesList.concat(nonAtomicActivitiesList);
    async.each(activities, function (activity, cb) {
      var options = ctx.options;
      var actor;
      if (ctx.hookState && ctx.hookState.actorInstancesMap && ctx.hookState.actorInstancesMap[activity.entityId]) {
        actor = ctx.hookState.actorInstancesMap[activity.entityId];
      }
      if (actor) {
        actor.journalSaved(activity.toObject(), options, function (err) {
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
        return next(err);
      }
      return next();
    });
  });

  function getActorModel(modelName, options) {
    if (!actorModelsMap[modelName]) {
      actorModelsMap[modelName] = loopback.getModel(modelName, options);
    }
    return actorModelsMap[modelName];
  }
};
