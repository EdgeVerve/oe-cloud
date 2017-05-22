/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var log = require('../../lib/logger')('context-populator-filter');
var camelCase = require('camelcase');
var uuid = require('node-uuid');

/**
 * This middleware sets callContext into Request Object
 *
 *
 * @name HTTP Method Overriding
 * @author Praveen Kumar Gulati
 * @memberof Middleware
 */

var excludeHeadersList = [];
var queryStringContext = [];

function setContextValue(callContext, key, valueobj) {
  var newkey = key;
  if (key === 'x-evproxy-context') {
    var str = Buffer.from(valueobj[key], 'base64').toString('utf8');
    callContext.evproxyContext = JSON.parse(str);
  } else if (key.indexOf('x-ctx-weight-') === 0) {
    newkey = newkey.replace('x-ctx-weight-', '');
    callContext.ctxWeights[camelCase(newkey)] = valueobj[key];
  } else if (key.indexOf('x-') === 0) {
    newkey = newkey.replace('x-', '');
    callContext[camelCase(newkey)] = valueobj[key];
  } else {
    callContext.ctx[camelCase(key)] = valueobj[key];
  }
}

module.exports = function preAuthContextPopulator(options) {
  excludeHeadersList = options.excludeHeadersList || [];
  queryStringContext = options.queryStringContext || [];

  return function setRequestContext(req, res, next) {
    var callContext = { ctx: { remoteUser: 'system', tenantId: 'default' }, defaults: false, ctxWeights: {} };

    // checking for req.headers.authorization for having comma (', ') seperated tokens.
    // spliting and reassigning req.headers.authorization to first index of the split always.
    // so we make sure that req.headers.authorization with only one token.
    if (req.headers && req.headers.authorization) {
      var authorization = req.headers.authorization;
      var tokens = authorization.split(', ');
      req.headers.authorization = tokens[0];
    }

    // To avoid setting tenant id etc. from a previous user
    // Who has not been logged out properly
    if (req.url.startsWith('/api/BaseUsers/login') || req.url.startsWith('/auth/local')) {
      if (req.headers) {
        delete req.headers.access_token;
      }
      if (req.query) {
        delete req.query.access_token;
      }
    }

    // Generate a unique id and add to context as txnId
    // this is used in log utility
    var txnId = uuid.v1();
    callContext.txnId = txnId;

    // is it really required? If yes then why not use getMethodByName
    var invokedPlural;
    if (req.url.split('/').length > 2) {
      var temp = req.url.split('/')[2];
      if (temp && temp.length > 0) {
        invokedPlural = temp.split('?')[0];
      }
    }
    if (invokedPlural) {
      callContext.modelName = invokedPlural;
    }

    var headerKeys = Object.keys(req.headers);
    headerKeys.map(function headerKeysmapFn(key, index) {
      if (excludeHeadersList.indexOf(key) === -1) {
        setContextValue(callContext, key, req.headers);
      }
    });

    // From Query Parameters only few things should be overridable
    // on top of headers, so have a positive list for these
    var queryKeys = Object.keys(queryStringContext);
    queryKeys.map(function queryKeysMapFn(key, index) {
      if (req.query && req.query[key]) {
        setContextValue(callContext, key, req.query);
      }
    });

    var langKey = 'accept-language';
    if (!callContext.ctx.lang && req.headers[langKey]) {
      callContext.ctx.lang = req.headers[langKey].split(',')[0];
    }

    Object.keys(callContext.ctx).map(function callcontextKeysMapFn(key, index) {
      callContext.ctxWeights[key] = callContext.ctxWeights[key] || '1';
    });

    req.callContext = callContext;
    log.debug(req.callContext, 'context setting as  = ', JSON.stringify(callContext));
    next();
  };
};
