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


module.exports = {
  sanitizePublicKey: sanitizePublicKey
};
// function to form publickey
function sanitizePublicKey(key) {
  // Public Key or Certificate must be in this specific format or else the function won't accept it
  var beginKey = '';
  var endKey = '';
  if (key.indexOf('-----BEGIN PUBLIC KEY') > -1) {
    beginKey = '-----BEGIN PUBLIC KEY-----';
    endKey = '-----END PUBLIC KEY-----';
  } else {
    beginKey = '-----BEGIN CERTIFICATE-----';
    endKey = '-----END CERTIFICATE-----';
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
// function generate(key, value) {
//   log.debug(log.defaultContext(), 'call for generate token with [', key, '] and value [', value, '] ');
//   var claims = {};
//   claims[key] = value;
//   // sign with default (HMAC SHA256)
//   var token = jwt.sign(claims, secretKey);
//   return token;
// }

// function verify(token) {
//   log.debug(log.defaultContext(), 'call for verification token [', token, ']');
//   // verify a token symmetric

//   jwt.verify(token, secretKey, function JwtTokenUtilVerifyCb(err, decoded) {
//     if (err) {
//       return false;
//     }
//     return true;
//   });
// }
