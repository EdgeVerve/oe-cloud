/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var async = require('async');
var inflection = require('inflection');
var logger = require('../../../lib/logger');
var log = logger('uimetadata');

/**
* @classdesc This model stores the form definition data.
* The `render` API enriches the form metadata with model properties and property store
* and returns the final metadata definition that can be used by client code to render the form.
*
* Default rendering:
* 1. Property name is taken as field-id.
* 1. Property name like address or userName will have 'Address' and 'User Name' as label respectively.
* 1. Property type 'text' is rendered as uitype:'text'
* 1. If enumtype or reftype properties are also set, additional 'listdata' attribute is set which renders field as combo input.
* 1. Property type 'number' is rendered as uitype:'number'. When numericality is 'integer', uitype is also 'integer'.
* 1. Property type 'date' is rendered as uitype:'date'
* 1. Array of primitives is rendered as uitype:'tags'
* 1. Array of composite types is rendered as grid.
* 1. Default value specified on model properties, are sent under defaultVM object. Boolean type, when no default is specified, assume default:false.
* 1. `belongsTo` relationship results in uitype:typeahead. The typeahead, searches on related model's 'name' property by default.
* 1. `hasMany` relationship results in uitype:grid.
*
* Common recurring fields can also be specified in `Field` model. By default, record corresponding the propertyName is searched and
* all properties specified there are pulled in.
* UIMetadata's controls array can also have inline control attributes. The order of precedence is:
* * Inline control attribute
* * Field Property store
* * Default derived from Model definition
*
* Order of precedence however does not apply to validations where strictest of all is applied.
* A field marked as required in model definition, can not be overriden by setting required:false in control array of property store.
* Model max=1000 and control array max=2000 results in max=1000
* Model min=100 and control array min=200 results in min=200
*
* @kind class
* @class UIMetadata
* @author Rohit Khode
*/

module.exports = function UIMetadata(UIMetadata) {
  // Converts propertyNames to UI label (firstName -> First Name)
  function camelCaseToLabel(s) {
    // Make the first character uppercase before split/join.
    return (s.charAt(0).toUpperCase() + s.slice(1)).split(/(?=[A-Z])/).join(' ');
  }

  /**
   * Find max of 3 values
   * @param  {number} v1 - first value
   * @param  {number} v2 - second value
   * @param  {number} v3 - third value
   * @returns {number} - maximum of 3 values
   */
  function max(v1, v2, v3) {
    var ret = v1 ? v1 : (v2 ? v2 : v3);
    if (v1 && v2 && (v2 > v1)) {
      ret = v2;
    }
    if (v2 && v3 && (v3 > v2)) {
      ret = v3;
    }
    return ret;
  }

  /**
   * Find min of 3 values
   * @param  {number} v1 - first value
   * @param  {number} v2 - second value
   * @param  {number} v3 - third value
   * @returns {number} - minimum of 3 values
   */
  function min(v1, v2, v3) {
    var ret = v1 ? v1 : (v2 ? v2 : v3);
    if (v1 && v2 && (v2 < v1)) {
      ret = v2;
    }
    if (v2 && v3 && (v3 < v2)) {
      ret = v3;
    }
    return ret;
  }

  /**
   * Sets specified `value` on `target` going levels down if required.
   * o:{},
   * 	setValue(o, "x",5) -> o:{x:5}
   *		setValue(o, "y.z",6) -> o:{x:5,y:{z:6}}
   *		setValue(o, "y.k",7) -> o:{x:5,y:{z:6,k:7}}
   * @param  {object} target - target
   * @param  {string} field - field
   * @param  {any} value - value
   */
  function setValue(target, field, value) {
    if (field) {
      var fields = field.split('.');
      var leaf = fields.pop();

      var currentTarget = target;
      fields.forEach(function _forEachCb(field) {
        currentTarget[field] = currentTarget[field] || {};
        currentTarget = currentTarget[field];
      });
      currentTarget[leaf] = value;
    }
  }

  /**
   * Attempt to get a sane default rest-url for the returned metadata
   * TODO: We can pull hardcoded 'api/' part from configuration
   * @param {object} model - model constructor
   * @returns {string} - rest URL
   */
  function getRestUrl(model) {
    return 'api/' + (model.definition.settings.plural || inflection.pluralize(model.definition.name));
  }

  /**
   * Initialize appropriate defaults in the controls array.
   * 1) Control defined as simple string is translated into Object
   *    "string" -> {fieldid:"string", source:"string"}
   * 2) All "source" properties are cached under `propertyStoreKeys` for fetching from `Field` model.
   * 3) Current defined controls are also set on `modelMeta`. This object is later enriched with model-defined-properties.
   *    Setting defined controls on `modelMeta` here serves later in identifying what model properties are defined in controls already.
   * @param {array} controls - list of controls
   * @returns {object} - controls with defaults
   */
  function initializeAndExtractControls(controls) {
    var master = {
      // meta defn based on model properties
      modelMeta: {},
      // collect all relevant field-sources.
      propertyStoreKeys: {}
    };

    if (controls) {
      for (var fIdx = 0; fIdx < controls.length; fIdx++) {
        var fInfo = controls[fIdx];

        /* If control-defn is a simple string, make it an appropriate object */
        if (typeof fInfo === 'string') {
          controls[fIdx] = {
            container: 'others',
            fieldid: fInfo,
            source: fInfo
          };
          fInfo = controls[fIdx];
        }

        fInfo.container = fInfo.container || 'others';

        fInfo.source = fInfo.source || fInfo.fieldid;
        fInfo.name = fInfo.container + '_' + fInfo.fieldid + '_' + fIdx;

        master.modelMeta[fInfo.fieldid] = {};
        master.propertyStoreKeys[fInfo.source] = true;
      }
    }

    return master;
  }

  var prepareData = function uiMetadataPrepareData(app, data, options, cb) {
    // populate field metadata defined in controls.
    var fieldsMaster = initializeAndExtractControls(data.controls);

    if (data.modeltype) {
      var ModelDefn = app.models.ModelDefinition;

      /** Get details of specified model along with all the related models.
       * allModelsInfo will contain (this, related and embedded)-models and their definition all as key/value pair.
       */
      ModelDefn.extractMeta(data.modeltype, { flatten: true }, function extractMetaCb(err, flattenedModel) {
        if (err) {
          cb(err);
        }
        if (flattenedModel) {
          /** iterate over modelFields to
           *   1. add any missing field in controls
           *   2. setup model level defaults on `modelFields`
           */
          for (var fieldName in flattenedModel.properties) {
            if (flattenedModel.properties.hasOwnProperty(fieldName)) {
              /* Don't bother adding or enriching if it is private property (starts with _underscore) or excluded explicitly*/
              if (fieldName.match(/^_|\._/) ||
                (data.exclude && data.exclude.indexOf(fieldName) >= 0) ||
                (fieldName === 'scope' || fieldName.match(/\.scope$/))) {
                continue;
              }

              var modelField = flattenedModel.properties[fieldName];

              // console.log(fieldName, modelField);

              var isDefined = fieldsMaster.modelMeta[fieldName];

              if (!isDefined && !data.skipMissingProperties) {
                var fieldMeta = {
                  fieldid: fieldName,
                  source: fieldName,
                  name: 'others_' + fieldName.replace(/\./g, '_'),
                  container: 'others'
                };

                fieldsMaster.propertyStoreKeys[fieldName] = true;
                data.controls.push(fieldMeta);
              }

              /** populate Label and UIType in Model-Meta.
               *   We can not set on control-meta directly as the values may still come from Field Store,
               *   which overrides the model-calculated label and uitype.
               */
              var dotIdx = fieldName.lastIndexOf('.');
              var label = dotIdx > 0 ? fieldName.substr(dotIdx + 1) : fieldName;
              label = camelCaseToLabel(label);
              modelField.label = label;

              var uitype = modelField.type;
              if (uitype === 'string') {
                if (modelField.enumtype) {
                  var enumModel = app.loopback.findModel(modelField.enumtype);
                  if (enumModel) {
                    modelField.listdata = enumModel.settings.enumList;
                  }
                } else if (modelField.in) {
                  modelField.listdata = modelField.in;
                }

                if (uitype === 'string') {
                  uitype = 'text';
                }
              } else if (uitype === 'array') {
                if (modelField.itemtype === 'model') {
                  uitype = 'grid';
                  modelField.columndefs = [];
                  modelField.gridIdentifier = modelField.modeltype;
                } else {
                  // array of primitives of type 'itemtype'
                  uitype = 'tags';
                }
              } else if (uitype === 'number') {
                /* If numericality is set, use that as uitype (integer/number) */
                uitype = modelField.numericality ? modelField.numericality : uitype;
              }
              modelField.uitype = uitype;

              fieldsMaster.modelMeta[fieldName] = modelField;
            }
          }

          // Work Out Relations
          for (var relationName in flattenedModel.relations) {
            // ignore explicitly excluded relation fields
            if (!(data.exclude && data.exclude.indexOf(relationName) >= 0) && flattenedModel.relations.hasOwnProperty(relationName)) {
              var relation = flattenedModel.relations[relationName];
              if (relation.type === 'belongsTo') {
                modelField = fieldsMaster.modelMeta[relation.keyFrom];
                modelField.valueproperty = relation.keyTo;
                // assume 'name' ??
                modelField.displayproperty = 'name';
                modelField.uitype = 'typeahead';
                var restUrl = getRestUrl(relation.modelTo);
                modelField.searchurl = restUrl + '?filter[where][name][regexp]=/^SEARCH_STRING/i&filter[limit]=5';
                modelField.dataurl = restUrl + '/VALUE_STRING';
                modelField.label = camelCaseToLabel(relationName);
              } else if (relation.type === 'hasMany') {
                isDefined = fieldsMaster.modelMeta[relationName];

                // add the relation name in includes
                // so that on "GET", the related model will be fetched by default
                data.includes = data.includes ? data.includes + ',' + relationName : relationName;

                if (!isDefined && !data.skipMissingProperties) {
                  fieldMeta = {
                    fieldid: relationName,
                    source: fieldName,
                    name: 'others_' + relationName,
                    dialogmetadata: relation.modelTo.modelName
                  };

                  fieldsMaster.propertyStoreKeys[relationName] = true;
                  data.controls.push(fieldMeta);
                }

                modelField = {
                  uitype: 'grid',
                  fieldid: relationName,
                  gridIdentifier: relation.modelTo.modelName,
                  dialogmetadata: relation.modelTo.modelName,
                  label: camelCaseToLabel(relationName),
                  rowstatusreqd: true
                };
                fieldsMaster.modelMeta[relationName] = modelField;
              } else {
                // Unprocessed relation -  tasks hasMany TestEmployee id TestTask testEmployeeId
                log.debug(options, 'Unprocessed relation - ', relation.name,
                  relation.type, relation.modelFrom.definition.name,
                  relation.keyFrom, relation.modelTo.definition.name, relation.keyTo);
              }
            }
          }

          data.resturl = data.resturl || flattenedModel.resturl;
        }

        // Do not call getRestUrl since that needs model, and we need below restUrl when model is not available.
        data.resturl = data.resturl || '/api/' + inflection.pluralize(data.modeltype);
        data.title = data.title || data.modeltype;

        enrichFromPropertyStore(app, fieldsMaster, data, options, function uiMetadataPrepareDataEnrichCb(err, data) {
          if (err) {
            cb(err);
          }
          enrichGridPropertyStore(app, data, options, function uiMetadataPrepareDataGridEnrichCb(err, data1) {
            if (err) {
              cb(err);
            }
            getListDataForRefCode(app, data1, options, function uiMetadataPrepareDataRefCodeEnrichCb(err, data2) {
              if (err) {
                cb(err);
              }
              cb(err, data2);
            });
          });
        });
      });
    } else {
      enrichFromPropertyStore(app, fieldsMaster, data, options, function uiMetadataPrepareDataEnrich2Cb(err, data) {
        cb(err, data);
      });
    }
  };

  function enrichGridPropertyStore(app, data, options, cb) {
    var gridControls = data.controls.filter(function enrichGridPropertyStoreFilter(control) {
      return control.uitype === 'grid' && control.gridIdentifier;
    });

    for (var i = 0; i < data.controls.length; i++) {
      var control = data.controls[i];
      if (control.uitype === 'grid') {
        control.container = control.container || 'grid-container';
      }
    }

    async.forEachOf(gridControls, function enrichGridPropertyStoreAsyncCb(val, key, callback) {
      app.models.GridMetaData.render(val.gridIdentifier, null, options, function enrichGridPropertyStoreForEachGridRenderCb(err, resp) {
        if (err) {
          log.error(options, err);
        } else {
          val.columndefs = resp.columnData;
          resp.dialogTemplateUrl && (val.dialogtemplateurl = resp.dialogTemplateUrl);
          val.dialogmetadata = resp.dialogMetaData;

          delete val.gridIdentifier;
        }
        callback();
      });
    }, function enrichGridPropertyStoreAsyncFinalCb(err) {
      if (err) {
        log.error(options, err);
        cb(err, null);
      }

      cb(null, data);
    });
  }

  function getListDataForRefCode(app, data, options, cb) {
    var comboControls = data.controls.filter(function getListDataForRefCodeFilterCb(control) {
      return control.refcodetype;
    });

    async.forEachOf(comboControls, function getListDataForRefCodeAsyncCb(val, key, callback) {
      var refCodeModel = app.models[val.refcodetype];
      refCodeModel.find({}, options, function getListDataForRefCodeAsyncRefCodeFindCb(err, resp) {
        if (!err) {
          val.listdata = resp;
          val.displayproperty = 'description';
          val.valueproperty = 'code';
        }
        callback();
      });
    }, function getListDataForRefCodeAsyncFinalCb(err) {
      if (err) {
        log.error(options, err);
        cb(err, null);
      }

      cb(null, data);
    });
  }

  function enrichFromPropertyStore(app, fieldsMaster, data, options, cb) {
    app.models.Field.find({
      key: {
        inq: Object.keys(fieldsMaster.propertyStoreKeys)
      }
    }, options, function enrichFromPropertyStoreFindCb(err, results) {
      if (err) {
        cb(err);
      }
      var defaultVM = {};
      // all the Fields that we've found, lets enrich fieldsMaster.fields with it.
      var resultsObj = {};
      for (var rIdx = 0; results && rIdx < results.length; rIdx++) {
        var fieldMeta = results[rIdx];
        resultsObj[fieldMeta.key] = fieldMeta;
      }

      var textInputTypes = ['text', 'string', 'textarea'];
      for (var idx = 0; idx < data.controls.length; idx++) {
        var ctrlMeta = data.controls[idx];
        var metaSource = ctrlMeta.source || ctrlMeta.fieldid;

        var modelMeta = fieldsMaster.modelMeta[ctrlMeta.fieldid] || {};
        fieldMeta = resultsObj[metaSource] || {};

        // When datatype is boolean, we always set the default value.
        // If not defined, set it to 'false' explicitly.

        setValue(defaultVM, ctrlMeta.fieldid, (ctrlMeta.default || fieldMeta.default || (modelMeta.type === 'boolean' &&
          typeof modelMeta.default === 'undefined' ? false : modelMeta.default)));

        // no need to send default-value at control-metadata level.
        delete ctrlMeta.default;

        if (ctrlMeta.enumtype || fieldMeta.enumtype || modelMeta.enumtype) {
          var enumname = ctrlMeta.enumtype || fieldMeta.enumtype || modelMeta.enumtype;
          var enumModel = app.loopback.findModel(enumname);
          if (enumModel) {
            // enumtype is pointing to model
            ctrlMeta.listdata = enumModel.settings.enumList;
          } else {
            // enumtype is not pointing to model
            log.error(options, 'error finding enumtype ', enumname);
          }
        }

        if (ctrlMeta.refcodetype || fieldMeta.refcodetype || modelMeta.refcodetype) {
          var type = ctrlMeta.refcodetype || fieldMeta.refcodetype || modelMeta.refcodetype;
          var refCodeModel = app.models[type];
          if (refCodeModel) {
            // refcodetype is pointing to model
            ctrlMeta.refcodetype = type;
          } else {
            // refcodetype is not pointing to model
            log.error(options, 'error finding refcodetype');
          }
        }

        ctrlMeta.required = ctrlMeta.required || fieldMeta.required || modelMeta.required;
        ctrlMeta.uitype = ctrlMeta.uitype || fieldMeta.uitype || modelMeta.uitype;
        ctrlMeta.label = ctrlMeta.label || fieldMeta.label || modelMeta.label;
        ctrlMeta.listdata = ctrlMeta.listdata || fieldMeta.listdata || modelMeta.listdata;
        ctrlMeta.listid = ctrlMeta.listid || fieldMeta.listid;
        ctrlMeta.listurl = ctrlMeta.listurl || fieldMeta.listurl || modelMeta.listurl;
        ctrlMeta.bindto = ctrlMeta.bindto || fieldMeta.bindto;
        ctrlMeta.class = ctrlMeta.class || fieldMeta.class;
        ctrlMeta.hidden = ctrlMeta.hidden || fieldMeta.hidden;

        ctrlMeta.pattern = ctrlMeta.pattern || fieldMeta.pattern || modelMeta.pattern;

        if (textInputTypes.indexOf(ctrlMeta.uitype) >= 0) {
          ctrlMeta.maxlength = min(ctrlMeta.max || ctrlMeta.maxlength, fieldMeta.max || fieldMeta.maxlength, modelMeta.max);
          ctrlMeta.minlength = max(ctrlMeta.min || ctrlMeta.minlength, fieldMeta.min || fieldMeta.minlength, modelMeta.min);
          ctrlMeta.max = null;
          ctrlMeta.min = null;
        } else {
          ctrlMeta.max = min(ctrlMeta.max, fieldMeta.max, modelMeta.max);
          ctrlMeta.min = max(ctrlMeta.min, fieldMeta.min, modelMeta.min);
          ctrlMeta.maxlength = null;
          ctrlMeta.minlength = null;
        }

        ctrlMeta.gridIdentifier = ctrlMeta.gridIdentifier || fieldMeta.gridIdentifier || modelMeta.gridIdentifier;
        ctrlMeta.columndefs = ctrlMeta.columndefs || fieldMeta.columndefs || modelMeta.columndefs;
        ctrlMeta.itemtype = ctrlMeta.itemtype || fieldMeta.itemtype || modelMeta.itemtype;

        ctrlMeta.displayproperty = ctrlMeta.displayproperty || fieldMeta.displayproperty || modelMeta.displayproperty;
        ctrlMeta.valueproperty = ctrlMeta.valueproperty || fieldMeta.valueproperty || modelMeta.valueproperty;
        ctrlMeta.selectionBinding = ctrlMeta.selectionBinding || fieldMeta.selectionBinding || modelMeta.selectionBinding;
        ctrlMeta.searchurl = ctrlMeta.searchurl || fieldMeta.searchurl || modelMeta.searchurl;
        ctrlMeta.dataurl = ctrlMeta.dataurl || fieldMeta.dataurl || modelMeta.dataurl;
        ctrlMeta.dialogmetadata = ctrlMeta.dialogmetadata || fieldMeta.dialogmetadata || modelMeta.dialogmetadata;
        ctrlMeta.rowstatusreqd = ctrlMeta.rowstatusreqd || fieldMeta.rowstatusreqd || modelMeta.rowstatusreqd;
      }
      data.defaultVM = defaultVM;

      cb(null, data);
    });
  }

  /**
   * Custom remote method finds the `UIMetadata` with specified `code`, enriches the control definitions with
   * (a) Field store
   * (b) Model Definition
   * If UIMetadata is not found, it assumes `code` to be the Model Name and builds default for this model (enriching from Field store)
   * Control specifications in UIMetadata take precedence over those specified in Field Store
   * Field store specifications take precedence over those derived from Model properties.
   *  Precedence rule do not apply to validations, where strictest of all rule is applied.
   *  Control as required=false will still return required:true if Model definition mandates it.
   * @param  {string} code - code of uimetadata entry
   * @param  {object} req - request
   * @param  {object} options - callcontext options
   * @param  {function} cb - callback function
   */
  UIMetadata.render = function uiMetadataRender(code, req, options, cb) {
    var self = this;

    var filter = {
      where: {
        'code': code
      }
    };

    if (!cb && typeof options === 'function') {
      cb = options;
      options = {};
    }

    UIMetadata.findOne(filter, options, function uiMetadataRenderFindCb(err, data) {
      if (err) {
        cb(err);
      }
      if (!data) {
        data = {
          code: code,
          modeltype: code,
          description: 'default ' + code,
          controls: []
        };
      }
      prepareData(self.app, data, options, cb);
    });
  };

  UIMetadata.remoteMethod(
    'render', {
      returns: [{
        type: 'object',
        root: true,
        description: 'return value'
      }],
      accepts: [{
        arg: 'code',
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
        path: '/:code/render',
        verb: 'get'
      }
    }
  );
};
