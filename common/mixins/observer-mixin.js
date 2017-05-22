/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * <b>Problem statement</b> : observer being invoked multiple time for current
 * model and its parent model.</br></br>
 *
 * As we are using mixins to attach Observer hooks, the mixin will inherit
 * properties from parents , as a result same observer is attach to parent model
 * and child model, and the child-observer invokes any observer hooks attach to
 * the parent model, therefore the same observer will be called multiple times,
 * which we don't want.<br>
 * <br>
 *
 * <b>Solution</b> : so as a Solution, what we have done is, when we try to
 * attach an observer hooks to a model, we first check if that observer is
 * already attached to one of its parent, if the observe is attach to a parent
 * model, any model which inherit from that model will not have observer
 * attached. so finally only parent model will have the observer and it will be
 * notified by the child observer.
 *
 * @mixin Observer mixin
 * @author Sivankar Jain
 */

var logger = require('../../lib/logger');
var log = logger('observer-mixin');

module.exports = function ObserverMixin(Model) {
  /**
   * evObserve: Register observers based on the value of isObserverApplied.<br>
   * If isObserverApplied is false - It internally calls Model.observe with
   * given operation and listener to attach the observer to the model.<br>
   * If isObserverApplied is true: which means that observer is already
   * applied to one its parent and therefore no need to observer again, hance
   * solves the issue.
   * @param {string}operation -The operation name.
   * @param {object}listener - The listener function. It will be invoked with this set to the model constructor, e.g. User.
   * @memberof Observer mixin
   */
  Model.evObserve = function evObserve(operation, listener) {
    if (!Model.isObserverApplied(operation, listener)) {
      log.debug(log.defaultContext(), 'Registering observer for model - ', Model.modelName);
      Model.observe(operation, listener);
    } else {
      log.debug(log.defaultContext(), 'Observer already registed for model - ', Model.modelName);
    }
  };


  /**
   * isObserverApplied is an recursive function, and it checks if any of the
   * parent model has observer attached, in case observer is attached it
   * returns true. otherwise returns false.
   *
   * @param {string}
   *                operation - operations such as before save, after save,
   *                before delete, after delete etc.
   * @param {function}
   *                listener - listener which need to be registered for a
   *                given operation.
   * @returns {boolean} - true if observer is applied
   * @memberof Observer mixin
   */
  Model.isObserverApplied = function isObserverApplied(operation, listener) {
    var isApplied = false;
    var observerList = Model._observers[operation];
    var fsObserverList;

    var isSameName = function isSameNameFn(e) {
      return e.name === listener.name;
    };

    if (Model._fsObservers) {
      fsObserverList = Model._fsObservers[operation];
    }
    if (observerList) {
      isApplied = observerList.indexOf(listener) !== -1 ? true : false;
      if (!isApplied) {
        isApplied = observerList.some(isSameName);
      }
    } else {
      isApplied = false;
    }

    if (!isApplied) {
      if (fsObserverList) {
        for (var x = 0; x < fsObserverList.observers.length; x++) {
          var observer = fsObserverList.observers[x];
          isApplied = (observer.getName() === listener.name) ? true : false;
          log.debug(log.defaultContext(), 'fs observer  ', observer.getName());
          if (isApplied) {
            break;
          }
        }
      }
    }

    if (isApplied) {
      return true;
    }
    var baseModel = Model.base;
    if (!baseModel.isObserverApplied) {
      return isApplied;
    }
    return baseModel.isObserverApplied(operation, listener);
  };
};
