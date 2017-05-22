/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var api = bootstrap.api;
var models = bootstrap.models;
var loopback = require('loopback');
var async = require('async');
var app = bootstrap.app;

describe(chalk.blue('Manual Scope Update'), function () {
    this.timeout(400000);
    var modelName = 'ManualScopeUpdate';
    var modelDetails = {
        name: modelName,
        base: 'BaseEntity',
        properties: {
            'name': {
                'type': 'string',
                'unique': true
            },
            'description': {
                'type': 'string'
            },
            'discount': {
                'type': 'number',
                'default': 10
            }
        },
        strict: false,
        idInjection: true,
        plural: modelName
    };

    var TestModel;

    var defaultTenantContext = {
        ctx: {
            tenantId: 'default',
            remoteUser: 'system'
        }
    };

    var allScopes = {
        ctx: {
            tenantId: 'test-tenant',
            remoteUser: 'test-user'
        },
        fetchAllScopes: true
    };

    var accessToken;

    before('Create model', function (done) {
        var query = {
            where: {
                name: modelName
            }
        };
        models.ModelDefinition.findOrCreate(query, modelDetails, defaultTenantContext, function (err, res, created) {
            TestModel = loopback.findModel(modelName);
            TestModel.purge({}, allScopes, function (err, info) {
                done();
            });
        });
    });

    before('Create Access Token', function (done) {
        // accessToken belongs to test-tenant
        // createAccessToken uses test-tenant
        var user = bootstrap.defaultContext.ctx.remoteUser.username;
        bootstrap.createAccessToken(user, function (err, token) {
            accessToken = token;
            done();
        });
    });

    it('Create and then update manual scope ', function (done) {
        var data = {
            name: 'Test1',
            description: 'No Scope',
            discount: 20
        }
        var url = bootstrap.basePath + '/' + modelName + '?access_token=' + accessToken;
        api.post(url)
            .send(data)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .end(function (err, result) {
                expect(result.status).to.be.equal(200);
                var rec1 = result.body;
                url = bootstrap.basePath + '/' + modelName + '/' + rec1.id + '?access_token=' + accessToken;
                var changedData = {
                    discount: 40,
                    _version: rec1._version,
                    scope: {
                        dimension: 'long'
                    }
                };
                api.put(url)
                    .send(changedData)
                    .set('Content-Type', 'application/json')
                    .set('Accept', 'application/json')
                    .end(function (err, result) {
                        if (err) {
                            done(err);
                        } else {
                            expect(result.status).to.be.equal(200);
                            expect(result.body).to.be.ok;
                            var rec2 = result.body;
                            expect(rec2.id).to.be.equal(rec1.id);
                            expect(rec2.scope.dimension).to.be.equal('long');
                            changedData = {
                                discount: 60,
                                _version: rec2._version,
                                scope: {
                                    dimension: 'small'
                                }
                            };
                            api
                                .put(url)
                                .send(changedData)
                                .set('Content-Type', 'application/json')
                                .set('Accept', 'application/json')
                                .set('dimension', 'long')
                                .end(function (err, result) {
                                    if (err) {
                                        done(err);
                                    } else {
                                        expect(result.status).to.be.equal(200);
                                        expect(result.body).to.be.ok;
                                        var rec3 = result.body;
                                        expect(rec3.id).to.be.equal(rec1.id);
                                        expect(rec3.scope.dimension).to.be.equal('small');

                                        done();
                                    }
                                });
                        };
                    });
            });
    });
});