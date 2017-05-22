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

describe(chalk.blue('Update of record belonging to default tenant'), function () {
    this.timeout(40000);
    var modelName = 'DefaultTenantUpdateTestModel';
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
        fetchAllScopes : true
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

    it('Update default tenant record using PUT without ID ', function (done) {
        var data = {
            name: 'Test1',
            description: 'default tenant',
            discount: 20
        }
        TestModel.create(data, defaultTenantContext, function (err, rec) {
            expect(rec).to.be.ok;
            var url = bootstrap.basePath + '/' + modelName + '?access_token=' + accessToken;
            var data = rec.toObject();
            data.discount = 40;
            api
                .put(url)
                .send(data)
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .end(function (err, result) {
                    if (err) {
                        done(err);
                    } else {
                        // It should create a different record
                        // with a new ID
                        expect(result.status).to.be.equal(200);
                        expect(result.body).to.be.ok;
                        expect(result.body.id).not.to.be.equal(data.id);
                        done();
                    }
                });
        });
    });

    // This is bug in juggler this must be fixed
    it('Update default tenant record using PUT with ID ', function (done) {
        var data = {
            name: 'Test2',
            description: 'default tenant',
            discount: 20
        }

        TestModel.create(data, defaultTenantContext, function (err, rec) {
            expect(rec).to.be.ok;
            var url = bootstrap.basePath + '/' + modelName + '/' + rec.id + '?access_token=' + accessToken;
            var data = rec.toObject();
            data.discount = 40;
            api
                .put(url)
                .send(data)
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .end(function (err, result) {
                    if (err) {
                        done(err);
                    } else {
                        expect(result.status).to.be.equal(404);
                        done();
                    }
                });
        });
    });

});