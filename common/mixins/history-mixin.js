/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

/**
 * This mixin is to provide History management support for any update and delete
 * operation on an model instance.<br>
 *
 * It creates a new model for history management, with appended 'History' to
 * actual model name. So for example if there is a Product model, it creates
 * ProductHistory model in the same datasource as of actual model.<br>
 * The properties of History model are same as the actual model, but without any
 * validations as history will be created from the last record in database which
 * would have already passed validations.<br>
 *
 * It added a new property _modelId to history model, to keep track of actual id
 * of the record.</br>
 *
 * It also adds a new remote method /history to actual model which can be used
 * to retrieve history. remote method also support filters similar to find
 * filter.
 *
 * @mixin History Mixin
 * @author Sivankar jain
 */
var loopback = require('loopback');
// var _ = require('lodash');

var logger = require('../../lib/logger');
var log = logger('history-mixin');

module.exports = function HistoryMixin(Model) {
  // Skip this mixin where ever not applicable.
  if (skipThisMixinIfNotApplicable(Model)) {
    return;
  }

  // Add a remote method to retrive history.
  addHistoryMethodAndExposeAsRemote(Model);

  // Disable updateAll as we will not allow bulk updates. Only updates on id
  // is allowed.
  Model.disableRemoteMethod('updateAll', true);

  // Create history model when the model is added to the loopback application.
  Model.on('attached', function historyMixinAttached() {
    createHistoryModel(Model);
  });

  addObservers(Model);
};

/**
 * Checks if mixin needs to be skipped or not. Mixin is skipped for BaseEntity,
 * CacheManager.
 *
 * @param {object}Model - Model Constructor
 * @returns {Boolean} - true is model is BaseEntity else false
 * @memberof History Mixin
 */
function skipThisMixinIfNotApplicable(Model) {
  if (Model.definition.name === 'BaseEntity' || Model.definition.name === 'CacheManager') {
    Model.definition.settings.HistoryMixin = true;
    log.debug(log.defaultContext(), 'skipping mixin for - ', Model.definition.name);
    return true;
  }
  return false;
}

/**
 * Adds a remote method to model and exposes /history to retrieve model history.
 *
 * @param {ModelConst}  Model - Model constructor on which remote method is added.
 * @memberof History Mixin
 */
function addHistoryMethodAndExposeAsRemote(Model) {
  Model.history = function historyMixinHistory(filter, options, cb) {
    if (!(cb && typeof cb === 'function')) {
      if (options && typeof options === 'function') {
        cb = options;
        options = {};
      } else {
        var err = new Error(' callBack function is not defined');
        err.retriable = false;
        throw err;
      }
    }
    // get name of the History model
    var HistoryModel = loopback.findModel(Model.modelName + 'History');
    if (!HistoryModel) {
      var err1 = new Error('No History model found for ' + Model.modelName);
      err1.retriable = false;
      throw err1;
    }
    HistoryModel.find(filter, options, cb);
  };

  // Register a REST end-point /history for the above method
  Model.remoteMethod('history', {
    http: {
      path: '/history',
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
/**
 * It creates a new model, with appended 'History' to actual model name. So for
 * example if there is a Product model, it creates ProductHistory model in the
 * same datasource as of actual model.<br>
 * The properties of History model are copied from actual model, but without any
 * validations.</br>
 *
 * It added a new property _modelId to history model, to keep track of actual id
 * of the record.</br>
 *
 * @param {ModelConst} model - Model constructor on which remote method is added.
 * @memberof History Mixin
 */
function createHistoryModel(model) {
  var auditModelName = model.modelName + 'History';
  log.debug(log.defaultContext(), 'creating history model for with additional property _modelId - ', model.modelName);

  var properties = {};
  var idName = model.definition.idName();
  // Retain all properties from original model.
  // Also add a new property - _modelId to hold the original request id.
  // Note that original model should not have a modelId property

  properties._modelId = {
    type: 'string'
  };

  // to remove any validation or so in properties for history table.
  var prop = model.definition.properties;
  for (var key in prop) {
    if (prop.hasOwnProperty(key)) {
      if (key === idName) {
        properties._modelId.type = model.definition.properties[idName].type;
        continue;
      }
      for (var key1 in model.definition.properties[key]) {
        if (key1 === 'type') {
          properties[key] = {};
          properties[key][key1] = model.definition.properties[key][key1];
        }
      }
    }
  }

  var dataSourceGroup = model.definition.settings.dataSourceGroup;

  // Create a new Model in loopback.
  var newModel = loopback.createModel(auditModelName, properties, {
    base: 'PersistedModel',
    mixins: {
      'ObserverMixin': true,
      'CacheMixin': true,
      'SwitchDatasourceMixin': true
    },
    dataSourceGroup: dataSourceGroup
  });

  model._historyModel = newModel;
  // Attach it to datasource to which model is attached,
  // skipping Models that do not have a datasource attached

  if (model.dataSource) {
    model.dataSource.attach(newModel);
  }

  log.debug(log.defaultContext(), 'Created History Model ', auditModelName, ' for model ', model.modelName);
}

/**
 * Function adds 'before save' and 'before delete' observers hooks which is used
 * to create history data, which is created in after save.
 *
 * @param {ModelConst} Model - Model constructor on which remote method is added.
 * @memberof History Mixin
 */
function addObservers(Model) {
  Model.evObserve('before save', createHistoryData);
  Model.evObserve('before delete', createHistoryDataForDelete);
  Model.evObserve('after save', insertIntoHistory);
  Model.evObserve('after delete', insertIntoHistoryForDelete);
}

function createHistoryData(ctx, next) {
  if (!ctx.Model.definition.settings.mixins.HistoryMixin) {
    return next();
  }
  if (ctx.IsNewInstance) {
    return next();
  }
  var historyModel = ctx.Model._historyModel;
  if (!historyModel) {
    return next();
  }
  if (ctx.currentInstance) {
    ctx.hookState.historyData = [ctx.currentInstance.toObject()];
  } else if (ctx.where) {
    // Earlier history mixin was doing findOne
    // which is wrong as updateAll is being done...
    // and that may have multiple records..
    // TODO decide whether we need to support history for
    // bulk operations
    ctx.Model.find({
      'where': ctx.where
    }, ctx.options, function historyMixinFindOneCb(err, recs) {
      if (err) {
        return next(err);
      }
      ctx.hookState.historyData = [];
      recs.forEach(function recsForEach(e) {
        ctx.hookState.historyData.push(e.toObject());
      });
    });
  }
  return next();
}

/**
 * This function is used to create history. So when ever there is a update or
 * delete request, first it fetch the record from database and move it to
 * history and then update the record in Database.
 *
 * @param {object} ctx - ctx object, which is populated by DAO.
 * @param {function} next - move to the next function in the queue
 * @returns {function} next - move to the next function in the queue
 * @memberof History Mixin
 */
function insertIntoHistory(ctx, next) {
  if (!ctx.hookState) {
    return next();
  }

  var historyModel = ctx.Model._historyModel;
  if (!historyModel) {
    return next();
  }

  var recs = ctx.hookState.historyData || [];
  recs.forEach(function recsForEachcb(hist) {
    var idName = ctx.Model.definition.idName() || 'id';
    var idValue = hist[idName];
    hist._modelId = idValue;
    delete hist[idName];
    hist._isDeleted = false;
  });

  if (recs.length) {
    historyModel.create(recs, ctx.options, function historyModelCreatecb(err, res) {
      if (err) {
        log.error(ctx.options, 'error on insert into history model ', err);
        return next(err);
      } else if (res) {
        log.debug(ctx.options, 'history instance created ');
        return next();
      }
    });
  } else {
    return next();
  }
}

function createHistoryDataForDelete(ctx, next) {
  return createHistoryData(ctx, next);
}

function insertIntoHistoryForDelete(ctx, next) {
  return insertIntoHistory(ctx, next);
}


