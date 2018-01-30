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
        var resModel = loopback.findModel(Model.modelName, ctx.req.callContext);
        if (!resModel) {
          var msg = 'Unknown model or not authorised';
          log.error(ctx.req.callContext, msg + ' for model ' + Model.modelName);
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
        next();
      } else {
        return next();
      }
    });
    if (Model.modelName !== 'BaseEntity' && Model.modelName !== 'DbTransaction' && Model.definition.settings.variantOf) {
      Model.evObserve('after accesss', getDataFromBaseModels);
    }

    if (BaseEntity.modelName === 'BaseEntity') {
      return;
    }
  };
};

const getDataFromBaseModels = function getDataFromBaseModels(ctx, next) {
  let result = ctx.accdata || [];
  const modelSettings = ctx.Model.definition.settings;
  if (modelSettings.variantOf) {
    var variantModel = loopback.findModel(modelSettings.variantOf);
    if (variantModel) {
      if (isSameCollection(variantModel.definition.settings, modelSettings)) {
        return next();
      }
      variantModel.find(ctx.query, ctx.options, function (err, variantData) {
        if (err) {
          return next(err);
        }
        if (variantData && variantData.length) {
          result = result.concat(variantData);
          ctx.accdata = result;
        }
        return next();
      });
    } else {
      return next();
    }
  } else {
    return next();
  }
};

/**
 * This function is used to find whether whether variant model use same collection.
 *
 * @param {object}settings1 - settings of first model
 * @param {object}settings2 - settings of second model
 * @returns {boolean} - returns true for same collection.
 * @function
 */
const isSameCollection = function isSameCollection(settings1, settings2) {
  if (!settings1.mongodb || !settings2.mongodb) {
    return false;
  }
  var collection1 = settings1.mongodb.collection;
  if (collection1) { collection1 = collection1.toLowerCase(); }
  var collection2 = settings2.mongodb.collection;
  if (collection2) { collection2 = collection2.toLowerCase(); }
  if (collection1 === collection2) { return true; }
  return false;
};
