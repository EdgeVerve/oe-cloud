/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
var loggingModule = require('./../../lib/logger');
var log = loggingModule('update-logger-config');
var config = require('./../log-config.js');

function getModelFromConfig(callback) {
  var levelMap = {
    'debug': 10,
    'info': 20,
    'warn': 30,
    'error': 40,
    'none': 50,
    'fatal': 60
  };

  if (config && config.levels) {
    var actualConfig = {};
    actualConfig.data = {};
    var levelInServerConfig;
    Object.keys(config.levels).forEach(function configLevelsForEach(key) {
      levelInServerConfig = config.levels[key];
      if (levelMap[levelInServerConfig]) {
        actualConfig.data[key] = levelMap[levelInServerConfig];
      }
    });
    var loggerConfig = loopback.findModel('LoggerConfig');
    loggerConfig.create(actualConfig, { tenantId: 'default' }, function loggerConfigCreate(err) {
      if (err) {
        log.error(log.defaultContext(), 'couldn\'t create a loggerConfig instance in the db');
        return callback(err);
      }
      return callback(null, actualConfig);
    });
  } else {
    log.warn(log.defaultContext(), 'tried to fetch config from file - config was badly formatted');
    return callback(new Error('tried to fetch config from file - config was badly formatted'));
  }
}

// contains a bit of copied code - might need to refactor this in the future
module.exports = function getLoggerConfig(app, done) {
  function updateLogArray(err, model) {
    if (err) {
      log.error(log.defaultContext(), 'recieved error on find model ', err);
      return done(new Error('Loopback encountered an error when trying to find the model LoggerConfig'));
    }
    if (!model || model === {}) {
      log.info(log.defaultContext(), 'did not find any logger configuration in the db.');
      getModelFromConfig(function getModelFromConfig(err, result) {
        if (err) {
          return done(err);
        }
        return updateConfigInMemory(result, done);
      });
    } else {
      return updateConfigInMemory(model, done);
    }
  }

  function updateConfigInMemory(model, done) {
    if (!model) {
      return done();
    }
    var instance = loggingModule('LOGGER-CONFIG');
    var loggerArray = instance.getLoggers();
    var currentLogger;

    log.debug(log.defaultContext(), 'found model was ', model);
    var defaultLevel = model.data.default || 70;
    var data = model.data;
    if (!data) {
      log.error(log.defaultContext(), 'data cannot be empty');
      return done(new Error('Tried fetching loggerConfig data from db, it came back empty'));
    }

    log.info(log.defaultContext(), 'fetching log configuration from the db');

    if (data.all) {
      if ((!isNaN(parseFloat(loggerArray.all)) && isFinite(loggerArray.all))) {
        for (currentLogger in loggerArray) {
          if (loggerArray.hasOwnProperty(currentLogger)) {
            instance.changeLogger(loggerArray.currentLogger, data.all);
          }
        }
      }
      return done();
    }

    for (currentLogger in loggerArray) {
      if (loggerArray.hasOwnProperty(currentLogger)) {
        if ((Object.keys(data)).indexOf(currentLogger) > -1) {
          if (!(!isNaN(parseFloat(data[currentLogger])) && isFinite(data[currentLogger]))) {
            instance.changeLogger(loggerArray[currentLogger], defaultLevel);
          } else {
            instance.changeLogger(loggerArray[currentLogger], data[currentLogger]);
          }
        } else {
          // default : turn off the logger
          instance.changeLogger(loggerArray[currentLogger], defaultLevel);
        }
      }
    }
    return done();
  }

  function dataUpdater() {
    var loggerConfig = loopback.findModel('LoggerConfig');
    loggerConfig.findOne({}, { tenantId: 'default' }, updateLogArray);
  }
  // loads logger config to/from the db depending on if it exists or not
  dataUpdater();
};
