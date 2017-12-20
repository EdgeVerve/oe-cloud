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

var log = require('oe-logger')('jwt-token-util');

module.exports = {
  sanitizePublicKey: sanitizePublicKey,
  getJWTConfig: getJWTConfig
};


/**
 *
 * function to get sanitized secret key if it is public key or certificate
 * @param {string} key - key
 * @return {string} key
 */
function sanitizePublicKey(key) {
  // Public Key or Certificate must be in this specific format or else the function won't accept it
  if (!key || typeof key !== 'string' || (key && key.length < 1)) {
    return key;
  }
  var beginKey = '';
  var endKey = '';
  if (key.indexOf('-----BEGIN PUBLIC KEY') > -1) {
    beginKey = '-----BEGIN PUBLIC KEY-----';
    endKey = '-----END PUBLIC KEY-----';
  } else if (key.indexOf('-----BEGIN CERTIFICATE-----') > -1) {
    beginKey = '-----BEGIN CERTIFICATE-----';
    endKey = '-----END CERTIFICATE-----';
  } else {
    return key;
  }

  key = key.replace('\n', '');
  key = key.replace(beginKey, '');
  key = key.replace(endKey, '');

  var result = beginKey;
  while (key.length > 0) {
    if (key.length > 64) {
      result += '\n' + key.substring(0, 64);
      key = key.substring(64, key.length);
    } else {
      result += '\n' + key;
      key = '';
    }
  }

  if (result[result.length] !== '\n') { result += '\n'; }
  result += endKey + '\n';
  return result;
}

/**
 *
 * function to return default or JWT_CONFIG env parsed JWT config
 * @return {string} jwtConfig
 */
function getJWTConfig() {
  var jwtConfig = {
    'issuer': 'mycompany.com',
    'audience': 'mycompany.net',
    'keyToVerify': 'client_id'
  };
  if (process.env.JWT_CONFIG && process.env.JWT_CONFIG.length > 0) {
    try {
      var tempConfig = JSON.parse(process.env.JWT_CONFIG);
      jwtConfig = tempConfig && typeof tempConfig === 'object' ? tempConfig : jwtConfig;
    } catch (e) {
      log.error(log.defaultContext(), e);
    }
  }
  jwtConfig.secretOrKey = process.env.SECRET_OR_KEY ? process.env.SECRET_OR_KEY : (jwtConfig.secretOrKey ? jwtConfig.secretOrKey : 'secret');
  return jwtConfig;
}
