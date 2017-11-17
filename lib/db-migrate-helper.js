/**
 *
 * �2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/* eslint-disable no-console , no-process-exit*/

var fs = require('fs');
var util = require('./common/util');
var path = require('path');
var async = require('async');
var semver = require('semver');
var process = require('process');
var _ = require('lodash');
var loopback = require('loopback');
var log = require('oe-logger')('db-migrate-helper');

var appVersion;
var curAppName;
var curDbVer;
var curSysVerData;
var printMigrationCompleteMessage;
var runAsPartofTestCase;

module.exports = function dbMigrationHelperFn(appinstance, option, isTestCases, cb) {
  if (typeof isTestCases === 'function') {
    // Checking 3rd parameter passed is callback function.
    cb = isTestCases;
    runAsPartofTestCase = isTestCases = false;
  } else {
    runAsPartofTestCase = isTestCases;
  }
  var mode = util.getMode(appinstance);
  switch (mode) {
    case 'NONE':
      cb();
      break;
    case 'AUTOUPDATE':
      doAutoUpdate(appinstance, option, cb);
      break;
    case 'WAIT':
      waitForMigrationToComplete(appinstance, option, cb);
      break;
    case 'DOMIGRATE':
      doAutoUpdate(appinstance, option, function (updateErr) {
        if (updateErr) {
          log.error(log.defaultContext, 'doAutoUpdate Error : ', JSON.stringify(updateErr));
          cb(updateErr);
        } else {
          doMigrate(appinstance, option, function doMigrateFn(err, data) {
            var status = 0;
            resetGlobalVariables();
            if (err) {
              console.log('Error in migration ', JSON.stringify(err));
              log.error(log.defaultContext, JSON.stringify(err));
              status = 1;
            } else {
              log.debug('Migration complete');
              console.log('Migration complete');
            }
            if (!isTestCases) {
              process.exit(status);
            } else {
              cb(err, data);
            }
          });
        }
      });
      break;
    default:
  }
};

function resetGlobalVariables() {
  appVersion = null;
  curAppName = null;
  curDbVer = null;
  curSysVerData = null;
  printMigrationCompleteMessage = null;
  runAsPartofTestCase = null;
}

// Autoupdate will be ran even if 'enableMigration' is not set in the application configuration.
// Autoupdate will do create new indexes for the models and sync file based model setting
// changes to ModelDefinition table.
// If we run multiple versions of app (Ex: 0.9.1, 0.9.2) which has different settings for
// a file based model (Ex: counter.json) which ever version of app that ran 'node . -m' last
// those changes will get reflected in the Database.
// It is not recommended to run 'node . -m' without 'enableMigration' set to true in application config
function doAutoUpdate(app, options, cb) {
  log.debug(options, 'doAutoUpdate called.');
  var keys = Object.keys(app.models);
  async.eachSeries(keys, function asyncForEachKey(key, callback) {
    var model = app.models[key];
    if (key !== model.modelName) {
      log.warn(options, 'key !== model.modelName, key="', key, '" modelName="', model.modelName, '"');
      return callback();
    }
    var ds = model.getDataSource(options);
    log.debug(options, 'Performing autoupdate on model "', model.modelName, '"');
    if (ds) {
      ds.autoupdate(model.modelName, function (err, result) {
        if (err) {
          log.error(options, 'ds.autoupdate for model="', model.modelName, '" Error: ', err);
          return callback(err);
        }
        // Checking for history model
        if (model.definition.settings.mixins && model.definition.settings.mixins.HistoryMixin && model._historyModel) {
          var historyModel = model._historyModel;
          var histDs = historyModel.getDataSource(options);
          if (histDs) {
            histDs.autoupdate(historyModel.modelName, function (err, result) {
              if (err) {
                log.error(options, 'ds.autoupdate for history model="', historyModel.modelName, '" Error: ', err);
                return callback(err);
              }
              callback();
            });
          } else {
            log.warn(options, 'Unable to get datasource for history model - ', historyModel.name);
            callback();
          }
        } else {
          log.debug(options, 'No history model for model "', model.modelName, '"');
          callback();
        }
      });
    } else {
      log.warn(options, 'Unable to get datasource for model - ', model.modelName);
      callback();
    }
  }, function asyncCb(err) {
    if (err) {
      log.error(options, 'async.eachSeries final cb, Error: ', err);
      return cb(err);
    }
    updateFileBasedModels(cb);
  });
}

function waitForMigrationToComplete(appinstance, option, cb) {
  var appVer = buildAppVersion(appinstance, option);
  var SystemConfig = loopback.findModel('SystemConfig');
  SystemConfig.find({
    where: {
      key: 'version'
    }
  }, util.bootContext(), function systemConfigFindCbFn(err, data) {
    var versionMisMatch = true;
    if (err) {
      cb(err);
    }
    if (data.length) {
      var dbVer = data[0];
      versionMisMatch = appVerGreaterThanDBVer(appVer, dbVer.value);
    }
    if (versionMisMatch) {
      printMigrationCompleteMessage = true;
      log.debug(option, 'Waiting for db migration to complete, expecting "node . -m" to be running.');
      console.log('Waiting for db migration to complete, expecting "node . -m" to be running.');
      if (runAsPartofTestCase) {
        cb();
      } else {
        setTimeout(function setTimeOutFn() {
          waitForMigrationToComplete(appinstance, option, cb);
        }, 10000);
      }
    } else {
      if (printMigrationCompleteMessage) {
        log.debug(option, 'Migration complete, database is now migrated to latest version');
      }
      return cb();
    }
  });
}

function getListOfMigrations(app, option) {
  var retList = [];
  if (appVersion) {
    Object.keys(appVersion).forEach(function appVersionKeysForEachFn(moduleName) {
      var dbMigDir;
      if (moduleName === curAppName) {
        dbMigDir = path.join(app.locals.apphome, '..', 'db');
      } else {
        dbMigDir = path.join(app.locals.apphome, '..', 'node_modules', moduleName, 'db');
      }
      var dbVerOfModule = curDbVer && curDbVer[moduleName];
      var appVerOfModule = appVersion[moduleName];
      if (!fs.existsSync(dbMigDir)) {
        return;
      }
      var allDirs = fs.readdirSync(dbMigDir).map(f => ({
        ver: f,
        dir: path.join(dbMigDir, f)
      }));
      var migDirs = [];
      allDirs.forEach(function allDirsForEachFn(f) {
        try {
          var ret = fs.statSync(f.dir).isDirectory();
          if (ret && dbVerOfModule && semver.lte(f.ver, dbVerOfModule)) {
            ret = false;
          }
          ret = ret && semver.lte(f.ver, appVerOfModule);
          if (ret) {
            migDirs.push({
              version: f.ver,
              dir: f.dir
            });
          }
        } catch (ex) {
          // ignore error when directories with invalid semver version is there
        }
      });
      migDirs.sort(function migDirsSortFn(a, b) {
        return semver.gt(a.version, b.version);
      });
      if (migDirs.length) {
        retList.push({
          name: moduleName,
          migList: migDirs
        });
      }
    });
  }
  return retList;
}

function doMigrationForModuleVersion(migModule, appinstance, option, cb) {
  log.debug(option, 'Running migrations for moduleVersion ', migModule.version);
  var metaPath = path.join(migModule.dir, 'meta.json');
  if (fs.existsSync(metaPath)) {
    var meta = require(metaPath);
    async.forEachOfSeries(meta.files, function asyncForEachFn(value, key1, asyncCb) {
      if (value.enabled === false) {
        return asyncCb();
      }
      var filePath = path.join(migModule.dir, value.file);
      log.debug(option, 'Running migration for file ', filePath);
      if (path.extname(filePath) === '.js') {
        require(filePath)(appinstance, function requireFileCbFn(err) {
          asyncCb(err);
        });
      } else {
        var options = {
          ctx: {}
        };
        options.ctx = meta.contexts[value.ctxId];
        if (!options.ctx) {
          return asyncCb(Error('ctxId not found in contexts of ' + metaPath));
        }
        var model = loopback.findModel(value.model);
        var dataList = require(filePath);
        if (Object.prototype.toString.call(dataList) === '[object Object]') {
          dataList = [dataList];
        }
        async.forEachOf(dataList, function dataListForEachFn(data, key2, asyncCb2) {
          var localOptions = JSON.parse(JSON.stringify(options));
          var key = value.key || 'id';
          if (value.model === 'NodeRedFlow') {
            key = 'name';
          }
          if (value.model === 'Tenant') {
            key = 'tenantId';
          }

          var filter = {
            where: {}
          };
          filter.where[key] = data[key];
          if (data[key]) {
            model.find(filter, localOptions, function modelFindCbFn(err, dbData) {
              if (err) {
                return asyncCb2(err);
              }
              if (dbData.length) {
                data.id = dbData[0].id;
                if (dbData[0]._version) {
                  data._version = dbData[0]._version;
                }
              }
              model.upsert(data, localOptions, function modelUpsertCbFn(err, data) {
                asyncCb2(err);
              });
            });
          } else {
            model.upsert(data, localOptions, function modelUpsertCbFn(err, data) {
              asyncCb2(err);
            });
          }
        }, function asyncForEachCallbackFn(err) {
          asyncCb(err);
        });
      }
    }, function asyncForEachSeriesCallbackFn(err) {
      cb(err);
    });
  } else {
    cb(Error('file not found ' + metaPath));
  }
}

function doMigrationForModule(migModule, appinstance, option, cb) {
  log.debug(option, 'Running migrations for ', migModule.name);
  async.forEachOfSeries(migModule.migList, function asyncForEachOfSeriesFn(value, key, asyncCb) {
    doMigrationForModuleVersion(value, appinstance, option, function doMigrationForModuleVersionFn(err) {
      if (err) {
        asyncCb(err);
      } else {
        var version = {};
        if (curSysVerData) {
          version = curSysVerData.value;
        }
        version[migModule.name] = value.version;
        updateVersion(version, asyncCb);
      }
    });
  }, function asyncForEachOfSeriesCbFn(err) {
    cb(err);
  });
}

function doMigrationForAllModules(appMigList, appinstance, option, cb) {
  async.forEachOfSeries(appMigList, function asyncForEachOfSeriesFn(value, key, asyncCb) {
    doMigrationForModule(value, appinstance, option, asyncCb);
  }, function doMigrationForModuleCnFn(err) {
    cb(err);
  });
}

function updateVersion(newVersion, cb) {
  var SystemConfig = loopback.findModel('SystemConfig');
  if (curSysVerData) {
    curSysVerData.value = newVersion;
  } else {
    curSysVerData = {
      key: 'version',
      value: newVersion
    };
  }
  SystemConfig.upsert(curSysVerData, util.bootContext(), function systemConfigUpsertCbFn(err, data) {
    curSysVerData = data;
    cb(err, data);
  });
}

function doMigrate(appinstance, option, cb) {
  var appVer = buildAppVersion(appinstance, option);
  var SystemConfig = loopback.findModel('SystemConfig');
  SystemConfig.find({
    where: {
      key: 'version'
    }
  }, util.bootContext(), function systemConfigFindCbFn(err, data) {
    var versionMisMatch = true;
    if (err) {
      cb(err);
    }
    if (data.length) {
      curDbVer = data[0].value;
      curSysVerData = data[0];
      versionMisMatch = appVerGreaterThanDBVer(appVer, curDbVer);
    }
    if (versionMisMatch) {
      var dbMig = getListOfMigrations(appinstance, option);
      if (dbMig.length) {
        doMigrationForAllModules(dbMig, appinstance, option, function doMigrationForAllModulesFn(err, data) {
          if (err) {
            return cb(err);
          }
          updateVersion(appVer, cb);
        });
      } else {
        updateVersion(appVer, cb);
      }
    } else {
      cb();
    }
  });
}

function buildAppVersion(appinstance, option) {
  if (appVersion) {
    return appVersion;
  }
  var appListPath = path.join(appinstance.locals.apphome, 'app-list.json');
  var appList;
  try {
    appList = require(appListPath);
  } catch (ex) {
    log.debug(option, 'app-list.json not present, ignoring migration');
    return null;
  }
  appList.forEach(function appListForEachFn(appModule) {
    if (!appModule.enabled) {
      return;
    }
    appVersion = appVersion || {};
    var appVer = getVersion(appinstance, appModule.path, option);
    if (!appVer) {
      return null;
    }
    if (appModule.path === '.' || appModule.path === './') {
      curAppName = appVer.name;
      appVersion[appVer.name] = appVer.version;
    } else {
      appVersion[appModule.path] = appVer.version;
    }
  });
  return appVersion;
}

// Reads package.json from the application and returns the version.
function getVersion(app, givenPath, option) {
  var packageJsonPath;
  if (givenPath === './' || givenPath === '.') {
    packageJsonPath = path.join(app.locals.apphome, '..', 'package.json');
  } else {
    packageJsonPath = path.join(app.locals.apphome, '..', 'node_modules', givenPath, 'package.json');
  }
  try {
    var myPackage = require(packageJsonPath);
    return {
      name: myPackage.name,
      version: myPackage.version
    };
  } catch (error) {
    log.error(option, 'Given module "', givenPath, '" package.json doesn\'t exists.');
    log.error(option, 'Error: ', error);
    return null;
  }
}

// Does semver comparison between application versions and versions in DB
function appVerGreaterThanDBVer(appVer, dbVer) {
  var appVerGTDBVer = false;
  appVerGTDBVer = Object.keys(appVer).some((key) => {
    const appVerVal = appVer[key];
    const dbVerVal = dbVer[key];
    if (typeof dbVerVal === 'undefined') {
      return true;
    } else if (semver.gt(appVerVal, dbVerVal)) {
      return true;
    }
  });
  return appVerGTDBVer;
}

// Updates the ModelDefinition table data for file based models
// if there is any difference from file content to the table row data
function updateFileBasedModels(cb) {
  var modelDefinitionModel = loopback.findModel('ModelDefinition');
  var filter = {
    where: {
      filebased: true
    }
  };
  modelDefinitionModel.find(filter, util.bootContext(), function (err, results) {
    if (err) return cb(err);
    async.eachSeries(results, function asyncForEachModelDef(modelDef, callback) {
      var modelName = modelDef.name;
      var model = loopback.findModel(modelName);
      if (model) {
        var modelDefinitionObject = util.getFileBasedModelSettings(model);
        modelDefinitionObject.name = modelDef.name;
        // Check for if there is any difference between file model and DB data model instance.
        var updatedData = {};
        // Currently the implementation takes care of only differences, if there is any setting removed
        // It will not get updated in the DB. Current work around is set the corresponding setting
        // value to corresponding empty value. Ex: Object -> {}, String -> ''
        var fileModelKeys = Object.keys(modelDefinitionObject);
        // Looping through all the settings keys from file based model
        fileModelKeys.forEach(function fileModelKeysCb(field) {
          // Checking existence of field value in DB record
          if (typeof modelDef[field] !== 'undefined') {
            // Comparing DB record with the file model setting
            if (!_.isEqual(modelDef[field], modelDefinitionObject[field])) {
              updatedData[field] = modelDefinitionObject[field];
            }
          } else if (typeof modelDefinitionModel.definition.properties[field] !== 'undefined') {
            // If a new setting introduced it should be one of ModelDefinition model properties
            updatedData[field] = modelDefinitionObject[field];
          }
        });
        // Checking if DB has to be updated if the updatedData is not empty
        if (!_.isEmpty(updatedData)) {
          modelDef.updateAttributes(updatedData, util.bootContext(), function modelDefUpdateSettings(err) {
            if (err) {
              log.error(util.bootContext(), 'Error while updating settings for model ', modelDef.name, '. Error: ', err);
              return callback(err);
            }
            callback();
          });
        } else {
          callback();
        }
      } else {
        modelDefinitionModel.deleteById(modelDef.id, modelDef._version, util.bootContext(), function (err, data) {
          if (err) {
            // ignore error in case of multiple migrations going in parallel, this is not critical step
            return callback();
          }
          callback();
        });
      }
    }, function modelDefs(err) {
      if (err) return cb(err);
      cb();
    });
  });
}
