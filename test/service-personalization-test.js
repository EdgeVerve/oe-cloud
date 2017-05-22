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
var app = bootstrap.app;

var chai = require('chai');
chai.use(require('chai-things'));

var api = bootstrap.api;

var productCatalogUrl = bootstrap.basePath;
describe(chalk.blue('service-personalization'), function () {

    var tenantId = 'test-tenant';

    var dataSource;

    var ProductCatalog;
    var productOwnerUrl;
    this.timeout(30000);

    function createModelsAndPopulateData(done) {
        //var price = {
        //    value: Number,
        //    currency: String
        //};
        var ProductCatalogSchema = {
            'name': {
                'type': 'string',
                'required': true
            },
            'category': {
                'type': 'string',
                'required': true
            },
            'desc': {
                'type': 'string',
                'required': true
            },
            'price': {
                'type': 'object',
                'required': true
            },
            'isAvailable': {
                'type': 'boolean',
                'required': true
            }
        };

        var opts = {
            strict: false,
            base: 'BaseEntity',
            plural: 'ProductCatalogs'
        };
        productCatalogUrl = productCatalogUrl + '/' + opts.plural;
        dataSource = app.dataSources['db'];
        ProductCatalog = dataSource.createModel('ProductCatalog', ProductCatalogSchema, opts);
        ProductCatalog.attachTo(dataSource);
        app.model(ProductCatalog);

        // Populate some data.
        var item1 = {
            'name': 'king size bed',
            'category': 'furniture',
            'desc': 'king size bed',
            'price': {
                'value': 10000,
                'currency': 'inr'
            },
            'isAvailable': true,
            "productOwnerId": 1
        };
        var item2 = {
            'name': 'office chair',
            'category': 'furniture',
            'desc': 'office chair',
            'price': {
                'value': 5000,
                'currency': 'inr'
            },
            'isAvailable': true
        };
        var item3 = {
            'name': 'dinning table',
            'category': 'furniture',
            'desc': 'dinning table',
            'price': {
                'value': 8000,
                'currency': 'inr'
            },
            'isAvailable': false
        };
        var item11 = {
            'name': 'refrigerator',
            'category': 'electronics',
            'desc': 'refrigerator',
            'price': {
                'value': 10000,
                'currency': 'inr'
            },
            'isAvailable': true
        };
        var item22 = {
            'name': 'water heater',
            'category': 'electronics',
            'desc': 'water heater',
            'price': {
                'value': 5000,
                'currency': 'inr'
            },
            'isAvailable': true
        };
        var item33 = {
            'name': 'oven',
            'category': 'electronics',
            'desc': 'oven',
            'price': {
                'value': 8000,
                'currency': 'inr'
            },
            'isAvailable': false
        };

        ProductCatalog.create(item1, bootstrap.defaultContext, function (err, item) {
            if (err) {
                return done(err);
            }
            ProductCatalog.create(item2, bootstrap.defaultContext, function (err, item) {
                if (err) {
                    return done(err);
                }
                ProductCatalog.create(item3, bootstrap.defaultContext, function (err, item) {
                    if (err) {
                        return done(err);
                    }
                    ProductCatalog.create(item11, bootstrap.defaultContext, function (err, item) {
                        if (err) {
                            return done(err);
                        }
                        ProductCatalog.create(item22, bootstrap.defaultContext, function (err, item) {
                            if (err) {
                                return done(err);
                            }
                            ProductCatalog.create(item33, bootstrap.defaultContext, function (err, item) {
                                done(err);
                            });
                        });
                    });
                });
            });
        });


        var ProductOwnerSchema = {
            'name': {
                'type': 'string',
                'required': true
            },
            'city': {
                'type': 'string',
                'required': true
            }
        };

        var productOwnerOpts = {
            strict: false,
            base: 'BaseEntity',
            plural: 'ProductOwners',
            relations: {
                "ProductCatalog": {
                    "type": "hasMany",
                    "model": "ProductCatalog"
                }
            }
        };
        productOwnerUrl = bootstrap.basePath + '/' + productOwnerOpts.plural;
        var ProductOwner = dataSource.createModel('ProductOwner', ProductOwnerSchema, productOwnerOpts);
        ProductOwner.attachTo(dataSource);
        app.model(ProductOwner);

        var owner1 = {
            "name": "John",
            "city": "Miami",
            "id": 1
        };

        var owner2 = {
            "name": "Wick",
            "city": "Texas",
            "id": 2
        };

        ProductOwner.create(owner1, bootstrap.defaultContext, function (err) {
            if (err) {
                return done(err);
            }
            ProductOwner.create(owner2, bootstrap.defaultContext, function (err) {
                if (err) {
                    return done(err);
                }
            });
        });

    }

    before('setup test data', function (done) {
        createModelsAndPopulateData(done);
    });

    // TODO: WARNING- this is important for clean consistent runs
    after('clean up', function (done) {
        loopback.Application.tenantds = {};
        done();
    });


    afterEach('destroy context', function (done) {
        var callContext = {
            ctx: {
                'device': ['android', 'ios'],
                'tenantId': tenantId
            }
        };
        models.PersonalizationRule.destroyAll({}, callContext, function (err, result) {
            //console.log("Personalization Rule Model Removed : ", err, result);
            done();
        });
    });


    it('t1 should replace field names in response when fieldReplace personalization is configured', function (done) {
        // Setup personalization rule
        var ruleForAndroid = {
            'modelName': 'ProductCatalog',
            'personalizationRule': {
                'fieldReplace': {
                    'name': 'product name',
                    'desc': 'product description',
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
            api.get(productCatalogUrl)
                .set('Accept', 'application/json')
                .set('TENANT_ID', tenantId)
                .set('REMOTE_USER', 'testUser')
                .set('DEVICE', 'android')
                .expect(200).end(function (err, resp) {
                    if (err) {
                        done(err);
                    }

                    // console.log('resp ---------->' + JSON.stringify(resp.body, null, 2));

                    var results = JSON.parse(resp.text);

                    expect(results.length).to.be.equal(6);
                    expect(results[0])
                        .to.include.keys('product name', 'product description');
                    expect(results[0])
                        .to.not.include.keys('name', 'desc');
                    done();

                });

        });
    });

    it('t2 should replace field values in response when fieldValueReplace personalization is configured',
        function (done) {
            // Setup personalization rule
            var ruleForAndroid = {
                'modelName': 'ProductCatalog',
                'personalizationRule': {
                    'fieldValueReplace': {
                        'isAvailable': {
                            true: 1,
                            false: 0
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

                api.get(productCatalogUrl)
                    .set('Accept', 'application/json')
                    .set('TENANT_ID', tenantId)
                    .set('REMOTE_USER', 'testUser')
                    .set('DEVICE', 'android')
                    .expect(200).end(function (err, resp) {
                        if (err) {
                            done(err);
                        }

                        // console.log('resp -------->' + JSON.stringify(resp.body, null, 2));

                        var results = JSON.parse(resp.text);
                        // console.log('resp --' + JSON.stringify(results, null, 2));
                        expect(results.length).to.be.equal(6);
                        expect(results[0]).to.include.keys('isAvailable');
                        expect(results[0].isAvailable).to.be.oneOf([0, 1]);
                        done();

                    });

            });
        });

    it('t3 should post results on the given URL when httpPostFunction is configured', function (done) {
        // Setup personalization rule
        var ruleForAndroid = {
            'modelName': 'ProductCatalog',
            'personalizationRule': {
                'httpPostFunction': {
                    'url': 'http://localhost:1880/dumpResults',
                    'async': true
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

            api.get(productCatalogUrl)
                .set('Accept', 'application/json')
                .set('TENANT_ID', tenantId)
                .set('REMOTE_USER', 'testUser')
                .set('DEVICE', 'android')
                .expect(200).end(function (err, resp) {
                    if (err) {
                        throw new Error(err);
                    }

                    // console.log('resp --' + JSON.stringify(resp, null, 2));

                    var results = JSON.parse(resp.text);
                    // console.log('resp --' + JSON.stringify(results, null, 2));
                    expect(results.length).to.be.equal(6);
                    expect(results[0]).to.include.keys('name', 'desc', 'category', 'price', 'isAvailable', 'id');
                    // expect(results[0].isAvailable).to.be.equal(1);
                    done();

                });

        });
    });

    //sort test cases
    it('t4 single sort condition:  should return the sorted result when sort personalization rule is configured.',
        function (done) {

            // Setup personalization rule
            var ruleForAndroid = {
                'modelName': 'ProductCatalog',
                'personalizationRule': {
                    'sort': {
                        'name': 'asc'
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


                api.get(productCatalogUrl)
                    .set('Accept', 'application/json')
                    .set('TENANT_ID', tenantId)
                    .set('REMOTE_USER', 'testUser')
                    .set('DEVICE', 'android')
                    .expect(200).end(function (err, resp) {
                        if (err) {
                            done(err);
                        }
                        var results = JSON.parse(resp.text);

                        expect(results).to.be.instanceof(Array);
                        expect(results.length).to.equal(6);
                        expect(results[0].name).to.be.equal('dinning table');
                        done();
                    });

            });
        });

    it('t5 single sort condition: should sort in ascending order when the sort order is not specified', function (done) {
        // Setup personalization rule
        var ruleForAndroid = {
            'modelName': 'ProductCatalog',
            'personalizationRule': {
                'sort': {
                    'name': ''
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


            api.get(productCatalogUrl)
                .set('Accept', 'application/json')
                .set('TENANT_ID', tenantId)
                .set('REMOTE_USER', 'testUser')
                .set('device', 'android')
                .expect(200).end(function (err, resp) {
                    if (err) {
                        throw new Error(err);
                    }
                    var results = JSON.parse(resp.text);
                    expect(results).to.be.instanceof(Array);
                    expect(results.length).to.equal(6);
                    expect(results[0].name).to.be.equal('dinning table');
                    done();
                });

        });
    });

    it('t6 single sort condition: should accept the keywords like asc,ascending,desc or descending as sort order',
        function (done) {

            // Setup personalization rule
            var ruleForAndroid = {
                'modelName': 'ProductCatalog',
                'personalizationRule': {
                    'sort': {
                        'name': 'descending'
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


                api.get(productCatalogUrl)
                    .set('Accept', 'application/json')
                    .set('TENANT_ID', tenantId)
                    .set('REMOTE_USER', 'testUser')
                    .set('device', 'android')
                    .expect(200).end(function (err, resp) {
                        if (err) {
                            done(err);
                        }
                        var results = JSON.parse(resp.text);
                        expect(results).to.be.instanceof(Array);
                        expect(results.length).to.equal(6);
                        expect(results[0].name).to.be.equal('water heater');
                        done();
                    });

            });
        });

    it('t7 multiple sort condition: should return sorted result' +
        ' when personalization rule with multiple sort is configured',
        function (done) {

            // Setup personalization rule
            var ruleForAndroid = {
                'modelName': 'ProductCatalog',
                'personalizationRule': {
                    'sort': [{
                        'category': 'asc'
                    }, {
                        'name': 'desc'
                    }]
                },
                'scope': {
                    'device': 'android'
                }
            };



            models.PersonalizationRule.create(ruleForAndroid, bootstrap.defaultContext, function (err, rule) {

                if (err) {
                    throw new Error(err);
                }
                api.get(productCatalogUrl)
                    .set('Accept', 'application/json')
                    .set('TENANT_ID', tenantId)
                    .set('REMOTE_USER', 'testUser')
                    .set('device', 'android')
                    .expect(200).end(function (err, resp) {
                        if (err) {
                            done(err);
                        }
                        var results = JSON.parse(resp.text);
                        expect(results).to.be.instanceof(Array);
                        expect(results.length).to.equal(6);
                        expect(results[0].category).to.be.equal('electronics');
                        expect(results[0].name).to.be.equal('water heater');

                        done();
                    });
            });
        });

    it('t8 multiple sort condition: should omit the sort expression' +
        ' whose order value(ASC|DSC) doesnt match the different cases',
        function (done) {

            // Setup personalization rule
            var ruleForAndroid = {
                'modelName': 'ProductCatalog',
                'personalizationRule': {
                    'sort': [{
                        'category': 'asc'
                    }, {
                        'name': 'abcd'
                    }]
                },
                'scope': {
                    'device': 'android'
                }
            };

            /*sort order name is 'abcd' which doesnt ,match any of the cases hence
            the sort expression will not be passed on to the query.*/



            models.PersonalizationRule.create(ruleForAndroid, bootstrap.defaultContext, function (err, rule) {

                if (err) {
                    throw new Error(err);
                }

                api.get(productCatalogUrl)
                    .set('Accept', 'application/json')
                    .set('TENANT_ID', tenantId)
                    .set('REMOTE_USER', 'testUser')
                    .set('device', 'android')
                    .expect(200).end(function (err, resp) {
                        if (err) {
                            done(err);
                        }
                        var results = JSON.parse(resp.text);
                        expect(results).to.be.instanceof(Array);
                        expect(results.length).to.equal(6);
                        expect(results[0].category).to.be.equal('electronics');
                        expect(results[0].name).to.be.equal('refrigerator');

                        done();
                    });
            });
        });

    it('t9 sort and filter combined: should return filterd and sorted result' +
        ' when filter and sort personalization is configured',
        function (done) {
            // Setup personalization rule
            var ruleForAndroid = {
                'modelName': 'ProductCatalog',
                'personalizationRule': {
                    'filter': {
                        'category': 'furniture'
                    },
                    'sort': {
                        'name': 'asc'
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

                api.get(productCatalogUrl)
                    .set('Accept', 'application/json')
                    .set('TENANT_ID', tenantId)
                    .set('REMOTE_USER', 'testUser')
                    .set('device', 'android')
                    .expect(200).end(function (err, resp) {
                        if (err) {
                            done(err);
                        }
                        var results = JSON.parse(resp.text);
                        expect(results).to.be.instanceof(Array);
                        expect(results.length).to.equal(3);
                        expect(results[0].category).to.be.equal('furniture');
                        expect(results[0].name).to.be.equal('dinning table');
                        done();

                    });
            });
        });

    it('t10 multiple sort: should handle duplicate sort expressions', function (done) {
        // Setup personalization rule
        var ruleForAndroid = {
            'modelName': 'ProductCatalog',
            'personalizationRule': {
                'sort': {
                    'name': 'asc'
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

            api.get(productCatalogUrl + '?filter[order]=name ASC')
                .set('Accept', 'application/json')
                .set('TENANT_ID', tenantId)
                .set('REMOTE_USER', 'testUser')
                .set('device', 'android').expect(200).end(function (err, resp) {
                    if (err) {
                        throw new Error(err);
                    }
                    var results = JSON.parse(resp.text);
                    expect(results).to.be.instanceof(Array);
                    expect(results.length).to.equal(6);
                    expect(results[0].name).to.be.equal('dinning table');
                    done();

                });
        });
    });

    it('t11 multiple sort: should handle clashing sort expressions.(Eg:name ASC in personalization rule and' +
        'name DESC from API, in this case consider name DESC from API)',
        function (done) {
            // Setup personalization rule
            var ruleForAndroid = {
                'modelName': 'ProductCatalog',
                'personalizationRule': {
                    'sort': {
                        'name': 'asc'
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

                api.get(productCatalogUrl + '?filter[order]=name DESC')
                    .set('Accept', 'application/json')
                    .set('TENANT_ID', tenantId)
                    .set('REMOTE_USER', 'testUser')
                    .set('device', 'android').expect(200).end(function (err, resp) {
                        if (err) {
                            throw new Error(err);
                        }
                        var results = JSON.parse(resp.text);
                        expect(results).to.be.instanceof(Array);
                        expect(results.length).to.equal(6);
                        expect(results[0].name).to.be.equal('water heater');
                        done();

                    });
            });
        });

    xit('t12 sort: should handle nested sorting', function (done) {
        // Setup personalization rule
        var ruleForAndroid = {
            'modelName': 'ProductCatalog',
            'personalizationRule': {
                'sort': {
                    'price|value': 'asc'
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
            api.get(productCatalogUrl)
                .set('Accept', 'application/json')
                .set('TENANT_ID', tenantId)
                .set('REMOTE_USER', 'testUser')
                .set('device', 'android').expect(200).end(function (err, resp) {
                    if (err) {
                        done(err);
                    }
                    console.log("==============", resp.body);
                    var results = JSON.parse(resp.text);
                    expect(results).to.be.instanceof(Array);
                    expect(results.length).to.equal(6);
                    expect(results[0].name).to.be.equal('office chair');
                    expect(results[0].price.value).to.be.equal(5000);
                    done();

                });
        });
    });

    //Mask Test Cases
    it('t13 Mask:should mask the given fields and not send them to the response',
        function (done) {

            // Setup personalization rule
            var ruleForAndroid = {
                'modelName': 'ProductCatalog',
                'personalizationRule': {
                    'mask': {
                        'category': true
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


                api.get(productCatalogUrl)
                    .set('Accept', 'application/json')
                    .set('TENANT_ID', tenantId)
                    .set('REMOTE_USER', 'testUser')
                    .set('device', 'android')
                    .expect(200).end(function (err, resp) {
                        if (err) {
                            throw new Error(err);
                        }
                        var results = JSON.parse(resp.text);
                        expect(results).to.be.instanceof(Array);
                        expect(results.length).to.equal(6);
                        expect(results[0].category).to.be.equal(undefined);
                        done();
                    });

            });
        });

    it('t14 Mask:should mask the given fields and not send them to the response',
        function (done) {

            // Setup personalization rule
            var ruleForAndroid = {
                'modelName': 'ProductCatalog',
                'personalizationRule': {
                    'mask': {
                        'category': true
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


                api.get(productCatalogUrl + '?filter[fields][name]=true')
                    .set('Accept', 'application/json')
                    .set('TENANT_ID', tenantId)
                    .set('REMOTE_USER', 'testUser')
                    .set('device', 'android')
                    .expect(200).end(function (err, resp) {
                        if (err) {
                            throw new Error(err);
                        }
                        var results = JSON.parse(resp.text);
                        expect(results).to.be.instanceof(Array);
                        expect(results.length).to.equal(6);
                        expect(results[0].desc).to.be.equal(undefined);
                        expect(results[0].category).to.be.equal(undefined);
                        // expect(results[0].name).to.be.equal('king size bed');
                        done();
                    });

            });
        });
    //reverse service personalization tests

    it('t15 should replace field names while posting when fieldReplace personalization is configured', function (done) {
        // Setup personalization rule
        var ruleForAndroid = {
            'modelName': 'ProductCatalog',
            'personalizationRule': {
                'fieldReplace': {
                    'name': 'product name',
                    'desc': 'product description'
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

            var postData = {
                'product name': 'o1ven',
                'product description': 'o1ven',
                'category': 'electronics',
                'price': {
                    'value': 5000,
                    'currency': 'inr'
                },
                'isAvailable': true
            };

            api.post(productCatalogUrl)
                .set('Accept', 'application/json')
                .set('TENANT_ID', tenantId)
                .set('REMOTE_USER', 'testUser')
                .set('device', 'android')
                .send(postData)
                .expect(200).end(function (err, resp) {
                    if (err) {
                        done(err);
                    } else {
                        var results = JSON.parse(resp.text);
                        expect(results)
                            .to.include.keys('product name', 'product description');
                        done();
                    }
                });

        });
    });

    it('t16 should replace field value names while posting when fieldValueReplace personalization is configured',
        function (done) {
            // Setup personalization rule
            var ruleForAndroid = {
                'modelName': 'ProductCatalog',
                'personalizationRule': {
                    'fieldValueReplace': {
                        'name': {
                            'oven': 'new oven'
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

                var postData = {
                    'name': 'new oven',
                    'desc': 'oven',
                    'category': 'electronics',
                    'price': {
                        'value': 5000,
                        'currency': 'inr'
                    },
                    'isAvailable': true
                };

                api.post(productCatalogUrl)
                    .set('Accept', 'application/json')
                    .set('TENANT_ID', tenantId)
                    .set('REMOTE_USER', 'testUser')
                    .set('device', 'android')
                    .send(postData)
                    .expect(200).end(function (err, resp) {
                        if (err) {
                            done(err);
                        } else {
                            var results = JSON.parse(resp.text);
                            expect(results.name).to.be.equal('new oven');
                            done();
                        }
                    });

            });
        });


    // Test case when personalization rules are there for multiple scopes.

    it('t17 should replace field names and field value names when scope of personalization rule matches', function (done) {
        // Setup personalization rule
        var ruleForAndroid = {
            'modelName': 'ProductCatalog',
            'personalizationRule': {
                'fieldReplace': {
                    'name': 'product_name_android',
                    'desc': 'product_description_android'
                },
                'fieldValueReplace': {
                    'name': {
                        'oven': 'new_oven_android'
                    }
                }
            },
            'scope': {
                'device': 'android'
            }
        };

        var ruleForIos = {
            'modelName': 'ProductCatalog',
            'personalizationRule': {
                'fieldReplace': {
                    'name': 'product_name_ios',
                    'desc': 'product_description_ios'
                },
                'fieldValueReplace': {
                    'name': {
                        'oven': 'new_oven_ios'
                    }
                }
            },
            'scope': {
                'device': 'ios'
            }
        };

        var personalizationRuleArray = [ruleForAndroid, ruleForIos];

        models.PersonalizationRule.create(personalizationRuleArray, bootstrap.defaultContext, function (err, rules) {

            if (err) {
                throw new Error(err);
            }

            var postData = {
                'name': 'oven',
                'desc': 'oven',
                'category': 'electronics',
                'price': {
                    'value': 5000,
                    'currency': 'inr'
                },
                'isAvailable': true
            };

            api.post(productCatalogUrl)
                .set('Accept', 'application/json')
                .set('TENANT_ID', tenantId)
                .set('REMOTE_USER', 'testUser')
                .set('device', 'ios')
                .send(postData)
                .expect(200).end(function (err, resp) {
                    if (err) {
                        throw new Error(err);
                    }

                    var results = JSON.parse(resp.text);
                    expect(results)
                        .to.include.keys('product_name_ios', 'product_description_ios');
                    expect(results.product_name_ios).to.be.equal('new_oven_ios');
                    api.post(productCatalogUrl)
                        .set('Accept', 'application/json')
                        .set('TENANT_ID', tenantId)
                        .set('REMOTE_USER', 'testUser')
                        .set('device', 'android')
                        .send(postData)
                        .expect(200).end(function (err, resp) {
                            if (err) {
                                throw new Error(err);
                            }

                            var results = JSON.parse(resp.text);
                            expect(results)
                                .to.include.keys('product_name_android', 'product_description_android');
                            expect(results.product_name_android).to.be.equal('new_oven_android');
                            done();
                        });
                });



        });
    });

    //Nested input values
    it('t18 (Nested input) should replace field names and field	value names when scope of personalization rule matches while posting', function (done) {
        // Setup personalization rule
        var ruleForAndroid = {
            'modelName': 'ProductCatalog',
            'personalizationRule': {
                'fieldReplace': {
                    'price\uFF0Ecurrency': 'price_currency',
                    'name': 'product_name_android',
                    'desc': 'product_description_android'
                },
                'fieldValueReplace': {
                    'name': {
                        'oven': 'new_oven_android'
                    },
                    'price\uFF0Ecurrency': {
                        'inr': 'IndianRupee'
                    }
                }
            },
            'scope': {
                'device': 'android'
            }
        };

        var personalizationRule = ruleForAndroid;

        models.PersonalizationRule.create(personalizationRule, bootstrap.defaultContext, function (err, rules) {

            var postData = {
                'name': 'oven',
                'desc': 'oven',
                'category': 'electronics',
                'price': {
                    'value': 5000,
                    'currency': 'inr'
                },
                'isAvailable': true,
                'id': '9898'
            };

            if (err) {
                throw new Error(err);
            }

            api.post(productCatalogUrl)
                .set('Accept', 'application/json')
                .set('TENANT_ID', tenantId)
                .set('REMOTE_USER', 'testUser')
                .set('device', 'android')
                .send(postData)
                .expect(200).end(function (err, resp) {
                    if (err) {
                        throw new Error(err);
                    }

                    var results = JSON.parse(resp.text);

                    expect(results.price).keys('price_currency', 'value');
                    expect(results).to.include.keys('product_name_android', 'product_description_android');
                    expect(results.product_name_android).to.be.equal('new_oven_android');
                    expect(results.price.price_currency).to.be.equal('IndianRupee');
                    done();
                });
        });
    });


    it('t19 (Nested input) should replace field names and field value names when scope of personalization rule matches while getting', function (done) {
        // Setup personalization rule
        var ruleForAndroid = {
            'modelName': 'ProductCatalog',
            'personalizationRule': {
                'fieldReplace': {
                    'price\uFF0Ecurrency': 'price_currency',
                    'name': 'product_name_android',
                    'desc': 'product_description_android'
                },
                'fieldValueReplace': {
                    'name': {
                        'oven': 'new_oven_android'
                    },
                    'price\uFF0Ecurrency': {
                        'inr': 'IndianRupee'
                    }
                }
            },
            'scope': {
                'device': 'android'
            }
        };

        var personalizationRule = ruleForAndroid;

        models.PersonalizationRule.create(personalizationRule, bootstrap.defaultContext, function (err, rules) {

            if (err) {
                throw new Error(err);
            }

            api.get(productCatalogUrl).set('Accept', 'application/json')
                .set('TENANT_ID', tenantId)
                .set('REMOTE_USER', 'testUser')
                .set('device', 'android')
                .expect(200).end(function (err, resp) {
                    var results = JSON.parse(resp.text);
                    var result = results.filter(function (obj) {
                        if (obj.id === '9898') {
                            return true;
                        } else {
                            return false;
                        }
                    });
                    expect(result[0].price).keys('price_currency', 'value');
                    expect(result[0]).to.include.keys('product_name_android', 'product_description_android');
                    expect(result[0].product_name_android).to.be.equal('new_oven_android');
                    expect(result[0].price.price_currency).to.be.equal('IndianRupee');
                    done();

                });
        });
    });


    it('t20 (Nested input) should not replace field names and field value names when scope of personalization rule not matches while getting the data', function (done) {
        // Setup personalization rule
        var ruleForAndroid = {
            'modelName': 'ProductCatalog',
            'personalizationRule': {
                'fieldReplace': {
                    'price\uFF0Ecurrency': 'price_currency',
                    'name': 'product_name_android',
                    'desc': 'product_description_android'
                },
                'fieldValueReplace': {
                    'name': {
                        'oven': 'new_oven_android'
                    },
                    'price\uFF0Ecurrency': {
                        'inr': 'IndianRupee'
                    }
                }
            },
            'scope': {
                'device': 'android'
            }
        };

        var personalizationRule = ruleForAndroid;

        models.PersonalizationRule.create(personalizationRule, bootstrap.defaultContext, function (err, rules) {

            if (err) {
                throw new Error(err);
            }

            api.get(productCatalogUrl).set('Accept', 'application/json')
                .set('TENANT_ID', tenantId)
                .set('REMOTE_USER', 'testUser')
                .set('device', 'ios')
                .expect(200).end(function (err, resp) {
                    var results = JSON.parse(resp.text);
                    var result = results.filter(function (obj) {
                        if (obj.id === '9898') {
                            return true;
                        } else {
                            return false;
                        }
                    });
                    expect(result[0].price).keys('currency', 'value');
                    expect(result[0]).to.include.keys('category', 'price', 'isAvailable', 'id', 'name', 'desc');
                    expect(result[0].name).to.be.equal('oven');
                    expect(result[0].price.currency).to.be.equal('inr');
                    done();

                });
        });
    });

    it('should give filterd result when lbFilter is applied', function (done) {
        // Setup personalization rule
        var ruleForAndroid = {
            'modelName': 'ProductOwner',
            'personalizationRule': {
                'lbFilter': {
                    'include': 'ProductCatalog',
                    'where': {
                        'name': 'John'
                    }
                }
            },
            'scope': {
                'device': 'android'
            }
        };

        var personalizationRule = ruleForAndroid;

        models.PersonalizationRule.create(personalizationRule, bootstrap.defaultContext, function (err, rules) {
            if (err) {
                throw new Error(err);
            }
            api.get(productOwnerUrl).set('Accept', 'application/json')
                .set('TENANT_ID', tenantId)
                .set('REMOTE_USER', 'testUser')
                .set('device', 'android')
                .expect(200).end(function (err, resp) {
                    var results = JSON.parse(resp.text);
                    expect(results).to.have.length(1);
                    expect(results[0]).to.include.keys('ProductCatalog');
                    expect(results[0].ProductCatalog).to.have.length(1);
                    done();

                });
        });

    });

});

//1. sort
//2. union
//3. mask
//4. filter
//5. fieldValueReplace
//6. fieldDataReplace


//ModelDefinition.create({
//'name': 'productCatalog',
//'properties': {
//'name': 'string',
//'category': 'string',
//'desc': 'string',
//'price': 'price',
//'isAvailable': 'boolean'
//}
//});

//ModelDefinition.create({
//'name': 'productCatalogNonPreferred',
//'properties': {
//'name2': 'string',
//'category2': 'string',
//'desc2': 'string',
//'price2': 'price',
//'isAvailable': 'boolean'
//}
//});

//ModelDefinition.create({
//'name': 'personalizationRules',
//'properties': {
//'modelName': 'string',
//'personalizationRule': 'personaliztionRule',
//'scope': 'scope'
//}
//});

//var ruleForAndroid: {
//'modelId': 'productCatalog',
//'personalizationRule': {
//'sort': {
//'name': 'desc'
//}
//'filter': {
//'category': 'furniture'
//}
//'mask': {
//'desc': true
//}
//}
//'scope': {
//'device': 'android'
//}
//}
//var ruleForTenantDealer: {
//'modelId': 'productCatalog',
//'personalizationRule': {
//'union': {
//'model': 'productCatalogNonPreferred',
//'fieldMap': {
//'name': 'name2',
//'category': 'category2',
//'price': 'price2',
//'desc': 'desc2'
//}
//}
//'fieldValueReplace': {
//'isAvailable': {
//'true': '1',
//'false': '0'
//}
//},
//'fieldNameReplace': {
//'desc': 'Description',
//'name': 'Name of product'
//}
//},
//'scope': {
//'tenantId': 'dealer'
//}
//}

//personalizationRules.create(ruleForAndroid); personalizationRules.create(ruleForTenantDealer);



//var item11 = {
//'name': 'refrigerator',
//'category': 'electronics',
//'desc': 'refrigerator',
//'price': {
//'value': 10000,
//'currency': 'inr'
//},
//'isAvailable': true
//};
//var item22 = {
//'name': 'water heater',
//'category': 'electronics',
//'desc': 'water heater',
//'price': {
//'value': 5000,
//'currency': 'inr'
//},
//'isAvailable': true
//};
//var item33 = {
//'name': 'oven',
//'category': 'electronics',
//'desc': 'oven',
//'price': {
//'value': 8000,
//'currency': 'inr'
//},
//'isAvailable': false
//};

//productCatalog.create(item1); productCatalog.create(item2); productCatalog.create(item3);
//productCatalog.create(item11); productCatalog.create(item22); productCatalog.create(item33);


//it('should apply personalization rule for android') {
//expect('sorted by desc in descending order');
//expect('filtered for category furniture');
//expect('desc field does not appear in the response');
//}

//if ('should apply personalization rule for tenant=dealer') {
//expect('number of records due to union = 6');
//expect('isAvailable is returned as 1 or 0');
//expect('desc field name is returned as description');
//expect('name field name is retuned as \'product name\'');
//}
//}
