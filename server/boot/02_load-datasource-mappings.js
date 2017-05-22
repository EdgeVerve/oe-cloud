/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This script is responsible for adding
 *
* @memberof Boot Scripts
* @author Praveen Gulati
* @name Load DataSource Mapping
 */

var log = require('../../lib/logger')('boot-datasources');

module.exports = function LoadDataSourceMappings(app, cb) {
  var model = app.models.DataSourceMapping;

  app.locals.dataSourceMappings = app.locals.dataSourceMappings || {};

  // store default data Source for file based models
  app.locals.defaultDataSources = {};
  for (var key in app.models) {
    if (app.models.hasOwnProperty(key)) {
      app.locals.defaultDataSources[key] = app.models[key].dataSource;
    }
  }

  var options = {};
  options.fetchAllScopes = true;
  // find all DataSource Mappings and cache them for getDataSource
  model.find({}, options, function fetchMappings(err, results) {
    if (err) {
      log.debug(options, {
        'message': 'WARNING',
        'cause': err,
        'details': ''
      });
      return cb();
    }
    results.forEach(function setdsmap(mapping) {
      app.locals.dataSourceMappings[mapping.modelName] = app.locals.dataSourceMappings[mapping.modelName] || [];
      app.locals.dataSourceMappings[mapping.modelName].push(mapping);
    });
    cb();
  });
};
