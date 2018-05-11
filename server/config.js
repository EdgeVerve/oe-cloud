/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

/**
 *
 * NOTE - This is a mechanism to override framework config parameters with
 * application parameters. Priority is given to application, and within application,
 * to the environment specific file. If env specific file is not present, config.json is used.
 *
 *
 */
var log = require('oe-logger')('config.js');

// app config file.
var appconfig = null;
// oecloud.io config file.
var config = null;
var env = '';
var filename = '';
var TAG = '    * ';
// set env to development if NODE_ENV is not set
env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development';
log.info('\n\n========================oe-Cloud==========================\n');
log.info(TAG + 'ENVIRONMENT = ' + env);
filename = 'config.' + env + '.json';
try {
  appconfig = require('../../../server/' + filename);
  log.info(TAG + 'Using Application Config File: server/' + filename + ' to override ');
} catch (e) {
  try {
    appconfig = require('../../../server/config.json');
    log.info(TAG + 'Using Application Config File: server/config.json to override ');
  } catch (e) { log.info(TAG + 'No Config File in Application. Framework default config will be used.'); }
}
try {
  config = require('./' + filename);
  log.info(TAG + 'node_modules/oe-cloud/server/' + filename);
} catch (e) {
  try {
    config = require('./config.json');
    log.info(TAG + 'node_modules/oe-cloud/server/config.json');
  } catch (e) { log.info(TAG + 'No Config File in Framework.');}
}
log.info('\n============================================================\n');

if (appconfig) {
  Object.assign(config, appconfig);
}
config.REQUIRE_HTTPS = process.env.REQUIRE_HTTPS || false;
module.exports = config;

module.exports.gcmServerApiKey = 'gcmServerApiActualKey';
module.exports.appName = 'yourAppName';
