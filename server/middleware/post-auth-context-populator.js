const loopback = require('loopback');
const log = require('oe-logger')('context-populator-filter');
var rootModel;
/**
 * Populates accessToken data on the request.callContext
 * This information can be used in before-remote hooks
 * @returns {function} middleware-function
 * @param {object} middlewareOptions middleware options
 */
module.exports = function postAuthContextPopulator(middlewareOptions) {
  return function setRequestContext(req, res, next) {
    rootModel = rootModel || loopback.findModel('Model');

    if (req.accessToken) {
      var callContext = req.callContext || {};
      callContext.ctx = callContext.ctx || {};

      var obj = Object.assign({}, req.accessToken.__data);
      // remove properties that are not required
      delete obj.id;
      delete obj.ttl;
      delete obj.created;
      delete obj.ctx;
      // Create deep-copy of roles array
      if (req.accessToken && req.accessToken.__data && req.accessToken.__data.roles) {
        obj.roles = JSON.parse(JSON.stringify(req.accessToken.__data.roles));
      } else {
        obj.roles = [];
      }

      callContext.ctx = Object.assign(callContext.ctx, obj);

      callContext.ctx = Object.assign(callContext.ctx, req.accessToken.ctx);
      callContext.accessToken = req.accessToken.id;

      req.callContext = callContext;

      log.debug(req.callContext, 'postAuthContextPopulator : context setting as  = ', callContext);
    }
    if (rootModel && rootModel.setCallContext) {
      req.callContext = rootModel.setCallContext(req);
    }
    req.callContext = req.callContext || {};
    req.callContext.ctx = req.callContext.ctx || {};
    next();
  };
};
