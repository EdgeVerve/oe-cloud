/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

/* eslint-disable */

// Atul : Oracle utility to create users with all the required permissions.
// This file should be run before CI/CD is started 
// This will create user based on CI_PROJECT_NAMESPACE (which is user name) and CI_PROJECT_NAME

// ORACLE_HOST
// ORACLE_SYSUSER
// ORACLE_SYSPASSWORD
// ORACLE_SID
// CI_PROJECT_NAME
// CI_PROJECT_NAMESPACE

var oracledb = require('oracledb');
var async = require('async');
var oracleHost = process.env.ORACLE_HOST || 'localhost';
var oraclePort = process.env.ORACLE_PORT || 1521;

var oracleConnectSettings = {
  'password': process.env.ORACLE_SYSPASSWORD || 'manager1',
  'user': process.env.ORACLE_SYSUSER || 'sys',
  'connectString': oracleHost + ':' + oraclePort + '/' + (process.env.ORACLE_SID || 'orclpdb.ad.infosys.com')
};

var userName = process.env.CI_PROJECT_NAMESPACE.toUpperCase() + '-' + (process.env.CI_PROJECT_NAME || 'oecloud').toUpperCase();
var password = process.env.CI_PROJECT_NAMESPACE.toLowerCase();

var grants = [
  'CREATE VIEW',
  'ALTER SESSION',
  'CREATE SESSION',
  'CREATE SEQUENCE',
  'CREATE SYNONYM',
  'CREATE TABLE',
  'UNLIMITED TABLESPACE',
  'CREATE PROCEDURE'
];

function createUser(connection, cb) {
  var sql = 'alter session set "_ORACLE_SCRIPT"=true';
  connection.execute(sql, function (e, r) {
    if (e) {
      console.error('Ignoring error of alter session. UserName : ' + userName + ' Error :' + e);
    }
    console.log(sql, ' ......... ok');
    var sql = 'CREATE USER "' + userName + '" IDENTIFIED BY ' + password;

    connection.execute(sql, function (err, result) {
      if (err) {
        throw new Error('Unable to create user ' + userName + ' Error :' + err);
      }
      console.log(sql, ' ......... ok');
      async.each(grants, function (g, callback) {
        var sql = 'GRANT ' + g + ' to "' + userName + '"';

        connection.execute(sql, function (err2, result2) {
          if (err2) {
            throw new Error('Unable to execute grant ' + sql);
          }
          console.log(sql, ' ......... ok');
          return callback();
        });
      }, function (err) {
        console.log('User ' + userName + ' Created successfully');
        return cb();
      });
    });
  });
}


function dropTables(cb) {
  var oracleConnectSettings2 = Object.assign({}, oracleConnectSettings);
  oracleConnectSettings2.user = userName;
  oracleConnectSettings2.password = password;

  oracledb.getConnection(
    oracleConnectSettings2,
    function (err, connection) {
      if (err) {
        throw new Error('Unable to connect to Oracle Database ' + JSON.stringify(oracleConnectSettings));
      }
      var sql = "select 'drop table \"' || table_name || '\"' from all_tables where owner = '" + userName + "'";
      var totalRows = 1000;

      connection.execute(sql, {}, {maxRows: totalRows}, function (err, result) {
        if (err) {
          throw new Error('Unable to find tables ' + userName + ' Error :' + err);
        }
        connection.execute(sql, {}, {maxRows: totalRows}, function (err2, result2) {
          if (err2) {
            throw new Error('Unable to execute droping of table ' + sql);
          }
          if (!result2 || !result2.rows || result2.rows.length === 0) {
            return cb();
          }
          async.each(result2.rows, function (row, callback) {
            var sql = row[0];
            connection.execute(sql, function (err2, result2) {
              if (err2) {
                throw new Error('Unable to drop table\nERROR : ' + err2 + '\nSQL : ' + sql);
              }
              console.log(sql, ' ......... ok');
              return callback();
            });
          }, function (err) {
            console.log('Tables of user ' + userName + ' dropped successfully');
            return cb();
          });
        });
      });
    });
}

oracledb.getConnection(
  oracleConnectSettings,
  function (err, connection) {
    if (err) {
      throw new Error('Unable to connect to Oracle Database ' + JSON.stringify(oracleConnectSettings));
    }
    var sql = "select username, user_id from dba_users where username = '" + userName + "'";
    console.log(sql);
    connection.execute(sql,
      function (err, result) {
        if (err) {
          console.error(err); return;
        }
        if (!result.rows || result.rows.length == 0) {
          createUser(connection, function (err) {
            if (err) {
              return process.exit(1);
            }
            return process.exit();
          });
        } else {
          dropTables(function (err) {
            if (err) {
              return process.exit(1);
            }
            return process.exit();
          });
        }
      });
  });
