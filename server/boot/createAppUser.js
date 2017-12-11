
/**
 *
 * �2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var loopback = require('loopback');
var async = require('async');
var log = require('oe-logger')('create-Service-User');
var app = require('../server').app;
var uuidv4 = require('uuid/v4');

var serviceName = app.get('app');
var serviceUser = {
  username: serviceName,
  email: serviceName + '@oecloud.com',
  id: serviceName,
  password: uuidv4()
};

log.debug(log.defaultContext(), 'creating service user: ', serviceUser);
module.exports = function createAdminUser(app, done) {
  var adminUserContext = {
    ctx: {
      tenantId: 'default',
      remoteUser: 'system'
    }
  };

  async.series([function serviceUserCreate(cb) {
    var BaseUser = loopback.getModelByType('BaseUser');
    BaseUser.findOrCreate(serviceUser, adminUserContext, function baseUserCreate(err, res) {
      if (err) {
        log.error(log.defaultContext(), 'error in service user: ', err);
        if (err.code === 11000) {
          return cb();
        }
        cb(err);
      } else {
        log.debug(log.defaultContext(), 'created service user: ', res);
        cb();
      }
    });
  }, function roleMappingOp(cb) {
    var RoleMapping = loopback.getModelByType('BaseRoleMapping');
    RoleMapping.findOrCreate({
      id: serviceName,
      principalType: 'USER',
      principalId: serviceName,
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
  }],
  function finalCallback() {
    done();
  });
};
