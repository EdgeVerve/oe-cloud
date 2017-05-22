/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * 1) In before function a. Create in memory dataSource b. Create model c.
 * Attach model to datasource d. Pass model to audit-fileds-mixins to add the
 * mixins properties to the model e. Attach model to the app
 * 
 * 2) Test case 1 -- see if the model is successfully created a. Check if all
 * the soft-delete-mixins are present
 * 
 * 3) Test case 2 --- add data to the model a. Add new data b. Check if
 * soft-delete-mixins are not null and undefined c. Check if _isDeleted is set
 * to false
 * 
 * 4) Test case 3 --- add data to the model, delete the same using destroyById
 * a. Add new data b. Check if soft-delete-mixins are not null and undefined c.
 * Check if _isDeleted is set to false d. Delete the record using destroyById.
 * e. find the same record _isDeleted should be True
 * 
 * 5) Test case 4 --- add data to the model, delete the same using destroyAll a.
 * Add new data b. Check if soft-delete-mixins are not null and undefined c.
 * Check if _isDeleted is set to false d. Delete the record using destroyAll. e.
 * find the all record _isDeleted should be True, for all the records.
 * 
 * 6) In after function a. Delete Data source b. Delete Model
 * 
 * @author sivankar jain
 */

/* jshint -W024 */
/* jshint expr:true */
//to avoid jshint errors for expect

var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var expect = chai.expect;
var app = bootstrap.app;
var models = bootstrap.models;
//var loopback = require ('loopback');
//var debug = require('debug')('soft-delete-mixin-test');

var uuid = require('node-uuid');
var chalk = require('chalk');
var softDeleteMixin = require('../common/mixins/soft-delete-mixin.js');


describe(chalk.blue('soft-delete-mixin tests	Programmatically'), function () {

    var testDatasourceName = uuid.v4();
    var modelName = 'TestModel';

    var TestModelSchema = {
        'name': {
            'type': 'string',
            'required': true,
            'unique': true
        }
    };
    var opts = {
        base: 'BaseEntity',
        mixins: {
            SoftDeleteMixin: true,
            ModelMixin: false,
            VersionMixin: true
        }
    };

    before('create test model', function (done) {

        var dataSource = app.dataSources['db'];

        var TestModel = dataSource.createModel(modelName, TestModelSchema, opts);
        TestModel.attachTo(dataSource);
        softDeleteMixin(TestModel);
        app.model(TestModel, {
            dataSource: 'db'
        });
        done();
    });

    after('delete model clear in memory', function (done) {

        // clearing data from TestModel
        delete models[modelName];
        delete app.dataSource[testDatasourceName];
        done();
    });

    it('Should create TestModel with SoftDeleteMixins SET ', function (done) {
        expect(models[modelName]).not.to.be.null;
        expect(models[modelName].definition.properties).not.to.be.undefined;
        expect(Object.keys(models[modelName].definition.properties)).to.include.members(Object.keys(TestModelSchema));
        expect(Object.keys(models[modelName].definition.properties)).to.include.members(['_isDeleted']);
        expect(Object.keys(models[modelName].settings)).to.include.members(Object.keys(opts));
        expect(Object.keys(models[modelName].settings.mixins)).to.include.members(Object.keys(opts.mixins));
        done();
    });

    it('Should insert data to the TestModel and see if _isDelete is present and set to false ', function (done) {
        var postData = {
            'name': 'TestCaseOne',
            '_version':  uuid.v4()
        };
        models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.false;
                done();
            }
        });
    });

    it('Should delete record from TestModel using destroyById and find the same record ,should not return the record ', function (done) {
        var postData = {
            'name': 'TestCaseTwo',
            '_version':  uuid.v4()
        };
        models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                models[modelName].destroyById(res.id, bootstrap.defaultContext, function (err) {
                    if (err) {
                        done(err);
                    } else {
                        models[modelName].findById(res.id, bootstrap.defaultContext, function (err, record) {
                            if (err) {
                                done(err);
                            } else {
                                expect(record).to.be.null;
                                done();
                            }
                        });
                    }
                });
            }
        });
    });

    xit('Should find with IncludeMixin.softDelete = true, all records should be return ', function (done) {

        var postData = {
            'name': 'TestCaseThree',
            '_version':  uuid.v4()
        };
        models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                models[modelName].destroyById(res.id, bootstrap.defaultContext, function (err) {
                    if (err) {
                        done(err);
                    } else {
                        models[modelName].find({
                            includeMixin: {
                                softDelete: true
                            }
                        }, bootstrap.defaultContext, function (err, record) {
                            if (err) {
                                done(err);
                            } else {
                                expect(record).to.have.length(4);
                                expect(record[0]._isDeleted).to.be.false;
                                expect(record[1]._isDeleted).to.be.true;
                                expect(record[2]._isDeleted).to.be.true;
                                done();
                            }
                        });
                    }
                });
            }
        });
    });
    it('Should delete record from TestModel using destroyAll, on find nothing should be return ', function (done) {
        models[modelName].destroyAll({}, bootstrap.defaultContext, function (err) {
            if (err) {
                done(err);
            } else {
                models[modelName].find({}, bootstrap.defaultContext, function (err, record) {
                    if (err) {
                        done(err);
                    } else {
                        expect(record).to.be.empty;
                        done();
                    }
                });
            }
        });
    });
});
