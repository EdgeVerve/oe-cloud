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

var parentModelName = 'Location';
var childModelName = 'OrderModel';

describe(chalk.blue('EV Validation Custom test'), function() {

    this.timeout(20000);

    before('setup test data', function(done) {
        models.ModelDefinition.events.once('model-' + childModelName + '-available', function() {
            var parentModel = loopback.getModel(parentModelName);
            var data = [{
                "companyCode": "Company1",
                "locationCode": "Branch1"
            }, {
                "companyCode": "SellerCompany",
                "locationCode": "BranchSeller1"
            }, {
                "companyCode": "SellerCompany",
                "locationCode": "BranchSeller2"
            }, {
                "companyCode": "Company1",
                "locationCode": "Branch2"
            }];

            parentModel.create(data, bootstrap.defaultContext, function (err, results) {
                expect(err).to.be.null;
                done();
            });

        });

        models.ModelDefinition.create({
            "name": "Location",
            "base": "BaseEntity",
            "idInjection": false,
            "strict": "validate",
            "options": {
                "validateUpsert": true
            },
            "properties": {
                "companyCode": {
                    "type": "string",
                    "required": true
                },
                "locationCode": {
                    "type": "string",
                    "required": true,
                    "max": 200
                }
            }
        }, bootstrap.defaultContext, function (err, model) {
            if (err) {
                console.log('EV Validation Custom test : Error in create model ', err);
            } else {
                models.ModelDefinition.create({
                    "name": childModelName,
                    "plural": childModelName + "s",
                    "base": "BaseEntity",
                    "strict": false,
                    "idInjection": false,
                    "options": {
                        "validateUpsert": true
                    },
                    "properties": {
                        "buyerCompanyCode": {
                            "type": "string",
                            "required": true
                        },
                        "requestedBillingLocation": {
                            "type": "Location",
                            "required": true
                        }
                    },
                    "validations": [],
                    "relations": {},
                    "acls": [],
                    "methods": {},
                    "oeValidations": {
                        "requestedBillingCompanyCheck": {
                            "validateWhen": {},
                            "type": "custom",
                            "expression": "(@mLocation.companyCode where locationCode = @i.requestedBillingLocation.locationCode and companyCode = @i.buyerCompanyCode) == @i.buyerCompanyCode"
                        }
                    }
                }, bootstrap.defaultContext, function (err, model) {
                    if (err) {
                        console.log('Error creating Order model definition', err);
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
        }, bootstrap.defaultContext, function (err, d) {
            if (err) {
                console.log('Error - not able to delete modelDefinition entry for parent Model Hotel');
                return done();
            }
            var model = loopback.getModel(parentModelName);
            model.destroyAll({}, bootstrap.defaultContext, function() {
                models.ModelDefinition.destroyAll({
                    name: childModelName
                }, bootstrap.defaultContext, function (err, d) {
                    if (err) {
                        console.log('Error - not able to delete modelDefinition entry for child Model Room');
                        return done();
                    }
                    var model = loopback.getModel(childModelName);
                    model.destroyAll({}, bootstrap.defaultContext, function() {
                        done();
                    });
                });
            });
        });
    });


    it('Validation Test - Should insert data successfully', function(done) {

        var childModel = loopback.getModel(childModelName);

        var data = [{
            "buyerCompanyCode": "SellerCompany",
            "requestedBillingLocation": {
                "companyCode": "SellerCompany",
                "locationCode": "BranchSeller1"
            }
        }, {
            "buyerCompanyCode": "Company1",
            "requestedBillingLocation": {
                "companyCode": "Company1",
                "locationCode": "Branch2"
            }
        }];
        childModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail to insert data', function(done) {

        var childModel = loopback.getModel(childModelName);

        var data = {
            "buyerCompanyCode": "Company1",
            "requestedBillingLocation": {
                "companyCode": "Company1",
                "locationCode": "BranchSeller2"
            }
        };
        childModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.null;
            done();
        });
    });

});