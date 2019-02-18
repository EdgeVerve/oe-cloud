/**
 *
 * �2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
// This file implements before save/after save hook to create model when record is posted to ModelDefinition
// This file will ultimately create Model in oeCloud and raise event.
var loopback = require('loopback');

module.exports = (ModelDefinition) => {
  ModelDefinition.observe('after save', (ctx, next) => {
    var app = ModelDefinition.app;
    var r = ctx.instance || ctx.currentInstance;
    var instance = Object.assign({}, r);
    var ds = app.dataSources.db;
    if (r.dataSourceName && app.dataSources[r.dataSourceName]) {
      ds = app.dataSources[r.dataSourceName];
    }
    if (r.filebased) {
      return next();
    }
    var model = loopback.createModel(r);
    ds.attach(model);
    app.model(model);

    ModelDefinition.emit('model-' + r.modelName + '-available', { context: ctx, model: model });
    r = instance;
    return next();
  });

  ModelDefinition.observe('before save', (ctx, next) => {
    var r = ctx.instance || ctx.currentInstance;
    if (!r.mixins) {
      r.mixins = {};
    }
    if (!r.base) {
      r.base = 'BaseEntity';
    }
    return next();
  });
};
