/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries.
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/
/**
 *
 * @classdesc This Model is used by Meta Polymer
 * to inject Element attributes in a Polymer Component
 * @kind class
 * @class UIElement
 * @author Praveen Kumar Gulati
 */
var async = require('async');
var logger = require('evf-logger');
var log = logger('UIComponent');
var loopback = require('loopback');
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var appconfig = require('../../../server/config');

module.exports = function (UIComponent) {
  function loadTemplate(template, app, options, callback) {
    app.models.AppConfig.findOne({}, options, function AppConfigFindOneCb(err, data) {
      var templatesDir;
      if (!err && data && data.server && data.server.templateDir) {
        templatesDir = data.server.templatesDir;
      } else {
        templatesDir = '../client/templates';
      }

      var templatePath = path.join(app.locals.apphome, templatesDir, template);
      fs.readFile(templatePath, function read(err, data) {
        if (err) {
          templatesDir = '../client/bower_components/evf-designer/templates';
          templatePath = path.join(app.locals.apphome, templatesDir, template);
          fs.readFile(templatePath, function read(err1, data1) {
            if (err1) {
              glob(app.locals.apphome + '/../**/' + template, function (err2, files) {
                if (!err2 && files && files.length > 0) {
                  templatePath = files[0];
                  fs.readFile(templatePath, function read(err3, data2) {
                      if (err3) {
                        callback(err3, '');
                      } else {
                        callback(err3, data2.toString());
                      }
                    });
                } else {
                  var error = new Error();
                  error.message = 'Template ' + template + ' not found';
                  error.code = 'TEMPLATE_TYPE_MISSING';
                  error.statusCode = 422;
                  callback(error, '');
                }
              });
            } else {
              callback(err1, data1.toString());
            }
          });
        } else {
          callback(err, data.toString());
        }
      });
    });
  }

  function mergeAsHTML(html, response, callback) {
    if (appconfig.removeComponentImports) {
            /* Remove all the <link rel="import" ...> lines */
      html = html.split('\n').filter(function (line) {
        return !line.match(/link.*rel="import"/i);
      }).join('\n');
    }

    var out = '<script> var EV = window.EV || {}; EV.metadataCache = EV.metadataCache || {}; \n ';
    out += 'EV.metadataCache["' + response.componentName + '"] = ';
    out += JSON.stringify(response);
    out += '; </script>\n';
    out += html;
    callback(null, out);
  }

  function _getElements(componentName, response, options, done) {
    var UIElement = loopback.getModel('UIElement');
    var elementsWhere = {
      where: {
        component: componentName
      }
    };
    var elements = {};
    UIElement.find(elementsWhere, options, function (err, dbelements) {
      dbelements.forEach(function (e) {
        var elementData = {
          label: e.label,
          textContent: e.textContent
        };
        e.attributes && e.attributes.forEach(function (att) {
          elementData[att.name] = att.value;
        });
        elements[e.field] = elementData;
      });
      done(err, elements);
    });
  }

  function defaultComponent(model, templateType) {
    var templateName = 'default-' + templateType + '.html';
    var name = model.modelName.toLowerCase() + '-' + templateType;
    var rec = {
      name: name,
      modelName: model.modelName,
      templateName: templateName
    };
    if (templateType === 'list') {
      rec.autoInjectFields = false;
      rec.gridConfig = {};
      rec.gridConfig.modelGrid = [];
      Object.keys(model.definition.rawProperties).forEach(function (key) {
        if (key.required) {
          rec.gridConfig.modelGrid.push(key);
        }
      });

      if (rec.gridConfig.modelGrid.length < 4) {
        Object.keys(model.definition.rawProperties).forEach(function (key) {
          if (key.startsWith('_') || key === 'scope' || key === 'id') {
            return;
          }
          if (rec.gridConfig.modelGrid.length < 5) {
            rec.gridConfig.modelGrid.push(key);
          }
        });
      }
    }
    return rec;
  }

  UIComponent.prototype.generateComponent = function (fetchAsHtml, options, callback) {
    var component = this;
    var componentName = component.name;
    var tasks = [];
    var response = {
      componentName: componentName,
      elements: {},
      fields: {}
    };

    var html = '';

    tasks.push(function (done) {
      _getElements(componentName, response, options, function (err, elements) {
        response.elements = elements;
        done(err);
      });
    });

    response.modelName = component.modelName || '';
    response.modelAlias = component.modelAlias || (component.modelName ? component.modelName.toLowerCase() : 'vm');
    response.fields = component.fields;

    if (fetchAsHtml && component.content) {
      response.content = component.content.replace(/<\/script>/g, '<\\/script>');
    }

    response.metadata = {};
    response.autoInjectFields = component.autoInjectFields;
    response.excludeFields = component.excludeFields;
    response.options = component.options;
    response.polymerConfig = component.polymerConfig;
    response.gridConfig = component.gridConfig;
    response.evValidations = component.evValidations;

    if (fetchAsHtml) {
      if (component.filePath) {
        tasks.push(function (done) {
          var fp = path.join(UIComponent.app.locals.apphome, component.filePath);
          fs.readFile(fp, function read(err, data) {
            if (!err) {
              html = data.toString();
            }
            done(err);
          });
        });
      } else if (component.templateName && component.modelName) {
        tasks.push(function (done) {
          var modelAlias = component.modelAlias || (component.modelName ? component.modelName.toLowerCase() : 'vm');
          loadTemplate(component.templateName, UIComponent.app, options, function (err, template) {
            html = replacePlaceHolders(UIComponent.app, componentName, modelAlias, template);
            done(err);
          });
        });
      } else if (component.templateName) {
        tasks.push(function (done) {
          loadTemplate(component.templateName, UIComponent.app, options, function (err, template) {
            html = template.replace(/:componentName/g, componentName);
            done(err);
          });
        });
      } else {
        html = response.content;
        response.content = '';
      }
    }

    if (component.modelName) {
      tasks.push(function (done) {
        var metaconfig = {};
        UIComponent._modelmeta(component.modelName, metaconfig, options, function (err, meta) {
          response.metadata = meta.metadata;
          done();
        });
      });
    }

    async.parallel(tasks, function (err, results) {
      if (err) {
        callback(err, undefined);
      } else if (fetchAsHtml) {
        mergeAsHTML(html, response, callback);
      } else {
        callback(null, response);
      }
    });
  };

    // name can have .html component name without
    // componentName without .
  UIComponent._createResponse = function (fetchAsHtml, name, options, callback) {
    var dotIndex = name.lastIndexOf('.') || name.length;
    var componentName = dotIndex === -1 ? name : name.substring(0, dotIndex);
    var where = {
      where: {
        name: componentName
      }
    };


        // prefer find and results[0] over findOne
        // to make sure data personalization is applied correctly.
    UIComponent.find(where, options, function (err, results) {
      if (err) {
        log.error(options, 'Error ', err);
        return callback(err, null);
      }

      var component;
      if (results) {
        component = results[0];
      }
      if (!component) {
        if (fetchAsHtml) {
          var modelAndType = componentName.split('-'); // ex: literal-form   Model = modelAndType[0] Type = modelAndType[1]
          var modelName = UIComponent.app.locals.modelNames[modelAndType[0]];
          var templateType = modelAndType[1];
          if (modelName && templateType) {
            var model = UIComponent.app.models[modelName];
            component = defaultComponent(model, templateType);
                        // add autoInjectFields = true to render the form if templateType is form.
            if (templateType === 'form' && component && !component.autoInjectFields) {
              component.autoInjectFields = true;
            }
            component = UIComponent(component);
          } else {
            var error = new Error();
            if (!modelName) {
              error.message = 'Model Not Found';
              error.code = 'MODEL_NOT_FOUND';
              error.statusCode = 404;
            } else if (!templateType) {
              error.message = 'Tempalte type is undefined';
              error.code = 'TEMPLATE_TYPE_UNDEFINED';
              error.statusCode = 422;
            } else {
              error.message = 'Unknown template type ' + modelAndType[1] + ', should be form or list';
              error.code = 'TEMPLATE_TYPE_UNKNOWN';
              error.statusCode = 422;
            }
            error.retriable = false;
            return callback(error, null);
          }
        } else {
          var response = {
            componentName: componentName,
            elements: {},
            fields: {}
          };
          _getElements(componentName, response, options, function (err, elements) {
            response.elements = elements;
            callback(null, response);
          });
          return;
        }
      }

      component.generateComponent(fetchAsHtml, options, callback);
    });
  };

    // name can be in model name in lower case also
  UIComponent._modelmeta = function meta(name, metaoptions, options, callback) {
    if (callback === undefined && options === undefined && typeof metaoptions === 'function') {
      callback = metaoptions;
      options = {};
      metaoptions = {};
    } else if (callback === undefined && typeof options === 'function') {
      callback = options;
      options = {};
    }

    var modelName = UIComponent.app.locals.modelNames[name] || name;
    metaoptions = metaoptions || {};
    var app = this.app;
    var response = {};
    response.modelName = modelName;
    response.metadata = {};
    options.flatten = metaoptions.flatten === undefined ? false : metaoptions.flatten;
    options.dependencies = metaoptions.dependencies === undefined ? true : options.dependencies;
    options.skipSystemFields = true;
    var model;
    app.models.ModelDefinition.extractMeta(modelName, options, function (err, allmodels) {
      response.metadata = {};
      response.metadata.models = {};
      var metadata = response.metadata;
      var props;

      if (options.flatten) {
        metadata.resturl = allmodels.resturl;
        metadata.models[modelName] = {};
        metadata.models[modelName].resturl = allmodels.resturl;
        props = allmodels.properties || {};
        model = allmodels;
      } else {
        Object.keys(allmodels).forEach(function (key) {
          metadata.models[key] = {};
          var refmodel = metadata.models[key];
          refmodel.resturl = allmodels[key].resturl;
          refmodel.properties = allmodels[key].properties;
                    // TODO we can copy more properties here
        });
        model = allmodels[modelName] || {};
        props = model.properties || {};
        metadata.resturl = model.resturl;
                // allmodels will not be sent by uicomponent/component
        response.allmodels = allmodels;
      }

      var subtasks = [];

      Object.keys(props).forEach(function (fieldId) {
        var field = props[fieldId];
        field.type = field.type || 'string';
        if (field.enumtype || field.refcodetype) {
          field.type = 'combo';
          field.displayproperty = 'description';
          field.valueproperty = 'code';
        } else if (field.in) {
          field.type = 'combo';
          field.listdata = field.in;
        } else if (field.type === 'array') {
          if (field.itemtype === 'model') {
            field.type = 'grid';
            if (field.modeltype !== modelName && allmodels[field.modeltype]) {
              field.subModelMeta = allmodels[field.modeltype].properties;
            }
          } else {
            field.type = 'tags';
          }
        }
        if (field.refcodetype) {
          subtasks.push(function (fetched) {
            var refCodeModel = UIComponent.app.models[field.refcodetype];
            refCodeModel.find({}, options, function (err, resp) {
              if (!err) {
                field.listdata = resp;
                field.displayproperty = 'description';
                field.valueproperty = 'code';
              }
              fetched(err);
            });
          });
        }
      });

      var relations = model.relations || {};
      Object.keys(relations).forEach(function (relationName) {
        var relation = relations[relationName];
        var modelTo = allmodels[relation.modelTo.modelName] || {};
        var fieldId = relation.keyFrom;
        var fmeta;
                // by default hasMany will not be grid
                // however we will support sending meta data
                // if it is one of the fields in gridConfig
        if (relation.type === 'belongsTo') {
          props[fieldId] = props[fieldId] || {};
          fmeta = props[fieldId];
                    // unable to get additional properties added in model for relation
                    // so, add specific model logic instead.
          if (modelTo.id === 'DocumentData') {
            fmeta.type = 'documentdata';
            fmeta.relationName = relation.name;
          } else {
            fmeta.type = 'typeahead';
            fmeta.valueproperty = relation.keyTo;
            fmeta.displayproperty = 'name'; // assume 'name' ??
            fmeta.resturl = modelTo.resturl;
            fmeta.searchurl = fmeta.resturl + '?filter[where][name][regexp]=/^SEARCH_STRING/i&filter[limit]=5';
            fmeta.dataurl = fmeta.resturl + '/VALUE_STRING';
          }
        } else if (relation.type === 'embedsMany') {
          props[fieldId] = props[fieldId] || {};
          fmeta = props[fieldId];
          fmeta.type = 'grid';
          fmeta.subModelMeta = modelTo.properties;
          fmeta.modeltype = modelTo.id;
        }
      });

      response.metadata.properties = props;

      async.parallel(subtasks, function (err, results) {
        callback(null, response);
      });
    });
  };

  function replacePlaceHolders(app, componentName, modelAlias, template) {
    template = template.replace(/:modelAlias/g, modelAlias);
    var modelName = app.locals.modelNames[modelAlias] || modelAlias;
    var modelObj = app.models[modelName] || {};
    var pluralName = modelObj.pluralModelName || modelName + 's';
    template = template.replace(/:componentName/g, componentName);
    template = template.replace(/:modelName/g, modelName);
    template = template.replace(/:modelAlias/g, modelAlias);
    template = template.replace(/:plural/g, pluralName);
    return template;
  }

  UIComponent.component = function (name, options, callback) {
    var fetchAsHtml = true;
    UIComponent._createResponse(fetchAsHtml, name, options, callback);
  };

  UIComponent.modelmeta = function (name, options, callback) {
    var fetchAsHtml = false;
    UIComponent._createResponse(fetchAsHtml, name, options, callback);
  };

  UIComponent.simulate = function (data, options, callback) {
    var component = new UIComponent(data);
    var fetchAsHtml = true;
    component.generateComponent(fetchAsHtml, options, callback);
  };

  UIComponent.configure = function (modelList, options, callback) {
    if (callback === undefined && typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (!Array.isArray(modelList)) {
      modelList = [];
    }

    var temp = {};
    if (modelList.length > 0 && modelList[0] === '*') {
      modelList = [];
      Object.keys(UIComponent.app.models).forEach(function (modelName) {
        temp[modelName.toLowerCase()] = modelName;
      });
      Object.keys(temp).forEach(function (modelName) {
        modelList.push(modelName);
      });
    }

    var createComponent = function (model, templateType, options, callback) {
      var templateName = 'default-' + templateType + '.html';
      var name = model.modelName.toLowerCase() + '-' + templateType;
      var rec = {
        name: name,
        modelName: model.modelName,
        templateName: templateName
      };
      if (templateType === 'list') {
        rec.autoInjectFields = false;
        rec.gridConfig = {};
        rec.gridConfig.modelGrid = [];
        Object.keys(model.definition.rawProperties).forEach(function (key) {
          if (key.required) {
            rec.gridConfig.modelGrid.push(key);
          }
        });

        if (rec.gridConfig.modelGrid.length < 4) {
          Object.keys(model.definition.rawProperties).forEach(function (key) {
            if (key.startsWith('_') || key === 'scope' || key === 'id') {
              return;
            }
            if (rec.gridConfig.modelGrid.length < 5) {
              rec.gridConfig.modelGrid.push(key);
            }
          });
        }
      }
      UIComponent.create(rec, options, function (err, component) {
        if (err) log.error(options, 'error creating ui component ', name, JSON.stringify(err));
        callback(err, component);
      });
    };

    var tasks = [];
    modelList.forEach(function (modelName) {
      modelName = UIComponent.app.locals.modelNames[modelName] || modelName;
      var model = UIComponent.app.models[modelName];
      if (model && model.shared) {
        var templates = ['form', 'list'];
        templates.forEach(function (templateType) {
          tasks.push(function (done) {
            var componentName = modelName.toLowerCase() + '-' + templateType;
            var filter = {
              where: {
                name: componentName
              }
            };
                        // prefer find and results[0] over findOne
                        // to make sure data personalization is applied correctly.
            UIComponent.find(filter, options, function (err, results) {
              if (results && results[0]) {
                done(null, results[0]);
              } else {
                createComponent(model, templateType, options, done);
              }
            });
          });
        });
      }
    });

    async.series(tasks, function (err, results) {
      callback(null, results);
    });
  };

  UIComponent.remoteMethod('configure', {
    description: 'Configures Default UI for given list of model names',
    accessType: 'WRITE',
    accepts: [{
      arg: 'modelList',
      type: 'Object',
      description: 'list of model names',
      required: true,
      http: {
        source: 'query'
      }
    }],
    http: {
      verb: 'POST',
      path: '/configure'
    },
    returns: {
      type: 'object',
      root: true
    }
  });

  UIComponent.remoteMethod('simulate', {
    description: 'returns an polymer html from given data',
    accessType: 'READ',
    accepts: {
      arg: 'data',
      type: 'object',
      description: 'Model instance data',
      http: {
        source: 'body'
      }
    },
    http: {
      verb: 'post',
      path: '/simulate'
    },
    returns: [
      {
        arg: 'body',
        type: 'string',
        root: true
      },
      {
        arg: 'Content-Type',
        type: 'string',
        http: {
          target: 'header'
        }
      }
    ]
  });


  UIComponent.remoteMethod('modelmeta', {
    description: 'Returns Model Meta Data',
    accessType: 'READ',
    accepts: [{
      arg: 'modelName',
      type: 'string',
      description: 'model name',
      required: true,
      http: {
        source: 'path'
      }
    }],
    http: {
      verb: 'GET',
      path: '/modelmeta/:modelName'
    },
    returns: {
      type: 'object',
      root: true
    }
  });

  UIComponent.remoteMethod('component', {
    description: 'Returns UI component and additional data..',
    accessType: 'READ',
    accepts: [{
      arg: 'name',
      type: 'string',
      description: 'name',
      required: true,
      http: {
        source: 'path'
      }
    }],
    http: {
      verb: 'GET',
      path: '/component/:name'
    },
    returns: [
      {
        arg: 'body',
        type: 'string',
        root: true
      },
      {
        arg: 'Content-Type',
        type: 'string',
        http: {
          target: 'header'
        }
      }
    ]
  });


  UIComponent.afterRemote('ui', function (context, remoteMethodOutput, next) {
    context.res.setHeader('Content-Type', 'text/plain');
    context.res.end(context.result);
  });

  UIComponent.afterRemote('component', function (context, remoteMethodOutput, next) {
    context.res.setHeader('Content-Type', 'text/html');
    context.res.end(context.result);
  });

  UIComponent.afterRemote('simulate', function (context, remoteMethodOutput, next) {
    context.res.setHeader('Content-Type', 'text/html');
    context.res.end(context.result);
  });

    // TODO handle route path and nav link add update / delete
    // UIComponent.observe('after save', function(ctx, next){
    //	if (ctx.instance) {
    // var NavigationLink = loopback.getModelByType('NavigationLink');
    //	}
    //	next();
    // });
};
