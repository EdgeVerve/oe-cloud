/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This file takes certain business rules, evaluate it and sends an array of error codes
 * corresponding to the business rules that are violated.
 *
 * @author Sambit Kumar Patra
 * @mixin Business Rule Mixin
 */
var q = require('q');
var exprLang = require('../../lib/expression-language/expression-language.js');
var loopback = require('loopback');
var logger = require('../../lib/logger');
var log = logger('model-validations');

module.exports = function BusinessRuleMixin(BusinessRuleModel) {
  /**
   * This function evaluate the business rules and sends an array of error codes
   * corresponding to the business rules that are violated.
   *
   * @memberof Business Rule Mixin
   * @param  {Array.<string>} rules - array of expressions
   * @param  {Object} inst - data object
   * @param  {function} options - options
   * @param  {function} cb - callback function
   * @function
   */
  BusinessRuleModel.prototype.processBusinessRules = function processBusinessRules(rules, inst, options, cb) {
    var Model = loopback.getModel('BusinessRule');
    var ast = Model._ast;
    var businessRulePromises = [];
    var errCode = [];
    // convert the business rules into promises to be resolved by expression language
    if (rules && rules.length > 0) {
      log.info(options, 'Creating business rule promises array');
      rules.forEach(function businessRuleMixinRulesForEach(bRule) {
        businessRulePromises.push(exprLang.traverseAST(ast[bRule.expression], inst, options));
      });
    }
    // when all promises are resolved filter out those which contains error code and pass it to the callback
    q.allSettled(businessRulePromises).then(function businessRuleMixinPromiseResolved(results) {
      log.info(options, 'All business rule promises settled');
      results.map(function businessRuleMixinMap(d) {
        return d.value;
      }).forEach(function businessRuleMixinAllSettledForEach(d, i) {
        if (typeof d !== 'undefined' && !d) {
          log.warn(options, 'Business rule ', rules[i], 'violated');
          errCode.push(rules[i].code);
        }
      });
      return cb(errCode);
    });
  };
};
