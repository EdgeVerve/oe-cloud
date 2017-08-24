/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

/* This mixin is for auto populate scope overriding manual scope

*/
/* @mixin Property expression mixin*/
/* @author dipayan_aich*/
var logger = require('oe-logger');
var log = logger('auto-fields-mixin');
var autofields = require('../../lib/auto-fields');
var async = require('async');

module.exports = function AutoFieldsMixin(Model) {
  if (Model.modelName === 'BaseEntity') {
    return;
  }

  if ((Model.settings.overridingMixins && !Model.settings.overridingMixins.AutoFieldsMixin) || !Model.settings.mixins.AutoFieldsMixin) {
    Model.evRemoveObserver('before save', autoFieldMixinBeforeSave);
  } else {
    Model.observe('before save', autoFieldMixinBeforeSave);
  }
};

/**
 * This 'before save' hook is used to intercept data being
 * POSTed using the Loopback API and automatically set properties
 * which are marked with a "setval" : <pattern-string> ) before saving
 * the data to database. This feature is
 * applicable to Models that derive from BaseEntity only.
 * The pattern-string should be a dot ('.') separated set of
 * string values. The first value determines the "source object"
 * from where a value needs to be picked up and set to the specified property.
 * This first value (source) can be one of BODY, QUERY, HEADER,
 * COOKIE, REQUEST, CTX, CALLCONTEXT, ACCESSTOKEN, USER or USERPROFILE.
 *
 *  A property declared to be auto-populated using this feature will always
 *  override the value, if sent from the client. i.e., the system-generated
 *  value will overwrite the value supplied by the client in the API (POST, for e.g.,)
 *
 *
 * @memberof Auto Field Mixin
 * @param  {Object} ctx - call context
 * @param  {function} next - callback function
 * @function
 */
function autoFieldMixinBeforeSave(ctx, next) {
  var data = ctx.instance || ctx.currentInstance || ctx.data;
  var props = ctx.Model.definition.properties;
  log.debug(ctx.options, 'BaseEntity before save called for auto-population: ModelName =', ctx.Model.modelName);

  async.forEachOf(props, function baseEntityObserveBeforeSaveSetValAsyncForEachPropsCb(value, key, callback) {
    var propprops = ctx.Model.definition.properties[key];
    if (propprops.setval) {
      log.debug(ctx.options, 'To be set:', key, propprops.setval);
      autofields({
        'pattern': propprops.setval
      }, ctx.options, function baseEntityObserveBeforeSaveSetValAsyncForEachPropsAutoFieldsCb(val) {
        data[key] = val;
        callback();
      });
    } else {
      callback();
    }
  }, function baseEntityObserveBeforeSaveSetValAsyncForEachCb(err) {
    if (err) {
      log.error(ctx.options, err.message);
    }
    next();
  });
}
