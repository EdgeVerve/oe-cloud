/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
// var loopback = require ('loopback');
// var uuid = require ('node-uuid');
// var logger = require ('../../lib/logger');
// var debug = require('debug')('req-logging-filter');
var log = require('../../lib/logger')('req-logging-filter');

/**
 * Request Logging Filter
 *
 * @name Request Logging Filter
 * @memberof Middleware
 */

module.exports = function ReqLoggingFilter(options) {
  return function doLog(req, res, next) {
    // log runs into circular json object issues - this is a problem that should be dealt with
    log.debug(req.callContext, 'Request received -- ', req);
    next();
  };
};
