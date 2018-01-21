/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var logger = require('oe-logger');
var log = logger('failsafe-observer-mixin');
var async = require('async');
var uuidv4 = require('uuid/v4');
var os = require('os');
var process = require('process');
var currHostName = process.env.HOSTNAME || os.hostname();
var eventHistroyManager;
var disableEventHistoryManager = process.env.DISABLE_EVENT_HISTORY;
var observerTypes = ['after save', 'after delete'];
var loopback = require('loopback');

module.exports = function failsafeObserverMixin(Model) {
  if (disableEventHistoryManager && disableEventHistoryManager === 'true') {
    return;
  }
  eventHistroyManager = require('./../../lib/event-history-manager.js');
  if (Model.modelName === 'BaseEntity') {
    return;
  }

  // register createEventHistory method as a remote method on the model
  Model.remoteMethod('createEventHistory', {
    http: {
      path: '/createEventHistory',
      verb: 'post'
    },
    isStatic: false,
    accepts: {
      arg: 'context',
      type: 'object'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });

  Model.prototype.createEventHistory = function (context, options, cb) {
    var modelName = this._type;
    var version = this._version;
    var trigger = context.trigger;

    var ctx = {};
    ctx.instance = this;
    ctx.Model = loopback.getModel(modelName);
    ctx.fromRecovery = context.fromRecovery || false;
    ctx.hasFailedObserverLog = context.hasFailedObserverLog || false;
    if (this._fsCtx) {
      try {
        var fsCtx = JSON.parse(this._fsCtx);
        Object.assign(ctx, fsCtx);
      } catch (e) {
        log.debug(log.defaultContext(), 'failed to parse _fsCtx: ', e);
        ctx.options = { fetchAllScopes: true, ctx: { tenantId: 'default' } };
      }
    }

    eventHistroyManager.create(modelName, version, trigger, ctx);
    return cb();
  };

  var FailSafeObserver = function (fn) {
    function generateId(fn) {
      if (fn.getId && typeof fn.getId === 'function') {
        return fn.getId();
      }
      return uuidv4();
    }
    var _fn = fn;
    var _id = generateId(_fn);
    var _name = fn.name;

    this.execute = function (modelName, version, operation, ctx, next) {
      _fn(ctx, function (error) {
        if (!error) {
          if (version) {
            eventHistroyManager.update(modelName, version, operation, _id);
          }
          next();
        } else {
          log.debug(ctx.options, 'failSafe observer: ', _fn.name, ' failed with error: ', error.message);
          next(error);
        }
      });
    };

    this.getId = function () {
      return _id;
    };

    this.getName = function () {
      return _name;
    };
  };

  Model._fsObservers = {};

  Model.defineProperty('_hostName', {
    type: String,
    default: currHostName
  });

  Model.defineProperty('_fsCtx', {
    type: 'string',
    oracle: {
      'dataType': 'CLOB'
    }
  });

  if (Model.definition.settings.hidden) {
    Model.definition.settings.hidden = Model.definition.settings.hidden.concat(['_fsCtx', '_hostName']);
  } else {
    Model.definition.settings.hidden = ['_fsCtx', '_hostName'];
  }

  Model.definition.options = Model.definition.options || {};
  Model.definition.options.proxyEnabled = true;
  Model.definition.options.proxyMethods = Model.definition.options.proxyMethods || [];
  Model.definition.options.proxyMethods.push({ name: 'createEventHistory' });

  Model.failSafeObserve = function (eventName, observer) {
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

  function converteObservers(type) {
    if (typeof Model._observers[type] !== 'undefined') {
      Model._observers[type].forEach(function (observer) {
        var failSafeObserver = new FailSafeObserver(observer);
        Model.failSafeObserve(type, failSafeObserver);
      });
      Model._observers[type] = [];
    }
  }

  function changeObserve() {
    var _observe = Model.observe;
    Model.observe = function (operation, method) {
      if (observerTypes.find(op => op === operation) && !method.name.startsWith('_failsafeObserver')) {
        var failSafeObserver = new FailSafeObserver(method);
        Model.failSafeObserve(operation, failSafeObserver);
      } else {
        _observe.call(this, operation, method);
      }
    };
  }

  Model.evObserve('before save', failsafeObserverBeforeSave);
  Model.evObserve('before save', updateHostName);
  Model.evObserve('before delete', failsafeObserverBeforeDelete);

  observerTypes.forEach(type => converteObservers(type));
  changeObserve();

  Model.evObserve('after save', _failsafeObserverAfterSave);
  Model.evObserve('after delete', _failsafeObserverAfterDelete);
};

function updateHostName(ctx, next) {
  if (ctx.currentInstance && currHostName !== ctx.currentInstance._hostName) {
    ctx.data._hostName = currHostName;
  }
  return next();
}

function failsafeObserverBeforeDelete(ctx, next) {
  var version;
  var fsCtx = {};
  fsCtx.options = ctx.options;
  fsCtx.isNewInstance = ctx.isNewInstance ? ctx.isNewInstance : false;
  if (typeof ctx.instance !== 'undefined') {
    version = ctx.instance._version;
    ctx.instance._fsCtx = JSON.stringify(fsCtx);
  } else if (typeof ctx.data !== 'undefined') {
    version = ctx.data._version;
    if (ctx.where) fsCtx.where = ctx.where;
    ctx.data._fsCtx = JSON.stringify(fsCtx);
  }
  if (!version) {
    return next();
  }
  eventHistroyManager.create(ctx.Model.modelName, version, 'after delete', ctx);
  next();
}

function failsafeObserverBeforeSave(ctx, next) {
  var version;
  var fsCtx = {};
  fsCtx.options = ctx.options;
  fsCtx.isNewInstance = ctx.isNewInstance ? ctx.isNewInstance : false;
  if (typeof ctx.instance !== 'undefined') {
    version = ctx.instance._version;
    ctx.instance._fsCtx = JSON.stringify(fsCtx);
  } else if (typeof ctx.data !== 'undefined') {
    version = ctx.data._version;
    if (ctx.where) fsCtx.where = ctx.where;
    ctx.data._fsCtx = JSON.stringify(fsCtx);
  }
  if (!version) {
    return next();
  }

  eventHistroyManager.create(ctx.Model.modelName, version, 'after save', ctx);
  next();
}

function _failsafeObserverAfterSave(ctx, next) {
  invokeFailsafeObserver(ctx, 'after save', next);
}

function _failsafeObserverAfterDelete(ctx, next) {
  invokeFailsafeObserver(ctx, 'after delete', next);
}

function invokeFailsafeObserver(ctx, operation, next) {
  if (ctx.Model.definition.settings.mixins.FailsafeObserverMixin) {
    notifyFailsafeObservers(ctx.Model, ctx.Model, operation, ctx, function (err) {
      var version = (ctx.instance && ctx.instance._version) || (ctx.data && ctx.data._version);
      if (!err) {
        if (version) {
          eventHistroyManager.remove(ctx.Model.modelName, version, operation);
        }
        return next();
      }
      if (err.retriable === false) {
        if (version) {
          eventHistroyManager.remove(ctx.Model.modelName, version, operation, 'error: ' + err.message + ' is not retriable.');
        }
        return next(err);
      }
      eventHistroyManager.updateRanOnce(ctx.Model.modelName, version, operation);
      return next();
    });
  } else {
    return next();
  }
}

function notifyFailsafeObservers(childModel, model, operation, ctx, cb) {
  notifyBaseFailsafeObservers(childModel, model, operation, ctx, function (error) {
    if (error) {
      return cb(error);
    }
    var fsObservers = (model._fsObservers[operation] && model._fsObservers[operation].observers) || [];
    var version = (ctx.instance && ctx.instance._version) || (ctx.data && ctx.data._version);
    async.eachSeries(fsObservers, function notifySingleObserver(fn, callback) {
      var retval = fn.execute(childModel.modelName, version, operation, ctx, callback);

      if (retval && typeof retval.then === 'function') {
        retval.then(function () {
          callback();
        }, callback);
      }
    }, function (err) {
      if (err) {
        cb(err);
      } else {
        cb();
      }
    });
  });
}

function notifyBaseFailsafeObservers(childModel, model, operation, ctx, cb) {
  if (model.base && model.base._fsObservers) {
    notifyFailsafeObservers(childModel, model.base, operation, ctx, cb);
  } else {
    cb();
  }
}
