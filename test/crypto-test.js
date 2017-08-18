/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This test is for unit-testing the encryption feature in the framework.
 * The test involves creating a test model with a property marked as
 * "encrypted: true", inserting a record into the model, fetching the same
 * by directly accessing the DB (bypassing the framework) as well as
 * using the framework. For a successful test, the original property value
 * should not match the value retrieved by directly accessing the DB, but it
 * should match the value retrieved using the framework.
 * 
 * Author: Ajith Vasudevan 
 */


var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var expect = chai.expect;
var app = bootstrap.app;
var models = bootstrap.models;
var loopback = require('loopback');
var MongoClient = require('mongodb').MongoClient;
var debug = require('debug')('crypto-test');
var mongoHost = process.env.MONGO_HOST || 'localhost';
var postgresHost = process.env.POSTGRES_HOST || 'localhost';

describe('crypto Test', function() {
    var modelName = 'CryptoTest';
    var dsname = 'db';
    var dbname = process.env.DB_NAME || dsname;
    var ccNo = "1234-5678-9012-3456";

    var TestModelSchema = {
        'creditCardNo': {
            'type': 'string',
            'encrypt': true,
            'required': true
        }
    };
    var opts = {
        strict: true,
        base: 'BaseEntity',
        plural: modelName + "s",
        mixins: {
            "CryptoMixin": true,
        },
        dataSourceName: dsname
    };


    var TestModel = null;
    var result1, result2 = null;
    var id;


    before('Create Test Model and do crypto test', function(done) {
        this.timeout(200000);
        // Get a datasource
        var dataSource = app.datasources[dsname];
        proceed0(dataSource.name, done);
    });

    function proceed0(dataSourceName, done) {
        // Create a TestModel
        TestModel = loopback.createModel(modelName, TestModelSchema, opts);
        app.model(TestModel, {
            dataSource: dsname
        });
        TestModel.destroyAll({}, bootstrap.defaultContext, function(err, info) {
            proceed(dataSourceName, done);
        });
    }


    // Create a record in TestModel with encryption enabled on a field, and 
    // fetch the inserted record using standard framework API
    // and get the value of the encrypted field
    function proceed(dataSourceName, done) {
        // Add a record
        TestModel.create({
            creditCardNo: ccNo
        }, bootstrap.defaultContext, function(err, data) {
            if (err) {
                done();
            } else {
                id = data.id;
                debug("id", id);
                TestModel.findById(id, bootstrap.defaultContext, function(err1, data1) {
                    if (err1) {
                        done(err1);
                    } else {
                        debug("data1", data1);
                        result1 = data1.creditCardNo;
                        debug('result1', result1);
                        proceed2(dataSourceName, done);
                    }
                });
            }
        });
    }


    // Fetch the inserted record directly from DB using MongoDB API 
    // and get the value of the encrypted field
    function proceed2(dataSourceName, done) {
        if (dataSourceName === 'mongodb') {
            var url = 'mongodb://' + mongoHost + ':27017/' + dbname;
            MongoClient.connect(url, function(err, db) {
                if (err) {
                    done(err);
                } else {
                    var collection = db.collection(modelName);
                    collection.findOne({
                        _id: id
                    }, function(err2, data2) {
                        if (err2) {
                            done(err2);
                        } else {
                            debug('data2', data2);
                            result2 = data2 && data2.creditCardNo;
                            debug('result2', result2);
                            done();
                        }
                    });
                }
            });
        } else {
            var connectionString = "postgres://postgres:postgres@" + postgresHost + ":5432/" + dbname;
            var pg = require('pg');
            var client = new pg.Client(connectionString);
            client.connect(function(err) {
                if (err) {
                    done(err);
                } else {
                    // console.log("Connected to Postgres server");
                    var query = client.query("SELECT * from " + modelName.toLowerCase(), function(err2, data2) {
                        if (err2) {
                            done(err2);
                        } else {
                            debug('data2', data2);
                            result2 = data2.rows && data2.rows[0].creditcardno;
                            debug('result2', result2);
                            done();
                        }
                    });
                }
            });
        }
    }


    after('Cleanup', function(done) {
        TestModel.destroyAll({}, bootstrap.defaultContext, function(err, info) {
            if (err) {
                console.log(err, info);
            }
            done();
        });
    });


    it('Should encrypt the creditCardNo field in TestModel when "encrypt" is set to "true"', function(done) {
        expect(models[modelName]).not.to.be.null;
        expect(result1).not.to.be.null;
        expect(result2).not.to.be.null;
        expect(ccNo).to.equal(result1);
        expect(result1).to.not.equal(result2);
        done();
    });

});