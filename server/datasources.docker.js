/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var mongoHost = process.env.MONGO_HOST || 'localhost';
var dbName = process.env.DB_NAME || 'db';
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
    'host': mongoHost,
    'port': 27017,
    'url': 'mongodb://' + mongoHost + ':27017/' + dbName,
    'database': dbName,
    'name': 'db',
    'connector': 'mongodb',
    'connectionTimeout': 50000
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
