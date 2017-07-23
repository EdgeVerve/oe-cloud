/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries. 
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/
/**
 * This file tests ModelRule model and functionality of declaratively adding validation rule to model.
 * The test cases are ran against both Node API's and REST api's as well.
 * 1) creating ModelRule->modelName with non existent model should throw error.
 * 2) create with valid data should be succesfull.
 * 3) data without mandatory property value defined in rule throw validation error.
 * 4) data without mandatory property value defined in rule and loopback validations throw combined validation errors.
 * 5) update model rule and POST data should work.
 * @author Pradeep Kumar Tippa
 */
var fs = require('fs');
var path = require('path');

var async = require('async');
var chai = require('chai');
var chaiThings = require('chai-things');
var chalk = require('chalk');
var logger = require('oe-logger');
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var loopback = require('loopback');
var bootstrap = require('./bootstrap');

var app = bootstrap.app;
var expect = bootstrap.chai.expect;
var log = logger('model-rule-test');
var models = bootstrap.models;

var decisionTableRules = ['PropertyPopulator', 'PropertyPopulatorOne', 'validation'] // Files in mode-rule-data folder should be of same name.
var testModelName = 'ModelRuleTest';
var testModelPlural = 'ModelRuleTests';
// Model with base as PersistedModel
var testModelAsBasePM = 'ModelWithBasePM';

var testModel;
var testModelWithBase;

// Model id and _version required for doing upsert
var modelRuleId, modelRuleVersion;
chai.use(chaiThings);

describe(chalk.blue('model-rule-test'), function () {
    before('create the temporary model.', function (done) {
        // Forming model metadata
        var data = [{
            name: testModelName,
            base: 'BaseEntity',
            plural: testModelPlural,
            properties: {
                status: {
                    type: 'string',
                    max: 8
                },
                age: {
                    type: 'number',
                    max: 50
                },
                married: 'boolean',
                sex: 'string',
                husband_name: 'string',
                phone: 'number',
                email: 'string'
            }
        }, {
            name: testModelAsBasePM,
            base: 'PersistedModel',
            properties: {
                name: 'string'
            }
        }];
        // Creating Model in Loopback.
        models.ModelDefinition.create(data, bootstrap.defaultContext, function (err, models) {
            testModel = loopback.getModel(testModelName, bootstrap.defaultContext);
            testModelWithBase = loopback.getModel(testModelAsBasePM, bootstrap.defaultContext);
            done(err);
        });
    });

    before('create decision tables.', function (done) {
        // Population Decision Table rules.
        var decisionTablesData = [];
        async.each(decisionTableRules, function (rule, callback) {
            var obj = {
                name: rule,
                document: {
                    documentName: rule + ".xlsx",
                    documentData: "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,"
                }
            };
            fs.readFile(path.join(__dirname, 'model-rule-data', obj.document.documentName), function (err, data) {
                if (err) {
                    log.error(log.defaultContext(), 'before->create decision tables for rule ', rule, ' error: ', err);
                    callback(err);
                } else {
                    obj.document.documentData = obj.document.documentData + data.toString('base64');
                    decisionTablesData.push(obj);
                    callback();
                }
            });
        }, function (ruleErr) {
            if (ruleErr) {
                log.error(log.defaultContext(), 'async.each->decisionTableRules final callback. Error: ', ruleErr);
                done(err);
            } else {
                // TODO : POST the array once defect of POST with array is fixed.
                // Creating Desicion Table rules.
                async.each(decisionTablesData, function (decisionTable, callback) {
                    models.DecisionTable.create(decisionTable, bootstrap.defaultContext, function (err, res) {
                        if (err) log.error(log.defaultContext(), 'async.each->decisionTablesData->models.DecisionTable.create ',
                            'decisionTable ', decisionTable.name, ' Error: ', err);
                        callback(err);
                    });
                }, function (decisionTableErr) {
                    if (decisionTableErr) log.error(log.defaultContext(), 'async.each->decisionTablesData->final callback Error: ', decisionTableErr);
                    done(decisionTableErr);
                });
            }
        });
    });

    before('create model rules.', function (done) {
        var objs = [{
            modelName: testModelName,
            defaultRules: [decisionTableRules[0], decisionTableRules[1]],
            validationRules: [decisionTableRules[2]]
        }, {
            modelName: testModelAsBasePM,
            defaultRules: [],
            validationRules: []
        }]
        models.ModelRule.create(objs, bootstrap.defaultContext, function (err, modelRules) {
            modelRuleId = modelRules[0].id;
            modelRuleVersion = modelRules[0]._version;
            done(err);
        });
    });

    describe('From Node API', function () {
        it('creating ModelRule->modelName with non existent model should throw error.', function (done) {
            models.ModelRule.create({ modelName: 'NonExistentModel' }, bootstrap.defaultContext, function (err, res) {
                expect(err).not.to.be.null;
                expect(err).not.to.be.undefined;
                done();
            });
        });

        it('create with valid data should be succesfull.', function (done) {
            //var model = loopback.findModel(testModelName);
            var data = {
                status: 'entered',
                age: 50,
                husband_name: 'Robin'
            };
            // The default Rules enrich the data
            testModel.create(data, bootstrap.defaultContext, function (err, res) {
                if (err) {
                    console.error("model-rule-test Error ", err);
                    done(err);
                } else {
                    expect(res).not.to.be.null;
                    expect(res).not.to.be.undefined;
                    expect(res.sex).to.be.equal('F');
                    expect(res.married).to.be.equal(true);
                    expect(res.phone).to.be.equal(1234);
                    expect(res.email).to.be.equal('abc');
                    done();
                }
            });
        });

        it('data without mandatory property value defined in rule throw validation error.', function (done) {
            var data = {
                status: 'entered',
                age: 45
            };
            // There is a validation rule saying husband_name is mandatory in validation.xlsx
            testModel.create(data, bootstrap.defaultContext, function (err, res) {
                expect(err.details.codes.DecisionTable[0]).to.be.equal('err-husband-name-presence');
                done();
            });
        });

        it('data without mandatory property value defined in rule and loopback validations throw combined validation errors.', function (done) {
            var data = {
                status: 'entered', //morethan8chars
                age: 60
            };
            // There is a validation rule saying husband_name is mandatory in validation.xlsx
            // and age is out of range ModelDefinition
            testModel.create(data, bootstrap.defaultContext, function (err, res) {
                var errors = JSON.parse(JSON.stringify(err.details.codes));
                var errCodes = [];
                Object.keys(errors).forEach(function (v, k) {
                    errCodes = errCodes.concat(errors[v]);
                });
                expect(errCodes.indexOf('validation-err-002')).not.to.be.equal(-1);
                expect(errCodes.indexOf('err-husband-name-presence')).not.to.be.equal(-1);
                /*
                // When trying the below way getting the error from node.
                // (node:15587) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 1): TypeError: Cannot read property 'push' of null
                expect(err.details.messages.errs.find(function(err){
                    return err.code === 'validation-err-002' && err.path === (testModelName+'->age')
                })).to.be.equal(true);*/
                done();
            });
        });

    });

    describe('From REST API', function () {
        var accessToken;
        var api = defaults(supertest(app));
        var baseUrl = bootstrap.basePath;

        before('Getting Access Token', function (done) {
            bootstrap.login(function (resAccessToken) {
                accessToken = resAccessToken;
                done();
            });
        });

        it('creating ModelRule->modelName with non existent model should throw error.', function (done) {
            var url = baseUrl + '/ModelRules?access_token=' + accessToken;
            var postData = { modelName: 'NonExistentModel' };
            api
                .set('tenant_id', 'test-tenant')
                .set('Accept', 'application/json')
                .post(url)
                .send(postData)
                .expect(500)
                .end(function (err, response) {
                    if (err) {
                        log.error(log.defaultContext(), 'create non existent model rest api Error: ', err);
                    }
                    expect(response.body.error.status).to.be.equal(500);
                    done();
                });
        });

        it('create with valid data should be succesfull.', function (done) {
            var url = baseUrl + '/' + testModelPlural + '?access_token=' + accessToken;
            var postData = {
                status: 'entered',
                age: 50,
                husband_name: 'Hopper'
            };

            api
                .set('tenant_id', 'test-tenant')
                .set('Accept', 'application/json')
                .post(url)
                .send(postData)
                .expect(200)
                .end(function (err, response) {
                    if (err) {
                        log.error(log.defaultContext(), 'create with valid data should be succesfull model rest api Error: ', err);
                    }
                    expect(response).not.to.be.null;
                    expect(response).not.to.be.undefined;
                    expect(response.body).not.to.be.null;
                    expect(response.body).not.to.be.undefined;
                    expect(response.body.sex).to.be.equal('F');
                    expect(response.body.married).to.be.equal(true);
                    expect(response.body.phone).to.be.equal(1234);
                    expect(response.body.email).to.be.equal('abc');
                    done();
                });
        });

        it('data without mandatory property value defined in rule throw validation error.', function (done) {
            var url = baseUrl + '/' + testModelPlural + '?access_token=' + accessToken;
            var postData = {
                status: 'entered',
                age: 45
            };
            // There is a validation rule saying husband_name is mandatory in validation.xlsx
            api
                .set('tenant_id', 'test-tenant')
                .set('Accept', 'application/json')
                .post(url)
                .send(postData)
                .expect(422)
                .end(function (err, response) {
                    if (err) {
                        log.error(log.defaultContext(), 'data without mandatory property value defined in rule throw validation error - rest api Error: ', err);
                    }
                    expect(response).not.to.be.null;
                    expect(response).not.to.be.undefined;
                    expect(response.body).not.to.be.null;
                    expect(response.body).not.to.be.undefined;
                    expect(response.body.error).not.to.be.undefined;
                    expect(response.body.error).not.to.be.null;
                    expect(response.body.error.details).not.to.be.undefined;
                    expect(response.body.error.details).not.to.be.null;
                    expect(response.body.error.details.codes).not.to.be.undefined;
                    expect(response.body.error.details.codes).not.to.be.null;
                    expect(response.body.error.details.codes.DecisionTable[0]).to.be.equal('err-husband-name-presence');
                    done();
                });
        });

        it('data without mandatory property value defined in rule and loopback validations throw combined validation errors.', function (done) {
            var url = baseUrl + '/' + testModelPlural + '?access_token=' + accessToken;
            var postData = {
                status: 'entered', //morethan8chars
                age: 60
            };
            // There is a validation rule saying husband_name is mandatory in validation.xlsx
            // and age is out of range ModelDefinition
            api
                .set('tenant_id', 'test-tenant')
                .set('Accept', 'application/json')
                .post(url)
                .send(postData)
                .expect(422)
                .end(function (err, response) {
                    if (err) {
                        log.error(log.defaultContext(), 'data without mandatory property value defined in rule and ' +
                            'loopback validations throw combined validation errors - rest api Error: ', err);
                    }
                    expect(response).not.to.be.null;
                    expect(response).not.to.be.undefined;
                    expect(response.body).not.to.be.null;
                    expect(response.body).not.to.be.undefined;
                    expect(response.body.error).not.to.be.undefined;
                    expect(response.body.error).not.to.be.null;
                    expect(response.body.error.details).not.to.be.undefined;
                    expect(response.body.error.details).not.to.be.null;
                    expect(response.body.error.details.codes).not.to.be.undefined;
                    expect(response.body.error.details.codes).not.to.be.null;
                    var errors = response.body.error.details.codes;
                    var errCodes = [];
                    Object.keys(response.body.error.details.codes).forEach(function (v, k) {
                        errCodes = errCodes.concat(errors[v]);
                    });
                    expect(errCodes.indexOf('validation-err-002')).not.to.be.equal(-1);
                    expect(errCodes.indexOf('err-husband-name-presence')).not.to.be.equal(-1);
                    done();
                });
        });

        // This test case has to be executed in the before delete modelRule test.
        it('update model rule and POST data should work.', function (done) {
            var obj = {
                modelName: testModelName,
                id: modelRuleId,
                _version: modelRuleVersion,
                defaultRules: [],
                validationRules: []
            };
            models.ModelRule.upsert(obj, bootstrap.defaultContext, function (err, res) {
                if (err) {
                    log.error(log.defaultContext(), 'update model rule and POST data should work. Error: ', err);
                    done(err);
                } else {
                    var postData = {
                        status: 'reborn',
                        age: 45
                    };
                    var url = baseUrl + '/' + testModelPlural + '?access_token=' + accessToken;
                    api
                        .set('tenant_id', 'test-tenant')
                        .set('Accept', 'application/json')
                        .post(url)
                        .send(postData)
                        .expect(200)
                        .end(function (err, response) {
                            expect(response).not.to.be.null;
                            expect(response).not.to.be.undefined;
                            expect(response.body).not.to.be.null;
                            expect(response.body).not.to.be.undefined;
                            expect(response.body.status).to.be.equal('reborn');
                            expect(response.body.age).to.be.equal(45);
                            done();
                        });
                }
            });
        });

        // This test case has to be executed in the end since we are deleting the one of modelRule
        it('delete model rule and POST data should work.', function (done) {
            models.ModelRule.destroyById(modelRuleId, bootstrap.defaultContext, function (err) {
                if (err) {
                    log.error(log.defaultContext(), 'delete model rule and POST data should work. Error: ', err);
                    done(err);
                } else {
                    var postData = {
                        status: 'energized',
                        age: 45
                    };
                    var url = baseUrl + '/' + testModelPlural + '?access_token=' + accessToken;
                    api
                        .set('tenant_id', 'test-tenant')
                        .set('Accept', 'application/json')
                        .post(url)
                        .send(postData)
                        .expect(200)
                        .end(function (err, response) {
                            expect(response).not.to.be.null;
                            expect(response).not.to.be.undefined;
                            expect(response.body).not.to.be.null;
                            expect(response.body).not.to.be.undefined;
                            expect(response.body.error).not.to.be.undefined;
                            expect(response.body.error).not.to.be.null;
                            expect(response.body.error.details).not.to.be.undefined;
                            expect(response.body.error.details).not.to.be.null;
                            expect(response.body.error.details.codes.status[0]).to.be.equal('validation-err-002');
                            done();
                        });
                }
            });
        });
    });

    after('cleanup data ModelDefinition', function (done) {
        var query = {
            name: {
                inq: [testModelName, testModelAsBasePM]
            }
        };
        models.ModelDefinition.destroyAll(query, bootstrap.defaultContext, function (err, count) {
            done(err);
        });
    });

    after('cleanup data Decision Tables', function (done) {
        var query = {
            name: {
                inq: decisionTableRules
            }
        };
        models.DecisionTable.destroyAll(query, bootstrap.defaultContext, function (err, count) {
            done(err);
        });
    });

    after('cleanup data ModelRule', function (done) {
        var query = {
            modelName: {
                inq: [testModelName, testModelAsBasePM]
            }
        };
        models.ModelRule.destroyAll(query, bootstrap.defaultContext, function (err, count) {
            done(err);
        });
    });

    after('cleanup test model data', function (done) {
        testModel.destroyAll({}, bootstrap.defaultContext, function (err, count) {
            done(err);
        });
    });
});
