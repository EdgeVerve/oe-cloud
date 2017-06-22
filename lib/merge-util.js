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
var assert = require('assert');
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

var loadLogConfig = function mergeUtilLoadLogConfigFn(rootDir, env) {
  return loadNamed(rootDir, env, 'log-config', mergeFn);
};

var loadAppLogConfig = function loadAppLogConfigFn(applist) {
  var env = process.env.NODE_ENV || 'local';
  var allLogConfigs = {};

  applist.forEach(function (appitem, appIndex) {
    if (appitem.enabled !== false) {
      var serverDir;
      // var nodeModule = false;
      // var isCurrentModule = false;
      if (appitem.path === './' || appitem.path === '.') {
        serverDir = './server';
        // isCurrentModule = true;
      } else {
        serverDir = path.join('node_modules', appitem.path, '/server');
      }

      var logConfig = loadLogConfig(serverDir, env);
      mergeFn(allLogConfigs, logConfig);
    }
  });

  return allLogConfigs;
};

var loadAppProviders = function loadAppProvidersFn(applist) {
  var env = process.env.NODE_ENV || 'local';
  var allProvidersJSON = {};

  if (applist.length > 0) {
    var appIndex = applist.length - 1;
    var appitem = applist[appIndex];
    if (appitem.enabled !== false) {
      var serverDir;
      // var nodeModule = false;
      // var isCurrentModule = false;
      if (appitem.path === './' || appitem.path === '.') {
        // Constructing the actual path, so that the server would not crash
        // if it run with absoulte path, Ex: node /home/evf/ev-foundation/server/server.js
        serverDir = path.join(__dirname, '..', 'server');
        // isCurrentModule = true;
      } else {
        serverDir = path.join('node_modules', appitem.path, '/server');
      }

      var providerEnvJsPath = path.resolve(serverDir, 'providers.' + env + '.js');
      var providerEnvJsonPath = path.resolve(serverDir, 'providers.' + env + '.json');
      if (fs.existsSync(providerEnvJsPath)) {
        allProvidersJSON = require(providerEnvJsPath);
        // var providerConfig = require(providerJsPath);
        // mergeFn(allProvidersJson, providerConfig);
      } else if (fs.existsSync(providerEnvJsonPath)) {
        allProvidersJSON = require(providerEnvJsonPath);
        // var providerConfig = require(providerJsPath);
        // mergeFn(allProvidersJson, providerConfig);
      } else {
        var providerJsonPath = path.resolve(serverDir, 'providers.json');
        allProvidersJSON = require(providerJsonPath);
      }
    }
  }

  // applist.forEach(function(appitem, appIndex) {
  //     if (appitem.enabled !== false) {
  //         var serverDir;
  //         //var nodeModule = false;
  //         var isCurrentModule = false;
  //         if (appitem.path === './' || appitem.path === '.') {
  //             serverDir = './server';
  //             isCurrentModule = true;
  //         } else {
  //             serverDir = path.join('node_modules', appitem.path, '/server');
  //         }

  //         var providerJsPath = path.resolve(serverDir, 'providers.' + env + '.js');
  //         var providerJsonPath = path.resolve(serverDir, 'providers.' + env + '.json');
  //         if (fs.existsSync(providerJsPath)) {
  //             allProvidersJSON = require(providerJsPath);
  //             //var providerConfig = require(providerJsPath);
  //             //mergeFn(allProvidersJson, providerConfig);
  //         } else if (fs.existsSync(providerJsonPath)) {
  //             allProvidersJSON = require(providerJsonPath);
  //             //var providerConfig = require(providerJsPath);
  //             //mergeFn(allProvidersJson, providerConfig);
  //         } else {
  //             providerJsonPath = path.resolve(serverDir, 'providers.json');
  //             allProvidersJSON = require(providerJsonPath);
  //         }
  //     }
  // });

  return allProvidersJSON;
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
 * Load file configuration.
 * @param {String} rootDir Directory where to look for files.
 * @param {String} env Environment, usually `process.env.NODE_ENV`.
 * @param {String} name name.
 * @returns {array.<String>} list of config files.
 */
var loadFiles = function loadFiles(rootDir, env, name) {
  var files = findConfigFiles(rootDir, env, name);
  if (files.length) {
    log.debug(log.defaultContext(), 'found %s %s files', env, name);
    files.forEach(function mergeUtilLoadFilesForEachCb(f) {
      log.debug(log.defaultContext(), '  %s', f);
    });
  }
  return loadConfigFiles(files);
};

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

var mergeMiddlewareConfig = function mergeMiddlewareConfig(target, config, fileName) {
  var err;
  for (var phase in config) {
    if (config.hasOwnProperty(phase)) {
      if (phase in target) {
        err = mergePhaseConfig(target[phase], config[phase], phase);
      } else {
        err = 'The phase "' + phase + '" is not defined in the main config.';
      }
      if (err) {
        var error = new Error('Cannot apply ' + fileName + ': ' + err);
        error.retriable = false;
        throw error;
      }
    }
  }
};

function mergeNamedItems(arr1, arr2, key) {
  assert(Array.isArray(arr1), 'invalid array: ' + arr1);
  assert(Array.isArray(arr2), 'invalid array: ' + arr2);
  key = key || 'name';
  var result = [].concat(arr1);
  for (var i = 0, n = arr2.length; i < n; i++) {
    var item = arr2[i];
    var found = false;
    if (item[key]) {
      for (var j = 0, k = result.length; j < k; j++) {
        if (result[j][key] === item[key]) {
          mergeObjects(result[j], item);
          found = true;
          break;
        }
      }
    }
    if (!found) {
      result.push(item);
    }
  }
  return result;
}

function mergePhaseConfig(target, config, phase) {
  var err;
  var targetMiddleware;
  var configMiddleware;
  for (var mw in config) {
    if (config.hasOwnProperty(mw)) {
      if (mw in target) {
        targetMiddleware = target[mw];
        configMiddleware = config[mw];
        if (Array.isArray(targetMiddleware) && Array.isArray(configMiddleware)) {
          // Both are arrays, combine them
          target[mw] = mergeNamedItems(targetMiddleware, configMiddleware);
        } else if (Array.isArray(targetMiddleware)) {
          if (typeof configMiddleware === 'object' &&
                        Object.keys(configMiddleware).length) {
            // Config side is an non-empty object
            target[mw] = mergeNamedItems(targetMiddleware, [configMiddleware]);
          }
        } else if (Array.isArray(configMiddleware)) {
          if (typeof targetMiddleware === 'object' &&
                        Object.keys(targetMiddleware).length) {
            // Target side is an non-empty object
            target[mw] = mergeNamedItems([targetMiddleware], configMiddleware);
          } else {
            // Target side is empty
            target[mw] = configMiddleware;
          }
        } else {
          err = mergeObjects(targetMiddleware, configMiddleware);
        }
      } else {
        // entry is not in target.
        targetMiddleware = {};
        targetMiddleware[mw] = {};
        configMiddleware = config[mw];
        if (Array.isArray(configMiddleware)) {
          if (typeof targetMiddleware === 'object' &&
                        Object.keys(targetMiddleware).length) {
            // Target side is an non-empty object
            target[mw] = mergeNamedItems([targetMiddleware], configMiddleware);
          } else {
            // Target side is empty
            target[mw] = configMiddleware;
          }
        } else {
          target[mw] = configMiddleware;
        }
        // err = 'The middleware "' + mw + '" in phase "' + phase + '"' +
        //     'is not defined in the main config.';
      }
      if (err) {
        return err;
      }
    }
  }
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
  // }

  // Use for(;;) to iterate over undefined items, for(in) would skip them.
  // for (var ix = 0; ix < target.length; ix++) {
  //     var fullKey = keyPrefix + '[' + ix + ']';
  //     var err = mergeSingleItemOrProperty(target, config, ix, fullKey);
  //     if (err) {
  //         return err;
  //     }
  // }

  // return null; // no error
}

function mergeArraysDiffLength(target, config) {
  var newTarget = _.cloneDeep(target, true);
  // Union of both the target and config arrays.
  var union = _.union(newTarget, config);
  // Modifies the target array with the union.
  Array.prototype.splice.apply(target, [0, target.length].concat(union));
}

function hasCompatibleType(origValue, newValue) {
  if (origValue === null || origValue === undefined) {
    return true;
  }

  if (Array.isArray(origValue)) {
    return Array.isArray(newValue);
  }

  if (typeof origValue === 'object') {
    return typeof newValue === 'object';
  }

  // Note: typeof Array() is 'object' too,
  // we don't need to explicitly check array types
  return typeof newValue !== 'object';
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

  applist.forEach(function (appitem, appIndex) {
    if (appitem.enabled !== false) {
      var serverDir;
      // var nodeModule = false;
      var isCurrentModule = false;
      if (appitem.path === './' || appitem.path === '.') {
        serverDir = './server';
        isCurrentModule = true;
      } else {
        serverDir = path.join('node_modules', appitem.path, '/server');
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
            if (!isCurrentModule) {
              if (key.startsWith('.') || key.startsWith('..')) {
                var abspath = path.resolve(path.join(serverDir, key));
                var relpath = path.relative('./server', abspath);
                newKey = relpath;
              }
            }
            modobj[phase][newKey] = mlist[key];
          });
        }
      });
      bootDirs.push(path.join(appitem.path, '/server/boot'));
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
      } else {
        providerJsonPath = path.resolve(serverDir, 'providers.json');
        allProvidersJson = require(providerJsonPath);
      }
    }
  });
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
  loadAppLogConfig: loadAppLogConfig,
  loadAppProviders: loadAppProviders,
  loadFiles: loadFiles,
  mergeMiddlewareConfig: mergeMiddlewareConfig,
  loadAppList: loadAppList
};
