/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * @classdesc This model is used to define some remote methods for the
 * management of Cache. These remote methods include the following -
 * <pre>
 *  1.  getcacheables       - Gets a map of all cacheable models.
 *  2.  evictallcache       - Evict cache for all Models
 *  3.  getcachestatistics  - Returns cache statistics
 *  4.  iscacheable         - Returns whether the specified model is marked as cacheable or not
 *  5.  evictcacheformodels - Evicts/deletes the cache keys of the specified models
 * </pre>
 *
 * @kind class
 * @class CacheManager
 * @author Ajith Vasudevan
 */
var logger = require('../../../lib/logger');
var log = logger('cache-manager');

module.exports = function CacheManagerFn(CacheManager) {
  /**
  * Function to get a map of all cacheable models.
  * Value 'true' indicates that the model is marked as cacheable
  *
  * @memberof CacheManager
  * @name getcacheables
  * @param {object}options - options
  * @param {function} cb - callback
  */
  CacheManager.getcacheables = function cacheManagerGetCacheablesFn(options, cb) {
    log.debug(options, 'CACHE-MANAGER', 'getcacheables', 'evcacheables', global.evcacheables);
    cb(null, global.evcacheables);
  };
  // Remote method for above function
  CacheManager.remoteMethod(
    'getcacheables', {
      description: 'Get a map of all cacheable models. Value \'true\' indicates that the model is marked as cacheable',
      http: {
        path: '/getcacheables',
        verb: 'get'
      },
      returns: {
        arg: 'cacheables',
        type: 'object',
        root: true
      }
    }
  );

  /**
  * Function to evict cache for all Models
  *
  * @memberof CacheManager
  * @name evictallcache
  * @param {object}options - options
  * @param {function} cb - callback
  */
  CacheManager.evictallcache = function cacheManagerEvictAllCacheFn(options, cb) {
    log.debug(options, 'CACHE-MANAGER', 'evictallcache');
    global.evcache = null;
    delete global.evcache;
    cb(null, {
      'result': 'Cache Evicted for all Models'
    });
  };

  CacheManager.remoteMethod(
    'evictallcache', {
      description: 'Evict cache for all Models',
      http: {
        path: '/evictallcache',
        verb: 'get'
      },
      returns: {
        arg: 'result',
        type: 'object',
        root: true
      }
    }
  );


  /**
  * Function for returning cache statistics (currently number
  * of cache keys and size in bytes for each cached model)
  *
  * @memberof CacheManager
  * @name getcachestatistics
  * @param {object}options - options
  * @param {function} cb - callback
  */
  CacheManager.getcachestatistics = function cacheManagerGetCacheStatisticsFn(options, cb) {
    log.debug(options, 'CACHE-MANAGER', 'getcachestatistics');
    var result = {
      totalkeycount: 0,
      totalcachesizeinbytes: 0,
      statspermodel: JSON.parse(JSON.stringify(global.evcacheables))
    };
    var key;
    for (key in result.statspermodel) {
      if (result.statspermodel.hasOwnProperty(key)) {
        result.statspermodel[key] = {
          keycount: 0,
          sizeinbytes: 0
        };
      }
    }
    if (global.evcache) {
      for (key in global.evcache) {
        if (global.evcache.hasOwnProperty(key)) {
          var model = key.substring(0, key.indexOf('_'));
          if (global.evcache.hasOwnProperty(key)) {
            var sizeofobj = sizeOfObjectInBytes(global.evcache[key]);
            result.statspermodel[model].keycount = result.statspermodel[model].keycount + 1;
            result.statspermodel[model].sizeinbytes = result.statspermodel[model].sizeinbytes + sizeofobj;
            result.totalkeycount = result.totalkeycount + 1;
            result.totalcachesizeinbytes = result.totalcachesizeinbytes + sizeofobj;
          }
        }
      }
    }
    // log.debug("CACHE-MANAGER", "evcache", global.evcache);
    cb(null, result);
  };

  // Remote method for above function
  CacheManager.remoteMethod(
    'getcachestatistics', {
      description: 'Returns cache statistics (currently number of cache keys and size in bytes for each cached model)',
      http: {
        path: '/getcachestatistics',
        verb: 'get'
      },
      returns: {
        arg: 'result',
        type: 'object',
        root: true
      }
    }
  );


  /**
  * Function to returns whether the specified model
  * is marked as cacheable or not
  *
  * @memberof CacheManager
  * @name iscacheable
  * @param {object}model - model constructor
  * @param {object}options - options
  * @param {function} cb - callback
  */
  CacheManager.iscacheable = function cacheManagerIsCacheableFn(model, options, cb) {
    log.debug(options, 'CACHE-MANAGER', 'iscacheable', model);

    var cacheable = false;
    if (global.evcacheables && global.evcacheables[model] === true) {
      cacheable = true;
    }

    cb(null, {
      'model': model,
      'cacheable': cacheable
    });
  };

  // Remote method for above function
  CacheManager.remoteMethod(
    'iscacheable', {
      description: 'Returns whether the specified model (path parameter) is marked as cacheable or not',
      http: {
        path: '/iscacheable/:model',
        verb: 'get'
      },
      accepts: {
        arg: 'model',
        type: 'string',
        http: {
          source: 'path'
        }
      },
      returns: {
        arg: 'cacheable',
        type: 'object',
        root: true
      }
    }
  );


  /**
  * Function to evicts/deletes the cache keys of the specified models.
  * Input is a string array. Output is a map of model vs number
  * of keys deleted.
  *
  * @memberof CacheManager
  * @name evictcacheformodels
  * @param {object}models - model constructor
  * @param {object}options - options
  * @param {function} cb - callback
  * @returns {function}cb - callback
  */
  CacheManager.evictcacheformodels = function cacheManagerEvictCacheForModelsFn(models, options, cb) {
    log.debug(options, 'CACHE-MANAGER', 'evictcacheformodels', models);

    if (!models || models === '' || !models.length) {
      log.debug(options, 'CACHE-MANAGER', 'evictcacheformodels', 'ERROR: models is not a string array');
      var err = new Error('models should be a string array');
      err.retriable = false;
      return cb(err, null);
    }

    var keycount = 0;
    var response = {};
    function cacheManagerEvictCacheForModelsForEachFn(model) {
      if (!response[model]) {
        response[model] = 0;
      }
      if (key.indexOf(model + '_') === 0) {
        global.evcache[key] = null;
        delete global.evcache[key];
        log.debug(options, 'CACHE-MANAGER', 'deleted key', key);
        response[model] = response[model] + 1;
      }
    }
    if (global.evcache) {
      for (var key in global.evcache) {
        if (global.evcache.hasOwnProperty(key)) {
          models.forEach(cacheManagerEvictCacheForModelsForEachFn);
        }
      }
      log.debug(options, 'CACHE-MANAGER', 'response', response);
    }
    log.debug(options, 'CACHE-MANAGER', 'Number of evicted keys:', keycount);
    cb(null, response);
  };

  // Remote method for above function
  CacheManager.remoteMethod(
    'evictcacheformodels', {
      description: 'Evicts/Deletes the cache keys of the specified models. Input is a string array. Output is a map of model vs number of keys deleted.',
      http: {
        path: '/evictcacheformodels',
        verb: 'post'
      },
      accepts: {
        arg: 'models',
        type: 'object',
        http: {
          source: 'body'
        }
      },
      returns: {
        arg: 'evictedkeycount',
        type: 'object',
        root: true
      }
    }
  );

  // Disable all remote methods of CacheManager like find, findById,
  // create, etc., except the methods defined in this file
  disableAllMethodsBut(CacheManager, ['getcachestatistics', 'evictallcache', 'evictcacheformodels', 'iscacheable', 'getcacheables']);
};


/**
    * Function to disable all remote methods of specified model
    * except the supplied array of methods
    *
    * @memberof CacheManager
    * @name disableAllMethodsBut
    * @param {object}model - model constructor
    * @param {array}methodsToExpose - remote methods
    */
function disableAllMethodsBut(model, methodsToExpose) {
  if (model && model.sharedClass) {
    methodsToExpose = methodsToExpose || [];

    // var modelName = model.sharedClass.name;
    var methods = model.sharedClass.methods();
    var relationMethods = [];
    var hiddenMethods = [];

    try {
      Object.keys(model.definition.settings.relations).forEach(function disableAllMethodsButRelationForEachFn(relation) {
        relationMethods.push({
          name: '__findById__' + relation,
          isStatic: false
        });
        relationMethods.push({
          name: '__destroyById__' + relation,
          isStatic: false
        });
        relationMethods.push({
          name: '__exists__' + relation,
          isStatic: false
        });
        relationMethods.push({
          name: '__link__' + relation,
          isStatic: false
        });
        relationMethods.push({
          name: '__get__' + relation,
          isStatic: false
        });
        relationMethods.push({
          name: '__create__' + relation,
          isStatic: false
        });
        relationMethods.push({
          name: '__update__' + relation,
          isStatic: false
        });
        relationMethods.push({
          name: '__destroy__' + relation,
          isStatic: false
        });
        relationMethods.push({
          name: '__unlink__' + relation,
          isStatic: false
        });
        relationMethods.push({
          name: '__count__' + relation,
          isStatic: false
        });
        relationMethods.push({
          name: '__delete__' + relation,
          isStatic: false
        });
        relationMethods.push({
          name: 'bulkupload' + relation,
          isStatic: true
        });
        relationMethods.push({
          name: 'history' + relation,
          isStatic: true
        });
      });
    } catch (err) {
      // Handle error
    }

    methods.concat(relationMethods).forEach(function disableAllMethodsButConcatRelationMethodsFn(method) {
      var methodName = method.name;
      if (methodsToExpose.indexOf(methodName) < 0) {
        hiddenMethods.push(methodName);
        model.disableRemoteMethod(methodName, method.isStatic);
      }
    });
  }
}


/**
   * Function to return size in bytes of the specified Object
   *
   * @memberof CacheManager
   * @name sizeOfObjectInBytes
   * @param {object}object - input object
   * @returns {number} - number of bytes
   */
function sizeOfObjectInBytes(object) {
  var objectList = [];
  var stack = [object];
  var bytes = 0;
  while (stack.length) {
    var value = stack.pop();
    if (typeof value === 'boolean') {
      bytes += 4;
    } else if (typeof value === 'string') {
      bytes += value.length * 2;
    } else if (typeof value === 'number') {
      bytes += 8;
    } else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
      objectList.push(value);
      for (var i in value) {
        if (value.hasOwnProperty(i)) {
          stack.push(value[i]);
        }
      }
    }
  }
  return bytes;
}
