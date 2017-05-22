/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

/**
 * This function injects proxy call in case a remote methode is proxy enabled
 *
 * @memberof Boot Scripts
 * @author Dipayan Aich
 * @name InjectProxyCall
 */

function getActiveRemoteMethods(model) {
  const activeRemoteMethods =
    model.sharedClass
      .methods({
        includeDisabled: false
      })
      .filter(value => {
        return model.settings.proxyMethods && model.settings.proxyMethods.some(v => v.name === value.name);
      }).map(ret => {
        return {
          name: ret.name,
          isStatic: ret.isStatic
        };
      });

  return activeRemoteMethods;
}

module.exports = function fnInjectProxyCall(app, cb) {
  var fn = function fnInjectProxyCallFn(X, methodName) {
    return function fnInjectProxyCallCbFn(...args) {
      var model = typeof (this) === 'function' ? this : Object.getPrototypeOf(this).constructor;
      if (typeof (this) === 'function' && model.invokeProxyIfRemote(methodName, ...args)) {
        return cb.promise;
      } else if (model.invokeProxyIfRemote.call(this, methodName, ...args)) {
        return cb.promise;
      }
      X.call(this, ...args);
    };
  };

  Object.keys(app.models).forEach((modelName) => {
    const model = app.models[modelName];
    var proxyMethods = getActiveRemoteMethods(model);

    proxyMethods.forEach(method => {
      if (!method.isStatic) {
        model.prototype[method.name] = fn(model.prototype[method.name], 'prototype.' + method.name);
      } else {
        model[method.name] = fn(model[method.name], method.name);
      }
    });
  });

  cb();
};
