/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @classdesc This Model is the base of most models used in the Framework.
 * This model defines hooks to intercept data being
 * POSTed to models derived from this model and do the following:<br>
 * <ul>
 * <li> encrypt properties (which are marked with an "encrypt" : true ) before saving
 * the data to database. <br>
 * <li> decrypted properties (which are marked with an "encrypt" : true ) when fetching
 * data from the model API<br>
 * <li> automatically set properties
 * which are marked with a "setval" : <pattern-string> ) before saving
 * the data to database.
 * The pattern-string should be a dot ('.') separated set of
 * string values. The first value determines the "source object"
 * from where a value needs to be picked up and set to the specified property.
 * This first value (source) can be one of BODY, QUERY, HEADER,
 * COOKIE, REQUEST, CTX, CALLCONTEXT, ACCESSTOKEN, USER or USERPROFILE.<br>
 *  A property declared to be auto-populated using this feature will always
 *  override the value, if sent from the client. i.e., the system-generated
 *  value will overwrite the value supplied by the client in the API (POST, for e.g.,)<br>
 * <li> validate property values
 * for existence in any other Model-field. For this validation to happen,
 * properties should be declared with a<br>
 * "xmodelvalidate" : {"model":<Model>, "field": <Field>}<br>
 * where <Model> is the other Model against whose data validation needs
 * to be done, and <Field> is the specific field of <Model> that is queried
 * for validation.
 * </ul>
 * @kind class
 * @class BaseEntity
 * @author Ajith Vasudevan
 */

var autofields = require('../../../lib/auto-fields');
var async = require('async');
var loopback = require('loopback');
var logger = require('oe-logger');
var log = logger('baseentity');

module.exports = function BaseEntityFn(BaseEntity) {
  BaseEntity.setup = function setupBaseEntity() {
    BaseEntity.base.setup.call(this, arguments);
    var Model = this;


    Model.beforeRemote('**', function modelBeforeRemote(ctx, model, next) {
      var method = ctx.method;
      var Model = method.ctor;
      // for now taking care of only scope
      // so a different tenant will still be able to access
      // but still with same scope
      if (Model && Model._ownDefinition && Model._ownDefinition.scope) {
        var ModelDefinition = loopback.getModel('ModelDefinition');
        ModelDefinition.findOne(
          { where: { name: Model.modelName } },
          ctx.req.callContext, function reqCallContext(err, instance) {
            if (err) {
              return next(err);
            }
            if (!instance) {
              var msg = 'Unknown model or not authorised';
              var error = new Error(msg);
              error.statusCode = error.status = 404;
              error.code = 'MODEL_NOT_FOUND';
              error.name = 'Data Error';
              error.message = msg;
              error.code = 'DATA_ERROR_070';
              error.type = 'noModelExists';
              error.retriable = false;
              return next(error, null);
            }
            return next();
          });
      } else {
        return next();
      }
    });
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
   * Ajith
   */
  BaseEntity.observe('before save', function baseEntityObserveBeforeSaveSetValCb(ctx, next) {
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
  });

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
  BaseEntity.observe('before save', function baseEntityObserveBeforeSaveXModelValidateCb(ctx, next) {
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
  });
};
