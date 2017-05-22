/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

var gelfStream = require('gelf-stream');
var PrettyStream = require('bunyan-prettystream');
var env = process.env.NODE_ENV;

// app log-config file.
var appLogConfig = null;
// ev foundation log-config file.
var logConfig = null;

var useAppConfig = 0;

try {
  if (env) {
    appLogConfig = require('../../../server/log-config.' + env + '.js');
  } else {
    appLogConfig = require('../../../server/log-config.json');
  }
  if (appLogConfig) {
    useAppConfig = 1;
  }
} catch (e) {
  /* ignored */
}

if (useAppConfig) {
  logConfig = appLogConfig;
} else if (env) {
  try {
    logConfig = require('./log-config.' + env + '.js');
  } catch (e) {
    logConfig = require('./log-config.json');
  }
} else {
  logConfig = require('./log-config.json');
}
if (logConfig.logStreams) {
  var tempStreams = [];
  for (var i = 0; i < logConfig.logStreams.length; i++) {
    var curStream = logConfig.logStreams[i];
    /* DEFAULT LEVEL, EVERYTHING IS LOGGED*/
    var myLevel = 10;
    if (curStream.level) {
      myLevel = curStream.level;
    }

    if (curStream.type === 'udp') {
      if (curStream.host && curStream.port) {
        var stream = gelfStream.forBunyan(curStream.host, curStream.port);
        tempStreams.push({
          stream: stream,
          type: 'raw',
          level: myLevel
        });
      }
    } else if (curStream.type === 'pretty') {
      var prettyStdOut = new PrettyStream();
      prettyStdOut.pipe(process.stdout);
      tempStreams.push({
        stream: prettyStdOut,
        level: myLevel
      });
    } else if (curStream.type === 'out') {
      tempStreams.push({
        stream: process.stdout
      });
    } else {
      tempStreams.push(curStream);
    }
  }
  logConfig.logStreams = tempStreams;
}

module.exports = logConfig;
