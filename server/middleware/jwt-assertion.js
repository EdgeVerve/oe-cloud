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
  // secretOrKey is a REQUIRED string or buffer containing the secret (symmetric) or PEM-encoded public key
  opts.secretOrKey = jwtConfig.secretOrKey;

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
    Passport.authenticate('jwt', (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return next();
      }
      if (user) {
        const User = loopback.getModelByType('BaseUser');
        const username = user.username || user.email || '';
        req.accessToken = cachedTokens[username];
        // TODO check validity of token @kpraveen
        if (req.accessToken) {
          return next();
        }
        // User login.
        User.findOne({
          where: {
            username
          }
        }, req.callContext, (err, user) => {
          if (err) {
            next(null);
            // Here you can ask for password reset or signup.
          } else if (user) {
            user.createAccessToken(User.DEFAULT_TTL, req.callContext, (err, token) => {
              if (err) {
                next(err);
              }
              if (token) {
                const data = {};
                data.id = username;
                data.token = token;
                req.accessToken = token;
                cachedTokens[username] = token;
                next();
              } else {
                log.error(req.callContext, 'could not create access token!!!!');
                next();
              }
            });
          } else {
            log.debug(req.callContext, 'User not found!!!!');
            next();
          }
        });
      }
    })(req, res, next);
  };
};
