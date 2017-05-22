/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
* EV Model Personalizer
*
* @module EV Model Personalizer
*
*/

var loopback = require('loopback');

// used by gridmetadat and uimeta data to get personalized model
module.exports = function getModelVariant(modelName, options, callback) {
  var ModelDefinition = loopback.findModel('ModelDefinition');

  ModelDefinition.findOne({ where: { variantOf: modelName } }, options, function modelDiscoveryFilterModelDefinitionFindOneCb(err, instance) {
    if (err || !instance) {
      return callback(null);
    }
    return callback(instance.name);
  });
};
