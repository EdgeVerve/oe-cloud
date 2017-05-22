/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

var mergeQuery = require('loopback-datasource-juggler/lib/utils').mergeQuery;
var toRegExp = require('loopback-datasource-juggler/lib/utils').toRegExp;
var _ = require('lodash');
var uuid = require('node-uuid');
var async = require('async');
var ROOT_PATH = ',root,';
module.exports = function DataHierarchyMixin(Model) {
  Model.defineProperty('_hierarchyScope', {
    type: 'object',
    index: true,
    required: false
  });

  // Making _hierarchyScope as hidden fields.
  if (Model.definition.settings.hidden) {
    Model.definition.settings.hidden = Model.definition.settings.hidden.concat(['_hierarchyScope']);
  } else {
    Model.definition.settings.hidden = ['_hierarchyScope'];
  }
  // Ev observer hooks for before save access and after access.
  Model.evObserve('before save', hierarchyBeforeSave);
  Model.evObserve('access', hierarchyAccess);
  Model.evObserve('after accesss', hierarchyAfterAccess);
};


/**
 * Observer function DataBeforeSave.
 * This function is invoked upon save of data in any model
 * to which this mixin is attached.
 * It reads HierarchyScope array from model definition settings,
 * gets value from context.ctx for each key and sets to data._hierarcyScope.F
 *
 * @param {object} ctx - The context object containing the model instance.
 * @param {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
 * @return {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
 * @function
 */
function hierarchyBeforeSave(ctx, next) {
  var modelSettings = ctx.Model.definition.settings;

  // Checking for DataHierarchyMixin is applied or not.
  if (modelSettings.mixins.DataHierarchyMixin === false) {
    return next();
  }

  // adding hierarchyScope setting.
  if (!modelSettings.hierarchyScope || ctx.options.ignoreHierarchy) {
    return next();
  }

  var callContext = ctx.options;

  // Clone callContext.ctx so the any changes locally made will not affect callContext.ctx.
  var context = Object.assign({}, callContext.ctx);

  // Convert the callcontext to lowercase.
  context = convertToLowerCase(context);

  var data = ctx.data || ctx.instance;
  var _hierarchyScope = {};
  var hierarchyScope = modelSettings.hierarchyScope;

  async.each(hierarchyScope, function dataHierarchyEachBeforeSave(key, cb) {
    if (typeof key === 'string') {
      setValueToHierarchyScope(ctx, context, data, _hierarchyScope, key, cb);
    } else {
      var err = new Error();
      err.name = 'Hierarchy Scope Definition Error';
      err.message = 'The Hierarchy scope in model should be of type string for the model ' + ctx.Model.modelName + ' key ' + key;
      err.code = 'DATA_HIERARCHY_ERROR_001';
      err.type = 'Type mismatch in Declaration';
      err.retriable = false;
      return next(err);
    }
  }, function callbackfn(err) {
    if (err) {
      return next(err);
    }
    data._hierarchyScope = _hierarchyScope;
    return next();
  });
}

/**
 * Observer function dataAccess.
 * This function is invoked upon access of data in any model.
 * It reads the hierarchyScope from model definition settings and
 * gets values from context.ctx for each key and forms a query based
 * on inputs like upwards and depth.
 *
 * @param {object} ctx - The context object containing the model instance.
 * @param {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
 * @return {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
 * @function
 */
function hierarchyAccess(ctx, next) {
  var modelSettings = ctx.Model.definition.settings;

  // Checking for DataHierarchyMixin is applied or not
  if (modelSettings.mixins.DataHierarchyMixin === false) {
    return next();
  }

  // adding hierarchyScope setting.
  if (!modelSettings.hierarchyScope || ctx.options.ignoreHierarchy) {
    return next();
  }

  var callContext = ctx.options;

  // Clone callContext.ctx so the any changes locally made will not affect callContext.ctx.
  var context = Object.assign({}, callContext.ctx);

  // Convert the callcontext to lowercase.
  context = convertToLowerCase(context);

  var hierarchyScope = modelSettings.hierarchyScope;

  hierarchyScope.forEach(function dataHierarchyAccessForEach(key) {
    if (typeof key === 'string') {
      if (context && context[key]) {
        createQuery(ctx, context, key);
      }
    } else {
      var err = new Error();
      err.name = 'Hierarchy Scope Definition Error';
      err.message = 'The Hierarchy scope in model should be of type string for the model ' + ctx.Model.modelName + ' key ' + key;
      err.code = 'DATA_HIERARCHY_ERROR_001';
      err.type = 'Type mismatch in Declaration';
      err.retriable = false;
      return next(err);
    }
  });
  return next();
}

/**
 * Observer function to handle
 *
 * @param {object} ctx - The context object containing the model instance.
 * @param {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
 * @returns {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
 * @function
 */
function hierarchyAfterAccess(ctx, next) {
  var modelSettings = ctx.Model.definition.settings;

  // Checking for HierarchyMixin is applied or not.
  if (modelSettings.mixins.DataHierarchyMixin === false) {
    return next();
  }

  // adding hierarchyScope setting.
  if (!modelSettings.hierarchyScope || ctx.options.ignoreHierarchy) {
    return next();
  }

  var upward = modelSettings.upward || false;

  var resultData = [];
  var result = ctx.accdata;

  if (result.length && upward) {
    var uniq = [];
    var modelProp = ctx.Model.definition.properties;

    result.forEach(function dataAfterAccessResultForEach(obj) {
      var weight = 0;
      Object.keys(obj._hierarchyScope).forEach(function hierarchyScopeForEachFn(item) {
        var value = obj._hierarchyScope[item];
        weight = weight + value.split(',').length;
      });
      obj.weight = weight;
      resultData.push(obj);
    });

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

    // var sortFields = uniq.concat(['weights']);
    // var sortOrders = _.fill(Array(sortFields.length), 'desc');
    // Lodash v3.10.1
    resultData = _.sortByOrder(resultData, 'weight', 'desc');

    // Filter out the redundent records from result by applying unique validation.
    if (uniq.length > 0) {
      resultData = _.uniq(resultData, function dataAfterAccessResultUniqCb(value) {
        return uniq.map(function dataAfterAccessResultUniqForEach(u) {
          return value[u];
        }).join('-');
      });
      // resultData = _.intersection.apply(this, _.chain(uniq).map(function (v) { return _.uniq(resultData, v) }).value());
    }
    ctx.accdata = resultData;
  }
  next();
}

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
 * This function is used to form hierarchy string. Simply concatenates
 * child to parent.
 *
 * @param {string} parentPath - Parent path
 * @param {string} childPath - Child path
 * @returns {string} - "Parentpath+childpath"
 * @function
 */
function createPath(parentPath, childPath) {
  parentPath = parentPath.substring(0, parentPath.length - 1);
  return parentPath.concat(childPath);
}

/**
 * This function is used to form the query based on upward and
 * depth parameters
 *
 * @param {object} ctx - hook ctx
 * @param {object} context - current context
 * @param {string} hierarchy - current hierarchy
 * @function
 */
function createQuery(ctx, context, hierarchy) {
  var upward = ctx.Model.definition.settings.upward || false;
  var depth = ctx.query && ctx.query.depth ? ctx.query.depth : '0';
  var query = {};
  var key = '_hierarchyScope.' + hierarchy;
  var regexString = context[hierarchy];
  var orParms = [];
  var modifiedRegex;

  if (!upward) {
    if (depth === '*') {
      var regexObj = toRegExp(regexString);

      query[key] = regexObj;
      mergeQuery(ctx.query, {
        where: query
      });
    } else {
      for (var i = 0; i <= depth; i++) {
        query = {};
        if (i === 0) {
          modifiedRegex = regexString + '$';
        } else {
          modifiedRegex = modifiedRegex.substr(0, modifiedRegex.length - 1) + '[[:alnum:]]*,$';
        }
        query[key] = toRegExp(modifiedRegex);
        orParms.push(query);
      }
      mergeQuery(ctx.query, {
        where: {
          'or': orParms
        }
      });
    }
  } else {
    if (depth === '*') {
      depth = regexString.split(',').length - 2;
    }
    for (var j = 0; j <= depth; j++) {
      query = {};
      if (j === 0) {
        modifiedRegex = regexString + '$';
      } else {
        var hierarchyArray = modifiedRegex.split(',');
        hierarchyArray.splice(hierarchyArray.length - 2, 1);
        modifiedRegex = hierarchyArray.join();
      }
      if (modifiedRegex === ',$' || modifiedRegex === '$') {
        break;
      }
      query[key] = toRegExp(modifiedRegex);
      orParms.push(query);
    }
    mergeQuery(ctx.query, {
      where: {
        'or': orParms
      }
    });
  }
}

/**
 * This function is used to form get value for each key in Hierarchy scope.
 *
 * @param {object} ctx - hook ctx
 * @param {object} context - current context
 * @param {object} data - instance
 * @param {object} _hierarchyScope - hierarchy scope
 * @param {string} key - hierarchy key
 * @param {function} cb - callback
 * @return {function} cb - callback
 * @function
 */
function setValueToHierarchyScope(ctx, context, data, _hierarchyScope, key, cb) {
  if (ctx.Model.modelName.toLowerCase().concat('Hierarchy') === key) {
    if (ctx.isNewInstance && data.id !== 'root') {
      if (!data.id) {
        data.id = uuid.v4();
      }
      if (data.parentId) {
        ctx.Model.findById(data.parentId, ctx.options, function findByIdcb(err, parent) {
          if (err) {
            return cb(err);
          }
          if (parent && parent._hierarchyScope && parent._hierarchyScope[key]) {
            _hierarchyScope[key] = createPath(parent._hierarchyScope[key], ',' + data.id + ',');
            cb();
          } else {
            var err1 = new Error();
            err1.name = 'Parent Not Found';
            err1.message = 'Parent Not Found for the given parentid ' + data.parentId;
            err1.code = 'DATA_HIERARCHY_ERROR_003';
            err1.type = 'ParentNotFound';
            err1.retriable = false;
            return cb(err1);
          }
        });
      } else {
        _hierarchyScope[key] = createPath(ROOT_PATH, ',' + data.id + ',');
        cb();
      }
    } else if (ctx.isNewInstance && data.id === 'root') {
      _hierarchyScope[key] = ROOT_PATH;
      cb();
    } else {
      cb();
    }
  } else if (context && context[key]) {
    _hierarchyScope[key] = context[key];
    cb();
  } else {
    var err1 = new Error();
    err1.name = 'Hierarchy Personalization error';
    err1.message = 'insufficient data! HierachyScope values not found for the model' + ctx.Model.modelName + ' key ' + key;
    err1.code = 'DATA_HIERARCHY_ERROR_002';
    err1.type = 'Insufficient data';
    err1.retriable = false;
    return cb(err1);
  }
}
