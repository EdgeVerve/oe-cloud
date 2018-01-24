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
var chai = require('chai');
chai.use(require('chai-things'));

describe(chalk.blue('RefCode Validation test'), function() {

    this.timeout(20000);
    var cType;
    var motel;
    var serviceApt;


    before('setup test data', function(done) {
        models.ModelDefinition.events.once('model-ServiceApt-available', function() {
            return;
        });

        models.ModelDefinition.create({
            'name': 'CountryType',
            'base': 'RefCodeBase',
            'plural': 'CountryTypes',
            'strict': false,
            'idInjection': true,
            'options': {
                'validateUpsert': true
            },
            'properties': {},
            'validations': [],
            'relations': {},
            'acls': [],
            'methods': {}
        }, bootstrap.defaultContext, function(err, model) {
            if (err) {
                console.log(err);
            } else {
                models.ModelDefinition.create({
                    'name': 'Motel',
                    'base': 'BaseEntity',
                    'plural': 'Motels',
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
                        'countryIn': {
                            'type': 'array',
                            "refcodetype": "CountryType"
                        }
                    },
                    'validations': [],
                    'relations': {},
                    'acls': [],
                    'methods': {}
                }, bootstrap.defaultContext, function(err, model) {
                    if (err) {
                        console.log(err);
                    } else {
                        models.ModelDefinition.create({
                            'name': 'ServiceApt',
                            'base': 'BaseEntity',
                            'plural': 'ServiceApts',
                            'strict': false,
                            'idInjection': true,
                            'options': {
                                'validateUpsert': true
                            },
                            'properties': {
                                'name': {
                                    'type': 'string'
                                },
                                'countryIn': {
                                    'type': 'string',
                                    'refcodetype': 'CountryType'
                                }
                            },
                            'validations': [],
                            'relations': {},
                            'acls': [],
                            'methods': {}
                        }, bootstrap.defaultContext, function(err, model) {
                            if (err) {
                                console.log(err);
                            }
                            cType = loopback.getModel('CountryType', bootstrap.defaultContext);
                            motel = loopback.getModel('Motel', bootstrap.defaultContext);
                            serviceApt = loopback.getModel('ServiceApt', bootstrap.defaultContext);
                            var data = [{
                                    'code': 'IN',
                                    'description': 'India'
                                },
                                {
                                    'code': 'US',
                                    'description': 'USA'
                                },
                                {
                                    'code': 'UK',
                                    'description': 'United Kingdom'
                                },
                                {
                                    'code': 'CA',
                                    'description': 'Canada'
                                },
                                {
                                    'code': 'DE',
                                    'description': 'Germany'
                                },
                                {
                                    'code': 'AU',
                                    'description': 'Australia'
                                }
                            ];
                            cType.create(data, bootstrap.defaultContext, function(err, results) {
                                expect(err).to.be.null;
                                done();
                            });
                        });
                    }
                    expect(err).to.be.not.ok;
                });
            }
            expect(err).to.be.not.ok;
        });

    });

    after('destroy test models', function(done) {
        models.ModelDefinition.destroyAll({
            name: 'CountryType'
        }, bootstrap.defaultContext, function(err, d) {
            if (err) {
                console.log('Error - not able to delete modelDefinition entry for CountryType');
            }
            cType.destroyAll({}, bootstrap.defaultContext, function() {
                models.ModelDefinition.destroyAll({
                    name: 'Motel'
                }, bootstrap.defaultContext, function(err, d) {
                    if (err) {
                        console.log('Error - not able to delete modelDefinition entry for motel');
                    }
                    motel.destroyAll({}, bootstrap.defaultContext, function() {
                        models.ModelDefinition.destroyAll({
                            name: 'ServiceApt'
                        }, bootstrap.defaultContext, function(err, d) {
                            if (err) {
                                console.log('Error - not able to delete modelDefinition entry for ServiceApt');
                            }
                            serviceApt.destroyAll({}, bootstrap.defaultContext, function() {
                                done();
                            });
                        });
                    });
                })
            });
        });
    });


    afterEach('destroy execution context', function(done) {
        done();
    });

    it('refcode Test - Should insert data with array ref code successfully', function(done) {
        var data = {
            'name': 'Holiday Inn',
            'countryIn': ["IN", "US", "UK"]
        };
        motel.create(data, bootstrap.defaultContext, function(err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Refcode Test - Should insert data with single refcode successfully', function(done) {
        var data = {
            'name': 'Palm Homestay',
            'countryIn': "IN"
        };
        serviceApt.create(data, bootstrap.defaultContext, function(err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('refcode Test - Should fail to insert data as array contains invalid ref code', function(done) {
        var data = {
            'name': 'Mariott',
            'countryIn': ['IN', 'US', 'PK']
        };
        motel.create(data, bootstrap.defaultContext, function(err, results) {
            expect(err).not.to.be.null;
            expect(err.toString().indexOf('PK')).to.be.above(-1);
            done();
        });
    });

    it('refcode Test - Should fail to insert data as invalid ref code is given', function(done) {
        var data = {
            'name': 'Mane Homestey',
            'countryIn': 'JP'
        };
        serviceApt.create(data, bootstrap.defaultContext, function(err, results) {
            expect(err).not.to.be.null;
            expect(err.toString().indexOf('JP')).to.be.above(-1);
            done();
        });
    });

    it('refcode Test - Should insert data successfully as no refcode given', function(done) {
        var data = {
            'name': 'Hilton'
        };
        motel.create(data, bootstrap.defaultContext, function(err, results) {
            expect(err).to.be.null;
            done();
        });
    });
});