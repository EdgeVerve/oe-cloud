/**
 *
 * �2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
// This file contains many utility functions that are either created by/for oe-cloud or they are overriden/copied from
// loopback code. all functions are small and self-explanatory
const utils = require('loopback-datasource-juggler/lib/utils');
module.exports.isBaseEntity = function (model) {
  return model.settings.isBaseEntity === true;
};

function mergeRecursive(obj1, obj2) {
  // var o = Object.assign({}, obj1);
  var keys = Object.keys(obj2);
  keys.forEach( (key, index) => {
    if (!obj1.hasOwnProperty(key) || typeof obj1[key] !== 'object') {
      if (typeof obj2[key] === 'object') {
        if (!Array.isArray(obj2[key])) {obj1[key] = Object.assign({}, obj2[key]);} else {obj1[key] = obj2[key].slice();}
      } else {
        obj1[key] = obj2[key];
      }
    } else if (!Array.isArray(obj1[key])) {
      mergeRecursive(obj1[key], obj2[key]);
    } else {
      obj1[key] = obj1[key].concat(obj2[key]);
    }
  });
}

module.exports.mergeObjects = function (obj1, obj2) {
  if (typeof obj1 === 'undefined') {
    obj1 = Object.assign({}, obj2);
    return obj1;
  }
  mergeRecursive(obj1, obj2);
  return obj1;
};

/* eslint-disable no-loop-func */
module.exports.checkDependency = function (app, modules) {
  var appList = app.appList || app.applist;
  if (!appList) {
    return new Error('Dependency not met. Found applist null. Check app-list.json');
  }
  if (Array.isArray(modules)) {
    for (var i = 0; i < modules.length; ++i) {
      var n = appList.find((a) => {
        if (a.path.toLowerCase() === modules[i]) {return true;}
        return false;
      });
      if (!n) {return false;}
    }
    return true;
  }

  var m = appList.find((a) => {
    if (a.path.toLowerCase() === modules) {return true;}
    return false;
  });
  return m;
};
/* eslint-enable no-loop-func */

function idName(m) {
  return m.definition.idName() || 'id';
}
function getIdValue(m, data) {
  return data && data[idName(m)];
}

const BASE_ENTITY = 'BaseEntity';
// utility function to climb up inheritance tree
// and execute callback on each hit. This will hit
// all models except BaseEntity
const inheritanceTraverse = function (model, ctx, cb) {
  if (model.base.modelName !== BASE_ENTITY && cb(model.base)) {
    // do nothing
    return;
  } else if (model.base.modelName === BASE_ENTITY) {
    return;
  }

  inheritanceTraverse(model.base, ctx, cb);
};

module.exports.traverseInheritanceTree = inheritanceTraverse;
const _ = require('lodash');
function idFound(idField, p) {
  if (!p || _.isEmpty(p)) {
    return false;
  }
  if (p[idField]) {
    return p[idField];
  }
  return false;
}

function checkAndClause(idField, p) {
  if (p && p.and && Array.isArray(p.and)) {
    var i;
    var v;
    var f;
    for (i = 0; i < p.and.length; ++i) {
      v = p.and[i];
      f = idFound(idField, v);
      if (f !== false) {
        return true;
      }
    }
    for (i = 0; i < p.and.length; ++i) {
      v = p.and[i];
      if (v && v.and && Array.isArray(v.and)) {
        f = checkAndClause(idField, v);
        if (f !== false) {
          return true;
        }
      }
    }
  }
  return false;
}


const loopback = require('loopback');
function isInstanceQuery(Model, where) {
  if (typeof Model === 'string') {
    Model = loopback.findModel(Model);
  }
  var idField = idName(Model);
  if (!where || _.isEmpty(where)) {
    return false;
  }
  var p = where;
  if (p.where) {
    p = p.where;
  }
  if (idFound(idField, p)) {
    return true;
  }

  var temp = checkAndClause(idField, p);
  if ( temp !== false ) {
    return temp;
  }

  return false;
}

function _stillConnecting(dataSource, obj, args) {
  if (typeof args[args.length - 1] === 'function') {
    return dataSource.ready(obj, args);
  }

  // promise variant
  var promiseArgs = Array.prototype.slice.call(args);
  promiseArgs.callee = args.callee;
  var cb = utils.createPromiseCallback();
  promiseArgs.push(cb);
  if (dataSource.ready(obj, promiseArgs)) {
    return cb.promise;
  }
  return false;
}

function _invokeConnectorMethod(connector, method, Model, args, options, cb) {
  var dataSource = Model.getDataSource();
  // If the DataSource is a transaction and no transaction object is provide in
  // the options yet, add it to the options, see: DataSource#transaction()
  var opts = dataSource.isTransaction && !options.transaction ? Object.assign(
    options, {transaction: dataSource.currentTransaction}
  ) : options;
  var optionsSupported = connector[method].length >= args.length + 3;
  var transaction = opts.transaction;
  if (transaction) {
    if (!optionsSupported) {
      return process.nextTick(function () {
        cb(new Error(
          'The connector does not support {{method}} within a transaction', method));
      });
    }
    // transaction isn't always a Transaction instance. Some tests provide a
    // string to test if options get passed through, so check for ensureActive:
    if (transaction.ensureActive && !transaction.ensureActive(cb)) {
      return;
    }
  }
  var modelName = Model.modelName;
  var fullArgs;
  if (!optionsSupported && method === 'count') {
    // NOTE: The old count() signature is irregular, with `where` coming last:
    // [modelName, cb, where]
    var where = args[0];
    fullArgs = [modelName, cb, where];
  } else {
    // Standard signature: [modelName, ...args, (opts, ) cb]
    fullArgs = [modelName].concat(args);
    if (optionsSupported) {
      fullArgs.push(opts);
    }
    fullArgs.push(cb);
  }
  connector[method].apply(connector, fullArgs);
}

module.exports.invokeConnectorMethod = _invokeConnectorMethod;
module.exports.stillConnecting = _stillConnecting;
module.exports.isInstanceQuery = isInstanceQuery;
module.exports.idName = idName;
module.exports.getIdValue = getIdValue;

