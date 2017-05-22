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

var modelName = 'LoanApplication';
var bussinessRuleModel = 'BusinessRule';

var api = bootstrap.api;
var url = bootstrap.basePath;
var accessToken;

describe(chalk.blue('Business Rule Mixin test'), function() {

    this.timeout(20000);

    before('setup test data', function(done) {
        bootstrap.createAccessToken(bootstrap.defaultContext.ctx.remoteUser.username,
            function fnAccessToken(err, token) {
                accessToken = token;
                models.ModelDefinition.events.once('model-' + modelName + '-available', function() {
                    var myModel = loopback.getModel(bussinessRuleModel);
                    var data = [
                        {
                            'modelName': modelName,
                            'expression': 'if(@i.AccountDetails.salary <= 20){return @i.loanAmount <= @i.AccountDetails.salary * 2}',
                            'verb': [
                            'post'
                        ],
                            'category': 'LoanEligibility',
                            'code': 'err-salary-01',
                            'description': 'if salary is less than 20lacs, maximum loan amount allowed is twice of salary'
                        },
                        {
                            'modelName': modelName,
                            'expression': 'if(@i.AccountDetails.salary > 20){return @i.loanAmount <= @i.AccountDetails.salary * 3}',
                            'verb': [
                            'post'
                        ],
                            'category': 'LoanEligibility',
                            'code': 'err-salary-02',
                            'description': 'if salary is greater than 20lacs, maximum loan amount allowed is thrice of salary'
                        }
                ];

                    var loanModel = loopback.getModel(modelName);
                    loanModel.remoteMethod(
                        'getLoanEligibility', {
                            description: 'Check the  eligibility of the loan application.',
                            accepts: [
                                {
                                    arg: 'req',
                                    type: 'object',
                                    http: {
                                        source: 'req'
                                    }
                                },
                                {
                                    arg: 'data',
                                    type: 'object',
                                    required: true,
                                    http: {
                                        source: 'body'
                                    }
                                }
                        ],
                            returns: {
                                arg: 'result',
                                type: 'object',
                                root: true
                            },
                            http: {
                                verb: 'post'
                            }
                        }
                    );

                    loanModel.getLoanEligibility = function(data, req, options, fn) {


                        var loanModel = loopback.getModel(modelName);
                        var businessModel = loopback.getModel(bussinessRuleModel);

                        if (fn === undefined && typeof options === 'function') {
                            fn = options;
                            options = {};
                        }

                        var where = {};
                        var filter = {};
                        where['modelName'] = modelName;
                        where['category'] = 'LoanEligibility';
                        filter['where'] = where;

                        var inst = req;

                        businessModel.find(filter, options, function(err, rules) {
                            if (err) {
                                fn(null, null);
                            } else {
                                loanModel.prototype.processBusinessRules(rules, inst, options, function(errCode) {
                                    var response = null;

                                    if (errCode && errCode.length > 0) {
                                        response = {};
                                        response.message = errCode[0];
                                        fn(null, response);
                                    } else {
                                        fn(null, response);
                                    }
                                });
                            }
                        });

                    };


                    myModel.create(data, bootstrap.defaultContext, function(err, results) {
                        expect(err).to.be.null;
                        done();
                    });
                });

                models.ModelDefinition.create({
                    'name': modelName,
                    'base': 'BaseEntity',
                    'strict': false,
                    'plural': modelName + 's',
                    'idInjection': true,
                    'options': {
                        'validateUpsert': true
                    },
                    'properties': {
                        'loanAmount': {
                            'type': 'number',
                            'required': true
                        },
                        'DOB': {
                            'type': 'date',
                            'required': true
                        },
                        'employmentType': {
                            'type': 'string',
                            'required': true
                        },
                        'currentLocation': {
                            'type': 'string',
                            'required': true
                        },
                        'status': {
                            'type': 'number'

                        },
                        'hasExistingLoan': {
                            'type': 'boolean'
                        },
                        'existingLoanType': {
                            'type': 'string'
                        },
                        'existingLoanTenure': {
                            'type': 'number'
                        },
                        'existingLoanEmi': {
                            'type': 'number'
                        }
                    },
                    'relations': {
                        'salariedAccount': {
                            'type': 'embedsOne',
                            'model': 'SalariedAccount',
                            'property': 'AccountDetails',
                            'options': {
                                'validate': true
                            }
                        }
                    },
                    'validations': [],
                    'acls': [],
                    'methods': {}
                }, bootstrap.defaultContext, function(err, model) {
                    if (err) {
                        console.log(err);
                    }
                    expect(err).to.be.null;
                });
            });
    });

    after('destroy test models', function(done) {
        models.ModelDefinition.destroyAll({
            name: modelName
        }, bootstrap.defaultContext, function(err, d) {
            if (err) {
                console.log('Error - not able to delete modelDefinition entry for mysettings');
                return done();
            }
            var model = loopback.getModel(modelName);
            model.destroyAll({}, bootstrap.defaultContext, function() {
                done();
            });
        });
    });

    it('Validation Test - Should fail to insert data', function(done) {
        var URL = url + '/LoanApplications/getLoanEligibility?accessToken=' + accessToken;

        var postData = {
            'AccountDetails': {
                'salary': 20
            },
            'loanAmount': 50
        };

        api.post(URL)
            .set('Accept', 'application/json')
            .set('TENANT_ID', bootstrap.defaultContext.ctx.tenantId)
            .send(postData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    throw new Error(err);
                } else {
                    var response = JSON.parse(resp.text);
                    expect(response.message).to.equal('err-salary-01');
                    done();
                }
            });
    });

    it('Validation Test - Should sucessfully insert data', function(done) {
        var URL = url + '/LoanApplications/getLoanEligibility?accessToken=' + accessToken;

        var postData = {
            'AccountDetails': {
                'salary': 20
            },
            'loanAmount': 40
        };

        api.post(URL)
            .set('Accept', 'application/json')
            .send(postData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    throw new Error(err);
                } else {
                    expect(resp.text).to.equal('null');
                    done();
                }
            });

    });

    it('Validation Test - Should fail to insert data', function(done) {
        var URL = url + '/LoanApplications/getLoanEligibility?accessToken=' + accessToken;

        var postData = {
            'AccountDetails': {
                'salary': 21
            },
            'loanAmount': 64
        };

        api.post(URL)
            .set('Accept', 'application/json')
            .send(postData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    throw new Error(err);
                } else {
                    var response = JSON.parse(resp.text);
                    expect(response.message).to.equal('err-salary-02');
                    done();
                }
            });

    });

    it('Validation Test - Should sucessfully insert data', function(done) {
        var URL = url + '/LoanApplications/getLoanEligibility?accessToken=' + accessToken;
        var postData = {
            'AccountDetails': {
                'salary': 21
            },
            'loanAmount': 62
        };

        api.post(URL)
            .set('Accept', 'application/json')
            .send(postData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    throw new Error(err);
                } else {
                    expect(resp.text).to.equal('null');
                    done();
                }
            });

    });
});