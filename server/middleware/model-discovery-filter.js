/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
// var loopback = require('loopback');
// var debug = require('debug')('model-discovery-filter');
// var lwspace = require('loopback-workspace');
// var _ = require('lodash');
// var modelPersonalizer = require('../../lib/model-personalizer');
var util = require('../../lib/common/util');
var log = require('../../lib/logger')('model-discovery-filter');

/**
 * Model Discovery Filter
 *
 * @name Model Discovery Filter
 * @memberof Middleware
 */

module.exports = function ModelDiscoveryFilter(options) {
  return function modelDiscoveryFilterReturnCb(req, resp, next) {
    var app = req.app;
    var url = req.url;

    log.debug(req.callContext, 'url = ', req.url);

    var restApiRoot = app.get('restApiRoot');
    if (req.url.indexOf(restApiRoot) !== 0) {
      log.debug(req.callContext, 'url = ', req.url, ' ---- skipping model discovery');
      return next();
    }

    var invokedPlural = url.split('/')[2].split('?')[0];
    var savedName = invokedPlural;

    // var ModelDefinition = lwspace.models['ModelDefinition'];
    var ModelDefinition = app.models.ModelDefinition;

    var baseModel = util.checkModelWithPlural(req.app, invokedPlural);
    ModelDefinition.findOne({
      where: {
        variantOf: baseModel
      }
    }, req.callContext, function modelDiscoveryFilterModelDefinitionFindOneCb(err, instance) {
      if (err || !instance) {
        return next();
      }
      req.url = req.url.replace(savedName, instance.plural);

      return next();
    });
  };
};
