/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 *
 * @classdesc This Model processes all the business rules(grammar expressions), create their ASTs and attach it to BusinessRule model.
 * @kind class
 * @class BusinessRule
 * @author Sambit Kumar Patra
 */

var exprLang = require('../../../lib/expression-language/expression-language.js');
var logger = require('../../../lib/logger');
var log = logger('model-validations');

module.exports = function businessRule(BusinessRule) {
  /**
   * This 'after save' hook is used to intercept data sucessfully
   * POSTed to BusinessRule model, create ASTs of all the
   * expressions POSTed and attach it to "_ast" of BusinessRule Model
   * @param {object} ctx - context object
   * @param {function} next - next middleware function
   * @function businessRuleBeforeSaveCb
   */

  BusinessRule.observe('after save', function businessRuleBeforeSaveCb(ctx, next) {
    var data = ctx.instance || ctx.currentInstance || ctx.data;
    log.info(ctx.options, 'BusinessRule before save remote attaching expression to _ast');
    BusinessRule._ast[data.expression] = exprLang.createAST(data.expression);
    log.info(ctx.options, 'expression : ', data.expression, 'attached to _ast of BusinessRule model');
    next();
  });
};
