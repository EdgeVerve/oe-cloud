/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var logger = require('../../lib/logger');
var log = logger('device-contributor');

/**
 * This contributor reads the 'device' variable value from header or query
 * string and puts in callContext.ctx.device and 'deviceweight' variable value
 * from header or query string and puts in callContext.ctxWeights.device
 *
 * @memberof Middleware
 * @name Device Contributor
 * @author Ramesh Choudhary
 */

module.exports = function DeviceContributor(req, res, callContext, callback) {
  if (req.headers.device) {
    log.debug(callContext, 'Setting callContext.scopeVars.device from headers');
    callContext.ctx.device = req.headers.device;
  } else if (req.query && req.query.device) {
    log.debug(callContext, 'Setting callContext.scopeVars.device from query string');
    callContext.ctx.device = req.query.device;
  }

  if (callContext.ctx.device) {
    if (req.headers.deviceweight) {
      callContext.ctxWeights.device = req.headers.deviceweight;
    } else if (req.query.deviceweight) {
      callContext.ctxWeights.device = req.query.deviceweight;
    } else {
      callContext.ctxWeights.device = '0';
    }
  }
  callback(null);
};
