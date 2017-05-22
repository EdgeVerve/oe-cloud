/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var util = require('../../../lib/common/util');
var debug = require('debug')('db-models');
var log = require('../../../lib/logger')('model-definition');
var inflection = require('inflection');
var loopback = require('loopback');
var uuid = require('node-uuid');
var _ = require('lodash');
var modelPersonalizer = require('../../../lib/model-personalizer');
var config = require('../../../server/config');

module.exports = function ModelDefintionFn(modelDefinition) {
  // Prevent creation of ModelDefinitions with filebased: true using the REST API
  modelDefinition.beforeRemote('**', function dbModelsModelDefinitionBeforeRemoteFn(ctx, model, next) {
    var modeldefinition = ctx.args.data;
    if ((ctx.req.method === 'POST' || ctx.req.method === 'PUT') && modeldefinition.filebased === true) {
      var msg = 'ERROR: \'filebased\' should be false for ModelDefinitions created via REST API';
      log.error(ctx.req.callContext, msg);
      var err = new Error(msg);
      err.retriable = false;
      return next(err);
    }
    modeldefinition = ctx.args;
    log.debug(ctx.req.callContext, 'modeldefinition', modeldefinition);

    if (ctx.req.method === 'DELETE') {
      modelDefinition.find({
        'where': {
          'id': modeldefinition.id
        }
      }, ctx.req.callContext, function dbModelsModelDefinitionBeforeRemoteModelDefFindCb(err, data) {
        if (err) {
          log.info(ctx.req.callContext, err);
          return next();
        }
        log.debug(ctx.req.callContext, 'data', data);
        if (!(data && data.length && data.length === 1)) {
          return next();
        }
        log.debug(ctx.req.callContext, 'data[0].name', data[0].name);
        // PKGTODO hasDependency to be rewritten to check with model and not with app
        //  if (hasDependency(app, data[0].name)) {
        //     var msg = 'ERROR: Other models are dependent on this model (' + data[0].name + '). Please delete/modify them and try again.';
        //     log.info(ctx.req.callContext, msg);
        //     var err1 = new Error(msg);
        //     err1.retriable = false;
        //     return next();
        // }
        next();
      });
    } else {
      next();
    }
  });

  /**
   * This is helper function and is called from Before Save Hook for ModelDefinition. This function handles mongodb specific logic
   * Basically, if mongodb parameter is not set by User  will set it to default to model name.
   * However if model is being personalized by having variantOf field set, it will use parent model's collection name
   * @callback
   * @param {object} modeldefinition - The ModelDefinition object being posted for save operation
   * @param {object} ctx - The context object containing the model instance.
   * @param {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
   * @returns {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
   */
  function mongoSpecificHandling(modeldefinition, ctx, next) {
    if (!modeldefinition.mongodb) {
      debug('Posted modeldefinition does not have the \'mongodb\' property');
      if (modeldefinition.variantOf) {
        debug('Posted modeldefinition has the \'variantOf\' property');
        var parentVariantModel = loopback.findModel(modeldefinition.variantOf);
        if (parentVariantModel) {
          debug('Found a parent model (not a variant itself)');
          var parentVariantMongodbParam = parentVariantModel.definition.settings.mongodb;
          if (parentVariantMongodbParam) {
            var parentVariantCollectionName = parentVariantMongodbParam.collection;
            if (parentVariantCollectionName) {
              modeldefinition.mongodb = {
                collection: parentVariantCollectionName
              };
            }
          }
          return next();
        }
        debug('Did not find a parent model (not a variant itself). Looking for parent which is itself a variant');
        modelDefinition.findOne({
          where: {
            'clientModelName': modeldefinition.variantOf
          }
        }, ctx.options, function findOneCb(err, data) {
          if (!err && data) {
            debug('Found a parent model which is a variant itself');
            var parentVariantMongodbParam = data.mongodb;
            if (parentVariantMongodbParam) {
              debug('A:it has the mongodb property', parentVariantMongodbParam);
              var parentVariantCollectionName = parentVariantMongodbParam.collection;
              if (parentVariantCollectionName) {
                modeldefinition.mongodb = {
                  collection: parentVariantCollectionName
                };
              }
            }
          }
          // return next();
        });
      } else {
        debug('Posted modeldefinition does not have the \'variantOf\' property');
        modeldefinition.mongodb = {
          collection: modeldefinition.name
        };
        return next();
      }
    } else {
      return next();
    }
  }

  /**
   * This Before Save Hook for ModelDefinition is responsible for adding the filebased flag,
   * the base value of BaseEntity as default, changing the model name in case the model is a variant,
   * validation that the base specified is BaseEntity or a model derived from BaseEntity
   * and handling variants in case of non-Mongo DBs.
   * @callback
   * @param {object} ctx - The context object containing the model instance.
   * @param {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
   */
  var mdBeforeSave = function mdBeforeSave(ctx, next) {
    log.debug(ctx.options, 'DEBUG: boot/db-models.js: ModelDefinition Before save called.');
    var modeldefinition = ctx.instance || ctx.currentInstance || ctx.data;
    // check the validitiy of modeldefinition(like checking the validity of expressions attached to a model)
    util.isModelDefinitionValid(modeldefinition, ctx.options, function checkModelDefinitionValidCb(err) {
      // if model is not valid then pass the error forward and do not create the model
      if (err && err.length > 0) {
        return next(err);
      }
      if (!modeldefinition.filebased) {
        if (!modeldefinition.plural && modeldefinition.name) {
          modeldefinition.plural = createPlural(modeldefinition.name);
          log.debug(ctx.options, 'Created plural ', modeldefinition.plural, 'for model', modeldefinition.name);
        }
        if (!modeldefinition.base) {
          modeldefinition.base = 'BaseEntity';
        }
        // modeldefinition.variantOf = modeldefinition.name;
        if (modeldefinition.variantOf) {
          modeldefinition.clientModelName = modeldefinition.name;
          modeldefinition.name = modeldefinition.name + '' + uuid.v1().toString().substring(0, 6);
          modeldefinition.plural = modeldefinition.name;
        }

        var baseModel = loopback.findModel(modeldefinition.base);
        if (!baseModel) {
          //   console.log('invalid model ', modeldefinition.base);
          var err1 = new Error('Specified base (\'' + modeldefinition.base + '\') does not exist');
          err1.retriable = false;
          next(err1);
          return;
        }
      }

      if (modeldefinition.variantOf) {
        var modelDefinitionModel = loopback.findModel('ModelDefinition');
        modelDefinitionModel.findOne({
          where: {
            name: modeldefinition.variantOf
          }
        }, ctx.options, function modelDefinitionFindOne(err2, results2) {
          if (err2 || !results2) {
            log.error(ctx.options, 'Could not find variant model ', modeldefinition.variantOf);
            var err3 = new Error('Could not find variant model ' + modeldefinition.variantOf);
            err3.retriable = false;
            return next(err3);
          }
          return mongoSpecificHandling(modeldefinition, ctx, next);
        });
      } else {
        return mongoSpecificHandling(modeldefinition, ctx, next);
      }
    });
  };

  /**
   * This After Save Hook for ModelDefinition is responsible for creating a model
   * in Loopback after the definition is created using the create ModelDefinition API.
   * @callback
   * @param {object} ctx - The context object containing the model instance.
   * @param {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
   */
  var mdAfterSave = function mdAfterSave(ctx, next) {
    log.debug(ctx.options, 'DEBUG: boot/db-models.js: ModelDefinition After save called.');
    var modeldefinition = ctx.instance || ctx.currentInstance;

    // when update is done using updateAll the changed data is present is
    // ctx.data (type object), and ctx.where has the query. so the ctx.data is not
    // a model constructor and has limited data, so to create the updated model in app
    // find the record using id and use the updated instance to create the updated model in the app.
    if (typeof modeldefinition === 'undefined') {
      var where = ctx.where;
      var id;
      // the below logic is to find out id in where clause.
      // if ev-context-mixin is applied it where = {and} -->  and is a array
      // if ev-context-mixin is not applied then where clause will be have id in where.id.
      var forEachCb = function forEachCb(element) {
        if (!Array.isArray(element)) {
          if (element.id) {
            id = element.id;
          }
        }
      };
      for (var key in where) {
        if (key === 'id') {
          id = where.id;
        } else if (Array.isArray(where[key])) {
          where[key].forEach(forEachCb);
        }
      }


      modelDefinition.findById(id, ctx.options, function dbModelsMdAfterSaveModelDefFindCb(err, modelInstance) {
        if (err) {
          log.warn(ctx.options, {
            'message': 'WARNING',
            'cause': err,
            'details': ''
          });
        }
        if (modelInstance) {
          modeldefinition = modelInstance;
          if (!modeldefinition.filebased) {
            util.createModel(modelDefinition.app, modeldefinition, ctx.options, function dbModelsMdAfterSaveModelDefFindModelCreateCb() {
              modelDefinition.events.emit('model-' + modeldefinition.name + '-available');
              // Find all child models and re-create them so that the new base properties
              // are reflected in them
              modelDefinition.find({
                where: {
                  base: modeldefinition.name
                }
              }, ctx.options,
                function dbModelsMdAfterSaveMdAfterSaveUtilCreateModelFindCb(err, modeldefinitions) {
                  if (err) {
                    next();
                    log.warn(ctx.options, {
                      'message': 'WARNING',
                      'cause': err,
                      'details': ''
                    });
                    return;
                  }
                  if (modeldefinitions && modeldefinitions.length) {
                    modeldefinitions.forEach(function dbModelMdAfterSaveMdForEachFn(md) {
                      // For each Model defined in the DB which has the current model as base ...
                      util.createModel(modelDefinition.app, md, ctx.options, function dbModelMdAfterSaveMdForEachCreateModelCb() {
                        log.debug(ctx.options, 'emitting event model available ', md.name);
                        modelDefinition.events.emit('model-' + md.name + '-available');
                      });
                    });
                  }
                });
            });
          }
        }
      });
    } else if (!modeldefinition.filebased) {
      util.createModel(modelDefinition.app, modeldefinition, ctx.options, function dbModelMdAfterSaveMdFileBasedCreateCb() {
        log.debug(ctx.options, 'emitting event model available ', modeldefinition.name);
        modelDefinition.events.emit('model-' + modeldefinition.name + '-available');
        // Find all child models and re-create them so that the new base properties
        // are reflected in them
        modelDefinition.find({
          where: {
            base: modeldefinition.name
          }
        }, ctx.options, function dbModelMdAfterSaveMdFileBasedCreateMdFindCb(err, modeldefinitions) {
          if (err) {
            next();
            log.warn(ctx.options, {
              'message': 'WARNING',
              'cause': err,
              'details': ''
            });
          }
          if (modeldefinitions && modeldefinitions.length) {
            modeldefinitions.forEach(function dbModelMdAfterSaveMdFileBasedCreateMdFindCreateForEachFn(md) {
              // For each Model defined in the DB which has the current model as base ...
              util.createModel(modelDefinition.app, md, ctx.options, function dbModelMdAfterSaveMdFileBasedCreateMdFindCreateForEachCreateModelCb() {
                log.debug(ctx.options, 'emitting event model available ', md.name);
                modelDefinition.events.emit('model-' + md.name + '-available');
              });
            });
          }
        });
      });
    }
    next();
  };

  /**
   * This function returns the plural form of specified input word
   *
   * @param {string} name - The word whose plural is to be returned
   * @return {string} The plural of the specified word
   */
  function createPlural(name) {
    return inflection.pluralize(name);
  }

  /**
   * This function checks if the specified model has any dependency on other models
   * in the specified app.
   *
   * @param {object} app - Loopback's app object containing all models which need to be checked for dependency
   * @param {string} modelname - The name of the model that needs to be checked if it has any dependency
   * @return {boolean} true or false depending on whether if there is a dependency or not, respectively.
   */
  /* function hasDependency(app, modelname) {
      var result = false;
      var allModels = app.models;
      for (var key in allModels) {
          if (allModels.hasOwnProperty(key)) {
              var currentModel = null;
              if (allModels.hasOwnProperty(key)) {
                  currentModel = allModels[key];
              }
              if (!currentModel) {
                  continue;
              }
              var baseModelName = currentModel.definition && currentModel.definition.settings && currentModel.definition.settings.base;
              if (!baseModelName) {
                  continue;
              }
              if (baseModelName === modelname && !currentModel.definition.settings._isDeleted) {
                  log.debug(log.defaultContext(), 'baseModelName exists and not deleted ', baseModelName, currentModel.definition.name);
                  result = true;
                  break;
              }
          }
      }
      return result;
  }
*/
  // Define 'after save' hook for the ModelDefinition model so
  // that loopback Models can be created at runtime corresponding to
  // the ModelDefinition instance created
  modelDefinition.observe('after save', mdAfterSave);

  // Validate base before saving
  modelDefinition.observe('before save', mdBeforeSave);

  function _isHiddenProperty(model, propName, options) {
    var settings = model.definition.settings;
    if (settings.hidden && settings.hidden.indexOf(propName) >= 0) {
      return true;
    }
    if (options.skipSystemFields) {
      if (propName === 'id' || propName === 'scope' || propName.startsWith('_')) {
        return true;
      }
    }
    return false;
  }

  // generate model definition
  function _extractMeta(model, options, allDefinitions) {
    var properties = {};
    var associations = [];
    Object.keys(model.definition.properties).forEach(function forEachPropertyCB(propName) {
      if (!_isHiddenProperty(model, propName, options)) {
        var propDetails = _.cloneDeep(model.definition.properties[propName]);
        if (propDetails.evtype) {
          propDetails.type = propDetails.evtype;
        }
        if (typeof propDetails.type === 'function') {
          if (propDetails.type.name === 'ModelConstructor') {
            /* Property value is composite model */
            if (propDetails.type.definition) {
              associations.push(propDetails.type);
              propDetails.modeltype = propDetails.type.definition.name;
              propDetails.type = 'model';
            }
          } else {
            /* Property value is primitive like string, date, number, boolean etc. */
            propDetails.type = propDetails.type.name.toLowerCase();
          }
        } else if (Array.isArray(propDetails.type)) {
          /* type is an array */
          var itemType = propDetails.type[0];
          if (typeof itemType === 'function') {
            /* Array of another model */
            if (itemType.name === 'ModelConstructor') {
              associations.push(itemType);
              propDetails.itemtype = 'model';
              propDetails.modeltype = itemType.definition.name;
            } else {
              /* Array of primitive */
              propDetails.itemtype = itemType.name.toLowerCase();
            }
          }
          propDetails.type = 'array';
        }
        if (propDetails.enumtype) {
          var enumModel = model.app.models[propDetails.enumtype];
          if (enumModel) {
            // enumtype is pointing to model
            propDetails.listdata = enumModel.settings.enumList;
          } else {
            // enumtype is not pointing to model
            log.error(options, 'error finding enumtype ', propDetails.enumtype);
          }
        }
        properties[propName] = propDetails;
      }
    });

    var relations = model.relations;
    var modelDefn = {
      id: model.definition.name,
      plural: model.pluralModelName,
      resturl: config.restApiRoot + model.http.path,
      properties: properties,
      relations: relations
    };

    allDefinitions[model.definition.name] = modelDefn;

    if (options.dependencies) {
      Object.keys(relations).forEach(function relationsForEachKey(relationName) {
        var related = relations[relationName].modelTo;
        associations.push(related);
      });

      for (var i = 0; i < associations.length; i++) {
        var associated = associations[i];
        if (associated) {
          if (!allDefinitions[associated.definition.name]) { _extractMeta(associated, options, allDefinitions); }
        }
      }
    }
  }

  function _flattenMetadata(modelName, allModels) {
    var flatProperties = {};

    var modelDefnMeta = allModels[modelName] || {
      properties: {}
    };

    for (var propName in modelDefnMeta.properties) {
      if (propName !== 'id') {
        var propObj = modelDefnMeta.properties[propName];

        /* if type of this property is not present in all models, then it should be a primitive property.*/
        if (propObj.type === 'model') {
          /**
           * It is a composite type. We need sub-model's properties add thos multiple fields
           * User{
           *  address : Address
           * }
           * We flatten Address and add address.line1, address.city etc into our control-list.
           */
          var subObj = _flattenMetadata(propObj.modeltype, allModels);
          for (var subProp in subObj.properties) {
            if (subObj.properties.hasOwnProperty(subProp)) {
              flatProperties[propName + '.' + subProp] = subObj.properties[subProp];
            }
          }
        } else {
          /* a primitive property*/
          flatProperties[propName] = propObj;
        }
      }
    }
    modelDefnMeta.properties = flatProperties;
    // console.log('@@@@@@@@@@@@',modelDefnMeta,'@@@@@@@@@@');
    return modelDefnMeta;
  }

  modelDefinition._extractMeta = _extractMeta;
  modelDefinition.extractMeta = function extractMeta(modelName, options, callback) {
    options = options || {};
    if (options.flatten) {
      options.dependencies = true;
    }

    modelPersonalizer(modelName, options, function getPersonalizedModelCB(personalizedModelName) {
      personalizedModelName = personalizedModelName || modelName;
      var model = loopback.findModel(personalizedModelName);
      if (!model) {
        model = loopback.findModel(modelName);
        personalizedModelName = modelName;
      }
      var result = {};
      if (model) {
        var allDefinitions = {};
        _extractMeta(model, options, allDefinitions);

        /**
         * If we are returning a different personalized model against the requested one,
         * also make sure this is available under original requested name
         */
        if (personalizedModelName !== modelName) {
          allDefinitions[modelName] = allDefinitions[personalizedModelName];
        }
        result = allDefinitions;
        if (options.flatten) {
          /**
           * Inter-weave the embedded Model's field as sub-fields.
           */
          result = _flattenMetadata(personalizedModelName, allDefinitions);
        }
      }
      callback && callback(null, result);
      return result;
    });
  };

  modelDefinition.remoteMethod('extractMeta', {
    description: 'Returns Model Meta Data',
    accessType: 'READ',
    accepts: [{
      arg: 'modelName',
      type: 'string',
      description: 'model name',
      required: true,
      http: {
        source: 'path'
      }
    }],
    http: {
      verb: 'GET',
      path: '/modelmeta/:modelName'
    },
    returns: {
      type: 'object',
      root: true
    }
  });
};
