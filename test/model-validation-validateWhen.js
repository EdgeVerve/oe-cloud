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

var parentModelName = 'CustomerModel';
var childModelName = 'AccountModel';
var addressModelName = 'Address';
describe(chalk.blue('Validation validateWhen test'), function() {

    this.timeout(50000);

    before('setup test data', function(done) {
        models.ModelDefinition.events.once('model-' + childModelName + '-available', function() {
            var parentModel = loopback.getModel(parentModelName);
            var cust1 = {
                'id': 101,
                'name': 'Mike',
                'dob': '1936-06-10',
                'cityType': 'Urban',
                'age': 80,
                'accNo': 1001
            };
            var cust2 = {
                'id': 102,
                'name': 'John',
                'dob': '1998-05-05',
                'cityType': 'Urban',
                'age': 18,
                'accNo': 1002
            };
            var cust3 = {
                'id': 103,
                'name': 'Jack',
                'dob': '1951-02-01',
                'cityType': 'Semi-Urban',
                'age': 65,
                'accNo': 1003
            };
            var cust4 = {
                'id': 104,
                'name': 'Jill',
                'dob': '1961-03-03',
                'cityType': 'Rural',
                'age': 55,
                'accNo': 1004
            };
            parentModel.create(cust1, bootstrap.defaultContext, function(err, results) {
                expect(err).to.be.null;
                parentModel.create(cust2, bootstrap.defaultContext, function(err, results) {
                    expect(err).to.be.null;
                    parentModel.create(cust3, bootstrap.defaultContext,  function(err, results) {
                        expect(err).to.be.null;
                        parentModel.create(cust4, bootstrap.defaultContext,  function(err, results) {
                            expect(err).to.be.null;
                            done();
                        });
                    });
                });
            });
        });

        models.ModelDefinition.create({
            'name': 'Address',
            'base': 'BaseEntity',
            'plural': 'addresses',
            'strict': false,
            'idInjection': true,
            'options': {
                'validateUpsert': true
            },
            'properties': {
                'state': {
                    'type': 'string',
                    'required': true
                },
                'zipcode': {
                    'type': 'string',
                    'required': true,
                    'min': 6,
                    'validateWhen': {
                        'required': '@i.state == "WASHINGTON"'
                    }
                }
            },
            'validations': [],
            'relations': {},
            'acls': [],
            'methods': {}
        }, bootstrap.defaultContext, function(err, result) {
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
                        'id': {
                            'type': 'number',
                            'required': true,
                            'id': true
                        },
                        'name': {
                            'type': 'string',
                            'required': true
                        },
                        'dob': {
                            'type': 'date',
                            'required': true
                        },
                        'age': {
                            'type': 'number',
                            'required': true
                        },
                        'cityType': {
                            'required': 'true',
                            'type': 'string',
                            'in': ['Urban', 'Semi-Urban', 'Rural']
                        },
                        'accNo': {
                            'type': 'number',
                            'required': true
                        },
                        'state': {
                            'type': 'string'
                        }
                    },
                    'validations': [],
                    'oeValidations': {
                        'adddressCheck': {
                            'validateWhen': '@i.state !== undefined && @i.state !== null && @i.state !== ""',
                            'type': 'reference',
                            'errorCode': 'addr-err-001',
                            'refModel': 'Address',
                            'refWhere': '{"state":"{{state}}"}'
                        }
                    },
                    'relations': {},
                    'acls': [],
                    'methods': {}
                }, bootstrap.defaultContext, function(err, model) {
                    if (err) {
                        console.log(err);
                    } else {
                        models.ModelDefinition.create({
                            'name': childModelName,
                            'base': 'BaseEntity',
                            'plural': childModelName + 's',
                            'strict': false,
                            'idInjection': true,
                            'options': {
                                'validateUpsert': true
                            },
                            'properties': {
                                'accountNumber': {
                                    'type': 'number',
                                    'required': true
                                },
                                'uniqueIdentificationNo': {
                                    'type': 'string',
                                    'required': true,
                                    'validateWhen': {
                                        'required': 'Date(@mCustomerModel.dob where accNo = @i.accountNumber).year > 1988'
                                    }
                                },
                                'accountType': {
                                    'type': 'string',
                                    'required': 'true',
                                    'in': ['privilage', 'non-privilage'],
                                    'validateWhen': {
                                        'in': '(@mCustomerModel.cityType where accNo=@i.accountNumber) inArray ["Urban","Semi-Urban"]'
                                    }
                                },
                                'balance': {
                                    'type': 'number',
                                    'required': true,
                                    'min': 5000,
                                    'max': 10000,
                                    'validateWhen': {
                                        'min': '(@mCustomerModel.age where accNo = @i.accountNumber) < 65'
                                    }
                                }
                            },
                            'validations': [],
                            'relations': {
                                'cust': {
                                    'type': 'belongsTo',
                                    'model': 'CustomerModel',
                                    'foreignKey': 'custId'
                                }
                            },
                            'acls': [],
                            'methods': {}
                        }, bootstrap.defaultContext, function(err, model) {
                            if (err) {
                                console.log(err);
                            }
                            expect(err).to.be.not.ok;
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
                name: parentModelName
            }, bootstrap.defaultContext, function(err, d) {
                if (err) {
                    console.log('Error - not able to delete modelDefinition entry for parent Model Hotel');
                    return done();
                }
                var model = loopback.getModel(parentModelName);
                model.destroyAll({}, bootstrap.defaultContext, function() {
                    models.ModelDefinition.destroyAll({
                        name: childModelName
                    }, bootstrap.defaultContext, function(err, d) {
                        if (err) {
                            console.log('Error - not able to delete modelDefinition entry for child Model Room');
                            return done();
                        }
                        var model = loopback.getModel(childModelName);
                        model.destroyAll({}, bootstrap.defaultContext, function() {
                            models.ModelDefinition.destroyAll({
                                name: addressModelName
                            }, bootstrap.defaultContext, function(err, d) {
                                if (err) {
                                    console.log('Error - not able to delete modelDefinition entry for Address Model');
                                    return done();
                                }
                                var model = loopback.getModel(addressModelName);
                                model.destroyAll({}, bootstrap.defaultContext, function() {
                                    done();
                                });
                            });
                        });
                    });
                });
            });
    });

    it('Validation Test - Should insert data successfully despite balance set to 100', function(done) {

        var childModel = loopback.getModel(childModelName);

        var data = {
            'accountNumber': 1001,
            'balance': 100,
            'accountType': 'privilage',
            'custId': 101
        };
        childModel.create(data, bootstrap.defaultContext, function(err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail to insert data successfully', function(done) {

        var childModel = loopback.getModel(childModelName);

        var data = {
            'accountNumber': 1002,
            'accountType': 'non-privilage',
            'uniqueIdentificationNo': 'UAN5123',
            'balance': 100,
            'custId': 102
        };
        childModel.create(data, bootstrap.defaultContext, function(err, results) {
            expect(err).not.to.be.undefined;
            done();
        });
    });

    it('Validation Test - Should insert data successfully (t198)', function(done) {

        var childModel = loopback.getModel(childModelName);

        var data = {
            'accountNumber': 1002,
            'accountType': 'non-privilage',
            'uniqueIdentificationNo': 'UAN5123',
            'balance': 5000,
            'custId': 102
        };
        childModel.create(data, bootstrap.defaultContext, function(err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail to insert data successfully - The customer needs to give identification as the dob is later than 1988', function(done) {

        var childModel = loopback.getModel(childModelName);

        var data = {
            'accountNumber': 1002,
            'accountType': 'non-privilage',
            'balance': 5000,
            'custId': 102
        };
        childModel.create(data, bootstrap.defaultContext, function(err, results) {
            expect(err).not.to.be.undefined;
            done();
        });
    });

    it('Validation Test - Should insert data successfully for urban customer as the accountType is privilage', function(done) {

        var childModel = loopback.getModel(childModelName);

        var data = {
            'accountNumber': 1003,
            'accountType': 'privilage',
            'balance': 5000,
            'custId': 103
        };
        childModel.create(data, bootstrap.defaultContext, function(err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail to insert data for urban customer as the accountType is not privilage or non-privilage', function(done) {

        var childModel = loopback.getModel(childModelName);

        var data = {
            'accountNumber': 1003,
            'accountType': 'regular',
            'balance': 5000,
            'custId': 103
        };
        childModel.create(data, bootstrap.defaultContext, function(err, results) {
            expect(err).not.to.be.undefined;
            done();
        });
    });

    it('Validation Test - Should insert data for rural customer as the accountType need not be privilage or non-privilage', function(done) {

        var childModel = loopback.getModel(childModelName);

        var data = {
            'accountNumber': 1004,
            'accountType': 'regular',
            'balance': 5000,
            'custId': 104
        };
        childModel.create(data, bootstrap.defaultContext, function(err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should insert data successfully as validateWhen condition is false and the reference validation is not applied', function(done) { //sambit

        var parentModel = loopback.getModel(parentModelName);
        var cust = {
            'id': 105,
            'name': 'George',
            'dob': '1981-12-25',
            'cityType': 'Urban',
            'age': 35,
            'accNo': 2001
        };

        parentModel.create(cust, bootstrap.defaultContext, function(err, results) {
            expect(err).to.be.null;
            done();
        });

    });

    it('Validation Test - Should fail to insert data as validateWhen condition is true and the reference validation is applied', function(done) { //sambit

        var parentModel = loopback.getModel(parentModelName);
        var cust = {
            'id': 106,
            'name': 'Bill',
            'dob': '1973-11-03',
            'cityType': 'Urban',
            'age': 43,
            'accNo': 2002,
            'state': 'CALIFORNIA'
        };

        parentModel.create(cust, bootstrap.defaultContext, function(err, results) {
            expect(err).not.to.be.null;
            done();
        });
    });

    it('Validation Test - Should insert data successfully', function(done) {

        var addressModel = loopback.getModel(addressModelName);

        var data = {
            'state': 'WASHINGTON',
            'zipcode': '123456'
        };
        addressModel.create(data, bootstrap.defaultContext, function(err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail to insert data successfully', function(done) {

        var addressModel = loopback.getModel(addressModelName);

        var data = {
            'state': 'WASHINGTON'
        };
        addressModel.create(data, bootstrap.defaultContext, function(err, results) {
            expect(err).not.to.be.undefined;
            done();
        });
    });
    it('Validation Test - Should insert data successfully', function(done) {

        var addressModel = loopback.getModel(addressModelName);

        var data = {
            'state': 'CALIFORNIA'
        };
        addressModel.create(data, bootstrap.defaultContext, function(err, results) {
            expect(err).to.be.null;
            done();
        });
    });

});
