/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * This boot script brings the ability to apply data ACL to the model.
 *
 * @memberof Boot Scripts
 * @author Pradeep Kumar Tippa
 * @name DataACL
 */
var loopback = require('loopback');
var log = require('oe-logger')('data-acl-boot');

var messaging = require('../../lib/common/global-messaging');

var dataACLModel;
var appinstance;

module.exports = function DataACL(app, cb) {
  log.debug(log.defaultContext(), 'In data-acl.js boot script.');
  appinstance = app;
  dataACLModel = app.models.DataACL;
  // Creating 'before save' and 'after save' observer hooks for DataACL
  dataACLModel.observe('before save', dataACLBeforeSave);
  dataACLModel.observe('after save', dataACLAfterSave);
  // TODO: Need to check whether to introduce 'disabled' property for DataACL
  var filter = {};
  // Creating options to retrieve all DataACL records from DB
  var options = {
    ignoreAutoScope: true,
    fetchAllScopes: true
  };
  // Using fetchAllScopes and ignoreAutoScope to retrieve all the records from DB. i.e. from all tenants.
  dataACLModel.find(filter, options, function (err, results) {
    log.debug(log.defaultContext(), 'dataACLModel.find executed.');
    if (err) {
      log.error(log.defaultContext(), 'dataACLModel.find error. Error', err);
      cb(err);
    } else if (results && results.length > 0) {
      // The below code for the if clause will not executed for test cases with clean/empty DB.
      // In order to execute the below code and get code coverage for it we should have
      // some rules defined for some models in the database before running tests for coverage.
      log.debug(log.defaultContext(), 'Some dataACL\'s are present, on loading of this DataACL model');
      for (var i = 0; i < results.length; i++) {
        // No need to publish the message to other nodes, since other nodes will attach the hooks on their boot.
        // Attaching all models(DataACL.model) before save hooks when DataACL loads.
        // Passing directly model without checking existence since it is a mandatory field for DataACL.
        attachBeforeRemoteHookToModel(results[i].model, {ctx: results[i]._autoScope});
      }
      cb();
    } else {
      log.debug(log.defaultContext(), 'there are no dataACL\'s present');
      cb();
    }
  });
};

// Subscribing for messages to attach 'before save' hook for modelName model when POST/PUT to DataACL.
messaging.subscribe('dataACLAttachHook', function (modelName, options) {
  // TODO: need to enhance test cases for running in cluster and send/recieve messages in cluster.
  log.debug(log.defaultContext(), 'Got message to attach remote hook for dataACL for model', modelName);
  attachBeforeRemoteHookToModel(modelName, options);
});

/**
 * This function is before save hook for DataACL model.
 *
 * @param {object} ctx - Model context
 * @param {function} next - callback function
 */
function dataACLBeforeSave(ctx, next) {
  log.debug(log.defaultContext(), 'In dataACLBeforeSave method.');
  var data = ctx.data || ctx.instance;
  // It is good to have if we have a declarative way of validating model existence.
  var modelName = data.model;
  if (loopback.findModel(modelName, ctx.options)) {
    log.debug(log.defaultContext(), 'Model ', modelName, ' exists. Continuing DataACL save.');
    next();
  } else {
    log.error(log.defaultContext(), 'Model ', modelName, ' doesnt exists. Sending error response.');
    // Not sure it is the right way to construct error object to sent in the response.
    var err = new Error('Model \'' + modelName + '\' doesn\'t exists.');
    next(err);
  }
}

/**
 * This function is after save hook for DataACL model.
 *
 * @param {object} ctx - Model context
 * @param {function} next - callback function
 */
function dataACLAfterSave(ctx, next) {
  log.debug(log.defaultContext(), 'dataACLAfterSave method.');
  var data = ctx.data || ctx.instance;
  // Publishing message to other nodes in cluster to attach the 'before save' hook for model.
  messaging.publish('dataACLAttachHook', data.model, ctx.options);
  log.debug(log.defaultContext(), 'modelRuleAfterSave data is present. calling attachBeforeSaveHookToModel');
  attachBeforeRemoteHookToModel(data.model, ctx.options);
  next();
}

/**
 * This function is to attach before remote hook for given modelName to apply dataACL.
 *
 * @param {string} modelName - Model name
 * @param {Object} options - Context options
 */
function attachBeforeRemoteHookToModel(modelName, options) {
  var model = loopback.findModel(modelName, options);
  // Checking the flag that DataACL exists and attaching the hook
  if (!model.settings._dataACLExists) {
    model.settings._dataACLExists = true;
    // Attaching beforeRemote hook to model to do the DataACL applyFilter
    model.beforeRemote('**', function (ctx, modelInstance, next) {
      var proxyKey = appinstance.get('evproxyInternalKey') || '97b62fa8-2a77-458b-87dd-ef64ff67f847';
      if (ctx.req && ctx.req.headers && proxyKey) {
        if (ctx.req.headers['x-evproxy-internal-key'] === proxyKey) {
          return next();
        }
      }
      dataACLModel.applyFilter(ctx, next);
    });
  }
}
