/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * @classdesc This is the companion js file of the DataSourceMapping Model, which gets executed
 * once during the lifetime of the application (at the time of DataSourceMapping  model creation)
 * This model maitains mapping between datasource and model for a context. This is derived from baseEntity
 * @kind class
 * @author Praveen/Atul
 * @class DataSourceMapping
 */

module.exports = function dataSourceMappingModelFn(dataSourceMappingModel) {
  /**
   * update datasource mapping in memory used for datasource switch mixin
   * This will keep data base and in memory collection in sync
   *
   * @param {object} ctx - save context which contains data
   * @param {function} next - next continuation callback
   */

  //
  dataSourceMappingModel.observe('after save', function dataSourceMappingAfterSave(ctx, next) {
    var mapping = ctx.instance;
    if (!mapping) {
      return next();
    }

    var app = dataSourceMappingModel.app;
    app.locals.dataSourceMappings = app.locals.dataSourceMappings || {};
    app.locals.dataSourceMappings[mapping.modelName] = app.locals.dataSourceMappings[mapping.modelName] || [];
    var idx = app.locals.dataSourceMappings[mapping.modelName].findIndex(function findById(element, index, array) {
      // converting id (bson object) into string and comparing the ids.
      if (element.id.toString() === mapping.id.toString()) {
        return true;
      }
      return false;
    });

    if (idx >= 0) {
      app.locals.dataSourceMappings[mapping.modelName][idx] = mapping;
    } else {
      app.locals.dataSourceMappings[mapping.modelName].push(mapping);
    }
    return next();
  });

  // after delete
  dataSourceMappingModel.observe('after delete', function dataSourceMappingBeforeDelete(ctx, next) {
    next();
  });
};
