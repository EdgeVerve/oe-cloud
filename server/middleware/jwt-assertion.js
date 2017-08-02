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
const path = require('path');
const app = require('../server').app;
const fs = require('fs');
const uuid = require('node-uuid');
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

  const filepath = path.resolve(path.join(app.locals.apphome, 'jwt-config.json'));
  const file = fs.existsSync(filepath) ? filepath : '../../server/jwt-config.json';

  const jwtConfig = require(file);

  const cachedTokens = {};

  const opts = {};
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
  // secretOrKey is a REQUIRED string or buffer containing the secret(symmetric) or PEM - encoded public key
  if (jwtConfig.secretOrKey.indexOf('-----BEGIN') > -1) {
    opts.secretOrKey = sanitizePublicKey(jwtConfig.secretOrKey);
  } else {
    opts.secretOrKey = jwtConfig.secretOrKey;
  }


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
    Passport.authenticate('jwt', (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return next();
      }
      if (user) {
        const User = loopback.getModelByType(jwtConfig.trustedApp ? 'TrustedApp' : 'BaseUser');
        const username = jwtConfig.trustedApp ? user[jwtConfig.keyToVerify] || '' : user.username || user.email || '';
        const query = jwtConfig.trustedApp ? { appId: username } : { username };
        req.accessToken = cachedTokens[username];
        // TODO check validity of token @kpraveen
        if (req.accessToken) {
          return next();
        }
        // User login.
        User.findOne({
          where: query
        }, req.callContext, (err, user) => {
          if (err) {
            next(null);
            // Here you can ask for password reset or signup.
          } else if (user) {
            if (jwtConfig.trustedApp) {
              // trustedApp hence header should contain email and username
              var email = req.headers.email || null;
              var uname = req.headers.username || null;
              if (uname && email) {
                // verify supported Roles
                var rolesToAdd = [];
                if (req.headers.roles && user.supportedRoles) {
                  JSON.parse(req.headers.roles).forEach(function (element) {
                    if (user.supportedRoles.some(x => x === element)) {
                      rolesToAdd.push({ 'id': element, 'type': 'ROLE' });
                    }
                  });
                }
                req.accessToken = cachedTokens[uname];
                // TODO check validity of token @kpraveen
                if (req.accessToken) {
                  if (rolesToAdd && rolesToAdd.length > 0) {
                    req.callContext.principals = rolesToAdd ? rolesToAdd : req.callContext.principals;
                  }
                  return next();
                }
                // find user for the request
                var usrCtx = loopback.getModelByType('BaseUser');
                usrCtx.findOne({
                  where: {
                    username: uname
                  }
                }, req.callContext, (err, u) => {
                  if (err) {
                    next(err);
                  }
                  if (u) {
                    // user found, create access token and next
                    u.createAccessToken(usrCtx.DEFAULT_TTL, req.callContext, (err, token) => {
                      if (err) {
                        next(err);
                      }
                      if (token) {
                        req.accessToken = token;
                        cachedTokens[uname] = token;
                        if (rolesToAdd && rolesToAdd.length > 0) {
                          req.callContext.principals = rolesToAdd ? rolesToAdd : req.callContext.principals;
                        }
                        next();
                      } else {
                        log.error(req.callContext, 'could not create access token!!!!');
                        next();
                      }
                    });
                  } else {
                    // user doesnot exixt create user for first time
                    usrCtx.create({ 'username': uname, 'email': email, 'password': uuid.v4() }, req.callContext, function (err, newUser) {
                      if (err) {
                        next(err);
                      } else if (newUser) {
                        // user created now create access token and next
                        newUser.createAccessToken(usrCtx.DEFAULT_TTL, req.callContext, (err, token) => {
                          if (err) {
                            next(err);
                          }
                          if (token) {
                            req.accessToken = token;
                            cachedTokens[uname] = token;
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
                    });
                  }
                });
              } else {
                var error = new Error('username and email, both required to be present.');
                next(error);
              }
            } else {
              user.createAccessToken(User.DEFAULT_TTL, req.callContext, (err, token) => {
                if (err) {
                  next(err);
                }
                if (token) {
                  req.accessToken = token;
                  cachedTokens[username] = token;
                  next();
                } else {
                  log.error(req.callContext, 'could not create access token!!!!');
                  next();
                }
              });
            }
          } else {
            log.debug(req.callContext, 'User not found!!!!');
            next();
          }
        });
      }
    })(req, res, next);
  };
};
