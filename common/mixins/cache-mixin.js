/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * This mixin is attached to BaseEntity so that it applies to all Models used in
 * the oeCloud.io framework. The purpose of this mixin is as follows:
 * At creation time of (each) model, check if its definition contains a property
 * called 'cacheable', and if its value is anything other than 'false'.
 * If so, mark the model as Cacheable by adding a property with this model's name
 * to the global 'evcacheables' object.
 * The global 'evcacheables' object is used to check whether a given model is cacheable
 * or not in the modified loopback-datasource-juggler
 *
 * @mixin Cache Mixin
 * @author Ajith Vasudevan
 */

var logger = require('oe-logger');
var log = logger('cache-mixin');
var process = require('process');

module.exports = function CacheMixin(Model) {
  // Add an 'After Save' observer for this Model to evict the cache
  // corresponding to this Model's data whenever this Model's data
  // is updated.

  Model.evObserve('after save', clearCacheOnSave);
  Model.evObserve('after delete', clearCacheOnDelete);

  // create the global evDisableInstanceCache object if not present
  if (!global.evDisableInstanceCache) {
    global.evDisableInstanceCache = {};
  }

  // Add an 'After Delete' observer for this Model to evict the cache
  // corresponding to this Model's data whenever this Model's data
  // is deleted.
  // check if this model is defined/declared to be cacheable
  if (Model.definition && Model.definition.settings && Model.definition.settings.cacheable) {
    log.info(log.defaultContext(), 'EV_CACHE', 'Marking as Cacheable model:', Model.modelName);

    // create the global evcacheables object if not present
    if (!global.evcacheables) { global.evcacheables = {}; }

    // Mark the model as cacheable by adding a property with this model's name
    // to the 'evcacheables' object and setting its value to 'true'.
    global.evcacheables[Model.modelName] = true;
  }

  if ((Model.definition && Model.definition.settings && Model.definition.settings.disableInstanceCache) || process.env.CONSISTENT_HASH !== 'true') {
    log.debug(log.defaultContext(), 'EV_CACHE', 'disable instance cache for model:', Model.modelName);

    // Mark the model as not instance cache enabled by adding a property with this model's name
    // to the 'evDisableInstanceCache' object and setting its value to 'true'.
    global.evDisableInstanceCache[Model.modelName] = true;
  }

  if (Model.definition && Model.definition.settings && !Model.definition.settings.cacheable) {
    log.debug(log.defaultContext(), 'EV_CACHE', 'Marking as Uncacheable model:', Model.modelName);
  }

  if (Model.definition && Model.definition.settings && !Model.definition.settings.disableInstanceCache) {
    log.debug(log.defaultContext(), 'EV_CACHE', 'Marking as Uncacheable model:', Model.modelName);
  }
};

function clearCacheOnSave(ctx, next) {
  ctx.Model.clearCacheOnSave(ctx, next);
}

function clearCacheOnDelete(ctx, next) {
  ctx.Model.clearCacheOnDelete(ctx, next);
}
