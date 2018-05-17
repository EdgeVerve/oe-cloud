/**
 *
 * �2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var logger = require('oe-logger');
var log = logger('admin');
var jwt = require('jsonwebtoken');
var jwtUtil = require('../../../lib/jwt-token-util');

module.exports = function AdminFunction(admin) {
  admin.checkLicense = function checkLicense(options, cb) {
    var licensePublicKey = jwtUtil.sanitizePublicKey(process.env.LICENSE_PUBLICKEY);
    var licenseKey = process.env.LICENSE_KEY;
    if (licensePublicKey && licenseKey) {
      var decoded = jwt.verify(licenseKey, licensePublicKey, {
        algorithm: 'RS256'
      });
      if (decoded && decoded.endl) {
        log.info(options, 'licence info decoded');
        cb(null, { 'expired': (Date.now() > decoded.endl), 'expiryDate': new Date(decoded.endl) });
      } else {
        log.info(options, 'licence info not configured');
        cb(null, { 'expired': false, 'expiryDate': 'License not set' });
      }
    }
  };

  admin.remoteMethod('checkLicense', {
    description: 'check if license expiry',
    accessType: 'READ',
    accepts: [],
    http: {
      verb: 'GET',
      path: '/checkLicense'
    },
    returns: [{
      arg: 'body',
      type: 'string',
      root: true
    }]
  });
};
