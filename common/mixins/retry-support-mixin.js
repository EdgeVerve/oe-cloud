/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

/**
 *
 * @mixin Retry-Support Mixin
 * @author David Zharnest
 */


module.exports = function RetrySupportMixin(Model) {
  // Add a remote methods.
  exposeAsRemote(Model);
};

/**
 * Adds remote methods to model and exposes them.
 *
 * @param {ModelConst}  Model - Model constructor on which remote method is added.
 * @memberof History Mixin
 */
function exposeAsRemote(Model) {
  Model.isRetryable = function modelIsRetryable(filter, options, cb) {
    return cb(null, 'true');
  };

  // Register a REST end-point /isRetryable for the above method
  Model.remoteMethod('isRetryable', {
    http: {
      path: '/isRetryable',
      verb: 'get'
    },
    accepts: {
      arg: 'filter',
      type: 'object'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });

  Model.primaryKeyField = function pKeyField(filter, options, cb) {
    var pkField = {};
    pkField.name = Model.dataSource.idName(Model.modelName);
    return cb(null, pkField);
  };

  // Register a REST end-point /isRetryable for the above method
  Model.remoteMethod('primaryKeyField', {
    http: {
      path: '/primaryKeyField',
      verb: 'get'
    },
    accepts: {
      arg: 'filter',
      type: 'object'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });
}
