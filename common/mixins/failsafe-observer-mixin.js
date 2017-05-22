/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var logger = require('../../lib/logger');
var log = logger('failsafe-observer-mixin');
var async = require('async');
var UUID = require('node-uuid');
var eventHistroyManager = require('./../../lib/event-history-manager.js');

module.exports = function failsafeObserverMixin(Model) {
  if (Model.modelName === 'BaseEntity') {
    return;
  }

  if (Model.modelName === 'BaseReplayableEntity') {
    return;
  }

  var FailSafeObserver = function failsafeObserverFn(fn) {
    var _fn = fn;
    var _id = UUID.v4();
    var _name = fn.name;

    this.execute = function failSafeExecuteFn(modelName, version, ctx, next) {
      _fn(ctx, function innerExecuteCallbackFn(error) {
        if (!error) {
          eventHistroyManager.update(modelName, version, _id);
          next();
        } else {
          log.error(ctx.options, 'an after save observer: ', _fn.name, ' failed with error: ', error.message);
          next(error);
        }
      });
    };

    this.getId = function getIdFn() {
      return _id;
    };

    this.getName = function getNameFn() {
      return _name;
    };
  };

  Model._fsObservers = {};

  Model.defineProperty('_fsCtx', {
    type: 'string'
  });

  if (Model.definition.settings.hidden) {
    Model.definition.settings.hidden = Model.definition.settings.hidden.concat(['_fsCtx']);
  } else {
    Model.definition.settings.hidden = ['_fsCtx'];
  }

  Model.failSafeObserve = function failSafeOnserveFn(eventName, observer) {
    if (!(observer instanceof FailSafeObserver)) {
      var err = new Error('observer should be an instanceof FailSafeObserver');
      err.retriable = false;
      throw err;
    }

    if (!this._fsObservers[eventName]) {
      this._fsObservers[eventName] = { 'observers': [], 'observerIds': [] };
    }

    this._fsObservers[eventName].observers.push(observer);
    this._fsObservers[eventName].observerIds.push(observer.getId());
  };

  function converteObservers() {
    if (typeof Model._observers['after save'] !== 'undefined') {
      Model._observers['after save'].forEach(function modelObserversFn(observer) {
        var failSafeObserver = new FailSafeObserver(observer);
        Model.failSafeObserve('after save', failSafeObserver);
      });
      Model._observers['after save'] = [];
    }
    var _observe = Model.observe;
    Model.observe = function modelObserveFn(operation, method) {
      if (operation === 'after save' && method.name !== '_failsafeObserverAfterSave') {
        var failSafeObserver = new FailSafeObserver(method);
        Model.failSafeObserve('after save', failSafeObserver);
      } else {
        _observe.call(this, operation, method);
      }
    };
  }

  Model.evObserve('before save', failsafeObserverBeforeSave);

  converteObservers();

  Model.evObserve('after save', _failsafeObserverAfterSave);
};

function failsafeObserverBeforeSave(ctx, next) {
  var version;
  if (typeof ctx.instance !== 'undefined') {
    version = ctx.instance._version;
    ctx.instance._fsCtx = JSON.stringify(ctx.options);
  } else if (typeof ctx.data !== 'undefined') {
    version = ctx.data._version;
  }
  eventHistroyManager.create(ctx.Model.modelName, version, ctx);
  next();
}


function _failsafeObserverAfterSave(ctx, next) {
  // Invoke failsafe observers in look
  if (ctx.Model.definition.settings.mixins.FailsafeObserverMixin) {
    notifyFailsafeObservers(ctx.Model, ctx.Model, ctx, function notifyFailsafeObserversFn(err) {
      var version = (ctx.instance && ctx.instance._version) || (ctx.data && ctx.data._version);
      if (!err) {
        eventHistroyManager.remove(ctx.Model.modelName, version);
        next();
      } else {
        if (err.retriable === false) {
          eventHistroyManager.remove(ctx.Model.modelName, version, 'error: ' + err.message + ' is not retriable.');
          return next(err);
        }
        next();
      }
    });
  } else {
    next();
  }
}

function notifyFailsafeObservers(childModel, model, ctx, cb) {
  notifyBaseFailsafeObservers(childModel, model, ctx, function notifyBaseFailsafeObserversCbFn(error) {
    if (error) {
      return cb(error);
    }
    var fsObservers = (model._fsObservers['after save'] && model._fsObservers['after save'].observers) || [];
    var version = (ctx.instance && ctx.instance._version) || (ctx.data && ctx.data._version);
    async.eachSeries(fsObservers, function notifySingleObserver(fn, callback) {
      var retval = fn.execute(childModel.modelName, version, ctx, callback);

      if (retval && typeof retval.then === 'function') {
        retval.then(function retvalFn() {
          callback();
        }, callback);
      }
    }, function asyncEachSeriesCbFn(err) {
      if (err) {
        cb(err);
      } else {
        cb();
      }
    });
  });
}

function notifyBaseFailsafeObservers(childModel, model, ctx, cb) {
  if (model.base && model.base._fsObservers) {
    notifyFailsafeObservers(childModel, model.base, ctx, cb);
  } else {
    cb();
  }
}
