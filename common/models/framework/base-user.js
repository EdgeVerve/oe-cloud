/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This is the companion js file of the BaseUSer Model. BaseUser model derived from loopback user model
 * this has got overriden functions like hasPassword and OTP related functions
 *
 *  Author: Praveen
 */

var loopback = require('loopback');
var logger = require('../../../lib/logger');
var log = logger('BaseUser');
var async = require('async');
var debug = require('debug')('base-user');
var utils = require('../../../lib/common/util.js');
// 15 mins in seconds
var DEFAULT_RESET_PW_TTL = 15 * 60;

// var app = require('../../../server/server.js');

module.exports = function BaseUser(BaseUser) {
  BaseUser.setup = function baseUserSetup() {
    // We need to call the base class's setup method
    BaseUser.base.setup.call(this);
  };

  // In case App has AppUser still this method will work
  // App can also add remote method session on AppUser
  BaseUser.remoteMethod('session', {
    description: 'Gets session information of the logged in user',
    accessType: 'READ',
    accepts: [{
      arg: 'ctx',
      type: 'object',
      description: 'context',
      http: {
        source: 'context'
      }
    }
    ],
    http: {
      verb: 'GET',
      path: '/session'
    },
    returns: {
      type: 'object',
      root: true
    }
  });


  BaseUser.validatePassword = function baseUserValidatePassword(plain, options) {
    var passwordComplexity = BaseUser.app.get('passwordComplexity');
    var errMsg = 'Invalid password: ' + plain;
    if (typeof plain === 'string' && plain) {
      var passwdStrength = true;
      if (passwordComplexity && passwordComplexity.regex && passwordComplexity.regex.length > 0) {
        passwdStrength = new RegExp(passwordComplexity.regex).test(plain);
        errMsg = passwordComplexity.errMsg;
      }
      if (passwdStrength) {
        return true;
      }
    }
    var err = new Error(errMsg);
    err.statusCode = 422;
    err.retriable = false;
    throw err;
  };

  /**
 * Login a user by with the given `credentials`.
 *
 * ```js
 *    User.login({username: 'foo', password: 'bar'}, function (err, token) {
*      console.log(token.id);
*    });
 * ```
 *
 * @param {Object} credentials username/password or email/password
 * @param {String[]|String} [include] Optionally set it to "user" to include
 * the user info
 * @callback {Function} callback Callback function
 * @param {Error} err Error object
 * @param {AccessToken} token Access token if login is successful
 */

  BaseUser.login = function BaseUserLogin(credentials, include, options, fn) {
    var self = this;
    if (typeof options === 'undefined' && typeof fn === 'undefined') {
      if (typeof include === 'function') {
        fn = include;
        include = null;
        options = {};
      }
    } else if (typeof fn === 'undefined') {
      if (typeof options === 'function') {
        fn = options;
        options = include;
        include = null;
      }
    }

    fn = fn || utils.createPromiseCallback();
    include = (include || '');
    if (Array.isArray(include)) {
      include = include.map(function includeMap(val) {
        return val.toLowerCase();
      });
    } else {
      include = include.toLowerCase();
    }

    // to support passting tenantId from explorer
    // without using mod header.
    if (credentials.tenantId && options.ctx) {
      options.ctx.tenantId = credentials.tenantId;
    }
    var realmDelimiter;
    // Check if realm is required
    var realmRequired = !!(self.settings.realmRequired ||
      self.settings.realmDelimiter);
    if (realmRequired) {
      realmDelimiter = self.settings.realmDelimiter;
    }
    var query = self.normalizeCredentials(credentials, realmRequired,
      realmDelimiter);

    if (realmRequired && !query.realm) {
      var err1 = new Error('realm is required');
      err1.statusCode = 400;
      err1.code = 'REALM_REQUIRED';
      err1.retriable = false;
      fn(err1);
      return fn.promise;
    }
    if (!query.email && !query.username) {
      var err2 = new Error('username or email is required');
      err2.statusCode = 400;
      err2.code = 'USERNAME_EMAIL_REQUIRED';
      err2.retriable = false;
      fn(err2);
      return fn.promise;
    }

    self.findOne({ where: query }, options, function findOneCb(err, user) {
      var defaultError = new Error('Incorrect username or password.');
      defaultError.statusCode = 401;
      defaultError.code = 'LOGIN_FAILED';
      defaultError.retriable = false;

      function tokenHandler(err, token) {
        if (err) { return fn(err); }
        if (Array.isArray(include) ? include.indexOf('user') !== -1 : include === 'user') {
          // NOTE(bajtos) We can't set token.user here:
          //  1. token.user already exists, it's a function injected by
          //     "AccessToken belongsTo User" relation
          //  2. ModelBaseClass.toJSON() ignores own properties, thus
          //     the value won't be included in the HTTP response
          // See also loopback#161 and loopback#162
          token.__data.user = user;
        }
        fn(err, token);
      }

      if (err) {
        debug('An error is reported from User.findOne: %j', err);
        fn(defaultError);
      } else if (user) {
        if (user.status.toUpperCase() === 'DISABLED') {
          err = new Error('Account Locked');
          err.statusCode = 401;
          err.code = 'ACCOUNT_LOCKED';
          err.retriable = false;
          return fn(err);
        }
        user.hasPassword(credentials.password, function userHasPassword(err, isMatch) {
          if (err) {
            debug('An error is reported from User.hasPassword: %j', err);
            fn(defaultError);
          } else if (isMatch) {
            if (self.settings.emailVerificationRequired && !user.emailVerified) {
              // Fail to log in if email verification is not done yet
              debug('User email has not been verified');
              err = new Error('login failed as the email has not been verified');
              err.statusCode = 401;
              err.code = 'LOGIN_FAILED_EMAIL_NOT_VERIFIED';
              err.retriable = false;
              fn(err);
            } else {
              if (user.failedTries > 0) {
                user.updateAttribute('failedTries', 0, options, function userUpdateAttribute(err) {
                  if (err) {
                    log.error(options, '> error updating failedTries to 0', err);
                  } else {
                    log.info(options, '> failedTries updated to 0');
                  }
                });
              }
              user.createAccessToken(credentials.ttl, options, tokenHandler);
            }
          } else {
            debug('The password is invalid for user %s', query.email || query.username);
            BaseUser.emit('password incorrect', options, user);
            fn(defaultError);
          }
        });
      } else {
        debug('No matching record is found for user %s', query.email || query.username);
        fn(defaultError);
      }
    });
    return fn.promise;
  };

  /**
   * Logout a user with the given accessToken id.
   *
   * ```js
   *    User.logout('asd0a9f8dsj9s0s3223mk', function (err) {
  *      console.log(err || 'Logged out');
  *    });
   * ```
   *
   * @param {String} accessTokenID
   * @callback {Function} callback
   * @param {Error} err
   */

  BaseUser.logout = function baseUserLogout(tokenId, options, fn) {
    if (typeof options === 'function' && typeof fn === 'undefined') {
      fn = options;
      options = {};
    }
    fn = fn || utils.createPromiseCallback();
    this.relations.accessTokens.modelTo.findById(tokenId, options, function findById(err, accessToken) {
      if (err) {
        fn(err);
      } else if (accessToken) {
        accessToken.destroy(fn);
      } else {
        var err1 = new Error('could not find accessToken');
        err1.retriable = false;
        fn(err1);
      }
    });
    return fn.promise;
  };


  /**
 * Overriden from loopback to create Access Token
 * this is used to store role, tenant, username and similar information in accessToken model which will be readily available later on
 * @param {String} ttl time to live
 * @returns {function} cb - callback to be called which will gives created record in access token(Same as .create of loopback model)
 */

  BaseUser.prototype.createAccessToken = function createAccessTokenFn(ttl, options, cb) {
    if (typeof cb === 'undefined' && typeof options === 'function') {
      // createAccessToken(ttl, cb)
      cb = options;
      options = null;
    }

    cb = cb || utils.createPromiseCallback();

    if (typeof ttl === 'object' && !options) {
      // createAccessToken(options, cb)
      options = ttl;
      ttl = options.ttl;
    }

    var userModel = this.constructor;

    var accessToken = {};

    var RoleMapping = loopback.getModelByType('BaseRoleMapping');
    var Role = loopback.getModelByType('BaseRole');

    var self = this;

    async.parallel([function roleMappingFind(callback) {
      RoleMapping.find({
        where: {
          principalId: self.id,
          principalType: RoleMapping.USER
        }
      }, options, function roleMappingFindCb(err, rolemap) {
        if (err) {
          return err;
        }
        var roleIdArr = [];
        rolemap.forEach(function roleIdExtractFn(role) {
          roleIdArr.push(role.roleId);
        });
        Role.find({
          where: {
            id: {
              inq: roleIdArr
            }
          }
        }, options, function roleFindCb(err, roles) {
          if (err) {
            return cb(err);
          }
          var rolesArr = roles.map(function rolesArrMapCb(m) {
            return m.name;
          });
          // User can switch tenantId for a session,
          // tenantId stores current tenantId
          // userTenantid stores users tenantId
          callback(null, rolesArr ? rolesArr : []);
        });
      });
    },
      function userProfile(callback) {
        var UserProfile = loopback.getModelByType('UserProfile');
        UserProfile.findOne({
          where: {
            userId: self.id
          }
        }, options, function dbCallbackFn(err, userProfile) {
          if (err) {
            callback(err);
          }
          callback(null, userProfile ? userProfile : {});
        });
      }],
      function finalCallBack(err, results) {
        if ( err) {
          cb(err);
        }
        accessToken.roles = results[0];
        accessToken.department = results[1].department;
        if (self._autoScope && self._autoScope.tenantId) {
          accessToken.tenantId = self._autoScope.tenantId;
          accessToken.userTenantId = self._autoScope.tenantId;
        } else {
          log.debug(options, 'base user autoscope or tenant is not present', self.username);
        }
        accessToken.username = self.username;
        accessToken.ttl = userModel.app.get('accessTokenTTL') || Math.min(ttl || userModel.settings.ttl, userModel.settings.maxTTL);
        options = options || {};
        self.accessTokens.create(accessToken, options, cb);
      });

    return cb.promise;
  };

  /**
 * listening 'password incorrect' event. This is used to update loginTries property if entered incorrect password.
 * @param {object} options - context object
 * @returns {Object} user - BaseUser Instance
 */

  BaseUser.on('password incorrect', function baseUserPasswordIncorrectListner(options, user) {
    var maxFailedLoginTries = BaseUser.app.get('maxFailedLoginTries');
    var updatedData = {};
    updatedData.failedTries = user.failedTries + 1;
    if (user.failedTries === maxFailedLoginTries - 1) {
      updatedData.status = 'disabled';
    }
    user.updateAttributes(updatedData, options, function userUpdateFailedTries(err) {
      if (err) {
        log.error(options, '> error updating failed retries', err);
      } else {
        log.info(options, '> number of failes retries updated');
      }
    });
  });


  // Unlock api, ACL rules are defined in BaseUser to only allow admin ROLE to unlock user account.
  BaseUser.unlock = function baseUserUnlock(data, options, cb) {
    var query = { where: { or: [{ username: data }, { email: data }] } };
    BaseUser.findOne(query, options, function baseUserFindOne(err, user) {
      if (err) {
        return cb(err);
      } else if (user) {
        user.updateAttributes({
          'failedTries': 0,
          'status': 'enabled'
        }, options, function userUpdateAttributes(err, user) {
          if (err) {
            return cb(err);
          }
          cb(null, { 'status': 'account unlocked for username ' + user.username });
        });
      } else {
        var userNotFoundErr = new Error('username or email not found');
        userNotFoundErr.retriable = false;
        return cb(userNotFoundErr);
      }
    });
  };

  BaseUser.remoteMethod('unlock', {
    description: 'To unlock user account',
    accessType: 'WRITE',
    accepts: {
      arg: 'username',
      type: 'string',
      description: 'username or email'
    },
    http: {
      verb: 'POST',
      path: '/unlock'
    },
    returns: {
      type: 'object',
      root: true
    }
  });

  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  // ignore:
  // line
  BaseUser.validatesFormatOf('email', {
    with: re,
    message: 'Must provide a valid email'
  });

  // TODO
  // put the validation properyl in before save or part of validations

  BaseUser.on('resetPasswordRequest', function BaseUserResetPasswdCb(info) {
    var url = 'http://' + BaseUser.app.get('host') + ':' + BaseUser.app.get('port') + '/resetPassword';
    var html = 'Click <a href="' + url + '?access_token=' +
      info.accessToken.id + '">here</a> to reset your password';

    BaseUser.app.models.Email.send({
      to: info.email,
      from: info.email,
      subject: 'Password reset',
      html: html
    }, function BaseUserResetPasswdEmailCb(err) {
      if (err) {
        return log.error(log.defaultContext(), '> error sending password reset email', err);
      }
      log.info(log.defaultContext(), '> sending password reset email to:', info.email);
    });
  });

  /**
     * Create a short lived acess token for temporary login. Allows users
     * to change passwords if forgotten.
     *
     * @param {Object} options - user detail options
     * @param {object} opts - call context options
     * @param {function}cb - callback
     * @returns {function}cb - callback
     * @prop {String} email The user's email address
     * @callback {Function} callback
     */
  BaseUser.resetPassword = function resetPassword(options, opts, cb) {
    cb = cb || utils.createPromiseCallback();
    var UserModel = this;
    var ttl = UserModel.settings.resetPasswordTokenTTL || DEFAULT_RESET_PW_TTL;

    options = options || {};
    if (typeof options.email !== 'string') {
      var err = new Error('Email is required');
      err.statusCode = 400;
      err.code = 'EMAIL_REQUIRED';
      err.retriable = false;
      cb(err);
      return cb.promise;
    }

    UserModel.findOne({ where: { email: options.email } }, opts, function userModelFindOne(err, user) {
      if (err) {
        return cb(err);
      }
      if (!user) {
        err = new Error('Email not found');
        err.statusCode = 404;
        err.code = 'EMAIL_NOT_FOUND';
        err.retriable = false;
        // removed err parameter from return cb(err) for generic response.
        return cb();
      }
      // create a short lived access token for temp login to change password
      // TODO(ritch) - eventually this should only allow password change
      user.accessTokens.create({ ttl: ttl }, opts, function accesstOkenCreate(err, accessToken) {
        if (err) {
          return cb(err);
        }
        cb();
        BaseUser.emit('resetPasswordRequest', {
          email: options.email,
          accessToken: accessToken,
          user: user
        });
      });
    });

    return cb.promise;
  };
  /**
    * This method is used to switch tenant by admin user to create first user for tenant or to do something in that tenant
    * @param {objct} ctx - context object which has data
    * @param {string} tenantId - tenantId
    * @param {object} options - options
    * @param {function} cb -continuation callback function handle
    */
  BaseUser.switchTenant = function SwitchTenantFn(ctx, tenantId, options, cb) {
    if (!cb && typeof options === 'function') {
      cb = options;
      options = {};
    }

    var data = { tenantId: '' };
    var AuthSession = loopback.getModelByType('AuthSession');
    var accessToken = ctx.req.accessToken;

    if (accessToken) {
      AuthSession.findById(accessToken.id, options, function authSessionFindById(err, token) {
        if (err) {
          return cb(err);
        }
        if (token) {
          token.tenantId = tenantId;
          AuthSession.upsert(token, options, function authSessionUpsert(err, updatedToken) {
            if (err) {
              cb(err);
            }
            data.tenantId = updatedToken.tenantId;
            cb(null, data);
          });
        } else {
          cb(null, data);
        }
      });
    } else {
      var err = new Error('not logged in');
      err.retriable = false;
      cb(err, data);
    }
  };

  BaseUser.session = function session(ctx, options, cb) {
    var data = {};
    if (!cb && typeof options === 'function') {
      cb = options;
      options = {};
    }

    if (ctx.req.accessToken) {
      data.username = ctx.req.accessToken.username;
      data.userid = options.ctx.userId;
      data.tenantId = options.ctx.tenantId;
      data.roles = options.ctx.roles;
    } else {
      data.username = '';
      data.userid = '';
      data.error = 'Not logged in';
      data.roles = [];
      data.tenantId = options.ctx.tenantId;
    }

    cb(null, data);
  };


  BaseUser.remoteMethod('switchTenant', {
    description: 'To switch the tenant for the loggedin session',
    accessType: 'WRITE',
    accepts: [{
      arg: 'ctx',
      type: 'object',
      description: 'context',
      http: {
        source: 'context'
      }
    }, {
      arg: 'tenantId',
      type: 'string',
      description: 'TenantId'
    }],
    http: {
      verb: 'POST',
      path: '/switch-tenant'
    },
    returns: {
      type: 'object',
      root: true
    }
  });
};

/* function registerObserver(BaseUser) {
    BaseUser.observe('after save', function BaseUserAfterSaveCb(ctx, next) {

        // currentcontext because on update instance will be null and
        // currentInstance will have the Instance data
        // we cant relay on ctx.data because it may not contain id.
        // Only when upsert is use for update ctx.data will have id.

        // in case of updateAll the currentInstance will also be not available.
        // and since we have disabled updateAll remote method this will never
        // happen but developer should not use updateAll programmatically.
        if (config && !config.disableWorkflow) {
            log.info('register observer to support sync with workflow.');
            var data = ctx.instance || ctx.currentInstance || ctx.data;
            BaseUser.emit('SyncUserWithWorkflow', data.id);
        }
        next();
    });
}

function registerSyncUserEvent(BaseUser) {
    BaseUser.on('SyncUserWithWorkflow', function BaseUserSyncUserCb(userId) {

        // Get the user details.
        BaseUser.findById(userId, function BaseUserSyncUserFindCb(err, userDetails) {
            if (err) {
                // Error occurred. We must retry.
                // createTaskForReconsiliation();
                log.eror('error : unable to find record with Id : ' + userId);
            } else if (userDetails) {
                // Push to workflow engine.

                var WorkflowUserModel = loopback.getModel('WorkflowUser');
                if (WorkflowUserModel) {
                    var firstName = userDetails.firstName || userDetails.username;
                    var lastName = userDetails.lastName || userDetails.username;
                    var workflowUser = {
                        'id': userDetails.id,
                        'firstName': firstName,
                        'lastName': lastName,
                        'email': userDetails.email,
                        'passowrd': 'default-password'
                    };

                    WorkflowUserModel.create(workflowUser, function BaseUserSyncUserWFCreateCb(err, workflowUserDetails) {
                        if (err) {
                            // Error occured. We must retry.
                            log.error('Failed to create workFlowUser [Error : ]', JSON.stringify(err), null, 4);
                        } else {
                            // Do nothing.
                            log.debug('successfully create workFlowUser  : userDetails : ', workflowUserDetails);
                        }
                    });
                } else {
                    log.info('workFlowUser model not found.');
                }

            } else {
                log.info('No user found with', userId);
            }
        });
    });
}*/
