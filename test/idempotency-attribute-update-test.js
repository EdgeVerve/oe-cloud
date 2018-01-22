
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

describe('create and get leonTest model', function () {
    
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
        console.log('post node instance to DB ')
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
        var delData = function (cb){
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

        var delModel = function (cb){
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

        var tasks = [delData, delModel];
        async.series(tasks, done);
    });


    it('first get from DB', function (done) {
        var filter = {where: {content: 'boom'}};
        var leonTestModel = loopback.getModel('leonTest', bootstrap.defaultContext);
        leonTestModel.find(filter, options, function(err, models){
            var inv = models[0];
            expect(inv.id).to.be.equal('n1');
            
            var updateAtr = function(asyncCB){
                inv.title = "update";
                inv.updateAttributes(inv, options, function(err, res){
                    if(err){
                        return asyncCB(err)
                    }
                    expect(res.title).to.equal("update");
                    return asyncCB();
                });
            }

            async.parallel([updateAtr, updateAtr], done);


        });
    });
    
    // it('second get from DB', function (done) {
    //     findAndUpdate(done);
    // });

    // it('first get from DB', function (done) {
        // var filter = {where: {content: 'boom'}};
        // var inventoryModel = loopback.getModel('Note', bootstrap.defaultContext);
        // inventoryModel.find(filter, options, function(err, inventories){
        //     expect(inventories.length).to.be.equal(1);
        //     var inv = inventories[0];
        //     console.log("version 1: " + inv._version);
        //     inv.title = "first update";
        //     inv.updateAttributes(inv, options, function(err, res){
        //         if(err){
        //             return done(err)
        //         }
        //         else {
        //             expect(res.title).to.equal("first update");
        //             return done();
        //         }
        //     });
        // });  
    // });

    // it('second get from DB', function (done) {
        // var filter = {where: {content: 'boom'}};
        // var inventoryModel = loopback.getModel('Note', bootstrap.defaultContext);
        // inventoryModel.find(filter, options, function(err, inventories){
        //     // console.log('@@' + inventories.length);
        //     expect(inventories.length).to.be.equal(1);
        //     var inv = inventories[0];
        //     console.log("version 2: " + inv._version);
        //     inv.title = "second update";
        //     inv.updateAttributes(inv, options, function(err, res){
        //         if(err){
        //             return done(err)
        //         }
        //         else {
        //             expect(res.title).to.equal("second update");
        //             return done();
        //         }
        //     });
        // });  
    // });

});
