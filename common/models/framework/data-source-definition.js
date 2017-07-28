/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var util = require('../../../lib/common/util');

/**
 * @classdesc This model is to hold DataSourceDefinition, actual data sources created of application
 * This is used to create / delete data source dynamically
 * Only admin guys should have access to this model
 * @kind class
 * @author Praveen/Atul
 * @class DataSourceDefinition
 */

module.exports = function dataSourceDefinitionModelFn(dataSourceDefinitionModel) {
  /*
   * 'after save' - hook is used to create actual data source in loopback
   * User posts the data to DataSourceDefinition model and then this hoook is executed
   * when data is saved. After that this hook uses utility function to create data source
   *
   * @param {object} ctx - saved data context which contains actual data saved
   * @param {function} next - next: a callback function for continuation
   */
  dataSourceDefinitionModel.observe('after save', function dataSourceDefinitionAfterSave(ctx, next) {
    var dataSourceDefn = ctx.instance;
    util.createDataSource(ctx.Model.app, dataSourceDefn, ctx.options);
    return next();
  });
  /**
   * 'before delete' - hook is used to delete data source from loopback.
   * User deletes a records from DataSourceDefinition model this is executed.
   * @param {object} ctx - data context which contains actual data
   * @param {function} next - next: a callback function for continuation
   */
  dataSourceDefinitionModel.observe('before delete', function dataSourceDefinitionBeforeDelete(ctx, next) {
    var where = ctx.where;
    dataSourceDefinitionModel.find({
      where: where
    }, ctx.options, function dataSourceDefinitionModelBeforeDeleteFindCb(err, results) {
      if (err) {
        ctx.Model.app.handleError({
          'message': 'Database error while trying to fetch DataSourceDefinitions from DS Definition DB',
          'cause': err,
          'details': ''
        });
        return next();
      }
      results.forEach(function dataSourceDeleteFn(r) {
        util.deleteDatasource(ctx.Model.app, r);
      });
    });
    next();
  });
};
