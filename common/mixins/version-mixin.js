/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This mixin is to support version control of a record/instance it adds a new
 * property called _version and auto populate it with uuid.v4() which is a
 * unique number, new version for a record is generated, when a new instance is
 * created or updated.<br><br>
 *
 * It also added check for version number on update and delete, of a record so
 * when a record/instance needs to be updated or deleted, user must provide the
 * current version of the record.
 *
 * @mixin EV Version Mixin
 * @author Sivankar Jain
 */

var Uuid = require('node-uuid');

module.exports = function VersionMixin(Model) {
  if (Model.modelName === 'BaseEntity') {
    return;
  }

  if (Model.modelName === 'BaseReplayableEntity') {
    return;
  }

  Model.defineProperty('_oldVersion', {
    type: String
  });

  Model.defineProperty('_version', {
    type: String,
    required: true
  });

  Model.defineProperty('_requestId', {
    type: String
  });

  Model.defineProperty('_newVersion', {
    type: String
  });

  Model.settings._versioning = true;
  // Model.settings.updateOnLoad = true;

  Model.evObserve('after save', function afterSaveVersionMixin(ctx, next) {
    var data = ctx.data || ctx.instance;
    if (data && data.__data) {
      delete data.__data._newVersion;
    }
    next();
  });

  Model.switchVersion = function versionMixinBeforeSave(ctx, next) {
    // if (Model.modelName !== ctx.Model.modelName) {
    //     return next();
    // }
    var data = ctx.data || ctx.instance;
    // console.log('before save version mixin ', ctx.Model.modelName, data._version);
    var error;
    if (ctx.isNewInstance) {
      data._version = data._newVersion || data._version || Uuid.v4();
      delete data._oldVersion;
      delete data._newVersion;
    } else if (ctx.currentInstance) {
      if (ctx.currentInstance.__remoteInvoked) {
        // console.log('post data', data);
        if (!data._version) {
          error = new Error();
          error.name = 'Data Error';
          error.message = 'current version must be specified in _version field';
          error.code = 'DATA_ERROR_071';
          error.type = 'DataModifiedError';
          error.retriable = false;
          error.status = 422;
          return next(error);
        }
      }
      var version = data._version || ctx.currentInstance._version;
      if (data._newVersion && data._newVersion === version) {
        error = new Error();
        error.name = 'Data Error';
        error.message = 'current version and new version must be different';
        error.code = 'DATA_ERROR_071';
        error.type = 'DataModifiedError';
        error.retriable = false;
        error.status = 422;
        return next(error);
      }
      if (version.toString() !== ctx.currentInstance._version.toString()) {
        error = new Error();
        error.name = 'Data Error';
        error.message = 'No record with version specified';
        error.code = 'DATA_ERROR_071';
        error.type = 'DataModifiedError';
        error.retriable = false;
        error.status = 422;
        return next(error);
      }
      data._oldVersion = version;
      data._version = data._newVersion || Uuid.v4();
      delete data._newVersion;
    }
    // TODO replaceById will have ctx.instance, and not
    // ctx.currentinstance, need to analyze that
    next();
  };

  // lock current _version
  Model.evObserve('persist', function versionMixinPersistsFn(ctx, next) {
    delete ctx.data._newVersion;
    return next();
  });

  Model.remoteMethod('deleteWithVersion', {
    http: {
      path: '/:id/:version',
      verb: 'delete'
    },
    description: 'Delete a model instance by id and version number, from the data source.',
    accepts: [{
      arg: 'id',
      type: 'string',
      required: true,
      http: {
        source: 'path'
      }
    }, {
      arg: 'version',
      type: 'string',
      required: true,
      http: {
        source: 'path'
      }
    }],
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });
};
