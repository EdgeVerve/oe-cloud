/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var postgresHost = process.env.POSTGRES_HOST || 'localhost';
var postgresPort = process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT) : 5432;
var postgresPassword = process.env.POSTGRES_PASSWORD;
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
    'host': postgresHost,
    'port': postgresPort,
    'url': 'postgres://postgres:postgres@' + postgresHost + ':' + postgresPort + '/' + dbName,
    'database': dbName,
    'password': postgresPassword,
    'name': 'db',
    'connector': 'oe-connector-postgresql',
    'user': 'postgres',
    'connectionTimeout': 50000
  }
};

