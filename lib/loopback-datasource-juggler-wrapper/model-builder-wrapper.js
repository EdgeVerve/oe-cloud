/**
 *
 * �2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
// this file overrides define() of model builder class. This is because oe-cloud adds custom types as email and datetime
// to support these types, it is overriden.
var loopback = require('loopback');
var modelBuilderClass = loopback.registry.modelBuilder.constructor;

var _define = modelBuilderClass.prototype.define;
/* eslint-disable no-loop-func */
modelBuilderClass.prototype.define = function defineClass(className, properties, settings, parent) {
  if (properties && this.customTypes) {
    // set common attributes of custom type in model properties
    for (var p in properties) {
      if (!properties.hasOwnProperty(p)) { continue; }
      var prop = properties[p];
      if (prop.type && typeof prop.type === 'string'
        && this.customTypes[prop.type.toLowerCase()]) {
        var customSettings = this.customTypes[prop.type.toLowerCase()];
        Object.keys(customSettings).forEach(function (key) {
          if (!prop[key]) {
            prop[key] = customSettings[key];
          }
        });
        prop.evtype = prop.type.toLowerCase();
        prop.type = customSettings.type;
      }
    }
  }
  var ModelClass = _define.call(this, className, properties, settings, parent);
  var _extend = ModelClass.extend;
  ModelClass.extend = function (className, subclassProperties, subclassSettings) {
    var ownDefinition = Object.assign({}, subclassSettings);
    ownDefinition.name = className;
    ownDefinition.properties = Object.assign({}, subclassProperties);
    var subClass = _extend.call(this, className, subclassProperties, subclassSettings);
    subClass._ownDefinition = ownDefinition;
    return subClass;
  };
  return ModelClass;
};
/* eslint-enable no-loop-func */

var _defineProperty = modelBuilderClass.prototype.defineProperty;
modelBuilderClass.prototype.defineProperty = function (model, propertyName, propertyDefinition) {
  if (this.customTypes && propertyDefinition.type && typeof propertyDefinition.type === 'string' && this.customTypes[propertyDefinition.type.toLowerCase()]) {
    var customSettings = this.customTypes[propertyDefinition.type.toLowerCase()];
    Object.keys(customSettings).forEach(function (key) {
      if (!propertyDefinition[key]) {
        propertyDefinition[key] = customSettings[key];
      }
    });
    propertyDefinition.evtype = propertyDefinition.type;
    propertyDefinition.type = this.customTypes[propertyDefinition.type].type;
  }
  return _defineProperty.call(this, model, propertyName, propertyDefinition);
};

modelBuilderClass.prototype.registerCustomType = function (customType, type, options) {
  var obj = { type: type };
  obj = Object.assign(obj, options);
  if (!this.customTypes) {
    this.customTypes = {};
  }
  this.customTypes[customType.toLowerCase()] = obj;
};


