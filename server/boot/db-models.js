/**
 *
 * 2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */


// Author : Atul
// This file loads/creates models from ModelDefinition table from database
const log = require('oe-logger')('boot-db-models');
const loopback = require('loopback');
const modelDefinition = loopback.findModel('ModelDefinition');
const async = require('async');
const _ = require('lodash');

function loadModelsFromDB(app, cb) {
  // design break when used fetchAllScopes
  modelDefinition.find({where: {filebased: false}}, {fetchAllScopes: true}, (err, result) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('******* Could not able to load models from Database ********* ');
      return cb();
    }
    if (result && result.length > 0) {
      var ds = app.dataSources.db;
      result.forEach((r) => {
        var model = loopback.createModel(r);
        ds.attach(model);
        app.model(model);
      });
    }
    return cb();
  });
}

function filterProperties(modelxDefinition, modelDefinitionObject) {
  var keys = Object.keys(modelDefinitionObject);
  keys.forEach(function (k) {
    if ( k !== 'name' && !modelDefinition.definition.properties.hasOwnProperty(k)) {
      log.info('Ignoring %s field from %s model.', k, modelDefinitionObject.name);
      delete modelDefinitionObject[k];
    }
  });
  return modelDefinitionObject;
}

function saveModelsToDB(app, cb) {
  var models = Object.keys(app.models);

  async.eachSeries(models, (name, done) => {
    var model = app.models[name];

    var modelDefinitionObject = JSON.parse(JSON.stringify(model.definition.settings));
    modelDefinitionObject.filebased = true;
    // _ownDefinition is set in juggler
    var ownDefinition = model._ownDefinition || {};
    modelDefinitionObject.name = model.name;

    modelDefinitionObject.properties = !_.isEmpty(ownDefinition) ? ownDefinition.properties : {};
    modelDefinitionObject = filterProperties(modelDefinition, modelDefinitionObject);

    modelDefinition.findOne({where: { name: model.name } }, {fetchAllScopes: true}, function modelDefinitionFindOneFn(err, modelDef) {
      if (err) {
        log.error(log.defaultContext(), 'modelDefinition.findOne name="', name, '" Error: ', err);
        return done(err);
      }
      if (!modelDef) {
        modelDefinitionObject.filebased = true;
        modelDefinition.create(modelDefinitionObject, {fetchAllScopes: true}, function modelDefinitionCreateFn(err, res) {
          if (err) {
            log.error(log.defaultContext(), 'modelDefinition.create obj=', modelDefinitionObject, ' Error: ', err);
          }
          return done();
        });
      } else {
        return done();
      }
    });
  }, (err) => {
    if (err) {return cb(err);}
    loadModelsFromDB(app, cb);
  });
}


module.exports = function (app, cb) {
  return saveModelsToDB(app, cb);
};
