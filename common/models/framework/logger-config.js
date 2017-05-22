/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

var loopback = require('loopback');
var loggingModule = require('./../../../lib/logger');
var log = loggingModule('logger-config');
var msgService = require('../../../lib/common/global-messaging');
var uuid = require('node-uuid');

msgService.subscribe('LoggerConfig', dataUpdater);

var levelMap = {
  'debug': 10,
  'info': 20,
  'warn': 30,
  'error': 40,
  'none': 50,
  'fatal': 60
};

var reverseMap = {
  '10': 'debug',
  '20': 'info',
  '30': 'warn',
  '40': 'error',
  '50': 'none',
  '60': 'fatal'
};

function updateLogArray(err, model) {
  var instance = loggingModule('LOGGER-CONFIG');
  var loggerArray = instance.getLoggers();
  var currentLogger;

  if (err) {
    log.error('recieved error on find model ', err);
    return;
  } else if (!model || model === {}) {
    log.warn('did not find any logger configuration in the db.');
    return;
  }
  log.debug('found model was ', model);
  var defaultLevel = model.data.default || 50;
  var data = model.data;
  if (!data) {
    log.error('data cannot be empty');
    return;
  }

  if (data.all) {
    if (data.all && levelMap[data.all]) {
      for (currentLogger in loggerArray) {
        if (loggerArray.hasOwnProperty(currentLogger)) {
          instance.changeLogger(loggerArray[currentLogger], levelMap[data.all]);
        }
      }
    }
    return;
  }

  for (currentLogger in loggerArray) {
    if (loggerArray.hasOwnProperty(currentLogger)) {
      if ((Object.keys(data)).indexOf(currentLogger) > -1) {
        if (!((data[currentLogger]) && levelMap[data[currentLogger]])) {
          instance.changeLogger(loggerArray[currentLogger], defaultLevel);
        } else {
          instance.changeLogger(loggerArray[currentLogger], levelMap[data[currentLogger]]);
        }
      } else {
        // default : turn off the logger
        instance.changeLogger(loggerArray[currentLogger], defaultLevel);
      }
    }
  }
}

function dataUpdater() {
  var loggerConfig = loopback.findModel('LoggerConfig');
  loggerConfig.findOne({}, { tenantId: 'default' }, updateLogArray);
}

module.exports = function LoggerConfig(loggerConfig) {
  loggerConfig.observe('before save', function loggerConfig(ctx, next) {
    var loggerConfigModel = loopback.findModel('LoggerConfig');
    loggerConfigModel.deleteAll({}, ctx.options, function loggerConfigDestroyAll(err, info) {
      if (err) {
        err.message = 'Failed to delete old LoggerConfigModel due to: ' + err.message;
        next(err);
      } else {
        return next();
      }
    });
  });

  loggerConfig.observe('after save', function loggerConfigAfterSave(ctx, next) {
    updateLogArray(null, ctx.instance);
    msgService.publish('LoggerConfig', uuid.v4());
    return next();
  });

  loggerConfig.list = function loggerConfigList(options, cb) {
    var result = {};
    var loggerArray = loggingModule('LOGGER-CONFIG').getLoggers();
    Object.keys(loggerArray).forEach(function loggerArrayForEach(curval) {
      result[curval] = reverseMap[loggerArray[curval].level];
    });
    cb(null, result);
  };

  loggerConfig.remoteMethod(
    'list',
    {
      returns: { arg: 'Loggers', type: 'object' }
    }
  );
};
