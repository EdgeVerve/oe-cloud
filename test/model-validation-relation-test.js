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
var parentModelName = 'Hotel';
var childModelName = 'Room';
var restaurantModelName = 'Restaurant';
var courseModelName = 'Course';
var universityModelName = 'University';

describe(chalk.blue('Relation Validation test'), function () {

    this.timeout(20000);

    before('setup test data', function (done) {
        models.ModelDefinition.events.once('model-' + courseModelName + '-available', function () {
            var parentModel = loopback.getModel(parentModelName);
            var data = [{
                    'name': 'TAJ',
                    'rating': 7,
                    'city': 'MUM',
                    'hotelId': 29
                },
                {
                    'name': 'OBEROI',
                    'rating': 8,
                    'city': 'DL',
                    'hotelId': 98,
                    'scope': {
                        'dev': 'android'
                    }
                }];
            parentModel.create(data, bootstrap.defaultContext, function (err, results) {
                expect(err).to.be.null;
                done();
            });
        });

        models.ModelDefinition.create({
            'name': 'Hotel',
            'base': 'BaseEntity',
            'plural': 'hotels',
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
                'city': {
                    'type': 'string',
                    'required': true
                },
                'hotelId': {
                    'type': 'number',
                    'required': true,
                    'id': true
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
                    'name': 'Room',
                    'base': 'BaseEntity',
                    'plural': 'rooms',
                    'strict': false,
                    'idInjection': true,
                    'options': {
                        'validateUpsert': true
                    },
                    'properties': {
                        'category': {
                            'type': 'string',
                            'required': true
                        },
                        'price': {
                            'type': 'number',
                            'required': true
                        }
                    },
                    'validations': [],
                    'relations': {
                        'sample_relation': {
                            'type': 'belongsTo',
                            'model': 'Hotel',
                            'foreignKey': 'roomId'
                        }
                    },
                    'acls': [],
                    'methods': {}
                }, bootstrap.defaultContext, function (err, model) {
                    if (err) {
                        console.log(err);
                    } else {
                        models.ModelDefinition.create({
                            'name': 'Restaurant',
                            'base': 'BaseEntity',
                            'plural': 'restaurants',
                            'strict': false,
                            'idInjection': true,
                            'options': {
                                'validateUpsert': true
                            },
                            'properties': {
                                'name': {
                                    'type': 'string'
                                },
                                'cuisine': {
                                    'type': 'number'
                                }
                            },
                            'validations': [],
                            'relations': {
                                'sample_relation': {
                                    'type': 'belongsTo',
                                    'model': 'Hotel',
                                    'foreignKey': 'resId',
                                    'foreignKeyRequired': true
                                }
                            },
                            'acls': [],
                            'methods': {}
                        }, bootstrap.defaultContext, function (err, model) {
                            if (err) {
                                console.log(err);
                            } else {
                                models.ModelDefinition.create({
                                    'name': 'Course',
                                    'base': 'BaseEntity',
                                    'plural': 'courses',
                                    'strict': false,
                                    'idInjection': true,
                                    'options': {
                                        'validateUpsert': true
                                    },
                                    'mixins': {
                                        "IdempotentMixin": false
                                    },
                                    'properties': {
                                        'name': {
                                            'type': 'string'
                                        },
                                        'course_num': {
                                            'type': 'string'
                                        }
                                    },
                                    'validations': [],
                                    'relations': {
                                        'sample_relation': {
                                            'type': 'belongsTo',
                                            'model': 'University',
                                            'foreignKey': 'universityId',
                                            'foreignKeyRequired': true
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
                            expect(err).to.be.not.ok;
                        });
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


    afterEach('destroy execution context', function (done) {
        done();
    });

    it('Validation Test - Should insert data successfully', function (done) {

        var childModel = loopback.getModel(childModelName);

        var data = {
            'category': 'Suite',
            'price': 10000,
            'roomId': 29
        };
        childModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should insert data successfully as no foreignKey required constraint is there', function (done) {

        var childModel = loopback.getModel(childModelName);

        var data = {
            'category': 'Deluxe',
            'price': 5000
        };
        childModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail to insert data as the provided foreignKey doesnot exist', function (done) {

        var childModel = loopback.getModel(childModelName);

        var data = {
            'category': 'Suite',
            'price': 10000,
            'roomId': 28
        };
        childModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.null;
            done();
        });
    });
    
    it('Validation Test - Should fail to insert data as the provided scope donot have the corresponding foreignKey entry', function (done) {
        
        var childModel = loopback.getModel(childModelName);
        
        var data = {
            'category': 'Suite',
            'price': 10000,
            'roomId': 98,
            'scope': {
                'dev': 'ios'
            }
        };
        childModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.null;
            done();
        });
    });
    
    it('Validation Test - Should insert data successfully', function (done) {
        
        var childModel = loopback.getModel(childModelName);
        
        var data = {
            'category': 'Suite',
            'price': 10000,
            'roomId': 98,
            'scope': {
                'dev': 'android'
            }
        };
        childModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });
    
    it('Validation Test - Should fail to insert data as default scope donot have the corresponding foreignKey entry', function (done) {
        
        var childModel = loopback.getModel(childModelName);
        
        var data = {
            'category': 'Standard',
            'price': 3000,
            'roomId': 98
        };
        childModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.null;
            done();
        });
    });

    it('Validation Test - Should insert data successfully', function (done) {

        var restaurantModel = loopback.getModel(restaurantModelName);

        var data = {
            'name': 'Truffles',
            'cuisine': 'Italian',
            'resId': 29
        };
        restaurantModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail to insert data as foreign key is mandatory but not posted', function (done) {

        var restaurantModel = loopback.getModel(restaurantModelName);

        var data = {
            'name': 'BeijingBites',
            'cuisine': 'Chinese'
        };
        restaurantModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail to insert data as target model does not exist', function (done) {
        var courseModel = loopback.getModel(courseModelName);
        var data = {
            'course_num': '6-042',
            'name': 'Mathematics for Computer Science'
        };
        courseModel.create(data, bootstrap.defaultContext, function (err) {
            expect(err).not.to.be.null;
            done();
        });
    });

    it('Validation Test - Should insert data successfully as target model is available', function (done) {

        models.ModelDefinition.create({
            'name': 'University',
            'base': 'BaseEntity',
            'plural': 'universities',
            'strict': false,
            'idInjection': true,
            'options': {
                'validateUpsert': true
            },
            'properties': {
                'name': {
                    'type': 'string'
                },
                'university_code': {
                    'type': 'string',
                    'id': true
                }
            },
            'validations': [],
            'relations': {},
            'acls': [],
            'methods': {}
        }, bootstrap.defaultContext, function (err, model) {
            expect(err).to.be.not.ok;
            if (err) {
                console.log(err);
            } else {
                var courseModel = loopback.getModel(courseModelName);
                var universityModel = loopback.getModel(universityModelName);

                var universityData = {
                    'university_code': 'U_090',
                    'name': 'MIT'
                };

                var courseData = {
                    'course_num': '6-042',
                    'name': 'Mathematics for Computer Science',
                    'universityId': 'U_090'
                };
                universityModel.create(universityData, bootstrap.defaultContext, function (err) {
                    expect(err).to.be.null;
                    courseModel.create(courseData, bootstrap.defaultContext, function (err) {
                        if (err) {
                            done(err);
                        }
                        expect(err).to.be.null;
                        done();
                    });
                });
            }
        });
    });

});
