/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This middleware overrides http method
 * Some corporate firewalls do not allow making calls to methods like DELETE and PUT
 * as their security policy. In such situation the API caller can use POST method to
 * call the API and specify the actual method they intended to call in the query
 * string or as part of HTTP header (X-HTTP-METHOD-OVERRIDE)
 *
 * @name HTTP Method Overriding
 * @author Ramesh Choudhary
 * @memberof Middleware
 */

module.exports = function HttpMethodOverridingFilter(options) {
  /* TODO: Add more control checks to allow/disallow method overriding.
  */
  return function methodOverride(req, res, next) {
    var requestedMethod = req.headers['x-http-method-override'];

    if (typeof requestedMethod !== 'undefined') {
      req.originalMethod = req.method;
      req.method = requestedMethod;
    }
    next();
  };
};
