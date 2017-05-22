/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This test is for unit-testing the query result caching feature in the framework.
 * The test involves creating a test model, inserting a record into it, fetching the 
 * record (so that it caches), deleting the record from the database by directly accessing
 * the DB (bypassing the framework, so that cache is not ecicted), fetching the 
 * record again to see that the records are still fetched (from cache).
 * 
 *  Author: Ajith Vasudevan
 */


var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var expect = chai.expect;
var app = bootstrap.app;
var models = bootstrap.models;
var loopback = require('loopback');
var debug = require('debug')('caching-test');
var config = require('../server/config');
var MongoClient = require('mongodb').MongoClient;
var mongoHost = process.env.MONGO_HOST || 'localhost';
var postgresHost = process.env.POSTGRES_HOST || 'localhost';

describe('Caching Test', function () {

    var modelName = 'CachingTest';
    var dsname = 'db';
    var dbname = dsname;

    var TestModelSchema = {
        'name': {
            'type': 'string',
            'required': true
        }
    };
    var opts = {
        strict: true,
        plural: modelName + "s",
        base: 'BaseEntity',
        cacheable: true
    };


    var TestModel = null;
    var result1, result2 = null;
    var id, dataSource;

    before('Create Test Model and do cache test', function (done) {
        this.timeout(20000);
        // Temporarily enable Caching (will be disabled in the "after()" function
        config.disablecaching = false;
        // Get a datasource
        dataSource = app.datasources[dsname];

        // Create a TestModel and attache it to the dataSource
        TestModel = loopback.createModel(modelName, TestModelSchema, opts);
        app.model(TestModel, {
            dataSource: dsname
        });
        TestModel.attachTo(dataSource);

        // Delete all records in the table associated with this TestModel
        TestModel.destroyAll({}, bootstrap.defaultContext, function (err, info) {
            if (err) {
                console.log('caching test clean up ', err, info);
            }
            proceed(dataSource.name,done);
        });
    });

    // Create a record in TestModel with caching enabled and 
    // fetch the inserted record using standard framework API,
    // so that it gets cached
    function proceed(dataSourceName,done) {
        // Add a record
        TestModel.create({
            name: "Ajith"
        }, bootstrap.defaultContext, function (err, data) {
            if (err) {
                console.log(err);
                done();
            } else {
                id = data.id;
                debug("Record created: id", id);
                TestModel.find({
                    "where": {
                        "id": id
                    }
                }, bootstrap.defaultContext, function (err1, data1) {
                    if (err1) {
                        console.log(err1);
                        done(err1);
                    } else {
                        result1 = data1;
                        debug('Found records: result1', result1);
                        proceed2(dataSourceName,done);
                    }
                });
            }
        });
    }


    // Delete the new record directly from DB using MongoDB API,
    // bypassing cache eviction
    function proceed2(dataSourceName,done) {
        if (dataSourceName === 'mongodb') {
            var url = 'mongodb://' + mongoHost + ':27017/' + dbname;
            MongoClient.connect(url, function (err, db) {
                if (err) {
                    done(err);
                } else {
                    // console.log("Connected to mongod server");
                    db.collection(modelName).remove({}, function (err, numberRemoved) {
                        if (err) {
                            done(err);
                        }
                        debug("Number of records removed " + numberRemoved);
                        proceed3(done);
                    });
                }
            });
        } else {
            var connectionString = "postgres://postgres:postgres@" + postgresHost + ":5432/" + dbname;
            var pg = require('pg');
            var client = new pg.Client(connectionString);
            client.connect(function (err) {
                if (err) {
                    done(err);
                } else {
                    // console.log("Connected to Postgres server");
                    var query = client.query("DELETE from " + modelName.toLowerCase(),function(err,result){
                         if (err) {
                            done(err);
                        }
                        debug("Number of records removed " + result.rowCount);
                        proceed3(done);
                    });
                }
            });
        }
    }

    // Fetch the record with same filter condition
    function proceed3(done) {
        TestModel.find({
            "where": {
                "id": id
            }
        }, bootstrap.defaultContext, function (err2, data2) {
            if (err2) {
                console.log(err2);
                done(err2);
            } else {
                result2 = data2;
                debug('result2', result2);
                done();
            }

        });
    }

    after('Cleanup', function (done) {
        config.disablecaching = true;
        TestModel.destroyAll({}, bootstrap.defaultContext, function (err, info) {
            if (err) {
                console.log(err, info);
            }
            done();
        });
    });


    it('Should cache the TestModel when cacheable is set to "true"', function (done) {
        expect(models[modelName]).not.to.be.null;
        expect(result1).not.to.be.null;
        expect(result2).not.to.be.null;
        expect(result1).to.deep.equal(result2);
        done();
    });

});
