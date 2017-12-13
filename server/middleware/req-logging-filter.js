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
    // log.debug(req.callContext, req.method, ' ', req.url);
    // if (req._body) log.debug(req.callContext, { Body: req.body });
    log.debug(req.callContext, { Request: req.method + ' ' + req.url, Headers: req.headers, Query: req.query, Body: req.body });
    next();
  };
};
