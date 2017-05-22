/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopbackAccessContext = require('loopback/lib/access-context');
var AccessContext = loopbackAccessContext.AccessContext;
var loopback = require('loopback');
var debug = require('debug')('loopback:security:role');
var async = require('async');
var assert = require('assert');

module.exports = function BaseRoleFn(BaseRole) {
  // Set up the connection to users/applications/roles once the model
  BaseRole.once('dataSourceAttached', function baseRoleDataSourceAttachedListner(roleModel) {
    // Special roles
    // owner of the object
    BaseRole.OWNER = '$owner';
    // any User with a relationship to the object
    BaseRole.RELATED = '$related';
    // authenticated user
    BaseRole.AUTHENTICATED = '$authenticated';
    // authenticated user
    BaseRole.UNAUTHENTICATED = '$unauthenticated';
    // everyone
    BaseRole.EVERYONE = '$everyone';
    BaseRole.registerResolver(BaseRole.OWNER, function baseRoleRegisterResolver(role, context, callback) {
      if (!context || !context.model || !context.modelId) {
        process.nextTick(function noContext() {
          if (callback) callback(null, false);
        });
        return;
      }
      var modelClass = context.model;
      var modelId = context.modelId;
      var userId = context.getUserId();
      BaseRole.isOwner(modelClass, modelId, userId, context, callback);
    });
    function isUserClass(modelClass) {
      if (modelClass) {
        return modelClass === loopback.User ||
          modelClass.prototype instanceof loopback.User;
      }
      return false;
    }
    function matches(id1, id2) {
      if (typeof id1 === 'undefined' || id1 === null || id1 === '' ||
        typeof id2 === 'undefined' || id2 === null || id2 === '') {
        return false;
      }
      // The id can be a MongoDB ObjectID
      return id1 === id2 || id1.toString() === id2.toString();
    }
    BaseRole.isOwner = function isOwner(modelClass, modelId, userId, context, callback) {
      assert(modelClass, 'Model class is required');
      debug('isOwner(): %s %s userId: %s', modelClass && modelClass.modelName, modelId, userId);
      // No userId is present
      if (!userId) {
        process.nextTick(function noUserId() {
          callback(null, false);
        });
        return;
      }

      // Is the modelClass User or a subclass of User?
      if (isUserClass(modelClass)) {
        process.nextTick(function userClass() {
          callback(null, matches(modelId, userId));
        });
        return;
      }

      modelClass.findById(modelId, context.remotingContext.req.callContext, function modelClassFindById(err, inst) {
        if (err || !inst) {
          debug('Model not found for id %j', modelId);
          if (callback) callback(err, false);
          return;
        }
        debug('Model found: %j', inst);
        var ownerId = inst.userId || inst.owner;
        // Ensure ownerId exists and is not a function/relation
        if (ownerId && typeof ownerId !== 'function') {
          if (callback) callback(null, matches(ownerId, userId));
          return;
        }
        // Try to follow belongsTo
        for (var r in modelClass.relations) {
          if (modelClass.relations.hasOwnProperty(r)) {
            var rel = modelClass.relations[r];
            if (rel.type === 'belongsTo' && isUserClass(rel.modelTo)) {
              debug('Checking relation %s to %s: %j', r, rel.modelTo.modelName, rel);
              inst[r](processRelatedUser);
              return;
            }
          }
        }
        debug('No matching belongsTo relation found for model %j and user: %j', modelId, userId);
        if (callback) callback(null, false);


        function processRelatedUser(err, user) {
          if (!err && user) {
            debug('User found: %j', user.id);
            if (callback) callback(null, matches(user.id, userId));
          } else if (callback) callback(err, false);
        }
      });
    };


  /**
   * Check if a given principal is in the specified role.
   *
   * @param {String} role The role name.
   * @param {Object} context The context object.
   * @param {Function} callback Callback function.
   * @param {Error} err Error object.
   * @param {Boolean} isInRole True if the principal is in the specified role.
   */
    BaseRole.isInRole = function baseRoleIsInRole(role, context, callback) {
      if (!(context instanceof AccessContext)) {
        context = new AccessContext(context);
      }

      var options;
      if (context.remotingContext && context.remotingContext.req.callContext) {
        options = context.remotingContext.req.callContext;
      } else {
        options = context.options || {};
      }

      this.resolveRelatedModels();

      debug('isInRole(): %s', role);
      context.debug();

      var resolver = loopback.Role.resolvers[role];
      if (resolver) {
        debug('Custom resolver found for role %s', role);
        resolver(role, context, callback);
        return;
      }

      if (context.principals.length === 0) {
        debug('isInRole() returns: false');
        process.nextTick(function noRole() {
          if (callback) {
            callback(null, false);
          }
        });
        return;
      }

      var inRole = context.principals.some(function inRole(p) {
        var principalType = p.type || null;
        var principalId = p.id || null;

        // Check if it's the same role
        return principalType === loopback.RoleMapping.ROLE && principalId === role;
      });

      if (inRole) {
        debug('isInRole() returns: %j', inRole);
        process.nextTick(function noRole() {
          if (callback) {
            callback(null, true);
          }
        });
        return;
      }

      var roleMappingModel = this.roleMappingModel;
      this.findOne({ where: { name: role } }, options, function findOne(err, result) {
        if (err) {
          if (callback) {
            callback(err);
          }
          return;
        }
        if (!result) {
          if (callback) {
            callback(null, false);
          }
          return;
        }
        debug('Role found: %j', result);

        // Iterate through the list of principals
        async.some(context.principals, function principle(p, done) {
          var principalType = p.type || null;
          var principalId = p.id || null;
          var roleId = result.id.toString();

          if (principalId !== null && typeof principalId !== 'undefined' && (typeof principalId !== 'string')) {
            principalId = principalId.toString();
          }

          if (principalType && principalId) {
            roleMappingModel.findOne({
              where: {
                roleId: roleId,
                principalType: principalType, principalId: principalId
              }
            },
              options, function roleMappingModelFindOne(err, result) {
                debug('Role mapping found: %j', result);
                // The only arg is the result
                done(!err && result);
              });
          } else {
            process.nextTick(function findOneErr() {
              done(false);
            });
          }
        }, function asyncFinalCb(inRole) {
          debug('isInRole() returns: %j', inRole);
          if (callback) {
            callback(null, inRole);
          }
        });
      });
    };
  });
};
