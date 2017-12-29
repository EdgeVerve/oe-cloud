/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var logger = require('oe-logger');
var log = logger('node-red-access-control');


function isAdmin(req) {
  var role = false;
  if (req.accessToken) {
    var instance = req.accessToken.__data;
    if (instance) {
      role = instance.roles.includes('admin');
    }
  }
  return role;
}

/**
 *  Denie access to Node Red for non Admin users.
 */

module.exports = function nodeRedAccessControl(options) {
  return function (req, res, next) {
    if (isAdmin(req)) {
      next();
    } else {
      log.info('Admin users only has permission to access Node Red.');
      res.status(401).send('Unauthorized. \n Please sign in as administrator, to access Node-Red.');
    }
  };
};
