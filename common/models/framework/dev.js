/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 *
 * @classdesc This Model is to enable utility methods.
 * @kind class
 * @class devutil
 * @author Praveen Kumar Gulati
 */

var loopback = require('loopback');
var async = require('async');

var loopbackAccessContext = require('loopback/lib/access-context');
var AccessContext = loopbackAccessContext.AccessContext;

module.exports = function DevModelFn(devmodel) {
  devmodel.getinfo = function GetInfoFn(ctx, options, cb) {
    var data = { callContext: {}, accessToken: {} };
    if (!cb && typeof options === 'function') {
      cb = options;
      options = {};
    }

    data.accessToken = ctx.req.accessToken;
    data.callContext = ctx.req.callContext;
    data.options = ctx.options;

    cb(null, data);
  };


  devmodel.checkACL = function devModelCheckAcl(ctx, modelName, propertyName, options, cb) {
    var data = {};
    if (!cb && typeof options === 'function') {
      cb = options;
      options = {};
    }

    var accessTypeQuery = {
      inq: ['READ', 'WRITE', '*']
    };

    var propertyQuery = {
      inq: [propertyName, '*']
    };

    var modelClass = loopback.findModel(modelName);
    var BaseACL = loopback.getModelByType('BaseACL');
    var staticACLs = BaseACL.getStaticACLs(modelName, propertyName);
    data.staticACLs = staticACLs;
    if (staticACLs.length === 0) {
      data.staticACLMessage = 'no static ACLs applicable for model and property';
      if (modelClass && modelClass.settings.acls) {
        data.modelACLs = modelClass.settings.acls;
      }
    }

    var roleModel = loopback.getModelByType('BaseRole');
    var context = new AccessContext({
      accessToken: ctx.req.accessToken,
      model: modelClass,
      property: propertyName,
      method: propertyName,
      accessType: accessTypeQuery,
      remotingContext: ctx
    });

    var filter = { where: { model: modelName, property: propertyQuery } };
    BaseACL.find(filter, options, function baseAclFind(err, acls) {
      if (err) {
        cb(err);
      }
      data.dbACLs = acls;

      var inRoleTasks = [];

      var allAcls = acls.concat(staticACLs);

      data.matchedACLs = [];
      data.unmatchedACLs = [];
      allAcls.forEach(function allAclForEach(acl) {
        if (acl.principalType === BaseACL.USER) {
          if (options.userId === String(acl.principalId)) {
            data.matchedACLs.push(acl);
          } else {
            data.unmatchedACLs.push(acl);
          }
        }

        // Check role matches
        if (acl.principalType === 'ROLE') {
          inRoleTasks.push(function inRoleTasks(done) {
            roleModel.isInRole(acl.principalId, context,
              function roleModel(err, inRole) {
                if (!err && inRole) {
                  data.matchedACLs.push(acl);
                } else {
                  data.unmatchedACLs.push(acl);
                }
                done(err, acl);
              });
          });
        }
      });

      async.parallel(inRoleTasks, function inRoleTasks(err, results) {
        cb(err, data);
      });
    });
  };

  devmodel.personaliseModel = function personaliseModel(ctx, modelName, options, callback) {
    if (!callback && typeof options === 'function') {
      callback = options;
      options = {};
    }
    var ModelDefinition = loopback.getModel('ModelDefinition');

    ModelDefinition.findOne({ where: { name: modelName } }, options, function modelDefinitionFindOne(err, modeldef) {
      // console.log('model find ', err, modelName, modeldef);
      if (err || !modeldef) {
        return callback(err, 'Model Definition not found');
      }
      var variantData = {
        'name': modeldef.name,
        'strict': false,
        'variantOf': modeldef.name,
        'base': modeldef.name
      };
      // console.log(variantData);
      ModelDefinition.create(variantData, options, function modelDefinitionCreate(err, cb) {
        callback(err, cb);
      });
    });
  };


  devmodel.remoteMethod('getinfo', {
    description: 'Gets Current Context',
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
      path: '/getinfo'
    },
    returns: {
      type: 'object',
      root: true
    }
  });

  devmodel.remoteMethod('checkACL', {
    description: 'Check ACL for a model and property',
    accessType: 'READ',
    accepts: [{
      arg: 'ctx',
      type: 'object',
      description: 'context',
      http: {
        source: 'context'
      }
    },
    {
      arg: 'model',
      type: 'string',
      description: 'model name',
      http: {
        source: 'path'
      }
    },
    {
      arg: 'property',
      description: 'property of the model',
      type: 'string',
      http: {
        source: 'path'
      }
    }
    ],
    http: {
      verb: 'GET',
      path: '/checkACL/:model/:property'
    },
    returns: {
      type: 'object',
      root: true
    }
  });
};
