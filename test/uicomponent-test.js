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
var async = require('async');

describe(chalk.blue('UIElement'), function() {
	this.timeout(10000);

    var designationModelName = 'Designation';
    var testModelName = 'ModelPerson';

    var designationModelDetails = {
        'name': designationModelName,
        'plural': 'Designation',
        'base': 'EnumBase',
        'idInjection': true,
        'options': {
            'validateUpsert': true
        },
        'properties': {},
        'validations': [],
        'relations': {},
        'acls': [],
        'methods': {},
        'enumList': [
            {
                'code': 'DV',
                'description': 'Developer'
            },
            {
                'code': 'MGR',
                'description': 'Manager'
            }
         ]
    };

    var testModelDetails = {
        'name': testModelName,
        'base': 'BaseEntity',
        'idInjection': true,
        'options': {
            'validateUpsert': true
        },
        'properties': {
            'firstName': {
                'type': 'string',
                'required': true
            },
            'middleName': {
                'type': 'string',
                'required': false
            },
            'lastName': {
                'type': 'string',
                'required': false
            },
            'gender': {
                'type': 'string',
                'required': true
            },
            'language': {
                'type': 'string',
                'required': true
            },
            'birthDate': {
                'type': 'date',
                'required': true
            },
            'captureTime': {
                'type': 'timestamp',
                'required': true
            },
            'annualIncome': {
                'type': 'number',
                'required': false
            },
            'placeOfBirth': {
                'type': 'String',
                'max': 35,
                'required': false
            },
            'profession': {
                'type': 'string',
                'max': 35,
                'required': false
            },
            'nationality': {
                'type': 'string',
                'max': 35,
                'required': false
            },
            'minorIndicator': {
                'type': 'boolean',
                'required': false,
                'default': false
            },
            'qualifications': {
                'type': ['string']
            },
            'literals': {
                'type': ['Literal']
            },
            'designation': {
                'type': 'string',
                'enumtype': 'Designation'
            },
            'email': {
                'type': 'email'
            }
        },
        'validations': [],
        'relations': {},
        'acls': [],
        'methods': {}
    };


    before('create models', function(done) {
        var ModelDefinition = bootstrap.models['ModelDefinition'];
        async.series([
              function createModel(cb) {
                var model = bootstrap.models[designationModelName];
                if (model) {
                    cb();
                } else {
                    ModelDefinition.create(designationModelDetails, bootstrap.defaultContext, function(err, res) {
                        if (err) {
                            console.log('unable to create model ', err);
                            cb();
                        } else {
                            cb();
                        }
                    });
                }
            },
              function(cb) {
                var model = bootstrap.models[testModelName];
                if (model) {
                    cb();
                } else {
                    ModelDefinition.create(testModelDetails, bootstrap.defaultContext, function(err, res) {
                        if (err) {
                            console.log('unable to create model ', err);
                            cb();
                        } else {
                            cb();
                        }
                    });
                }
            },
              function alldone() {
                done();
            }
           ]);
    });

    it('fetch using modelmeta method', function(done) {

        var context = {
            ctx: {
                tenantId: 'default',
                remoteUser: 'admin'
            }
        };

        this.timeout(2000);

        var UIComponent = bootstrap.models['UIComponent'];
        UIComponent.modelmeta(testModelName, context, function(err, data) {
            //expect(data.models[testModelName].designation).to.be.defined;
            var context2 =  {
            ctx: {
                tenantId: 'default',
                remoteUser: 'admin'
            }
            };
            UIComponent.modelmeta(testModelName, context2, function(err, data) {
                //expect(data.models[testModelName].designation).to.be.defined;
                done();
            });
        });
    });

  
    it('load default template', function(done) {

        var context = {
            ctx: {
                tenantId: 'default',
                remoteUser: 'admin'
            }
        };

        this.timeout(2000);
        var UIComponent = bootstrap.models['UIComponent'];
        UIComponent.configure([testModelName], context, function(err, data) {
            UIComponent.component('modelperson-form.html', context, function(err, data) {
                expect(data).not.to.be.null;
                done();
            });
        });
    });

});
