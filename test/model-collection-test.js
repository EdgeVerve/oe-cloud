/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This Unit Test script tests the feature of the framework that allows
 * a model variant to persist to the same mongodb collection as its parent variant.
 * The test involves creating a parent model 'AAModel' which specifies its MongoDB 
 * collection as 'SomeCollection'. After this, another model 'BBModel' is created
 * as a variant of AAModel, then another model 'CCModel' is created as a variant of
 * BBModel, then another model 'DDModel' is created as a variant of AAModel, but
 * with a MongoDB collection specified.
 * The test passes if all models have a mongodb collection property automatically 
 * added (if not specified), and the collection of all variants is set to the 
 * parent's collection, if not specified, and remains the same if specified.
 *    
 * 
 * Author: Ajith Vasudevan 
 */


var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var expect = chai.expect;
var models = bootstrap.models;
var async = require('async');

describe('Model Collection Test', function () {

    this.timeout(15000);

    var ModelDefinition = models.ModelDefinition;
    var result1, result2, result3, result4;

    var TestModelDefinition1 = {
        'name': 'AAModel',
        'base': 'BaseEntity',
        'mongodb': {
            'collection': 'SomeCollection'
        }
    };

    var TestModelDefinition2 = {
        'name': 'BBModel',
        'base': 'BaseEntity',
        'variantOf': 'AAModel'
    };

    var TestModelDefinition3 = {
        'name': 'CCModel',
        'base': 'BaseEntity',
        'variantOf': 'AAModel'
    };

    var TestModelDefinition4 = {
        'name': 'DDModel',
        'base': 'BaseEntity',
        'variantOf': 'AAModel',
        'mongodb': {
            'collection': 'AnotherCollection'
        }
    };

    before('Create Test Models and do model collection test', function (done) {
        async.series([
                    function clean(cb) {
                deleteTestModelDefinitions(cb);
            },
                    function (cb) {
                ModelDefinition.create(TestModelDefinition1, bootstrap.defaultContext, function (err, data) {
                    if (err) {
                        console.log("Error creating TestModelDefinition1", err);
                    }
                    result1 = data;
                    cb();
                });
                    },
                    function (cb) {
                ModelDefinition.create(TestModelDefinition2, bootstrap.defaultContext, function (err, data) {
                    if (err) {
                        console.log("Error creating TestModelDefinition2", err);
                    }
                    result2 = data;
                    cb();
                });
                    },
                    function (cb) {
                ModelDefinition.create(TestModelDefinition3, bootstrap.defaultContext, function (err, data) {
                    if (err) {
                        console.log("Error creating TestModelDefinition3", err);
                    }
                    result3 = data;
                    cb();
                });
                    },
                    function (cb) {
                ModelDefinition.create(TestModelDefinition4, bootstrap.defaultContext, function (err, data) {
                    if (err) {
                        console.log("Error creating TestModelDefinition4", err);
                    }
                    result4 = data;
                    cb();
                });
                    }


                    ], function () {
            done();
        });
    });



    after('Cleanup', function (done) {
        deleteTestModelDefinitions(done);
    });


    function deleteTestModelDefinitions(done) {
        async.parallel([
    	              function (cb) {
                ModelDefinition.remove({
                    'name': 'AAModel'
                }, bootstrap.defaultContext, function (err, info) {
                    if (err) {
                        console.log(err, info);
                    }
                    cb();
                });
    	              },
    	              function (cb) {
                ModelDefinition.remove({
                    'clientModelName': 'BBModel'
                }, bootstrap.defaultContext, function (err, info) {
                    if (err) {
                        console.log(err, info);
                    }
                    cb();
                });
    	              },
    	              function (cb) {
                ModelDefinition.remove({
                    'clientModelName': 'CCModel'
                }, bootstrap.defaultContext, function (err, info) {
                    if (err) {
                        console.log(err, info);
                    }
                    cb();
                });
    	              },
    	              function (cb) {
                ModelDefinition.remove({
                    'clientModelName': 'DDModel'
                }, bootstrap.defaultContext, function (err, info) {
                    if (err) {
                        console.log(err, info);
                    }
                    cb();
                });
    	              }
    	              ], function () {
            done();
        });

    }

    it('Should automatically add the missing mongodb collection tags in a new model created using ModelDefinition API', function (done) {
        expect(result1).not.to.be.null;
        expect(result1.mongodb).not.to.be.null;
        expect(result1.mongodb.collection).to.equal('SomeCollection');
        done();
    });

    it('Should automatically add the missing mongodb collection tags in a new model variant of the first model', function (done) {
        expect(result2).not.to.be.null;
        expect(result2.mongodb).not.to.be.null;
        expect(result2.mongodb.collection).to.equal('SomeCollection');
        done();
    });

    it('Should automatically add the missing mongodb collection tags in a new model variant of the variant of the first model', function (done) {
        expect(result3).not.to.be.null;
        expect(result3.mongodb).not.to.be.null;
        expect(result3.mongodb.collection).to.equal('SomeCollection');
        done();
    });

    it('Should retain the mongodb collection tags as specified while creating a model', function (done) {
        expect(result4).not.to.be.null;
        expect(result4.mongodb).not.to.be.null;
        expect(result4.mongodb.collection).to.equal('AnotherCollection');
        done();
    });

});
