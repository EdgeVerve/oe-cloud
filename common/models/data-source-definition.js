/**
 *
 * �2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

/**
 * @classdesc This model is to hold DataSourceDefinition, actual data sources created of application
 * This is used to create / delete data source dynamically
 * Only admin guys should have access to this model
 * @kind class
 * @author Praveen/Atul
 * @class DataSourceDefinition
 */

const loopback = require('loopback');

module.exports = function (Model) {
  /*
   * 'after save' - hook is used to create actual data source in loopback
   * User posts the data to DataSourceDefinition model and then this hoook is executed
   * when data is saved. After that this hook uses utility function to create data source
   *
   * @param {object} ctx - saved data context which contains actual data saved
   * @param {function} next - next: a callback function for continuation
   */
  Model.observe('after save', function (ctx, next) {
    var app = ctx.Model.app;
    var inst = ctx.instance;
    var ds = loopback.createDataSource(inst);
    app.datasources[inst.id] = ds;
    return next();
  });
};
