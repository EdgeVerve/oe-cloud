/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var memoize = require('fast-memoize');
var parser = require('ua-parser-js');

var memoizedParser = memoize(parser);


/**
 * This middleware is used to get user related detils like device , os , browser, cpu etc .
 *
 * @name Useragent Populator Filter
 * @author Ramesh Choudhary
 * @memberof Middleware
 */

module.exports = function UserAgentPopulationFilter(options) {
  return function UserAgentPopulationFilterFn(req, res, next) {
    req.callContext['user-agent'] = memoizedParser(req.headers['user-agent']);
    next();
  };
};
