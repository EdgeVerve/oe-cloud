/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var modelPersonalizer = require('../../../lib/model-personalizer');
var async = require('async');
var logger = require('../../../lib/logger');
var log = logger('ui-manager');
var inflection = require('inflection');

/**
* @classdesc This non-persisted model provides some utility end-points for ui-admin.
* `uigen` (/api/UIManager/:modelname/uigen) method, generates a default nav-link, ui-route and ui-metadata to display model form.
*
* @kind class
* @class UIMetadata
* @author Rohit Khode
*/

module.exports = function UIManager(UIManager) {
  /**
   * Attempt to get a sane default rest-url for the returned metadata
   * TODO: We can pull hardcoded 'api/' part from configuration
   * @param {object} model - model constructor
   * @returns {string} - rest URL
   */
  function _getRestUrl(model) {
    return 'api/' + (model.definition.settings.plural || inflection.pluralize(model.definition.name));
  }

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

  UIManager.uiGen = function UIManagerUiGen(modelname, req, options, cb) {
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

    modelPersonalizer(modelname, options, function uiMetadataPrepareDataPersonalizerCb(personalizedModelName) {
      if (!personalizedModelName) {
        personalizedModelName = modelname;
      }

      var modelDefn = app.models[personalizedModelName];
      if (!modelDefn) {
        modelDefn = app.models[modelname];
        personalizedModelName = modelname;
      }

      if (modelDefn) {
        var newMetadata = {
          code: modelname,
          description: modelname,
          modeltype: modelname,
          resturl: _getRestUrl(modelDefn),
          controls: [{
            container: 'searchbar',
            uitype: 'typeahead',
            displayproperty: 'name',
            valueproperty: 'id',
            selectionBinding: 'vm',
            searchUrl: _getRestUrl(modelDefn) + '?filter[where][name][regexp]=/^SEARCH_STRING/i&filter[limit]=10'
          }],
          skipMissingProperties: false,
          showTitleInNavbar: false,
          functions: {},
          behaviors: [],
          properties: {},
          exclude: [],
          oeValidations: []
        };

        for (var pName in modelDefn.definition.rawProperties) {
          if (pName[0] !== '_' && pName !== 'id') {
            newMetadata.controls.push({
              fieldid: pName
            });
          }
        }

        var navLinkData = {
          name: modelname,
          label: modelname,
          url: '/forms/' + modelname,
          topLevel: true,
          group: 'root'
        };

        var uiResourceData = {
          name: 'formtemplate',
          type: 'text/html',
          content: '<style> .layout-2-1 > * { width: calc(50.00% - 16px); padding-left: 8px; padding-right: 8px; } @media(max-width:600px) { .layout-2-1 > * { width: calc(100.00% - 16px); } } .title { padding: 10px 16px; } </style> <div class=\"title flex horizontal layout center justified\"> <div class=\"title flex\">{{metadata.title}}</div> <div> <div ev-container=\"searchbar\"></div> <paper-icon-button icon=\"save\" ev-action=\"save\"></paper-icon-button> <paper-icon-button icon=\"delete\" ev-action=\"delete\"></paper-icon-button> </div> </div> <div class=\"card-content\"> <ev-hbox class=\"layout-2-1\" ev-container=\"others\"> </ev-hbox> </div>'
        };

        var uiRouteData = {
          name: 'forms',
          type: 'meta',
          import: uiResourceData.name,
          path: '/forms/:formname'
        };

        var response = {
          status: true,
          messages: []
        };
        async.series([
          function handleUIMetadata(next) {
            _findAndCreate(app.models.UIMetadata, {
              code: modelname
            }, newMetadata, response, options, next);
          },
          function handleNavigationLink(next) {
            _findAndCreate(app.models.NavigationLink, navLinkData, navLinkData, response, options, next);
          },
          function handleUIRoute(next) {
            _findAndCreate(app.models.UIRoute, uiRouteData, uiRouteData, response, options, next);
          },
          function handleUIResource(next) {
            _findAndCreate(app.models.UIResource, { name: uiResourceData.name }, uiResourceData, response, options, next);
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
    });
  };

  UIManager.remoteMethod('uiGen', {
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
      path: '/:modelname/uigen',
      verb: 'post'
    }
  });
};
