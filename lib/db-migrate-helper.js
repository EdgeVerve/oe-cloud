/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/* eslint-disable no-console , no-process-exit*/

var _ = require('lodash');
var fs = require('fs');
var util = require('./common/util');
var path = require('path');
var async = require('async');
var semver = require('semver');
var process = require('process');
var loopback = require('loopback');
var log = require('./logger')('db-migrate-helper');

var appVersion;
var curAppName;
var curDbVer;
var curSysVerData;
var printMigrationCompleteMessage;

module.exports = function dbMigrationHelperFn(appinstance, option, cb) {
  var mode = getMode(appinstance, option);
  switch (mode) {
    case 'NONE':
      cb();
      break;
    case 'WAIT':
      waitForMigrationToComplete(appinstance, option, cb);
      break;
    case 'DOMIGRATE':
      doMigrate(appinstance, option, function doMigrateFn(err, data) {
        var status = 0;
        if (err) {
          console.log('Error in migration ', err);
          log.error(log.defaultContext, err);
          status = 1;
        } else {
          log.debug('Migration complete');
          console.log('Migration complete');
        }
        process.exit(status);
      });
      break;
    default:
  }
};

function waitForMigrationToComplete(appinstance, option, cb) {
  var appVer = buildAppVersion(appinstance, option);
  var SystemConfig = loopback.findModel('SystemConfig');
  SystemConfig.find({
    where: {
      key: 'version'
    }
  }, util.bootContext(), function systemConfigFindCbFn(err, data) {
    var versionMatch = false;
    if (err) {
      cb(err);
    }
    if (data.length) {
      var dbVer = data[0];
      versionMatch = _.isEqual(appVer, dbVer.value);
    }
    if (!versionMatch) {
      printMigrationCompleteMessage = true;
      log.debug(option, 'Waiting for db migration to complete, expecting "node . -m" to be running.');
      console.log('Waiting for db migration to complete, expecting "node . -m" to be running.');
      setTimeout(function setTimeOutFn() {
        waitForMigrationToComplete(appinstance, option, cb);
      }, 10000);
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
    var versionMatch = false;
    if (err) {
      cb(err);
    }
    if (data.length) {
      curDbVer = data[0].value;
      curSysVerData = data[0];
      versionMatch = _.isEqual(appVer, curDbVer);
    }
    if (!versionMatch) {
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

function getMode(appinstance, options) {
  var mode = 'NONE';
  var enableMigration = appinstance.get('enableMigration');
  if (enableMigration) {
    mode = 'WAIT';
    for (var i = 0; i < process.argv.length; i++) {
      var val = process.argv[i];
      if (i > 1 && (val.toLowerCase() === '--migrate' || val.toLowerCase() === '-m')) {
        mode = 'DOMIGRATE';
        break;
      }
    }
  }
  return mode;
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
    var appVer = getVersion(appinstance, appModule.path);
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
function getVersion(app, givenPath) {
  var packageJsonPath;
  if (givenPath === './' || givenPath === '.') {
    packageJsonPath = path.join(app.locals.apphome, '..', 'package.json');
  } else {
    packageJsonPath = path.join(app.locals.apphome, '..', 'node_modules', givenPath, 'package.json');
  }
  // will throw error if some strange issue, not catching intentionally
  var myPackage = require(packageJsonPath);
  return {
    name: myPackage.name,
    version: myPackage.version
  };
}
