/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries.
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/
/**

 * @mixin Change rest api calls to first check in memory pool and if it is not find - find in DB.
 * @author Karin Angel
 */
var _ = require('lodash');

module.exports = function RestApiActorsMixin(Model) {
  // Before remote hook to parse ctx.args.filter string to object
  Model.beforeRemote('find', function parseFilter(ctx, modelInstance, next) {
    if (ctx.args.filter) {
      ctx.args.filter = (typeof ctx.args.filter !== 'object') ? JSON.parse(ctx.args.filter) : ctx.args.filter;
    }
    next();
  });

  Model.afterRemote('**', function (ctx, unused, next) {
    var query = ctx.args;

    if (!ctx.methodString.includes('find')) {
      return next();
    }

    var id = query.id;

    if (typeof id === 'undefined') {
      if (typeof query.filter !== 'undefined' && typeof query.filter.where !== 'undefined') {
        var idInWhere = findIdInWhere(Model, query.filter.where);
        if (idInWhere) {
          id = idInWhere.value;
        }
      }
    }

    if (id) {
      var actor;
      if (Array.isArray(ctx.result)) {
        actor = ctx.result[0];
      } else {
        actor = ctx.result;
      }
      if (!actor) {
        return next();
      }
      var options = ctx.req.callContext;
      actor.balanceProcess(options, function (err, res) {
        if (err) {
          return next(err);
        }
        if (Array.isArray(ctx.result)) {
          ctx.result = [res];
        } else {
          ctx.result = res;
        }
        next();
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
          arr.push({key: key, value: value});
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
    return whereConds.find(function (cond) {
      return cond.key === pk;
    });
  }
};
