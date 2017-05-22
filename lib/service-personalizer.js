/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * Service personalization module. Optimizes and applies one personalization function.
 *
 * @module EV Service Personalizer
 * @author sachin_mane, gourav_gupta, pradeep_tippa
 */

var loopback = require('loopback');
var _ = require('lodash');
var request = require('request');
var async = require('async');
var exprLang = require('./expression-language/expression-language.js');
var mergeQuery = require('loopback-datasource-juggler/lib/utils').mergeQuery;
var logger = require('./logger');
var log = logger('service-personalizer');

/**
 *
 * This function returns personalization rule for modelName if exists.
 *
 * @param {String} modelName - Model Name
 * @param {object} ctx - context
 * @param {callback} callback - callback function
 * @function
 * @name getPersonalizationRuleForModel
 */
var getPersonalizationRuleForModel = function getPersonalizationRuleForModelFn(modelName, ctx, callback) {
  log.debug(ctx.options, 'getPersonalizationRuleForModel called for model -', modelName);

  var PersonalizationRule = loopback.findModel('PersonalizationRule');

  var findByModelNameQuery = {
    'where': {
      'modelName': modelName
    }
  };

  PersonalizationRule.find(findByModelNameQuery, ctx.options, function getPersonalizationRuleForModelFindCb(err, result) {
    log.debug(ctx.options, 'Query result = ', result);
    if (err) {
      // TODO: Error getting personalization rule.. what should be done? Continue or stop?
      log.debug(ctx.options, 'Error getting personalization rule for model [', modelName, ']. skipping personalization');
      return callback(null);
    }

    if (result && result.length !== 0 && !result[0].disableRule) {
      log.debug(ctx.options, 'Returning personzalition rule');
      return callback(result[0]);
    }
    log.debug(ctx.options, 'Personalization rules not defined for model [', modelName, ']. skipping personalization');
    return callback(null);
  });
};

/**
 *
 * This function add functions to an array postProcessingFunctions which will execute to
 * apply personalization rules after getting result.
 *
 * @param {Object} ctx - loopback context
 * @param {Object} p13nRule - Personalization Rule
 * @param {callback} callback - callback function
 * @function
 * @name applyPersonalizationRule
 */

var applyPersonalizationRule = function applyPersonalizationRuleFn(ctx, p13nRule, callback) {
  var arr = [];

  log.debug(ctx.options, 'applying Personalizing ctx with function - ', JSON.stringify(p13nRule));

  var instructions = Object.keys(p13nRule);

  // TODO:Check if all instructions can be applied in parallel in asynch way.
  // instructions.forEach(function (instruction) {

  for (var i in instructions) {
    if (instructions.hasOwnProperty(i)) {
      var instruction = instructions[i];
      switch (instruction) {
        case 'lbFilter':
          arr.push(async.apply(addLbFilter, ctx, p13nRule[instruction]));
          break;
        case 'filter':
          arr.push(async.apply(addFilter, ctx, p13nRule[instruction]));
          break;
        case 'fieldReplace':
          arr.push(async.apply(addFieldReplace, ctx, p13nRule[instruction]));
          break;
        case 'fieldValueReplace':
          arr.push(async.apply(addFieldValueReplace, ctx, p13nRule[instruction]));
          break;
        case 'sort':
          arr.push(async.apply(addSort, ctx, p13nRule[instruction]));
          break;
        case 'union':
          // unionResults(ctx, p13nRule[instruction]);
          break;
        case 'customFunction':
          arr.push(async.apply(addCustomFunction, ctx, p13nRule[instruction]));
          break;
        case 'httpPostFunction':
          arr.push(async.apply(addHttpPostFunction, ctx, p13nRule[instruction]));
          break;
        case 'mask':
          arr.push(async.apply(maskFields, ctx, p13nRule[instruction]));
          break;
        default:

      }
    }
  }

  log.debug(ctx.options, 'returning updated context - ', ctx);
  async.parallel(arr, function applyPersonalizationRuleAsyncParallelFn(err, results) {
    if (err) {
      callback(err);
    }
    callback();
  });
};

/**
 *
 * This function add functions to an array preProcessingFunctions which will execute to
 * reversly apply personalization rules before posting data on model.
 *
 * @param {Object} ctx - loopback context
 * @param {Object} p13nRule - Personalization Rule
 * @param {callback} callback - callback function
 * @function
 * @name applyReversePersonalizationRule
 */
var applyReversePersonalizationRule = function applyReversePersonalizationRuleFn(ctx, p13nRule, callback) {
  log.debug(ctx.options, 'Reverse Personalizing ctx with function - ', JSON.stringify(p13nRule));

  var instructions = Object.keys(p13nRule);

  // TODO:Check if all instructions can be applied in parallel in asynch way.
  // instructions.forEach(function (instruction) {

  for (var i in instructions) {
    if (instructions.hasOwnProperty(i)) {
      var instruction = instructions[i];
      switch (instruction) {
        case 'fieldReplace':
          addReverseFieldReplace(ctx, p13nRule[instruction]);
          break;
        case 'fieldValueReplace':
          addReverseFieldValueReplace(ctx, p13nRule[instruction]);
          break;
        default:
      }
    }
  }
  // log.debug('returning updated context - ' , JSON.stringify(ctx));
  callback();
};

/**
 * Function to add 'where' clause in the datasource filter query.
 */

function addWhereClause(ctx, instruction, cb) {
  if (typeof instruction === 'string') {
    exprLang(instruction).then(function addWhereClauseInstrResultCb(result) {
      addWheretoCtx(ctx, result.value.where, cb);
    });
  } else {
    addWheretoCtx(ctx, instruction, cb);
  }
}

function addWheretoCtx(ctx, where, cb) {
  var query = ctx.query;
  if (query) {
    if (typeof query.where === 'undefined') {
      query = {
        'where': where
      };
    } else {
      var newQuery = {
        and: [where, ctx.query.where]
      };

      log.debug(ctx.options, 'newQuery =', JSON.stringify(newQuery, null, 2));

      //        var filterKeys = Object.keys(instruction);
      //        filterKeys.forEach(function (filterKey) {
      //            query.where[filterKey] = instruction[filterKey];
      //        });

      query.where = newQuery;
    }
    ctx.query.where = (query && query.where) || {};
  }
  cb();
}

/**
 * Function to add filter clause in query.
 */

function addLbFilterClause(ctx, instruction, cb) {
  if (typeof instruction === 'string') {
    exprLang(instruction).then(function addLbFilterInstrResultCb(result) {
      addLbFiltertoCtx(ctx, result.value, cb);
    });
  } else {
    addLbFiltertoCtx(ctx, instruction, cb);
  }
}

function addLbFiltertoCtx(ctx, filter, cb) {
  var query = ctx.query;
  if (query) {
    mergeQuery(ctx.query, filter);
  }
  cb();
}

/*
 * Object wrapper to add a processing function in the context.
 * Wraps the instrunctions and reference to the actual function to be called.
 * Processing functions are invoked before posting data or after data is retried by the API
 *
 */

function ProcessingFunction(instruction, fn) {
  this.instruction = instruction;
  this.fn = fn;

  this.execute = function processingFunctionExecuteFn(ctx) {
    // console.log('this.instruction = ' + JSON.stringify(this.instruction));
    // console.log('this.fn = ' + this.fn);

    this.fn(ctx, instruction);
  };
}

/**
 * Replacing field name wrt personalization rule.
 * To be used if field replacement is not supported by the datasource.
 * It replace field name according to personalization rule.
 *
 * @param {Object} ctx - loopback context
 * @param {Object} replacements - field replacement values
 * @function
 * @name fieldReplacementFn
 */

function fieldReplacementFn(ctx, replacements) {
  var input;
  var result = ctx.result || ctx.accdata;

  if (typeof result !== 'undefined' && !_.isEmpty(result)) {
    input = ctx.result || ctx.accdata;
    log.debug(ctx.options, 'fieldValueReplacementFn called. Resultset = ',
      JSON.stringify(input) + ' Replacements = ' + JSON.stringify(replacements));
  } else if (typeof ctx.instance !== 'undefined' && !_.isEmpty(ctx.instance)) {
    input = ctx.instance;
    log.debug(ctx.options, 'reverseFieldValueReplacementFn called. Input = ',
      JSON.stringify(input) + ' Replacements = ' + JSON.stringify(replacements));
  } else {
    return;
  }

  // replace field function to replace record wrt replacement object and value
  function replaceField(record, replacement, value) {
    var pos = replacement.indexOf('\uFF0E');
    var key;
    var elsePart;
    if (pos !== null && pos !== 'undefined' && pos !== -1) {
      key = replacement.substr(0, pos);
      elsePart = replacement.substr(pos + 1);
    } else {
      key = replacement;
    }

    if (record[key] !== 'undefined' && typeof record[key] === 'object') {
      replaceField(record[key], elsePart, value);
    } else if (record[key] !== 'undefined' && typeof record[key] !== 'object') {
      if (record[key]) {
        if (typeof record.__data !== 'undefined') {
          record.__data[value] = record[key];
          delete record.__data[key];
        } else {
          record[value] = record[key];
          delete record[key];
        }
      }
    }
  }

  function replaceRecord(record, replacements) {
    var keys = Object.keys(JSON.parse(JSON.stringify(replacements)));
    for (var attr in keys) {
      if (keys.hasOwnProperty(attr)) {
        replaceField(record, keys[attr], replacements[keys[attr]]);
      }
    }
    return record;
  }

  /**
   * if input or result is array then iterates the process
   * otherwise once calls update record function.
   */
  if (Array.isArray(input)) {
    var updatedResult = [];
    for (var i in input) {
      if (input.hasOwnProperty(i)) {
        var record = input[i];
        updatedResult.push(replaceRecord(record, replacements));
      }
    }
    input = updatedResult;
  } else {
    var updatedRecord = replaceRecord(input, replacements);
    input = updatedRecord;
  }
}

/**
 * Reverting field name wrt personalization rule.
 * To be used if reverse field replacement is not supported by the datasource.
 * It revert field name according to personalization rule.
 *
 * @param {Object} ctx - loopback context
 * @param {Object} rule - field replacement rule
 * @function
 * @name reverseFieldReplacementFn
 */

function reverseFieldReplacementFn(ctx, rule) {
  // var input = ctx.args.data;

  if (rule !== null && typeof rule !== 'undefined') {
    var revInputJson = {};

    for (var key in rule) {
      if (rule.hasOwnProperty(key)) {
        var pos = key.lastIndexOf('\uFF0E');
        if (pos !== -1) {
          var replaceAttr = key.substr(pos + 1);
          var elsePart = key.substr(0, pos + 1);
          revInputJson[elsePart + rule[key]] = replaceAttr;
        } else {
          revInputJson[rule[key]] = key;
        }
      }
    }

    fieldReplacementFn(ctx, revInputJson);
    /* for (key in revInputJson) {
  if (input.hasOwnProperty(key)) {
    input[revInputJson[key]] = input[key];
    delete input[key];
  }
}	*/
  }
}

/**
 * Field value replacement function. To be used when datasource does not support field value replacements.
 * It simply iterates over the resultset and carries our field value replacements.
 *
 * @param {Object} ctx - loopback context
 * @param {Object} replacements - field value replacement rule
 * @function
 * @name fieldValueReplacementFn
 */

function fieldValueReplacementFn(ctx, replacements) {
  var input;

  var result = ctx.result || ctx.accdata;

  if (typeof result !== 'undefined' && !_.isEmpty(result)) {
    input = ctx.result || ctx.accdata;
    log.debug(ctx.options, 'fieldValueReplacementFn called. Resultset = ',
      JSON.stringify(input) + ' Replacements = ' + JSON.stringify(replacements));
  } else if (typeof ctx.instance !== 'undefined' && !_.isEmpty(ctx.instance)) {
    input = ctx.instance;
    log.debug(ctx.options, 'reverseFieldValueReplacementFn called. Input = ',
      JSON.stringify(input) + ' Replacements = ' + JSON.stringify(replacements));
  } else {
    return;
  }

  function replaceValue(record, replacement, value) {
    var pos = replacement.indexOf('\uFF0E');
    var key;
    var elsePart;
    if (pos !== null && pos !== 'undefined' && pos !== -1) {
      key = replacement.substr(0, pos);
      elsePart = replacement.substr(pos + 1);
    } else {
      key = replacement;
    }

    if (record[key] !== 'undefined' && typeof record[key] === 'object') {
      replaceValue(record[key], elsePart, value);
    } else if (record[key] !== 'undefined' && typeof record[key] !== 'object') {
      if (value.hasOwnProperty(record[key])) {
        if (typeof record.__data !== 'undefined') {
          record.__data[key] = value[record[key]];
        } else {
          record[key] = value[record[key]];
        }
      }
    }
  }

  function replaceRecord(record, replacements) {
    var keys = Object.keys(JSON.parse(JSON.stringify(replacements)));
    for (var attr in keys) {
      if (keys.hasOwnProperty(attr)) {
        replaceValue(record, keys[attr], replacements[keys[attr]]);
      }
    }
    return record;
  }

  if (Array.isArray(input)) {
    var updatedResult = [];
    for (var i in input) {
      if (input.hasOwnProperty(i)) {
        var record = input[i];
        updatedResult.push(replaceRecord(record, replacements));
      }
    }
    input = updatedResult;
  } else {
    var updatedRecord = replaceRecord(input, replacements);
    input = updatedRecord;
  }
}

/**
 * Reverse Field value replacement function. To be used for reverting field value replacements.
 * It simply iterates over the posted data and reverts field value replacements.
 *
 * @param {Object} ctx - loopback context
 * @param {Object} rule - field value replacement rule
 * @function
 * @name reverseFieldValueReplacementFn
 */

function reverseFieldValueReplacementFn(ctx, rule) {
  // var input = ctx.args.data;

  if (rule !== null && typeof rule !== 'undefined') {
    var revInputJson = {};

    for (var field in rule) {
      if (rule.hasOwnProperty(field)) {
        var temp = {};
        var rf = rule[field];
        for (var key in rf) {
          if (rf.hasOwnProperty(key)) {
            temp[rf[key]] = key;
          }
        }

        revInputJson[field] = temp;
      }
    }

    /* for (var key in revInputJson) {
if (input.hasOwnProperty(key)) {
  if(revInputJson[key].hasOwnProperty(input[key])){
    input[key]=revInputJson[key][input[key]];
  }
}
}*/
    fieldValueReplacementFn(ctx, revInputJson);
  }
}

function executeCustomFunctionFn(ctx, customFunction) {
  // console.log('---------- executeCustomFunctionFn -------- customFunction = ' +
  // JSON.stringify(customFunction, null, 2));

  // TODO: Security check
  // var custFn = new Function('ctx', customFunction);
  var custFn = function customFnn(ctx, customFunction) {
    customFunction(ctx);
  };

  log.debug(ctx.options, 'function - ', customFunction);
  custFn(ctx);
}

function invokeHttpUrlFn(ctx, data) {
  log.debug(ctx.options, '-------- invokeHttpUrlFn. data = ', JSON.stringify(data));
  var urlStr = data.url;

  var requestData = {
    uri: urlStr,
    method: 'POST',
    form: ctx.result
  };

  request(requestData, function invokeHttpUrlRequestDataCb(err, response, body) {
    if (err) {
      log.error(ctx.options, 'function - ', err);
    }
    // console.log('err = ' + err);
    // console.log('response = ', response);
    // console.log('body = ' + body);
  });
}

/**
 * Processes a 'filter' instruction. This method checks if underlying datasource to which the model is attached to
 * supports query based filtering. If yes, it adds a 'where' clause in the query. Otherwise creates a post processing
 * function which performs filtering on the resultset retrieved.
 * @param  {object} ctx - context.
 * @param  {object} instruction - instructions.
 * @param  {function} cb - callback function.
 */
function addFilter(ctx, instruction, cb) {
  // TODO: Check the datasource to which this model is attached.
  // If the datasource is capable of doing filter queries add a where clause.

  var dsSupportFilter = true;

  if (dsSupportFilter) {
    addWhereClause(ctx, instruction, cb);
  }
  // else {}
}

// Processes a filter instruction. filter instruction schema is same like loopback filter schema.
function addLbFilter(ctx, instruction, cb) {
  addLbFilterClause(ctx, instruction, cb);
}

/**
 * Processes a 'fieldValueReplace' instruction.
 * This method checks if underlying datasource to which the model is attached
 * to supports 'field value' replacements.
 * If yes, it delegates it to datasource by modifying the query.
 * Otherwise creates a post processing function which performs field
 * value replacements by iterating the results retrieved.
 */

function addFieldValueReplace(ctx, instruction, cb) {
  var dsSupportFieldValueReplace = false;

  // Datasource supports field value replacement in the query.
  // TODO: Query manipulation
  if (!dsSupportFieldValueReplace) {
    // Datasource does not support field value replacement. Add it as a post processing function
    addPostProcessingFunction(ctx, 'fieldValueReplace', instruction, fieldValueReplacementFn);
    cb();
  }
}

/**
 * Processes a 'reverseFieldValueReplace' instruction.
 * it creates a pre processing function which reverts field value replacements by iterating the posted data.
 */

function addReverseFieldValueReplace(ctx, instruction) {
  addPreProcessingFunction(ctx, 'reverseFieldValueReplace', instruction, reverseFieldValueReplacementFn);
}

/**
 * Processes a 'fieldReplace' instruction. This method checks if underlying datasource to which the model is attached
 * to supports 'field name' replacements. If yes, it delegates it to datasource by modifying the query.
 * Otherwise creates a post processing function which performs field
 * name replacements by iterating the results retrieved.
 */

function addFieldReplace(ctx, instruction, cb) {
  var dsSupportFieldReplace = false;

  // Datasource supports field name replace in the query.
  // TODO: Query manipulation
  if (!dsSupportFieldReplace) {
    // Datasource does not support field name replacement. Add it as a post processing function
    addPostProcessingFunction(ctx, 'fieldReplace', instruction, fieldReplacementFn);
    cb();
  }
}

// Function to add Sort (Order By) to the query.
function addSort(ctx, instruction, cb) {
  // { order: 'propertyName <ASC|DESC>' }                                    -- sort by single field
  // { order: ['propertyName <ASC|DESC>', 'propertyName <ASC|DESC>',...] }   --sort by mulitple fields

  var dsSupportSort = true;
  if (dsSupportSort) {
    var query = ctx.query;
    if (query) {
      if (typeof query.order === 'string') {
        query.order = [query.order];
      }

      var tempKeys = [];

      if (query.order && query.order.length >= 1) {
        query.order.forEach(function addSortQueryOrderForEachFn(item) {
          tempKeys.push(item.split(' ')[0]);
        });
      }

      // create the order expression based on the instruction passed
      var orderExp = createOrderExp(instruction, tempKeys);

      if (typeof query.order === 'undefined') {
        query.order = orderExp;
      } else {
        query.order = query.order.concat(orderExp);
      }
      query.order = _.uniq(query.order);
      ctx.query.order = query.order;
      cb();
    } else {
      cb();
    }
  } else {
    addPostProcessingFunction(ctx, 'sortInMemory', instruction, sortInMemory);
    cb();
  }
}

function createOrderExp(instruction, tempKeys) {
  if (!Array.isArray(instruction)) {
    instruction = [instruction];
  }

  var orderExp = [];

  for (var i = 0; i < instruction.length; i++) {
    var obj = instruction[i];
    var key = Object.keys(obj)[0];
    var val = obj[key];
    key = key.indexOf('|') > -1 ? key.replace(/\|/g, '.') : key;

    var index = tempKeys.length >= 1 ? tempKeys.indexOf(key) : -1;

    switch (val.toUpperCase()) {
      case 'ASC':
      case 'ASCENDING':
      case '':
        val = 'ASC';
        break;
      case 'DESC':
      case 'DESCENDING':
      case 'DSC':
        val = 'DESC';
        break;
      default:
        val = null;
    }
    if (val && index === -1) {
      var value = key + ' ' + val;
      orderExp.push(value);
    }
  }

  return orderExp;
}
/* To be used when database doesnt support sort OR sort needs to be done in memory*/
function sortInMemory(ctx, options) {
  var result = ctx.result;
  if (typeof result === 'undefined') {
    return;
  }
  if (!Array.isArray(options)) {
    options = [options];
  }
  var keys = [];
  var values = [];
  for (var index in options) {
    if (options.hasOwnProperty(index)) {
      var key = Object.keys(options[index])[0];
      values.push(options[index][key]);
      key = key.indexOf('|') > -1 ? key.replace(/\|/g, '.') : key;
      keys.push(key);
    }
  }
  var updatedResults;
  if (Array.isArray(result)) {
    // lodash version 3.10.1 uses sortByOrder;version 4.0.0 uses OrderBy
    updatedResults = _.sortByOrder(result, keys, values);

    // updatedResults = _.sortByOrder(result, function (item) {
    //    var arr = [];
    //    for (var index in keys) {
    //        arr.push(item.__data[keys[index]]);
    //    }
    //    return arr;
    //    }
  }
  if (updatedResults) {
    ctx.result = updatedResults;
  }
}

/**
 * Processes a 'reverseFieldReplace' instruction.
 * it creates a pre processing function which reverts field name replacements by iterating the posted data.
 */

function addReverseFieldReplace(ctx, instruction) {
  addPreProcessingFunction(ctx, 'reverseFieldReplace', instruction, reverseFieldReplacementFn);
}

/**
 * Custom function
 */

function addCustomFunction(ctx, instruction, cb) {
  // Datasource does not support field name replacement. Add it as a post processing function
  addPostProcessingFunction(ctx, 'customFunction', instruction, executeCustomFunctionFn);
  cb();
}

// Adds http post processing function.
function addHttpPostFunction(ctx, instruction, cb) {
  // Datasource does not support field name replacement. Add it as a post processing function
  addPostProcessingFunction(ctx, 'httpPostFunction', instruction, invokeHttpUrlFn);
  cb();
}

/**
 * Instantiate a new post processing function and adds to the request context.
 */

function addPostProcessingFunction(ctx, func, instruction, fn) {
  var callContext = ctx.options;

  callContext.postProcessingFns = callContext.postProcessingFns || {};
  callContext.postProcessingFns[ctx.Model.modelName] = callContext.postProcessingFns[ctx.Model.modelName] || [];

  if (func === 'fieldReplace') {
    callContext.postProcessingFns[ctx.Model.modelName].push(new ProcessingFunction(instruction, fn));
  } else {
    callContext.postProcessingFns[ctx.Model.modelName].unshift(new ProcessingFunction(instruction, fn));
  }
  // console.log('callContext so far - ' + JSON.stringify(callContext));
}

/**
 * Instantiate a new pre processing function and adds to the request context.
 */

function addPreProcessingFunction(ctx, func, instruction, fn) {
  var callContext = ctx.options;

  if (typeof callContext.preProcessingFns === 'undefined') {
    callContext.preProcessingFns = [];
  }

  callContext.preProcessingFns = callContext.preProcessingFns || {};
  callContext.preProcessingFns[ctx.Model.modelName] = callContext.preProcessingFns[ctx.Model.modelName] || [];

  if (func === 'reverseFieldReplace') {
    callContext.preProcessingFns[ctx.Model.modelName].unshift(new ProcessingFunction(instruction, fn));
  } else {
    callContext.preProcessingFns[ctx.Model.modelName].push(new ProcessingFunction(instruction, fn));
  }
  // console.log(callContext.preProcessingFns);
  // console.log('callContext so far - ' + JSON.stringify(callContext));
}
/*
     * Function to mask the certain fields from the output field List
     * */
function maskFields(ctx, instruction, cb) {
  var dsSupportMask = true;
  if (dsSupportMask) {
    var query = ctx.query;
    if (!query) {
      return cb();
    }
    var keys = Object.keys(instruction);
    var exp = {};
    if (typeof query.fields === 'undefined') {
      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];
        key = key.indexOf('|') > -1 ? key.replace(/\|/g, '.') : key;
        exp[key] = false;
      }
      query.fields = exp;
    }
    // else {
    //    var fieldList = query.fields;
    //    fieldList = _.filter(fieldList, function (item) {
    //        return keys.indexOf(item) === -1
    //    });
    //    query.fields = fieldList;
    // }
  }
  cb();
}

/*
 * Union Function
// * */
// function unionResults(ctx, instruction){
//    var dsSupport = false;
//    //TO DO: logic where to get the data and union the results
// }
module.exports = {
  getPersonalizationRuleForModel: getPersonalizationRuleForModel,
  applyPersonalizationRule: applyPersonalizationRule,
  applyReversePersonalizationRule: applyReversePersonalizationRule
};
