/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var config = require('../../server/config');
var log = require('../../lib/logger')('markascacheable');
var messaging = require('../../lib/common/global-messaging');


messaging.subscribe('evictCache', function messagingSubscribe(version) {
  // TODO see if we can do it without evicting all cache
  evictAllCache();
});

function evictAllCache() {
  log.debug(log.defaultContext(), 'evicting all cache');
  global.evcache = null;
}

function doEvictCache(modelName) {
  log.debug(log.defaultContext(), 'EV_CACHE', 'Evicting cache for model', modelName);
  var keycount = 0;
  if (global.evcache) {
    for (var key in global.evcache) {
      if (global.evcache.hasOwnProperty(key)) {
        if (key.indexOf(modelName + '_') === 0) {
          global.evcache[key] = null;
          delete global.evcache[key];
          log.debug(log.defaultContext(), 'EV_CACHE', 'deleted key', key);
          keycount++;
        }
      }
    }
  }
  log.debug(log.defaultContext(), 'EV_CACHE', 'Number of evicted keys:', keycount);
}


// This function is invoked upon update of any data in this model.
// It iterates through all cache keys of this Model and deletes them
// so that the cache is re-built the next time data is accessed from
// this model, thereby preventing stale data in the cache.
var evictCache = function evictCache(ctx, next) {
  doEvictCache(ctx.Model.modelName);
  next();
};


/**
 * This boot script marks as cacheable the models listed under the
 * "modelstocache" property in the config.json application configuration
 *
 * @memberof Boot Scripts
 * @author Ajith Vasudevan
 * @name Mark as Cacheable
 */

module.exports = function MarkAsCacheable(app, cb) {
  // Fetch the models to cache array from framework config
  var modelstocache = config && config.modelstocache;
  // if framework model caching is not disabled via config
  if (config && modelstocache && !(config && config.disablecaching)) {
    modelstocache.forEach(function modelstocacheForEachCb(modelname) {
      var Model = app.models[modelname];
      if (Model) {
        // if the model actually exists
        log.debug(log.defaultContext(), 'EV_CACHE', 'markascacheable boot script:', 'Marking   Framework Model as cacheable:', modelname);

        // create the global evcacheables object if not present
        if (!global.evcacheables) {
          global.evcacheables = {};
        }

        // Mark the model as cacheable by adding a property with this model's name
        // to the "evcacheables" object and setting its value to 'true'.
        global.evcacheables[modelname] = true;

        // Add an 'After Save' observer for this Model to evict the cache
        // corresponding to this Model's data whenever this Model's data
        // is updated.
        Model.observe('after save', evictCache);

        // Add an 'After Delete' observer for this Model to evict the cache
        // corresponding to this Model's data whenever this Model's data
        // is deleted.
        Model.observe('after delete', evictCache);
      } else {
        log.debug(log.defaultContext(), 'EV_CACHE', 'markascacheable boot script:', 'Framework Model to cache specified in config does not exist:', modelname);
      }
    });
  } else {
    log.debug(log.defaultContext(), 'EV_CACHE', 'markascacheable boot script:', 'Framework Model Caching is disabled via config (ev-foundation/server/config.json [\'disablecaching\': true])');
  }

  // Callback to make the 'marking as cacheable' synchronous
  cb();
};
