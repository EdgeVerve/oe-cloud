/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var mongoHost = process.env.MONGO_HOST || 'localhost';
var mongoPort = process.env.MONGO_PORT ? parseInt(process.env.MONGO_PORT) : 27017;
var dbName = process.env.DB_NAME || "dbname";
module.exports = {
  'memdb': {
    'name': 'memdb',
    'connector': 'memory'
  },
  'transient': {
    'name': 'transient',
    'connector': 'transient'
  },
  'db': {
    'host': mongoHost,
    'port': mongoPort,
    'url': 'mongodb://' + mongoHost + ':' + mongoPort + '/' + dbName,
    'database': dbName,
    'name': 'db',
    'connector': 'oe-connector-mongodb',
    'connectionTimeout': 500000
  }
};

