/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

/* This mixin is for xmodel validate 

*/
/* @author dipayan_aich*/
var logger = require('oe-logger');
var log = logger('xmodel-validate-mixin');
var async = require('async');
var loopback = require('loopback');

module.exports = function XModelValidateMixin(Model) {
  if (Model.modelName === 'BaseEntity') {
    return;
  }
  if ((Model.settings.overridingMixins && !Model.settings.overridingMixins.XModelValidateMixin) || !Model.settings.mixins.XModelValidateMixin) {
    Model.evRemoveObserver('before save', xModelValidateMixinBeforeSave);
  } else {
    Model.observe('before save', xModelValidateMixinBeforeSave);
  }
};

/**
 * This 'before save' hook is used to intercept data being POSTed
 * using the Loopback API and automatically validate property values
 * for existence in any other Model-field. For this validation to happen,
 * properties should be declared with a
 * "xmodelvalidate" : {"model":<Model>, "field": <Field>}
 * where <Model> is the other Model against whose data validation needs
 * to be done, and <Field> is the specific field of <Model> that is queried
 * for validation.
 *
 *
 * Ajith
 */
function xModelValidateMixinBeforeSave(ctx, next) {
  var data = ctx.instance || ctx.currentInstance || ctx.data;
  var props = ctx.Model.definition.properties;
  log.debug(ctx.options, 'BaseEntity before save called for cross-model validation: ModelName =', ctx.Model.modelName);

  async.forEachOf(props, function baseEntityObserveBeforeSaveXModelValidateForEachPropCb(value, key, callback) {
    var propprops = ctx.Model.definition.properties[key];
    if (propprops.xmodelvalidate && propprops.xmodelvalidate.model && propprops.xmodelvalidate.field) {
      log.debug(ctx.options, 'To be validated:', data[key], 'against', propprops.xmodelvalidate);
      var Model = loopback.findModel(propprops.xmodelvalidate.model, ctx.options);
      if (!Model) {
        return callback();
      }
      var filter = {};
      filter[propprops.xmodelvalidate.field] = data[key];
      Model.findOne({
        where: filter
      }, ctx.options, function baseEntityObserveBeforeSaveXModelValidateForEachPropFindCb(err, data) {
        if (err) {
          callback(err);
        }
        if (!(data)) {
          var err1 = new Error('Invalid ' + ctx.Model.modelName + '-->' + key + '. Should exist in ' + propprops.xmodelvalidate.model);
          err1.retriable = false;
          callback(err1);
        } else {
          callback();
        }
      });
    } else {
      callback();
    }
  }, function baseEntityObserveBeforeSaveXModelValidateForEachCb(err) {
    if (err) {
      log.error(ctx.options, err.message);
      next(err);
    } else {
      next();
    }
  });
}
