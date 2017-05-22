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
// var app = bootstrap.app;

var chai = require('chai');
chai.use(require('chai-things'));

var api = bootstrap.api;

var CustomerUrl = bootstrap.basePath;

describe(chalk.blue('service - personalization - relation test'), function () {
    var tenantId = 'test-tenant';
    var Customer = 'CustomerServPersn';
    var Address = 'AddressServPersn';
    this.timeout(20000);

    before('setup test data', function (done) {
                //upload data
                var data = [
                    {
                        'name': 'jenny',
                        'age': 23,
                        'billingAddress': {
                            'city': 'bangalore',
                            'state': 'Karnataka',
                            'street': 'HSR'
                        }
                },

                    {
                        'name': 'John',
                        'age': 50,
                        'billingAddress': {
                            'city': 'blore',
                            'state': 'KTK',
                            'street': 'BTM'
                        }
                },
                    {
                        'name': 'Jack',
                        'age': 50,
                        'billingAddress': {
                            'city': 'blore',
                            'state': 'KTK',
                            'street': 'Ecity'
                        }
                }
            ];
		
            models.ModelDefinition.create({
                name: Address,
                base: 'BaseEntity',
                plural: Address + 's',
                'properties': {
                    'street': {
                        'type': 'string'
                    },
                    'city': {
                        'type': 'string'
                    },
                    'state': {
                        'type': 'string'
                    }
                }

            }, bootstrap.defaultContext, function() {
	
				models.ModelDefinition.create({
					name: Customer,
					base: 'BaseEntity',
					plural: Customer + 's',
					properties: {
						'name': {
							'type': 'string'
						},
						'age': {
							'type': 'Number'
						}
					},
					'relations': {
						'address': {
							'type': 'embedsOne',
							'model': 'AddressServPersn',
							'property': 'billingAddress',
							'options': {
								'validate': true,
								'forceId': false
							}
						}
					}
				}, bootstrap.defaultContext, function() {	

					  models.CustomerServPersn.create(data, bootstrap.defaultContext, function (err, res) {
						if (err) {
							console.log('data creation error');
							done(err);
						} else {
							done();
						}

					  });

            	});
				
			});
		

            CustomerUrl = CustomerUrl + '/' + Customer + 's';

    });

    // TODO: WARNING- this is important for clean consistent runs
    after('clean up', function (done) {
        models.ModelDefinition.destroyAll({
            name: 'CustomerServPersn'
        } , bootstrap.defaultContext, function (err, d) {
            if (err) {
                console.log('Error - not able to delete modelDefinition entry for mysettings');
                return done();
            }
            var model = loopback.getModel('CustomerServPersn');
            model.destroyAll({}, bootstrap.defaultContext, function () {
                done();
            });
        });
    });


    afterEach('destroy context', function (done) {
        var callContext = {ctx : {
			'device': ['android'],
			'tenantId': tenantId
		}};
        models.PersonalizationRule.destroyAll({}, callContext, function (err, result) {
            // console.log("Model Removed : ", result.count);
            done();
        });
    });
    //field Name Replace
    it('Embeds One:should replace field names in response data when fieldReplace personalization rule is configured',
        function (done) {
            // Setup personalization rule
            var ruleForAndroid = {
                'modelName': Customer,
                'personalizationRule': {
                    'fieldReplace': {
                        'billingAddress\uFF0Estreet': 'lane'
                    }
                },
                'scope': {
                    'device': 'android'
                }
            };

            models.PersonalizationRule.create(ruleForAndroid, bootstrap.defaultContext, function (err, rule) {

                if (err) {
                    throw new Error(err);
                }
                //var ruleId = rule.id;

                api.get(CustomerUrl)
                    .set('Accept', 'application/json')
                    .set('TENANT_ID', tenantId)
                    .set('REMOTE_USER', 'testUser')
                    .set('device', 'android')
                    .expect(200).end(function (err, resp) {
                        if (err) {
                            done(err);
                        }

                var results = JSON.parse(resp.text);
                        expect(results.length).to.be.equal(3);
                        expect(results[0].billingAddress).keys('city', 'state', 'lane', '_isDeleted');
                        expect(results[0]).to.include.keys('name', 'age', 'billingAddress', 'id', '_isDeleted');
                        done();

                    });

            });
        });


    //field value Replace
    xit('Embeds One:should replace field values in response data when field' +
        ' value Replace personalization rule is configured',
        function (done) {
            // Setup personalization rule
            var ruleForAndroid = {
                'modelName': Customer,
                'personalizationRule': {
                    'fieldValueReplace': {
                        'billingAddress\uFF0Ecity': {
                            'bangalore': 'Mangalore'
                        }
                    }
                },
                'scope': {
                    'device': 'android'
                }
            };

            models.PersonalizationRule.create(ruleForAndroid, bootstrap.defaultContext, function (err, rule) {

                if (err) {
                    throw new Error(err);
                }
                //var ruleId = rule.id;

                api.get(CustomerUrl)
                    .set('Accept', 'application/json')
                    .set('TENANT_ID', tenantId)
                    .set('REMOTE_USER', 'testUser')
                    .set('device', 'android')
                    .expect(200).end(function (err, resp) {
                        if (err) {
                            done(err);
                        }

                        var results = JSON.parse(resp.text);
                        expect(results.length).to.be.equal(3);
                        expect(results[0].billingAddress.city).to.be.equal('Mangalore');
                        done();

                    });

            });
        });

    //sort
    it('Embeds One:should sort the results based on sort expression', function (done) {
        // Setup personalization rule
        var ruleForAndroid = {
            'modelName': Customer,
            'personalizationRule': {
                'sort': {
                    'billingAddress|street': 'asc'
                }
            },
            'scope': {
                'device': 'android'
            }
        };


        models.PersonalizationRule.create(ruleForAndroid, bootstrap.defaultContext, function (err, rule) {

            if (err) {
                throw new Error(err);
            }

            api.get(CustomerUrl)
                .set('Accept', 'application/json')
                .set('TENANT_ID', tenantId)
                .set('REMOTE_USER', 'testUser')
                .set('device', 'android').expect(200).end(function (err, resp) {
                    if (err) {
                        done(err);
                    }
                    var results = JSON.parse(resp.text);
                    expect(results).to.be.instanceof(Array);
                    expect(results.length).to.equal(3);
                    expect(results[0].billingAddress.street).to.be.equal('BTM');
                    done();

                });
        });
    });

    //mask
    it('Embeds One:should mask the given fields and not send them to the response', function (done) {
        // Setup personalization rule
        var ruleForAndroid = {
            'modelName': Customer,
            'personalizationRule': {
                'mask': {
                    'billingAddress|street': true
                }
            },
            'scope': {
                'device': 'android'
            }
        };


        models.PersonalizationRule.create(ruleForAndroid, bootstrap.defaultContext, function (err, rule) {

            if (err) {
                throw new Error(err);
            }

            api.get(CustomerUrl)
                .set('Accept', 'application/json')
                .set('TENANT_ID', tenantId)
                .set('REMOTE_USER', 'testUser')
                .set('device', 'android').expect(200).end(function (err, resp) {
                    if (err) {
                        done(err);
                    }
                    var results = JSON.parse(resp.text);
                    expect(results).to.be.instanceof(Array);
                    expect(results.length).to.equal(3);
                    expect(results[0].billingAddress.street).to.be.equal(undefined);
                    done();

                });
        });
    });
});
