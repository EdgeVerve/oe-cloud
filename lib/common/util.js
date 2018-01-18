/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @module oeCloud Utils
 * @author Ramesh Choudhary, Atul
 */

var _ = require('lodash');
var loopback = require('loopback');
var logger = require('oe-logger');
var log = logger('util');
var async = require('async');
var validationUtils = require('./validation-utils');
var applicableValidations = validationUtils.applicableValidations;
var validationExpressionMapper = validationUtils.validationExpressionMapper;
var exprLang = require('../expression-language/expression-language.js');
var getValidationError = require('./error-utils').getValidationError;
var Mustache = require('mustache');
var invalidPropNames = ['isvalid'];
var app = require('../../server/server.js').app;
var uuidv4 = require('uuid/v4');
var inflection = require('inflection');
module.exports.version = require('../../package.json').version;

module.exports.bootContext = function bootContext() {
  return {
    ignoreAutoScope: true,
    bootContext: true,
    ctx: {
      remoteUser: 'system'
    }
  };
};

// Atul : This is very bad way to find actual model with plural.
// Once it is proven, i will check on better logic

/**
 *
 *
 * This function returns overriden model or in other words personalized model
 * As of now this function is written in switch-datasource-mixin.js file because logic to find overriden model can be easily reused.
 * As of now this function is async and requires callback. When logic of data source personalization is reused, it can be made with sync call
 * this will be changed in future till all scenarios are tested. there could be some overhead as of now.
 * @param {string} model - options
 * @function
 */
var attachOverrideModelFunction = module.exports.attachOverrideModelFunction = function attachOverrideModelFunctionFn(model) {
  model.getOverridenModel = function getOverridenModelFn(modelName, options) {
    var verifyModel = true;
    if (!(modelName && typeof (modelName) === 'string')) {
      options = modelName;
      modelName = this.modelName;
      verifyModel = false;
    }
    if (!options) {
      options = {};
    }
    var model = loopback.findModel(modelName, options);
    if (model) {
      return model;
    }
    if (verifyModel && !model) {
      return null;
    }
    return this;
  };
};

module.exports.checkModelWithPlural = function utilCheckModelWithPlural(server, plural) {
  var models = server.models();
  var res = models.find(function (ele) {
    return (ele.clientPlural && ele.clientPlural === plural) || ele.pluralModelName === plural;
  });

  return res ? res.clientPlural ? res.clientModelName : res.modelName : null;
};


// Create the Model in Loopback corresponding to the specified ModelDefinition ID
module.exports.createModel = function utilCreateModel(app, modeldefinition, options, cb) {
  // Create the model

  // Removing null fields to make compactable with mongo
  var jsonifyModel = JSON.parse(JSON.stringify(modeldefinition));
  for (var i in jsonifyModel) {
    if (jsonifyModel[i] === null) {
      delete jsonifyModel[i];
    }
  }
  var modelDefinition = loopback.getModel('ModelDefinition');
  var autoscopeFields = modelDefinition.definition.settings.autoscope;
  var ctxStr = '';
  // jsonifyModel.variantOf = jsonifyModel.variantOf || jsonifyModel.name;

  var actualContext = options;
  if (options.bootContext) {
    const modelCtx = modeldefinition._autoScope;
    ctxStr = createContextString(autoscopeFields, modelCtx);
    actualContext = {
      ctx: modelCtx
    };
  } else {
    ctxStr = createContextString(autoscopeFields, options.ctx);
  }

  if (jsonifyModel.base) {
    let baseModel = loopback.getModel(jsonifyModel.base, actualContext);
    jsonifyModel.base = baseModel.modelName;
  }


  if (!app.personalizedModels[jsonifyModel.name]) {
    app.personalizedModels[jsonifyModel.name] = {};
  }
  if (ctxStr === createDefaultContextString(autoscopeFields)) {
    app.personalizedModels[jsonifyModel.name][ctxStr] = {
      'modelId': jsonifyModel.name,
      'context': ctxStr
    };
    // console.log("***", jsonifyModel.clientModelName)
  } else {
    app.personalizedModels[jsonifyModel.name][ctxStr] = {
      'modelId': jsonifyModel.modelId,
      'context': ctxStr
    };
    jsonifyModel.name = jsonifyModel.modelId;
    // console.log("***", jsonifyModel.clientModelName)
    jsonifyModel.plural = createPlural(jsonifyModel.name);
  }

  if (ctxStr !== createDefaultContextString(autoscopeFields)) {
    if (jsonifyModel.relations) {
      Object.keys(jsonifyModel.relations).forEach(function (r) {
        jsonifyModel.relations[r].clientModel = jsonifyModel.relations[r].model;
        if (!app.models[jsonifyModel.relations[r].clientModel] && createContextString(autoscopeFields, actualContext.ctx) !== createDefaultContextString(autoscopeFields)) {
          jsonifyModel.relations[r].model = jsonifyModel.relations[r].model + '-' + createContextString(autoscopeFields, actualContext.ctx);
        }
      });
    }
    let typeList = ['string', 'String', 'number', 'Number', 'date', 'Date', 'DateString', 'boolean', 'Boolean', 'object', 'Object', 'email', 'Email', 'timestamp', 'Timestamp', 'buffer', 'GeoPoint', 'any', 'array', null];
    if (jsonifyModel.properties) {
      Object.keys(jsonifyModel.properties).forEach(function (p) {
        if (typeList.indexOf(jsonifyModel.properties[p].type) === -1 && typeof (jsonifyModel.properties[p].type) === 'string') {
          var embeddedModelName = jsonifyModel.properties[p].type;
          if (!app.models[embeddedModelName]) {
            jsonifyModel.properties[p].type = jsonifyModel.properties[p].type + '-' + createContextString(autoscopeFields, actualContext.ctx);
          }
        } else if (typeList.indexOf(jsonifyModel.properties[p].type) === -1 && Array.isArray(jsonifyModel.properties[p].type)) {
          var embeddedType = jsonifyModel.properties[p].type[0];
          if (typeList.indexOf(embeddedType) === -1 && !app.models[embeddedType]) {
            jsonifyModel.properties[p].type[0] = jsonifyModel.properties[p].type[0] + '-' + createContextString(autoscopeFields, actualContext.ctx);
          }
        }
      });
    }
  }


  var model = loopback.createModel(jsonifyModel);
  model.updateId = uuidv4();
  model.variantOf = jsonifyModel.variantOf;
  model.clientPlural = jsonifyModel.clientPlural;
  model.clientModelName = jsonifyModel.clientModelName;
  attachOverrideModelFunction(model);

  // Setting dynamic model set to true
  model.settings = model.settings || {};
  model.settings._dynamicModel = true;

  // var model = loopback.createModel(JSON.parse(JSON.stringify(modeldefinition)));
  // console.log("************", jsonifyModel.clientModelName);
  app.locals.modelNames[model.clientModelName.toLowerCase()] = model.clientModelName;
  app.locals.modelNames[model.clientModelName] = model.clientModelName;
  // Attach it to the datasource

  // Will return the datasource attached to the parent of the model
  // as no mixins have been attached yet
  var ds = model.getDataSource(options);
  if (ds) {
    // Mixins get attached at this step
    ds.attach(model);
  } else {
    ds = jsonifyModel.datasource ? app.dataSources[jsonifyModel.datasource] : app.dataSources.db;
    ds.attach(model);
  }


  // disable change-stream
  model.disableRemoteMethod('createChangeStream', true);
  // Enable REST API
  app.model(model);

  log.debug(options, 'DEBUG: lib/common/util.js: Model loaded from database : ',
    modeldefinition.name);

  var datasources = app.datasources;

  var relationalDataSources = {};
  Object.keys(datasources).forEach(function fnRelDS(dsId) {
    var ds = datasources[dsId];
    if (ds && ds.isRelational()) {
      relationalDataSources[ds.settings.name] = ds;
    }
  });

  var dsModelMapping = [];

  // Will return the actual dataSource as the mixins have been attached now
  var mds = model.getDataSource(options);
  if (mds) {
    var dsName = mds.settings.name;
    if (relationalDataSources.hasOwnProperty(dsName)) {
      dsModelMapping.push({
        modelName: model.modelName,
        ds: relationalDataSources[dsName]
      });
    }
  }
  cb();
};

// Delete the LB DataSource corresponding to the specified DataSourceDefinition
module.exports.deleteDatasource = function utilDeleteDataSource(app, dsdefinition) {
  // app.datasources[dsdefinition.name] = undefined;
  // if we make this undefined, models are still attached to this
  // and this will crash system, why we need to allow datasource defn
  // may be soft delete and do not pick next time when system starts
  log.debug(log.defaultContext(), 'delete data source may be we need to close connection');
};

// create datasource
module.exports.createDataSource = function createDataSource(app, dsdefinition, options) {
  // Create the LoopBack datasource using the details in the dsdefinition
  try {
    var dataSource = loopback.createDataSource(dsdefinition);
    app.datasources[dsdefinition.id] = dataSource;
    log.debug(log.defaultContext(), 'created real ds ', dsdefinition.name);
    app.locals.dataSources = app.locals.dataSources || {};
    if (app.locals.dataSources[dsdefinition.name]) {
      delete app.locals.dataSources[dsdefinition.name];
    }
  } catch (err) {
    log.error(options, err);
  }
};

module.exports.createPromiseCallback = function createPromiseCallback() {
  var cb;

  if (!global.Promise) {
    cb = function emptyFn() {};
    cb.promise = {};
    Object.defineProperty(cb.promise, 'then', {
      get: throwPromiseNotDefined
    });
    Object.defineProperty(cb.promise, 'catch', {
      get: throwPromiseNotDefined
    });
    return cb;
  }

  var promise = new Promise(function promiseFn(resolve, reject) {
    cb = function cbFn(err, data) {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    };
  });
  cb.promise = promise;
  return cb;
};

// checks the validity of a model
module.exports.isModelDefinitionValid = function isModelDefinitionValid(modeldefinition, options, cb) {
  var fnArr = [];
  // aggregate all the functions to evaluate the validity of a model
  fnArr = fnArr.concat(fnArr, getPropertyValidityFns(modeldefinition, options), getOeValidationValidityFns(modeldefinition, options));
  // execute all the functions paralelly which will evaluate the validity of the model
  async.parallel(fnArr, function modelDefinitionValidationCb(err, results) {
    var errArr = [];
    if (err) {
      errArr.push(err);
      return cb(errArr);
    }
    // results = [].concat.apply([], results);
    errArr = results.filter(function errorFilterCb(d) {
      return d !== null && typeof d !== 'undefined';
    });
    // if model validity falis the passs the error
    if (errArr && errArr.length > 0) {
      cb(errArr);
    } else {
      cb();
    }
  });
};

function throwPromiseNotDefined() {
  var err = new Error(
    'Your Node runtime does support ES6 Promises. ' +
        'Set "global.Promise" to your preferred implementation of promises.');
  err.retriable = false;
  throw err;
}

/**
 *
 * Aggregation of expressions(mustache queries and expression language expressions) attached to all the oeValidations object of the model
 * @param {Object} modeldefinition - model definition for which expressions are to be aggregated
 * @param {Object} options - call context options.
 * @returns {Object[]} Array containing all the functions that will evaluate the expressions present in oeValidations
 */
function getOeValidationValidityFns(modeldefinition, options) {
  var expr = {};
  var evRulesFn = [];
  var validations = modeldefinition.oeValidations || {};
  log.debug(options, 'aggregating oeValidation validation rules for : ', modeldefinition.name);
  Object.keys(validations).forEach(function modelDefinitionValidationsForEachCb(validationName) {
    var validation = validations[validationName];
    var path = modeldefinition.name + '->' + validationName + '->';
    // pick the respective validation function according to the type of rule e.g. 'reference' or 'custom'
    var expression = validationExpressionMapper.oeValidation(validation.type);
    if (expression) {
      var validateWhenRule = null;
      if (validation.validateWhen) {
        // validateWhen takes a string in case of ev validations if validateWhen is an object then nake the rule null
        if (typeof validation.validateWhen === 'object') {
          validateWhenRule = null;
        } else {
          // pick the validateWhen condition if present for the rule
          validateWhenRule = validation.validateWhen;
          expr = {
            rule: validateWhenRule,
            type: 'validateWhen',
            path: path + 'validateWhen'
          };
          // this wrapper prepares an array of functions to evaluate the validity of a model
          evRulesFn.push(async.apply(expressionCheck, expr, options));
        }
      }
      // pick the validation rule i.e. refWhere in case of reference type rule or expression in case of custom type rule
      expr = {
        rule: validation.expression || validation.refWhere,
        type: validation.type,
        path: path + 'rule'
      };
      // this wrapper prepares an array of functions to evaluate the validity of a model
      evRulesFn.push(async.apply(expressionCheck, expr, options));
    }
  });
  return evRulesFn;
}

/**
 *
 * Aggregation of expressions attached to all the properties of the model
 * @param {Object} modeldefinition - modeldefinition for which expressions are to be aggregated
 * @param {Object} options - call context options.
 * @returns {Object[]} Array containing all the functions that will evaluate the expressions present at property level of the model and all the property names
 */
function getPropertyValidityFns(modeldefinition, options) {
  var expr = {};
  var propRulesFn = [];
  var properties = modeldefinition.properties || {};
  log.debug(options, 'aggregating property level rules for : ', modeldefinition.name);
  Object.keys(properties).forEach(function propertiesForEachCb(propertyName) {
    var path = modeldefinition.name + '->' + propertyName;
    expr = {
      rule: propertyName,
      type: 'invalidName',
      path: path
    };
    // this wrapper prepares an array of functions to evaluate the validity of a model
    propRulesFn.push(async.apply(propertyNameCheck, expr, options));

    var propertyType = properties[propertyName].type;
    var type = 'default';
    if (propertyType instanceof Function && propertyType.sharedClass) {
      type = 'object';
    } else if (propertyType instanceof Array && propertyType[0] && propertyType[0].sharedClass) {
      type = 'array';
    } else if (Object.keys(validationUtils.applicableValidations).indexOf(propertyType) > 0) {
      type = propertyType.toLowerCase();
    }
    Object.keys(properties[propertyName]).forEach(function propertyNameForEachCb(key) {
      if (applicableValidations[type].indexOf(key) >= 0) {
        // pick the respective validation function according to the type of rule e.g. 'min', 'max', 'unique', etc.
        var expression = validationExpressionMapper[key];
        if (typeof expression === 'object') {
          expression = expression[properties[propertyName][key].toString()];
        }
        if (expression) {
          var validateWhenRule = null;
          if (properties[propertyName].validateWhen && properties[propertyName].validateWhen[key]) {
            // pick the validateWhen condition if present for the rule
            validateWhenRule = properties[propertyName].validateWhen[key];
            var expr = {
              rule: validateWhenRule,
              type: 'validateWhen',
              path: path + '->' + 'validateWhen' + '->' + key
            };
            // this wrapper prepares an array of functions to evaluate the validity of a model
            propRulesFn.push(async.apply(expressionCheck, expr, options));
          }
        }
      }
    });
  });
  return propRulesFn;
}

/**
 *
 * Checks the name of a property, if it is a valid name or not
 * @param {object} propObj - it contains name of the property, type and path
 * @param {Object} options - call context options.
 * @param {function} cb - callback function
 */
function propertyNameCheck(propObj, options, cb) {
  // rule is the property name
  if (!isPropertyNameValid(propObj.rule)) {
    var obj = {};
    obj.path = propObj.path;
    obj.options = options;
    getValidationError(getErrorCode(propObj.type), obj, function propertyNameErrorCb(error) {
      cb(null, error);
    });
  } else {
    cb(null, null);
  }
}

/**
 *
 * Compares the name of the property with invalid values
 * @param {string}propertyName - name of the property
 * @returns {boolean} true if name of the model is valid else false
 */
function isPropertyNameValid(propertyName) {
  var propertyNameValidity = true;
  if (invalidPropNames.indexOf(propertyName.toLowerCase()) > -1) {
    propertyNameValidity = false;
  }
  return propertyNameValidity;
}

/**
 *
 * Checks the expression attached to the model, if it is valid or not
 * @param {object} expression - it contains expression to be checked, its type and path
 * @param {Object} options - call context options.
 * @param {function} cb - callback function
 */
function expressionCheck(expression, options, cb) {
  if (!isExpressionValid(expression.rule, expression.type, expression.path)) {
    var obj = {};
    obj.path = expression.path;
    obj.options = options;
    getValidationError(getErrorCode(expression.type), obj, function expressionErrorCb(error) {
      cb(null, error);
    });
  } else {
    cb(null, null);
  }
}

/**
 *
 * Compares the name of the property with restricted value
 * @param {string} queryExpression - expression to be checked
 * @param {string} type - type of the expression(validateWhen, expression, mustache query)
 * @param {string}path - path where the expression is defined in the model definition
 * @returns {boolean} true if expression attached to the model is valid else false
 */
function isExpressionValid(queryExpression, type, path) {
  var expressionValidity = true;
  switch (type) {
    case 'reference':
      try {
        var refWhere = Mustache.render(queryExpression, {});
        var refArray = refWhere.split(';');
        if (refArray[refArray.length - 1] === '') {
          refArray = refArray.slice(0, -1);
        }
        refArray.forEach(function referenceForEachCb(ref) {
          JSON.parse(ref);
        });
      } catch (e) {
        log.error(log.defaultContext(), 'checking validity of mustache query passed in Validation : ', path);
        expressionValidity = false;
      }
      break;
    case 'validateWhen':
    case 'custom':
      try {
        exprLang.createAST(queryExpression);
      } catch (e) {
        log.error(log.defaultContext(), 'checking validity of expression language query passed in Validation : ', path);
        expressionValidity = false;
      }
      break;
    default:
  }
  return expressionValidity;
}

/**
 *
 * get the error code depending on the type of validation/rule
 * @param {String} type - type of validation rule
 * @returns {String} error code
 */
function getErrorCode(type) {
  // default error details
  var errDetails = app.errorDetails;
  var err = errDetails.filter(function getErrorCodeCb(d) {
    return d.type === type;
  });
  return err[0].code;
}

/**
 * This function returns the plural form of specified input word
 *
 * @param {string} name - The word whose plural is to be returned
 * @return {string} The plural of the specified word
 */
function createPlural(name) {
  return inflection.pluralize(name);
}

var createContextString = (autoscope = [], context) => {
  var ctxStr = [];
  autoscope.forEach(function (item, index) {
    var ctxVal = context[item];
    if (!ctxVal) {
      ctxVal = 'default';
    }
    ctxStr.push(ctxVal);
  });
  return ctxStr.join('-');
};

var createDefaultContextString = (autoscope = []) => {
  const defaultStr = [];
  autoscope.forEach(function (item) {
    defaultStr.push('default');
  });
  return defaultStr.join('-');
};

var createModelId = (modelName, contextString, autoscopeFields) => {
  if (contextString === createDefaultContextString(autoscopeFields)) {
    return modelName;
  }
  return modelName + '-' + contextString;
};

module.exports.createContextString = createContextString;
module.exports.createDefaultContextString = createDefaultContextString;
module.exports.createModelId = createModelId;

var getMode = (appinstance) => {
  var mode = 'NONE';
  var enableMigration = appinstance.get('enableMigration');
  var migrationCheckMode;
  if (enableMigration) {
    migrationCheckMode = checkForMigrationSwitch('DOMIGRATE');
    mode = migrationCheckMode ? migrationCheckMode : 'WAIT';
  } else {
    migrationCheckMode = checkForMigrationSwitch('AUTOUPDATE');
    mode = migrationCheckMode ? migrationCheckMode : mode;
  }
  return mode;
};

var checkForMigrationSwitch = (defaultMode) => {
  var mode = null;
  for (var i = 0; i < process.argv.length; i++) {
    var val = process.argv[i];
    if (i > 1 && (val.toLowerCase() === '--migrate' || val.toLowerCase() === '-m')) {
      mode = defaultMode;
      break;
    }
  }
  return mode;
};

module.exports.getMode = getMode;
module.exports.checkForMigrationSwitch = checkForMigrationSwitch;

var getFileBasedModelSettings = (model) => {
  var modelDefinitionObject = JSON.parse(JSON.stringify(model.definition.settings));
  modelDefinitionObject.filebased = true;
  // _ownDefinition is set in juggler
  var ownDefinition = model._ownDefinition || {};

  modelDefinitionObject.properties = !_.isEmpty(ownDefinition) ? ownDefinition.properties : {};

  return modelDefinitionObject;
};

module.exports.getFileBasedModelSettings = getFileBasedModelSettings;
