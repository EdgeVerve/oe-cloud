/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;
var loopback = require('loopback');
var models = bootstrap.models;
var app = bootstrap.app;
var chai = require('chai');
chai.use(require('chai-things'));
var api = bootstrap.api;
var debug = require('debug')('model-definition-test');


describe(chalk.blue('model-definition - Programmatic'), function () {
    after('cleaning up', function (done) {
        models.ModelDefinition.destroyAll({}, bootstrap.defaultContext, function (err, result) { 
            console.log('Clean Up - Destroyed ModelDefinition');
            done();
        });
    });

    it('should programmatically create a new model and make it available in app', function (done) {

        var modelName = 'ShoppingCartTestP';

        models.ModelDefinition.create({
            name: modelName,
            base: 'BaseEntity',
            properties: {
                'name': {
                    'type': 'string',
                    'required': true
                },
                'id': {
                    'type': 'string',
                    'required': true
                }
            },
            filebased: false
        }, bootstrap.defaultContext, function (err, model) { 
            if (err) {
                console.log(err);
                done(err);
            } else {
                // There should not be any error while adding the new model metadata to the ModelDefinition table
                expect(err).to.be.not.ok;
                // The new model should be created in Loopback
                expect(app.models[modelName]).not.to.be.null; 
                done();
            }
        });

    });
});


describe(chalk.blue('model-definition - REST'), function () {

    after('cleaning up', function (done) {
        models.ModelDefinition.destroyAll({}, bootstrap.defaultContext, function (err, result) { 
            console.log('Clean Up - Destroyed ModelDefinition');
            done();
        });
    });

    it('should RESTfully create a new model and make it available in app', function (done) {
        var modelName = 'ShoppingCartTestR';
        var modelDefitnionUrl = bootstrap.basePath + '/ModelDefinitions';

        var postData = {
            name: modelName,
            base: 'BaseEntity',
            properties: {
                'name': {
                    'type': 'string',
                    'required': true
                }
            }
        };

        api
            .post(modelDefitnionUrl)
            .send(postData)
            .expect(200).end(function (err, res) {
                if (err) {
                    console.log(err);
                    done(err);
                } else {
                    debug('response body : ' + JSON.stringify(res.body, null, 4));
                    expect(res.body.name).to.be.equal(modelName);
                    done();
                }
            });
    });

});


describe(chalk.blue('tenant-model-definition - REST'), function () {

    //var modelDefitnionUrl  = bootstrap.basePath + '/ModelDefinitions';
    var tenantID;
    var tenant = 'tenantTest';
    var modelName = 'ShoppingCartTestR';
    var plural = 'ShoppingCartTestRs';

    this.timeout(15000);

    before('setup --for tenant name added with model name', function (done) {
        var url = bootstrap.basePath + '/Tenants';
        var tenantDetails = {
            'tenantId': tenant,
            'tenantName': 'Testtenant',
            'datasourceName': 'db'
        };
        api
            .post(url)
            .send(tenantDetails)
            .expect(200).end(function (err, res) {
                if (err) {
                    console.log(err);
                    done(err);
                } else {
                    tenantID = res.body.id;
                    done();
                }
            });
    });

    after('cleaning up', function (done) {
        var model = loopback.getModel('ModelDefinitionHistory');
        if (model) {
            model.destroyAll({}, bootstrap.defaultContext, function (err, info) { 
                //console.log('model-definition-ACL-test    clean up - ModelDefinitionHistory');
            });
        }

        var model2 = loopback.getModel(modelName + 'History');
        if (model2) {
            model2.destroyAll({}, bootstrap.defaultContext, function (err, info) { 
                //console.log('model-definition-ACL-test    clean up - '+modelName+'History');
            });
        }

        models.ModelDefinition.destroyAll({}, bootstrap.defaultContext, function (err, result) { 
            models.Tenant.destroyAll({}, bootstrap.defaultContext, function (err) {
                if (err) {
                    console.log(err);
                } 
                models[modelName].destroyAll({}, bootstrap.defaultContext, function (err, info) { 
                    done();

                });
            });
        });
    });

    it('should RESTfully create a new model with tenant as tenantId and make it available in app', function (done) {
        var modelDefitnionUrl = bootstrap.basePath + '/ModelDefinitions';

        var postData = {
            name: modelName,
            base: 'BaseEntity',
            plural: plural,
            properties: {
                'name': {
                    'type': 'string',
                    'required': true
                }
            }
        };

        api
            .post(modelDefitnionUrl)
            .set('tenant_id', tenant)
            .send(postData)
            .expect(200).end(function (err, res) {
                if (err) {
                    console.log(err);
                    done(err);
                } else {
                    debug('response body : ' + JSON.stringify(res.body, null, 4));
                    expect(res.body.name).to.be.equal(modelName);
                    //console.log(res.body);
                    done();
                }
            });
    });

    it('should insert data into new model with context set, and url without tenant', function (done) {
        var Url = bootstrap.basePath + '/' + plural;

        var postData = {
            'name': 'test Data'
        };

        api
            .post(Url)
            .set('tenant_id', tenant)
            .send(postData)
            .expect(200).end(function (err, res) {
                if (err) {
                    console.log(err);
                    done(err);
                } else {
                    debug('response body : ' + JSON.stringify(res.body, null, 4));
                    expect(res.body.name).to.be.equal(postData.name);
                    done();
                }
            });
    });

    it('should get all records without setting context and url with tenant', function (done) {
        var Url = bootstrap.basePath + '/' + plural;

        api
            .get(Url)
            .set('tenant_id', 'tenantTest')
            .send()
            .expect(200).end(function (err, res) {
                if (err) {
                    console.log(err);
                    done(err);
                } else {
                    debug('response body : ' + JSON.stringify(res.body, null, 4));
                    expect(res.body).to.have.length(1);
                    //console.log(res.body);
                    done();
                }
            });
    });

});
