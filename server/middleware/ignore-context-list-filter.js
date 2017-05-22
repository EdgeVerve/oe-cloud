/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var logger = require('../../lib/logger');
var log = logger('ingore-context-list-filter');

/**
 * This filter is used to populate ignore list which will be used to ignore the particular
 * value while calculationg score in data personalization.
 * It reads the header key 'x-ignore-context' and puts in callContext.ignoreContextList.
 *
 * @name ignore context list filter
 * @author Ramesh Choudhary
 * @memberof Middleware
 */

module.exports = function IgnoreContextListFilter(req, res, callContext, callback) {
  if (req.headers['x-ignore-context']) {
    log.debug(req.callContext, 'Setting callContext.ignoreContextList from headers');
    callContext.ignoreContextList = JSON.parse(req.headers['x-ignore-context']);
  } else if (req.query && req.query['x-ignore-context']) {
    log.debug(req.callContext, 'Setting callContext.ignoreContextList from query string');
    callContext.ignoreContextList = JSON.parse(req.query['x-ignore-context']);
  }
  callback(null);
};
