/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var log = require('oe-logger')('req-logging-filter');

/**
 * Request Logging Filter
 *
 * @name Request Logging Filter
 * @memberof Middleware
 */

module.exports = function ReqLoggingFilter(options) {
  return function doLog(req, res, next) {
    log.debug(req.callContext, { Request: req.method + ' ' + req.url, Headers: req.headers, Query: req.query });
    log.trace(req.callContext, { Body: req.body });
    next();
  };
};
