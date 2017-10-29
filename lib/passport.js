/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * EV Passport
 *
 * @module EV Passport
 *
 */
/* eslint-disable no-console , no-process-exit*/
var loopback = require('loopback');
var bodyParser = require('body-parser');
var path = require('path');
var async = require('async');

module.exports.initPassport = function initPassport(app) {
  // Passport configurators..
  var loopbackPassport = require('loopback-component-passport');
  var PassportConfigurator = loopbackPassport.PassportConfigurator;
  var passportConfigurator = new PassportConfigurator(app);

  return passportConfigurator;
};

module.exports.configurePassport = function configurePassport(app, passportConfigurator, providerConfigParameter) {
  // configure body parser
  app.use(bodyParser.urlencoded({
    extended: true
  }));

  var AuthSession = loopback.getModelByType('AuthSession');
  app.middleware('auth', app.loopback.token({
    model: AuthSession,
    currentUserLiteral: 'me'
  }));

  // If loopback token expires, app remoting errorHandler method does not get invoked
  app.middleware('auth', function middlewareAuthRouterFn(err, req, res, next) {
    if (err) {
      delete err.stack;
    }
    next(err);
  });

  // Providers.json will now be looked only from app if app is using framework, if framework is directly run as app, then it will be picked up from framework (so app will not fallback on framework to avoid by chance picking unintentional configuration)
  var config = {};
  // Atul : if providerConfiParameter is passed, application will used this parameter. else providers.json will be used from server folder in file system.
  // Merge util will merge providers.json from each dependent module and pass configurePassport() with this parameter
  try {
    config = providerConfigParameter ? providerConfigParameter : require(path.join(app.locals.apphome, 'providers.json'));
  } catch (err) {
    console.error('could not load login configuration ', path.join(app.locals.apphome, 'providers.json'), ' https://docs.strongloop.com/display/public/LB/Configuring,providers.json ', err);
    process.exit(1);
  }

  var flash = require('express-flash');

  // boot(app, __dirname);
  // app.emit('ready');
  // to support JSON-encoded bodies
  var jsonremoting = {
    limit: '1mb'
  };
  var urlencoded = {
    limit: '1mb'
  };
  if (app.get('remoting') && app.get('remoting').json) {
    jsonremoting = app.get('remoting').json;
  }
  if (app.get('remoting') && app.get('remoting').urlencoded) {
    urlencoded = app.get('remoting').urlencoded;
  }
  app.middleware('parse', bodyParser.json(jsonremoting));
  // to support URL-encoded bodies
  app.middleware('parse', bodyParser.urlencoded(
    urlencoded));

  app.middleware('session:before', loopback.cookieParser(app.get('cookieSecret')));

  passportConfigurator.init();

  // We need flash messages to see passport errors
  app.use(flash());
  var BaseUser = loopback.getModelByType('BaseUser');
  var userIdentity = loopback.getModelByType('userIdentity');

  userIdentity.observe('after save', function (ctx, next) {
    if (ctx.instance.authScheme === 'ldap') {
      var currentRoles;
      var groups = ctx.instance.profile.data.memberOf;
      console.log('running for groups: ', groups);
      var principalId = ctx.instance.userId;

      var roleMappingQuery = {
        where: {
          principalId: principalId,
          providerRole: 'ldap'
        }
      };
      var BaseRoleMapping = loopback.getModelByType('BaseRoleMapping');
      BaseRoleMapping.find(roleMappingQuery, ctx.options, baseRoleMappingCb);

      var baseRoleMappingCb = function baseRoleMappingCb(err, roleMappings) {
        if (err) {
          console.error(err);
          return next(err);
        }
        console.log('found roles:', roleMappings);
        currentRoles = roleMappings;
        var ldapRoleMappingQuery = {
          where: {
            groupName: {
              inq: groups
            }
          }
        };
        var ldapRoleMapping = loopback.getModelByType('LdapRoleMapping');
        ldapRoleMapping.find(ldapRoleMappingQuery, ctx.options, ldapRoleMappingCb);
      };

      var ldapRoleMappingCb = function ldapRoleMappingCb(err, ldapRoleMappings) {
        if (err) {
          console.error(err);
          return next(err);
        }
        console.log('found ldapRoleMappings:', ldapRoleMappings);
        var roleMappings = createRoleMappings(ldapRoleMappings, principalId);
        roleMappings.forEach(function (roleMap, roleMappingsIndex) {
          var currentRolesIndex = currentRoles.find(function (currentRoleMap) { return currentRoleMap.roleId === roleMap.roleId;});
          if (currentRolesIndex) {
            roleMappings.splice(roleMappingsIndex, 1);
            currentRoles.splice(currentRolesIndex, 1);
          }
        }, this);
        BaseRoleMapping.create(roleMappings, ctx.options, (err, results) => {
          if (err) {
            console.error(err);
            return next(err);
          }
          console.log('created new ldap roles for user:', results);
          async.each(currentRoles, deleteRole, function (err) {
            return next(err);
          });
          function deleteRole(roleMapping, cb) {
            BaseRoleMapping.destroyById(roleMapping.id, ctx.options, (err, count) => {
              if (err) {
                console.log('error in destroy: ', err);
                return cb(err);
              }
              console.log('destroyed ', count, ' invalid role mappings');
              return cb();
            });
          }
        });
      };

      var createRoleMappings = function createRoleMappings(ldapRoleMappings, principalId) {
        return ldapRoleMappings.map(function (ldapRoleMap) {
          return ldapRoleMap.roles.map(function (role) {
            return {
              principalType: 'USER',
              principalId: principalId,
              roleId: role,
              providerRole: 'ldap'
            };
          });
        }).reduce(function (finalRolesArray, partialRolesArray) {
          return finalRolesArray.concat(finalRolesArray, partialRolesArray);
        }, []);
      };
    } else {
      return next();
    }
  });

  passportConfigurator.setupModels({
    userModel: BaseUser,
    userIdentityModel: userIdentity,
    userCredentialModel: app.models.userCredential
  });
  for (var s in config) {
    if (config.hasOwnProperty(s)) {
      var c = config[s];
      c.session = c.session !== false;
      passportConfigurator.configureProvider(s, c);
    }
  }
};
