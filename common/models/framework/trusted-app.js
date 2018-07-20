/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var jwt = require('jsonwebtoken');
const loopback = require('loopback');
const log = require('oe-logger')('trusted-app');
var jwtUtil = require('../../../lib/jwt-token-util');


module.exports = function TrustedApp(trustedApp) {
  /**
     * This function accepts username and password,
     * and authenticates the user with service account set with trusted app
     *
     *
     * @param {object} data - {"username":"", "password":"", "appId":""}
     * @param {object} options - callcontext options
     * @param {function} cb - callback/next function
     * @returns {string} token - jwt token to use to use
     */
  trustedApp.authenticate = function authenticateTrustedApp(data, options, cb) {
    var self = this;
    var error;
    // cb = cb || utils.createPromiseCallback();
    // verify the trusted app is assigned with this username
    if (!data.username || !data.password || !data.appId) {
      error = new Error();
      error.message = 'username, password and appId; all three values are mandatory';
      error.statusCode = 400;
      error.code = 'USERNAME_PASSWORD_REQUIRED';
      error.retriable = false;
      return cb(error);
    }
    var where = {
      'where': {
        'and': [{
          'username': data.username
        },
        {
          'appId': data.appId
        }
        ]
      }
    };
    self.findOne(where, options, function fnFetchTrustedApp(err, app) {
      if (err) {
        log.info(options, err);
        return cb(err);
      }

      if (app && app.appId) {
        log.debug(options, 'trusted app configured properly for ', data.appId, ' and username ', data.username);
        // make login call
        if (app) {
          var baseUser = loopback.getModelByType('BaseUser');
          baseUser.login({ 'username': data.username, 'password': data.password }, options, function fnTrustedAppLoggedIn(err, user) {
            if (err) {
              log.error(options, err);
              return cb(err);
            }

            if (!user) {
              log.debug(options, 'Associated service user not found for ', data.appId, ' and username ', data.username);
              error = new Error();
              error.message = 'Trusted app not configured properly.';
              error.statusCode = 400;
              error.code = 'TRUSTED_APP_AUTH_FAILED';
              error.retriable = false;
              return cb(error);
            }
            // generate a jwt for trusted app
            if (user && user.id) {
              var jwtConfig = jwtUtil.getJWTConfig();
              var jwtOpts = {};
              var jwtData = {};
              jwtOpts.issuer = jwtConfig.issuer;
              jwtOpts.audience = jwtConfig.audience;
              // access token ttl set to jwt's expiry in seconds
              jwtOpts.expiresIn = user.ttl;
              jwtData.username = user.username;
              jwtData.userId = user.userId;
              jwtData.roles = user.roles;
              jwtData.tenantId = user.tenantId;
              jwtData.expiresIn = jwtOpts.expiresIn;
              jwtData[jwtConfig.keyToVerify] = app.appId;

              jwt.sign(jwtData, jwtConfig.secretOrKey, jwtOpts, function jwtSignCb(err, token) {
                if (err) {
                  log.error(options, 'Trusred app JWT signing error ', err);
                  log.debug(options, err);
                  return cb(err);
                }

                cb(null, token);
              });
            }
          });
        }
      } else {
        log.debug(options, 'trusted app not configured properly for ', data.appId, ' and username ', data.username);
        error = new Error();
        error.message = 'Trusted app not configured properly.';
        error.statusCode = 400;
        error.code = 'TRUSTED_APP_ERROR';
        error.retriable = false;
        return cb(error);
      }
    });
  };
  // accepts object with username,
  trustedApp.remoteMethod('authenticate', {
    description: 'authenticate a trusted app service account',
    accepts: [{ arg: 'data', type: 'object', required: true, http: { source: 'body' } }],
    http: {
      verb: 'POST',
      path: '/authenticate'
    },
    returns: {
      arg: 'token',
      type: 'string',
      root: true
    }
  });
};
