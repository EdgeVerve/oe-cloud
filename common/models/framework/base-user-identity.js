/**
*
* ©2016-2018 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
* Bangalore, India. All Rights Reserved.
*
*/

var loopback = require('loopback');
var async = require('async');
var logger = require('oe-logger');
var log = logger('base-user-identity');

module.exports = function BaseUserIdentity(BaseUserIdentity) {
  BaseUserIdentity.observe('after save', function (ctx, next) {
    if (ctx.instance.authScheme === 'ldap' || !ctx.instance.profile.data.memberOf) {
      var currentRoles;
      var groups = [].concat(ctx.instance.profile.data.memberOf);
      log.debug(ctx.options, 'running for groups: ', groups);
      var principalId = ctx.instance.userId;

      var baseRoleMappingCb = function (err, roleMappings) {
        if (err) {
          log.error(ctx.options, err);
          return next(err);
        }
        log.debug(ctx.options, 'found roles:', roleMappings);
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

      var roleMappingQuery = {
        where: {
          principalId: principalId,
          providerRole: 'ldap'
        }
      };
      var BaseRoleMapping = loopback.getModelByType('BaseRoleMapping');
      BaseRoleMapping.find(roleMappingQuery, ctx.options, baseRoleMappingCb);

      var ldapRoleMappingCb = function ldapRoleMappingCb(err, ldapRoleMappings) {
        if (err) {
          log.error(ctx.options, err);
          return next(err);
        }
        log.debug(ctx.options, 'found ldapRoleMappings:', ldapRoleMappings);
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
            err.forEach((error) => {
              log.error(ctx.options, error);
            });
            return next(err);
          }
          log.debug(ctx.options, 'created new ldap roles for user:', results);
          async.each(currentRoles, deleteRole, function (err) {
            return next(err);
          });
          function deleteRole(roleMapping, cb) {
            BaseRoleMapping.destroyById(roleMapping.id, ctx.options, (err, count) => {
              if (err) {
                log.error(ctx.options, 'error in destroy: ', err);
                return cb(err);
              }
              log.debug(ctx.options, 'destroyed ', count, ' invalid role mappings');
              return cb();
            });
          }
        });
      };
    } else {
      return next();
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
