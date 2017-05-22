/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var log = require('../../lib/logger')('context-populator-filter');
var camelCase = require('camelcase');


/**
 * This middleware sets callContext based on logged in user
 * This is run post authorization
 * @name Post Auth Context Populator
 * @author Praveen Kumar Gulati
 * @memberof Middleware
 */

module.exports = function postAuthContextPopulator(options) {
  var excludeList = ['id', 'ttl', 'created'];

  return function setRequestContext(req, res, next) {
    if (req.accessToken) {
      var callContext = req.callContext || {};
      callContext.ctx = callContext.ctx || {};

      var instance = req.accessToken.__data;
      if (instance) {
        var keys = Object.keys(instance);
        keys.map(function instanceKeysMapFn(key, index) {
          if (excludeList.indexOf(key) === -1) {
            // TODO will put generic check for Array
            if (key === 'roles') {
              callContext.ctx[camelCase(key)] = JSON.parse(JSON.stringify(instance[key]));
            } else {
              callContext.ctx[camelCase(key)] = instance[key];
            }
          }
        });
      }

      callContext.ctx.remoteUser = req.accessToken.username;

      Object.keys(callContext.ctx).map(function callcontextForEachKeyFn(key, index) {
        callContext.ctxWeights[key] = callContext.ctxWeights[key] || '1';
      });
      callContext.accessToken = req.accessToken.id;
      req.callContext = callContext;

      log.debug(req.callContext, 'postAuthContextPopulator : context setting as  = ', JSON.stringify(callContext));
    }
    next();
  };
};
