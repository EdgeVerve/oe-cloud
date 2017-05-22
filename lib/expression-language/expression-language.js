/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/** This is a warpper for parsing expressions
 *  to get the abstract syntax tree(AST) and creating
 *  javascript code from the AST.
 *
 *  @module Expression Language
 *  @author Pragyan Das
 */
var parser = require('./expression-syntax-parser');
var q = require('q');
require('./expression-ast-parser')(parser.Parser.prototype);
var logger = require('../logger');
var log = logger('expression-language');

/**
 * Parses expression and resolves the promise
 * on successful execution of the generated
 * javascript code.
 * @param  {string} source - source
 * @return {Promise} -  deferred.promise
 */
function createAST(source) {
  return parser.parse(source);
}

function traverseAST(ast, instance, options) {
  var deferred = q.defer();
  ast.build('', ' ', instance, options).then(function traverseBuildAstSuccessCb(result) {
    deferred.resolve(result);
  }, function traverseBuildAstFailCb(reason) {
    deferred.reject(reason);
    log.error(options, 'Expression Language - expression parsing failed for reason:"', reason, '"');
  });
  return deferred.promise;
}


module.exports = {
  createAST: createAST,
  traverseAST: traverseAST
};
