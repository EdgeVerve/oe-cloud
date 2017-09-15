/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

/**
 * This boot script override the existing loopback findModel, getModel and getModelById.
 * The new implementation take the options as second argument and
 *  gives personalized model based on options.
 *
 * @memberof Boot Scripts
 * @author Ramesh Choudhary
 * @name MethodOverride
 */

const loopback = require('loopback');
const util = require('../../lib/common/util');

module.exports = (app, cb) => {
  const actualFindModel = loopback.findModel;
  const actualGetModel = loopback.getModel;
  const actualGetModelByType = loopback.getModelByType;
  app.personalizedModels = {};
  const getContextBasedModel = (modelName, options, actualMethod) => {
    if (!(options && options.ctx)) {
      return actualMethod.call(app, modelName);
    }

    const personalizedModel = getPersonalizedModel(modelName, options.ctx);
    modelName = personalizedModel && personalizedModel.modelId ? personalizedModel.modelId : modelName;
    var model = actualMethod.call(app, modelName);
    if (model) {
      return model;
    }
    return null;
  };

  const getPersonalizedModel = (modelName, ctx) => {
    const modelDefinition = loopback.getModel('ModelDefinition');
    const autoscopeFields = modelDefinition.definition.settings.autoscope;
    const ctxStr = util.createContextString(autoscopeFields, ctx);
    const model = app.personalizedModels[modelName] && app.personalizedModels[modelName][ctxStr] ? app.personalizedModels[modelName][ctxStr] : null;
    if (model) {
      return model;
    }
    return getDefaultPersonalizedModels(modelName, autoscopeFields, ctx);
  };

  const getDefaultPersonalizedModels = (modelName, autoscope, ctx) => {
    let length = autoscope.length;
    for (let i = 0; i < Math.pow(2, length); i++) {
      let elem = [];
      var binary = decimalToBinary(i, length);
      for (let j = 0; j < length; j++) {
        if (binary[j] === '1') {
          elem.push('default');
        } else {
          elem.push(ctx[autoscope[j]]);
        }
      }
      var element = elem.join('-');
      if (app.personalizedModels[modelName] && app.personalizedModels[modelName][element]) {
        return app.personalizedModels[modelName][element];
      }
    }
    return null;
  };
  const decimalToBinary = (decimal, length) => {
    var out = '';
    while (length--) { out += (decimal >> length) & 1; }
    return out;
  };

  loopback.findModel = (modelName, options) => {
    return getContextBasedModel(modelName, options, actualFindModel);
  };

  loopback.getModel = (modelName, options) => {
    let model = getContextBasedModel(modelName, options, actualGetModel);
    if (model) {
      return model;
    }
    let err = new Error();
    err.name = 'Model Not Found';
    err.message = `Could not find the model ${modelName}`;
    err.code = 'MODEL_NOT_FOUND';
    err.retriable = false;
    return err;
  };

  loopback.getModelByType = (modelName, options) => {
    let model = getContextBasedModel(modelName, options, actualGetModelByType);
    if (model) {
      return model;
    }
    let err = new Error();
    err.name = 'Model Not Found';
    err.message = `Could not find the model ${modelName}`;
    err.code = 'MODEL_NOT_FOUND';
    err.retriable = false;
    return err;
  };

  cb();
};
