/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var async = require('async');
var logger = require('oe-logger');
var log = logger('ui-manager');
var loopback = require('loopback');

/**
 * @classdesc This non-persisted model provides some utility end-points for ui-admin.
 * `generate` (/api/UIManager/generate/:modelname) method, generates a default nav-link, ui-route and ui-metadata to display model form.
 *
 * @kind class
 * @class UIManager
 * @author Rohit Khode
 */

module.exports = function UIManager(UIManager) {
  function _findAndCreate(modelDefn, filter, data, response, options, next) {
    log.debug(options, '_findAndCreate', modelDefn.definition.name, filter);

    modelDefn.find({
      where: filter
    }, options, function modelDefnFindCb(err, records) {
      if (err) {
        return next(err);
      }
      if (records && records.length > 0) {
        response.messages.push(modelDefn.definition.name + '-already-defined');
        return next();
      }
      modelDefn.create(data, options, function modelDefnCreateCb(err, data) {
        log.debug(options, 'Model Created', err, data);
        if (err) {
          response.errors = response.errors || [];
          response.errors.push(err);
          response.status = false;
          return next(response);
        }
        response.messages.push(modelDefn.definition.name + '-created');
        return next();
      });
    });
  }

  UIManager.generate = function UIManagerUiGen(modelname, req, options, cb) {
    var self = this;

    var app = self.app;

    if (!cb && typeof options === 'function') {
      cb = options;
      options = {};
    }

    if (!modelname) {
      cb({
        status: false,
        messages: ['missing-model-name']
      });
      return;
    }

    var modelDefn = loopback.findModel(modelname, options);
    if (modelDefn) {
      var newMetadata = {
        name: modelname,
        modelName: modelDefn.definition.name,
        fields: []
      };

      for (var pName in modelDefn.definition.rawProperties) {
        if (pName[0] !== '_' && pName !== 'id') {
          newMetadata.fields.push(pName);
        }
      }

      var navLinkData = {
        name: modelname,
        label: modelname,
        url: '/forms/' + modelname + '-form',
        topLevel: true,
        group: 'root'
      };

      var uiRouteData = {
        name: 'forms',
        path: '/forms/:formname',
        type: 'elem',
        import: '/api/UIComponents/component/:formname'
      };

      var response = {
        status: true,
        messages: []
      };
      async.series([
        function handleUIComponent(next) {
          _findAndCreate(app.models.UIComponent, {
            name: modelname
          }, newMetadata, response, options, next);
        },
        function handleNavigationLink(next) {
          _findAndCreate(app.models.NavigationLink, navLinkData, navLinkData, response, options, next);
        },
        function handleUIRoute(next) {
          _findAndCreate(app.models.UIRoute, uiRouteData, uiRouteData, response, options, next);
        }
      ], function callbackFn(err) {
        cb(err, response);
      });
    } else {
      cb({
        status: false,
        messages: ['invalid-model-name']
      });
    }
  };

  UIManager.remoteMethod('generate', {
    returns: [{
      type: 'object',
      root: true,
      description: 'return value'
    }],
    accepts: [{
      arg: 'modelname',
      type: 'string',
      http: {
        source: 'path'
      }
    },
    {
      arg: 'req',
      type: 'object',
      http: {
        source: 'req'
      }
    }],
    http: {
      path: '/generate/:modelname',
      verb: 'post'
    }
  });
};
