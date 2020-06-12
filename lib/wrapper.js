/**
 *
 * �2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
*/

module.exports = function (app) {
  let loopback = app.loopback;
  const _createOptionsFromRemotingContext = loopback.findModel('Model').createOptionsFromRemotingContext;
  function _newCreateOptionsFromRemotingContext(ctx) {
    var options = _createOptionsFromRemotingContext.call(this, ctx) || {};

    if (ctx.req && ctx.req.callContext && ctx.req.callContext.ctx) {
      // options.ctx = Object.assign({}, ctx.req.callContext.ctx);
      options.ctx = ctx.req.callContext.ctx;
    }


    if (options.accessToken) {
      var accessToken = options.accessToken.__data || options.accessToken;
      if (accessToken) {
        let obj = Object.assign({}, accessToken);
        // remove properties that are not required
        delete obj.id;
        delete obj.ttl;
        delete obj.created;
        obj.roles = accessToken.roles ? JSON.parse(JSON.stringify(accessToken.roles)) : null;

        options.ctx = Object.assign(options.ctx || {}, obj, options.accessToken.ctx);
      }
    }
    options.ctx = options.ctx || {};

    if (ctx.req && !ctx.req.callContext) {
      ctx.req.callContext = {ctx: options.ctx};
    }
    options.modelName = this.modelName;
    return options;
  }

  if (_createOptionsFromRemotingContext) {
    for (var m in loopback.registry.modelBuilder.models) {
      if (loopback.registry.modelBuilder.models.hasOwnProperty(m)) {
        loopback.registry.modelBuilder.models[m].createOptionsFromRemotingContext = _newCreateOptionsFromRemotingContext;
      }
    }
  }
};
