/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
// Not able to use routes:after - middleware to log the response due to
// https://github.com/strongloop/loopback/issues/1234#issuecomment-158415183
var log = require('oe-logger')('response-logger');

module.exports = function responseLogger(app) {
  app.remotes().after('**', function afterRemoteListner(ctx, next) {
    log.debug(ctx.req.callContext, { Response: ctx.res.statusCode, Headers: ctx.res._headers });
    log.trace(ctx.req.callContext, { Body: ctx.result });
    next();
  });
};
