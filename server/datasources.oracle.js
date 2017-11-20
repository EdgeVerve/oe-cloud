/**
 **
 ** ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 ** Bangalore, India. All Rights Reserved.
 **
 **/

var oracleSID = process.env.ORACLE_SID || 'orclpdb.ad.infosys.com';
var oracleHost = process.env.ORACLE_HOST || 'localhost';
var oraclePort = process.env.ORACLE_PORT || 1521;
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
  },
  'emailDs': {
    'name': 'emailDs',
    'connector': 'mail',
    'transports': [{
      'type': 'smtp',
      'host': 'smtp.gmail.com',
      'port': 587,
      'auth': {
        'user': 'yourGmailAccount@gmail.com',
        'pass': 'yourSecretPassword'
      }
    }]
  },
  'gridfs_db': {
    'name': 'gridfs_db',
    'connector': 'loopback-component-storage',
    'provider': 'filesystem',
    'root': './'
  }
};
