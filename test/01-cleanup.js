/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chai = require('chai');
var expect = chai.expect;
var Db = require('mongodb').Db;
var Server = require('mongodb').Server;

var mongoHost = process.env.MONGO_HOST || 'localhost';
var postgresHost = process.env.POSTGRES_HOST || 'localhost';
var dbName = process.env.DB_NAME || 'db';
var postgresDBName = process.env.DB_NAME || 'postgres';

describe('ZZ Final Cleanup', function() {
	this.timeout(120001);

    before('Delete collections', function(done) {
		var db = new Db(dbName, new Server(mongoHost, 27017));
		db.open(function(err, db) {
			if (err) {
				console.log(err);
			}
			db.dropDatabase();
			var db1 = new Db(dbName + '1', new Server(mongoHost, 27017));
			db1.open(function(err, db1) {
				if (err) {
					console.log(err);
				}
				db1.dropDatabase();
				var db2 = new Db(dbName + '2', new Server(mongoHost, 27017));
				db2.open(function(err, db2) {
					if (err) {
						console.log(err);
					}
					db2.dropDatabase();
					done();
				});
			});
		});
    });

    it('Should delete collections', function(done) {
		expect(1).to.be.equal(1);
		done();
    });

	it('Should delete postgres db', function(done) {
		if (process.env.NODE_ENV == 'postgres') {
			var Pool = require('pg').Pool;
			var pool = new Pool({
				"user": "postgres",
				"password": "postgres",
				"host": postgresHost,
				"database": "postgres"
			});
			pool.query("SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE (pg_stat_activity.datname = '" + postgresDBName + "' OR pg_stat_activity.datname = '" + postgresDBName + '1' + "' OR pg_stat_activity.datname = '" + postgresDBName + '2' + "') AND pid <> pg_backend_pid()", function (err, result) {
				if (err) {
					console.log("Failed to disconnect open connections to Postgres DB");
					console.log(err);
					return done(err);
				}
				pool.query("DROP DATABASE IF EXISTS \"" + postgresDBName + "\"", function (err, result) {
					if (err) {
						console.log(err);
					}
					pool.query("DROP DATABASE IF EXISTS \"" + postgresDBName + "1\"", function (err, result) {
						if (err) {
							console.log(err);
						}
						pool.query("DROP DATABASE IF EXISTS \"" + postgresDBName + "2\"", function (err, result) {
							if (err) {
								console.log(err);
							}
							done();
						});
					});
				});
			});
		} else {
			console.log("hello");
			done();
		}
    });
});



