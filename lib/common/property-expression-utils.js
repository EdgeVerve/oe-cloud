/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 *
 *
 * @module EV Property expression utils
 */

var logger = require('../logger');
var log = logger('property-expression-utils');
module.exports = {
  propertyExpressions: propertyExpressions
};


function propertyExpressions(model) {
  var propertyExpressionsArr = [];
  var properties = model.definition.properties;
  log.debug(log.defaultContext(), 'in property experssion util:', model.definition.name);
  Object.keys(properties).forEach(function propertiesForEachCb(propertyName) {
    Object.keys(properties[propertyName]).forEach(function propertyNameForEachCb(key) {
      // check if model property has key propExpression and add to array for mixin evaluation
      if (key === 'propExpression') {
        propertyExpressionsArr.push({
          propExpression: properties[propertyName].propExpression,
          name: propertyName
        });
      }
    });
  });
  return propertyExpressionsArr;
}
