/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
const loopback = require('loopback');
const Passport = require('passport');
const logger = require('oe-logger');
const log = logger('JWT-Assertion');
const app = require('../server').app;
const uuid = require('node-uuid');
const jwtUtil = require('../../lib/jwt-token-util');
/**
 * This Auth middleware is responsible for JWT authentication strategy.
 * When JWT is enabled it reads the JWT from the authentication header and
 * verifies and decodes and creates an access token.
 *
 * @name JWT assertion
 * @author Ramesh Choudhary, Praveen
 * @memberof Middleware
 */

module.exports = function JWTAssertionFn(options) {
  const JwtStrategy = require('passport-jwt').Strategy;
  const ExtractJwt = require('passport-jwt').ExtractJwt;

  var jwtConfig = jwtUtil.getJWTConfig();
  const cachedTokens = {};

  const opts = {};
  var key = process.env.SECRET_OR_KEY && process.env.SECRET_OR_KEY.length > 0 ? jwtUtil.sanitizePublicKey(process.env.SECRET_OR_KEY) : jwtUtil.sanitizePublicKey(jwtConfig.secretOrKey) || 'secret';
  // secretOrKey is a REQUIRED string or buffer containing the secret(symmetric) or PEM - encoded public key
  opts.secretOrKey = key;

  // issuer: If defined the token issuer (iss) will be verified against this value.
  opts.issuer = jwtConfig.issuer;

  // audience: If defined, the token audience (aud) will be verified against this value.
  opts.audience = jwtConfig.audience;

  // Function that accepts a reqeust as the only parameter and returns the either JWT as a string or null
  opts.jwtFromRequest = ExtractJwt.fromAuthHeader();
  opts.jwtFromRequest = ExtractJwt.fromHeader('x-jwt-assertion');


  // Registering jwt strategy for passport.
  // decodedToken  is an object literal containing the decoded JWT payload
  Passport.use(new JwtStrategy(opts, (decodedToken, done) => {
    if (decodedToken) {
      done(null, decodedToken);
    } else {
      done(null, false);
    }
  }));

  return function jwtAssertionPassportAuthenticateCb(req, res, next) {
    var proxyKey = app.get('evproxyInternalKey') || '97b62fa8-2a77-458b-87dd-ef64ff67f847';
    if (req.headers && proxyKey) {
      if (req.headers['x-evproxy-internal-key'] === proxyKey) {
        return next();
      }
    }
    if (process.env.SECRET_OR_KEY && process.env.SECRET_OR_KEY.length > 0) {
      Passport._strategies.jwt._secretOrKey = jwtUtil.sanitizePublicKey(process.env.SECRET_OR_KEY);
    }
    Passport.authenticate('jwt', (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return next();
      }

      if (user) {
        var trustedApp = user[jwtConfig.keyToVerify];
        var userObj = loopback.getModelByType('BaseUser');
        var username = '';
        if (trustedApp) {
          var rolesToAdd = [];
          var appObj = loopback.getModelByType('TrustedApp');
          var query = { appId: trustedApp };
          appObj.findOne({
            where: query
          }, req.callContext, (err, trusted) => {
            if (err) {
              next();
            }
            if (trusted && req.headers.username && req.headers.email) {
              username = req.headers.username;
              var email = req.headers.email;
              // verify supported Roles
              if (req.headers.roles && trusted.supportedRoles) {
                JSON.parse(req.headers.roles).forEach(function (element) {
                  if (trusted.supportedRoles.some(x => x === element)) {
                    rolesToAdd.push({ 'id': element, 'type': 'ROLE' });
                  }
                });
              }
              userObj.findOne({ where: { username } }, req.callContext, (err, u) => {
                if (err) {
                  next();
                }
                if (u) {
                  if (cachedTokens[username]) {
                    req.accessToken = cachedTokens[username];
                    if (rolesToAdd && rolesToAdd.length > 0) {
                      req.callContext.principals = rolesToAdd ? rolesToAdd : req.callContext.principals;
                    }
                    return next();
                  }
                  createAccessTokenAndNext(u, req, rolesToAdd, next);
                } else {
                  userObj.create({ username: username, email: email, password: uuid.v4() }, req.callContext, (err, newUser) => {
                    if (err) {
                      return next();
                    }
                    if (newUser) {
                      createAccessTokenAndNext(newUser, req, rolesToAdd, next);
                    } else {
                      next();
                    }
                  });
                }
              });
            } else {
              // looks like no trusted app (or no user passed in header) found check if username/email provided in jwt has user access
              username = user.username || user.email;
              req.accessToken = cachedTokens[username];
              // TODO check validity of token @kpraveen
              if (req.accessToken) {
                return next();
              }
              if (username) {
                userObj.findOne({ where: { username } }, req.callContext, (err, u) => {
                  if (err) {
                    return next();
                  }
                  if (u) {
                    createAccessTokenAndNext(u, req, null, next);
                  } else {
                    log.error(req.callContext, 'User not found!!!');
                    next();
                  }
                });
              } else {
                log.error(req.callContext, 'User not found!!!');
                next();
              }
            }
          });
        } else {
          // regular jwt user token
          username = user.username || user.email || '';
          req.accessToken = cachedTokens[username];
          // TODO check validity of token @kpraveen
          if (req.accessToken) {
            return next();
          }

          userObj.findOne({
            where: {
              username
            }
          }, req.callContext, (err, u) => {
            if (err) {
              next(null);
            }
            if (u) {
              if (cachedTokens[username]) {
                req.accessToken = cachedTokens[username];
                return next();
              }
              createAccessTokenAndNext(u, req, null, next);
            } else {
              log.error(req.callContext, 'User not found!!!');
              return next();
            }
          });
        }
      }
    })(req, res, next);
  };

  function createAccessTokenAndNext(user, req, rolesToAdd, next) {
    user.createAccessToken(user.constructor.DEFAULT_TTL, req.callContext, (err, token) => {
      if (err) {
        next(err);
      }
      if (token) {
        req.accessToken = token;
        cachedTokens[user.username] = token;
        if (rolesToAdd && rolesToAdd.length > 0) {
          req.callContext.principals = rolesToAdd ? rolesToAdd : req.callContext.principals;
        }
        next();
      } else {
        log.error(req.callContext, 'could not create access token!!!!');
        next();
      }
    });
  }
};
