/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var oracleSID = process.env.ORACLE_SID || 'ORCLCDB';
var oracleHost = process.env.ORACLE_HOST || 'localhost';
var oraclePort = process.env.ORACLE_PORT ? parseInt(process.env.ORACLE_PORT) : 1521;
var oracleUserName = process.env.ORACLE_USERNAME || 'oeadmin';
var oracleUserPassword = process.env.ORACLE_PASSWORD || 'oeadmin';

module.exports = {
  'nullsrc': {
    'name': 'nullsrc',
    'connector': 'memory'
  },
  'transient': {
    'name': 'transient',
    'connector': 'transient'
  },
  'db': {
    'name': 'db',
    'connector': 'oe-connector-oracle',
    'database': oracleSID,
    'host': oracleHost,
    'port': oraclePort,
    'password': oracleUserPassword,
    'user': oracleUserName
  }
};


