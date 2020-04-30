/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var postgresHost = process.env.POSTGRES_HOST || 'localhost';
var postgresPort = process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT) : 5432;
var dbName = process.env.DB_NAME || 'oe-cloud-test';
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
    'host': postgresHost,
    'port': postgresPort,
    'url': 'postgres://postgres:postgres@' + postgresHost + ':' + postgresPort + '/' + dbName,
    'database': dbName,
    'password': 'postgres',
    'name': 'db',
    'connector': 'oe-connector-postgresql',
    'user': 'postgres',
    'connectionTimeout': 50000
  }
};

