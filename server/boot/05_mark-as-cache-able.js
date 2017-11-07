/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var config = require('../../server/config');
var log = require('oe-logger')('markascacheable');

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

  if (config && modelstocache && !(config && config.disablecaching)) {
    // if framework model caching is not disabled via config
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
        // Add an 'After Delete' observer for this Model to evict the cache
        // corresponding to this Model's data whenever this Model's data
        // is deleted.
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
