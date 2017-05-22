/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This mixin is for validations, where we override the isValid function of loopback.
 * All the validations defined on the model will be aggregated and attached to the model,
 * which will be parallely executed whenever any data is posted for the model.
 *
 * @mixin Model Validations
 * @author Sambit Kumar Patra
 */

var logger = require('../../lib/logger');
var log = logger('model-validations');
var async = require('async');
var q = require('q');
var validationBuilder = require('../../lib/common/validation-builder.js');
var exprLang = require('../../lib/expression-language/expression-language.js');

module.exports = function ModelValidations(Model) {
  if (Model.modelName === 'BaseEntity') {
    // No need to apply the "isValid" change at BaseEntity level
    // Let the actual model decide if it wants to enable modelvalidation mixin
    return;
  }

  var validationRules = [];
  // aggregate all the validations defined for the model and attach it to the model
  validationRules = validationBuilder.buildValidations(Model);

  Model.validationRules = validationRules;

  /**
   *
   * This function overrides the isValid method of loopback, it will be called whenever `obj.isValid()` method is called
   *
   * @memberof Model Validations
   * @param {function} done - function to be called once validation is over
   * @param {Object} options - options object
   * @param {Object} data - posted data
   * @param {String} path - modelName of the present model for which isValid is called with its parent model's name appended incase of embedded model
   * @param {Object} inst - instance of the data posted
   * @param {function} callback - function to be called incase of embedded model validation
   * @returns {Boolean} true or false depending upon the validity of the data
   * @function
   * @name modelValidationsIsValidFn
   */

  Model.prototype.isValid = function modelValidationsIsValidFn(done, options, data, path, inst, callback) {
    if (!options) {
      options = {};
    }
    // check if validations are to be executed, if not simply return the done callback.
    if (options.skipValidations) {
      return process.nextTick(function skipValidationCb() {
        done(true);
      });
    }

    var valid = true;
    var fnArr = [];
    var validateWhenPromises = [];

    if (!inst) {
      inst = this;
    }

    // To Do : modelData to be used for validation hooks
    var modelData = data;
    log.info(options, 'modelData validation : ', modelData);

    data = inst.toObject(true);


    // path will give the exact level and property for which validation is being executed
    if (!path) {
      path = inst.constructor.modelName;
    }
    log.info(options, 'isValid called for : ', path);
    var self = inst;
    var ast = self.constructor._ast;
    // construct an array of promises for validateWhen and wait for expression language to resolve all the promises
    inst.constructor.validationRules.forEach(function modelValidationsRulesForEachFn(obj) {
      if (obj.args.validateWhen) {
        validateWhenPromises.push(exprLang.traverseAST(ast[obj.args.validateWhen], data, options));
      } else {
        validateWhenPromises.push((function validateWhenPromisesCb() {
          return q.fcall(function fCallCb() {
            return true;
          });
        })());
      }
    });
    // when all promises are resolved check for the resolved value to know which validation rules are to be skipped
    // based on the validateWhen clause
    q.allSettled(validateWhenPromises).then(function modelValidationsValidateWhenPromisesCb(results) {
      log.info(options, 'all promises settled in isValid');
      results.map(function modelValidationsValidateWhenPromisesMapCb(d) {
        return d.value;
      }).forEach(function modelValidationsValidateWhenPromisesMapForEachCb(d, i) {
        log.info(options, 'preparing async function array for validation rules');
        if (d) {
          // this wrapper prepares an array of functions containg all the validations attached to the model
          var obj = inst.constructor.validationRules[i];
          obj.args.inst = inst;
          obj.args.data = data;
          obj.args.path = path;
          obj.args.options = options;
          fnArr.push(async.apply(obj.expression, obj.args));
        }
      });
      /* prepare an array of functions which are nothing but the isValid method of the
           properties which are of Model type*/
      var recursionFns = getRecursiveModelFns(options, inst, data, path);

      // execute all the validation functions of the model parallely
      async.parallel(fnArr, function modelValidationsAsyncParallelCb(err, results) {
        if (err) {
          done(err);
        }
        results = [].concat.apply([], results);
        // execute all the isValid functions of the properties which are of Model type
        if (recursionFns && recursionFns.length > 0) {
          async.parallel(recursionFns, function modelValidationRecursionAsyncParallelCb(err, recurResults) {
            if (err) {
              done(err);
            }
            results = results.concat([].concat.apply([], recurResults));
            var errArr = results.filter(function modelValidationAsyncParalllelErrCb(d) {
              return d !== null && typeof d !== 'undefined';
            });
            // inst.errors will have custom errors if any
            if (errArr.length > 0 || inst.errors) {
              valid = false;
            }
            callback && callback(null, errArr);
            if (done) {
              log.info(options, 'all validation rules executed');
              if (errArr && errArr.length > 0) {
                log.warn(options, 'Data posted is not valid');
                // Add error to the response object
                getError(self, errArr);
                // done(valid);
              }
              // running custom validations of model(written in model js file) if any
              if (Model.customValidations) {
                log.info(options, 'executing custom validations for model');
                var customValArr = [];
                Model.customValidations.forEach(function customValidationForEachCb(customValidation) {
                  customValArr.push(async.apply(customValidation, inst, options));
                });
                async.parallel(customValArr, function customModelValidationsAsyncParallelElseCb() {
                  if (inst.errors) {
                    valid = false;
                  }
                  done(valid);
                });
              } else {
                done(valid);
              }
            } else {
              return valid;
            }
          });
        } else {
          var errArr = results.filter(function modelValidationAsyncParallelElseErrFilterFn(d) {
            return d !== null && typeof d !== 'undefined';
          });
          // inst.errors will have custom errors if any
          if (errArr.length > 0 || inst.errors) {
            valid = false;
          }
          callback && callback(null, errArr);
          if (done) {
            log.info(options, 'all validation rules executed');
            if (errArr && errArr.length > 0) {
              log.warn(options, 'Data posted is not valid');
              // Add error to the response object
              getError(self, errArr);
              // done(valid);
            }
            // running custom validations of model(written in model js file) if any
            if (Model.customValidations) {
              log.info(options, 'executing custom validations for model');
              var customValArr = [];
              Model.customValidations.forEach(function customValidationForEachCb(customValidation) {
                customValArr.push(async.apply(customValidation, inst, options));
              });
              async.parallel(customValArr, function customModelValidationsAsyncParallelElseCb() {
                if (inst.errors) {
                  valid = false;
                }
                done(valid);
              });
            } else {
              done(valid);
            }
          } else {
            return valid;
          }
        }
      });
    }, function modelValidationsAsyncParallelReasonFn(reason) {
      log.warn(options, 'Warning - Unable to resolve validateWhen promises with reason -', reason);
    }).catch(function validatwWhenPromiseErrorCb(err) {
      log.error(options, 'Error - Unable to resolve validateWhen promises with error -', err);
    });
  };

  /**
   * This function prepares an array which contains all the isValid methods,
   * incase a property is of type Model its data can be validated by calling its isValid method
   * @memberof Model Validations
   * @param {Object} options - options object
   * @param {Object} modelinstance - model instance of the posted model
   * @param {Object} instanceData - posted data
   * @param {String} instancePath - modelName of the present model for which isValid is called with its parent model's name appended incase of embedded model
   * @returns {function[]} Array of functions.
   * @function getRecursiveModelFns
   */

  function getRecursiveModelFns(options, modelinstance, instanceData, instancePath) {
    var properties = modelinstance.constructor.definition.properties;
    var modelfns = [];
    var model;
    var path;
    var data;
    var instance;
    log.info(options, 'preparing recursive validation rules for : ', modelinstance.constructor.modelName);
    var relations = modelinstance.constructor.relations || {};
    var relationNames = Object.keys(relations);
    Object.keys(properties).forEach(function modelValidationsRecursiveModelKeysFn(property) {
      // if type of the property is an array which is of Model type then collect the isValid methods for the Model
      // for example: if proerty is of type : ['Items'] where Item is a Model
      var validateEmbeddedModel = true;
      if (properties[property].type instanceof Array &&
        properties[property].type[0] &&
        properties[property].type[0].sharedClass &&
        instanceData[property]) {
        relationNames.forEach(function getRelationFn(relationName) {
          var rel = relations[relationName];
          if (rel.modelTo.modelName === properties[property].type[0].modelName && rel.type === 'embedsMany' && rel.options && rel.options.validate === false) {
            validateEmbeddedModel = rel.options.validate;
          }
        });
        for (var i = 0; i < instanceData[property].length; i++) {
          model = properties[property].type[0];
          path = instancePath + '->' + property + '[' + i + ']';
          data = instanceData[property][i];
          instance = modelinstance.__data[property][i];
          if (validateEmbeddedModel && instance && data && model.settings.mixins && model.settings.mixins.ModelValidations) {
            log.info(options, 'recursive validation rules added for : ', model.modelName);
            modelfns.push(async.apply(model.prototype.isValid, null, options, data, path, instance));
          }
        }
      } else if (properties[property].type instanceof Function &&
        properties[property].type.sharedClass) {
        // if property is of type Model then add its isValid method to the function array
        model = properties[property].type;
        path = instancePath + '->' + property;
        data = instanceData[property];
        instance = modelinstance.__data[property];
        relationNames.forEach(function getRelationFn(relationName) {
          var rel = relations[relationName];
          if (rel.modelTo.modelName === model.modelName && rel.type === 'embedsOne' && rel.options && rel.options.validate === false) {
            validateEmbeddedModel = rel.options.validate;
          }
        });
        if (validateEmbeddedModel && instance && data && model.settings.mixins && model.settings.mixins.ModelValidations) {
          log.info(options, 'recursive validation rules added for : ', model.modelName);
          modelfns.push(async.apply(model.prototype.isValid, null, options, data, path, instance));
        }
      }
    });
    return modelfns;
  }

  /**
   *
   * ValidationError is raised when the application attempts to save an invalid model instance.
   * This function read the error array and create error object and pass it to the response object.
   * @memberof Model Validations
   * @param {Object} instance - instance of the data  posted
   * @param {Object[]} errArr - array containing all the violated validation rules' error object
   * @function getError
   */
  function getError(instance, errArr) {
    if (!instance.errors) {
      Object.defineProperty(instance, 'errors', {
        enumerable: false,
        configurable: true,
        value: new Errors()
      });
    }
    errArr.forEach(function modelValidationsGetErrorForEachFn(err) {
      var errObj = {};
      errObj.code = err.errCode;
      errObj.moreInformation = err.moreInformation;
      errObj.message = err.errMessage;
      errObj.retriable = err.retriable;
      errObj.path = err.path + '->' + err.fieldName;
      /*			if (err.index) {
          errObj.path += "[" + err.index + "]";
         }*/
      instance.errors.add(errObj);
    });
  }

  function Errors() {
    Object.defineProperty(this, 'codes', {
      enumerable: false,
      configurable: true,
      value: {}
    });
  }

  Errors.prototype.add = function modelValidationsErrAddFn(errObj) {
    if (!this.errs) {
      this.errs = [];
    }
    this.errs.push(errObj);
  };
};
