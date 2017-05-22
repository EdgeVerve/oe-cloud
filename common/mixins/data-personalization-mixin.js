/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This mixin is attached to BaseEntity so that it applies to all Models used in
 * the EV-FOUNDATION framework.This is used to add data with autoscope and manual
 * scope values. While POSTing the data manual scope values are sent by the user adding
 * a json attribute named scope : {} and autoscoped values are read from the model
 * settings and final scope will be calculated based on values of manual scope and auto scope
 * and stored in record along with calculated _scope. While GETting the data, records are
 * filtered based on existence of all the auto scoped values in record and any of the matched
 * manual scoped values and weightages taken from the context and applied to the results to
 * calculate score and sorted in descending order of the score.<br>
 *
 * <pre>
 * scope : While POSTing the data user can specify a scope manually by adding a json attribute named scope : {}
 *
 * autoscope : A setting in model.json where developer can force model to be automatically scoped at certain parameter.
 *             Specified as an array of strings in model definition.
 *
 * _scope : A final calculated scope which will be stored in the database.
 *          The final _scope will be a combination of autoscope and Manual Scope.
 *         _scope will be stored as an array of Integer bit positions reserved on first come first serve basis.
 *
 * _autoScope : A variable which contains the autoscoped values.
 *
 * Weightages : Weightages specified on request may be as an additional header.
 *              These weightages will be used while calculating the score while retrieving the records.
 *
 * score : The final value calculated based on weightages of the matched records.
 *         The record with highest score will be given priority over the next highest score and so on.
 * </pre>
 *
 * @mixin Data personalization mixin
 * @author Ramesh Choudhary.
 */

var mergeQuery = require('loopback-datasource-juggler/lib/utils').mergeQuery;
var _ = require('lodash');
var log = require('../../lib/logger')('data-personalization-mixin');
module.exports = function DataPersonalizationMixin(Model) {
  // Defining a new _score, scope, _autoScope property
  Model.defineProperty('_scope', {
    type: ['string'],
    index: true,
    required: false
  });
  Model.defineProperty('_autoScope', {
    type: 'object',
    required: false
  });
  if (!Model.definition.properties.scope) {
    Model.defineProperty('scope', {
      type: 'object',
      required: false
    });
  }

  // Making _autoScope and _scope as hidden fields.
  if (Model.definition.settings.hidden) {
    Model.definition.settings.hidden = Model.definition.settings.hidden.concat(['_autoscope', '_scope']);
  } else {
    Model.definition.settings.hidden = ['_autoScope', '_scope'];
  }

  // adding autoscope setting.
  if (!Model.definition.settings.autoscope) {
    Model.definition.settings.autoscope = [];
  }

  // Initializing mixin field in model settings so that we need  not check for that field while performing operations
  if (!Model.definition.settings.mixins) {
    Model.definition.settings.mixins = {};
  }

  // Ev observer hooks for before save access and after save.
  Model.evObserve('before save', dataPersonalizationBeforeSave);
  Model.evObserve('access', dataPersonalizationAccess);
  Model.evObserve('after accesss', dataPersonalizationAfterAccess);
};

/**
 * This function is used to convert scope to _scope.
 *
 * @param {object}scope - scope property of a record.
 * @returns {array} - array of strings of the form "key.value"
 * @function
 */
var convertToKeyValueString = function convertToKeyValueString(scope) {
  var _scope = [];

  // Loop through each key value pair and form an array of strings
  // each string in array will be of form "key.value"
  Object.keys(scope).forEach(function convertToKeyValueStringForEach(key, index) {
    var value = scope[key];
    var keyValuestring;
    value = value ? value : '';
    // If array then the string will only have the "key" else it will have "key.value"
    if (Array.isArray(value)) {
      value.forEach(function forEachArrayValue(item) {
        keyValuestring = key + ':' + item;
        _scope.push(keyValuestring);
      });
    } else {
      keyValuestring = key + ':' + value.toString();
      _scope.push(keyValuestring);
    }
  });
  return _scope;
};

/**
 * This function is used to convert any input(array or object) to lowercase
 * In case of arrays its elements will be converted to lowercase.
 * In case of object its values will be converted to lowercase.
 *
 * @param {array|object} input - any array or object
 * @returns {array|object} - array or object according to input.
 * @function
 */
var convertToLowerCase = function convertToLowerCase(input) {
  // Check for type of input and branch accordingly.
  if (Array.isArray(input)) {
    var resArr = [];
    input.forEach(function convertToLowerCaseArray(value) {
      resArr.push(value.toLowerCase());
    });
    return resArr;
  } else if (input && typeof input === 'object') {
    var resObj = {};
    Object.keys(input).forEach(function convertToLowerCaseObject(key) {
      var value = input[key];
      if (typeof value === 'string') {
        resObj[key] = value.toLowerCase();
      } else if (typeof value === 'object') {
        resObj[key] = convertToLowerCase(value);
      } else {
        resObj[key] = value;
      }
    });
    return resObj;
  }
};

/**
 * This function is used to filter autoscope values from contextContributor.
 *
 * @param {object}ctx - execution context scope
 * @param {array}autoscope - autoscope
 * @returns {Object} - returns new execution scope.
 * @function
 */
var filterAutoscopeFromCtx = function filterAutoscopeFromCtx(ctx, autoscope) {
  var newCtx = {};
  _.forEach(ctx, function filterAutoscopeFromCtxForEach(value, key) {
    if (!(_.contains(autoscope, key))) {
      newCtx[key] = value;
    }
  });
  return newCtx;
};

/**
 * Observer function DataBeforeSave.
 * This function is invoked upon save of data in any model.
 * It reads autoscope array from model definition settings
 * and reads the scope from the ctx.instance and modifies the scope
 * by adding autoscope values in the scope variable before saving.
 *
 *
 * @param {object} ctx - The context object containing the model instance.
 * @param {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
 * @returns {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
 * @function
 */
function dataPersonalizationBeforeSave(ctx, next) {
  var modelSettings = ctx.Model.definition.settings;

  // Checking for DataPersonalizationMixin is applied or not.
  // If mixin is applied to current model then only data wil be scoped.
  if (modelSettings.mixins.DataPersonalizationMixin === false) {
    return next();
  }

  var callContext = ctx.options;

  // Clone callContext.ctx so the any changes locally made will not affect callContext.ctx.
  var context = Object.assign({}, callContext.ctx);

  // Convert the callcontext to lowercase.
  context = convertToLowerCase(context);

  // Reading the autoscope values from the model definition settings.
  var autoscope = modelSettings.autoscope;

  var data = ctx.instance || ctx.data;
  // log.debug('Raw data with manual scope - ' , JSON.stringify(data));
  var scope = (data.scope && data.scope.__data) || data.scope || {};

  // Converting scope to lowercase
  scope = convertToLowerCase(scope);
  var _autoScope = {};

  var currentAutoScope;
  if (!ctx.IsNewInstance && ctx.currentInstance) {
    currentAutoScope = ctx.currentInstance._autoScope;
  }

  // get default autoscope value from config files
  var defaultValue = ctx.Model.app.get('defaultAutoScope') || '';

  if (callContext.ignoreAutoScope) {
    if (!callContext.useScopeAsIs) {
      autoscope.forEach(function dataBeforeSaveForEach(key) {
        _autoScope[key] = defaultValue;
      });
    } else {
      return next();
    }
  } else {
    // Loop through each value in autoscope.
    autoscope.forEach(function dataBeforeSaveForEach(key) {
      if (currentAutoScope) {
        var f1 = context[key] || '';
        var f2 = currentAutoScope[key] || '';
        if (f1 !== f2) {
          var error = new Error('could not find a model with id ' + ctx.currentInstance.id);
          error.statusCode = 404;
          error.code = 'MODEL_NOT_FOUND';
          error.retriable = false;
          return next(error);
        }
      }

      if (scope[key]) {
        // If autoscoped values are passed in scope then data would not be saved.
        var err = new Error();
        err.name = 'Data Personalization error';
        err.message = 'Cannot pass autoscoped values in payload';
        err.code = 'DATA_PERSONALIZATION_ERROR_028';
        err.type = 'InvalidData';
        err.retriable = false;
        return next(err);
      }
      if (context[key]) {
        // adding autoscope values to scope.
        // scope[key] = context[key];
        _autoScope[key] = context[key];
      } else {
        // throws an Error when model is autoscope on some contributor
        // but contributor values are not provided.
        var err1 = new Error();
        err1.name = 'Data Personalization error';
        err1.message = 'insufficient data! Autoscoped values not found for the model' + ctx.Model.modelName + ' key ' + key;
        err1.code = 'DATA_PERSONALIZATION_ERROR_029';
        err1.type = 'AutoScopeValuesNotFound';
        err1.retriable = false;
        return next(err1);
      }
    });
  }

  // Adding _autoscope and _scope to object formed.
  data._autoScope = _autoScope;
  data._scope = convertToKeyValueString(scope).concat(convertToKeyValueString(_autoScope));

  ctx.hookState.scopeVars = filterAutoscopeFromCtx(callContext.ctx, autoscope);
  // log.debug(ctx.options, 'Data with scope and _scope ' , JSON.stringify(data));
  next();
}

/**
 * Observer function dataAccess.
 * This function is invoked upon access of data in any model.
 * It reads the autoscope and manual scopes from various contributors and
 * forms query based on the values.
 * If any additional parameters like ignore list or defaults are provided then
 * they will be filtered from the list and query is formed accordingly.
 *
 * @param {object} ctx - The context object containing the model instance.
 * @param {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
 * @returns {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
 * @function
 */
function dataPersonalizationAccess(ctx, next) {
  var modelSettings = ctx.Model.definition.settings;

  // Checking for DataPersonalizationMixin is applied or not.
  // If mixin is applied to current model then only data wil be scoped.
  if (modelSettings.mixins.DataPersonalizationMixin === false) {
    return next();
  }

  if (ctx.options && ctx.options.fetchAllScopes) {
    return next();
  }

  var callContext = ctx.options;

  // Reading the autoscope values from the model definition settings.
  var autoscope = modelSettings.autoscope;

  // Clone callContext.ctxso the any changes locally made will not affect callContext.ctx.
  var context = Object.assign({}, callContext.ctx);

  // Convert contextContributors to lowercase.
  context = convertToLowerCase(context);

  // Filter out autoscope from contextContributors.
  var scopeVars = filterAutoscopeFromCtx(context, autoscope);

  // adding manual scope to ctx for use in cache
  ctx.hookState.scopeVars = Object.assign({}, scopeVars);

  var andParams = [];

  // Getting the ignore list from the callContext
  var ignoreList = callContext.ignoreContextList || [];

  // Convert the ignore list to lowercase so that it will be easy to compare.
  ignoreList = convertToLowerCase(ignoreList);

  // This is a temporary solution to data load at boot time for no tenantId case.
  // Get new list of autoscope by removing ignoreList values from autoscope.
  // var autoscope = _.difference(autoscope, ignoreList);

  // get default autoscope value from config files
  var defaultValue = ctx.Model.app.get('defaultAutoScope') || '';

  if (autoscope.length) {
    autoscope.forEach(function dataAccessForEach(key) {
      if (!context[key] && !callContext.ignoreAutoScope) {
        var err = new Error();
        err.name = 'Data Personalization error';
        err.message = 'insufficient data! Autoscoped values not found for the model' + ctx.Model.modelName + ' key ' + key;
        err.code = 'DATA_PERSONALIZATION_ERROR_029';
        err.type = 'AutoScopeValuesNotFound';
        err.retriable = false;
        return next(err);
      }
    });
  }

  // pushing the query parameters into ignorelist.so tht manually passed query will not conflict with context inferred
  if (ctx.query && ctx.query.where) {
    var arr = [];
    var igList = [];
    getKeys(ctx.query.where, arr, igList);
    arr = _.unique(arr);
    ignoreList = ignoreList.concat(arr);
    callContext['whereKeys' + ctx.Model.modelName] = _.unique(igList);
  }

  // This forms the second part of the 'and' condition in the query.
  // Check for the callContext.defaults
  // If callContext.defaults is false then query is formwed with manual scope parameters.
  // If callContext.defaults is true then query will be not be formed with manual scope parameters.
  var finalQuery = {};
  if (ctx.Model.dataSource.connector.name === 'mongodb' || ctx.Model.dataSource.connector.name === 'postgresql') {
    var exeContextArray = convertToKeyValueString(scopeVars);
    var autoscopeArray = [];
    autoscope.forEach(function addDefaultEntriesOfAutoscope(element) {
      if (context && Array.isArray(context[element])) {
        var valueArray = [];
        context[element].forEach(function forEachAutoScopeValue(item) {
          valueArray.push(element + ':' + item);
        });
        autoscopeArray.concat(valueArray);
        exeContextArray.push(element + ':' + defaultValue);
        exeContextArray.concat(valueArray);
      } else {
        exeContextArray.push(element + ':' + defaultValue);
        if (context) {
          exeContextArray.push(element + ':' + context[element]);
          autoscopeArray.push(element + ':' + context[element]);
        }
      }
    });
    ctx.hookState.autoscopeArray = autoscopeArray;
    exeContextArray = exeContextArray.concat(callContext['whereKeys' + ctx.Model.modelName]);
    if (ctx.Model.dataSource.connector.name === 'mongodb') {
      finalQuery = {
        'where': { '_scope': { 'not': { '$elemMatch': { '$nin': exeContextArray } } } }
      };
    } else {
      finalQuery = {
        'where': { '_scope': { 'contains': exeContextArray } }
      };
    }
  } else {
    if (autoscope.length) {
      var autoAnd = [];

      // This forms the first part of the 'and' condition in the query.
      // loops through each value in autoscope and forms an 'and' condition between each value.
      autoscope.forEach(function dataAccessForEach(key) {
        var asvals = {};
        if (callContext.ignoreAutoScope) {
          // When ignoreAutoScope is true then only query with autoscope deafult
          // is formed and only default records are sent.
          asvals._scope = {
            'inq': [key + ':' + defaultValue]
          };
        } else {
          var value = context[key];
          if (Array.isArray(value)) {
            var valueArray = [];
            value.forEach(function forEachAutoScopeValue(item) {
              valueArray.push(key + ':' + item);
            });
            valueArray.push(key + ':' + defaultValue);
            asvals._scope = {
              'inq': valueArray
            };
          } else {
            asvals._scope = {
              'inq': [key + ':' + value, key + ':' + defaultValue]
            };
          }
        }
        autoAnd.push(asvals);
      });

      // Push and condition formed with autoscopes into andParams array.
      andParams.push({
        'and': autoAnd
      });
    }


    if (scopeVars && !(_.isEmpty(scopeVars))) {
      var manualAnd = [];
      // loops through each value in scopeVars and forms an 'and' condition between each value in scopeVars.
      Object.keys(scopeVars).forEach(function dataAccessScopeVarsForEach(key) {
        var msVals = {};
        var msRegExpVal = {};
        var msOrParams = [];
        var value = scopeVars[key];
        // Filter for removing ignorelist values from scopeVars values.
        if (!(_.contains(ignoreList, key))) {
          var regEx;
          if (Array.isArray(value)) {
            if (value.length) {
              var valueArray = [];
              value.forEach(function forEachAutoScopeValue(item) {
                valueArray.push(key + ':' + item);
              });
              msVals._scope = {
                'inq': valueArray
              };
              regEx = new RegExp('^' + key + ':');
              msRegExpVal._scope = {
                'nin': [regEx]
              };
              msOrParams.push(msVals);
              msOrParams.push(msRegExpVal);
              manualAnd.push({
                'or': msOrParams
              });
            }
          } else {
            msVals._scope = {
              'inq': [key + ':' + value]
            };
            regEx = new RegExp('^' + key + ':');
            msRegExpVal._scope = {
              'nin': [regEx]
            };
            msOrParams.push(msVals);
            msOrParams.push(msRegExpVal);
            manualAnd.push({
              'or': msOrParams
            });
          }
        }
      });

      andParams.push({
        'and': manualAnd
      });
    }
    finalQuery = {
      'where': {
        'and': andParams
      }
    };
  }

  // Merging the query formed with the existing query if any.
  mergeQuery(ctx.query, finalQuery);
  log.debug(ctx.options, 'Final formed query', JSON.stringify(ctx.query));
  next();
}

/**
 * Observer function to handle score calculation and orderBy .
 * This function is invoked after access of data in any model.
 * It reads the scopes and their corresponding weights from various
 * contextContributors and and calculates score based on the sum of the
 * weights and then orders it in descending order based on score calculated.
 *
 * @param {object} ctx - The context object containing the model instance.
 * @param {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
 * @returns {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
 * @function
 */
function dataPersonalizationAfterAccess(ctx, next) {
  var modelSettings = ctx.Model.definition.settings;

  // Checking for DataPersonalizationMixin is applied or not.
  // If mixin is applied to current model then only data will be scoped.
  if (modelSettings.mixins.DataPersonalizationMixin === false) {
    return next();
  }

  if (ctx.options && ctx.options.fetchAllScopes) {
    return next();
  }

  // Reads the data which we get based the query fromed in dataAccess function.
  var result = ctx.accdata;

  if (result && result.length) {
    // Get the loopback current context and reads the callContext from the context.
    var callContext = {};
    var callCtx = ctx.options;

    // Clone callContext.ctx so the any changes locally made will not affect callContext.ctx.
    callContext.ctx = Object.assign({}, callCtx.ctx);

    // Convert the callcontext.ctx to lowercase.
    callContext.ctx = convertToLowerCase(callContext.ctx);

    // Clone callContext.ctxWeights so the any changes locally made will not affect callContext.ctx.
    callContext.ctxWeights = Object.assign({}, callCtx.ctxWeights);

    // Convert the callcontext.ctxWeights to lowercase.
    callContext.ctxWeights = convertToLowerCase(callContext.ctxWeights);

    // Reading the autoscope values from the model definition settings.
    var autoscope = modelSettings.autoscope;

    // Reading the autoscope values from the model definition settings.
    // var scoreScheme = modelSettings.scoreScheme ? modelSettings.scoreScheme : 'sum';

    var resultData = [];
    var weights = {};


    // get default autoscope value from config files
    var defaultValue = ctx.Model.app.get('defaultAutoScope') || '';

    if (callContext.ctx) {
      // Loops through each value in callContext.ctx to calculate scope and
      // weights ignoring for the values in ignore list.
      if (callContext.ctxWeights) {
        Object.keys(callContext.ctx).forEach(function dataAfterAccessCtxForEach(key) {
          var value = callContext.ctx[key];
          if (Array.isArray(value)) {
            value.forEach(function eachElementWeightCalc(item, index) {
              weights[key + ':' + item] = (callContext.ctxWeights[key] && callContext.ctxWeights[key][index]) || 1;
            });
          } else {
            weights[key + ':' + value] = callContext.ctxWeights[key] || 1;
          }
        });
      }

      autoscope.forEach(function dataAfterAccessCtxForEach(key) {
        var weight = (callContext.ctxWeights && callContext.ctxWeights[key]) ? callContext.ctxWeights[key] - 1 : -1;
        weights[key + ':' + defaultValue] = weight.toString();
      });
    }

    if (ctx.Model.dataSource.connector.name === 'mongodb' || ctx.Model.dataSource.connector.name === 'postgresql') {
      resultData = calculateScoreMongo(result, weights);
    } else {
      var scope = {};
      // Get the manually applied filter keys
      var whereKeys = JSON.parse(JSON.stringify(callCtx['whereKeys' + ctx.Model.modelName] || []));

      // Reads the ignore list from the callContext.
      var ignoreList = JSON.parse(JSON.stringify(callCtx.ignoreContextList || []));
      // Converts ignore list to lowercase
      ignoreList = convertToLowerCase(ignoreList);

      Object.keys(callContext.ctx).forEach(function dataAfterAccessCtxForEach(key) {
        var value = callContext.ctx[key];
        if (!(_.contains(ignoreList, key))) {
          scope[key] = value;
        }
      });

      // Convert scope obj to array of strings.
      scope = convertToKeyValueString(scope);

      // Adding all autoscope.default values to scope.
      autoscope.forEach(function addAutoScopeDefaultToScope(element) {
        scope.push(element + ':' + defaultValue);
      });
      scope = scope.concat(whereKeys);

      // Loops through each record in result and calculate score based on subset
      result.forEach(function dataAfterAccessResultForEach(obj) {
        var score = 0;
        var weight = 0;
        // read _scope from record
        var _scope = obj._scope || [];
        if (!(_.difference(_scope, scope).length)) {
          // Find out the intersection part of _scope and our own calculated scope.
          //  var intersection = _.intersection(_scope, scope);
          _scope.forEach(function dataAfterAccessIntersectionForEach(element) {
            score = Math.max(score, parseInt(weights[element] || '1', 10));
            weight = weight + parseInt(weights[element] || '1', 10);
          });
          obj.score = score;
          obj.weight = weight;
          resultData.push(obj);
        }
      });
    }

    // Sort in descending order based on score .
    // resultData =_.orderBy(resultData, ['score', 'weight'], ['desc', 'desc']);  //Lodash v4.6.1
    // Lodash v3.10.1
    resultData = _.sortByOrder(resultData, ['score', 'weight'], ['desc', 'desc']);
    resultData.forEach(function resultDataForEach(obj) {
      delete obj.score;
      delete obj.weight;
    });
    ctx.accdata = calculateUnique(ctx.Model.definition.properties, resultData);
  }
  next();
}

/**
 * Function to get keys and keyValue pairs from the query.
 * @param {object} data - query from which we need to gets keys.
 * @param {array} arr - Array to hold keys context keys from query.
 * @param {array} igList - Array to hold context keysValue pair formatted keys from the query.
 * @function
 */
var getKeys = function dataAccessGetKeys(data, arr, igList) {
  _.forEach(data, function dataAccessGetKeysForEach(value, key) {
    if ((typeof key === 'string') && (key !== 'and' || key !== 'or')) {
      if (key.indexOf('.') > -1) {
        Array.prototype.splice.apply(arr, [0, 0].concat(key.split('.')));
        if (typeof value !== 'object') {
          Array.prototype.splice.apply(igList, [0, 0].concat(key.split('.')[key.split('.').length - 1] + ':' + value));
        }
      } else {
        arr.push(key);
        if (typeof value !== 'object') {
          igList.push(key + ':' + value);
        }
      }
    }
    if (typeof value === 'object') {
      getKeys(value, arr, igList);
    }
  });
};

/**
 * Function to calculate score and weightage for the result and sort it in
 * descending order based on score and weightages.
 * @param {array} result - actual unsorted result.
 * @param {object} weights - 'Key:value' keys with respective weightages .
 * @returns {array} result - The final sorted resultant array.
 * @function
 */
var calculateScoreMongo = function calcScoreMongo(result, weights) {
  // Loops through each record in result and calculate score based on subset
  result.forEach(function dataAfterAccessResultForEach(obj) {
    var score = 0;
    var weight = 0;
    // read _scope from record
    var _scope = obj._scope || [];

    // Find out the intersection part of _scope and our own calculated scope.
    //  var intersection = _.intersection(_scope, scope);
    _scope.forEach(function dataAfterAccessIntersectionForEach(element) {
      score = Math.max(score, parseInt(weights[element] || '1', 10));
      weight = weight + parseInt(weights[element] || '1', 10);
    });
    obj.score = score;
    obj.weight = weight;
  });
  return result;
};

/**
 * Function to get unique properties from the definition and filter out
 * the result based on the unique properties defined on the model.
 * @param {object} modelProp - The current model properties.
 * @param {array} resultData - actual sorted result data.
 * @returns {array} resultData - The final filtered resultant array.
 * @function
 */
var calculateUnique = function calcUniqFn(modelProp, resultData) {
  var uniq = [];

  // Reads each property for unique and populates uniq array.
  Object.keys(modelProp).forEach(function dataAfterAccessCtxPropForEach(key) {
    var prop = modelProp[key];
    if (prop.unique) {
      if (typeof prop.unique === 'boolean') {
        uniq.push(key);
      } else if (typeof prop.unique === 'object') {
        prop.unique.scopedTo ? uniq = uniq.concat(prop.unique.scopedTo) : null;
        uniq.push(key);
      }
    }
  });

  // Filter out the redundent records from result by applying unique validation.
  if (uniq.length > 0) {
    resultData = _.uniq(resultData, function dataAfterAccessResultUniqCb(value) {
      return uniq.map(function dataAfterAccessResultUniqForEach(u) {
        return value[u];
      }).join('-');
    });
    // resultData = _.intersection.apply(this, _.chain(uniq).map(function (v) { return _.uniq(resultData, v) }).value());
  }

  return resultData;
};
