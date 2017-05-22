/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
* @classdesc This model stores the metadata of how to render a grid. i.e. what fields to render and in what order.
* The following fields are available in this class.
* <table>
* <tr>
* <th>Field</th>
* <th>Description</th>
* </tr>
* <tr>
* <td>gridIdentifier</td>
* <td>The name / identifier of the grid</td>
* </tr>
* <tr>
* <td>columnFields</td>
* <td>Array of GridColumnDefinition objects which defines the list of column data</td>
* </tr>
* <tr>
* <td>dialogMetaData</td>
* <td>The name of UIMetadata which is used for rendering the form for editing a row/ adding new row for the underlying object in grid</td>
* </tr>
* <tr>
* <td>dialogTemplateUrl</td>
* <td>The template file used for rendering the form for editing a row/ adding new row for the underlying object in grid</td>
* </tr>
* </table>
* @kind class
* @class GridMetaData
* @author RSR
*/

module.exports = function GridMetadataFn(GridMetaData) {
  var camelCaseToLabel = function gridMetadataCamelCaseToLabelFn(s) {
    return s.split(/(?=[A-Z])/).map(function gridMetadataCamelCaseToLabelMapFn(p) {
      return p.charAt(0).toUpperCase() + p.slice(1);
    }).join(' ');
  };


  var buildColDef = function buildGridColumDefinition(col, colName, visible) {
    col.field = colName;
    col.headerName = col.label || camelCaseToLabel(colName);
    col.uitype = col.uitype || col.type;
    if (col.uitype === 'number' && col.numericality === 'integer') {
      col.uitype = 'integer';
    }
    col.visible = typeof visible === 'undefined' ? true : visible;
    col.filter = (col.type === 'string' && col.format) ? col.format : col.type;
    delete col.type;
    return col;
  };

  var prepareData = function gridMetadataPrepareDataFn(self, data, options, cb) {
    var Field = self.app.models.Field;
    var fields = data.columnFields.map(function gridMetadataFieldsMapFn(field) {
      return field.key;
    });

    var filter = {
      where: {
        key: {
          inq: fields
        }
      }
    };
    Field.find(filter, options, function gridMetadataFieldFindCb(err, fieldData) {
      if (err) {
        cb(err, null);
      } else {
        var ret = {};
        ret.columnData = [];
        for (var i = 0; i < data.columnFields.length; i++) {
          var field = data.columnFields[i];
          for (var j = 0; j < fieldData.length; j++) {
            if (fieldData[j].key === field.key) {
              ret.columnData.push(buildColDef(fieldData[j], fieldData[j].fieldid || field.key, field.visible));
              break;
            }
          }
        }
        ret.dialogMetaData = data.dialogMetaData;
        ret.dialogTemplateUrl = data.dialogTemplateUrl;
        cb(null, ret);
      }
    });
  };

  /**
   * This function expands the grid metadata fields into the column properties
   * @function
   * @name render
   * @param {string} id - System internally searches for a record in GridMetaData with gridIdentifier with this name,
   *  if not found, system assumes it is name of model and expands the field of the model.
   * @memberof GridMetaData
   * @param  {object} req - request object
   * @param  {object} options - callcontext options
   * @param  {function} cb - callback function
   */
  GridMetaData.render = function gridMetadataRenderFn(id, req, options, cb) {
    var filter = {
      where: {
        gridIdentifier: id
      }
    };
    var self = this;

    if (!cb && typeof options === 'function') {
      cb = options;
      options = {};
    }

    GridMetaData.findOne(filter, options, function gridMetadataRenderFindCb(err, data) {
      if (err) {
        cb(err);
      }
      if (data) {
        prepareData(self, data, options, cb);
      } else {
        // assume id is possibly the model-name
        var modeltype = id;
        self.app.models.ModelDefinition.extractMeta(modeltype, options, function gridMetadataRenderExtractMetaCb(err, allModelsInfo) {
          if (err) {
            cb(err);
          }
          var modelInfo = allModelsInfo[modeltype];
          if (modelInfo) {
            data = {
              'gridIdentifier': modelInfo.id,
              'columnData': [],
              'dialogMetaData': modelInfo.id
            };

            var primitives = ['string', 'text', 'date', 'number', 'boolean'];
            var rawProperties = modelInfo.properties;

            for (var prop in rawProperties) {
              if (rawProperties.hasOwnProperty(prop)) {
                // for internal fields starting with underscore _ , do not show in grid
                if (prop.match(/^_|\._/) || prop.toLowerCase() === 'scope') {
                  continue;
                }
                var details = rawProperties[prop];
                if (primitives.indexOf(details.type) >= 0) {
                  data.columnData.push(buildColDef(details, prop));
                }
              }
            }

            cb(null, data);
          } else {
            cb({
              message: 'Grid ' + id + ' not found'
            }, null);
          }
        });
      }
    });
  };

  GridMetaData.remoteMethod(
    'render', {
      returns: [{
        type: 'object',
        root: true,
        description: 'return value'
      }],
      accepts: [{
        arg: 'id',
        type: 'string',
        http: {
          source: 'path'
        }
      }, {
        arg: 'req',
        type: 'object',
        http: {
          source: 'req'
        }
      }],
      http: {
        path: '/:id/render',
        verb: 'get'
      }
    }
  );
};
