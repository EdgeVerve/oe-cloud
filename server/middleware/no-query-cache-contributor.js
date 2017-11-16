/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var log = require('oe-logger')('no-query-cache-contributor');

/*
 * This middleware is used to add noQueryCache option to the request if it was passed as a query paramenter on the request.
 *
 * @name No Query Cache Contributor
 * @author Karin angel
 * @memberof Middleware
 */

module.exports = function noQueryCacheContributor(options) {
  return function noQueryCacheContributorFn(req, res, next) {
    if (req.query && (!req.query.noQueryCache || req.query.noQueryCache === '0')) {
      log.debug(req.callContext, 'noQueryCache is undefined');
      next();
    } else if (req.query && req.query.noQueryCache === '1') {
      log.debug(req.callContext, 'request with noQueryCache was sent with value of 1');
      req.callContext.noQueryCache = true;
      next();
    } else {
      var err = new Error('invalid value in noQueryCache was sent. Treating as undefined');
      log.error(req.callContext, err);
      next();
    }
  };
};
