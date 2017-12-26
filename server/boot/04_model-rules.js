/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries.
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/
/**
 * This boot script brings the ability to declaratively add validation rule(decision table) to the model.
 *
 * @memberof Boot Scripts
 * @author Pradeep Kumar Tippa
 * @name Model Rules
 */
// Why writing this as boot script rather than the model.js file is becuase, we were not able to
// retreive the models from loopback.findModel, tried ways of ModelRule.on('dataSourceAttached')
// to fire queries for model rules in DB to attach before save hooks. But unable to get the corresponding
// model from loopback.findModel(), which always gives undefined.
// Even tried the ModelDefinition.events.once('model-'+modelName+'-available') but the ModelDefinition is also not available.

// modelName should not be unique you can have multiple rules based on the scope?
var async = require('async');
var loopback = require('loopback');
var log = require('oe-logger')('model-rule');

var messaging = require('../../lib/common/ev-global-messaging');

var modelRuleModel;

module.exports = function ModelRule(app, cb) {
  log.debug(log.defaultContext(), 'In 04_model_rules.js script.');
  modelRuleModel = app.models.ModelRule;
  // Creating 'before save' and 'after save' observer hooks for ModelRule
  modelRuleModel.observe('before save', modelRuleBeforeSave);
  modelRuleModel.observe('after save', modelRuleAfterSave);
  // Creating filter finding only records where disabled is false.
  var filter = {
    where: {
      disabled: false
    }
  };
  var options = {
    ignoreAutoScope: true,
    fetchAllScopes: true
  };
  // Using fetchAllScopes and ignoreAutoScope to retrieve all the records from DB. i.e. from all tenants.
  modelRuleModel.find(filter, options, function (err, results) {
    log.debug(log.defaultContext(), 'modelRuleModel.find executed.');
    if (err) {
      log.error(log.defaultContext(), 'modelRuleModel.find error. Error', err);
      cb(err);
    } else if (results && results.length > 0) {
      // The below code for the if clause will not executed for test cases with clean/empty DB.
      // In order to execute the below code and get code coverage for it we should have
      // some rules defined for some models in the database before running tests for coverage.
      log.debug(log.defaultContext(), 'Some modelRules are present, on loading of this ModelRule model');
      for (var i = 0; i < results.length; i++) {
        // No need to publish the message to other nodes, since other nodes will attach the hooks on their boot.
        // Attaching all models(ModelRule.modelName) before save hooks when ModelRule loads.
        // Passing directly modelName without checking existence since it is a mandatory field for ModelRule.
        attachBeforeSaveHookToModel(results[i].modelName, {ctx: results[i]._autoScope});
      }
      cb();
    } else {
      cb();
    }
  });
};

// Subscribing for messages to attach 'before save' hook for modelName model when POST/PUT to ModelRule.
messaging.subscribe('modelRuleAttachHook', function (modelName, options) {
  // TODO: need to enhance test cases for running in cluster and send/recieve messages in cluster.
  log.debug(log.defaultContext(), 'Got message to attach before save hook for model ', modelName);
  attachBeforeSaveHookToModel(modelName, options);
});

/**
 * This function is after save hook for ModelRule model.
 *
 * @param {object} ctx - Model context
 * @param {function} next - callback function
 */
function modelRuleAfterSave(ctx, next) {
  log.debug(log.defaultContext(), 'modelRuleAfterSave method.');
  var data = ctx.data || ctx.instance;
  // Publishing message to other nodes in cluster to attach the 'before save' hook for model.
  messaging.publish('modelRuleAttachHook', data.modelName, ctx.options);
  log.debug(log.defaultContext(), 'modelRuleAfterSave data is present. calling attachBeforeSaveHookToModel');
  if (!data.isService) attachBeforeSaveHookToModel(data.modelName, ctx.options);
  else attachBeforeSaveHookToModelForService(data.modelName, ctx.options);
  next();
}

/**
 * This function is before save hook for ModelRule model.
 *
 * @param {object} ctx - Model context
 * @param {function} next - callback function
 */
function modelRuleBeforeSave(ctx, next) {
  var data = ctx.data || ctx.instance;
  // It is good to have if we have a declarative way of validating model existence.
  var modelName = data.modelName;
  var model = loopback.findModel(modelName, ctx.options);
  if (model) {
    data.modelName = model.modelName;
    next();
  } else {
    // Not sure it is the right way to construct error object to sent in the response.
    var err = new Error('Model \'' + modelName + '\' doesn\'t exists.');
    next(err);
  }
}

/**
 * This function is to attach before save hook for modelName found in  ModelRule model data.
 *
 * @param {string} modelName - Model name
 * @param {object} options - options
 */
function attachBeforeSaveHookToModel(modelName, options) {
  // Can we avoid this step and get the ModelConstructor from context.
  var model = loopback.findModel(modelName, options);
  // Setting the flag that Model Rule exists which will be used for validation rules
  model.settings._isModelRuleExists = true;
  // Checking whether before save observer hook is already attached or not.
  // An example of after POST if the rules are updated with PUT with id, new observer hook should not get attached.
  if (!checkHookisAlreadyAttached(model, '_decsionTableBeforeSaveHook')) {
    log.debug(log.defaultContext(), 'before save hook is for model :', modelName, ' is not present. Attaching now.');
    // The name of before save hook is unique, which will be verified in checkHookisAlreadyAttached
    model.observe('before save', function _decsionTableBeforeSaveHook(modelCtx, next) {
      log.debug(log.defaultContext(), 'inside before save hook for model : ', modelName);
      log.debug(log.defaultContext(), 'Invoking executeDecisionTableRule');
      executeDecisionTableRules(modelCtx, model, next);
    });
  } else {
    log.debug(log.defaultContext(), 'before save hook is already present for model :', modelName);
  }
}

// This function is called for Decision Service-based defaultRules
function attachBeforeSaveHookToModelForService(modelName, options) {
  var model = loopback.findModel(modelName, options);
  // Setting the flag that Model Rule exists which will be used for validation rules
  model.settings._isModelRuleExists = true;
  // Checking whether before save observer hook is already attached or not.
  // An example of after POST if the rules are updated with PUT with id, new observer hook should not get attached.
  if (!checkHookisAlreadyAttached(model, '_decsionTableBeforeSaveHookForService')) {
    log.debug(log.defaultContext(), 'before save hook for DecisionService-based defaultRules for model :', modelName, ' is not present. Attaching now.');
    // The name of before save hook is unique, which will be verified in checkHookisAlreadyAttached
    model.observe('before save', function _decsionTableBeforeSaveHookForService(modelCtx, next) {
      log.debug(log.defaultContext(), 'inside before save hook for DecisionService-based defaultRules for model : ', modelName);
      log.debug(log.defaultContext(), 'Invoking executeDecisionServiceRule');
      executeDecisionServiceRules(modelCtx, model, next);
    });
  } else {
    log.debug(log.defaultContext(), 'before save hook is already present for DecisionService-based defaultRules for model :', modelName);
  }
}


/**
 * This function is to check the before save hook for a particular model with name is already attached or not.
 *
 * @param {object} model - Model Object
 * @param {string} hookName - the name of the hook
 * @returns {string} - model name is attached or not.
 */
function checkHookisAlreadyAttached(model, hookName) {
  var returnRes = false;
  // Checking of existence of model._observers is not required since these are populated by default by loopback.
  // Fetching all the before save hooks for the model.
  var beforeSaveObserversArray = model._observers['before save'];
  if (beforeSaveObserversArray && beforeSaveObserversArray.length > 0) {
    // Using javascript array.find function.
    returnRes = beforeSaveObserversArray.find(function (observer) {
      return observer.name === hookName;
    });
    return returnRes;
  }
  // Getting into this else case is very tricky models without any base or base as Model, PersistedModel comes here.
  return returnRes;
}

/**
 * This function is to execute decision table rules.
 *
 * @param {object} modelCtx - Model Context
 * @param {object} model - Model data
 * @param {Function} next - Callback Function
 */
function executeDecisionTableRules(modelCtx, model, next) {
  // Not checking the model existence since it is a loopback feature.
  var desicionTableModel = loopback.findModel('DecisionTable');
  var modelData = modelCtx.data || modelCtx.instance;
  var payload = modelData.__data;
  // Building filter query to find the modelRule
  // Is model.modelName is the right way to get model name or we have to use modelCtx, who is populating modelName to model constructor
  // does models with base PersistedModel also works.
  var filter = {
    where: {
      modelName: model.modelName,
      disabled: false
    }
  };
  // Querying the ModelRule model with model context options since it is from 'before save' hook.
  modelRuleModel.find(filter, modelCtx.options, function (err, results) {
    if (err) {
      // Not sure how to trigger this code from the test cases i.e. how to trigger error for modelRuleModel.find
      log.error(log.defaultContext(), 'modelRuleModel.find err - ', err);
      return next(err);
    }
    // Validating results is array and it contains the first element and defaultRules
    if (results && results instanceof Array && results[0] && results[0].defaultRules) {
      // Getting the defaultRules from the DB/cache results.
      var defaultRules = results[0].defaultRules;
      // Validating defaultRules is of type array and have some rules present in it.
      if (defaultRules instanceof Array && defaultRules.length > 0) {
        // Default rules need to be executed in sequence and enrich the payload data.
        async.eachSeries(defaultRules, function (defaultRule, ruleCb) {
          log.debug(log.defaultContext(), 'Executing Rule - ', defaultRule);
          payload.options = modelCtx.options;
          payload.options.modelName = model.modelName;
          desicionTableModel.exec(defaultRule, payload, modelCtx.options, function (err, enrichedData) {
            if (enrichedData && enrichedData.options) {
              delete enrichedData.options;
            }
            payload = enrichedData;
            ruleCb(err);
          });
        }, function (err) {
          modelCtx.data = modelCtx.instance = payload;
          next(err);
        });
      } else {
        log.debug(log.defaultContext(), 'No default rules to execute.');
        next();
      }
    } else {
      log.debug(log.defaultContext(), 'no model rule found for model ', model.modelName);
      next();
    }
  });
}


/**
 * This function is to execute decision service rules.
 *
 * @param {object} modelCtx - Model Context
 * @param {object} model - Model data
 * @param {Function} next - Callback Function
 */
function executeDecisionServiceRules(modelCtx, model, next) {
  // Not checking the model existence since it is a loopback feature.
  var desicionServiceModel = loopback.findModel('DecisionService');
  var modelData = modelCtx.data || modelCtx.instance;
  var payload = modelData.__data;
  // Building filter query to find the modelRule
  var filter = {
    where: {
      modelName: model.modelName,
      disabled: false,
      isService: true
    }
  };
  // Querying the ModelRule model with model context options since it is from 'before save' hook.
  modelRuleModel.find(filter, modelCtx.options, function (err, results) {
    if (err) {
      // Not sure how to trigger this code from the test cases i.e. how to trigger error for modelRuleModel.find
      log.error(log.defaultContext(), 'modelRuleModel.find err - ', err);
      return next(err);
    }
    // Validating results is array and it contains the first element and defaultRules
    if (results && results instanceof Array && results[0] && results[0].defaultRules) {
      // Getting the defaultRules from the DB/cache results.
      var defaultRules = results[0].defaultRules;
      // Validating defaultRules is of type array and have some rules present in it.
      if (defaultRules instanceof Array && defaultRules.length > 0) {
        // Default rules need to be executed in sequence and enrich the payload data.
        async.eachSeries(defaultRules, function (defaultRule, ruleCb) {
          log.debug(log.defaultContext(), 'Executing Rule - ', defaultRule);
          payload.options = modelCtx.options;
          payload.options.modelName = model.modelName;
          desicionServiceModel.invoke(defaultRule, payload, modelCtx.options, function (err, result) {
            // if (result && result.options) {
            //   delete enrichedData.options;
            // }
            Object.keys(result).forEach(function (node) {
              var currentNodeValue = result[node];
              Object.keys(currentNodeValue).forEach(function (enrichedKey) {
                payload[enrichedKey] = currentNodeValue[enrichedKey];
              });
            });
            ruleCb(err);
          });
        }, function (err) {
          modelCtx.data = modelCtx.instance = payload;
          next(err);
        });
      } else {
        log.debug(log.defaultContext(), 'No DS-based default rules to execute.');
        next();
      }
    } else {
      log.debug(log.defaultContext(), 'no DS-based model rule found for model ', model.modelName);
      next();
    }
  });
}
