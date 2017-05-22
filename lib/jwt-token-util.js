/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * JWT Token Util
 *
 * @module JWT Token Util
 *
 */

const SECRET_KEY = 'secret_key';
var logger = require('../lib/logger');
var log = logger('jwt-token-util');
// var debug = require('debug')('jwt-token-util');
// used to create, sign, and verify tokens
var jwt = require('jsonwebtoken');

var evconfig = require('../server/ev-config.json');
var secretKey = evconfig[SECRET_KEY];

module.exports = {
  generate: generate,
  verify: verify
};

function generate(key, value) {
  log.debug(log.defaultContext(), 'call for generate token with [', key, '] and value [', value, '] ');
  log.info(log.defaultContext(), 'call for generate token with [', key, '] and value [', value, '] ');
  var claims = {};
  claims[key] = value;
  // sign with default (HMAC SHA256)
  var token = jwt.sign(claims, secretKey);
  return token;
}

function verify(token) {
  log.debug(log.defaultContext(), 'call for verification token [', token, ']');
  log.info(log.defaultContext(), 'call for verification token [', token, ']');
  // verify a token symmetric

  jwt.verify(token, secretKey, function JwtTokenUtilVerifyCb(err, decoded) {
    if (err) {
      return false;
    }
    return true;
  });
}
