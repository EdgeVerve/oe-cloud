/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var loopback = require('loopback');
var log = require('oe-logger')('model-discovery-filter');
var util = require('../../lib/common/util');
/**
 * Model Discovery Filter
 *
 * @name Model Discovery Filter
 * @memberof Middleware
 */

module.exports = function ModelDiscoveryFilter(options) {
  return function modelDiscoveryFilterReturnCb(req, resp, next) {
    var app = req.app;
    var url = req.originalUrl;

    log.debug(req.callContext, 'url = ', req.url);

    var invokedPlural = url.split('/')[2].split('?')[0];
    var savedName = invokedPlural;
    var baseModel = util.checkModelWithPlural(app, invokedPlural);
    var model = loopback.findModel(baseModel, req.callContext);
    if (model) {
      req.url = req.url.replace(savedName, model.pluralModelName);
      req.originalUrl = req.originalUrl.replace(savedName, model.pluralModelName);
    }
    return next();
  };
};
