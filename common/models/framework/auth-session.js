/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
module.exports = function AuthSessionFn(AuthSession) {
  AuthSession.findForRequest = function authSessionFindForRequestFn(req, options, cb) {
    if (typeof cb === 'undefined' && typeof options === 'function') {
      cb = options;
      options = {};
    }

    var id = tokenIdForRequest(req, options);

    if (id) {
      this.findById(id, req.callContext, function authSessionFindById(err, token) {
        if (err) {
          cb(err);
        } else if (token) {
          token.validate(function tokenValidate(err, isValid) {
            if (err) {
              cb(err);
            } else if (isValid) {
              cb(null, token);
            } else {
              var e = new Error('Invalid Access Token');
              e.status = e.statusCode = 401;
              e.code = 'INVALID_TOKEN';
              e.retriable = false;
              cb(e);
            }
          });
        } else {
          cb();
        }
      });
    } else {
      process.nextTick(function tokenForRequestFn() {
        cb();
      });
    }
  };

  function tokenIdForRequest(req, options) {
    var params = options.params || [];
    var headers = options.headers || [];
    var cookies = options.cookies || [];
    var i = 0;
    var length;
    var id;

    // https://github.com/strongloop/loopback/issues/1326
    if (options.searchDefaultTokenKeys !== false) {
      params = params.concat(['access_token']);
      headers = headers.concat(['X-Access-Token', 'authorization']);
      cookies = cookies.concat(['access_token', 'authorization']);
    }

    for (length = params.length; i < length; i++) {
      var param = params[i];
      // replacement for deprecated req.param()
      id = req.params && typeof req.params[param] !== 'undefined' ? req.params[param] :
        req.body && typeof req.body[param] !== 'undefined' ? req.body[param] :
          req.query && typeof req.query[param] !== 'undefined' ? req.query[param] :
            null;
      if (id && typeof id === 'string') {
        return id;
      }
    }

    for (i = 0, length = headers.length; i < length; i++) {
      id = req.header(headers[i]);

      if (typeof id === 'string') {
        // Add support for oAuth 2.0 bearer token
        // http://tools.ietf.org/html/rfc6750
        if (id.indexOf('Bearer ') === 0) {
          id = id.substring(7);
          // Decode from base64
          var buf = new Buffer(id, 'base64');
          id = buf.toString('utf8');
        } else if (/^Basic /i.test(id)) {
          id = id.substring(6);
          id = (new Buffer(id, 'base64')).toString('utf8');
          // The spec says the string is user:pass, so if we see both parts
          // we will assume the longer of the two is the token, so we will
          // extract "a2b2c3" from:
          //   "a2b2c3"
          //   "a2b2c3:"   (curl http://a2b2c3@localhost:3000/)
          //   "token:a2b2c3" (curl http://token:a2b2c3@localhost:3000/)
          //   ":a2b2c3"
          var parts = /^([^:]*):(.*)$/.exec(id);
          if (parts) {
            id = parts[2].length > parts[1].length ? parts[2] : parts[1];
          }
        }
        return id;
      }
    }

    if (req.signedCookies) {
      for (i = 0, length = cookies.length; i < length; i++) {
        id = req.signedCookies[cookies[i]];

        if (typeof id === 'string') {
          return id;
        }
      }
    }
    return null;
  }
};
