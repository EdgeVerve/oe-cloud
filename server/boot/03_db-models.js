/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var async = require('async');
var events = require('events');
var loopback = require('loopback');
var DataSource = require('loopback-datasource-juggler').DataSource;
var log = require('oe-logger')('boot-db-models');

var util = require('../../lib/common/util');

var eventEmitter = new events.EventEmitter();

/**
 * This boot script attaches hooks for the ModelDefinition model.
 * These hooks are triggered whenever the CRUD API of this models
 * are used to create a new application Model.
 * This script also creates and loads the Models defined in the ModelDefinition
 * table at server startup (boot)
 * The datasource from where modeldefinitions are to be loaded
 * is configured in server/config.json. This property is 'modeldsname' and is optional.
 * If this property is not specified in config.json, no attempt will be made to
 * load models from database.
 *
 * @memberof Boot Scripts
 * @author Ajith Vasudevan, Pradeep Kumar Tippa
 * @name DB Models
 */

module.exports = function DBModels(app, cb) {
  // Get the Model used for defining new Model Variants
  var modelDefinition = app.models.ModelDefinition;

  modelDefinition.events = eventEmitter;

  app.locals.modelNames = {};
  // console.log('app.locals.modelNames', app.locals.modelNames);
  // Add all models in the application (file based ones)
  // into the DB
  var keys = Object.keys(app.models);
  async.eachSeries(keys, function asyncForEachKey(key, callback) {
    // first disable ChangeStream for file based models
    var model = app.models[key];
    model.disableRemoteMethod('createChangeStream', true);
    app.locals.modelNames[key.toLowerCase()] = model.modelName;
    app.locals.modelNames[key] = model.modelName;
    if (key !== model.modelName) {
      return callback();
    }
    var ds = model.getDataSource(util.bootContext());
    ds.autoupdate(model.modelName, function (err, result) {
      if (err) {
        log.error(util.bootContext(), 'ds.autoupdate for model="', model.modelName, '" Error: ', err);
        return callback(err);
      }
      return findOrCreateModelDefinition();
    });
    function findOrCreateModelDefinition() {
      var modelDefinitionObject = JSON.parse(JSON.stringify(model.definition.settings));
      // add the 'name' member
      modelDefinitionObject.name = key;
      modelDefinitionObject.filebased = true;
      // store actual default datasource name and not getDataSource or using datasource switch
      // at this stage model.dataSource should be as per model-config.json file

      // modelDefinitionObject.dataSourceName = app.models[key].dataSource.settings.name;
      var ownDefinition = model._ownDefinition || {};
      // _ownDefinition is set in juggler
      modelDefinitionObject.properties = ownDefinition.properties || {};

      // to avoid crash due to max event listener check
      DataSource.super_.defaultMaxListeners = DataSource.super_.defaultMaxListeners + 1;
      modelDefinition.findOne({ 'where': { 'name': key } }, util.bootContext(), function modelDefinitionFindOneFn(err, res) {
        if (err) {
          log.error(util.bootContext(), 'modelDefinition.findOne name="', key, '" Error: ', err);
          return callback(err);
        }
        if (!res) {
          modelDefinition.create(modelDefinitionObject, util.bootContext(), function modelDefinitionCreateFn(err, res) {
            if (err) {
              log.error(util.bootContext(), 'modelDefinition.create obj=', modelDefinitionObject, ' Error: ', err);
              return callback(err);
            }
            callback();
          });
        } else {
          callback();
        }
      });
    }
  }, function dbModels() {
    var options = {};
    options.ignoreAutoScope = true;
    options.fetchAllScopes = true;

    // find all Model Definitions in the database which are non-file-based and load them
    // into the Loopback application. This would be just the user-created Model Defs.
    modelDefinition.find({
      where: {
        filebased: false
      }
    }, options, function dbModelsModelDefinitionFindCb(err, results) {
      if (err) {
        log.warn(options, {
          'message': 'WARNING',
          'cause': err,
          'details': ''
        });
        return attachBeforeSaveHook(app, cb);
      }
      if (results && results.length > 0) {
        // For each Model defined in the DB ...
        results.forEach(function dbModelsModelDefinitionFindResultsForEachFn(r) {
          util.createModel(app, r, util.bootContext(), function dbModelsModelDefinitionFindCreateModelCb() {
            log.debug(options, 'emitting event model available ', r.name);
            modelDefinition.events.emit('model-' + r.name + '-available');
          });
        });
      }
      attachBeforeSaveHook(app, cb);
    });
  });
};

// Attaching before save hook for restricting overriding of file based models
function attachBeforeSaveHook(app, cb) {
  var modelDefinition = app.models.ModelDefinition;
  modelDefinition.observe('before save', function beforeSaveHookForModelDefinitionFn(ctx, next) {
    var data = ctx.instance || ctx.data;
    // No need to check for data.filebased for true, it is already taken care in beforeRemote("**")
    // in model-definition.js
    if (typeof data !== 'undefined' && typeof data.name !== 'undefined') {
      var model = loopback.findModel(data.name);
      // Checking the model availability and is it a dynamic model.
      // When a model(A) is created with relation of another model(B), and lets say the related model(B)
      // doesn't exists, loopback will created a model with settings as {'unresolved': true}
      // So added additional check for unresolved model setting.
      if (model && model.settings && typeof model.settings.unresolved === 'undefined' && typeof model.settings._dynamicModel === 'undefined') {
        var modelFoundErr = new Error();
        modelFoundErr.name = 'Data Error';
        modelFoundErr.message = 'Model \'' + data.name + '\' is a system or filebased model. ModelDefinition doesn\'t allow overriding of it.';
        modelFoundErr.retriable = false;
        modelFoundErr.status = 422;
        next(modelFoundErr);
      } else {
        next();
      }
    } else {
      next();
    }
  });
  cb();
}
