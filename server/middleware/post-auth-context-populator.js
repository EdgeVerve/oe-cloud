/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var log = require('oe-logger')('context-populator-filter');
// var DB_LOCK_MODE = null;

/**
 * This middleware sets callContext based on logged in user
 * This is run post authorization
 * @name Post Auth Context Populator
 * @author Praveen Kumar Gulati
 * @memberof Middleware
 */

module.exports = function postAuthContextPopulator(options) {
  // var excludeList = ['id', 'ttl', 'created'];

  return function setRequestContext(req, res, next) {
    if (req.accessToken) {
      var callContext = req.callContext || {};
      callContext.ctx = callContext.ctx || {};


      var obj = Object.assign({}, req.accessToken.__data);
      // remove properties that are not required
      delete obj.id;
      delete obj.ttl;
      delete obj.created;
      obj.roles = req.accessToken.__data.roles ? JSON.parse(JSON.stringify(req.accessToken.__data.roles)) : null;
      Object.assign(callContext.ctx, obj);

      callContext.ctx.remoteUser = req.accessToken.username;

      // this check happens in data personalization, default is taken 1
      // Object.keys(callContext.ctx).map(function callcontextForEachKeyFn(key, index) {
      //     callContext.ctxWeights[key] = callContext.ctxWeights[key] || '1';
      // });
      // callContext.accessTokenData = req.accessToken.__data;
      callContext.accessToken = req.accessToken.id;
      req.callContext = callContext;

      log.debug(req.callContext, 'postAuthContextPopulator : context setting as  = ', callContext);
    }

    // set noquerycache and noinstancecache true if value set to 1
    if (req.query.noQueryCache === '1') {
      req.callContext.noQueryCache = true;
    }
    if (req.query.noInstanceCache === '1') {
      req.callContext.noInstanceCache = true;
    }
    if (req.headers['x-evproxy-db-lock'] === '1') {
      // log.debug(req.callContext, 'x-evproxy-db-lock header has value of 1');
      // if (DB_LOCK_MODE === null) {
      //     DB_LOCK_MODE = req.app.get('dbLockMode') || "dbLock";
      // }

      // DB_LOCK_MODE;
      req.callContext.lockMode = 'dbLock';
    }
    next();
  };
};
