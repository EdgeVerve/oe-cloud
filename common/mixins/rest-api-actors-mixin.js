/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**

 * @mixin Change rest api calls to first check in memory pool and if it is not find - find in DB.
 * @author Karin Angel
 */
var memoryPool = require('../../lib/actor-pool');
var _ = require('lodash');
var loopback = require('loopback');

module.exports = function RestApiActorsMixin(Model) {
  Model.afterRemote('**', function afterRemoteCbFn(ctx, unused, next) {
    var query = ctx.args;

    if (!ctx.methodString.includes('find')) {
      return next();
    }

    var id = query.id;

    if (typeof id === 'undefined') {
      if (typeof query.filter !== 'undefined') {
        id = findIdInWhere(Model, query.filter.where).value;
      }
    }

    if (id) {
      var envelope = memoryPool.getEnvelope(Model.modelName, id);

      if (typeof envelope === 'undefined') {
        return next();
      }

      var options = loopback.getCurrentContext().active.callContext;

      Model.findById(id, options, function ModelFindByIdCbFn(err, result) {
        if (err) {
          return next(err);
        } else if (typeof result === 'undefined') {
          return next(new Error('Model instance was not found'));
        }
        result.state(false, options, function resultStateCbFn(err, state) {
          if (err) {
            return next(err);
          } else if (!state) {
            var actorNotFoundErr = new Error('Actor state not found');
            actorNotFoundErr.retriable = false;
            return next(actorNotFoundErr);
          }
          return result.getActorFromMemory(envelope, options, function resultGetActorFromMemoryCbFn(err, result) {
            if (err) {
              return next(err);
            }
            if (Array.isArray(ctx.result)) {
              ctx.result = [result];
            } else {
              ctx.result = result;
            }
            return next();
          });
        });
      });
    } else {
      return next();
    }
  });


  function getFields(data, arr) {
    _.forEach(data, function dataAccessGetKeysForEach(value, key) {
      if ((typeof key === 'string') && (key !== 'and' || key !== 'or')) {
        if (key.indexOf('.') > -1) {
          Array.prototype.splice.apply(arr, [0, 0].concat(key.split('.')));
        } else {
          arr.push({ key: key, value: value });
        }
      }
      if (typeof value === 'object') {
        getFields(value, arr);
      }
    });
  }

  function idName(m) {
    return m.definition.idName() || 'id';
  }

  function findIdInWhere(model, where) {
    var pk = idName(model);
    var whereConds = [];
    getFields(where, whereConds);
    return whereConds.find(function whereFindCbFn(cond) {
      return cond.key === pk;
    });
  }
};
