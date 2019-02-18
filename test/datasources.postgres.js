/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var postgresHost = process.env.POSTGRES_HOST || 'localhost';
var dbName = process.env.DB_NAME || 'oe-cloud-test';
module.exports = 
{
  "memdb": {
    "name": "memdb",
    "connector": "memory"
  },
  "transient": {
    "name": "transient",
    "connector": "transient"
  },

  "db": {
    "host": postgresHost,
    "port": 5432,
    "url": "postgres://postgres:postgres@" + postgresHost + ":5432/" + dbName,
    "database": dbName,
    "password": "postgres",
    "name": "db",
    "connector": "oe-connector-postgresql",
    "user": "postgres",
    "connectionTimeout": 50000
  }
};

