/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var db = process.env.DB || 'mongo';
var config = {};

if (db === 'mongo') {
  config = require('./datasources.docker');
} else if (db === 'postgres') {
  config = require('./datasources.postgres');
} else if (db === 'oracle') {
  config = require('./datasources.oracle');
}

module.exports = config;
