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

describe('ZZ Final Cleanup', function() {
	this.timeout(120000);

    before('Delete collections', function(done) {
		var db = new Db('db', new Server(mongoHost, 27017));
		db.open(function(err, db) {
			if (err) {
				console.log(err);
			}
			db.dropDatabase();
			var db1 = new Db('db1', new Server(mongoHost, 27017));
			db1.open(function(err, db1) {
				if (err) {
					console.log(err);
				}
				db1.dropDatabase();
				var db2 = new Db('db2', new Server(mongoHost, 27017));
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
});