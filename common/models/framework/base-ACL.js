/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

var loopback = require('loopback');
var async = require('async');
var debug = require('debug')('loopback:security:acl');
var logger = require('../../../lib/logger');
var log = logger('BaseACL');
var loopbackAccessContext = require('loopback/lib/access-context');
var AccessContext = loopbackAccessContext.AccessContext;
// var Principal = loopbackAccessContext.Principal;
var AccessRequest = loopbackAccessContext.AccessRequest;

var ACL = loopback.ACL;

/**
 * @classdesc This model controls the access control for APIs
 * Earlier these methods were part of boot script
 * @kind class
 * @author Ajith / Praveen Gulati
 * @class BaseACL
 */

module.exports = function DBTransactionFn(BaseACL) {
  /**
 * Check if the request has the permission to access.
 * @param {Object} context See below.
 * @property {Object[]} principals An array of principals.
 * @property {String|Model} model The model name or model class.
 * @property {*} id The model instance ID.
 * @property {String} property The property/method/relation name.
 * @property {String} accessType The access type:
 *   READ, REPLICATE, WRITE, or EXECUTE.
 * @param {Function} callback Callback function
 */
  BaseACL.checkAccessForContext = function checkAccessForContext(context, callback) {
    var registry = this.registry;

    if (!(context instanceof AccessContext)) {
      context = new AccessContext(context);
    }

    var model = context.model;
    var property = context.property;
    var accessType = context.accessType;

    var modelName = model.settings.variantOf || model.modelName;

    var methodNames = context.methodNames;
    var propertyQuery = (property === ACL.ALL) ? null : { inq: methodNames.concat([ACL.ALL]) };

    var accessTypeQuery = (accessType === ACL.ALL) ?
      null :
      (accessType === ACL.REPLICATE) ?
        { inq: [ACL.REPLICATE, ACL.WRITE, ACL.ALL] } :
        { inq: [accessType, ACL.ALL] };

    var req = new AccessRequest(modelName, property, accessType, ACL.DEFAULT, methodNames);

    var effectiveACLs = [];
    // for static ACLs using personalised model name
    // but for dynamic models use variant Of Parent
    var staticACLs = this.getStaticACLs(model.modelName, property);

    var self = this;
    var roleModel = registry.getModelByType('BaseRole');
    this.find({
      where: {
        model: modelName, property: propertyQuery,
        accessType: accessTypeQuery
      }
    }, context.remotingContext.req.callContext, function modelFindCb(err, acls) {
      if (err) {
        if (callback) {
          callback(err);
        }
        return;
      }

      var inRoleTasks = [];

      acls = acls.concat(staticACLs);

      acls.forEach(function aclsForEach(acl) {
        // Check exact matches
        for (var i = 0; i < context.principals.length; i++) {
          var p = context.principals[i];
          var typeMatch = p.type === acl.principalType;
          var idMatch = String(p.id) === String(acl.principalId);
          if (typeMatch && idMatch) {
            effectiveACLs.push(acl);
            return;
          }
        }

        // Check role matches
        if (acl.principalType === ACL.ROLE) {
          inRoleTasks.push(function inRoleTasks(done) {
            roleModel.isInRole(acl.principalId, context,
              function checkIsInRole(err, inRole) {
                if (!err && inRole) {
                  effectiveACLs.push(acl);
                }
                //  else {
                //    console.log('reject acl ', acl);
                //  }
                done(err, acl);
              });
          });
        }
      });

      async.parallel(inRoleTasks, function asyncParallInRoleTasks(err, results) {
        if (err) {
          if (callback) {
            callback(err, null);
          }
          return;
        }

        var resolved = self.resolvePermission(effectiveACLs, req);
        if (resolved && resolved.permission === ACL.DEFAULT) {
          resolved.permission = (model && model.settings.defaultPermission) || ACL.ALLOW;
        }
        debug('---Resolved---');
        resolved.debug();
        if (callback) {
          callback(null, resolved);
        }
      });
    });
  };

  BaseACL.observe('after save', function aclModelObserveAfterSaveFn(ctx, next) {
    if (ctx.instance) {
      var acl = {
        'principalType': ctx.instance.principalType,
        'principalId': ctx.instance.principalId,
        'permission': ctx.instance.permission,
        'property': ctx.instance.property
      };
      var model = loopback.findModel(ctx.instance.model);
      if (model) {
        model.settings.acls.push(acl);
        log.debug(ctx.options, 'Added new ACL ', JSON.stringify(acl), ' to application');
      }
    } else {
      log.debug(ctx.options, 'Updated %s matching %j', ctx.Model.pluralModelName, ctx.where);
      // TO-DO: Handle the case where a EV_ACL is updated
    }
    next();
  });

  /*
   * Adding a remote method called /removeacl as an alternative to the loopback provided
   * delete method as the 'after delete' event does not provide the deleted object
   * in the ctx
   */
  BaseACL.removeacl = function aclModelRemoveACLFn(id, options, cb) {
    // 'acl' contains the ACL entity for removal
    BaseACL.findById(id, options, function aclModelRemoveACLFindCb(err, acl) {
      if (err) {
        cb(err);
      }
      // Obtain the name of the model for which the acl is applicable
      var modelNameInACL = acl.model;

      // obtain the model corresponding to the modelname in the acl
      var model = loopback.findModel(modelNameInACL);

      // Delete the ACL from the database
      BaseACL.destroyById(id);

      // Filter out (remove) the ACL from the Model's ACL
      // by matching each existing ACL against the ACL to be removed
      model.settings.acls = model.settings.acls.filter(function aclModelRemoveACLFindFilterFn(a) {
        return (!(a.property === acl.property &&
          a.principalType === acl.principalType &&
          a.principalId === acl.principalId &&
          a.permission === acl.permission));
      });
      var response = 'Removed ACL with id ' + id + ' from ' + model.modelName;
      log.debug(options, response);
      cb(null, response);
    });
  };

  // Registering the remote method as a 'DELETE' method
  BaseACL.remoteMethod(
    'removeacl', {
      http: {
        path: '/removeacl',
        verb: 'delete'
      },
      accepts: {
        arg: 'id',
        type: 'string'
      },
      returns: {
        arg: 'status',
        type: 'string'
      }
    }
  );
};
