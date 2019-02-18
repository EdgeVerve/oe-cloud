/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
// Atul : This script is used to enable authentication for the application
// Also 'enableAuthCookie' is introduced. if this option is set then cookie is created when user login using user.login()
// When user logs out, cookie is deleted. This is helpfule at least for node-red because node-red application does not
// send access Token as part of URL / or AuthSession header
// Atul : This script includes aboutMe() API. This API returned user information to caller including context
const loopback = require('loopback');
function aboutMe() {
  var userModel = loopback.getModelByType('User');
  userModel.aboutMe = function (options, cb) {
    if (!options || !options.accessToken) {
      return cb(null, {});
    }
    var accessToken = options.accessToken;
    if (!accessToken) {
      return cb(null, {});
    }
    var ctx = accessToken.ctx || {};
    var me = {};
    me.ctx = ctx;
    me.username = accessToken.username;
    me.email = accessToken.email;
    me.roles = accessToken.roles;
    var userId = accessToken.userId;
    me.userId = userId;
    if (userId) {
      userModel.find({ where: { id: userId } }, options, function (err, result) {
        if (err) {
          return cb(err);
        }
        if (!result || result.length !== 1) {
          return cb(null, me);
        }
        var idName = userModel.definition.idName();
        var prop = userModel.definition.properties;
        for (var key in prop) {
          if (prop.hasOwnProperty(key) && !userModel.isHiddenProperty(key) && key !== idName) {
            me[key] = result[0][key];
          }
        }
        return cb(null, me);
      });
    } else {
      return cb(null, me);
    }
  };

  userModel.remoteMethod(
    'aboutMe', {
      description: 'Get Logged in user Information',
      http: {
        path: '/aboutMe',
        verb: 'get'
      },
      accepts: [
        {
          arg: 'options', type: 'object', http: 'optionsFromRequest'
        }
      ],
      returns: {
        arg: 'me',
        type: 'object',
        root: true
      }
    }
  );
  var acl = { accessType: 'EXECUTE', permission: 'ALLOW', principalId: '$authenticated', principalType: 'ROLE', property: 'aboutMe' };
  userModel.settings.acls.push(acl);
}


module.exports = function enableAuthentication(server) {
  var userModel = loopback.getModelByType('User');
  var disableDefaultAuth = server.get('disableDefaultAuth');
  if (!disableDefaultAuth) {
    server.enableAuth();
  }

  var disableAboutMe = server.get('disableAboutMe');
  if (disableAboutMe !== true) {
    aboutMe();
  }

  if (server.get('enableForceIdForUserModels') !== true) {
    server.removeForceId('User');
    server.removeForceId('Role');
    server.removeForceId('RoleMapping');
  }

  var accessTokenModel = loopback.getModelByType('AccessToken');
  accessTokenModel.observe('before save', function (ctx, next) {
    if (!ctx.isNewInstance) {
      return next();
    }
    var RoleMapping = loopback.getModelByType('RoleMapping');
    var Role = loopback.getModelByType('Role');
    RoleMapping.find({
      where: {
        principalId: ctx.instance.userId,
        principalType: RoleMapping.USER
      }
    }, ctx.options, function (err, rolemap) {
      if (err) {
        return next(err);
      }
      if (!rolemap || rolemap.length === 0) {
        ctx.instance.roles = [];
        return next();
      }
      var roleIdArr = [];
      rolemap.forEach(function (role) {
        roleIdArr.push(role.roleId);
      });
      Role.find({
        where: {
          id: {
            inq: roleIdArr
          }
        }
      }, ctx.options, function roleFindCb(err, roles) {
        if (err) {
          return next(err);
        }
        var rolesArr = roles.map(function (m) {
          return m.name;
        });
        ctx.instance.roles = rolesArr;
        return next();
      });
    });
  });


  var enableAuthCookie = server.get('enableAuthCookie');
  if (!enableAuthCookie) {
    return;
  }

  userModel.afterRemote('login', function (ctx, accessToken, next) {
    if (ctx && ctx.res && ctx.req && accessToken && accessToken.id) {
      var signed = ctx.req.signedCookies ? true : false;
      var maxAge = 1000 * accessToken.ttl;
      var httpOnly = true;
      var resp = ctx.res;
      resp.cookie('access_token', accessToken.id, {
        signed, maxAge, httpOnly
      });
      return next();
    }
    return next();
  });

  userModel.afterRemote('logout', function (ctx, accessToken, next) {
    var res = ctx.res;
    if (res) {
      res.clearCookie('access_token');
    }
    return next();
  });
};
