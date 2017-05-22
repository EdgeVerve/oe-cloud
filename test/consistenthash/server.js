/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var bootstrap = require('../bootstrap');
var app = bootstrap.app;
if(process.argv[3] && !isNaN(parseInt(process.argv[3]))){
    app.set('port', process.argv[3]);
}
var chai = bootstrap.chai;
var expect = chai.expect;
var models = bootstrap.models;
var modelName = 'ConsistentHashModel';
var os = require('os');

describe('Consistent Hash Server', function(){
    
    before('Create Model and Upload Data', function(done){
        this.timeout(4000);
        bootstrap.login(function(accessToken){
            console.log("AccessToken ", accessToken);
        });
        // Change to findOrCreate
        models.ModelDefinition.findOne({'where': {'name': modelName}}, bootstrap.defaultContext, function(err, res) {
            if (!res) {
                var consistHashModel = {
                    name: modelName,
                    base: 'BaseEntity',
                    plural: 'ConsistentHashModels',
                    options: {
                        validateUpsert: true,
                        proxyEnabled: true
                    },
                    properties: {
                        accountName: {
                            type: 'string',
                            required: true
                        },
                        limitAmount:{
                            type: 'number',
                            default: 0
                        },
                        portNumber: {
                            type: 'string'
                        },
                        hostname: {
                            type: 'string'
                        }
                    },
                    filebased: false
                };
                models.ModelDefinition.create(consistHashModel, bootstrap.defaultContext, function(err, model){
                    if (err) {
                        console.log(err);
                    }
                    expect(err).to.be.null;
                });
                models.ModelDefinition.events.once('model-' + modelName + '-available', function() {
                    checkAndCreateData(done);
                });                
            } else {
                checkAndCreateData(done);
            }
        });

        function checkAndCreateData(done){
            // Change to findOrCreate
            models[modelName].find({where:{id: {inq:['consist-101', 'consist-201']}}}, bootstrap.defaultContext, function(err, val){
                if(val.length > 0){
                    done();
                } else {
                    models[modelName].create([{accountName:'tywin', id:'consist-101'}, {accountName:'tyrion', id:'consist-201'}], bootstrap.defaultContext, function(err, res){
                        done();
                    });
                }                
            });
            models[modelName].report = function report1(options, cb) {

                models[modelName].findById('consist-101', options, function (err, rec1) {
                    if (err) {
                        return cb(err, {});
                    }
                    models[modelName].findById('consist-201', options, function (err, rec2) {
                        if (err) {
                            return cb(err, {});
                        }
                        var data = {
                            acct1: rec1,
                            acct2: rec2
                        }
                        return cb(err, data);
                    });
                });
            };
            models[modelName].remoteMethod('report', {
                description: 'Report of Getting accounts by id\'s and combining them.',
                accessType: 'READ',
                accepts: [
                ],
                http: {
                    verb: 'GET',
                    path: '/report'
                },
                returns: {
                    type: 'object',
                    root: true
                }
            });
            models[modelName].observe('after accesss', function (ctx, next) {
                var data = ctx.instance || ctx.currentInstance || ctx.data || ctx.accdata;
                if (data) {
                    if (Array.isArray(data) || data === Array) {
                        data.forEach(function (item) {
                            item.portNumber = app.get('port');
                            item.hostname = os.hostname();
                        });
                    } else {
                        data.portNumber = app.get('port');
                        data.hostname = os.hostname();
                    }
                }
                next();
            });
            models[modelName].customUpdateAttributes = function (options, cb) {

                models[modelName].findById('consist-101', options, function (err, rec1) {
                    if (err) {
                        return cb(err);
                    }
                    rec1.limitAmount = rec1.limitAmount + 1000;
                    rec1.updateAttributes(rec1, options, function (err, rec1) {
                        models[modelName].findById('consist-201', options, function (err, rec2) {
                            if (err) {
                                return cb(err);
                            }
                            rec2.limitAmount = rec2.limitAmount + 1000;
                            rec2.updateAttributes(rec2, options, function (err, rec2) {
                                var data = {
                                    acct1 : rec1,
                                    acct2 : rec2
                                };
                                cb(err, data);
                            });
                        });
                    });
                });
            };

            models[modelName].remoteMethod('customUpdateAttributes', {
                description: 'increarse limit amount by 1000 for consist-101, consist-201',
                accessType: 'WRITE',
                accepts: [
                ],
                http: {
                    verb: 'GET',
                    path: '/customUpdateAttributes'
                },

                returns: {
                    type: 'object',
                    root: true
                }
            });

            models[modelName].customUpsert = function (options, cb) {

                models[modelName].findById('consist-101', options, function (err, rec1) {
                    if (err) {
                        return cb(err);
                    }
                    rec1.limitAmount = rec1.limitAmount + 1000;
                    models[modelName].upsert(rec1, options, function (err, rec1) {
                        models[modelName].findById('consist-201', options, function (err, rec2) {
                            if (err) {
                                return cb(err);
                            }
                            rec2.limitAmount = rec2.limitAmount + 1000;
                            models[modelName].upsert(rec2, options, function (err, rec2) {
                                var data = {
                                    acct1 : rec1,
                                    acct2 : rec2
                                };
                                cb(err, data);
                            });
                        });
                    });
                });
            };
            models[modelName].remoteMethod('customUpsert', {
                description: 'Custom Upsert',
                accessType: 'WRITE',
                accepts: [
                ],
                http: {
                    verb: 'GET',
                    path: '/customUpsert'
                },
                returns: {
                    type: 'object',
                    root: true
                }
            });
        }
    });

    it('Waiting for Client requests.', function(done){
        this.timeout(242000);
        setTimeout(function(){
            done();
        }, 240000);
    });


});
