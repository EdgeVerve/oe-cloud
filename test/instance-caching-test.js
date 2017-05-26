/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This test is for unit-testing the Instance result caching feature in datasource juggler.
 * The test involves creating a test model, inserting a record into it, fetching the
 * record (so that it caches), deleting the record from the database by directly accessing
 * the DB (bypassing the framework, so that cache is not ecicted), fetching the
 * record again to see that the records are still fetched (from cache).
 *
 *  Author: Lior Schindler
 */


var bootstrap = require('./bootstrap');
var uuid = require('node-uuid');
var chai = bootstrap.chai;
var expect = chai.expect;
var app = bootstrap.app;
var models = bootstrap.models;
var loopback = require('loopback');
var debug = require('debug')('caching-test');
var config = require('../server/config');
var MongoClient = require('mongodb').MongoClient;
var mongoHost = process.env.MONGO_HOST || 'localhost';
var defaultContext = {
    ctx: {
        tenantId: 'limits'
    }
};;
var altContext = {
    ctx: {
        tenantId: 'gravity'
    }
};;
var modelName = 'InstanceCachingTest';
var dbname = 'db';

function mongoDeleteById(id, cb) {
    var url = 'mongodb://'+mongoHost+':27017/' + dbname;
    MongoClient.connect(url, function (err, db) {
        if (err) {
            return cb(err);
        } else {
            db.collection(modelName).deleteOne({_id: id}, function (err, numberRemoved) {
                if (err) {
                    return cb(err);
                }
                debug("Number of records removed " + numberRemoved);
                cb();
            });
        }
    });
}

describe('Instance Caching Test', function () {

    var TestModel = null;

    before('Create Test Model', function (done) {
        var modelDefinition = loopback.findModel('ModelDefinition');
        var data = {
            'name': modelName,
            'base': 'BaseEntity',
            'idInjection': true,
            'options': {
                instanceCacheSize: 2000,
                instanceCacheExpiration: 100000,
                queryCacheSize: 2000,
                queryCacheExpiration: 5000,
                disableManualPersonalization: true
            },
            'properties': {
                'name': {
                    'type': 'string'
                }
            }
        };

        modelDefinition.create(data, bootstrap.defaultContext, function(err, model) {
            // Delete all records in the table associated with this TestModel
            TestModel = loopback.getModel(modelName);
            TestModel.destroyAll({}, defaultContext, function (err, info) {
                if (err) {
                    return done(err);
                }
                done();
            });
        });
    });

    describe('CRUD tests', function () {

        it('Should cache the Test instance after create', function (done) {
            var id = uuid.v4();
            var result1, result2;
            TestModel.create({
                name: "Lior",
                id: id
            }, defaultContext, function (err, data) {
                if (err) {
                    console.log(err);
                    return done(err);
                } else {
                    result1 = Object.assign({},data.toObject());
                    mongoDeleteById(id, function(err) {
                        if(err) {
                            return done(err);
                        }
                        TestModel.find({"where": {"id": id}}, defaultContext, function (err, data2) {
                            if (err) {
                                return done(err);
                            } else if(data2.length === 0) {
                                return done('instance not cached')
                            }
                            result2 = Object.assign({},data2[0].toObject());
                            expect(result1).not.to.be.null;
                            expect(result2).not.to.be.null;
                            expect(result1).to.deep.equal(result2);
                            expect(result1.__data === result2.__data).to.be.true;
                            return done();
                        })
                    });
                }
            });
        });

        it('Should cache the Test instance after findById', function (done) {
            var id = uuid.v4();
            var result1, result2;
            TestModel.create({
                name: "Lior",
                id: id
            }, defaultContext, function (err, data) {
                if (err) {
                    console.log(err);
                    return done(err);
                } else {
                    // update with query will delete instance array
                    TestModel.update({name:"Lior"}, {name:"David"}, defaultContext, function(err, info) {
                        if(info.count !== 1){
                            return done('too many instance with name lior');
                        }
                        TestModel.find({"where": {"id": id}}, defaultContext, function (err, data) {
                            if (err) {
                                return done(err);
                            } else if(data.length !== 1) {
                                return done('find should return one instance');
                            }
                            result1 = Object.assign({},data[0].toObject());
                            mongoDeleteById(id, function(err) {
                                if(err) {
                                    return done(err);
                                }
                                TestModel.find({"where": {"id": id}}, defaultContext, function (err, data2) {
                                    if (err) {
                                        return done(err);
                                    } else if(data2.length === 0) {
                                        return done('instance not cached')
                                    }
                                    result2 = Object.assign({},data2[0].toObject());
                                    expect(models[modelName]).not.to.be.null;
                                    expect(result1).not.to.be.null;
                                    expect(result2).not.to.be.null;
                                    expect(result1).to.deep.equal(result2);
                                    expect(result1.__data === result2.__data).to.be.true;
                                    return done();
                                });
                            });
                        });
                    });
                }
            });
        });

        it('Should cache the Test instance after upsert', function (done) {
            var id = uuid.v4();
            var result1, result2;
            TestModel.create({
                name: 'Lior',
                id: id
            }, defaultContext, function (err, data) {
                if (err) {
                    console.log(err);
                    return done(err);
                } else {
                    data.name = 'karin';
                    TestModel.upsert(data, defaultContext, function(err, data) {
                        if (err) {
                            console.log(err);
                            return done(err);
                        }
                        result1 = Object.assign({},data.toObject());
                        mongoDeleteById(id, function(err) {
                            if(err) {
                                return done(err);
                            }
                            TestModel.find({"where": {"id": id}}, defaultContext, function (err, data2) {
                                if (err) {
                                    return done(err);
                                } else if(data2.length === 0) {
                                    return done('instance not cached')
                                }
                                result2 = Object.assign({},data2[0].toObject());
                                expect(models[modelName]).not.to.be.null;
                                expect(result1).not.to.be.null;
                                expect(result2).not.to.be.null;
                                expect(result1).to.deep.equal(result2);
                                expect(result1.__data === result2.__data).to.be.true;
                                return done();
                            })
                        });
                    });
                }
            });
        });

        xit('Should cache the Test instance after save', function (done) {
            var id = uuid.v4();
            var result1, result2;
            TestModel.create({
                name: 'Lior',
                id: id
            }, defaultContext, function (err, data) {
                if (err) {
                    console.log(err);
                    return done(err);
                } else {
                    data.name = 'Tamar';
                    data.save(defaultContext, function(err, data) {
                        if (err) {
                            console.log(err);
                            return done(err);
                        }
                        result1 = Object.assign({},data.toObject());
                        mongoDeleteById(id, function(err) {
                            if(err) {
                                return done(err);
                            }
                            TestModel.find({"where": {"id": id}}, defaultContext, function (err, data2) {
                                if (err) {
                                    return done(err);
                                } else if(data2.length === 0) {
                                    return done('instance not cached')
                                }
                                result2 = Object.assign({},data2[0].toObject());
                                expect(models[modelName]).not.to.be.null;
                                expect(result1).not.to.be.null;
                                expect(result2).not.to.be.null;
                                expect(result1).to.deep.equal(result2);
                                expect(result1.__data === result2.__data).to.be.true;
                                return done();
                            })
                        });
                    });
                }
            });
        });

        it('Should cache the Test instance after updateAttributes', function (done) {
            var id = uuid.v4();
            var result1, result2;
            TestModel.create({
                name: 'Lior',
                assign: {
                    change: 'this field should be deleted'
                },
                id: id
            }, defaultContext, function (err, data) {
                if (err) {
                    console.log(err);
                    return done(err);
                } else {
                    data.updateAttributes({name: 'Eduardo', assign:{new: 'should only see this field'}}, defaultContext, function(err, data) {
                        if (err) {
                            console.log(err);
                            return done(err);
                        }
                        result1 = Object.assign({}, data.toObject(), {name: 'Eduardo', assign:{new: 'should only see this field'}});
                        mongoDeleteById(id, function(err) {
                            if(err) {
                                return done(err);
                            }
                            TestModel.find({"where": {"id": id}}, defaultContext, function (err, data2) {
                                if (err) {
                                    return done(err);
                                } else if(data2.length === 0) {
                                    return done('instance not cached')
                                }
                                result2 = Object.assign({},data2[0].toObject());
                                expect(models[modelName]).not.to.be.null;
                                expect(result1).not.to.be.null;
                                expect(result2).not.to.be.null;
                                expect(result1).to.deep.equal(result2);
                                expect(result1.__data === result2.__data).to.be.true;
                                return done();
                            })
                        });
                    });
                }
            });
        });

        it('Should clear instance cache after destroyAll', function (done) {
            var id = uuid.v4();
            var result1, result2;
            TestModel.create({
                name: 'Ori',
                id: id
            }, defaultContext, function (err, data) {
                if (err) {
                    console.log(err);
                    return done(err);
                } else {
                    TestModel.destroyAll({}, defaultContext, function(err) {
                        if (err) {
                            console.log(err);
                            return done(err);
                        }
                        TestModel.find({"where": {"id": id}}, defaultContext, function (err, data2) {
                            if (err) {
                                return done(err);
                            }
                            expect(data2.length).to.be.equal(0);
                            return done();
                        });
                    });
                }
            });
        });

        it('Should delete the Test instance from cache after deleteByid', function (done) {
            var id = uuid.v4();
            var result1, result2;
            TestModel.create({
                name: 'Tamar',
                id: id
            }, defaultContext, function (err, data) {
                if (err) {
                    console.log(err);
                    return done(err);
                } else {
                    TestModel.destroyById(id, defaultContext, function(err) {
                        if (err) {
                            console.log(err);
                            return done(err);
                        }
                        TestModel.find({"where": {"id": id}}, defaultContext, function (err, data2) {
                            if (err) {
                                return done(err);
                            }
                            expect(data2.length).to.be.equal(0);
                            return done();
                        });
                    });
                }
            });
        });

        it('Should delete the Test instance from cache after deleteByid and version', function (done) {
            var id = uuid.v4();
            var result1, result2;
            TestModel.create({
                name: 'Tamar',
                id: id
            }, defaultContext, function (err, data) {
                if (err) {
                    console.log(err);
                    return done(err);
                } else {
                    TestModel.destroyById(id, data._version, defaultContext, function(err) {
                        if (err) {
                            console.log(err);
                            return done(err);
                        }
                        TestModel.find({"where": {"id": id}}, defaultContext, function (err, data2) {
                            if (err) {
                                return done(err);
                            }
                            expect(data2.length).to.be.equal(0);
                            return done();
                        });
                    });
                }
            });
        });

        it('Should clear cache after update', function (done) {
            var id = uuid.v4();
            TestModel.create({
                name: "Praveen",
                id: id
            }, defaultContext, function (err, data) {
                if (err) {
                    console.log(err);
                    return done(err);
                } else {
                    // update with query should delete instance cache
                    TestModel.update({name:"Praveen"}, {name:"Ramesh"}, defaultContext, function(err, info) {
                        if(info.count !== 1){
                            return done('too many instance with name Praveen');
                        }
                        mongoDeleteById(id, function(err) {
                            if(err) {
                                return done(err);
                            }
                            TestModel.find({"where": {"id": id}}, defaultContext, function (err, data2) {
                                if (err) {
                                    return done(err);
                                }
                                expect(data2.length).to.be.equal(0);
                                return done();
                            });
                        });
                    });
                }
            });
        });

    });

    describe('Personalization tests', function () {
        xit('Should create two instances with the same id and diffrenet scope, find from cache should still work', function (done) {
            var id = uuid.v4();
            var result1, result2;
            TestModel.create({
                name: "limits",
                id: id
            }, defaultContext, function (err, data) {
                if (err) {
                    return done(err);
                }
                result1 = Object.assign({}, data.toObject());
                TestModel.create({
                    name: "gravity",
                    id: id
                }, altContext, function (err, data) {
                    if (err) {
                        return done(err);
                    }
                    TestModel.find({"where": {"id": id}}, defaultContext, function (err, data2) {
                        if (err) {
                            return done(err);
                        }
                        result2 = Object.assign({}, data2.toObject());
                        expect(result1).not.to.be.null;
                        expect(result2).not.to.be.null;
                        expect(result1).to.deep.equal(result2);
                        expect(result1.__data === result2.__data).to.be.true;
                    });
                });

            });
        });

    });


//    after('Cleanup', function (done) {
//        TestModel.destroyAll({}, defaultContext, function (err, info) {
//            if (err) {
//                console.log(err, info);
//            }
//            done();
//        });
//    });
});
