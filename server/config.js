/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

/**
 *
 * NOTE - This is a temporary mechanism to choose between application and framework
 * config files. We will be merging both configurations with application
 * config taking precedence over framework config.
 *
 */
// app config file.
var appconfig = null;
// oecloud.io config file.
var config = null;

try {
  appconfig = require('../../../server/config.json');
} catch (e) {
  /* ignored */
}
try {
  config = require('./config.json');
} catch (e) {
/* ignored */
}

if (appconfig) {
  Object.assign(config, appconfig);
}

module.exports = config;

module.exports.gcmServerApiKey = 'gcmServerApiActualKey';
module.exports.appName = 'yourAppName';
