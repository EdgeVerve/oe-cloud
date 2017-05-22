/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * These files are Middleware scripts. These are used to intercept request/responses
 * and inject data into the context and other "gatekeeper" tasks.
 *
 * @namespace Middleware
 */

module.exports = function namespace(options) {
  return function namespace2(req, res, next) {
    next();
  };
};
