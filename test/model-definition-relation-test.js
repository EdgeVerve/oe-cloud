/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * Test cases for Relationship testing between two models, models are created by
 * ModelDefiniton model.
 * @author sivankar jain
 */


var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;
var loopback = require('loopback');
var models = bootstrap.models;

var baseUrl = bootstrap.basePath;
var modelDefitnionUrl = baseUrl + '/ModelDefinitions';

var chai = require('chai');
chai.use(require('chai-things'));

var api = bootstrap.api;

var debug = require('debug')('model-definition-relation-test');

describe(chalk.blue('model-definition-relation     using REST APIs'), function () {
    this.timeout(20000);


    after('destroy context', function (done) {
        var model = loopback.getModel('ModelDefinitionHistory');
        if (model) {
            model.destroyAll({}, bootstrap.defaultContext, function (err, info) {
                //console.log('model-definition-ACL-test    clean up - ModelDefinitionHistory');
            });
        }

        models.ModelDefinition.destroyAll({}, bootstrap.defaultContext, function () {
            //console.log('model-definition-ACL-test    clean up - ModelDefinition');
            done();
        });
    });


    describe(chalk.yellow('Create a model with Relation to a existing table, ' +
        'insert data into each table and retrive the same using API parentModel/{id}/relationModel'), function (done) {
        var modelName = 'Category';
        var baseModel = 'BaseEntity';
        var dataID, subDataID;
        var flag = 0;

        it('create model', function (done) {

            var modelName = 'subCategory';
            var postData = {
                name: modelName,
                base: baseModel,
                plural: 'subCategories',
                properties: {
                    'subName': {
                        'type': 'string',
                        'required': true
                    },
                    'CategoryId': {
                        'type': 'string',
                        'required': true
                    }
                }
            };

            models.ModelDefinition.events.once('model-' + modelName + '-available', function () {
                expect(models[modelName]).not.to.be.null;
                expect(models[modelName].definition.properties).not.to.be.undefined;
                expect(Object.keys(models[modelName].definition.properties)).
                to.include.members(Object.keys(models.BaseEntity.definition.properties));
                expect(Object.keys(models[modelName].definition.properties)).
                to.include.members(Object.keys(postData.properties));
                //console.log(models[modelName].settings);
                debug('model ' + modelName + ' is available now, test case passed.');
                flag++;
                done();
            });

            api
                .post(modelDefitnionUrl)
                .send(postData)
                .expect(200).end(function (err, res) {
                    debug('response body : ' + JSON.stringify(res.body, null, 4));
                    if (err) {
                        done(err);
                    }
                });

        });

        it('creating model with Relation to a existing table ', function (done) {

            if (flag && flag === 1) {
                var postData = {
                    name: modelName,
                    base: baseModel,
                    plural: 'Categories',
                    properties: {
                        'Name': {
                            'type': 'string',
                            'required': true
                        }
                    },
                    relations: {
                        'subCategories': {
                            'type': 'hasMany',
                            'model': 'subCategory',
                            'foreignKey': 'CategoryId'
                        }
                    }
                };

                models.ModelDefinition.events.once('model-' + modelName + '-available', function () {
                    expect(models[modelName]).not.to.be.null;
                    expect(models[modelName].definition.properties).not.to.be.undefined;
                    expect(Object.keys(models[modelName].definition.properties)).
                    to.include.members(Object.keys(models.BaseEntity.definition.properties));
                    expect(Object.keys(models[modelName].definition.properties)).
                    to.include.members(Object.keys(postData.properties));
                    expect(Object.keys(models[modelName].settings.relations)).
                    to.include.members(Object.keys(postData.relations));
                    //console.log(models[modelName].settings);
                    debug('model ' + modelName + ' is available now, test case passed.');
                    flag++;
                    done();
                });

                api
                    .post(modelDefitnionUrl)
                    .send(postData)
                    .expect(200).end(function (err, res) {
                        debug('response body : ' + JSON.stringify(res.body, null, 4));
                        if (err) {
                            done(err);
                        }
                    });
            } else {
                done(new Error('Test case failed as the previous case failed'));
            }
        });

        it('add data to the model', function (done) {

            if (flag && flag === 2) {
                var postData = {
                    Name: 'Food_Items'
                };
                var postUrl = baseUrl + '/Categories';
                api
                    .post(postUrl)
                    .set('tenant_id', 'test-tenant')
                    .set('remote_user', 'unitTest')
                    .send(postData)
                    .expect(200).end(function (err, res) {
                        debug('response body : ' + JSON.stringify(res.body, null, 4));
                        if (err) {
                            done(err);
                        } else {
                            dataID = res.body.id;
                            done();
                            flag++;
                        }
                    });
            } else {
                done(new Error('Test case failed as the previous case failed'));
            }
        });

        it('Should allow to add data using relation API model/{id}/relatedModel ', function (done) {

            if (dataID && flag && flag === 3) {
                var postUrl = baseUrl + '/Categories/' + dataID + '/subCategories';
                var postData = {
                    'subName': 'subItem1',
                    'CategoryId': dataID
                };
                //console.log('posturl', postUrl);
                api
                    .post(postUrl)
                    .set('tenant_id', 'test-tenant')
                    .set('remote_user', 'unitTest')
                    .send(postData)
                    .expect(200).end(function (err, res) {
                        debug('response body : ' + JSON.stringify(res.body, null, 4));
                        //console.log('posturl',postUrl,'\nres.body',res.body,'\nerr',err);
                        if (err) {
                            done(err);
                        } else {
                            subDataID = res.body.id;
                            //console.log("---------------",res.body.error);
                            flag++;
                            done();
                        }
                    });
            } else {
                done(new Error('Test case failed as the previous case failed'));
            }
        });

        it('Should get data using relation API model/{id}/relatedModel/{fk} ', function (done) {

            if (subDataID && flag && flag === 4) {
                var postUrl = baseUrl + '/Categories/' + dataID + '/subCategories' + '/' + subDataID;
                api
                    .get(postUrl)
                    .set('tenant_id', 'test-tenant')
                    .set('remote_user', 'unitTest')
                    .send()
                    .expect(200).end(function (err, res) {
                        debug('response body : ' + JSON.stringify(res.body, null, 4));
                        //console.log('posturl',postUrl,'\nres.body',res.body,'\nerr',err);
                        if (err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            } else {
                done(new Error('Test case failed as the previous case failed'));
            }
        });


        it('Test delete functionality of model Definition ', function (done) {
            var modelName = 'subCategory';
            models.ModelDefinition.find({
                where: {
                    name: modelName
                }
            }, bootstrap.defaultContext, function (err, modeldefinition) {
                if (err) {
                    return done(err);
                }
                var modelId = modeldefinition[0].id;
                models[modelName].destroyAll({}, bootstrap.defaultContext, function () {
                    //console.log('Clearing data from ' + modelName + ' model.');
                });
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
            });

        });

        it('Test delete functionality of model Definition ', function (done) {

            models.ModelDefinition.find({
                where: {
                    name: modelName
                }
            }, bootstrap.defaultContext, function (err, modeldefinition) {
                if (err) {
                    return done(err);
                }
                var modelId = modeldefinition[0].id;
                models[modelName].destroyAll({}, bootstrap.defaultContext, function () {
                    //console.log('Clearing data from ' + modelName + ' model.');
                });
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
            });

        });
    });

});


describe(chalk.blue('model-definition-relation     Programmatically'), function () {
    this.timeout(20000);

    describe(chalk.yellow('Create a model with Relation to a existing table,' +
        ' insert data into each table and retrive the same '), function (done) {

        after('destroy context', function (done) {
            models.ModelDefinition.destroyAll({}, bootstrap.defaultContext, function () {
                done();
            });
        });

        var modelName = 'Category';
        var modelName1 = 'subCategory';
        var baseModel = 'BaseEntity';
        var dataID, subDataID;

        it('create submodel', function (done) {

            var postData = {
                name: modelName1,
                base: baseModel,
                plural: 'subCategories',
                properties: {
                    'subName': {
                        'type': 'string',
                        'required': true
                    },
                    'CategoryId': {
                        'type': 'string',
                        'required': true
                    }
                }
            };

            models.ModelDefinition.create(postData, bootstrap.defaultContext, function (err, res) {
                debug('response body : ' + JSON.stringify(res, null, 4));
                if (err) {
                    done(err);
                } else {

                    expect(models[modelName1]).not.to.be.null;
                    expect(models[modelName1].definition.properties).not.to.be.undefined;
                    expect(Object.keys(models[modelName1].definition.properties)).
                    to.include.members(Object.keys(models.BaseEntity.definition.properties));
                    expect(Object.keys(models[modelName1].definition.properties)).
                    to.include.members(Object.keys(postData.properties));
                    done();
                }
            });

        });

        it('creating model with Relation to a existing table ', function (done) {

            var postData = {
                name: modelName,
                base: baseModel,
                plural: 'Categories',
                properties: {
                    'Name': {
                        'type': 'string',
                        'required': true
                    }
                },
                relations: {
                    'subCategories': {
                        'type': 'hasMany',
                        'model': 'subCategory',
                        'foreignKey': 'CategoryId'
                    }
                }
            };

            models.ModelDefinition.create(postData, bootstrap.defaultContext, function (err, res) {
                debug('response body : ' + JSON.stringify(res, null, 4));
                if (err) {
                    done(err);
                } else {

                    expect(models[modelName]).not.to.be.null;
                    expect(models[modelName].definition.properties).not.to.be.undefined;
                    expect(Object.keys(models[modelName].definition.properties)).
                    to.include.members(Object.keys(models.BaseEntity.definition.properties));
                    expect(Object.keys(models[modelName].definition.properties)).
                    to.include.members(Object.keys(postData.properties));
                    expect(Object.keys(models[modelName].settings.relations)).
                    to.include.members(Object.keys(postData.relations));
                    done();
                }
            });
        });

        it('add data to the model', function (done) {
            var postData = {
                Name: 'Food_Items'
            };

            models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
                if (err) {
                    done(err);
                } else {

                    dataID = res.id;
                    models[modelName].findById(dataID, bootstrap.defaultContext, function (err, data) {
                        debug('response body : ' + JSON.stringify(data, null, 4));
                        //	console.log(data);
                        if (data && data.id === dataID) {
                            done();
                        } else {
                            done(err);
                        }
                    });
                }
            });

        });

        it('Should allow to add data using relation API model/{id}/relatedModel ', function (done) {
            var postData = {
                'subName': 'subItem1',
                'CategoryId': dataID
            };

            models[modelName1].create(postData, bootstrap.defaultContext, function (err, res) {
                if (err) {
                    done(err);
                } else {

                    subDataID = res.id;
                    models[modelName1].findById(subDataID, bootstrap.defaultContext, function (err, data) {
                        debug('response body : ' + JSON.stringify(data, null, 4));
                        if (data && data.id === subDataID) {
                            done();
                        } else {
                            done(err);
                        }
                    });
                }
            });
        });

        it('Should get data for given relation ', function (done) {

            models[modelName].find({
                include: 'subCategories'
            }, bootstrap.defaultContext, function (err, data) {
                debug('response body : ' + JSON.stringify(data, null, 4));
                //console.log(JSON.stringify(data,null,'\t'));
                if (data) {
                    expect(data).not.to.be.null;
                    expect(data).not.to.be.undefined;
                    expect(data).not.to.be.empty;
                    expect(data[0]['subCategories']).not.to.be.null;
                    expect(data[0]['subCategories']).not.to.be.empty;
                    expect(data[0]['subCategories']).not.to.be.undefined;
                    done();
                } else {
                    done(err);
                }
            });
        });


        it('Delete test data', function (done) {

            models[modelName].destroyAll({}, bootstrap.defaultContext, function () {
                models[modelName1].destroyAll({}, bootstrap.defaultContext, function () {
                    models.ModelDefinition.destroyAll({}, bootstrap.defaultContext, function () {
                        //console.log('Clearing data from ModelDefinition model.');
                        done();
                    });
                });
            });

        });
    });

});
