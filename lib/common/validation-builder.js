/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * This class provides utility methods to collect all the different types
 * of validations defined on a model.
 * Each of the method takes 'model' object as a parameter and
 * extracts the validation rules attached to the model from it.
 *
 * @module Validation Builder
 * @author Pragyan Das
 */

var logger = require('oe-logger');
var log = logger('validation-builder');
var validationUtils = require('./validation-utils');
var applicableValidations = validationUtils.applicableValidations;
var validationExpressionMapper = validationUtils.validationExpressionMapper;

module.exports = {
  buildValidations: buildValidations
};

/**
 *
 * Aggregate all the different types of validations
 * @param {Object} model - model constructor for which validation rules are to be aggregated
 * @returns {Object[]} Multi dimenssional array containing all the validation rules
 */
function buildValidations(model) {
  var validations = [];
  validations = validations.concat(validations,
    getPropValidations(model),
    getRelationValidations(model),
    getOeValidations(model));
  return validations;
}

/**
 *
 * Aggregation of validations attached to all the properties of the model
 * @param {Object} model - model constructor for which validation rules are to be aggregated
 * @returns {Object[]} Array containing all the property level validation rules
 */
function getPropValidations(model) {
  var propertyValidations = [];
  var properties = model.definition.properties;
  log.debug(log.defaultContext(), 'building property level validation rules for : ', model.modelName);
  Object.keys(properties).forEach(function propertiesForEachCb(propertyName) {
    var propertyType = properties[propertyName].type;
    var type = 'default';
    var typeName = properties[propertyName].type.name && properties[propertyName].type.name.toLowerCase();
    if (propertyType instanceof Function && propertyType.sharedClass) {
      type = 'object';
    } else if (propertyType instanceof Array && propertyType[0] && propertyType[0].sharedClass) {
      type = 'array';
    } else if (Object.keys(validationUtils.applicableValidations).indexOf(typeName) > 0) {
      type = properties[propertyName].type.name.toLowerCase();
    }

    // Prevent script injection , for example, in a string field, unless allowScript
    // is given, one should not be able to inject a <script> tag.
    if (typeName === 'string' &&
      !properties[propertyName].allowScript) {
      propertyValidations.push({
        expression: validationExpressionMapper.script,
        args: {
          value: null,
          type: type,
          name: propertyName,
          validateWhenRule: null
        }
      });
    }

    Object.keys(properties[propertyName]).forEach(function propertyNameForEachCb(key) {
      if (applicableValidations[type].indexOf(key) >= 0) {
        // pick the respective validation function according to the type of rule e.g. 'min', 'max', 'unique', etc.
        var expression = validationExpressionMapper[key];
        if (typeof expression === 'object') {
          expression = expression[properties[propertyName][key].toString()];
        }
        if (expression) {
          var validateWhenRule = null;
          if (properties[propertyName].validateWhen && properties[propertyName].validateWhen[key]) {
            // pick the validateWhen condition if present for the rule
            validateWhenRule = properties[propertyName].validateWhen[key];
          }
          // push the property level validation rule into the validation array
          propertyValidations.push({
            expression: expression,
            args: {
              value: properties[propertyName][key],
              type: type,
              name: propertyName,
              validateWhen: validateWhenRule
            }
          });
        }
      }
    });
  });
  return propertyValidations;
}

/**
 *
 * Aggregation of all the validation rules attached to oeValidations object of the model
 * @param {Object} model - model constructor for which validation rules are to be aggregated
 * @returns {Object[]} Array containing all the oeValidation rules
 */
function getOeValidations(model) {
  var oeValidations = [];
  var validations = model.definition.settings.oeValidations || {};
  log.debug(log.defaultContext(), 'building oeValidation validation rules for : ', model.modelName);
  Object.keys(validations).forEach(function validationsForEachCb(validationName) {
    var validation = validations[validationName];
    // pick the respective validation function according to the type of rule e.g. 'reference' or 'custom'
    var expression = validationExpressionMapper.oeValidation(validation.type);
    if (expression) {
      var validateWhenRule = null;
      if (validation.validateWhen) {
        // validateWhen takes a string in case of ev validations if validateWhen is an object then nake the rule null
        if (typeof validation.validateWhen === 'object') {
          validateWhenRule = null;
        } else {
          // pick the validateWhen condition if present for the rule
          validateWhenRule = validation.validateWhen;
        }
      }
      // push the oeValidation rule into the validation array
      oeValidations.push({
        expression: expression,
        args: {
          value: validation,
          type: null,
          name: validationName,
          validateWhen: validateWhenRule
        }
      });
    }
  });

  return oeValidations;
}

/**
 *
 * Aggregation of all the validation rules of relations' object of the model
 * @param {Object} model - model constructor for which validation rules are to be aggregated
 * @returns {Object[]} Array containing all the relational validation rules
 */
function getRelationValidations(model) {
  var relations = Object.keys(model.relations).length ? model.relations : model.settings.relations;
  if (!relations) {
    return [];
  }

  var relationValidations = [];
  log.debug(log.defaultContext(), 'building relation validation rules for : ', model.modelName);
  Object.keys(relations).forEach(function relationsForEachCb(relationName) {
    var relation = relations[relationName];
    // pick the respective validation function according to the type of relation e.g. 'belongsTo', etc
    var expression = validationExpressionMapper.relation(relation.type);
    if (expression) {
      // push the relation validation rule into the validation array
      relationValidations.push({
        expression: expression,
        args: {
          value: relation,
          type: null,
          relationName: relationName
        }
      });
    }
  });

  return relationValidations;
}
