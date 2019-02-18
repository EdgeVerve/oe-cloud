/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
const loopback = require('loopback');
const log = require('oe-logger')('boot-datasources');
/**
 * This script is responsible for adding
 *
 * @memberof Boot Scripts
 * @author Praveen Gulati (kpraveen)
 * @name Create Datasources
 */

module.exports = function DataSourcesBootFn(app, cb) {
  var dataSourceDefinitionModel = app.models.DataSourceDefinition;
  /**
 * Query DataSourceDefinition model for every record, creates actual Data Source in loopback by calling CreateDatasource() utility function
 * Ensures that ignorecontext is set to true though it is not being effective.
 * find all DataSource Definitions in the ds definition database and create them in the LB app
 * @param {Object} empty object where clause so that all records are returned
 * @returns {function} dataSourceDefinitionModelFindCb - callback that takes results and error if it is there.
 */
  var options = {};
  options.fetchAllScopes = true;
  options.ignoreAutoScope = true;
  options.bootContext = true;
  dataSourceDefinitionModel.find({}, options, function dataSourceDefinitionModelFindCb(err, results) {
    if (err) {
      log.debug(options, {
        'message': 'WARNING',
        'cause': err,
        'details': ''
      });
      return cb();
    }

    if (results && results.length) {
      results.forEach(function (r) {
        try {
          var ds = loopback.createDataSource(r);
          app.datasources[r.id] = ds;
          log.debug(log.defaultContext(), 'created real ds ', r.name);
        } catch (e) {
          log.error(log.defaultContext(), 'Error while creating data source ' + err);
        }
      });
    }
    return cb();
  });
};
