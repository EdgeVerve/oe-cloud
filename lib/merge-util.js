/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * This Module provides the functionalty to merge objects.
 * The main functionality include loading various types of config files based on `env`
 * and `type` of config file and merge them based on type.
 *
 * @module Merge Utils
 * @author Ramesh Choudhary, Kishore
 */
/* eslint-disable no-console , no-undefined*/

var fs = require('fs');
var path = require('path');
// var debug = require('debug')('merge-util');
// var assert = require('assert');
var _ = require('lodash');
var logger = require('oe-logger');
var log = logger('merge-util');

var mergeFn = function mergeUtilCb(target, config, fileName) {
  var err = mergeObjects(target, config);
  if (err) {
    var error = new Error('Cannot apply ' + fileName + ': ' + err);
    error.retriable = false;
    throw error;
  }
};

var mergeDataSourcesObjects = function mergeDataSourcesObjects(target, config) {
  _.extend(target, config);
  // no error
  return null;
};

// copied functions to load datasources - tweaked to our purpose
var loadDataSources = function mergeUtilLoadDataSourcesFn(rootDir, env) {
  return loadNamed(rootDir, env, 'datasources', mergeDataSourcesObjects);
};


function loadNamed(rootDir, env, name, mergeFn) {
  var files = findConfigFiles(rootDir, env, name);
  if (files.length) {
    log.debug(log.defaultContext(), 'found %s %s files', env, name);
    files.forEach(function loadNamedFilesForEachFn(f) {
      log.debug(log.defaultContext(), '  %s', f);
    });
  }
  var configs = loadConfigFiles(files);
  var merged = mergeConfigurations(configs, mergeFn);

  log.debug(log.defaultContext(), 'merged %s %s configuration %j', env, name, merged);

  return merged;
}

function mergeConfigurations(configObjects, mergeFn) {
  var result = configObjects.shift() || {};
  while (configObjects.length) {
    var next = configObjects.shift();
    mergeFn(result, next, next._filename);
  }
  return result;
}

/**
 * Search `appRootDir` for all files containing configuration for `name`.
 * @param {String} appRootDir application root directory.
 * @param {String} env Environment, usually `process.env.NODE_ENV`.
 * @param {String} name name.
 * @returns {Array.<String>} Array of absolute file paths.
 */
function findConfigFiles(appRootDir, env, name) {
  var master = ifExists(name + '.json');
  if (!master && (ifExistsWithAnyExt(name + '.local') ||
    ifExistsWithAnyExt(name + '.' + env))) {
    console.warn('WARNING: Main config file "', name, '.json" is missing');
  }
  if (!master) {
    return [];
  }

  var candidates = [
    master,
    ifExistsWithAnyExt(name + '.local'),
    ifExistsWithAnyExt(name + '.' + env)
  ];

  return candidates.filter(function mergeUtilFindConfigFilesFilterCb(c) {
    return c !== undefined;
  });

  function ifExists(fileName) {
    var filepath = path.resolve(appRootDir, fileName);
    return fs.existsSync(filepath) ? filepath : undefined;
  }

  function ifExistsWithAnyExt(fileName) {
    return ifExists(fileName + '.js') || ifExists(fileName + '.json');
  }
}

/**
 * Load configuration files into an array of objects.
 * Attach non-enumerable `_filename` property to each object.
 * @param {Array.<String>} files list of files.
 * @returns {Array.<Object>} configuration.
 */
function loadConfigFiles(files) {
  return files.map(function mergeUtilLoadConfigFilesCb(f) {
    var config = require(f);
    Object.defineProperty(config, '_filename', {
      enumerable: false,
      value: f
    });
    return config;
  });
}

function mergeObjects(target, config, keyPrefix) {
  for (var key in config) {
    if (config.hasOwnProperty(key)) {
      var fullKey = keyPrefix ? keyPrefix + '.' + key : key;
      var err = mergeSingleItemOrProperty(target, config, key, fullKey);
      if (err) {
        return err;
      }
    }
  }
  // no error
  return null;
}

function mergeSingleItemOrProperty(target, config, key, fullKey) {
  var origValue = target[key];
  var newValue = config[key];

  if (!hasCompatibleType(origValue, newValue)) {
    return 'Cannot merge values of incompatible types for the option `' +
      fullKey + '`.';
  }

  if (Array.isArray(origValue)) {
    return mergeArrays(origValue, newValue, fullKey);
  }

  if (Array.isArray(newValue) && typeof origValue === 'object') {
    origValue = [target[key]];
    _.set(target, key, origValue);
    return mergeArrays(origValue, newValue, fullKey);
  }

  if (newValue !== null && typeof origValue === 'object') {
    return mergeObjects(origValue, newValue, fullKey);
  }

  target[key] = newValue;
  // no error
  return null;
}

function mergeArrays(target, config) {
  // if (target.length !== config.length) {
  // kishore : call only this for merge
  return mergeArraysDiffLength(target, config);
}

function mergeArraysDiffLength(target, config) {
  var newTarget = _.cloneDeep(target, true);
  var union;
  if (!Array.isArray(config)) {
    union = _.union([config], newTarget);
    Array.prototype.splice.apply(target, [0, target.length].concat(union));
  } else {
    // Union of both the target and config arrays.
    union = _.union(config, newTarget);
    // Modifies the target array with the union.
    Array.prototype.splice.apply(target, [0, target.length].concat(union));
  }
}

function hasCompatibleType(origValue, newValue) {
  if (origValue === null || origValue === undefined) {
    return true;
  }

  if (Array.isArray(origValue)) {
    return typeof newValue === 'object';
  }

  if (typeof origValue === 'object') {
    return typeof newValue === 'object';
  }

  // Note: typeof Array() is 'object' too,
  // we don't need to explicitly check array types
  return typeof newValue !== 'object';
}

function getModelFileName(name, fullFileName) {
  let folder = path.dirname(fullFileName);
  if (!fs.existsSync(folder)) {
    return;
  }
  let files = fs.readdirSync(folder);
  let realFileName = files.find(function (f) {
    return path.parse(f).name.replace('-', '').toLowerCase() === name.toLowerCase() && path.extname(f).toLowerCase() === '.json';
  });
  if (!realFileName) {
    return;
  }

  realFileName = path.resolve(folder, realFileName);
  return realFileName;
}


// Atul : this function scans all model collection and find out models which are customized
// load model JSON and merge model definitions
function mergeCustomizedModels(allModels, modelPathMap, options) {
  let customizedModels = Object.keys(allModels).filter(function (k) {
    return (allModels[k].customModel || allModels[k].customizedModel || allModels[k].isCustomized);
  });

  for (let i = 0; i < customizedModels.length; ++i) {
    let mergedModel = {};
    let name = customizedModels[i];
    let modelPaths = modelPathMap[name];
    let save = {};
    for (let j = 0, m = 0; j < modelPaths.length; ++j) {
      var s = modelPaths[j];

      var p = null;
      if ((s.charAt(0) >= 'a' && s.charAt(0) <= 'z') || (s.charAt(0) >= 'A' && s.charAt(0) <= 'Z')) {
        p = path.resolve(options.appRootDir, '../node_modules/' + s  + '/' + name);
      } else {
        p = path.resolve(options.appRootDir, s + '/' + name);
      }
      let fullFileName = p + '.json';
      var realFileName = getModelFileName(name, fullFileName);
      if (fs.existsSync(realFileName)) {
        log.debug(log.defaultContext, 'Merging ' + name, realFileName);
        var model = require(realFileName);
        var jsFile = realFileName.replace('.json', '.js');
        save[name + '_' + m.toString()] = { model: model, sourceFile: jsFile };
        ++m;
        _.merge(mergedModel, model);
      }
    }
    // var ary = Object.keys(save);
    // for(var m=1; m<ary.length; ++m){
    //   if(save[m]){
    //     save[m-1].name = 'x'.repeat(m) + 'Base' + name;
    //     save[m-1].plural = save[m-1].name + 's';
    //     save[m].base = save[m-1].name;
    //   }
    // }
    var funcs = [];
    let ary = Object.keys(save);
    for (let k = 0; k < ary.length; ++k) {
      if (save[ary[k]]) {_.merge(save[ary[k]].model, mergedModel);}
      if (save[ary[k]].sourceFile && fs.existsSync(save[ary[k]].sourceFile)) {
        funcs[k] = require(save[ary[k]].sourceFile);
      }
    }

    /* eslint-disable no-inner-declarations */
    function mergedJs(Model) {
      var functionArray = mergedJs.functionArray;
      for (var i = 0; i < functionArray.length; ++i) {
        functionArray[i](Model);
      }
    }
    mergedJs.functionArray = funcs;
    /* eslint-enable no-inner-declarations */

    // let mergedJs = function (Model) {
    //   for(var i=0; i < funcs.length; ++i){
    //     funcs[i](Model);
    //   }
    //   //funcs.forEach(f => f(Model));
    // };
    // mergedJs.funcs = funcs;

    for (let k in save) {
      if (save[k].sourceFile && fs.existsSync(save[k].sourceFile)) {
        require.cache[save[k].sourceFile].exports = mergedJs;
      }
    }
  }
}

var loadAppList = function loadAppList(applist, dir, bootoptions) {
  var path = require('path');
  var boot = require('loopback-boot');

  var options = bootoptions;
  options.appRootDir = dir;
  options.appConfigRootDir = dir;
  options.modelsRootDir = dir;
  options.dsRootDir = dir;
  options.mixinDirs = [];
  options.bootDirs = [];
  options.clientAppRootDir = '';
  options.skipConfigurePassport = false;


  var env = options.env || process.env.NODE_ENV || 'development';
  var allModels = {};
  var bootDirs = [];
  var allConfigs = {};
  var allDatasources = {};
  var allMiddlewares = {};
  var allComponents = {};
  var allProvidersJson = {};
  var modelPathMap = {};

  applist.forEach(function (appitem, appIndex) {
    if (appitem.enabled !== false) {
      var serverDir;
      var serverDir2;
      // var nodeModule = false;
      var isCurrentModule = false;
      if (appitem.path === './' || appitem.path === '.') {
        // Constructing the actual path, so that the server would not crash
        // if it run with absoulte path, Ex: node /home/evf/ev-foundation/server/server.js
        serverDir = './server';
        serverDir2 = './server';
        isCurrentModule = true;
        if (appitem.serverDir) {
          serverDir = appitem.serverDir;
          serverDir2 = appitem.serverDir;
        }
      } else {
        serverDir = '/server';
        serverDir2 = '/server';
        if (appitem.serverDir) {
          serverDir = appitem.serverDir;
          serverDir2 = appitem.serverDir;
        }
        serverDir = path.join('node_modules', appitem.path, serverDir);
      }
      var models = boot.ConfigLoader.loadModels(serverDir, env);
      // var evfPath = path.resolve("node_modules/ev-foundation/server");
      if (models._meta && models._meta.sources) {
        models._meta.sources.forEach(function (element, idx, arr) {
          // var abspath = path.resolve(path.join(serverDir, element));
          // var relpath = path.relative(evfPath, abspath);
          var p1;
          if (!isCurrentModule) {
            if (element.indexOf('../') === 0) {
              p1 = element.substr(3, element.length - 3);
              element = path.join(appitem.path, p1);
            } else if (element.indexOf('./') === 0) {
              p1 = element.substr(2, element.length - 2);
              element = path.join(appitem.path, p1);
            }
          }
          arr[idx] = element;
        });
      }
      if (models._meta && models._meta.mixins) {
        models._meta.mixins.forEach(function (element, idx, arr) {
          // var abspath = path.resolve(path.join(serverDir, element));
          // var relpath = path.relative(evfPath, abspath);
          var p1;
          if (!isCurrentModule) {
            if (element.indexOf('../') === 0) {
              p1 = element.substr(3, element.length - 3);
              element = path.join(appitem.path, p1);
            } else if (element.indexOf('./') === 0) {
              p1 = element.substr(2, element.length - 2);
              element = path.join(appitem.path, p1);
            }
          }
          arr[idx] = element;
        });
      }
      var config = boot.ConfigLoader.loadAppConfig(serverDir, env);
      var ds = loadDataSources(serverDir, env);
      var middlewares = boot.ConfigLoader.loadMiddleware(serverDir, env);
      var components = boot.ConfigLoader.loadComponents(serverDir, env);
      var modobj = {};
      Object.keys(middlewares).forEach(function (phase) {
        var mlist = middlewares[phase];
        if (Object.keys(mlist).length > 0) {
          modobj[phase] = {};
          Object.keys(mlist).forEach(function (key) {
            var newKey = key;
            if (!isCurrentModule || appitem.forceLoad) {
              if (key.startsWith('.') || key.startsWith('..')) {
                var abspath = path.resolve(path.join(serverDir, key));
                // var relpath = path.relative('./server', abspath);
                var relpath = path.relative(options.appRootDir, abspath);
                newKey = relpath;
              }
            } else if (key.startsWith('..')) {
              newKey = path.normalize(key);
            }
            modobj[phase][newKey] = mlist[key];
          });
        } else {
          modobj[phase] = {};
        }
      });
      bootDirs.push(path.join(appitem.path, '/' + serverDir2 + '/boot'));

      var a = Object.keys(models);
      a = a.filter(item => item.indexOf('_'));
      for (let i = 0; i < a.length; ++i) {
        if (modelPathMap[a[i]]) {
          if (models._meta.sources) {modelPathMap[a[i]] = modelPathMap[a[i]].concat(models._meta.sources);}
        } else {
          modelPathMap[a[i]] = models._meta.sources ? models._meta.sources.slice(0) : [];
        }
        modelPathMap[a[i]] = _.uniq(modelPathMap[a[i]]);
      }


      // var a1 = Object.keys(allModels);
      // var a2 = Object.keys(models);
      // var a = a1.filter(item => a2.includes(item));
      // a = a.filter(item => item.indexOf('_'));

      // if(a && a.length){
      //   for(let i=0; i < a.length; ++i){
      //     for(let j=0; j<allModels._meta.sources.length; ++j){
      //       let s = allModels._meta.sources[j];
      //       let p;
      //       if((s.charAt(0) >= 'a' && s.charAt(0) <= 'z') || (s.charAt(0) >= 'A' && s.charAt(0) <= 'Z')){
      //         p = path.resolve(options.appRootDir, '../node_modules/' + s  + '/' + a[i]);
      //       }
      //       else {
      //         p = path.resolve(options.appRootDir, s + '/' + a[i]);
      //       }
      //       if(fs.existsSync(p + '.json')){
      //         console.log(p + '.json');
      //       }
      //     }
      //     }
      //   }


      mergeFn(allModels, models);
      mergeFn(allConfigs, config);
      mergeDataSourcesObjects(allDatasources, ds);
      mergeFn(allMiddlewares, modobj);
      mergeFn(allComponents, components);
      var providerJsPath = path.resolve(serverDir, 'providers.' + env + '.js');
      var providerJsonPath = path.resolve(serverDir, 'providers.' + env + '.json');
      if (fs.existsSync(providerJsPath)) {
        allProvidersJson = require(providerJsPath);
        // var providerConfig = require(providerJsPath);
        // mergeFn(allProvidersJson, providerConfig);
      } else if (fs.existsSync(providerJsonPath)) {
        allProvidersJson = require(providerJsonPath);
        // var providerConfig = require(providerJsPath);
        // mergeFn(allProvidersJson, providerConfig);
      } else if (fs.existsSync(serverDir + '/providers.json')) {
        providerJsonPath = path.resolve(serverDir, 'providers.json');
        allProvidersJson = require(providerJsonPath);
      }
    }
  });

  mergeCustomizedModels(allModels, modelPathMap, options);

  options.bootDirs = bootDirs;
  options.config = allConfigs;
  options.middleware = allMiddlewares;
  options.models = allModels;
  options.dataSources = allDatasources;
  options.components = allComponents;
  options.providerJson = allProvidersJson;

  return options;
};

module.exports = {
  mergeFn: mergeFn,
  mergeDataSourcesObjects: mergeDataSourcesObjects,
  loadDataSources: loadDataSources,
  // loadAppLogConfig: loadAppLogConfig,
  // loadAppProviders: loadAppProviders,
  // loadFiles: loadFiles,
  // mergeMiddlewareConfig: mergeMiddlewareConfig,
  loadAppList: loadAppList
};
