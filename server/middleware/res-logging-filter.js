/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
// var loopback = require ('loopback');
// var uuid = require ('node-uuid');
// var debug = require('debug')('res-logging-filter');
var log = require('../../lib/logger')('res-logging-filter');

/**
 * Response Logging Filter
 *
 * @name Response Logging Filter
 * @memberof Middleware
 */

module.exports = function ResLoggingFilter(options) {
  return function doLog(req, res, next) {
    log.debug(req.callContext, 'response logger called');
    log.debug(req.callContext, 'Response sent --', res);
    next();
  };
};
