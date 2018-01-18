/**
*
* ©2016-2018 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
* Bangalore, India. All Rights Reserved.
*
*/

module.exports = ProxyContext;

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var inherits = util.inherits;
var SharedMethod = require('strong-remoting/lib/shared-method');
var debug = require('debug')('oe-cloud:proxy-context');

function ProxyContext(req, ctorArgs, args) {
  this.req = req;
  this.ctorArgs = ctorArgs;
  this.args = args;
}


inherits(ProxyContext, EventEmitter);

/**
 * Get an arg by name using the given options.
 *
 * @param {String} name
 * @param {Object} options **optional**
 */

ProxyContext.prototype.getArgByName = function (name, options) {
  return this.args[name];
};

ProxyContext.prototype.setArgByName = function (name, options) {
  throw new Error('etArgByName not implemented');
};

ProxyContext.prototype.setResultByName = function (name, options) {

};

ProxyContext.prototype.getResultByName = function (name, options) {

};

/**
 * Invoke the given shared method using the provided scope against
 * the current context.
 */

ProxyContext.prototype.invoke = function (scope, method, fn) {
  var args = method.isSharedCtor ? this.ctorArgs : this.args;
  var returns = method.returns;

  // invoke the shared method
  method.invoke(scope, args, {}, this, function (err) {
    var resultArgs = arguments;

    if (method.name === 'on' && method.ctor instanceof EventEmitter) {
      resultArgs[1] = resultArgs[0];
      err = null;
    }

    if (err) {
      return fn(err);
    }
    var result;

    // map the arguments using the returns description
    if (returns.length > 1) {
      // multiple
      result = {};

      returns.forEach(function (o, i) {
        // map the name of the arg in the returns desc
        // to the same arg in the callback
        result[o.name || o.arg] = resultArgs[i + 1];
      });
    } else {
      // single or no result...
      result = resultArgs[1];
    }

    fn(null, result);
  });
};


ProxyContext.prototype.setReturnArgByName = function (name, value) {
  var ARG_WAS_HANDLED = true;
  var returnDesc = this.method.getReturnArgDescByName(name);
  var res = this.res;

  if (!returnDesc) {
    debug('warning: cannot set return value for arg' +
      ' (%s) without description!', name);
    return;
  }

  if (returnDesc.root) {
    this.returnsFile = SharedMethod.isFileType(returnDesc.type);
    return;
  }

  if (returnDesc.http) {
    switch (returnDesc.http.target) {
      case 'status':
        res.status(value);
        return ARG_WAS_HANDLED;
      case 'header':
        res.set(returnDesc.http.header || name, value);
        return ARG_WAS_HANDLED;
      default:
        return ARG_WAS_HANDLED;
    }
  }
};


