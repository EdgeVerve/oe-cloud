/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 *   	1)	In before function
 *		a.	Create model
 *
 *	2)	Test case 1 ---  see if the model is successfully created
 *		a.	Check if all the audit-fileds-mixins are present
 *
 *	3)	Test case 2  ---  add data to the model
 *		a.	Add new data
 *		b.	Check if audit-fileds-mixins are not null and undefined
 *		c.	Check if mixins is set properly
 *
 *	4)	Test case 3  ---  add data to the model, update the same record using upsert
 *		a.	Add new data
 *		b.	Check if audit-fileds-mixins are not null and undefined
 *		c.  update the same record with time delay of 3 sec.
 *		d.  compare the old modifiedOn and new ModifiendOn both should be different.
 *		e.  createdBy and createdOn should be same.
 *
 *	5) 	Test case 4  ---  add data to the model, update the same record using upsert with
 *	   		new value for audit-fields(_type, createdOn, createdBy ),
 *			check if createdOn, createdBy, _type are newy value or previous (idealy value should not change)
 *		a.	Add new data
 *		b.  update the same record with time delay of 3 sec.
 *		c.  compare the old modifiedOn and new ModifiendOn both should be different.
 *		d.  _type, createdBy and createdOn should be same as the Time of create and not any new value that user passes.
 *
 *	6)	In after function
 *		a.  Delete all records from the Model
 *		b.  Delete Data source
 *		c.  Delete Model
 *
 *@author Sivankar Jain
 */
/* jshint -W024 */
/* jshint expr:true */
//to avoid jshint errors for expect

var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var expect = chai.expect;
var models = bootstrap.models;
var debug = require('debug')('audit-field-mixin-test');
var clonedeep = require('lodash').cloneDeep;

chai.use(require('chai-datetime'));

describe('audit-fields-mixin tests	Programmatically', function () {

    var modelName = 'TestModel';

    var TestModelSchema = {
        name: modelName,
        properties: {
            'name': {
                'type': 'string',
                'required': true
            }
        },
        strict: true,
        base: 'BaseEntity',
        mixins: {

        }

    };

    var audit_fields = ['_type', '_createdBy', '_modifiedBy', '_createdOn', '_modifiedOn'];

    var defaultContext = { ctx: {} };
    defaultContext.ctx.tenantId = 'testTenant';
    defaultContext.ctx.remoteUser = 'insertUser';

    var updateContext = { ctx: {} };
    updateContext.ctx.tenantId = 'testTenant';
    updateContext.ctx.remoteUser = 'updateUser';

    this.timeout(4000);

    before('create test model', function (done) {
        models.ModelDefinition.create(TestModelSchema, defaultContext, function (err, res) {
            if (err) {
                console.log('error in create test model', err);
                done(err);
            } else {
                done();
            }
        });
    });

    after('delete model clear in memory', function (done) {
        // clearing data from TestModel
        models[modelName].destroyAll({ name: modelName }, defaultContext, function (err, info) {
            if (err) {
                done(err);
            } else {
                debug('number of record deleted -> ', info.count);
                models.ModelDefinition.destroyAll({ name: modelName }, defaultContext, function (err, res) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
            }
        });
    });

    it('Should -- make TestModel availabe in the app with AuditFieldMixins SET', function (done) {
        expect(models[modelName]).not.to.be.null;
        expect(models[modelName].definition.properties).not.to.be.undefined;
        expect(Object.keys(models[modelName].definition.properties)).to.include.members(Object.keys(TestModelSchema.properties));
        expect(Object.keys(models[modelName].definition.properties)).to.include.members(audit_fields);
        expect(Object.keys(models[modelName].settings.mixins)).to.include.members(Object.keys(TestModelSchema.mixins));
        done();
    });

    it('Should Add data to the TestModel and see if audit fields are succesfully present with data', function (done) {
        var postData = {
            'name': 'TestCaseOne',
            '_type': 'hello'
        };

        models[modelName].create(postData, defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res._type).not.to.be.equal(postData._type);

                audit_fields.forEach(function (field) {
                    expect(res[field]).not.to.be.null;
                    expect(res[field]).not.to.be.undefined;
                });
                expect(res['_modifiedBy']).to.be.equal(defaultContext.ctx.remoteUser);
                expect(res['_createdBy']).to.be.equal(defaultContext.ctx.remoteUser);
                done();
            }
        });
    });

    it('Should update data and see if audit fields are updated (modifiedOn, modefiedBy should change)', function (done) {
        var postData = {
            'name': 'TestCaseTwo'
        };

        models[modelName].create(postData, defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                postData.id = res.id;
                postData.name = 'updatedName';
                postData._version = res._version;
                models[modelName].upsert(postData, updateContext, function (err, updateRes) {
                    if (err) {
                        done(err);
                    } else {
                        expect(updateRes.name).to.be.equal(postData.name);

                        audit_fields.forEach(function (field) {
                            expect(updateRes[field]).not.to.be.null;
                            expect(updateRes[field]).not.to.be.undefined;
                        });

                        expect(updateRes['_modifiedBy']).to.be.equal(updateContext.ctx.remoteUser);
                        expect(updateRes['_createdBy']).to.be.equal(defaultContext.ctx.remoteUser);
                        expect(updateRes['_modifiedOn']).not.to.be.equalTime(updateRes['_createdOn']);
                        expect(updateRes['_modifiedOn']).not.to.be.equalTime(res['_modifiedOn']);
                        expect(updateRes['_createdOn']).to.be.equalTime(res['_createdOn']);
                        done();
                    }
                });
            }
        });
    });


    it('Should update data with _type, _createdOn, _createdBy set, and see if audit fields are updated' +
        '  without changing _createdOn, _createdBy and _type ',
        function (done) {

            var postData = {
                'name': 'TestCaseTwo'
            };
            // var resData;

            models[modelName].create(postData, defaultContext, function (err, res) {
                if (err) {
                    done(err);
                } else {

                    postData.id = res.id;
                    postData.name = 'updatedName';
                    postData._type = 'new type';
                    postData._createdBy = 'new User';
                    postData._modifiedBy = 'new User';
                    postData._createdOn = new Date();
                    postData._version = res._version;
                    var postdata1 = clonedeep(postData);

                    models[modelName].upsert(postData, updateContext, function (err, updateRes) {
                        if (err) {
                            done(err);
                        } else {
                            expect(updateRes.name).to.be.equal(postData.name);
                            expect(updateRes._type).to.be.equal(res._type);
                            expect(updateRes['_modifiedBy']).not.to.be.equal(res['_modifiedBy']);
                            expect(updateRes['_modifiedBy']).to.be.equal(updateContext.ctx.remoteUser);
                            expect(updateRes['_createdBy']).to.be.equal(res['_createdBy']);
                            expect(updateRes['_createdBy']).not.to.be.equal(postdata1['_createdBy']);
                            expect(updateRes['_modifiedOn']).not.to.be.equalTime(res['_modifiedOn']);
                            expect(updateRes['_createdOn']).to.be.equalTime(res['_createdOn']);
                            expect(updateRes['_createdOn']).not.to.be.equalTime(postdata1['_createdOn']);
                            done();
                        }
                    });
                }
            });
        });

});