/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/* jshint -W024 */
/* jshint expr:true */
//to avoid jshint errors for expect

var bootstrap = require('./bootstrap');
var chalk = require('chalk');
var async = require('async');
var log = require('oe-logger')('basic-test');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var loopback = require('loopback');
describe(chalk.blue('basic-test'), function () {
    this.timeout(60000);
    var testModelName = 'MyModel';
    var testModelDetails = {
        name: testModelName,
        base: 'BaseEntity',
        properties: {
            'name': {
                'type': 'string',
            },
            'description': {
                'type': 'string',
            }
        },
        dataSourceName: 'db'
    };


    var data = {
        "name": "Name1",
        "description": "OK"
    };

    var ModelDefinition = bootstrap.models.ModelDefinition;

    var iciciUser = {
        'username': 'iciciUser',
        'password': 'password',
        'email': 'iciciuser@gmail.com',
        'tenantId': 'icici'
    };

    before('create model', function (done) {
        async.series([
            function createModel(cb) {
                var model = loopback.findModel(testModelName, bootstrap.defaultContext);
                if (model) {
                    cb();
                } else {
                    ModelDefinition.create(testModelDetails, bootstrap.defaultContext, function (err, res) {
                        if (err) {
                            console.log('unable to create model ', err);
                            cb();
                        } else {
                            cb();
                        }
                    });
                }
            },
            function (cb) {
                // this line is just to test context lost problem
                bootstrap.createTestUser(iciciUser, 'admin', cb);
            },
            function alldone() {
                done();
            }
        ]);
    });

    it('create and find data ', function (done) {

        var model = loopback.getModel(testModelName, bootstrap.defaultContext);
        model.destroyAll({}, bootstrap.defaultContext, function (err, res) {
            model.create(data, bootstrap.defaultContext, function (err, res) {
                model.find({
                    "where": {
                        "name": "Name1"
                    }
                }, bootstrap.defaultContext, function (err, res) {
                    log.debug(bootstrap.defaultContext, 'verify data ', err, res);
                    expect(res[0].description).to.be.equal("OK");
                    res[0].reload(bootstrap.defaultContext, function (err, reload) {
                        expect(reload.description).to.be.equal("OK");
                        done();
                    });
                });
            });
        });
    });

    it('create with upsert', function (done) {
        var data = {
            "name": "Name2",
            "description": "Created with upsert"
        };
        var model = loopback.getModel(testModelName, bootstrap.defaultContext);
        model.upsert(data, bootstrap.defaultContext, function (err, res) {
            log.debug(bootstrap.defaultContext, ' verify data ', err, res);
            expect(res.name).to.be.equal("Name2");
            model.find({}, bootstrap.defaultContext, function (err, res) {
                expect(res.length).to.be.equal(2);
                done();
            });
        });
    });

    it('get data ', function (done) {
        bootstrap.api
            .set('Accept', 'application/json')
            .get(bootstrap.basePath + '/MyModels')
            .send()
            .expect(200).end(function (err, res) {
                //console.log('err, res ', err, res.body);
                done();
            });
    });

    it('get data using wrong tenantid ', function (done) {
        var token = bootstrap.createJWToken(iciciUser);
        var api = defaults(supertest(bootstrap.app));
        api.set('x-jwt-assertion', token)
            .set('Accept', 'application/json')
            .get(bootstrap.basePath + '/MyModels')
            .send()
            .expect(200).end(function (err, res) {
                //console.log(err, res.body);
                //expect(res.body.length).to.be.equal(0);
                done();
            });
    });

    after('after clean up', function (done) {
        var model = loopback.getModel(testModelName, bootstrap.defaultContext);
        model.destroyAll({}, bootstrap.defaultContext, function (err, info) {
            if (err) {
                done(err);
            } else {
                log.debug(bootstrap.defaultContext, 'number of record deleted -> ', info.count);
                ModelDefinition.destroyAll({
                    "name": testModelName
                }, bootstrap.defaultContext, function () {
                    done();
                });
            }
        });
    });

});
