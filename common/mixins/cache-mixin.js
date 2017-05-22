/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This mixin is attached to BaseEntity so that it applies to all Models used in
 * the EV-FOUNDATION framework. The purpose of this mixin is as follows:
 * At creation time of (each) model, check if its definition contains a property
 * called 'cacheable', and if its value is anything other than 'false'.
 * If so, mark the model as Cacheable by adding a property with this model's name
 * to the global 'evcacheables' object.
 * The global 'evcacheables' object is used to check whether a given model is cacheable
 * or not in the modified loopback-datasource-juggler
 *
 * @mixin EV Cache Mixin
 * @author Ajith Vasudevan
 */

var logger = require('../../lib/logger');
var log = logger('ev-cache-mixin');
var messaging = require('../../lib/common/global-messaging');
var uuid = require('node-uuid');

module.exports = function CacheMixin(Model) {
  // Add an 'After Save' observer for this Model to evict the cache
  // corresponding to this Model's data whenever this Model's data
  // is updated.
  Model.evObserve('after save', clearCacheOnSave);
  Model.evObserve('after delete', clearCacheOnDelete);
  Model.evObserve('after cache', evictCache);

  // Add an 'After Delete' observer for this Model to evict the cache
  // corresponding to this Model's data whenever this Model's data
  // is deleted.
  // check if this model is defined/declared to be cacheable
  if (Model.definition && Model.definition.settings && Model.definition.settings.cacheable) {
    log.debug(log.defaultContext(), 'EV_CACHE', 'Marking as Cacheable model:', Model.modelName);

    // create the global evcacheables object if not present
    if (!global.evcacheables) { global.evcacheables = {}; }

    // Mark the model as cacheable by adding a property with this model's name
    // to the 'evcacheables' object and setting its value to 'true'.
    global.evcacheables[Model.modelName] = true;
  } else {
    log.debug(log.defaultContext(), 'EV_CACHE', 'Marking as Uncacheable model:', Model.modelName);
  }
};

function clearCacheOnSave(ctx, next) {
  ctx.Model.clearCacheOnSave(ctx, next);
}

function clearCacheOnDelete(ctx, next) {
  ctx.Model.clearCacheOnDelete(ctx, next);
}


/*
 * @function evCacheMixinEvictCacheCb
 * This function is invoked upon update of any data in this model.
 * It iterates through all cache keys of this Model and deletes them
 * so that the cache is re-built the next time data is accessed from
 * this model, thereby preventing stale data in the cache.
 * @param {object} ctx - The context object containing the model instance.
 * @param {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
 */
var evictCache = function evCacheMixinEvictCacheCb(ctx, next) {
  messaging.publish('evictCache', uuid.v4());
  next();
};
