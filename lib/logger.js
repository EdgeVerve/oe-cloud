/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var bunyan = require('bunyan');
var config = require('../server/log-config');

var levels = {
  'debug': 10,
  'info': 20,
  'warn': 30,
  'error': 40,
  'none': 50,
  'fatal': 60
};

function PecLogger(loggerImpl, debugLogger, name) {
  this.logger = loggerImpl;
  this.debugLogger = debugLogger;
  this.name = name;
  var logLevel = 0;

  this.info = function empty() { };
  this.warn = function empty() { };
  this.error = function empty() { };
  this.debug = function empty() { };
  this.fatal = function empty() { };
  this.defaultContext = function getDefaultContextFn() {
    return { ctxname: 'logContext', ctx: { remoteUser: 'system' } };
  };
  logLevel = config.levels[name] || config.levels.default || 'error';
  logLevel = levels[logLevel];
  updateLogger(this, logLevel);
}

var getMessage = function writeMessage(contextLogLevel, contextLogging, originalArguments) {
  var callContext = originalArguments[0];
  if ((callContext && callContext.ctx && callContext.ctx.logging && callContext.ctx.logging <= contextLogLevel) || (!contextLogging)) {
    var message = { context: { ctx: {} } };
    var inputContext = callContext ? callContext : { ctxname: 'logContext', ctx: { remoteUser: 'system' } };
    if (inputContext.modelName) {
      message.context.modelName = inputContext.modelName;
    }
    if (inputContext.ctx) {
      if (inputContext.ctx.logging) {
        message.context.ctx.logging = inputContext.ctx.logging;
      }
      if (inputContext.ctx.remoteUser) {
        message.context.ctx.remoteUser = inputContext.ctx.remoteUser;
      }
      if (inputContext.ctx.tenantId) {
        message.context.ctx.tenantId = inputContext.ctx.tenantId;
      }
    }
    message.message = '';
    for (var i = 1; i < originalArguments.length; i++) {
      message.message = message.message + safeStringify(originalArguments[i]);
    }
    return message;
  }
  return '';
};

function safeStringify(obj) {
  if (typeof obj === 'string') {
    return obj;
  }
  try {
    var stringified = JSON.stringify(obj, Object.getOwnPropertyNames(obj));
    return stringified;
  } catch (e) {
    return 'CIRCULAR OBJECT - ERROR';
  }
}

var updateLogger = function updateLoggerFn(curLogger, level) {
  if (!curLogger) {
    // this shouldn't happen, but just incase for some reason curLogger is undefined
    return;
  }
  curLogger.level = level;
  function empty() { }
  curLogger.info = empty;
  curLogger.warn = empty;
  curLogger.error = empty;
  curLogger.debug = empty;
  curLogger.fatal = empty;

  if (config && config.enableContextLogging === 1) {
    curLogger.debug = function contextLogging() {
      var message = getMessage(levels.debug, 1, arguments);
      if (message) {
        curLogger.logger.debug({ context: message.context }, message.message);
      }
    };

    curLogger.info = function contextLogging() {
      var message = getMessage(levels.info, 1, arguments);
      if (message) {
        curLogger.logger.info({ context: message.context }, message.message);
      }
    };

    curLogger.warn = function contextLogging() {
      var message = getMessage(levels.warn, 1, arguments);
      if (message) {
        curLogger.logger.warn({ context: message.context }, message.message);
      }
    };

    curLogger.error = function contextLogging() {
      var message = getMessage(levels.error, 1, arguments);
      if (message) {
        curLogger.logger.error({ context: message.context }, message.message);
      }
    };
    curLogger.fatal = function contextLogging() {
      var message = getMessage(levels.fatal, 1, arguments);
      if (message) {
        curLogger.logger.fatal({ context: message.context }, message.message);
      }
    };
  }

  if (level <= levels.debug) {
    curLogger.debug = function debug() {
      var message = getMessage(levels.debug, 0, arguments);
      curLogger.logger.debug({ context: message.context }, message.message);
    };
  }

  if (level <= levels.info) {
    curLogger.info = function info() {
      var message = getMessage(levels.info, 0, arguments);
      curLogger.logger.info({ context: message.context }, message.message);
    };
  }

  if (level <= levels.warn) {
    curLogger.warn = function warn() {
      var message = getMessage(levels.warn, 0, arguments);
      curLogger.logger.warn({ context: message.context }, message.message);
    };
  }

  if (level <= levels.error) {
    curLogger.error = function error() {
      var message = getMessage(levels.error, 0, arguments);
      curLogger.logger.error({ context: message.context }, message.message);
    };
  }

  if (level <= levels.fatal) {
    curLogger.fatal = function fatal() {
      var message = getMessage(levels.fatal, 0, arguments);
      curLogger.logger.fatal({ context: message.context }, message.message);
    };
  }
};

var mySingleton = (function single() {
  var instance;
  var loggers = {};
  var options = {};

  options.name = 'logger';
  options.streams = config.logStreams;

  function init() {
    // main logger - every other logger is a child of this one
    var logger = bunyan.createLogger(options);
    return {
      getLogger: function getLoggerFn() {
        return logger;
      },

      getLoggers: function getLoggersFn() {
        // array of child loggers
        return loggers;
      },

      setLogger: function setLoggerFn(newLogger) {
        loggers[newLogger.name] = newLogger;
      },

      changeLogger: function changeLoggerFn(logger, level) {
        updateLogger(logger, level);
      }
    };
  }

  return {
    getInstance: function getInstanceFn() {
      if (!instance) {
        instance = init();
      }
      return instance;
    }

  };
})();

var loggerFn = function createLogger(name) {
  if (name === 'LOGGER-CONFIG') {
    return mySingleton.getInstance();
  }

  var myLogger = mySingleton.getInstance().getLogger();
  var logArray = mySingleton.getInstance().getLoggers();

  if (logArray[name]) {
    return logArray[name];
  }

  var debug = require('debug')(name);
  var newLogger = new PecLogger(myLogger.child({
    __name__: name
  }), debug, name);
  mySingleton.getInstance().setLogger(newLogger);
  return mySingleton.getInstance().getLoggers()[name];
};

loggerFn.DEBUG_LEVEL = levels.debug;
loggerFn.ERROR_LEVEL = levels.error;
loggerFn.INFO_LEVEL = levels.info;
loggerFn.WARN_LEVEL = levels.warn;
loggerFn.NONE_LEVEL = levels.none;
loggerFn.FATAL_LEVEL = levels.fatal;

module.exports = loggerFn;
