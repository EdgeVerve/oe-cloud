/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * This mixin is for expression language, where we collect all the grammar rules attached to the model
 * and create their ASTs.All the ASTs are attached to the model in the object "_ast".
 * "_ast" takes the expression as key and its AST as the value.
 * @mixin Expression ast Populator Mixin
 * @author Sambit Kumar Patra
 */

var logger = require('oe-logger');
var log = logger('expression-ast-populator-mixin');
var exprLang = require('../../lib/expression-language/expression-language.js');

module.exports = function ExpressionAstPopulator(Model) {
  Model._ast = {};
  log.debug(log.defaultContext(), 'building AST for   ', Model.modelName);
  var properties = Model.definition.properties;
  // process all the validateWhen grammar rules at property level and attach their ASTs to the model
  Object.keys(properties).forEach(function propertiesForEachCb(propertyName) {
    Object.keys(properties[propertyName]).forEach(function propertyNameForEachCb(key) {
      if (properties[propertyName].validateWhen && properties[propertyName].validateWhen[key]) {
        // pick the validateWhen condition if present for the validation rule
        var validateWhenRule = properties[propertyName].validateWhen[key];
        Model._ast[validateWhenRule] = exprLang.createAST(validateWhenRule);
        log.debug(log.defaultContext(), 'validateWhen ast building for   ', key, ' rule of ', Model.modelName, '->', propertyName);
      }
      // this is for property expressions which will be evaluated and assigned to property
      if (properties[propertyName].propExpression) {
        log.debug(log.defaultContext(), 'applying expression to property name ', propertyName, ' for model ', Model.modelName);
        var propExpression = properties[propertyName].propExpression;
        Model._ast[propExpression] = exprLang.createAST(propExpression);
      }
    });
  });

  var oeValidations = Model.definition.settings.oeValidations || {};

  // process all the grammar rules present in oeValidations and and attach their ASTs to the model
  Object.keys(oeValidations).forEach(function validationsForEachCb(validationName) {
    var validationRule = oeValidations[validationName];
    // if oeValidation has a validateWhen condition then pick it up and create AST for it
    if (validationRule.validateWhen) {
      // validateWhen takes a string in case of ev validations
      if (typeof validationRule.validateWhen === 'string') {
        // pick the validateWhen condition and attach its AST to the model
        var validateWhenRule = validationRule.validateWhen;
        Model._ast[validateWhenRule] = exprLang.createAST(validateWhenRule);
        log.debug(log.defaultContext(), 'validateWhen ast building for oeValidation rule   ', Model.modelName, '->', validationName);
      }
    }
    // if the oeValidation is of 'custom' type then pick its expression which a grammar rule and create AST for that expression
    if (validationRule.type === 'custom') {
      var expression = validationRule.expression;
      // pick the expression for custom type oeValidation and attach its AST to the model
      Model._ast[expression] = exprLang.createAST(expression);
      log.debug(log.defaultContext(), 'ast building for oeValidation custom rule   ', Model.modelName, '->', validationName);
    }
  });

  var otpEnabledMethods = Model.definition.settings.enableOTP || [];
  otpEnabledMethods.forEach(function otpMethodIterate(otpConfig) {
    var expression = otpConfig.authWhen;
    if (expression) {
      Model._ast[expression] = exprLang.createAST(expression);
    }
  });
};
