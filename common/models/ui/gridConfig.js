/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
* @classdesc This Model is used to store Grid config used by ev-data-table
* <table>
* <tr>
* <th>Field</th>
* <th>Description</th>
* </tr>
* <tr>
* <td>code</td>
* <td>Unique field using which a GridConfig entry is fetched </td>
* </tr>
* <tr>
* <td>label</td>
* <td>Label for the ev-data-table shown in the header of the grid</td>
* </tr>
* <tr>
* <td>editorFormUrl</td>
* <td>URL of the page to show when a row is added/edited. </td>
* </tr>
* <tr>
* <td>columns</td>
* <td> Array of column definitions to show in the table. </td>
* </tr>
* </table>
* @kind class
* @class GridConfig
* @author Sasivarnan R
*/

module.exports = function gridConfig(GridConfig) {
  var camelCaseToLabel = function gridConfigCamelCaseToLabelFn(s) {
    return s.split(/(?=[A-Z])/).map(function gridConfigCamelCaseToLabelMapFn(p) {
      return p.charAt(0).toUpperCase() + p.slice(1);
    }).join(' ');
  };

  GridConfig.config = function config(configCode, options, cb) {
    var app = this.app;
    var filter;

    if (!cb && typeof options === 'function') {
      cb = options;
      options = {};
    }

    if (!configCode) {
      return cb({
        status: false,
        messages: ['missing-model-name']
      });
    }

    filter = {
      where: {
        code: configCode
      }
    };

    GridConfig.findOne(filter, options, function findAndBuildGridConfigCb(err, data) {
      if (err) {
        return cb(err);
      }

      if (data) {
        data.label = data.label || camelCaseToLabel(configCode);
        return cb(null, data);
      }

      app.models.ModelDefinition.extractMeta(configCode, options, function modelExtractMetaCb(err, allModelsInfo) {
        if (err) {
          return cb(err);
        }

        var model = allModelsInfo[configCode];

        if (!model) {
          return cb({
            status: false,
            messages: ['missing-model-definition']
          });
        }

        var properties = model.properties;
        var config = {};
        var columns = [];

        Object.keys(properties).forEach(function prepareColumnsArray(prop) {
          if (prop.charAt(0) !== '_' && prop.toLowerCase().indexOf('scope') === -1 && prop !== 'id') {
            var property = properties[prop];
            var col = {
              key: prop,
              label: camelCaseToLabel(prop),
              type: property.type
            };
            columns.push(col);
          }
        });

        config.code = configCode;
        config.columns = columns;
        config.label = camelCaseToLabel(configCode);
        config.editorFormUrl = '/api/UIComponents/component/' + configCode.toLowerCase() + '-form.html';
        cb(null, config);
      });
    });
  };

  GridConfig.remoteMethod('config', {
    description: 'Returns GridConfig of',
    accessType: 'READ',
    accepts: [{
      arg: 'configCode',
      type: 'string',
      description: 'config code',
      required: true,
      http: {
        source: 'path'
      }
    }],
    http: {
      verb: 'GET',
      path: '/config/:configCode'
    },
    returns: {
      type: 'object',
      root: true
    }
  });
};
