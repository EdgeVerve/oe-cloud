/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 *
 * @classdesc DataACL provides the filter condition on data for a given model which a principal (user or role) can access.
 *  It allows seprate filters for a given access type (READ/WRITE)
 *  DataACL works in combinatioin with ACLACL controls whether user can access the model/api or not
 *  DataACL controls what data user can access for that api
 *  If DataACL is not defined i.e. user can access all the data
 *  provided ACL has allowed it.
 *  A single DataACL can have a complex filter consisting and or of multiple conditions
 *  The format of filter is what loopback uses for filter
 *  In case you post multiple DataACLs for same model and same principal
 *  These are clubbed group wise (Filter in each group will be or condition)
 *  All filters then will be joined across group using and operator
 *  group is optional, in that case each filter goes to a default group
 *  Additionally DataACL allows using context variables in values used in filter condition, by using @ctx.<contextfield> syntax
 * @kind class
 * @class DataACL
 * @author Praveen Kumar Gulati
 */

var logger = require('oe-logger');
var log = logger('data-acl');
var loopback = require('loopback');
var applyFilter = require('loopback-filters');
var mergeQuery = require('loopback-datasource-juggler/lib/utils').mergeQuery;
var async = require('async');
var loopbackAccessContext = require('loopback/lib/access-context');
var AccessContext = loopbackAccessContext.AccessContext;
var errorUtil = require('../../../lib/common/error-utils').getValidationError;
var RoleMapping = loopback.RoleMapping;

// Gets specified `value` on `target` going levels down if required.
function getValue(target, field) {
  var retVal;
  if (field) {
    var fields = field.split('.');
    var leaf = fields.pop();

    var currentTarget = target;
    fields.forEach(function _forEachCb(field) {
      currentTarget = currentTarget ? currentTarget[field] : null;
    });
    retVal = currentTarget ? currentTarget[leaf] : null;
  }
  return retVal;
}

function buildFilter(filter, ctx) {
  Object.keys(filter).map(function filterForEachKey(item) {
    var value = filter[item];
    if (typeof value === 'string') {
      if (value.startsWith('@ctx.')) {
        filter[item] = getValue(ctx, value.substr(5));
        if (!filter[item]) {
          var err = new Error('Context not present');
          err.retriable = false;
          throw err;
        }
      } else if (value.startsWith('@CC.')) {
        filter[item] = getValue(ctx, value.substr(4));
        if (!filter[item]) {
          var err1 = new Error('Context not present');
          err1.retriable = false;
          throw err1;
        }
      }
    } else if (typeof value === 'object') {
      filter[item] = buildFilter(value, ctx);
    }
  });

  return filter;
}

// {"where":{"key":{"like":"N"}}}

module.exports = function DataACLFn(DataACL) {
  // Define constants
  DataACL.READ = AccessContext.READ;
  DataACL.WRITE = AccessContext.WRITE;
  DataACL.EXECUTE = AccessContext.EXECUTE;
  DataACL.USER = 'USER';
  DataACL.ROLE = 'ROLE';
  DataACL.ALL = '*';

  DataACL.applyFilter = function dataAclApplyFilter(ctx, callback) {
    var roleModel = loopback.getModelByType('BaseRole');

    var method = ctx.method;
    var req = ctx.req;
    var Model = method.ctor;

    var accessType = DataACL.ALL;
    if (Model) {
      accessType = Model._getAccessTypeForMethod(method);
    }

    accessType = accessType || AccessContext.WRITE;

    var modelName = Model.clientModelName || Model.modelName;
    var accessTypeQuery = {
      inq: [accessType, DataACL.ALL]
    };
    var propertyQuery = {
      inq: [method.name, DataACL.ALL]
    };

    var wc = {
      where: {
        model: modelName,
        property: propertyQuery,
        accessType: accessTypeQuery
      }
    };
    this.find(wc, ctx.req.callContext, function modelFind(err, dataacls) {
      if (err) {
        callback(err);
      }
      // dataFilter will have 2 elements one where property is exact matched and one for wild card match as property name in datacl can be *
      var dataFilter = [];
      var inRoleTasks = [];
      dataFilter.push({});
      dataFilter.push({});

      if (dataacls.length === 0) {
        return callback();
      }

      var context = new AccessContext({
        accessToken: req.accessToken,
        model: Model,
        property: method.name,
        method: method.name,
        sharedMethod: method,
        accessType: accessTypeQuery,
        remotingContext: ctx
      });
     // Checking the AccessContext has accessToken with roles attached
    if (ctx.req.accessToken && ctx.req.accessToken.roles && Array.isArray(ctx.req.accessToken.roles)) {
      // Looping through Roles in accessToken and adding them to context.principals as RoleMapping.ROLE
      ctx.req.accessToken.roles.forEach((role) => {
        context.addPrincipal(RoleMapping.ROLE, role);
      });
    }
      var errorCode;
      dataacls.forEach(function dataaclsForEach(dataacl) {
        dataacl.filter = dataacl.filter || {};
        dataacl.property = dataacl.property || '*';
        var exactMatch = dataacl.property === method.name ? 1 : 0;
        dataacl.group = dataacl.group || '__DEFAULT__';
        if (dataacl.principalType === DataACL.USER) {
          if (req.accessToken && String(req.accessToken.userId) === String(dataacl.principalId)) {
            errorCode = errorCode || dataacl.errorCode;
            dataFilter[exactMatch][dataacl.group] = dataFilter[exactMatch][dataacl.group] || [];
            dataFilter[exactMatch][dataacl.group].push(dataacl.filter);
          }
        } else if (dataacl.principalType === DataACL.ROLE) {
          inRoleTasks.push(function inRoleTasksFn(done) {
            roleModel.isInRole(dataacl.principalId, context,
              function checkIsInRole(err, inRole) {
                if (!err && inRole) {
                  dataFilter[exactMatch][dataacl.group] = dataFilter[exactMatch][dataacl.group] || [];
                  dataFilter[exactMatch][dataacl.group].push(dataacl.filter);
                  errorCode = errorCode || dataacl.errorCode;
                }
                done(err, dataacl.filter);
              });
          });
        }
      });

      async.parallel(inRoleTasks, function inRoleTasks(err, results) {
        if (err) {
          return callback(err, null);
        }

        var filterUsed = (dataFilter[1] && Object.keys(dataFilter[1]).length) ? dataFilter[1] : dataFilter[0];
        // console.log('dataFilter ', JSON.stringify(dataFilter));

        if (Object.keys(filterUsed).length === 0) {
          return callback();
        }

        var obj = {};
        var callContext = ctx.req.callContext || {};
        try {
          buildFilter(filterUsed, callContext.ctx);
        } catch (err) {
          var error = new Error();
          error.name = 'DataACL Definition Error';
          error.message = `The DataACL defined is invalid for model ${modelName} `;
          error.code = 'DATA_ACL_ERROR_090';
          error.type = 'value in context is missing';
          log.error(log.defaultContext(), 'DataACL filter error', error);
          return callback(error);
        }
        var filter = ctx.args.filter || {};
        if (typeof filter === 'string') {
          filter = JSON.parse(filter);
        }

        Object.keys(filterUsed).forEach(function filterUsedForEach(group) {
          if (filterUsed[group].length === 1) {
            mergeQuery(filter, {
              'where': {
                'and': filterUsed[group]
              }
            });
          } else {
            mergeQuery(filter, {
              'where': {
                'or': filterUsed[group]
              }
            });
          }
        });

        log.debug(callContext, 'filter in dataacl ', filter);

        var failed = [];
        if (accessType === 'READ') {
          ctx.args.filter = filter;
          return callback();
        }
        var coll = [];
        if (ctx.instance) {
          coll.push(ctx.instance);
          try {
            var result = applyFilter(coll, filter);
            if (!result.length) {
              failed.push(ctx.instance);
            }
          } catch (e) {
            // TODO what is this error
            failed.push(ctx.instance);
          }
        }

        var updateMethods = ['create', 'updateAttributes', 'update', 'updateOrCreate', 'upsert', 'replaceById', 'replaceOrCreate'];
        var applyDataACLOnBody = updateMethods.indexOf(method.name) >= 0 || method.applyDataACLOnBody;
        // Only if this method is for parent model
        // and only for those methods which accepts body
        // relation method name starts with '__', so checkBody will be false
        if (applyDataACLOnBody && ctx.req.body) {
          var arr = ctx.req.body;
          if (!Array.isArray(arr)) {
            arr = [];
            arr.push(ctx.req.body);
          }
          arr.forEach(function recordForEach(record) {
            var coll = [];
            coll.push(record);
            try {
              var result = applyFilter(coll, filter);
              if (!result.length) {
                failed.push(record);
              }
            } catch (e) {
              // TODO what is this error
              failed.push(record);
            }
          });
        }
        if (failed.length) {
          errorCode = errorCode || 'data-acl-err-001';
          obj.options = callContext;
          errorUtil(errorCode, obj, function errorUtil(err) {
            err.statusCode = 403;
            log.error(log.defaultContext(), 'Data Access Control does not allow access', err);
            return callback(err, failed);
          });
        } else {
          return callback();
        }
      });
    });
  };
};
