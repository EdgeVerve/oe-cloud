/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
// Setting /designer route.
// To install designer run bower install designer
// Path to designer should be /client/bower_components or /public/bower_components or /web/bower_components
// Or else the path to designer can be configured in configuration
// Or else the application itself can add a route for /designer with the location of index.html from designer directory.
/* eslint-disable no-console */
var loopback = require('loopback');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var util = require('../../lib/common/util');
var appconfig = require('../config');
var glob = require('glob');
var designerName = 'oe-studio';

function setDesignerPath(DesignerPath, server) {
  if (!appconfig.designer.templatePath || appconfig.designer.templatePath.length === 0) {
    appconfig.designer.templatePath = [DesignerPath + '/' + designerName + '/templates'];
  }
  if (!appconfig.designer.stylePath || appconfig.designer.stylePath.length === 0) {
    appconfig.designer.stylePath = [DesignerPath + '/' + designerName + '/styles'];
  }
  if (!appconfig.designer.assetPath || appconfig.designer.assetPath.length === 0) {
    appconfig.designer.assetPath = ['client/images'];
  }

  var templatesData = [];
  appconfig.designer.templatePath.forEach(function templatePathForEach(tPath) {
    ifDirectoryExist(tPath, function ifDirectoryExistFn(dirName, status) {
      if (status) {
        var templateFiles = fs.readdirSync(dirName);
        templateFiles.forEach(function templateFilesForEach(fileName) {
          var tplRecord = templatesData.find(function (item) {
            return item.file === fileName;
          });

          if (!tplRecord) {
            tplRecord = {
              file: fileName,
              path: dirName,
              content: fs.readFileSync(dirName + '/' + fileName, {
                encoding: 'utf-8'
              })
            };
            var regex = /Polymer\s*\(/;
            if (tplRecord.content && regex.test(tplRecord.content)) {
              if (tplRecord.content.indexOf(':modelAlias') >= 0) {
                tplRecord.type = 'form';
              } else {
                tplRecord.type = 'component';
              }
            } else {
              tplRecord.type = 'html';
            }
            templatesData.push(tplRecord);
          }
        });
      }
    });
  });
  module.templatesData = templatesData;

  var stylesData = [];
  appconfig.designer.stylePath.forEach(function stylePathForEach(sPath) {
    ifDirectoryExist(sPath, function ifDirectoryExistFn(dirName, status) {
      if (status) {
        var styleFiles = fs.readdirSync(dirName);
        styleFiles.forEach(function styleFilesForEach(fileName) {
          var styleRecord = {
            file: fileName,
            path: dirName
          };
          stylesData.push(styleRecord);
        });
      }
    });
  });
  module.stylesData = stylesData;

  var assetData = {
    images: [],
    videos: [],
    audios: []
  };

  var imageTypes = ['.JPG', '.JPEG', '.BMP', '.GIF', '.PNG', '.SVG'];
  var videoTypes = ['.MP4', '.MPEG', '.AVI', '.WMV', '.OGG', '.OGM', '.OGV', '.WEBM', '.3GP'];
  var audioTypes = ['.MP3', '.AAC', '.OGG', '.M4A'];
  appconfig.designer.assetPath.forEach(function assetPathForEach(aPath) {
    ifDirectoryExist(aPath, function ifDirectoryExist(dirName, status) {
      if (status) {
        var assetFiles = fs.readdirSync(dirName);
        assetFiles.forEach(function assetFilesForEach(fileName) {
          var stats = fs.statSync(path.join(dirName, fileName));
          if (stats.isFile()) {
            var assetRecord = {
              file: fileName,
              path: dirName,
              size: stats.size
            };
            var fileExtn = path.extname(fileName).toUpperCase();
            if (imageTypes.indexOf(fileExtn) >= 0) {
              assetData.images.push(assetRecord);
            } else if (videoTypes.indexOf(fileExtn) >= 0) {
              assetData.videos.push(assetRecord);
            } else if (audioTypes.indexOf(fileExtn) >= 0) {
              assetData.audios.push(assetRecord);
            }
          }
        });
      }
    });
  });
  module.assetData = assetData;

  var prospectElements = [];
  glob('client/**/*.html', function globFn(err, files) {
    if (!err && files && files.length > 0) {
      files.forEach(function filesForEach(file) {
        if (file.indexOf(designerName) < 0 && file.indexOf('/demo/') < 0 && file.indexOf('/test/') < 0) {
          fs.readFile(file, function read(err3, data) {
            var regexp = /<dom-module\s*id\s*=\s*["'](.*)["']\s*>/g;
            if (!err3) {
              var match = regexp.exec(data);
              if (match && match[1] && match[1] !== ':componentName') {
                prospectElements.push({
                  name: match[1],
                  tag: match[1],
                  icon: 'icons:polymer',
                  description: match[1],
                  content: '<' + match[1] + '></' + match[1] + '>',
                  category: 'polymerElements',
                  config: {
                    domType: 'Polymer',
                    attributes: [],
                    importUrl: file.substr(6),
                    type: 'droppable'
                  },
                  previewImg: ''
                });
              }
            }
          });
        }
      });
    }
  });
  module.prospectElements = prospectElements;


  // server.use(loopback.static(DesignerPath));
  server.get(appconfig.designer.mountPath, function sendResponse(req, res) {
    res.sendFile('index.html', {
      root: DesignerPath + '/' + designerName
    });
  });


  // get properties of model
  server.get(appconfig.designer.mountPath + '/properties/:model', function designerRoutes(req, res) {
    var model = req.params.model;
    var baseModel = util.checkModelWithPlural(req.app, model);
    var actualModel = loopback.findModel(baseModel, req.callContext);

    var r = {};
    for (var p in actualModel.definition.properties) {
      if (actualModel.definition.properties.hasOwnProperty(p)) {
        r[p] = Object.assign({}, actualModel.definition.properties[p]);
        r[p].type = (actualModel.definition.properties[p] && actualModel.definition.properties[p].type && actualModel.definition.properties[p].type.name) || 'object';
      }
    }
    return res.json(r);
  });


  server.get(appconfig.designer.mountPath + '/routes/:model', function designerRoutes(req, res) {
    var model = req.params.model;
    var remotes = server.remotes();
    var adapter = remotes.handler('rest').adapter;
    var routes = adapter.allRoutes();
    var classes = remotes.classes();
    routes = routes.map(function routesMapFn(route) {
      if (!route.documented) {
        return;
      }

      // Get the class definition matching this route.
      var className = route.method.split('.')[0];
      var classDef = classes.filter(function clasesFilter(item) {
        return item.name === className;
      })[0];

      if (!classDef) {
        console.error('Route exists with no class: %j', route);
        return;
      }
      var accepts = route.accepts || [];
      var split = route.method.split('.');
      /* HACK */
      if (classDef && classDef.sharedCtor &&
        classDef.sharedCtor.accepts && split.length > 2) {
        accepts = accepts.concat(classDef.sharedCtor.accepts);
      }

      // Filter out parameters that are generated from the incoming request,
      // or generated by functions that use those resources.
      accepts = accepts.filter(function acceptsFilter(arg) {
        if (!arg.http) {
          return true;
        }
        // Don't show derived arguments.
        if (typeof arg.http === 'function') {
          return false;
        }
        // Don't show arguments set to the incoming http request.
        // Please note that body needs to be shown, such as User.create().
        if (arg.http.source === 'req' ||
          arg.http.source === 'res' ||
          arg.http.source === 'context') {
          return false;
        }
        return true;
      });
      route.accepts = accepts;
      route.verb = convertVerb(route.verb);
      return {
        path: route.path,
        type: route.verb,
        description: route.description,
        accepts: route.accepts
      };
    });
    var modelEndPoints = _.groupBy(routes, function modelEndPoints(d) {
      return d.path.split('/')[1];
    });
    var baseModel = util.checkModelWithPlural(req.app, model);
    var actualModel = loopback.findModel(baseModel, req.callContext);
    var result = actualModel ? modelEndPoints[actualModel.pluralModelName] : modelEndPoints;
    res.send(result);
  });
  server.get('/designer.html', function sendDesignerHomePage(req, res) {
    res.redirect(appconfig.designer.mountPath);
  });

  server.get(appconfig.designer.mountPath + '/config', function designerConfig(req, res) {
    res.json(appconfig.designer);
  });

  server.get(appconfig.designer.mountPath + '/templates', function designerTemplates(req, res) {
    res.json(module.templatesData);
  });

  server.get(appconfig.designer.mountPath + '/styles', function designerStyles(req, res) {
    res.json(module.stylesData);
  });

  server.post(appconfig.designer.mountPath + '/save-theme', function saveTheme(req, res) {
    fs.writeFile('client/styles/app-theme.html', req.body.data, function writeFileCbFn(err) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.json({
          status: true
        });
      }
    });
  });

  server.post(appconfig.designer.mountPath + '/apply-theme', function saveTheme(req, res) {
    var content = fs.readFileSync(req.body.file, {
      encoding: 'utf-8'
    });
    fs.writeFile('client/styles/app-theme.html', content, function writeFileCbFn(err) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.json({
          status: true
        });
      }
    });
  });

  server.post(appconfig.designer.mountPath + '/save-file', function saveFile(req, res) {
    fs.writeFile(req.body.file, req.body.data, function writeFileCbFn(err) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.json({
          status: true
        });
      }
    });
  });

  server.get(appconfig.designer.mountPath + '/assets', function designerStyles(req, res) {
    res.json(module.assetData);
  });

  server.get(appconfig.designer.mountPath + '/assets/images', function designerStyles(req, res) {
    res.json(module.assetData.images);
  });

  server.get(appconfig.designer.mountPath + '/assets/videos', function designerStyles(req, res) {
    res.json(module.assetData.videos);
  });

  server.get(appconfig.designer.mountPath + '/assets/audios', function designerStyles(req, res) {
    res.json(module.assetData.audios);
  });

  server.get(appconfig.designer.mountPath + '/elements', function prospectElements(req, res) {
    res.json(module.prospectElements);
  });

  ifDirectoryExist(DesignerPath + '/' + designerName, function checkIfDirectoryExist(dirname, status) {
    if (status) {
      server.once('started', function DesignerServerStarted() {
        var baseUrl = server.get('url').replace(/\/$/, '');
        console.log('Browse Designer at %s%s', baseUrl, appconfig.designer.mountPath);
      });
    }
  });
}

function convertVerb(verb) {
  if (verb.toLowerCase() === 'all') {
    return 'POST';
  }

  if (verb.toLowerCase() === 'del') {
    return 'DELETE';
  }

  return verb.toUpperCase();
}

function ifDirectoryExist(dirname, cb) {
  fs.stat(dirname, function getDirectoryStats(err, stat) {
    var status = true;
    if (err) {
      status = false;
    }
    cb(dirname, status);
  });
}

module.exports = function Designer(server) {
  if (appconfig.enableDesigner) {
    var defaultConfig = {
      installationPath: 'client/bower_components',
      mountPath: '/designer',
      templatePath: [],
      stylePath: []
    };
    var modulesList = [{
      'name': 'oe-model-manager',
      'path': '',
      'import': '/bower_components/oe-model-manager/oe-model-manager.html'
    }, {
      'name': 'oe-ui-designer',
      'path': 'ui-designer',
      'import': '/bower_components/oe-ui-designer/oe-ui-designer.html'
    }, {
      'name': 'oe-route-manager',
      'path': 'route-manager',
      'import': '/bower_components/oe-route-manager/oe-route-manager.html'
    }, {
      'name': 'oe-resource-manager',
      'path': 'resource-manager',
      'import': '/bower_components/oe-resource-manager/oe-resource-manager.html'
    }, {
      'name': 'oe-rule-manager',
      'path': 'rule-manager',
      'import': '/bower_components/oe-rule-manager/oe-rule-manager.html'
    }, {
      'name': 'workflow-designer',
      'path': 'workflow-designer',
      'import': '/bower_components/oe-workflow-modeler/workflow-designer.html'
    }, {
      'name': 'oe-component-manager',
      'path': 'component-manager',
      'import': '/bower_components/oe-component-manager/oe-component-manager.html'
    }];

    var modules = appconfig.designer.modules || [];
    if (modules.length === 0) {
      appconfig.designer.modules = modulesList;
    }

    appconfig.designer.restApiRoot = appconfig.designer.restApiRoot || server.get('restApiRoot') || appconfig.restApiRoot;

    Object.assign(defaultConfig, appconfig.designer || {});
    appconfig.designer = defaultConfig;

    ifDirectoryExist(appconfig.designer.installationPath + '/' + designerName, function directorySearch(dirname, status) {
      if (status) {
        setDesignerPath(appconfig.designer.installationPath, server);
      } else {
        console.warn('Designer not installed at [' + appconfig.designer.installationPath + '/' + designerName + ']');
      }
    });
  }
};
