/**
 *
 * �2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
const loopback = require('loopback');
const DataSource = loopback.DataSource;
const DataAccessObject = DataSource.DataAccessObject;
const utils = require('loopback-datasource-juggler/lib/utils');
const isPlainObject = utils.isPlainObject;
const oeutils = require('../common/util');
const assert = require('assert');
const async = require('async');
require('./coerce');

/* eslint-disable no-undefined */

/* eslint-disable no-unused-vars */
// Atul : Keep this function for reference
// function checkForOverrideAndCall(self, fn, args, optionIndex) {
//  var newModel = loopback.findModel(self.modelName, args[optionIndex]);
//  if (!newModel) {
//    newModel = self;
//  }
//  return fn.apply(newModel, args);
// }
/* eslint-enable no-unused-vars */

DataAccessObject._forDB = function (data) {
  return data;
};

// Atul :implementing find with groupBy. This is overriden because when data is retrieved from connector
// find() of loopback runs logic that enforces properties. if strict=true, which is default case, it causes
// find() with groupby not to return group by properties like sum/avg.
// this function is called from find() whenever it detects 'group by' clause
function findWithGroupBy(query, options, cb) {
  if ( !query || !query.group || !query.group.groupBy ) {
    return cb(new Error('group by clause not found in query'));
  }

  if (options === undefined && cb === undefined) {
    if (typeof query === 'function') {
      // find(cb);
      cb = query;
      query = {};
    }
  } else if (cb === undefined) {
    if (typeof options === 'function') {
      // find(query, cb);
      cb = options;
      options = {};
    }
  }

  cb = cb || utils.createPromiseCallback();
  query = query || {};
  options = options || {};

  assert(typeof query === 'object', 'The query argument must be an object');
  assert(typeof options === 'object', 'The options argument must be an object');
  assert(typeof cb === 'function', 'The cb argument must be a function');

  var hookState = {};
  var self = this;
  var connector = self.getConnector();

  assert(typeof connector.all === 'function',
    'all() must be implemented by the connector');

  try {
    this._normalize(query, options);
  } catch (err) {
    process.nextTick(function () {
      cb(err);
    });
    return cb.promise;
  }

  this.applyScope(query);

  var allCb = function (err, data) {
    if (!err && Array.isArray(data)) {
      async.map(data, function (item, next) {
        var Model = self.lookupModel(item);
        if (options.notify === false) {
          buildResult(item, next);
        } else {
          withNotify(item, next);
        }

        function buildResult(data, callback) {
          var ctorOpts = {
            fields: query.fields,
            applySetters: false,
            persisted: true,
            strict: false
          };
          var obj;
          try {
            obj = new Model(data, ctorOpts);
          } catch (err) {
            return callback(err);
          }
          callback(null, obj);
        }

        function withNotify(data, callback) {
          var context = {
            Model: Model,
            data: data,
            isNewInstance: false,
            hookState: hookState,
            options: options
          };

          Model.notifyObserversOf('loaded', context, function (err) {
            if (err) return callback(err);
            buildResult(context.data, callback);
          });
        }
      },
      function (err, results) {
        if (err) return cb(err);

        // When applying query.collect, some root items may not have
        // any related/linked item. We store `undefined` in the results
        // array in such case, which is not desirable from API consumer's
        // point of view.
        results = results.filter(function (v) {
          return v !== undefined;
        });

        if (data && data.countBeforeLimit) {
          results.countBeforeLimit = data.countBeforeLimit;
        }
        cb(err, results);
      });
    } else {
      cb(err, data || []);
    }
  };

  if (options.notify === false) {
    oeutils.invokeConnectorMethod(connector, 'all', self, [query], options, allCb);
  } else {
    var context = {
      Model: this,
      query: query,
      hookState: hookState,
      options: options
    };
    this.notifyObserversOf('access', context, function (err, ctx) {
      if (err) return cb(err);
      oeutils.invokeConnectorMethod(connector, 'all', self, [ctx.query], options, allCb);
    });
  }
  return cb.promise;
}

// Atul : Overriding upsert function as loopback's version is doing un-necessary 'forceId' check
// Trying to make logic simple (with drawback) - find record, if record found, use updateattribute() same as original code
// If no record found, use create()
DataAccessObject.updateOrCreate =
DataAccessObject.patchOrCreate =
DataAccessObject.upsert = function (data, options, cb) {
  var connectionPromise = oeutils.stillConnecting(this.getDataSource(), this, arguments);
  if (connectionPromise) {
    return connectionPromise;
  }

  if (options === undefined && cb === undefined) {
    if (typeof data === 'function') {
      // UPSERt(cb)
      cb = data;
      data = {};
    }
  } else if (cb === undefined) {
    if (typeof options === 'function') {
      // upsert(data, cb)
      cb = options;
      options = {};
    }
  }

  cb = cb || utils.createPromiseCallback();
  data = data || {};
  options = options || {};

  assert(typeof data === 'object', 'The data argument must be an object');
  assert(typeof options === 'object', 'The options argument must be an object');
  assert(typeof cb === 'function', 'The cb argument must be a function');

  if (Array.isArray(data)) {
    cb(new Error('updateOrCreate does not support bulk mode or any array input'));
    return cb.promise;
  }

  var self = this;
  var Model = this;

  var id = oeutils.getIdValue(this, data);
  if (id === undefined || id === null) {
    return this.create(data, options, cb);
  }

  var doValidate;
  if (options.validate === undefined) {
    if (Model.settings.validateUpsert === undefined) {
      if (Model.settings.automaticValidation !== undefined) {
        doValidate = Model.settings.automaticValidation;
      }
    } else {
      doValidate = Model.settings.validateUpsert;
    }
  } else {
    doValidate = options.validate;
  }

  // Atul - commented this line - didn't understand why to overwrite options
  // options = Object.create(options);
  options.validate = !!doValidate;
  Model.findById(id, options, function (err, model) {
    if (err) return cb(err);
    if (!model) {
      return self.create(data, options, cb);
    }
    model.updateAttributes(data, options, cb);
  });
  return cb.promise;
};


// Atul : Overriding findOne as when response was object, the function was returning null object
DataAccessObject.findOne = function findOne(query, options, cb) {
  var connectionPromise = oeutils.stillConnecting(this.getDataSource(), this, arguments);
  if (connectionPromise) {
    return connectionPromise;
  }

  if (options === undefined && cb === undefined) {
    if (typeof query === 'function') {
      cb = query;
      query = {};
    }
  } else if (cb === undefined) {
    if (typeof options === 'function') {
      cb = options;
      options = {};
    }
  }

  cb = cb || utils.createPromiseCallback();
  query = query || {};
  options = options || {};

  assert(typeof query === 'object', 'The query argument must be an object');
  assert(typeof options === 'object', 'The options argument must be an object');
  assert(typeof cb === 'function', 'The cb argument must be a function');

  query.limit = 1;
  this.find(query, options, function (err, collection) {
    if (err || !collection) return cb(err, null);
    if (Array.isArray(collection)) {
      if (!collection.length > 0) return cb(err, null);
      cb(err, collection[0]);
    } else {
      cb(err, collection);
    }
  });
  return cb.promise;
};


// Atul : Overriding find function to generate 'after access' event
// Actually 'after access' hook is not required but it is still implemented to keep backward compatibility
// you can use 'loaded' observer hook to do same thing - however there is limitation like data in loaded hook is not really Model Instance
// that data is directly coming from from connector.
const _find = DataAccessObject.find;
DataAccessObject.find = function (query, options, cb) {
  var self = this;
  if (query && query.group && query.group.groupBy) {
    return findWithGroupBy.apply(this, [].slice.call(arguments));
  }

  function callback(err, results) {
    if (err) { return cb(err, results); }
    if (options && options.notify === false) {
      return cb(err, results);
    }
    var context = { Model: self, accdata: results, options: options, query: query };

    self.notifyObserversOf('after access', context, function (err) {
      if (err) { return cb(err); }
      return cb(err, context.accdata);
    });
  }

  if (!options && !cb && typeof query === 'function') {
    cb = query;
    return _find.call(this, callback);
  } else if (typeof options === 'function' && !cb) {
    cb = options;
    return _find.call(this, query, callback);
  }
  return _find.call(this, query, options, callback);
  // return _find.apply(this, [].slice.call(arguments));
};


// Atul : fix for oracle which returns R field
const _findOne = DataAccessObject.findOne;
DataAccessObject.findOne = function (query, options, cb) {
  var a1;
  var a2;
  var a3;
  if (typeof query === 'function') {
    a1 = {};
    a2 = {};
    a3 = query;
  } else if (typeof options === 'function') {
    a1 = query;
    a2 = {};
    a3 = options;
  } else {
    a1 = query;
    a2 = options;
    a3 = cb;
  }

  return _findOne.call(this, a1, a2, function (err, results) {
    if (err) {
      return a3(err, results);
    }
    if (results && results.__unknownProperties && results.__unknownProperties.length >= 1) {
      results.__unknownProperties = [];
    }
    return a3(err, results);
  });
};

/**
 * Find model instance by ID.
 *
 * Example:
 * ```js
 * User.findById(23, function(err, user) {
 *   console.info(user.id); // 23
 * });
 * ```
 *
 * @param {*} id Primary key value
 * @param {Object} [filter] The filter that contains `include` or `fields`.
 * @param {Object} [options] Options
 * @param {Function} cb Callback called with (err, instance)
 * @return {function} promise
 */
DataAccessObject.findById = function findById(id, filter, options, cb) {
  if (options === undefined && cb === undefined) {
    if (typeof filter === 'function') {
      // findById(id, cb)
      cb = filter;
      filter = {};
    }
  } else if (cb === undefined) {
    if (typeof options === 'function') {
      // findById(id, query, cb)
      cb = options;
      options = {};
      if (typeof filter === 'object' && !(filter.include || filter.fields)) {
        // If filter doesn't have include or fields, assuming it's options
        options = filter;
        filter = {};
      }
    }
  }

  options = options || {};
  filter = filter || {};


  if (isPKMissing(this, cb)) {
    return cb.promise;
  } else if (id === null || id === '') {
    process.nextTick(function () {
      cb(new Error('{{Model::findById}} requires the {{id}} argument'));
    });
  } else {
    var query = { where: {} };
    var pk = this.definition.idName() || 'id';
    query.where[pk] = id;
    if (filter.where) {
      query.where = {
        and: [query.where, filter.where]
      };
    }
    if (filter.include) {
      query.include = filter.include;
    }
    if (filter.fields) {
      query.fields = filter.fields;
    }
    this.findOne(query, options, cb);
  }
  return cb.promise;
};

function isPKMissing(modelClass, cb) {
  var hasPK = modelClass.definition.hasPK();
  if (hasPK) return false;
  process.nextTick(function () {
    cb(new Error('Primary key missin on model ' + modelClass.modelName));
  });
  return true;
}


// Atul : this function overrides include() from loopback-datasource-juggler
// it is used to build options.join parameter that in turns creates model objects
// and maintains filter, column etc objects in it
const _include = DataAccessObject.include;
DataAccessObject.include = function (objects, include, options, cb) {
  var self = this;
  if (!include || (Array.isArray(include) && include.length === 0) ||
      (Array.isArray(objects) && objects.length === 0) ||
      (isPlainObject(include) && Object.keys(include).length === 0)) {
    // The objects are empty
    return process.nextTick(function () {
      cb && cb(null, objects);
    });
  }

  var temp = self.normalizeInclude(include);

  // Atul : this part is overriden that updates options.join object
  // structure of this is
  // options.join['EmployeeAddress'] = { modelName : "EmployeeAddress", parentModel : "Employee", keyTo:"employeeId", "columns" : "id, city", filter: "{}"}
  if (options.join) {
    for (var j = 0; j < temp.length; ++j) {
      var inc = temp[j];
      var relName;
      if (typeof inc === 'object') {
        relName = Object.keys(inc)[0];
      } else if (typeof inc === 'string') {
        relName = inc;
      } else {
        throw new Error('invalid include type');
      }
      var toModelName = self.relations[relName].modelTo.modelName;
      options.join[toModelName] = options.join[toModelName] || {};
      options.join[toModelName].parentModel = this.modelName;
      options.join[toModelName].modelName = toModelName;
      options.join[toModelName].keyTo = self.relations[relName].keyTo;
    }
  }
  // Atul: call original
  _include.call(this, objects, include, options, cb);
};
