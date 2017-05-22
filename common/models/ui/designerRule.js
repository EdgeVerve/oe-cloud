/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');

module.exports = function designerRule(Model) {
  var postRule = function postRule(ctx, modelInstance, next) {
    var personalizatioRule = loopback.getModel('PersonalizationRule');
    var data = ctx.args.data;
    var newObj = {
      'modelName': data.modelName,
      'name': data.name,
      'personalizationRule': data.personalizationRule,
      'scope': data.customScope
    };

    personalizatioRule.create(newObj, ctx.req.callContext, function update(err, result) {
      if (err) {
        next(err);
      }
      data.config = data.config || {};
      data.config.id = result.id;
      data.config._version = result._version;
      next();
    });
  };

  var putRule = function putRule(ctx, modelInstance, next) {
    var personalizatioRule = loopback.getModel('PersonalizationRule');
    var data = ctx.args.data;
    var newObj = {
      'modelName': data.modelName,
      'name': data.name,
      'personalizationRule': data.personalizationRule,
      'scope': data.customScope,
      'id': data.config.id,
      '_version': data.config._version
    };

    personalizatioRule.upsert(newObj, ctx.req.callContext, function update(err, result) {
      if (err) {
        next(err);
      }
      data.config = data.config || {};
      data.config.id = result.id;
      data.config._version = result._version;
      next();
    });
  };

  var deleteRule = function deleteRule(ctx, modelInstance, next) {
    var personalizatioRule = loopback.getModel('PersonalizationRule');
    var data = ctx.args;
    var newObj = {
      'id': data.config.id,
      '_version': data.config._version
    };

    personalizatioRule.delete(newObj, ctx.req.callContext, function update(err, result) {
      if (err) {
        next(err);
      }
      next();
    });
  };

  Model.beforeRemote('create', postRule);
  Model.beforeRemote('upsert', putRule);
  Model.beforeRemote('delete', deleteRule);
};

