/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * this file test, basic Post and update of a model using model definition. the
 * model could be with or without properties, can two model with same name or
 * plural be posted etc.
 *
 * @author sivankar jain
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;
var loopback = require('loopback');
var models = bootstrap.models;
var modelDefitnionUrl = bootstrap.basePath + '/ModelDefinitions';
var log = require('../lib/logger')('model-definition-test');


var chai = require('chai');
chai.use(require('chai-things'));
var api = bootstrap.api;

//var uuid = require('node-uuid');
var debug = require('debug')('model-definition-test');

describe(chalk.blue('model-definition-test'), function () {
    this.timeout(20000);
    after('destroy context', function (done) {
        var model = loopback.getModel('ModelDefinitionHistory');
        if (model) {
            model.destroyAll({}, bootstrap.defaultContext, function (err, info) {
                log.debug(log.defaultContext(), 'model-definition-ACL-test    clean up - ModelDefinitionHistory');
            });
        }

        models.ModelDefinition.destroyAll({}, bootstrap.defaultContext, function () {
            log.debug(log.defaultContext(), 'model-definition-ACL-test    clean up - ModelDefinition');
            done();
        });

    });

    describe(chalk.yellow('Dynamically creating model   using REST APIs '), function (done) {

        var tenantId = 'test-tenant';

        it('should allow creating model with no properties', function (done) {
            var modelName = 'NoProps';
            models.ModelDefinition.events.once('model-' + modelName + '-available', function () {
                expect(models[modelName]).not.to.be.null;
                expect(models[modelName].definition.properties).not.to.be.undefined;
                debug('model ' + modelName + ' is available now, test case passed.');
                done();
            });
            var postData = {
                name: modelName,
                base: 'BaseEntity',
                plural: modelName,
                properties: {}
            };

            api
                .set('Accept', 'application/json')
                .set('TENANT_ID', tenantId)
                .set('REMOTE_USER', 'testUser')
                .post(modelDefitnionUrl)
                .send(postData)
                .expect(200).end(function (err, res) {
                    debug('response body : ' + JSON.stringify(res.body, null, 4));
                    if (err || res.body.error) {
                        done(err || (new Error(res.body.error)));
                    }
                });
        });

        it('should not allow creating duplicate model (model with same name) ', function (done) {

            var modelName = 'NoProps';
            //var list = [];
            var postData = {
                name: modelName,
                base: 'BaseEntity',
                properties: {}
            };

            api
                .set('TENANT_ID', tenantId)
                .post(modelDefitnionUrl)
                .send(postData)
                .expect(422).end(function (err, res) {
                    if (err) {
                        debug('response body.error details : ' + JSON.stringify(err, null, 4));
                        done(err);
                    } else {
                        debug('response body.error details : ' + JSON.stringify(res.body, null, 4));
                        done();
                    }

                });
        });

        it('should not allow creating two model with same Plural ', function (done) {
            var modelName = 'NoProps';
            //var list = [];
            var postData = {
                name: modelName + 'sss',
                base: 'BaseEntity',
                plural: modelName,
                properties: {}
            };

            api
                .set('TENANT_ID', tenantId)
                .post(modelDefitnionUrl)
                .send(postData)
                .expect(422).end(function (err, res) {
                    debug('response body.error details : ' + JSON.stringify(res.body.error.details, null, 4));
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
        });

        xit('should update model using ModelDefinition try to add ACLs ', function (done) {
            // commented as model definition is not even created and we are trying to fin logic needs change or will refer to old code TODO on monday
            var modelName = 'NoProps';
            var modelId;
            var modelDetails = {};

            var acl = {
                'principalType': 'ROLE',
                'principalId': 'Admin',
                'permission': 'ALLOW',
                'property': 'create'
            };

            models.ModelDefinition.events.once('model-' + modelName + '-available', function () {
                expect(models[modelName]).not.to.be.null;
                expect(models[modelName].settings.acls).to.deep.include.members([acl]);
                expect(models[modelName].properties).to.be.undefined;
                debug('model ' + modelName + ' is available now, test case passed.');
                done();
            });

            models.ModelDefinition.find({
                where: {
                    name: 'NoProps'
                }
            }, bootstrap.defaultContext, function (err, modeldefinition) {
                modelId = modeldefinition[0].id;
                modelDetails = modeldefinition[0];
                modelDetails.acls = [];
                modelDetails.acls.push(acl);

                api
                    .set('TENANT_ID', tenantId)
                    .put(modelDefitnionUrl + '/' + modelId)
                    .send(modelDetails)
                    .expect(200).end(function (err, res) {
                        //console.log(err,res.body);
                        debug('response body : ' + JSON.stringify(res.body, null, 4));
                        if (err || res.body.error) {
                            done(err || (new Error(res.body.error.details.message)));
                        }

                    });
            });

        });

        it('Test delete functionality of model Definition ', function (done) {
            //var modelName = 'NoProps';

            models.ModelDefinition.find({
                where: {
                    name: 'NoProps'
                }
            }, bootstrap.defaultContext, function (err, modeldefinition) {
                var modelId = modeldefinition[0].id;
                var version = modeldefinition[0]._version;
                //console.log('model details',modelDetails);

                api
                    .del(modelDefitnionUrl + '/' + modelId)
                    .expect(200).end(function (err, res) {
                        console.log('response body : ' + JSON.stringify(res.body, null, 4));
                        // after delete find same model with ID it should not be present.
                        models.ModelDefinition.find({
                            where: {
                                id: modelId
                            }
                        }, bootstrap.defaultContext, function (err, modeldefinition) {
                            if (!err && (modeldefinition.length === 0)) {
                                done();
                            } else if (err || res.body.error) {
                                done(err || (new Error(res.body.error)));
                            }
                        });
                    });
            });
        });

        it('should not allow creating model propertie filebased = true ', function (done) {
            var modelName = 'NoProps';
            //var list = [];
            var postData = {
                name: modelName,
                base: 'BaseEntity',
                properties: {},
                filebased: true
            };

            api
                .post(modelDefitnionUrl)
                .set('tenant_id', 'test-tenant')
                .set('remote_user', 'unitTest')
                .send(postData)
                .expect(500).end(function (err, res) {
                    debug('response body : ' + JSON.stringify(res.body, null, 4));
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
        });

        it('should create a new model with properties and make it available in app', function (done) {

            var modelName = 'TestMyCart';
            models.ModelDefinition.events.once('model-' + modelName + '-available', function () {
                debug('model ' + modelName + ' is available now, test case passed.');
                expect(models[modelName].definition.properties).not.to.be.null;
                expect(models[modelName].definition.properties).not.to.be.undefined;
                //debug('model '+modelName+' properties.',models[modelName].definition.properties);
                done();
            });

            var postData = {
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
            };

            api
                .post(modelDefitnionUrl)
                .send(postData)
                .expect(200).end(function (err, res) {
                    debug('response body : ' + JSON.stringify(res.body, null, 4));
                });

        });

        it('delete TestMyCart model details from ModelDefinition db ', function (done) {

            var modelName = 'TestMyCart';
            //var list = [];

            models.ModelDefinition.find({
                where: {
                    name: modelName
                }
            }, bootstrap.defaultContext, function (err, modeldefinition) {
                var modelId = modeldefinition[0].id;

                api
                    .del(modelDefitnionUrl + '/' + modelId)
                    .expect(200).end(function (err, res) {
                        debug('response body : ' + JSON.stringify(res.body, null, 4));
                        // after delete find same model with ID it should not be present.
                        models.ModelDefinition.find({
                            where: {
                                id: modelId
                            }
                        }, bootstrap.defaultContext, function (err, modeldefinition) {
                            if (!err && (modeldefinition.length === 0)) {
                                done();
                            } else if (err || res.body.error) {
                                done(err || (new Error(res.body.error)));
                            }
                        });
                    });
            });
        });

        var excludedModelList = ['Model', 'PersistedModel', 'User', 'AccessToken', 'ACL', 'RoleMapping', 'Role'];

        excludedModelList.forEach(function (modelName) {
            it('should not allow creating model with name - ' + modelName, function (done) {

                var postData = {
                    name: modelName,
                    base: 'BaseEntity',
                    plural: modelName,
                    properties: {}
                };

                api
                    .post(modelDefitnionUrl)
                    .send(postData)
                    .expect(422).end(function (err, res) {
                        debug('response body : ' + JSON.stringify(res.body, null, 4));
                        if (err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            });
        });

    });

    describe(chalk.yellow('Dynamically creating model   -- Programmatically '), function (done) {

        var modelName = 'NoPropP';
        var postData = {
            name: modelName,
            base: 'BaseEntity',
            plural: modelName + 's',
            properties: {}
        };
        var modelDetails;

        it('should allow creating model with no properties', function (done) {

            models.ModelDefinition.create(postData, bootstrap.defaultContext, function (err, res) {
                debug('response body : ' + JSON.stringify(res, null, 4));
                if (err) {
                    done(err);
                } else {
                    expect(models[modelName]).not.to.be.null;
                    expect(models[modelName].definition.properties).not.to.be.undefined;
                    expect(Object.keys(models[modelName].definition.properties)).
                        to.include.members(Object.keys(models.BaseEntity.definition.properties));
                    modelDetails = res;
                    done();
                }
            });
        });


        it('should not allow creating duplicate model (model with same name) ', function (done) {

            models.ModelDefinition.create(postData, bootstrap.defaultContext, function (err, res) {
                debug('response body : ' + JSON.stringify(err, null, 4));
                if (err) {
                    done(); //if err test case pass.
                }
                //should throw err when trying to create duplicate model.
                else {
                    if (JSON.stringify(modelDetails.id) !== JSON.stringify(res.id))
                        done(new Error('Model created with same name. Test Case failed. '));
                    else
                        done();
                }
            });
        });

        it('should not allow creating two model with same Plural ', function (done) {
            var modelName = 'TestTableOneTwo';
            var postData = {
                name: modelName,
                base: 'BaseEntity',
                plural: 'NoPropPs',
                properties: {}
            };

            models.ModelDefinition.create(postData, bootstrap.defaultContext, function (err, res) {
                debug('response body : ' + JSON.stringify(err, null, 4));
                if (err) {
                    done(); //if err test case pass.
                } else {
                    done(new Error('Model created with same Plural. Test Case failed. '));
                }
            });
        });

        xit('Update model using ModelDefinition try to add ACLs ', function (done) {

            var acl = {
                'principalType': 'ROLE',
                'principalId': 'Admin',
                'permission': 'ALLOW',
                'property': 'create'
            };
            modelDetails.acls = [];
            modelDetails.acls.push(acl);

            models.ModelDefinition.events.once('model-' + modelName + '-available', function () {
                expect(models[modelName]).not.to.be.null;
                expect(models[modelName].settings.acls).to.deep.include.members([acl]);
                expect(models[modelName].properties).to.be.undefined;
                debug('model ' + modelName + ' is available now, test case passed.');
                done();
            });

            models.ModelDefinition.upsert(modelDetails, bootstrap.defaultContext, function (err, res) {
                debug('response body : ' + JSON.stringify(res, null, 4));
                if (err) {
                    done(err);
                } else {
                    modelDetails = res;
                }
            });
        });

        xit('Test delete functionality of model Definition destoryById ', function (done) {

            var id = modelDetails.id;
            var version = modelDetails._version;
            models.ModelDefinition.destroyById(id, bootstrap.defaultContext, function (err) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
        });

        it('should allow creating model propertie filebased = true ', function (done) {
            var modelName = 'fileBaseTrueP';
            var postData = {
                name: modelName,
                base: 'BaseEntity',
                properties: {},
                filebased: true
            };

            models.ModelDefinition.create(postData, bootstrap.defaultContext, function (err, res) {
                debug('response body : ' + JSON.stringify(res, null, 4));
                if (err) {
                    done(err);
                } else {
                    modelDetails = res;
                    expect(res).not.to.be.null;
                    expect(res.properties).not.to.be.undefined;
                    //expect(Object.keys(models[modelName].definition.properties)).to.include.members(Object.keys(models.BaseEntity.definition.properties));
                    done();

                }
            });
        });

        it('should create a new model with properties and make it available in app', function (done) {

            var modelName = 'TestMyCartP';
            var postData = {
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
            };

            models.ModelDefinition.create(postData, bootstrap.defaultContext, function (err, res) {
                debug('response body : ' + JSON.stringify(res, null, 4));
                if (err) {
                    done(err);
                } else {
                    modelDetails = res;
                    expect(models[modelName]).not.to.be.null;
                    expect(models[modelName].definition.properties).not.to.be.undefined;
                    expect(Object.keys(models[modelName].definition.properties)).
                        to.include.members(Object.keys(models.BaseEntity.definition.properties));
                    expect(Object.keys(models[modelName].definition.properties)).
                        to.include.members(Object.keys(postData.properties));
                    done();
                }
            });
        });

        it('Find all model details in ModelDefinition ', function (done) {
            models.ModelDefinition.find({}, bootstrap.defaultContext, function (err, models) {
                if (err) {
                    done(err);
                } else {
                    expect(models).not.to.be.null;
                    expect(models).not.to.be.undefined;
                    done();
                }
            });
        });

        xit('delete model details from ModelDefinition using DestroyAll ', function (done) {
            models.ModelDefinition.destroyAll({}, bootstrap.defaultContext, function () {
                done();
            });
        });

        var excludedModelList = ['Model', 'PersistedModel', 'User', 'AccessToken', 'ACL', 'RoleMapping', 'Role'];

        excludedModelList.forEach(function (modelName) {
            it('should not allow creating model with name - ' + modelName, function (done) {

                var postData = {
                    name: modelName,
                    base: 'BaseEntity',
                    plural: modelName + 's',
                    properties: {}
                };

                models.ModelDefinition.create(postData, bootstrap.defaultContext, function (err, res) {
                    debug('response body : ' + JSON.stringify(res, null, 4));
                    if (err) {
                        done(); //if err test case pass.
                    }
                    //should throw err when trying to create duplicate model.
                    else {
                        done(new Error('Model created with name Model. Test Case failed. '));
                    }
                });
            });
        });
    });
});

xdescribe(chalk.blue('model-definition-test variantOf'), function () {

    var modelSchema1 = {
        name: 'hello',
        base: 'BaseEntity'
    };

    var modelSchema2 = {
        name: 'hey',
        base: 'BaseEntity',
        variantOf: 'hello'
    };

    before('Create variant models', function (done) {
        models.ModelDefinition.create([modelSchema1, modelSchema2], bootstrap.defaultContext, function (err, res) {
            done(err);
        });
    });

    it('test getVariantOf', function (done) {
        models.ModelDefinition.getVariantOf('hello', function (err, model) {
            if (err) {
                done(err);
            } else {
                expect(typeof model).to.be.equal('function');
                done();
            }
        });
    });

});