/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/* eslint-disable no-inline-comments,no-eval */
/**
 * Build pass of the generated AST (Abstract Syntax Tree)
 * Traverses each node of the tree to generate the required JS code.
 * 'build' method has been added to each constructor of the parser's ast object.
 * Each of the build methods have been designed to be asynchronous.
 * Each build method returns a promise.
 *
 * Author : Pragyan Das
 */

'use strict';
var q = require('q');
var loopback = require('loopback');
var app = require('../../server/server').app;
var restler = require('restler');
var logger = require('../logger');
var log = logger('expression-ast-parser');

module.exports = function ExpressionAstParser(parser) {
  var ast = parser.ast;
  /**
   * @param  {string} indent indent
   * @param  {string} indentChar indentChar
   * @param  {object} inst inst
   * @param  {object} options - options
   * @return {Promise} - deferred.promise
   */
  ast.ProgramNode.prototype.build = function ProgramNodeBuild(indent, indentChar, inst, options) {
    var elements = this.body;
    var str = '';
    var promises = [];
    var deferred = q.defer();

    var obj = {};
    if (inst) {
      obj.instance = inst;
    } else {
      log.warn(options, 'ProgramNode - instance not specified');
    }

    for (var i = 0, len = elements.length; i < len; i++) {
      promises.push(elements[i].build(indent, indentChar, obj, options));
    }

    q.allSettled(promises).then(function astProgramNodeCb(results) {
      if (results.length === 1 && typeof results[0].value === 'object') {
        deferred.resolve(results[0]);
      } else {
        results.map(function astProgramNodeValueMap(d) {
          return d.value;
        }).forEach(function astProgramNodeForEach(d) {
          str += d + '\n';
        });
        deferred.resolve(eval(str));
        log.info(options, 'ProgramNode - build succeded');
      }
    }, /* istanbul ignore next */ function astProgramNodeErrCb(reason) {
      log.warn(options, 'ProgramNode - build failed');
      deferred.reject(reason);
    }).catch( /* istanbul ignore next */ function astProgramNodeCatch(error) {
      log.error(options, 'ProgramNode - Error - ', error);
    });

    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.EmptyStatementNode.prototype.build = /* istanbul ignore next */ function astEmptyStatementNode(indent, indentChar, obj, options) {
    return q.fcall(function astEmptyStatementNodeCb() {
      log.info(options, 'EmptyStatementNode - build succeded');
      return indent + ';';
    });
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.BlockStatementNode.prototype.build = /* istanbul ignore next */ function astBlockStatementNode(indent, indentChar, obj, options) {
    var statements = this.body;
    var str = indent + '{\n';
    var newIndent = indent + indentChar;
    var deferred = q.defer();
    var promises = [];

    for (var i = 0, len = statements.length; i < len; i++) {
      promises.push(statements[i].build(newIndent, indentChar, obj, options));
    }

    q.allSettled(promises).then(function astBlockStatementNodeCb(results) {
      results.map(function astBlockStatementNodeValueMap(d) {
        return d.value;
      }).forEach(function astBlockStatementNodeForEach(d) {
        str += d + '\n';
      });
      str += indent + '}';
      log.info(options, 'BlockStatementNode build succeded');
      deferred.resolve(str);
    }, /* istanbul ignore next */ function astBlockStatementNodeErrCb(reason) {
      deferred.reject(reason);
      log.warn(options, 'BlockStatementNode build failed');
    }).catch( /* istanbul ignore next */ function astBlockStatementNodeCatch(error) {
      log.error(options, 'BlockStatementNode - Error - ', error);
    });

    return deferred.promise;
  };

  /**
 * @param  {string} indent - indent
 * @param  {string} indentChar - indentChar
 * @param  {object} obj - object
 * @param  {object} options - callContext options
 * @return {Promise} - deferred.promise
 */
  ast.ExpressionStatementNode.prototype.build = function ExpressionStatementNodeBuild(indent, indentChar, obj, options) {
    var deferred = q.defer();
    this.expression.build(indent, indentChar, obj, options).then(function astExpressionStatementNodeCb(result) {
      var value = typeof result === 'object' ? result : indent + result + ';';
      log.info(options, 'ExpressionStatementNode built');
      deferred.resolve(value);
    }, /* istanbul ignore next */ function astExpressionStatementNodeErrCb(reason) {
      deferred.reject(reason);
      log.warn(options, 'ExpressionStatementNode build failed');
    }).catch( /* istanbul ignore next */ function astExpressionStatementNodeCatch(error) {
      log.error(options, 'ExpressionStatementNode - Error - ', error);
    });
    return deferred.promise;
  };


  ast.ExecRuleStatementNode.prototype.build = function ExecRuleStatementNodeBuild(indent, indentChar, obj, options) {
    var deferred = q.defer();

    var ruleEngineApi = app.get('ruleEngine');
    var api = ruleEngineApi + '?name=' + this.name;
    restler.post(api, {
      data: obj.instance.__data
    }).on('complete', function handleResponse(data, response) {
      deferred.resolve(data);
    });

    return deferred.promise;
  };

  /**
 * @param  {string} indent - indent
 * @param  {string} indentChar - indentChar
 * @param  {object} obj - object
 * @param  {object} options - callContext options
 * @return {Promise} - deferred.promise
 */
  ast.IfStatementNode.prototype.build = function IfStatementNodeBuild(indent, indentChar, obj, options) {
    var deferred = q.defer();
    var str = '(function(){';
    this.test.build('', '', obj, options).then(function astIfStatementNodeTestCb(result) {
      str += indent + 'if (' + result + ')\n';
      var consequent = this.consequent;
      var alternate = this.alternate;
      var consequentIndent = consequent.type === 'BlockStatement' ? indent : indent + indentChar;
      consequent.build(consequentIndent, indentChar, obj, options).then(function astIfStatementNodeCb(c) {
        str += c;
        if (alternate !== null) {
          str += '\n' + indent + 'else\n';
          var alternateIndent = consequent.type === 'BlockStatement' ? indent : indent + indentChar;
          alternate.build(alternateIndent, indentChar, obj, options).then(function astIfStatementNodeAltCb(a) {
            str += a;
            log.info(options, 'IfStatementNode - build succeded');
            deferred.resolve(str + '})()');
          });
        } else {
          log.info(options, 'IfStatementNode - build succeded');
          deferred.resolve(str + '})()');
        }
      }, /* istanbul ignore next */ function astIfStatementNodeErrCb(reason) {
        deferred.reject(reason);
        log.warn(options, 'IfStatementNode - consequent build failed');
      }).catch( /* istanbul ignore next */ function astIfStatementNodeCatch(error) {
        log.error(options, 'IfStatementNode - consequent - Error - ', error);
      });
    }.bind(this), /* istanbul ignore next */ function astIfStatementNodeTestErrCb(reason) {
      deferred.reject(reason);
      log.warn(options, 'IfStatementNode - test - build failed');
    }).catch( /* istanbul ignore next */ function astIfStatementNodeTestCatch(error) {
      log.error(options, 'IfStatementNode - test - Error - ', error);
    });
    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.LabeledStatementNode.prototype.build = /* istanbul ignore next */ function astLabeledStatementNode(indent, indentChar, obj, options) {
    var deferred = q.defer();
    this.label.build('', '', obj, options).then(function astLabeledStatementNodeLabelCb(d) {
      this.body.build('', '', obj).then(function astLabeledStatementNodeBodyCb(e) {
        log.info(options, 'LabeledStatementNode - build succeded');
        deferred.resolve(indent + d + ': ' + e);
      }, function astLabeledStatementNodeBodyErrCb(reason) {
        deferred.reject(reason);
        log.warn(options, 'LabeledStatementNode - body - build failed');
      }).catch(function astLabeledStatementNodeBodyCatch(error) {
        log.error(options, 'LabeledStatementNode - body - Error - ', error);
      });
    }.bind(this), function astLabeledStatementNodeLabelErrCb(reason) {
      deferred.reject(reason);
      log.warn(options, 'LabeledStatementNode - label - build failed');
    }).catch(function astLabeledStatementNodeLabelCatch(error) {
      log.error(options, 'LabeledStatementNode - label - Error - ', error);
    });
    return deferred.promise;
  };

  /**
 * @param  {string} indent - indent
 * @param  {string} indentChar - indentChar
 * @param  {object} obj - object
 * @param  {object} options - callContext options
 * @return {Promise} - deferred.promise
 */
  ast.BreakStatementNode.prototype.build = /* istanbul ignore next */ function astBreakStatementNode(indent, indentChar, obj, options) {
    var deferred = q.defer();
    var str = indent + 'break';
    var label = this.label;
    if (label !== null) {
      label.build('', '', obj, options).then(function astBreakStatementNodeCb(result) {
        str += ' ' + result;
        log.info(options, 'BreakStatementNode - build succeded');
        deferred.resolve(str + ';');
      }, function astBreakStatementNodeErrCb(reason) {
        deferred.reject(reason);
        log.warn(options, 'BreakStatementNode - label build failed');
      }).catch(function astBreakStatementNodeCatch(error) {
        log.error(options, 'BreakStatementNode - label - Error - ', error);
      });
    } else {
      log.info(options, 'BreakStatementNode - build succeded');
      deferred.resolve(str + ';');
    }
    return deferred.promise;
  };

  /**
 * @param  {string} indent - indent
 * @param  {string} indentChar - indentChar
 * @param  {object} obj - object
 * @param  {object} options - callContext options
 * @return {Promise} - deferred.promise
 */
  ast.ContinueStatementNode.prototype.build = /* istanbul ignore next */ function astContinueStatementNode(indent, indentChar, obj, options) {
    var deferred = q.defer();
    var str = indent + 'continue';
    var label = this.label;

    if (label !== null) {
      label.build('', '', obj, options).then(function astContinueStatementNodeCb(result) {
        str += ' ' + result;
        log.info(options, 'ContinueStatementNode - build succeded');
        deferred.resolve(str + ';');
      }, function astContinueStatementNodeErrCb(reason) {
        log.warn(options, 'ContinueStatementNode - build failed');
        deferred.reject(reason);
      }).catch(function astContinueStatementNodeCatch(error) {
        log.error(options, 'ContinueStatementNode - Error - ', error);
      });
    } else {
      log.info(options, 'ContinueStatementNode - build succeded');
      deferred.resolve(str + ';');
    }

    return deferred.promise;
  };

/**
 * @param  {string} indent - indent
 * @param  {string} indentChar - indentChar
 * @param  {object} obj - object
 * @param  {object} options - callContext options
 * @return {Promise} - deferred.promise
 */
  ast.WithStatementNode.prototype.build = /* istanbul ignore next */ function astWithStatementNode(indent, indentChar, obj, options) {
    var deferred = q.defer();
    var str = '';
    this.object.build('', '', obj).then(function astWithStatementNodeCb(o) {
      str += indent + 'with (' + o + ')\n';
      var body = this.body;
      var bodyIndent = body.type === 'BlockStatement' ? indent : indent + indentChar;
      body.build(bodyIndent, indentChar, obj, options).then(function astWithStatementNodeBodyCb(b) {
        str += b;
        log.info(options, 'WithStatementNode - build succeded');
        deferred.resolve(str);
      }, function astWithStatementNodeBodyErrCb(reason) {
        log.warn(options, 'WithStatementNode - build failed');
        deferred.reject(reason);
      }).catch(function astWithStatementNodeBodyCatch(error) {
        log.error(options, 'WithStatementNode - Error - ', error);
      });
    }.bind(this), function astWithStatementNodeErrCb(reason) {
      deferred.reject(reason);
    });

    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.SwitchStatementNode.prototype.build = /* istanbul ignore next */ function astSwitchStatementNode(indent, indentChar, obj, options) {
    var deferred = q.defer();
    this.discriminant.build('', '', obj).then(function astSwitchStatementNodeCb(d) {
      var str = indent + 'switch (' + d + ')\n' + indent + '{\n';
      var casePromises = [];
      var newIndent = indent + indentChar;
      var cases = this.cases;
      for (var i = 0, len = cases.length; i < len; i++) {
        casePromises.push(cases[i].build(newIndent, indentChar, obj, options));
      }
      q.allSettled(casePromises).then(function astSwitchStatementNodeSettledCb(results) {
        results.map(function astSwitchStatementNodeMapCb(d) {
          return d.value;
        }).forEach(function astSwitchStatementNodeForEachCb(result) {
          str += result;
        });
        log.info(options, 'SwitchStatementNode - case - build succeded');
        deferred.resolve(str);
      }, function astSwitchStatementNodeSettledErrCb(reason) {
        log.warn(options, 'SwitchStatementNode - case - build failed');
        deferred.reject(reason);
      }).catch(function astSwitchStatementNodeSettledCatch(error) {
        log.error(options, 'SwitchStatementNode -case -Error - ', error);
      });
    }.bind(this), function astSwitchStatementNodeErrCb(reason) {
      log.warn(options, 'SwitchStatementNode - discriminant - build failed');
      deferred.reject(reason);
    }).catch(function astSwitchStatementNodeCatch(error) {
      log.error(options, 'SwitchStatementNode - discriminant -Error - ', error);
    });

    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.ReturnStatementNode.prototype.build = /* istanbul ignore next */ function astReturnStatementNode(indent, indentChar, obj, options) {
    var str = indent + 'return';
    var argument = this.argument;
    var deferred = q.defer();
    if (argument !== null) {
      argument.build('', '', obj, options).then(function astReturnStatementNodeCb(result) {
        str += ' ' + result + ';';
        log.info(options, 'ReturnStatementNode- build succeded');
        deferred.resolve(str);
      }, function astReturnStatementNodeErrCb(reason) {
        log.warn(options, 'ReturnStatementNode - argument - build failed');
        deferred.reject(reason);
      }).catch(function astReturnStatementNodeCatch(error) {
        log.error(options, 'ReturnStatementNode - argument - Error - ', error);
      });
    } else {
      log.info(options, 'ReturnStatementNode - build succeded');
      deferred.resolve(str + ';');
    }
    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.WhileStatementNode.prototype.build = /* istanbul ignore next */ function astWhileStatementNode(indent, indentChar, obj, options) {
    var str = '';
    var body = this.body;
    var deferred = q.defer();
    this.test.build('', '', obj).then(function astWhileStatementNodeTestCb(result) {
      str += indent + 'while (' + result + ')\n';
      var bodyIndent = body.type === 'BlockStatement' ? indent : indent + indentChar;
      body.build(bodyIndent, indentChar, obj, options).then(function astWhileStatementNodeBodyCb(b) {
        str += b;
        log.info(options, 'WhileStatementNode - build succeded');
        deferred.resolve(str);
      }, function astWhileStatementNodeBodyErrCb(reason) {
        log.warn(options, 'WhileStatementNode - body - build failed');
        deferred.reject(reason);
      }).catch(function astWhileStatementNodeBodyCatch(error) {
        log.error(options, 'WhileStatementNode - body - Error - ', error);
      });
    }, function astWhileStatementNodeTestErrCb(reason) {
      log.warn(options, 'WhileStatementNode - test - build failed');
      deferred.reject(reason);
    }).catch(function astWhileStatementNodeTestCatch(error) {
      log.error(options, 'WhileStatementNode -test - Error - ', error);
    });

    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.DoWhileStatementNode.prototype.build = /* istanbul ignore next */ function astDoWhileStatementNode(indent, indentChar, obj, options) {
    var str = indent + 'do\n';
    var body = this.body;
    var deferred = q.defer();
    var bodyIndent = body.type === 'BlockStatement' ? indent : indent + indentChar;

    body.build(bodyIndent, indentChar, obj).then(function astDoWhileStatementNodeBodyCb(result) {
      str += result + '\n';
      this.test.build('', '', obj, options).then(function astDoWhileStatementNodeTestCb(t) {
        str += indent + 'while (' + t + ');';
        log.info(options, 'DoWhileStatementNode - build succeded');
        deferred.resolve(str);
      }, function astDoWhileStatementNodeTestErrCb(reason) {
        log.warn(options, 'DoWhileStatementNode - test - build failed');
        deferred.reject(reason);
      }).catch(function astDoWhileStatementNodeTestCatch(error) {
        log.error(options, 'DoWhileStatementNode - test - Error ', error);
      });
    }, function astDoWhileStatementNodeBodyErrCb(reason) {
      log.warn(options, 'DoWhileStatementNode - body - build failed');
      deferred.reject(reason);
    }).catch(function astDoWhileStatementNodeCatch(error) {
      log.error(options, 'DoWhileStatementNode - body - Error ', error);
    });

    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.ForStatementNode.prototype.build = /* istanbul ignore next */ function astForStatementNode(indent, indentChar, obj, options) {
    var str = indent + 'for (';
    var init = this.init;
    var test = this.test;
    var update = this.update;
    var body = this.body;

    var deferred = q.defer();

    q.fcall(function forStatementNodeInitPromise() {
      if (init !== null) {
        if (typeof (init.type) === 'undefined') {
          str += 'var ';
          var promises = [];
          for (var i = 0, len = init.length; i < len; i++) {
            promises.push(init[i].build('', '', obj));
          }

          q.allSettled(promises, function initCb(results) {
            results.map(function initMapCb(d) {
              return d.value;
            }).forEach(function initForEachCb(d, i) {
              if (i !== 0) {
                str += ', ';
              }
              str += d;
            });
            str += '; ';

            return str;
          }, /* istanbul ignore next */ function initRejectCb(reason) {
            deferred.reject(reason);
          }).catch( /* istanbul ignore next */ function initCatchCb(error) {
            log.error(options, 'ForStatementNode - init - Error - ', error);
          });
        } else {
          init.build('', '', obj, options).then(function initCb(result) {
            str += result;
          }, /* istanbul ignore next */ function initRejectCb(reason) {
            deferred.reject(reason);
          }).catch( /* istanbul ignore next */ function initErrorCb(error) {
            log.error(options, 'ForStatementNode - init - Error - ', error);
          });

          str += '; ';

          return str;
        }
      }
    }).then(function forStatementNodeTestPromise(strInit) {
      return q.fcall(function testCb() {
        if (test !== null) {
          test.build('', '', obj, options).then(function testResolveCb(result) {
            strInit += result;
          }, /* istanbul ignore next */ function testRejectCb(reason) {
            deferred.reject(reason);
          }).catch( /* istanbul ignore next */ function testErrorCb(error) {
            log.error(options, 'ForStatementNode - test - Error - ', error);
          });
          strInit += ';';
          return strInit;
        }
        strInit += ';';
        return strInit;
      });
    }).then(function forStatementNodeUpdatePromise(strTest) {
      return q.fcall(function updateCb() {
        if (update !== null) {
          update.build('', '', obj, options).then(function updateResolveCb(result) {
            strTest += result;
          }, /* istanbul ignore next */ function updateRejectCb(reason) {
            deferred.reject(reason);
          }). /* istanbul ignore next */ catch(function updateErrorCb(error) {
            log.error(options, 'ForStatementNode - update - Error - ', error);
          });
          strTest += ')\n';
          return strTest;
        }
        strTest += ')\n';
        return strTest;
      });
    }).then(function forStatementNodeBodyPromise(strUpdate) {
      return q.fcall(function bodyCb() {
        if (body.type === 'BlockStatement') {
          body.build(indent, indentChar, obj, options).then(function bodyResolveCb(result) {
            strUpdate += result + '\n';
            return strUpdate;
          }, function bodyRejectCb(reason) {
            deferred.reject(reason);
          }).catch(function bodyErrorCb(error) {
            log.error(options, 'ForStatementNode - body - Error - ', error);
          });
        } else {
          body.build(indent + indentChar, indentChar, obj, options).then(function bodyResolveCb(result) {
            strUpdate += result + '\n';
            return strUpdate;
          }, function bodyRejectCb(reason) {
            deferred.reject(reason);
          }).catch(function bodyErrorCb(error) {
            log.error(options, 'ForStatementNode - body - Error - ', error);
          });
        }
      });
    }).then(function forStatementNodeResolve(strFinal) {
      deferred.resolve(strFinal);
    }, /* istanbul ignore next */ function forStatementNodeRejectCb(reason) {
      log.warn(options, 'ForStatementNode - build failed for reason : ', reason);
      deferred.reject(reason);
    })
      .catch( /* istanbul ignore next */ function forStatementNodeErrorCb(error) {
        log.error(options, 'ForStatementNode - body - Error ', error);
      });


    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.ForInStatementNode.prototype.build = /* istanbul ignore next */ function astForInStatementNode(indent, indentChar, obj, options) {
    var str = indent + 'for (';
    var left = this.left;
    var body = this.body;

    if (left !== null) {
      if (left.type === 'VariableDeclarator') {
        str += 'var ' + left.build('', '', obj, options);
      } else {
        str += left.build('', '', obj, options);
      }
    }

    str += ' in ' + this.right.build('', '', obj, options) + ')\n';

    if (body.type === 'BlockStatement') {
      str += body.build(indent, indentChar, obj, options) + '\n';
    } else {
      str += body.build(indent + indentChar, indentChar, obj, options) + '\n';
    }

    return str;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.VariableDeclarationNode.prototype.build = /* istanbul ignore next */ function astVariableDeclarationNode(indent, indentChar, obj, options) {
    var str = indent + this.kind + ' ';
    var declarations = this.declarations;
    var deferred = q.defer();
    var promises = [];
    for (var i = 0, len = declarations.length; i < len; i++) {
      promises.push(declarations[i].build('', '', obj, options));
    }

    q.allSettled(promises).then(function astVariableDeclarationNodeCb(results) {
      results.map(function astVariableDeclarationNodeMapCb(d) {
        return d.value;
      }).forEach(function astVariableDeclarationNodeForEachCb(result, i) {
        if (i !== 0) {
          str += ', ';
        }
        str += result;
      });
      log.info(options, 'VariableDeclarationNode - build succeded');
      deferred.resolve(str);
    }, function astVariableDeclarationNodeErrCb(reason) {
      log.info(options, 'VariableDeclarationNode - build failed');
      deferred.reject(reason);
    }).catch(function astVariableDeclarationNodeCatch(error) {
      log.error(options, 'VariableDeclarationNode - Error - ', error);
    });

    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.VariableDeclaratorNode.prototype.build = /* istanbul ignore next */ function astVariableDeclaratorNode(indent, indentChar, obj, options) {
    var deferred = q.defer();
    this.id.build('', '', obj).then(function astVariableDeclaratorNodeIdCb(result) {
      var str = result;
      var init = this.init;
      if (init !== null) {
        init.build('', '', obj, options).then(function astVariableDeclaratorNodeCb(i) {
          str += '=' + i;
          log.warn(options, 'VariableDeclaratorNode - init - build succeded');
          deferred.resolve(str);
        }, function astVariableDeclaratorNodeErrCb(reason) {
          log.warn(options, 'VariableDeclaratorNode - init - build failed');
          deferred.reject(reason);
        }).catch(function astVariableDeclaratorNodeCatch(error) {
          log.error(options, 'VariableDeclaratorNode - init - Error - ', error);
        });
      } else {
        log.info(options, 'VariableDeclaratorNode - build succeded');
        deferred.resolve(str);
      }
    }.bind(this), function astVariableDeclaratorNodeIdErrCb(reason) {
      log.warn(options, 'VariableDeclaratorNode - id - build failed');
      deferred.reject(reason);
    }).catch(function astVariableDeclaratorNodeIdCatch(error) {
      log.error(options, 'VariableDeclaratorNode - id - Error - ', error);
    });

    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.ArrayExpressionNode.prototype.build = function ArrayExpressionNodeBuild(indent, indentChar, obj, options) {
    var str = '[';
    var elements = this.elements;
    var deferred = q.defer();
    var promises = [];
    for (var i = 0, len = elements.length; i < len; i++) {
      promises.push(elements[i].build('', '', obj, options));
    }

    q.allSettled(promises).then(function astArrayExpressionNodeCb(results) {
      results.map(function astArrayExpressionNodeMapCb(d) {
        return d.value;
      }).forEach(function astArrayExpressionNodeForEachCb(result, i) {
        if (i !== 0) {
          str += ', ';
        }
        str += result;
      });
      str += ']';
      log.info(options, 'ArrayExpressionNode - build succeded');
      deferred.resolve(eval(str));
    }, /* istanbul ignore next */ function astArrayExpressionNodeErrCb(reason) {
      log.warn(options, 'ArrayExpressionNode - build failed');
      deferred.reject(reason);
    }).catch( /* istanbul ignore next */ function astArrayExpressionNodeCatch(error) {
      log.error(options, 'ArrayExpressionNode - Error - ', error);
    });
    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.ObjectExpressionNode.prototype.build = /* istanbul ignore next */ function astObjectExpressionNode(indent, indentChar, obj, options) {
    var deferred = q.defer();
    var str = '({';
    var properties = this.properties;
    var keyPromises = [];
    var valuePromises = [];
    for (var i = 0, len = properties.length; i < len; i++) {
      var prop = properties[i];
      var key = prop.key;
      var value = prop.value;

      keyPromises.push(key.build('', '', obj, options));
      valuePromises.push(value.build('', '', obj, options));
    }

    q.allSettled(keyPromises).then(function astObjectExpressionNodeKeyCb(keys) {
      q.allSettled(valuePromises).then(function astObjectExpressionNodeValueCb(values) {
        keys.forEach(function astObjectExpressionNodeForEachCb(k, i) {
          if (i !== 0) {
            str += ', ';
          }
          str += k.value + ': ' + values[i].value;
        });
        log.info(options, 'ObjectExpressionNode - build succeded');
        deferred.resolve(str + '})');
      }, function astObjectExpressionNodeValueErrCb(reason) {
        log.warn(options, 'ObjectExpressionNode - values -  build failed');
        deferred.reject(reason);
      }).catch(function astObjectExpressionNodeValueCatch(error) {
        log.error(options, 'ObjectExpressionNode - values - Error - ', error);
      });
    }, function astObjectExpressionNodeKeyErrCb(reason) {
      log.warn(options, 'ObjectExpressionNode - keys - build succeded');
      deferred.reject(reason);
    }).catch(function astObjectExpressionNodeKeyCatch(error) {
      log.error(options, 'ObjectExpressionNode - keys - Error - ', error);
    });

    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.SequenceExpressionNode.prototype.build = /* istanbul ignore next */ function astSequenceExpressionNode(indent, indentChar, obj, options) {
    var str = '';
    var expressions = this.expressions;
    var deferred = q.defer();
    var promises = [];
    for (var i = 0, len = expressions.length; i < len; i++) {
      promises.push(expressions[i].build('', '', obj, options));
    }

    q.allSettled(promises).then(function astSequenceExpressionNodeCb(results) {
      results.map(function astSequenceExpressionNodeMapCb(d) {
        return d.value;
      }).forEach(function astSequenceExpressionNodeForEachCb(result, i) {
        if (i !== 0) {
          str += ', ';
        }
        str += result;
      });
      log.info(options, 'SequenceExpressionNode - build succeded');
      deferred.resolve(str);
    }, function astSequenceExpressionNodeErrCb(reason) {
      log.warn(options, 'SequenceExpressionNode - build failed');
      deferred.reject(reason);
    }).catch(function astSequenceExpressionNodeCatch(error) {
      log.error(options, 'SequenceExpressionNode - Error - ', error);
    });

    return deferred.prromise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.UnaryExpressionNode.prototype.build = function UnaryExpressionNodeBuild(indent, indentChar, obj, options) {
    var operator = this.operator;
    var deferred = q.defer();
    if (operator === 'delete' || operator === 'void' || operator === 'typeof') {
      this.argument.build('', '', obj, options).then(function astUnaryExpressionNode1Cb(result) {
        log.info(options, 'UnaryExpressionNode - build succeded');
        deferred.resolve(operator + '(' + result + ')');
      }, function astUnaryExpressionNode1ErrCb(reason) {
        log.warn(options, 'UnaryExpressionNode - delete|void|typeof - build failed');
        deferred.reject(reason);
      }).catch(function astUnaryExpressionNode1Catch(error) {
        log.error(options, 'UnaryExpressionNode - delete|void|typeof - Error - ', error);
      });
    } else {
      this.argument.build('', '', obj, options).then(function astUnaryExpressionNode2Cb(result) {
        log.info(options, 'UnaryExpressionNode - build succeded');
        deferred.resolve(operator + '(' + result + ')');
      }, function astUnaryExpressionNode2ErrCb(reason) {
        log.warn(options, 'UnaryExpressionNode - others - build failed');
        deferred.reject(reason);
      }).catch(function astUnaryExpressionNode2Catch(error) {
        log.error(options, 'UnaryExpressionNode - others - Error - ', error);
      });
    }
    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.BinaryExpressionNode.prototype.build = function BinaryExpressionNodeBuild(indent, indentChar, obj, options) {
    var deferred = q.defer();
    this.right.arrayFlag = this.operator === 'inArray';
    this.left.build('', '', obj, options).then(function astBinaryExpressionNodeLeftCb(left) {
      this.right.build('', '', obj).then(function astBinaryExpressionNodeRightCb(right) {
        if (this.right.arrayFlag) {
          if (!Array.isArray(right)) {
            deferred.reject("Element on the right side doesn't evaluate to an array");
          }
          left = eval(left);
          log.info(options, 'BinaryExpressionNode - build succeded');
          deferred.resolve(right.indexOf(left) > -1);
        } else {
          log.info(options, 'BinaryExpressionNode - build succeded');
          deferred.resolve('(' + left + ') ' + this.operator + ' (' + right + ')');
        }
      }.bind(this), /* istanbul ignore next */ function astBinaryExpressionNodeRightErrCb(reason) {
        log.warn(options, 'BinaryExpressionNode - right -build failed');
        deferred.reject(reason);
      }).catch( /* istanbul ignore next */ function astBinaryExpressionNodeRightCatch(error) {
        log.error(options, 'BinaryExpressionNode - right - Error - ', error);
      });
    }.bind(this), /* istanbul ignore next */ function astBinaryExpressionNodeLeftErrCb(reason) {
      log.warn(options, 'BinaryExpressionNode - left -build failed');
      deferred.reject(reason);
    }).catch( /* istanbul ignore next */ function astBinaryExpressionNodeLeftCatch(error) {
      log.warn(options, 'BinaryExpressionNode - left - Error - ', error);
    });
    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.AssignmentExpressionNode.prototype.build = /* istanbul ignore next */ function astAssignmentExpressionNode(indent, indentChar, obj, options) {
    var deferred = q.defer();
    this.left.build('', '', obj, options).then(function astAssignmentExpressionNodeLeftCb(l) {
      this.right.build('', '', obj).then(function astAssignmentExpressionNodeRightCb(r) {
        log.info(options, 'AssignmentExpressionNode - build succeded');
        deferred.resolve(l + ' ' + this.operator + ' (' + r + ')');
      }.bind(this), function astAssignmentExpressionNodeRightErrCb(reason) {
        log.warn(options, 'AssignmentExpressionNode - right - build failed');
        deferred.reject(reason);
      }).catch(function astAssignmentExpressionNodeRightCatch(error) {
        log.error(options, 'AssignmentExpressionNode - right - Error - ', error);
      });
    }.bind(this), function astAssignmentExpressionNodeLeftErrCb(reason) {
      log.warn(options, 'AssignmentExpressionNode - left - build failed');
      deferred.reject(reason);
    }).catch(function astAssignmentExpressionNodeLeftCatch(error) {
      log.warn(options, 'AssignmentExpressionNode - left - Error - ', error);
    });
    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.UpdateExpressionNode.prototype.build = /* istanbul ignore next */ function astUpdateExpressionNode(indent, indentChar, obj, options) {
    var deferred = q.defer();
    this.argument.build('', '', obj, options).then(function astUpdateExpressionNodeCb(result) {
      if (this.prefix) {
        log.info(options, 'UpdateExpressionNode - build succeded');
        deferred.resolve('(' + this.operator + result + ')');
      } else {
        log.info(options, 'UpdateExpressionNode - build succeded');
        deferred.resolve('(' + result + this.operator + ')');
      }
    }.bind(this), function astUpdateExpressionNodeErrCb(reason) {
      log.warn(options, 'UpdateExpressionNode - build failed');
      deferred.reject(reason);
    }).catch(function astUpdateExpressionNodeCatch(error) {
      log.error(options, 'UpdateExpressionNode - Error - ', error);
    });

    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.LogicalExpressionNode.prototype.build = function LogicalExpressionNodeBuild(indent, indentChar, obj, options) {
    var deferred = q.defer();
    q.allSettled([this.left.build('', '', obj, options), this.right.build('', '', obj)]).then(function astLogicalExpressionNodeCb(results) {
      results = results.map(function astLogicalExpressionNodeMapCb(d) {
        return d.value;
      });
      log.info(options, 'LogicalExpressionNode - build succeded');
      deferred.resolve('(' + results[0] + ') ' + this.operator + ' (' + results[1] + ')');
    }.bind(this), /* istanbul ignore next */ function astLogicalExpressionNodeErrCb(reason) {
      log.info(options, 'LogicalExpressionNode - build failed');
      deferred.reject(reason);
    }).catch( /* istanbul ignore next */ function astLogicalExpressionNodeCatch(error) {
      log.error(options, 'LogicalExpressionNode - Error - ', error);
    });

    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.ConditionalExpressionNode.prototype.build = /* istanbul ignore next */ function astConditionalExpressionNode(indent, indentChar, obj, options) {
    var deferred = q.defer();
    q.allSettled([this.test.build('', '', obj, options), this.consequent.build('', '', obj, options), this.alternate.build('', '', obj, options)]).then(function astConditionalExpressionNodeCb(results) {
      results = results.map(function astConditionalExpressionNodeMapCb(d) {
        return d.value;
      });
      log.info(options, 'ConditionalExpressionNode - build succeded');
      deferred.resolve('(' + results[0] + ') ? ' + results[1] + ' : ' + results[2]);
    }, /* istanbul ignore next */ function astConditionalExpressionNodeErrCb(reason) {
      log.warn(options, 'ConditionalExpressionNode - build failed');
      deferred.reject(reason);
    }).catch( /* istanbul ignore next */ function astConditionalExpressionNodeCatch(error) {
      log.error(options, 'ConditionalExpressionNode - Error - ', error);
    });
    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.CallExpressionNode.prototype.build = /* istanbul ignore next */ function astCallExpressionNode(indent, indentChar, obj, options) {
    var deferred = q.defer();
    var args = this.arguments;
    this.callee.build('', '', obj, options).then(function astCallExpressionNodeCb(result) {
      var str = result + '(';
      var promises = [];

      for (var i = 0, len = args.length; i < len; i++) {
        promises.push(args[i].build('', '', obj, options));
      }

      q.allSettled(promises).then(function astCallExpressionNode2Cb(results) {
        results.map(function astCallExpressionNode2MapCb(d) {
          return d.value;
        }).forEach(function astCallExpressionNode2ForEachCb(d, i) {
          if (i !== 0) {
            str += ', ';
          }
          str += d;
        });
        log.info(options, 'CallExpressionNode - build succeded');
        deferred.resolve(str + ')');
      }, /* istanbul ignore next */ function astCallExpressionNode2ErrCb(reason) {
        log.warn(options, 'CallExpressionNode - args - build failed');
        deferred.reject(reason);
      }).catch( /* istanbul ignore next */ function astCallExpressionNode2Catch(error) {
        log.error(options, 'CallExpressionNode - args - Error - ', error);
      });
    }, /* istanbul ignore next */ function astCallExpressionNodeErrCb(reason) {
      log.warn(options, 'CallExpressionNode - callee - build failed');
      deferred.reject(reason);
    }).catch( /* istanbul ignore next */ function astCallExpressionNodeCatch(error) {
      log.warn(options, 'CallExpressionNode - callee - Error - ', error);
    });
    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.MemberExpressionNode.prototype.build = /* istanbul ignore next */ function astMemberExpressionNode(indent, indentChar, obj, options) {
    var deferred = q.defer();
    if (this.computed) {
      q.allSettled([this.object.build('', '', obj), this.property.build('', '', obj, options)]).then(function astMemberExpressionNodeCb(results) {
        results = results.map(function astMemberExpressionNodeMapCb(d) {
          return d.value;
        });
        log.info(options, 'MemberExpressionNode - build succeded');
        deferred.resolve(results[0] + '[' + results[1] + ']');
      }, /* istanbul ignore next */ function astMemberExpressionNodeErrCb(reason) {
        log.warn(options, 'MemberExpressionNode - computed - build failed');
        deferred.reject(reason);
      }).catch( /* istanbul ignore next */ function astMemberExpressionNodeCatch(error) {
        log.error(options, 'MemberExpressionNode - computed - Error - ', error);
      });
    } else {
      q.allSettled([this.object.build('', '', obj), this.property.build('', '', obj)]).then(function astMemberExpressionNode2Cb(results) {
        results = results.map(function astMemberExpressionNode2MapCb(d) {
          return d.value;
        });
        log.info(options, 'MemberExpressionNode - build succeded');
        deferred.resolve(results[0] + '.' + results[1]);
      }, /* istanbul ignore next */ function astMemberExpressionNode2ErrCb(reason) {
        log.warn(options, 'MemberExpressionNode - build failed');
        deferred.reject(reason);
      }).catch( /* istanbul ignore next */ function astMemberExpressionNode2Catch(error) {
        log.error(options, 'MemberExpressionNode - Error - ', error);
      });
    }
    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.SwitchCaseNode.prototype.build = /* istanbul ignore next */ function astSwitchCaseNode(indent, indentChar, obj, options) {
    var str = indent;
    var test = this.test;
    var consequent = this.consequent;
    var newIndent = indent + indentChar;
    var deferred = q.defer();
    var promises = [];
    for (var i = 0, len = consequent.length; i < len; i++) {
      promises.push(consequent[i].build(newIndent, indentChar, obj, options));
    }
    if (test !== null) {
      test.build('', '', obj).then(function astSwitchCaseNodeTestCb(t) {
        str += 'case' + t + ':\n';
        q.allSettled(promises).then(function astSwitchCaseNodeCb(results) {
          results.map(function astSwitchCaseNodeMapCb(d) {
            return d.value;
          }).forEach(function astSwitchCaseNodeForEachCb(result) {
            str += result + '\n';
          });
          log.info(options, 'SwitchCaseNode - build succeded');
          deferred.resolve(str);
        }, function astSwitchCaseNodeErrCb(reason) {
          log.warn(options, 'SwitchCaseNode - consequent - build failed');
          deferred.reject(reason);
        }).catch(function astSwitchCaseNodeCatch(error) {
          log.error(options, 'SwitchCaseNode - consequent - Error - ', error);
        });
      }, function astSwitchCaseNodeTestErrCb(reason) {
        log.warn(options, 'SwitchCaseNode - test - build failed');
        deferred.reject(reason);
      }).catch(function astSwitchCaseNodeTestCatch(error) {
        log.error(options, 'SwitchCaseNode - test - Error - ', error);
      });
    } else {
      str += 'default:\n';
      q.allSettled(promises).then(function astSwitchCaseNodeDefaultCb(results) {
        results.map(function astSwitchCaseNodeDefaultMapCb(d) {
          return d.value;
        }).forEach(function astSwitchCaseNodeDefaultForEachCb(result) {
          str += result + '\n';
        });
        log.info(options, 'SwitchCaseNode - build succeded');
        deferred.resolve(str);
      }, function astSwitchCaseNodeDefaultErrCb(reason) {
        log.warn(options, 'SwitchCaseNode - default - build failed');
        deferred.reject(reason);
      }).catch(function astSwitchCaseNodeDefaultCatch(error) {
        log.error(options, 'SwitchCaseNode - default - Error - ', error);
      });
    }
    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.IdentifierNode.prototype.build = function IdentifierNodeBuild(indent, indentChar, obj, options) {
    return q.fcall(function astIdentifierNodeCb() {
      try {
        log.info(options, 'IdentifierNode - build succeded');
        return this.name;
      } /* istanbul ignore catch */  catch (err) {
        log.error(options, 'IdentifierNode - Error - ', err);
        return err;
      }
    }.bind(this));
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @param  {boolean} evalFlag -eva;lFlag
   * @return {Promise} - deferred.promise
   */
  ast.LiteralNode.prototype.build = function LiteralNodeBuild(indent, indentChar, obj, options, evalFlag) {
    return q.fcall(function astLiteralNodeCb() {
      try {
        log.info(options, 'LiteralNode - build succeded');
        return evalFlag ? eval(this.value) : this.value;
      } /* istanbul ignore catch */ catch (err) {
        log.error(options, 'LiteralNode - Error - ', err);
        return err;
      }
    }.bind(this));
  };

	/**
	 * @param  {indent : string}
	 * @param  {indentChar : string}
	 * @return {Promise}
	 */

  ast.InstanceLiteralNode.prototype.build = function InstanceLiteralNodeBuild(indent, indentChar, obj, options, evalFlag) {
    return q.fcall(function astInstanceLiteralNodeCb() {
      try {
        var str = this.operation ? 'obj.instance.' + this.expression + '.' + this.operation : 'obj.instance' + '.' + this.expression;
        var result = evalFlag ? eval(str) : str;
        if (evalFlag && typeof result === 'string') {
          result = '"' + result + '"';
        }
        log.info(options, 'InstanceLiteralNode - build succeded');
        return result;
      } /* istanbul ignore catch */  catch (err) {
        log.error(options, 'InstanceLiteralNode - Error - ', err);
        return err;
      }
    }.bind(this));
  };

	/**
	 * @param  {indent : string}
	 * @param  {indentChar : string}
	 * @return {Promise}
	 */

  ast.ContextLiteralNode.prototype.build = /* istanbul ignore next */ function astContextLiteralNode(indent, indentChar, obj, options, evalFlag) {
    return q.fcall(function astContextLiteralNodeCb() {
      try {
        var str = this.operation ? 'obj.callContext.' + this.propertyName + '.' + this.operation : 'obj.callContext.' + this.propertyName;
        obj.callContext = options;
        var result = evalFlag ? eval(str) : str;
        if (evalFlag && typeof result === 'string') {
          result = '"' + result + '"';
        }
        log.info(options, 'ContextLiteralNode - build succeded');
        return result;
      } catch (err) {
        log.error(options, 'ContextLiteralNode - Error - ', err);
        return err;
      }
    }.bind(this));
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.ModelLiteralNode.prototype.build = function ModelLiteralNodeBuild(indent, indentChar, obj, options) {
    return q.fcall(function astModelLiteralNodeCb() {
      try {
        var obj = {};
        obj.modelName = this.modelName;
        obj.propertyName = this.propertyName;
        log.info(options, 'ModelLiteralNode - build succeded');
        return obj;
      } /* istanbul ignore catch */  catch (err) {
        log.error(options, 'ModelLiteralNode - Error - ', err);
        return err;
      }
    }.bind(this));
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.ModelExpression.prototype.build = function ModelExpressionBuild(indent, indentChar, obj, options) {
    var deferred = q.defer();
    if (this.type === 'ModelExpression') {
      var property = this.property;
      this.model.build(indent, indentChar, obj, options).then(function astModelExpressionCb(result) {
        var obj = {};
        obj.model = result.model;
        obj.property = result.property + '.' + property;
        log.info(options, 'ModelExpression - build succeded');
        deferred.resolve(obj);
      }, /* istanbul ignore next */ function astModelExpressionErrCb(reason) {
        log.warn(options, 'ModelExpression - build failed');
        deferred.reject(reason);
      }).catch( /* istanbul ignore next */ function astModelExpressionCatch(error) {
        log.error(options, 'ModelExpression - Error - ', error);
      });
    } else {
      obj.property = this.property;
      this.model.build(indent, indentChar, obj, options).then(function astModelExpression2Cb(result) {
        var obj = {};
        obj.model = result;
        log.info(options, 'ModelExpression - build succeded');
        deferred.resolve(obj);
      }, /* istanbul ignore next */ function astModelExpression2ErrCb(reason) {
        log.warn(options, 'ModelExpression - build failed');
        deferred.reject(reason);
      }).catch( /* istanbul ignore next */ function astModelExpression2Catch(error) {
        log.error(options, 'ModelExpression -Error- ', error);
      });
    }
    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.ModelQueryExpression.prototype.build = function ModelQueryExpressionBuild(indent, indentChar, obj, options) {
    var deferred = q.defer();
    this.modelExpression.build(indent, indentChar, obj, options).then(function astModelQueryExpressionCb(modelExpr) {
      this.where.build(indent, indentChar, obj).then(function astModelQueryExpressionWhereCb(where) {
        var modelName;
        var propertyName;
        var property;
        if (this.modelExpression instanceof ast.ModelExpression) {
          modelName = modelExpr.model.modelName;
          propertyName = modelExpr.model.propertyName;
          property = modelExpr.property;
        } else if (this.modelExpression instanceof ast.ModelLiteralNode) {
          modelName = modelExpr.modelName;
          propertyName = modelExpr.propertyName;
        }
        if (property) {
          propertyName = propertyName + '.' + property;
        }
        var Model = loopback.getModel(modelName);
        if (this.arrayFlag) {
          Model.find(where, options, function astModelQueryExpressionWhereFindCb(err, result) {
            if (err) {
              deferred.reject(err);
            } else if (result) {
              var res = result.map(function astModelQueryExpressionWhereFindMapCb(d) {
                return eval('d.' + propertyName);
              });
              log.info(options, 'ModelQueryExpression - build succeded');
              deferred.resolve(res);
            } else {
              log.info(options, 'ModelQueryExpression - build succeded');
              deferred.resolve(result);
            }
          });
        } else {
          Model.findOne(where, options, function astModelQueryExpressionWhereFindOneCb(err, result) {
            if (err) {
              deferred.reject(err);
            } else if (result) {
              var res = eval('result.' + propertyName);
              log.info(options, 'ModelQueryExpression - build succeded');
              deferred.resolve(typeof res === 'string' ? '"' + res + '"' : res);
            } else {
              log.info(options, 'ModelQueryExpression - build succeded');
              deferred.resolve(result);
            }
          });
        }
      }.bind(this), /* istanbul ignore next */ function astModelQueryExpressionWhereErrCb(reason) {
        log.warn(options, 'ModelQueryExpression - where - build failed');
        deferred.reject(reason);
      }).catch( /* istanbul ignore next */ function astModelQueryExpressionWhereCatch(error) {
        log.error(options, 'ModelQueryExpression - where - Error - ', error);
      });
    }.bind(this), /* istanbul ignore next */ function astModelQueryExpressionErrCb(reason) {
      log.warn(options, 'ModelQueryExpression - modelExpression - build failed');
      deferred.reject(reason);
    }).catch( /* istanbul ignore next */ function astModelQueryExpressionCatch(error) {
      log.error(options, 'ModelQueryExpression - modelExpression - Error - ', error);
    });
    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.WhereLiteralNode.prototype.build = function WhereLiteralNodeBuild(indent, indentChar, obj, options) {
    var deferred = q.defer();
    var str = '{';
    this.where.build(indent, indentChar, obj, options).then(function astWhereLiteralNodeCb(result) {
      str += '"where"' + ':' + result;
      log.info(options, 'WhereLiteralNode - build succeded');
      deferred.resolve(JSON.parse(str + '}'));
    }, /* istanbul ignore next */ function astWhereLiteralNodeErrCb(reason) {
      log.warn(options, 'WhereLiteralNode - build failed');
      deferred.reject(reason);
    }).catch( /* istanbul ignore next */ function astWhereLiteralNodeCatch(error) {
      log.error(options, 'WhereLiteralNode - Error - ', error);
    });
    return deferred.promise;
  };

  /**
   * @param  {string} indent - indent
   * @param  {string} indentChar - indentChar
   * @param  {object} obj - object
   * @param  {object} options - callContext options
   * @return {Promise} - deferred.promise
   */
  ast.ConditionalWhereExpression.prototype.build = function ConditionalWhereExpressionBuild(indent, indentChar, obj, options) {
    var deferred = q.defer();
    var str = '{';
    this.left.build(indent, indentChar, obj, options).then(function astConditionalWhereExpressionLeftCb(left) {
      this.right.build(indent, indentChar, obj, options).then(function astConditionalWhereExpressionRightCb(right) {
        str += '"' + this.operator + '" : [' + right + ',' + left + ']';
        log.info(options, 'ConditionalWhereExpression - build succeded');
        deferred.resolve(str + '}');
      }.bind(this), /* istanbul ignore next */ function astConditionalWhereExpressionRightErrCb(reason) {
        log.warn(options, 'ConditionalWhereExpression - right - build failed');
        deferred.reject(reason);
      }).catch( /* istanbul ignore next */ function astConditionalWhereExpressionRightCatch(error) {
        log.error(options, 'ConditionalWhereExpression - right - Error - ', error);
      });
    }.bind(this), /* istanbul ignore next */ function astConditionalWhereExpressionLeftErrCb(reason) {
      log.warn(options, 'ConditionalWhereExpression - left - build failed');
      deferred.reject(reason);
    }).catch( /* istanbul ignore next */ function astConditionalWhereExpressionLeftCatch(error) {
      log.error(options, 'ConditionalWhereExpression - left - Error - ', error);
    });
    return deferred.promise;
  };

  ast.FilterExpression.prototype.build = function FilterExpressionBuild(indent, indentChar, obj, options) {
    var deferred = q.defer();
    var str = '{';
    this.filterUnary.build(indent, indentChar, obj, options).then(function astFilterExpressionCb(result) {
      str += '"' + this.property + '":' + result;
      log.info(options, 'FilterExpression - build succeded');
      deferred.resolve(str + '}');
    }.bind(this), /* istanbul ignore next */ function astFilterExpressionErrCb(reason) {
      log.info(options, 'FilterExpression - build failed');
      deferred.reject(reason);
    }).catch( /* istanbul ignore next */ function astFilterExpressionCatch(error) {
      log.error(options, 'FilterExpression - Error - ', error);
    });
    return deferred.promise;
  };

  ast.FilterNode.prototype.build = function FilterNodeBuild(indent, indentChar, obj, options) {
    var deferred = q.defer();
    var str = '{';
    this.literal.build(indent, indentChar, obj, options, true).then(function astFilterNodeCb(result) {
      switch (this.operator) {
        case '>=':
          str += '"gte" :' + result + '}';
          break;
        case '<=':
          str += '"lte" :' + result + '}';
          break;
        case '>':
          str += '"gt" :' + result + '}';
          break;
        case '<':
          str += '"lt" :' + result + '}';
          break;
        case '=':
          str = result;
          break;
        case '!=':
          str += '"neq" :' + result + '}';
          break;
        case 'between':
          str += '"between" :' + result + '}';
          break;
        case 'like':
          str += '"like" :' + result + '}';
          break;
        case 'notlike':
          str += '"nlike" :' + result + '}';
          break;
        case 'inq':
          str += '"inq" :' + result + '}';
          break;
        case 'notinq':
          str += '"nin" :' + result + '}';
          break;
        default:
          str += '"' + this.operator + '" :' + result + '}';
      }
      log.info(options, 'FilterNode - build succeded');
      deferred.resolve(str);
    }.bind(this), /* istanbul ignore next */ function astFilterNodeErrCb(reason) {
      log.warn(options, 'FilterNode - literal -build failed');
      deferred.reject(reason);
    }).catch( /* istanbul ignore next */ function astFilterNodeCatch(error) {
      log.error(options, 'FilterNode - literal - Error - ', error);
    });

    return deferred.promise;
  };

  ast.DateLiteralNode.prototype.build = function DateLiteralNodeBuild(indent, indentChar, obj, options) {
    if (this.literal === 'now') {
      return q.fcall(function astDateLiteralNodeNowCb() {
        return new Date(Date.now());
      });
    }
    var deferred = q.defer();
    if (Array.isArray(this.literal)) {
      var promises = [];
      this.literal.forEach(function astDateLiteralNodeArrForEachCb(d) {
        promises.push(d.build(indent, indentChar, obj, options));
      });
      q.allSettled(promises).then(function astDateLiteralNodeArrCb(results) {
        var arr = results.map(function astDateLiteralNodeArrMapCb(d) {
          return d.value;
        });
        arr = arr + '';
        log.info(options, 'DateLiteralNode - ArrayLiteral - build succeded');
        deferred.resolve(eval('new Date(' + arr + ')'));
      }, /* istanbul ignore next */ function astDateLiteralNodeArrErrCb(reason) {
        log.warn(options, 'DateLiteralNode - ArrayLiteral - build failed');
        deferred.reject(reason);
      }).catch( /* istanbul ignore next */ function astDateLiteralNodeArrCatch(error) {
        log.error(options, 'DateLiteralNode - ArrayLiteral - Error - ', error);
      });
    } else {
      this.literal.build(indent, indentChar, obj, options, true).then(function astDateLiteralNodeCb(result) {
        result = result instanceof Date ? result : new Date(result);
        deferred.resolve(result);
      }, /* istanbul ignore next */ function astDateLiteralNodeErrCb(reason) {
        log.warn(options, 'DateLiteralNode - literal - build failed');
        deferred.reject(reason);
      }).catch( /* istanbul ignore next */ function astDateLiteralNodeCatch(error) {
        log.error(options, 'DateLiteralNode - literal - Error - ', error);
      });
    }
    return deferred.promise;
  };

  ast.DateExpressionLiteralNode.prototype.build = function DateExpressionLiteralNodeBuild(indent, indentChar, obj, options) {
    var deferred = q.defer();
    this.dateLiteral.build(indent, indentChar, obj, options).then(function astDateExpressionLiteralNodeCb(date) {
      var result;
      switch (this.dateOperator) {
        case 'daydate':
          result = date.getDate();
          break;
        case 'dayname':
          var dayNames = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
          ];
          var dayNo = date.getDate();
          result = '"' + dayNames[dayNo] + '"';
          break;
        case 'day':
          result = date.getDay();
          break;
        case 'month':
          result = date.getMonth();
          break;
        case 'monthname':
          var monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
          var monthNo = date.getMonth();
          result = '"' + monthNames[monthNo] + '"';
          break;
        case 'year':
          result = date.getFullYear();
          break;
        case 'hours':
          result = date.getHours();
          break;
        case 'minutes':
          result = date.getMinutes();
          break;
        case 'seconds':
          result = date.getSeconds();
          break;
        case 'ms':
          result = date.getMilliseconds();
          break;
        default:
          result = date.valueOf();
      }
      log.info(options, 'DateExpressionLiteralNode - build succeded');
      deferred.resolve(result);
    }.bind(this), /* istanbul ignore next */ function astDateExpressionLiteralNodeErrCb(reason) {
      log.warn(options, 'DateExpressionLiteralNode - dateLiteral - build failed');
      deferred.reject(reason);
    }).catch( /* istanbul ignore next */ function astDateExpressionLiteralNodeCatch(error) {
      log.error(options, 'DateExpressionLiteralNode - dateLiteral - Error - ', error);
    });
    return deferred.promise;
  };

  ast.DateConversionLiteralNode.prototype.build = function DateConversionLiteralNodeBuild(indent, indentChar, obj, options) {
    var deferred = q.defer();
    this.expression.build(indent, indentChar, obj, options).then(function astDateConversionLiteralNodeCb(result) {
      var value = eval(result);
      if (typeof value !== 'number') {
        deferred.reject('date conversions can be applied only on numbers');
      }
      switch (this.conversionOp) {
        case 'toDays':
          value *= 1.1574074074074 * Math.pow(10, -8);
          break;
        case 'toYears':
          value *= 3.1709791983765 * Math.pow(10, -11);
          break;
        case 'toWeeks':
          value *= 1.6534391534392 * Math.pow(10, -9);
          break;
        case 'toHours':
          value *= 2.7777777777778 * Math.pow(10, -7);
          break;
        case 'toMins':
          value *= 1.6666666666667 * Math.pow(10, -5);
          break;
        case 'toSecs':
          value *= 0.001;
          break;
        default:
          value = value;
      }
      log.info(options, 'DateConversionLiteralNode - build succeded');
      deferred.resolve(value);
    }.bind(this), /* istanbul ignore next */ function astDateConversionLiteralNodeErrCb(reason) {
      log.warn(options, 'DateConversionLiteralNode - build failed');
      deferred.reject(reason);
    }).catch( /* istanbul ignore next */ function astDateConversionLiteralNodeCatch(error) {
      log.error(options, 'DateConversionLiteralNode - Error - ', error);
    });
    return deferred.promise;
  };

  ast.ModelAllFindsNode.prototype.build = function ModelAllFindsNodeBuild(indent, indentChar, obj, options) {
    var deferred = q.defer();
    log.debug(options, 'in all finds context:', this.contextParam);
    log.debug(options, 'in all finds where:', this.whereClause);
    log.debug(options, 'in all finds paramType:', this.paramType);
    log.debug(options, 'in all finds options:', JSON.stringify(options));
    var switchField;
    var modelName = this.model;
    var param = this.contextParam;
    var query;
    var fieldId;
    var wherefields;
    var whereKey;
    if (this.whereClause !== null) {
      whereKey = this.contextParam;
      param = this.whereClause;
    }
    var finalField = null;
    if (this.finalField !== null) {
      finalField = this.finalField;
    }

    var model = loopback.getModel(modelName);
    var qparamType = this.paramType;
    var promises = [];
    promises.push(param.build('', ' ', obj, options, true));
    var instanceOp;
    q.allSettled(promises).then(function astIntanceLiteralNodeCb(results) {
      log.debug(options, 'result in q instance', JSON.stringify(results));
      if (results.length === 1 && results[0].value !== null && typeof results[0].value !== 'undefined' && typeof results[0].value === 'object') {
        instanceOp = results[0];
      } else if (results.length === 1 && typeof results[0].value !== 'undefined' && typeof results[0].value !== 'object' && results[0].value !== null) {
        instanceOp = results[0].value;
      }
      if (typeof instanceOp === 'string' && typeof instanceOp !== 'undefined' && (instanceOp.indexOf('"') === 0) && instanceOp.indexOf('{') === -1) {
        instanceOp = instanceOp.substring(1, instanceOp.length - 1);
      }
      param = instanceOp;
      if (qparamType === 'where') {
        query = { where: { [whereKey]: param } };
        switchField = 'where';
      } else {
        switchField = 'findById';
        fieldId = param;
      }

      log.debug(options, 'fieldId:', fieldId);
      log.debug(options, 'switch field:', switchField);
      log.debug(options, 'wherefields:', wherefields);
      log.debug(options, 'query is :', JSON.stringify(query));
      switch (switchField) {
        case 'where':
          log.debug(options, 'in case where');
          model.findOne(query, options, function astModelFindQueryCb(err, result) {
            if (err) {
              log.debug(options, 'Error occured ModelAllFinds', err);
              deferred.reject(err);
            } else if (result) {
              log.debug(options, '----------------------', JSON.stringify(result), '----finalField:', finalField);
              if (finalField !== null) {
                var res = eval('result.' + finalField);
                log.debug(options, 'ModelAllFinds - where build succeded:', res);
                deferred.resolve(typeof res === 'string' ? '"' + res + '"' : res);
              } else {
                deferred.resolve(result);
              }
            } else {
              log.debug(options, 'ModelAllFinds - build succeded');
              deferred.resolve(result);
            }
          });
          break;
        case 'findById':
          log.debug(options, 'in find by id:', fieldId);
          if (typeof options === 'undefined') {
            deferred.reject('');
            break;
          }
          model.findById(fieldId, options, function astModelFindQueryCb(err, result) {
            log.debug(options, 'result in parser js:', JSON.stringify(result));
            if (err) {
              log.debug(options, 'Error occured ModelAllFinds');
              deferred.reject(err);
            } else if (result) {
              log.debug(options, '----------------------', JSON.stringify(result), '----finalField:', finalField);
              if (finalField !== null) {
                var res = eval('result.' + finalField);
                log.debug(options, 'ModelAllFinds - build succeded:', res);
                deferred.resolve(typeof res === 'string' ? '"' + res + '"' : res);
              } else {
                deferred.resolve(result);
              }
            } else {
              log.debug(options, 'ModelAllFinds - build succeded else:', fieldId);
              deferred.reject('');
            }
          });
          break;
        default:
          deferred.reject(null);
          break;
      }
    }, /* istanbul ignore next */ function astProgramNodeErrCb(reason) {
      log.debug(options, ' - build failed');
      deferred.reject(reason);
    }).catch( /* istanbul ignore next */ function astProgramNodeCatch(error) {
      log.debug(options, ' Error - ', error);
    });
    return deferred.promise;
  };
};
