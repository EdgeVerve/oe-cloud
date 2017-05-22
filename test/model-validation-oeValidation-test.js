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
//var app = bootstrap.app;

var chai = require('chai');
chai.use(require('chai-things'));

//var supertest = require('supertest');
//var api = supertest(app);
var parentModelName = 'VehicleModel';
var childModelName = 'Car';
var errorModelName = 'Error';
//var modelNameUrl = bootstrap.basePath + '/' + parentModelName;
//var records = [];

describe(chalk.blue('EV Validation test'), function () {
    //var loopbackContext;
    this.timeout(20000);

    before('setup test data', function (done) {
        models.ModelDefinition.events.once('model-' + childModelName + '-available', function () {
            var parentModel = loopback.getModel(parentModelName);
            var data = [{
                    'fuel': 'petrol'
                },
                {
                    'fuel': 'diesel',
                    'scope': {
                        'location' : 'INDIA'
                    }
                }];
            parentModel.create(data, bootstrap.defaultContext, function (err, results) {
                expect(err).to.be.null;
                done();
            });
        });

        models.ModelDefinition.create({
            'name': parentModelName,
            'base': 'BaseEntity',
            'plural': parentModelName + 's',
            'strict': false,
            'idInjection': true,
            'options': {
                'validateUpsert': true
            },
            'properties': {
                'fuel': {
                    'type': 'string',
                    'required': true
                }
            },
            'validations': [],
            'relations': {},
            'acls': [],
            'methods': {}
        }, bootstrap.defaultContext, function (err, model) {
            if (err) {
                console.log(err);
            } else {
                models.ModelDefinition.create({
                    'name': 'Car',
                    'base': 'BaseEntity',
                    'plural': 'cars',
                    'strict': false,
                    'idInjection': true,
                    'options': {
                        'validateUpsert': true
                    },
                    'properties': {
                        'name': {
                            'type': 'string',
                            'required': true
                        },
                        'fuelType': {
                            'type': 'string',
                            'required': true
                        },
                        'testField1': {
                            'type': 'string'
                        },
                        'testField2': {
                            'type': 'string',
                            'allowScript': true
                        }
                    },
                    'validations': [],
                    'oeValidations': {
                        'fuelCheck': {
                            'validateWhen': {},
                            'type': 'reference',
                            'errorCode': 'fuel-err-001',
                            'refModel': 'VehicleModel',
                            'refWhere': '{\"fuel\":\"{{fuelType}}\"}'
                        }
                    },
                    'relations': {},
                    'acls': [],
                    'methods': {}
                }, bootstrap.defaultContext, function (err, model) {
                    if (err) {
                        console.log(err);
                    }
                    expect(err).to.be.not.ok;
                });
            }
            expect(err).to.be.not.ok;
        });
    });

    after('destroy test models', function (done) {
        models.ModelDefinition.destroyAll({
            name: parentModelName
        }, bootstrap.defaultContext, function (err, d) {
            if (err) {
                console.log('Error - not able to delete modelDefinition entry for parent Model Hotel');
                return done();
            }
            var model = loopback.getModel(parentModelName);
            model.destroyAll({}, bootstrap.defaultContext, function () {
                models.ModelDefinition.destroyAll({
                    name: childModelName
                }, bootstrap.defaultContext, function (err, d) {
                    if (err) {
                        console.log('Error - not able to delete modelDefinition entry for child Model Room');
                        return done();
                    }
                    var model = loopback.getModel(childModelName);
                    model.destroyAll({}, bootstrap.defaultContext, function () {
                        done();
                    });
                });
            });
        });
    });

    it('Validation Test - Should insert data successfully as default scope has a record for fuel petrol', function (done) {

        var childModel = loopback.getModel(childModelName);
        var data = {
            'name': 'BMW',
            'fuelType': 'petrol'
        };
        childModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Prevent string field to have a script tag', function (done) {

        var childModel = loopback.getModel(childModelName);
        var data = {
            'name': 'Tata',
            'fuelType': 'petrol',
            'testField1': '<script a="1">alert(1)</script>'
        };
        childModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.null;
            done();
        });
    });

    it('Validation Test - Allow string field to have a script tag when allowScript is true', function (done) {

        var childModel = loopback.getModel(childModelName);
        var data = {
            'name': 'Tata',
            'fuelType': 'petrol',
            'testField2': '<script>alert(1)</script>'
        };
        childModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail to insert data as default scope do not have any record for fuel diesel', function (done) {

        var childModel = loopback.getModel(childModelName);

        var data = {
            'name': 'BMW',
            'fuelType': 'diesel'
        };
        childModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.null;
            done();
        });
    });

    it('Validation Test - Should insert data successfully as provided scope has a record for fuel diesel', function (done) {

        var childModel = loopback.getModel(childModelName);

        var data = {
            'name': 'BMW',
            'fuelType': 'diesel',
            'scope': {
                'location' : 'INDIA'
            }
        };
        childModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail to insert data and error message is same as error code', function (done) {
        var childModel = loopback.getModel(childModelName);
        var data = {
            'name': 'KIA',
            'fuelType': 'diesel'
        };

        childModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err.details.messages.errs[0].message).to.equal(err.details.messages.errs[0].code);
            done();
        });
    });

    it('Validation Test - Should fail to insert data and error message should not be equal to error code', function (done) {
        var errorModel = loopback.getModel(errorModelName);
        var childModel = loopback.getModel(childModelName);

        var errorData = {
            "errCode": "fuel-err-001",
            "errMessage": "{{name}} in {{path}} is not valid"
        };
        var data = {
            'name': 'KIA',
            'fuelType': 'diesel'
        };

        errorModel.create(errorData, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.null;
            childModel.create(data, bootstrap.defaultContext, function (err, results) {
                expect(err).to.not.be.null;
                expect(err.details.messages.errs[0].message).to.not.equal(err.details.messages.errs[0].code);
                done();
            });
        });
    });

});
