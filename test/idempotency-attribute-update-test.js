
/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var expect = chai.expect;
var models = bootstrap.models;
var chalk = require('chalk');
var loopback = require('loopback');
var async = require('async');


var options = JSON.parse(JSON.stringify(bootstrap.defaultContext));

describe('create and get "leonTest" model', function () {
    
    var leonTestData = {
        "name": "leonTest",
        "base" : "BaseEntity",
        "strict" : false,
        "properties": {
            "title": {
                "type": "string"
            },
            "content": {
                "type": "string"
            }
        },
        "mixins": {
            "SoftDeleteMixin": false
        },
        "cacheable": true
    };

    var modelId;
    var createNewModelDefinition = function (cb){
        bootstrap.api
        .set('Accept', 'application/json')
        .post(bootstrap.basePath + '/ModelDefinitions/')
        .send(leonTestData).expect(200).end(function(err, res){
            if(err){
                return cb(err);
            }else{
                modelId = res.body.id;
                cb();  
            }
        });
    }

    var postData = function(cb){
        console.log('post "leonTest" instance to DB')
        bootstrap.api
            .set('Accept', 'application/json')
            .post(bootstrap.basePath + '/leonTests/')
            .send({
                'id': 'n1',
                'title': 'initial',
                'content': 'boom'
            })
            .expect(200).end(function (err, res) {
                if (err) {
                    return cb(err);
                }else{
                    cb();
                }
            });
    }


    before('before', function (done) {
        process.env.JWT_FOR_ACCESS_TOKEN = true;
        
        var tasks = [createNewModelDefinition, postData];
        async.series(tasks, done);
    });

    
    after('after', function (done) {
        process.env.JWT_FOR_ACCESS_TOKEN = true;
        var deleteData = function (cb){
            console.log('in delete Data..');
            bootstrap.api
            .set('Accept', 'application/json')
            .delete(bootstrap.basePath + '/leonTests/' + 'n1')
            .end(function(err, resp) {
                if (err) {
                    return cb(err);
                } else {
                    console.log("deleted")
                    return cb();
                }
            });
        }
        
        var deleteModel = function (cb){
            console.log('in delete Model..');
            bootstrap.api
            .set('Accept', 'application/json')
            .delete(bootstrap.basePath + '/ModelDefinitions/' + modelId)
            .end(function(err, resp) {
                if (err) {
                    return cb(err);
                } else {
                    return cb();
                }
            });
        }

        var tasks = [deleteData, deleteModel];
        async.series(tasks, function(err, res){
            process.env.JWT_FOR_ACCESS_TOKEN = '';
            return done(err);
        });
    });

    it('update attributes on the same record should result with the same _version', function (done) {
        var filter = {where: {id: 'n1'}};
        var leonTestModel = loopback.getModel('leonTest', bootstrap.defaultContext);
        var version1;
        leonTestModel.find(filter, options, function(err, models){
            var inv1 = models[0];
            expect(inv1.id).to.be.equal('n1');
            leonTestModel.find(filter, options, function(err, models2){
                var inv2 = models2[0];
                expect(inv2.id).to.be.equal('n1');
                var updateAndCheckVersion = function(inv, check1, check2) {
                    return function (asyncCB) {
                        inv.title = check1;
                        inv.updateAttributes(inv, options, function(err, res){
                            if(err){
                                return asyncCB(err)
                            }
                            expect(res.title).to.equal(check2);
                            if(check1 === "update1") {
                                version1 = res._version;
                            }
                            if(check1 === "update2") {
                                expect(res._version).to.be.equal(version1);
                            }
                            return asyncCB();
                        });
                    }
                }
                async.series([updateAndCheckVersion(inv1, "update1", "update1"), updateAndCheckVersion(inv2, "update2", "update1")], done);
            });
        });
    });
});
