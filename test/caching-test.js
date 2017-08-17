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
 * the DB (bypassing the framework, so that cache is not evicted), fetching the 
 * record again to see that the records are still fetched (from cache).
 * 
 *  Author: Ajith Vasudevan
 */


var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var uuid = require('node-uuid');
var expect = chai.expect;
var app = bootstrap.app;
var models = bootstrap.models;
var api = bootstrap.api;
var loopback = require('loopback');
var debug = require('debug')('caching-test');
var config = require('../server/config');
var MongoClient = require('mongodb').MongoClient;
var mongoHost = process.env.MONGO_HOST || 'localhost';
var postgresHost = process.env.POSTGRES_HOST || 'localhost';
var accessToken = null;
var oracleHost = process.env.ORACLE_HOST || 'localhost';
var oraclePort = process.env.ORACLE_PORT || 1521;
var oracleService = process.env.ORACLE_SID || 'orclpdb.ad.infosys.com';
var oracleUser = process.env.ORACLE_USERNAME || 'oeadmin';
var oraclePassword = process.env.ORACLE_PASSWORD || 'oeadmin';


describe('Caching Test', function () {
    this.timeout(20000);
    var modelName = 'CachingTest';
    var TestModel = null;
    var dsname = 'db';
    var dbname = dsname;

    var result1, result2 = null;
    var id, dataSource;
    var i = 1;


    function apiPostRequest(url, postData, callback, done) {
        var version = uuid.v4();
        postData._version = version;
        api
            .set('Accept', 'application/json')
            .post(bootstrap.basePath + url + '?access_token=' + accessToken)
            .send(postData)
            .end(function (err, res) {
                if (err || res.body.error) {
                    return done(err || (new Error(JSON.stringify(res.body.error))));
                } else {
                    return callback(res, done);
                }
            });
    }

    function apiGetRequest(url, callback, done) {
        var version = uuid.v4();
        api
            .set('Accept', 'application/json')
            .get(bootstrap.basePath + url + '?access_token=' + accessToken)
            .send()
            .end(function (err, res) {
                if (err || res.body.error) {
                    return done(err || (new Error(JSON.stringify(res.body.error))));
                } else {
                    return callback(res, done);
                }
            });
    }

    // Create a record in TestModel with caching enabled and 
    // fetch the inserted record using standard framework API,
    // so that it gets cached
    function stage1_creat(done) {
        id = uuid.v4();
        apiPostRequest('/' + modelName + 's/', { "name": "Ajith" + i++, "id": id }, stage2_find, done);
    }

    function stage2_find(result, done) {
        apiGetRequest('/' + modelName + 's/' + id, stage3_updateDB, done);
    };

    function stage3_updateDB(result, done) {
        result1 = result;
        if (dataSource.name === 'mongodb') {
            MongoClient.connect('mongodb://' + mongoHost + ':27017/db', function (err, db) {
                if (err) return done(err);
                else {
                    db.collection(modelName).update({ "_id": id }, { $set: { name: "value2" } }, { upsert: true }, function (err) {
                        if (err) return done(err);
                        else stage4_find(result, done);
                    });
                }
            });
        } else if (dataSource.name === 'oracle') {
            var oracledb = require('oracledb');
            oracledb.autoCommit = true;
            let loopbackModelNoCache = loopback.getModel(modelName);
            let idFieldName = loopbackModelNoCache.definition.idName();
            oracledb.getConnection({
                "password": oraclePassword,
                "user": oracleUser,
                "connectString": oracleHost + ":" + oraclePort + "/" + oracleService
            }, function (err, connection) {
                if (err) {
                    return done(err);
                }
                connection.execute(
                    "UPDATE " + modelName.toLowerCase() + " SET name = 'value2' WHERE " + idFieldName + " = '" + id + "'",
                    function (error, result) {
                        if (error) {
                            return done(error);
                        }
                        debug("Number of records removed " + result.rowsAffected);
                        stage4_find(result, done);
                    });
            });
        } else {
            var loopbackModelNoCache = loopback.getModel(modelName);
            var idFieldName = loopbackModelNoCache.definition.idName();
            var connectionString = "postgres://postgres:postgres@" + postgresHost + ":5432/" + dbname;
            var pg = require('pg');
            var client = new pg.Client(connectionString);
            client.connect(function (err) {
                if (err) done(err);
                else {
                    //var query = client.query("DELETE from " + modelName.toLowerCase(), function(err,result){
                    var query = client.query("UPDATE " + modelName.toLowerCase() + " SET name = 'value2' WHERE " + idFieldName + " = '" + id + "'", function (err, result) {
                        if (err) {
                            return done(err);
                        }
                        debug("Number of records removed " + result.rowCount);
                        stage4_find(result, done);
                    });
                }
            });
        }
    }

    function stage4_find(result, done) {
        apiGetRequest('/' + modelName + 's/' + id, stage5_saveResult, done);
    };

    function stage5_saveResult(result, done) {
        result2 = result;
        done();
    }

    before('Create Test Model and do cache test', function (done) {
        // Temporarily enable Caching (will be disabled in the "after()" function
        config.disablecaching = false;
        // Get a datasource
        dataSource = app.datasources[dsname];
        // eslint-disable-next-line
        console.log("\n\n===============>>", dataSource.name);

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

        // Create a TestModel and attache it to the dataSource
        TestModel = loopback.createModel(modelName, TestModelSchema, opts);
        TestModel.clientModelName = modelName;
        TestModel.clientPlural = modelName + 's';
        app.model(TestModel, { dataSource: dsname });
        TestModel.attachTo(dataSource);

        // Delete all records in the table associated with this TestModel
        TestModel.destroyAll({}, bootstrap.defaultContext, function (err, info) {
            if (err) {
                console.log('caching test clean up ', err, info);
            }
            done();
        });
    });

    before('login using admin', function fnLogin(done) {
        var sendData = {
            'username': 'admin',
            'password': 'admin'
        };

        api
            .set('x-evproxy-db-lock', '1')
            .post(bootstrap.basePath + '/BaseUsers/login')
            .send(sendData)
            .expect(200).end(function (err, res) {
                if (err) {
                    log.error(log.defaultContext(), err);
                    return done(err);
                } else {
                    accessToken = res.body.id;
                    return done();
                }
            });
    });

    describe('Caching Test - when dblock off', function () {
        before('Run test', function (done) {
            // eslint-disable-next-line
            console.log("\n\n----------->>", dataSource.name);
            api.set('x-evproxy-db-lock', '0');
            stage1_creat(done);
        });

        it('Should cache the TestModel when cacheable is set to "true"', function (done) {
            expect(models[modelName]).not.to.be.null;
            expect(result1).not.to.be.null;
            expect(result2).not.to.be.null;
            expect(result1.body).to.deep.equal(result2.body);
            done();
        });

    });

    describe('Caching Test - when dblock on', function () {

        before('set the dbLock header', function (done) {
            id = result1 = result2 = null;
            api.set('x-evproxy-db-lock', '1');
            stage1_creat(done);
        });

        it('Should not use cache when when dblock on', function (done) {
            if (result1.body.name !== result2.body.name) return done();
            else return done(new Error("The query was cached although dblock is on"));
        });

        after('unset the dbLock header', function (done) {
            api.set('x-evproxy-db-lock', '0');
            return done();
        });
    });

    after('Cleanup', function (done) {
        config.disablecaching = true;
        TestModel.destroyAll({}, bootstrap.defaultContext, function (err, info) {
            if (err) {
                console.log(err, info);
            }
            done();
        });
    });

});
