/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var util = require('../../lib/common/util');
var log = require('../../lib/logger')('boot-db-models');
var events = require('events');
var DataSource = require('loopback-datasource-juggler').DataSource;
var async = require('async');

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
 * @author Ajith Vasudevan
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
    app.models[key].disableRemoteMethod('createChangeStream', true);
    app.locals.modelNames[key.toLowerCase()] = app.models[key].modelName;
    app.locals.modelNames[key] = app.models[key].modelName;
    if (key !== app.models[key].modelName) {
      return callback();
    }

    var modelDefinitionObject = JSON.parse(JSON.stringify(app.models[key].definition.settings));
    // add the 'name' member
    modelDefinitionObject.name = key;
    modelDefinitionObject.filebased = true;
    // store actual default datasource name and not getDataSource or using datasource switch
    // at this stage model.dataSource should be as per model-config.json file

    // modelDefinitionObject.dataSourceName = app.models[key].dataSource.settings.name;
    var ownDefinition = app.models[key]._ownDefinition || {};
    // _ownDefinition is set in juggler
    modelDefinitionObject.properties = ownDefinition.properties || {};

    // to avoid crash due to max event listener check
    DataSource.super_.defaultMaxListeners = DataSource.super_.defaultMaxListeners + 1;
    modelDefinition.findOne({ 'where': { 'name': key } }, util.bootContext(), function modelDefinitionFindOneFn(err, res) {
      if (err) {
        callback(err);
      }
      if (!res) {
        modelDefinition.create(modelDefinitionObject, util.bootContext(), function modelDefinitionCreateFn(err, res) {
          if (err) {
            callback(err);
          }
          callback();
        });
      } else {
        callback();
      }
    });
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
        return cb();
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
      cb();
    });
  });
};
