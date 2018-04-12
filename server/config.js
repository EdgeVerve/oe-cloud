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
// app config file.
var appconfig = null;
// oecloud.io config file.
var config = null;
var env = '';
var filename = '';
// set env to development if NODE_ENV is not set
env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development';
console.log('ENVIRONMENT=' + env);
filename = 'config.' + env + '.json';
try {
  appconfig = require('../../../server/' + filename);
  console.log('Using Application Config File: server/' + filename + ' to override ');
} catch (e) {
  try {
    appconfig = require('../../../server/config.json');
    console.log('Using Application Config File: server/config.json to override ');
  } catch (e) { console.log('No Config File in Application. Framework default config will be used.'); }
}
try {
  config = require('./' + filename);
  console.log('node_modules/oe-cloud/server/' + filename);
} catch (e) {
  try {
    config = require('./config.json');
    console.log('node_modules/oe-cloud/server/config.json');
  } catch (e) { console.log('No Config File in Framework.');}
}

if (appconfig) {
  Object.assign(config, appconfig);
}

module.exports = config;

module.exports.gcmServerApiKey = 'gcmServerApiActualKey';
module.exports.appName = 'yourAppName';
