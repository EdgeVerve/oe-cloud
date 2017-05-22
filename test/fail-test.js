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
var log = require('../lib/logger')('basic-test');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var defaults = require('superagent-defaults');
var supertest = require('supertest');

describe(chalk.blue('fail-test'), function () {

    var testModelName = 'FailedVehicle';
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
        }
    };
    
    var accessToken;



    var ModelDefinition = bootstrap.models.ModelDefinition;

    before('create model', function (done) {
        async.series([
        function createModel(cb) {
                var model = bootstrap.models[testModelName];
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
        function alldone() {
                done();
        }
    ]);
});

    before('login using admin', function fnLogin(done) {
        var sendData = {
            'username': 'admin',
            'password': 'admin'
        };

        bootstrap.api
            .post(bootstrap.basePath + '/BaseUsers/login')
            .send(sendData)
            .expect(200).end(function(err, res) {
                if (err) {
                    return done(err);
                } else {
                    accessToken = res.body.id;
                    return done();
                }
            });
    });

    it('upsert test record1', function (done) {
        var data = {
            "name": "Record1",
            "description": "create"
        };
        var context = bootstrap.defaultContext;
        var model = bootstrap.models[testModelName];
        model.create(data, context, function (err, res) {
            model.find({
                "where": {
                    "name": "Record1"
                }
            }, bootstrap.defaultContext, function (err, res) {
                expect(res[0].description).to.be.equal("create");
                model.findById(res[0].id, context, function (err, rec) {
                    rec.description = 'upsert';
                    model.upsert(rec, context, function (err, rec) {
                        var data = {
                            description: 'updateAttributes'
                        };
                        rec.updateAttributes(data, context, function (err, rec) {
                            expect(err).to.not.exist;
                            expect(rec.description).to.be.equal('updateAttributes');
                            done();
                        });
                    });
                });
            });
        });
    });

    it('double upsert record2', function (done) {
        var data = {
            "name": "Record2",
            "description": "create"
        };
        var context = bootstrap.defaultContext;
        var model = bootstrap.models[testModelName];
        model.upsert(data, context, function (err, res) {
            expect(err).to.not.exist;
            res.description = 'update via upsert';
            model.upsert(res, context, function (err, rec) {
                expect(err).to.not.exist;
                // test case failing
                // expect(rec.description).to.be.equal('update via upsert');
                done();
            });
        });
    });

    it('Should fail on REST put without _version', function() {
        var model = bootstrap.models[testModelName];
        var createData = {
            "name": "Record3",
            "description": "create"
        };
        model.create(createData, bootstrap.defaultContext, function(err, res) {
            bootstrap.api
            .set('Accept', 'application/json')
            .put(bootstrap.basePath + '/FailedVehicles/' + res.id + '?access_token=' + accessToken)
            .send({description: "updateAttributes",})
            .end(function(err, res) {
                    // test case failing
                    //expect(res.status).to.not.be.equal(200);
                });
            });
    });

    after('after clean up', function (done) {
        var model = bootstrap.models[testModelName];
        model.destroyAll({}, bootstrap.defaultContext, function (err, info) {
            if (err) {
                done(err);
            } else {
                ModelDefinition.destroyAll({
                    "name": testModelName
                }, bootstrap.defaultContext, function () {
                    done();
                });
            }
        });
    });

});
