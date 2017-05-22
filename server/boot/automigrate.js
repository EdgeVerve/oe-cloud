/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This script is used to auto-migrate model schema to relational databases.
 * It fetches all the relational datasources attached to a model and create tables
 * corresponding to the respectives schemas.
 *
 * Whenever the model schema changes the table schema is updated with respect to the change
 * without dropping and recreating the table in the database thus preventing any loss of data.
 *
 * @memberof Boot Scripts
 * @author Pragyan Das
 * @name AutoMigrate
 */

// var async = require('async');
// var log = require('../../lib/logger')('automigrate');

/**
 * @param  {[object]} app [server application object]
 * @param  {Function} cb  [callback]
 */

module.exports = function fnAutoMigrate(app, cb) {
  return cb();
/*
  Temorary commented code.will be removed soon.
  //DataSourceMapping Model
  var dsMappingModel = app.models.DataSourceMapping;

  //Get all the datasources
  var datasources = app.datasources;

  //Initialize mapping array which contains modelName and datasource mapping
  var dsModelMapping = [];

  if (datasources && Object.keys(datasources).length) {

    //The object which contains all the relational datasources
    //mapped with key as name and value as datasource
    var relationalDataSources = {};
    Object.keys(datasources).forEach(function fnRelDS(dsId) {
      var ds = datasources[dsId];
      if (ds && ds.isRelational()) {
        relationalDataSources[ds.settings.name] = ds;
      }
    });

    //Iterate on all the models to find out the attached datasources to the model
    //and identify the datasource.
    //If the datasource is relational add the pair to the mapping
    Object.keys(app.models).forEach(function fnAllModels(modelName) {
      var model = app.models[modelName];
      if (!model.settings.isFrameworkModel && model.dataSource) {
        var dsName = model.dataSource.settings.name;
        if (relationalDataSources.hasOwnProperty(dsName)) {
          dsModelMapping.push({
            modelName: model.modelName,
            ds: relationalDataSources[dsName]
          });
        }
      }
    });

    var options = {};
    options.fetchAllScopes = true;
    //Search the DataSourceMapping model for all the mappings of model and datasources
    //If the attached datasource is relational add the pair to the mapping.
    dsMappingModel.find({}, options, function fnFetchMappings(err, mappings) {
      if (err) {
        log.debug(options, {
          'message': 'WARNING',
          'cause': err,
          'details': ''
        });
        return cb();
      }
      mappings.forEach(function fnIterateMapping(mapping) {
        if (relationalDataSources.hasOwnProperty(mapping.dataSourceName)) {
          dsModelMapping.push({
            modelName: mapping.modelName,
            ds: relationalDataSources[mapping.dataSourceName]
          });
        }
      });
    });

    //If there exists pair/pairs of relational datasources and model
    //then proceed with creation of tables in the relational databases.
    if (dsModelMapping.length > 0) {
      async.map(dsModelMapping, function fnDSModelMapping(obj, callback) {
        obj.ds.autoupdate(obj.modelName, function fnDSAutoUpdate(err) {
          log.info(log.defaultContext(), 'Table created for', obj.modelName, ' in database ', obj.ds.settings.database);
          callback(err, null);
        });
      },
        function fnDSModelMappingCb(err, results) {
          //Switching off the ignore context flag.
          if (err) {
            log.debug(log.defaultContext(), {
              'message': 'WARNING',
              'cause': err,
              'details': ''
            });
            return cb();
          }
          cb();
        });
    } else {
      //Switching off the ignore context flag.
      cb();
    }

  } else {
    //Switching off the ignore context flag.
    cb();
  }*/
};
