/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var log = require('oe-logger')('no-instacne-cache-contributor');

/*
 * This middleware is used to add noInstanceCache option to the request if it was passed as a query paramenter on the request.
 *
 * @name No Instacne Cache Contributor
 * @author Karin angel
 * @memberof Middleware
 */

module.exports = function noInstacneCacheContributor(options) {
  return function noInstacneCacheContributorFn(req, res, next) {
    if (req.query && (!req.query.noInstanceCache || req.query.noInstanceCache === '0')) {
      log.debug(req.callContext, 'noInstanceCache is undefined');
      next();
    } else if (req.query && req.query.noInstanceCache === '1') {
      log.debug(req.callContext, 'request with noInstanceCache was sent with value of 1');
      req.callContext.noInstanceCache = true;
      next();
    } else {
      var err = new Error('invalid value in noInstanceCache was sent. Treating as undefined');
      log.error(req.callContext, err);
      next();
    }
  };
};
