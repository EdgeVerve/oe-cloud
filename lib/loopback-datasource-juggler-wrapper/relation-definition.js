/**
 *
 * �2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
const utils = require('loopback-datasource-juggler/lib/utils');
var idEquals = utils.idEquals;
const HasOne = require('loopback-datasource-juggler/lib/relation-definition').HasOne;
const EmbedsOne = require('loopback-datasource-juggler/lib/relation-definition').EmbedsOne;

const ModelBaseClass = require('loopback-datasource-juggler/lib/model.js');
const g = require('strong-globalize')();

/* eslint-disable no-undefined */

// Atul : Functions from relation-definition.js are overloaded. These functions are overriden so that
// this.fetch() call, options can be passed. HasOne.prototype.update and destroy() overriden
// default loopback-datasource-juggler doesn't pass options and hence it would crash

function preventFkOverride(inst, data, fkProp) {
  if (!fkProp) return undefined;
  if (data[fkProp] !== undefined && !idEquals(data[fkProp], inst[fkProp])) {
    var err = new Error(g.f(
      'Cannot override foreign key %s from %s to %s',
      fkProp,
      inst[fkProp],
      data[fkProp]
    ));
  }
  return err;
}


HasOne.prototype.update = function (targetModelData, options, cb) {
  if (typeof options === 'function' && cb === undefined) {
    // customer.profile.update(data, cb)
    cb = options;
    options = {};
  }
  cb = cb || utils.createPromiseCallback();
  var definition = this.definition;
  var fk = this.definition.keyTo;
  // eslint-disable-next-line handle-callback-err
  this.fetch(null, options, function (err, targetModel) {
    if (targetModel instanceof ModelBaseClass) {
      // Ensures Foreign Key cannot be changed!
      var fkErr = preventFkOverride(targetModel, targetModelData, fk);
      if (fkErr) return cb(fkErr);
      targetModel.updateAttributes(targetModelData, options, cb);
    } else {
      cb(new Error(g.f('{{HasOne}} relation %s is empty', definition.name)));
    }
  });
  return cb.promise;
};

HasOne.prototype.destroy = function (options, cb) {
  if (typeof options === 'function' && cb === undefined) {
    // customer.profile.destroy(cb)
    cb = options;
    options = {};
  }
  cb = cb || utils.createPromiseCallback();
  var definition = this.definition;
  // eslint-disable-next-line handle-callback-err
  this.fetch(null, options, function (err, targetModel) {
    if (targetModel instanceof ModelBaseClass) {
      targetModel.destroy(options, cb);
    } else {
      cb(new Error(g.f('{{HasOne}} relation %s is empty', definition.name)));
    }
  });
  return cb.promise;
};

// Atul : this is overriden to ensure that options are passed for 'save' function
/* istanbul ignore next */
EmbedsOne.prototype.update = function (targetModelData, options, cb) {
  if (typeof options === 'function' && cb === undefined) {
    // order.customer.update(data, cb)
    cb = options;
    options = {};
  }

  const modelTo = this.definition.modelTo;
  const modelInstance = this.modelInstance;
  const propertyName = this.definition.keyFrom;

  const isInst = targetModelData instanceof ModelBaseClass;
  const data = isInst ? targetModelData.toObject() : targetModelData;

  const embeddedInstance = this.embeddedValue();
  if (embeddedInstance instanceof modelTo) {
    cb = cb || utils.createPromiseCallback();
    const hookState = {};
    let context = {
      Model: modelTo,
      currentInstance: embeddedInstance,
      data: data,
      options: options || {},
      hookState: hookState
    };
    modelTo.notifyObserversOf('before save', context, function (err) {
      if (err) return cb(err);

      embeddedInstance.setAttributes(context.data);

      // TODO support async validations
      if (!embeddedInstance.isValid()) {
        return cb(new Error(embeddedInstance));
      }

      modelInstance.save(options, function (err, inst) {
        if (err) return cb(err);

        context = {
          Model: modelTo,
          instance: inst ? inst[propertyName] : embeddedInstance,
          options: options || {},
          hookState: hookState
        };
        modelTo.notifyObserversOf('after save', context, function (err) {
          cb(err, context.instance);
        });
      });
    });
  } else if (!embeddedInstance && cb) {
    return this.callScopeMethod('create', data, cb);
  } else if (!embeddedInstance) {
    return this.callScopeMethod('build', data);
  }
  return cb.promise;
};
