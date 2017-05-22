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
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var baseUrl = bootstrap.basePath;

function GenerateModelName(model) {
    return model + Math.floor(Math.random() * (999));
}

describe(chalk.blue('model-variant-of'), function() {

    var accessTokens = {};

    var tenantId = GenerateModelName('tenant');
    var productModelName = GenerateModelName('Product');

    var user1 = {
        'username': 'foo',
        'password': 'password++',
        'email': 'foo@gmail.com',
        'tenantId': tenantId
    };

    it('login as admin', function(done) {
        var postData = {
            'username': 'admin',
            'password': 'admin'
        };
        var postUrl = baseUrl + '/BaseUsers/login';
        var api = defaults(supertest(bootstrap.app));
        api.set('Accept', 'application/json')
        .post(postUrl)
        .send(postData)
        .expect(200).end(function(err, response) {
            accessTokens.admin = response.body.id;
            done();
        });
    });

    it('Create Model', function(done) {
        var modelDefinitionData = {
                'name': productModelName,
                'plural': productModelName,
                'base': 'BaseEntity',
                'strict': false,
                'idInjection': true,
                'validateUpsert': true,
                'properties': {
                    'name': {
                        'type': 'string',
                        'unique': true
                    }
                },
                'validations': [],
                'relations': {},
                'acls': [],
                'methods': {}
            };

        var api = defaults(supertest(bootstrap.app));

        var postUrl = baseUrl + '/ModelDefinitions?access_token='  + accessTokens.admin;

        api.set('Accept', 'application/json')
        .post(postUrl)
        .send(modelDefinitionData)
        .end(function(err, response) {
            if (err) {
                done(err);
            } else {
                if (response.statusCode !== 200) {
                    console.log(response.body);
                }
                expect(response.statusCode).to.be.equal(200);
                done();
            }
        });
    });

    it('Create Tenant', function(done) {

        var tenantData = {};
        tenantData.tenantId = tenantId;
        tenantData.tenantName = tenantData.tenantId;

        var api = defaults(supertest(bootstrap.app));
        var postUrl = baseUrl + '/Tenants?access_token='  + accessTokens.admin;
        api.set('Accept', 'application/json')
        .post(postUrl)
        .send(tenantData)
        .expect(200)
        .end(function(err, response) {
            if (err) {
                done(err);
            } else {
                done();
            }
        });
    });

    it('switch tenant', function(done) {
        var data = {
            tenantId: tenantId
        };
        var api = defaults(supertest(bootstrap.app));
        var postUrl = baseUrl + '/BaseUsers/switch-tenant?access_token='  + accessTokens.admin;
        api.set('Accept', 'application/json')
        .post(postUrl)
        .send(data)
        .expect(200)
        .end(function(err, result) {
            if (err) {
                done(err);
            } else {
                expect(result.body).not.to.be.undefined;
                expect(result.body.tenantId).to.be.equal(tenantId);
                done();
            }
        });
    });

    it('Create User in tenant1', function(done) {

        var api = defaults(supertest(bootstrap.app));
        var postUrl = baseUrl + '/BaseUsers?access_token='  + accessTokens.admin;
        api.set('Accept', 'application/json')
        .post(postUrl)
        .send(user1)
        .expect(200)
        .end(function(err, resp) {
            if (err) {
                done(err);
            } else {
                done();
            }
        });
    });

    it('login as user1 in tenant1', function(done) {
        var postData = {
            'username': user1.username,
            'password': user1.password
        };
        var postUrl = baseUrl + '/BaseUsers/login';
        var api = defaults(supertest(bootstrap.app));
        api.set('Accept', 'application/json')
        .post(postUrl)
        .set('tenant_id', tenantId)
        .send(postData)
        .expect(200).end(function(err, response) {
            expect(response.body).not.to.be.undefined;
            expect(response.body.id).not.to.be.undefined;
            accessTokens.user1 = response.body.id;
            done();
        });
    });


    it('Create Variant Model', function(done) {
            var variantModel = productModelName + 'variant';
            var modelDefinitionData = {
                'name': variantModel,
                'base': productModelName,
                'variantOf': productModelName,
                'strict': false,
                'idInjection': true,
                'validateUpsert': true,
                'properties': {
                    'namevar': {
                        'type': 'string'
                    }
                },
                'validations': [],
                'relations': {},
                'acls': [],
                'methods': {}
            };

            var api = defaults(supertest(bootstrap.app));

            var postUrl = baseUrl + '/ModelDefinitions?access_token='  + accessTokens.user1;

            api.set('Accept', 'application/json')
            .post(postUrl)
            .send(modelDefinitionData)
            .end(function(err, response) {
                if (err) {
                    done(err);
                } else {
                    if (response.statusCode !== 200) {
                        console.log(response.body);
                    }
                    expect(response.statusCode).to.be.equal(200);
                    done();
                }
            });
        });

     it('should return the generated gridmetadata', function (done) {
        var api = defaults(supertest(bootstrap.app));
        var url = bootstrap.basePath + '/GridMetaData/' + productModelName + '/render' + '?access_token='  + accessTokens.user1;
         
        api
            .get(url)
            .expect(200).end(function (err, res) {
                var response = res.body;
                //console.log('gridmeta', response);
                expect(response).to.exist;
                expect(response.columnData).to.exist;
                expect(response.dialogMetaData).to.exist;
                done();
            });

    });

      it('should return the generated uimodel ', function (done) {
        var api = defaults(supertest(bootstrap.app));
        var url = bootstrap.basePath + '/UIMetaData/' + productModelName + '/render' + '?access_token='  + accessTokens.user1;
         
        api
            .get(url)
            .expect(200).end(function (err, res) {
                //var response = res.body;
                //console.log('uimetadata ', response);
                done();
            });

    });
    
    it('Post Data', function(done) {
        var postData = {
                'name': 'data1'
            };

        var api = defaults(supertest(bootstrap.app));

        var postUrl = baseUrl + '/' + productModelName + '?access_token='  + accessTokens.user1;

        api.set('Accept', 'application/json')
        .post(postUrl)
        .send(postData)
        .end(function(err, response) {
            if (err) {
                done(err);
            } else {
                if (response.statusCode !== 200) {
                    console.log(response.body);
                }
                expect(response.statusCode).to.be.equal(200);
                var callContext = {ctx :{}};
                callContext.ctx.tenantId = tenantId;
                var model = bootstrap.models[productModelName];
                model.find({}, callContext, function(err, list) {
                    expect(list[0]._autoScope.tenantId).to.be.equal(tenantId);
                    done();
                });
            }
        });
    });

});
