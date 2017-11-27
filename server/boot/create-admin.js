/**
 *
 * �2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var loopback = require('loopback');
var async = require('async');
var log = require('oe-logger')('create-admin');
var app = require('../server').app;

var userDetails = app.get('defaultUser');
var adminUser = {
  username: userDetails.userName,
  email: userDetails.email,
  emailVerified: true,
  id: userDetails.userName,
  password: userDetails.userName
};

var createAdminUser = function createAdminUser(done) {
  var adminUserContext = {
    ctx: {
      tenantId: 'default',
      remoteUser: 'system'
    }
  };

  async.series([function asyncSeries(cb) {
    var Tenant = loopback.getModelByType('Tenant');
    Tenant.create({
      tenantId: 'default',
      tenantName: 'default',
      id: '9fab3286-442a-11e6-beb8-9e71128cae77'
    }, adminUserContext, function tenantCreate(err, res) {
      if (err) {
        if (err.code === 11000) {
          return cb();
        }
        cb(err);
      } else {
        cb();
      }
    });
  }, function baseUserOp(cb) {
    var BaseUser = loopback.getModelByType('BaseUser');
    BaseUser.create(adminUser, adminUserContext, function baseUserCreate(err, res) {
      if (err) {
        if (err.code === 11000) {
          return cb();
        }
        cb(err);
      } else {
        cb();
      }
    });
  }, function userProfileOp(cb) {
    var UserProfile = loopback.getModelByType('UserProfile');
    UserProfile.create({
      firstName: 'Super',
      lastName: 'Administrator',
      department: 'adminstration',
      userId: 'admin',
      id: 'fcd1a724-442a-11e6-beb8-9e71128cae77'
    }, adminUserContext, function userProfileCraete(err, res) {
      if (err) {
        if (err.code === 11000) {
          return cb();
        }
        cb(err);
      } else {
        cb();
      }
    });
  },
  function roleOp(cb) {
    var Role = loopback.getModelByType('BaseRole');
    Role.create({
      id: 'admin',
      name: 'admin',
      description: 'Admin'
    }, adminUserContext, function roleCreate(err, res) {
      if (err) {
        if (err.code === 11000) {
          return cb();
        }
        cb(err);
      } else {
        cb();
      }
    });
  },
  function roleMappingOp(cb) {
    var RoleMapping = loopback.getModelByType('BaseRoleMapping');
    RoleMapping.create({
      id: 'admin',
      principalType: 'USER',
      principalId: 'admin',
      roleId: 'admin'
    }, adminUserContext, function roleMapppingCreate(err, res) {
      if (err) {
        if (err.code === 11000) {
          return cb();
        }
        cb(err);
      } else {
        cb();
      }
    });
  }
  ],
  function finalCallback() {
    done();
  }
  );
};

module.exports = function CreateAdmin(app) {
  /**
     * createAdminUser calls only when oecloud.io app boots.(Not for any apps which are dependent on oecloud.io)
     */
  var flag = app.locals.standAlone;
  if (flag || (process.env.CREATE_ADMIN && process.env.CREATE_ADMIN !== 'false')) {
    createAdminUser(function createAdminUser() {
      log.debug(log.defaultContext(), 'Admin user created for framework');
    });
  }
};
