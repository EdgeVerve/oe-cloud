/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

/* This mixin is for expression evaluations mentioned in properties and attaching the evaluated values to the properties*/
/* @mixin Property expression mixin*/
/* @author Rahul_Verma17*/
var logger = require('../../lib/logger');
var log = logger('property-expression-mixin');
var propertyUtils = require('../../lib/common/property-expression-utils.js');
var exprLang = require('../../lib/expression-language/expression-language.js');


module.exports = function PropertyExpressionMixin(Model) {
  if (Model.modelName === 'BaseEntity') {
    // No need to apply the model property expression change at
    // BaseEntity level
    // Let the actual model decide if it wants to enable property
    // expression mixin
    return;
  }
  log.debug(log.defaultContext(), 'PropertyExpressionMixin invoked for ', Model.modelName, 'prop expr ', JSON.stringify(propertyUtils.propertyExpressions(Model)));
  // get property expressions from property-expression-util
  Model.propertyUtils = propertyUtils.propertyExpressions(Model);
  if (typeof Model.propertyUtils !== 'undefined' && Model.propertyUtils.length > 0) {
    Model.evObserve('before save', injectPropertyExprVal);
  }
};


function injectPropertyExprVal(ctx, next) {
  if (!ctx.Model.definition.settings.mixins.PropertyExpressionMixin) {
    log.debug(ctx.options, 'PropertyExpressionMixin disabled for model - ', ctx.Model.modelName);
    return next();
  }
  log.debug(ctx.options, 'PropertyExpressionMixin Before save called. Model Name - ', ctx.Model.modelName);
  log.debug(ctx.options, 'PropertyExpressionMixin Saving entity - ', ctx.Model.modelName);
  if (ctx.instance) {
    evaluateExpressions(ctx, function returnBack() {
      log.debug(ctx.options, 'returned: ', JSON.stringify(ctx.instance));
      next();
    });
  } else {
    log.error(ctx.options, 'instance not defined');
    next();
  }
}

// function to traverse through sub models and call evaluateExpressions
function getSubModels(inst) {
  log.debug(log.defaultContext(), 'in sub models', JSON.stringify(inst));
  var properties = inst.constructor.definition.properties;
  log.debug(log.defaultContext(), 'in sub models properties', JSON.stringify(properties));
  var model;
  Object.keys(properties).forEach(function propertyExpressions(property) {
    // if type of the property is an array which is of Model type then collect the property expressions for the Model properties
    if (properties[property].type instanceof Function &&
      properties[property].type.sharedClass) {
      log.debug(log.defaultContext(), 'in sub models property ', properties[property].type);
      log.debug(log.defaultContext(), 'shared class ', properties[property].type.sharedClass);
      model = properties[property].type;
      var instance = inst.__data[property];
      log.debug(log.defaultContext(), 'shareid class instance ', JSON.stringify(instance));
      if (instance && model.settings.mixins.PropertyExpressionMixin) {
        log.debug(log.defaultContext(), 'rules added for  ', model.modelName);
        evaluateExpressions(instance);
      }
    } else if (properties[property].type instanceof Array &&
      properties[property].type[0] &&
      properties[property].type[0].sharedClass &&
      inst[property]) {
      log.debug(log.defaultContext(), 'in array type model');
      for (var i = 0; i < inst[property].length; i++) {
        model = properties[property].type[0];
        var instances = inst.__data[property];
        // for array type iterate and evaluate individually
        iterateArrayProps(instances, model);
      }
    } else {
      return;
    }
  });
  return;
}


function iterateArrayProps(instances, model) {
  instances.forEach(function instacnesForEachFn(instance) {
    log.debug(log.defaultContext(), 'instance in type array ', JSON.stringify(instance));
    if (instance && model.settings.mixins.PropertyExpressionMixin) {
      log.debug(log.defaultContext(), 'rules added for ', model.modelName);
      evaluateExpressions(instance);
    }
  });
}


function evaluateExpressions(ctx, callback) {
  var instance = ctx.instance;
  var options = ctx.options;
  var self = instance;
  var ast = self.constructor._ast;
  var propertyExpressionPromises = [];
  var propMapper = [];
  log.debug(options, 'valid instance found:', JSON.stringify(ast));
  var count = -1;
  var data = self.toObject(true);
  self.constructor.propertyUtils.forEach(function propExpressionsForEach(obj) {
    if (obj.propExpression) {
      log.debug(options, 'check---', JSON.stringify(exprLang.traverseAST(ast[obj.propExpression]), '---data', JSON.stringify(data)));
      propertyExpressionPromises.push(exprLang.traverseAST(ast[obj.propExpression], self.toObject(true), options));
      count++;
      propMapper[count] = obj.name;
    }
  });
  // all settled promises are accumalated and attached to properties
  Promise.all(propertyExpressionPromises).then(function propertiesPromiseFn(results) {
    log.debug(options, 'eval result ', JSON.stringify(results));
    for (var i = 0; i < propMapper.length; i++) {
      log.debug(options, 'property', propMapper[i]);
      if (typeof instance[propMapper[i].toString()] === 'undefined') {
        var undefinedProp = propMapper[i].toString();
        instance[undefinedProp] = results[i];
      } else {
        log.debug(options, 'length ', instance[propMapper[i].toString()].length);
        if (instance[propMapper[i].toString()].length > 0) { continue; }
        instance[propMapper[i].toString()] = results[i];
      }
    }
    log.debug(options, 'post update ', JSON.stringify(instance));
    getSubModels(instance);
    ctx.instance = instance;
    callback();
  }, function promiseCallbackFn(err) {
    log.debug(options, ' error----------------', err);
    callback();
  });
}
