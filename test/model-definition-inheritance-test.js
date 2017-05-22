/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 *This test file is for Inheritance testing for the model created using
 * ModelDefinition with some Base model.
 *@author sivankar jain
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;
var models = bootstrap.models;
var modelDefitnionUrl = bootstrap.basePath + '/ModelDefinitions';

var chai = require('chai');
chai.use(require('chai-things'));

var api = bootstrap.api;

var debug = require('debug')('model-definition-test');
var accessToken;
describe(chalk.blue('REST APIs - model-definition-Inheritance'), function () {
    this.timeout(20000);

    after('destroy context', function (done) {
        models.ModelDefinition.destroyAll({}, bootstrap.defaultContext, function () {
            done();
        });
    });

    describe(chalk.yellow('creating model with no properties and base as BaseEntity,' +
        ' check for presense of BaseEntity properties and enter data into newly created model.'), function () {
        before('login', function (done) {
            bootstrap.createAccessToken(bootstrap.defaultContext.ctx.remoteUser.username, function (err, token) {
                accessToken = token;
                done();
            });
        });

        it('creating model with no properties and base as BaseEntity, check for presense of BaseEntity properties ',
            function (done) {

                var modelName = 'NoProps';

                models.ModelDefinition.events.once('model-' + modelName + '-available', function () {
                    expect(models[modelName]).not.to.be.null;
                    expect(models[modelName].settings.acls).to.have.length(1);
                    expect(models[modelName].definition.properties).not.to.be.undefined;
                    expect(Object.keys(models[modelName].definition.properties)).to.include.
                    members(Object.keys(models.BaseEntity.definition.properties));
                    debug('model ' + modelName + ' is available now, test case passed.');
                    done();
                });

                var postData = {
                    name: modelName,
                    base: 'BaseEntity',
                    properties: {}
                };

                api
                    .set('Accept', 'application/json')
                    .post(modelDefitnionUrl + "?access_token=" + accessToken)
                    .send(postData)
                    .expect(200).end(function (err, res) {
                        debug('response body : ' + JSON.stringify(res.body, null, 4));
                        if (err || res.body.error) {
                            done(err || (new Error(res.body.error.details.messages.name[0])));
                        }
                    });

            });

        it('add empty data to newly created Model with no properties and get the same.', function (done) {

            var modelName = 'NoProps';
            var postUrl = bootstrap.basePath + '/' + modelName + "?access_token=" + accessToken;
            var postData = {};

            api
                .post(postUrl)
                .set('tenant_id', 'test-tenant')
                .set('remote_user', 'unitTest')
                .send(postData)
                .expect(200).end(function (err, res) {
                    debug('response body : ' + JSON.stringify(res.body, null, 4));

                    if (err || res.body.error) {
                        done(err || (new Error(res.body.error.details.messages.name[0])));
                    } else {

                        var dataId = res.body.id;

                        models[modelName].find({
                            where: {
                                ID: dataId
                            }
                        }, bootstrap.defaultContext, function (err, data) {

                            if (data && data.ID === dataId) {
                                done();
                            } else {
                                done(err);
                            }
                        });
                    }
                });
        });

        it('Test delete functionality of model Definition ', function (done) {
            var modelName = 'NoProps';

            models.ModelDefinition.find({
                where: {
                    name: modelName
                }
            }, bootstrap.defaultContext, function (err, modeldefinition) {
                var modelId = modeldefinition[0].id;
                models[modelName].destroyAll({}, bootstrap.defaultContext, function () {});

                api
                    .del(modelDefitnionUrl + '/' + modelId + "?access_token=" + accessToken)
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
                                done(err || (new Error(res.body.error.details.message.name[0])));
                            }
                        });
                    });
            });

        });

    });


    describe(chalk.yellow('should create a new model with properties and use it as a base model,' +
        ' check for presence of base model properties and its own properties'), function () {

        it('should create a new model to use as a base model with properties', function (done) {

            var modelName = 'TestMyCart';

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

            models.ModelDefinition.events.once('model-' + modelName + '-available', function () {
                debug('model ' + modelName + ' is available now, test case passed.');
                expect(models[modelName].definition.properties).not.to.be.null;
                expect(models[modelName].definition.properties).not.to.be.undefined;
                expect(Object.keys(models[modelName].definition.properties)).to.include.
                members(Object.keys(models.BaseEntity.definition.properties));
                expect(Object.keys(models[modelName].definition.properties)).to.include.
                members(Object.keys(postData.properties));
                done();
            });


            api
                .post(modelDefitnionUrl)
                .send(postData)
                .expect(200).end(function (err, res) {
                    debug('response body : ' + JSON.stringify(res.body, null, 4));
                    if (err || res.body.error) {
                        done(err || (new Error(res.body.error.details.message.name[0])));
                    }
                });
        });

        it('create a new model with new properties not existing in base and base as TestMyCart,' +
            '\n\t check for inherit properties and its own properties ',
            function (done) {

                var modelName = 'MyCart';
                var baseModel = 'TestMyCart';
                var postData = {
                    name: modelName,
                    base: baseModel,
                    properties: {
                        'describtion': {
                            'type': 'string',
                            'required': true
                        },
                        'price': {
                            'type': 'number',
                            'required': true
                        }
                    },
                    filebased: false
                };

                models.ModelDefinition.events.once('model-' + modelName + '-available', function () {
                    debug('model ' + modelName + ' is available now, test case passed.');
                    expect(models[modelName].definition.properties).not.to.be.null;
                    expect(models[modelName].definition.properties).not.to.be.undefined;
                    expect(Object.keys(models[modelName].definition.properties)).
                    to.include.members(Object.keys(models[baseModel].definition.properties));
                    expect(Object.keys(models[modelName].definition.properties)).
                    to.include.members(Object.keys(postData.properties));

                    done();
                });


                api
                    .post(modelDefitnionUrl)
                    .send(postData)
                    .expect(200).end(function (err, res) {
                        debug('response body : ' + JSON.stringify(res.body, null, 4));
                        if (err || res.body.error) {
                            done(err || (new Error(res.body.error.details.message.name[0])));
                        }
                    });

            });


        it('Delete MyCart model', function (done) {

            var modelName = 'MyCart';

            models.ModelDefinition.find({
                where: {
                    name: modelName
                }
            }, bootstrap.defaultContext, function (err, modeldefinition) {
                if (err || modeldefinition.length === 0) {
                    done(err || new Error('unable to delete model ' + modelName + '. No model with such name Exist.'));
                } else {
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
                                    done(err || (new Error(res.body.error.details.message.name[0])));
                                }
                            });
                        });
                }
            });

        });

        it('Delete TestMyCart model ', function (done) {

            var modelName = 'TestMyCart';

            models.ModelDefinition.find({
                where: {
                    name: modelName
                }
            }, bootstrap.defaultContext, function (err, modeldefinition) {
                if (err || modeldefinition.length === 0) {
                    done(err || new Error('unable to delete model ' + modelName + '. No model with such name Exist.'));
                } else {
                    var modelId = modeldefinition[0].id;
                    //console.log('model details',modelDetails);

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
                                    done(err || (new Error(res.body.error.details.message.name[0])));
                                }
                            });
                        });
                }
            });

        });

    });

    describe(chalk.yellow('Create model with same existing property of base'), function (done) {

        it('should create a new model to use as a base model with properties', function (done) {

            var modelName = 'TestMyCartOne';

            var postData = {
                name: modelName,
                base: 'BaseEntity',
                properties: {
                    'name': {
                        'type': 'string',
                        'required': true
                    },
                    'age': {
                        'type': 'string',
                        'required': true
                    }
                },
                filebased: false
            };

            models.ModelDefinition.events.once('model-' + modelName + '-available', function () {
                debug('model ' + modelName + ' is available now, test case passed.');
                expect(models[modelName].definition.properties).not.to.be.null;
                expect(models[modelName].definition.properties).not.to.be.undefined;
                expect(Object.keys(models[modelName].definition.properties)).
                to.include.members(Object.keys(models.BaseEntity.definition.properties));
                expect(Object.keys(models[modelName].definition.properties)).
                to.include.members(Object.keys(postData.properties));
                done();
            });


            api
                .post(modelDefitnionUrl)
                .send(postData)
                .expect(200).end(function (err, res) {
                    debug('response body : ' + JSON.stringify(res.body, null, 4));
                    if (err || res.body.error) {
                        done(err || (new Error(res.body.error.details.message.name[0])));
                    }
                });
        });

        it('create a new model with new properties not existing in base and base as TestMyCart1,' +
            '\n\t check for inherit properties and its own properties ',
            function (done) {


                var modelName = 'MyCartOne';
                var baseModel = 'TestMyCartOne';
                var postData = {
                    name: modelName,
                    base: baseModel,
                    properties: {
                        'name': {
                            'type': 'string',
                            'required': true
                        },
                        'age': {
                            'type': 'number',
                            'required': true
                        }
                    },
                    filebased: false
                };

                models.ModelDefinition.events.once('model-' + modelName + '-available', function () {
                    debug('model ' + modelName + ' is available now, test case passed.');
                    expect(models[modelName].definition.properties).not.to.be.null;
                    expect(models[modelName].definition.properties).not.to.be.undefined;
                    expect(Object.keys(models[modelName].definition.properties)).
                    to.include.members(Object.keys(models[baseModel].definition.properties));
                    expect(Object.keys(models[modelName].definition.properties)).
                    to.include.members(Object.keys(postData.properties));

                    done();
                });


                api
                    .post(modelDefitnionUrl)
                    .send(postData)
                    .expect(200).end(function (err, res) {
                        debug('response body : ' + JSON.stringify(res.body, null, 4));
                        if (err || res.body.error) {
                            done(err || (new Error(res.body.error.details.message.name[0])));
                        }
                    });

            });


        it('Delete MyCartOne model', function (done) {

            var modelName = 'MyCartOne';

            models.ModelDefinition.find({
                where: {
                    name: modelName
                }
            }, bootstrap.defaultContext, function (err, modeldefinition) {
                if (err || modeldefinition.length === 0) {
                    done(err || new Error('unable to delete model ' + modelName + '. No model with such name Exist.'));
                } else {
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
                                    done(err || (new Error(res.body.error.details.message.name[0])));
                                }
                            });
                        });
                }
            });

        });

        it('delete TestMyCartOne model ', function (done) {

            var modelName = 'TestMyCartOne';

            models.ModelDefinition.find({
                where: {
                    name: modelName
                }
            }, bootstrap.defaultContext, function (err, modeldefinition) {
                if (err || modeldefinition.length === 0) {
                    done(err || new Error('unable to delete model ' + modelName + '. No model with such name Exist.'));
                } else {
                    var modelId = modeldefinition[0].id;
                    //console.log('model details',modelDetails);

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
                                    done(err || (new Error(res.body.error.details.message.name[0])));
                                }
                            });
                        });
                }
            });

        });

    });

    describe(chalk.yellow('creating model Non existing base'), function (done) {

        it('should not allow, creating model with non existing base ', function (done) {
            var modelName = 'NoBaseModel';
            var baseModel = 'NoModel';
            var postData = {
                name: modelName,
                base: baseModel,
                properties: {}
            };
            api
                .post(modelDefitnionUrl)
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

    });

});

describe(chalk.blue('model-definition-Inheritance  Programmatically'), function () {

    //var loopbackContext;

    var modelName = 'TestTable';
    var postData = {
        name: modelName,
        base: 'BaseEntity',
        plural: modelName + 's',
        properties: {}
    };

    var modelDetails;

    describe(chalk.yellow('creating model with no properties and base as BaseEntity,' +
        ' check for presense of BaseEntity properties and enter data into newly created model.'), function () {

        after('destroy context', function (done) {
            models.ModelDefinition.destroyAll({}, bootstrap.defaultContext, function () {
                done();
            });
        });

        it('creating model with no properties and base as BaseEntity, check for presense of BaseEntity properties ',
            function (done) {

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
                        done();
                    }
                });
            });

        it('add empty data to newly created Model with no properties and get the same.', function (done) {

            var postData = {};

            models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
                if (err) {
                    done(err);
                } else {
                    var dataId = res.id;
                    models[modelName].findById(dataId, bootstrap.defaultContext, function (err, data) {
                        if (data && data.id === dataId) {
                            done();
                        } else {
                            done(err);
                        }
                    });
                }
            });
        });

        it('Delete model ' + modelName, function (done) {
            var modelId;
            models.ModelDefinition.find({
                where: {
                    name: modelName
                }
            }, bootstrap.defaultContext, function (err, modeldefinition) {
                if (err) {
                    done(err);
                } else {
                    modelId = modeldefinition[0].id;
                    var version = modeldefinition[0]._version;
                    models[modelName].destroyAll({}, bootstrap.defaultContext, function (err, res) {});

                    models.ModelDefinition.destroyById(modelId, bootstrap.defaultContext, function (err, modeldefinition) {
                        if (err) {
                            done(err);
                        } else {
                            models.ModelDefinition.findById(modelId, bootstrap.defaultContext, function (err, res) {
                                if (err) {
                                    done(err);
                                } else {
                                    done();
                                }
                            });
                        }
                    });
                }
            });
        });
    });

    describe(chalk.yellow('should create a new model with properties and use it as a base model,' +
        ' check for presence of base model properties and its own properties'), function () {

        after('destroy context', function (done) {
            models.ModelDefinition.destroyAll({}, bootstrap.defaultContext, function () {
                done();
            });
        });
        var modelName1 = 'TestTableOne';

        it('should create a new model to use as a base model with properties', function (done) {

            postData.properties.name = 'string';

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

        it('create a new model with new properties not existing in base and base as TestMyCart,' +
            '\n\t check for inherit properties and its own properties ',
            function (done) {

                var postData1 = {
                    name: modelName1,
                    base: modelName,
                    plural: modelName1 + 's',
                    properties: {
                        'age': 'Number'
                    }
                };

                models.ModelDefinition.create(postData1, bootstrap.defaultContext, function (err, res) {
                    debug('response body : ' + JSON.stringify(res, null, 4));
                    if (err) {
                        done(err);
                    } else {
                        modelDetails = res;
                        expect(models[modelName]).not.to.be.null;
                        expect(models[modelName].definition.properties).not.to.be.undefined;
                        expect(Object.keys(models[modelName1].definition.properties)).
                        to.include.members(Object.keys(models[modelName].definition.properties));
                        expect(Object.keys(models[modelName1].definition.properties)).
                        to.include.members(Object.keys(postData1.properties));
                        done();
                    }
                });
            });

        it('Delete model ' + modelName, function (done) {

            var modelId;
            models.ModelDefinition.find({
                where: {
                    name: modelName
                }
            }, bootstrap.defaultContext, function (err, modeldefinition) {
                if (err) {
                    done(err);
                } else {
                    modelId = modeldefinition[0].id;
                    var version = modeldefinition[0]._version;
                    models[modelName].destroyAll({}, bootstrap.defaultContext, function (err, res) {});

                    models.ModelDefinition.destroyById(modelId, bootstrap.defaultContext, function (err, modeldefinition) {
                        if (err) {
                            done(err);
                        } else {
                            models.ModelDefinition.findById(modelId, bootstrap.defaultContext, function (err, res) {
                                if (err) {
                                    done(err);
                                } else {
                                    done();
                                }
                            });
                        }
                    });
                }
            });
        });
    });

    describe(chalk.yellow('Create model with same existing property of base '), function (done) {

        after('destroy context', function (done) {
            models.ModelDefinition.destroyAll({}, bootstrap.defaultContext, function () {
                done();
            });
        });
        var modelName1 = 'TestTableOne';

        it('should create a new model to use as a base model with properties', function (done) {

            postData.properties.name = 'string';

            models.ModelDefinition.create(postData, bootstrap.defaultContext, function (err, res) {
                debug('response body : ' + JSON.stringify(res, null, 4));
                if (err) {
                    console.log(err);
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

        it('create a new model with new properties not existing in base and base as TestMyCart,' +
            '\n\t check for inherit properties and its own properties ',
            function (done) {

                var postData1 = {
                    name: modelName1,
                    base: modelName,
                    plural: modelName1 + 's',
                    properties: {
                        'name': 'string'
                    }
                };

                models.ModelDefinition.create(postData1, bootstrap.defaultContext, function (err, res) {
                    debug('response body : ' + JSON.stringify(res, null, 4));
                    if (err) {
                        console.log('xxx', JSON.stringify(err));
                        done(err);
                    } else {
                        modelDetails = res;
                        expect(models[modelName]).not.to.be.null;
                        expect(models[modelName].definition.properties).not.to.be.undefined;
                        expect(Object.keys(models[modelName1].definition.properties)).
                        to.include.members(Object.keys(models[modelName].definition.properties));
                        expect(Object.keys(models[modelName1].definition.properties)).
                        to.include.members(Object.keys(postData1.properties));
                        done();
                    }
                });
            });


        it('Delete model ' + modelName1, function (done) {

            var modelId;
            models.ModelDefinition.find({
                where: {
                    name: modelName1
                }
            }, bootstrap.defaultContext, function (err, modeldefinition) {
                if (err) {
                    done(err);
                } else {
                    modelId = modeldefinition[0].id;
                    var version = modeldefinition[0]._version;
                    models[modelName1].destroyAll({}, bootstrap.defaultContext, function (err, res) {});

                    models.ModelDefinition.destroyById(modelId, bootstrap.defaultContext, function (err, modeldefinition) {
                        if (err) {
                            done(err);
                        } else {
                            models.ModelDefinition.findById(modelId, bootstrap.defaultContext, function (err, res) {
                                if (err) {
                                    done(err);
                                } else {
                                    done();
                                }
                            });
                        }
                    });
                }
            });

        });
    });

    describe(chalk.yellow('creating model Non existing base'), function (done) {

        it('should not allow to creating model with non existing base ', function (done) {
            var modelName = 'NoBaseModel';
            var baseModel = 'NoModel';
            var postData = {
                name: modelName,
                base: baseModel,
                properties: {}
            };
            models.ModelDefinition.create(postData, bootstrap.defaultContext, function (err, res) {
                if (err) {
                    done();
                    /*should not allow, therefore it will throw error when
		    	   someone is trying to create model with non existing base.*/
                } else {
                    done(new Error('model with non existing base, Created'));
                }
            });
        });

    });

});