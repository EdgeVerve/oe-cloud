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
var parentModelName = 'HotelModel';
var childModelName = 'RoomModel';
//var modelNameUrl = bootstrap.basePath + '/' + parentModelName;
//var records = [];

describe(chalk.blue('Embedded Model Validation test'), function () {
    //var loopbackContext;
    this.timeout(20000);

    before('setup test data', function (done) {
        models.ModelDefinition.events.once('model-' + parentModelName + '-available', function () {
            done();
        });
        models.ModelDefinition.create([{
            'name': childModelName,
            'base': 'BaseEntity',
            'plural': childModelName+'s',
            'strict': false,
            'idInjection': true,
            'options': {
                'validateUpsert': true
            },
            'properties': {
                'category': {
                    'type': 'string',
                    'min': 2
                },
                'price': {
                    'type': 'number',
                    'required': true
                }
            },
            'validations': [],
            'relations': {},
            'acls': [],
            'methods': {}
        }, {
                'name': 'RestaurantModel',
                'base': 'BaseEntity',
                'plural': 'RestaurantModels',
                'strict': false,
                'idInjection': true,
                'options': {
                    'validateUpsert': true
                },
                'properties': {
                    'cuisine': {
                        'type': 'string',
                        'required': true
                    }
                },
                'validations': [],
                'relations': {},
                'acls': [],
                'methods': {}
            }, {
                'name': 'LocationModel',
                'base': 'BaseEntity',
                'plural': 'LocationModels',
                'strict': false,
                'idInjection': true,
                'options': {
                    'validateUpsert': true
                },
                'properties': {
                    'country': {
                        'type': 'string',
                        'required': true
                    }
                },
                'validations': [],
                'relations': {},
                'acls': [],
                'methods': {}
            }], bootstrap.defaultContext, function (err, model) { 
            if (err) {
                console.log(err);
            } else {
                models.ModelDefinition.create({
                    'name': parentModelName,
                    'base': 'BaseEntity',
                    'plural': parentModelName+'s',
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
                        'rating': {
                            'type': 'number',
                            'required': true
                        },
                        'typesOfRoom': {
                            'type': ['RoomModel'],
                            'required': true,
                            'min': 2
                        }
                    },
                    'validations': [],
                    'relations': {
                        '_restaurants': {
                            'type': 'embedsMany',
                            'model': 'RestaurantModel',
                            'property': 'restaurants'
                        },
                        '_locations': {
                            'type': 'embedsMany',
                            'model': 'LocationModel',
                            'property': 'locations',
                            'options': {
                                'validate': false
                            }
                        }
                    },
                    'acls': [],
                    'methods': {}
                }, bootstrap.defaultContext, function (err, model) { 
                    if (err) {
                        console.log(err);
                    }
                    expect(err).to.be.not.ok;
                });
            }
            expect(err).to.be.null; 
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
                    name: {inq : ['RoomModel','RestaurantModel','LocationModel']}
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


    afterEach('destroy execution context', function (done) {
        done();
    });

    it('Validation Test - Should insert data successfully', function (done) {

        var parentModel = loopback.getModel(parentModelName);

        var data = {
            'name': 'TAJ',
            'rating': 7,
            'typesOfRoom': [
                {
                    'category': 'Suite',
                    'price': 10000
                },
                {
                    'category': 'Deluxe',
                    'price': 7000
                }
            ]
        };
        parentModel.create(data, bootstrap.defaultContext, function (err, results) { 
            expect(err).to.be.null; 
            done();
        });
    });

    it('Validation Test - Should fail to insert data successfully as price property is required for Room', function (done) {

        var parentModel = loopback.getModel(parentModelName);

        var data = {
            'name': 'TAJ',
            'rating': 7,
            'typesOfRoom': [
                {
                    'category': 'Suite',
                    'price': 10000
                },
                {
                    'category': 'Deluxe'
                },
                {
                    'category': '',
                    'price': 1000
                },
                {
                    'category': null,
                    'price': 100
                }
            ]
        };
        parentModel.create(data, bootstrap.defaultContext, function (err, results) { 
            expect(err).not.to.be.undefined; 
            done();
        });
    });

    it('Validation Test - Should fail to insert data successfully as category can only have alphabets', function (done) {

        var childModel = loopback.getModel(childModelName);

        var data = {
            'category': 'Suite123',
            'price': 10000
        };
        childModel.create(data, bootstrap.defaultContext, function (err, results) { 
            expect(err).not.to.be.undefined; 
            done();
        });
    });

    it('Validation Test - Should insert data successfully as validate options is false for _locations relation', function (done) {
        
        var parentModel = loopback.getModel(parentModelName);
        
        var data = {
            'name': 'TAJ',
            'rating': 7,
            'typesOfRoom': [
                {
                    'category': 'Suite',
                    'price': 10000
                },
                {
                    'category': 'Deluxe',
                    'price': 7000
                }
            ],
            "restaurants": [{
                "cuisine": "thai"
            }],
            "locations": [{}]
        };
        parentModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail to insert data as validation for _restaurants relation is by default true', function (done) {
        
        var parentModel = loopback.getModel(parentModelName);
        
        var data = {
            'name': 'TAJ',
            'rating': 7,
            'typesOfRoom': [
                {
                    'category': 'Suite',
                    'price': 10000
                },
                {
                    'category': 'Deluxe',
                    'price': 7000
                }
            ],
            "restaurants": [{}],
            "locations": [{}]
        };
        parentModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.undefined;
            expect(err).not.to.be.null;
            done();
        });
    });

});
