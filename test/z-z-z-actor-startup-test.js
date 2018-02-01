/**
 * 
 * ©2016-2018 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 *  Author: Karin Angel
 */

var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var uuidv4 = require('uuid/v4');
var expect = chai.expect;
var app = bootstrap.app;
var models = bootstrap.models;
var loopback = require('loopback');
var postgresHost = process.env.POSTGRES_HOST || 'localhost';
var dsname = 'db';
var dbName = process.env.DB_NAME || dsname;
var dataSource;
var options = bootstrap.defaultContext;
var async = require('async');
var logger = require('oe-logger');
var log = logger('actor-pattern-startup-test');

describe('Actor startUp Test', function () {
    var modelDefinition = loopback.findModel('ModelDefinition');
    var actorModelInstance;
    var actorModel;
    var actorId;
    var journalModelInstance;
    var journalModel;
    var journal1Id;
    var journal2Id;
    var data;
    var actorInstance;
    var afterTest = {};

    before('create actor Model', function(done) {
        var createActorModel = function(asyncCB) {
            data = {
              'name': 'TestStartUpActor',
              'base': 'BaseActorEntity',
              'options': {
                stateThreshold: 10
              }
            };
            modelDefinition.create(data, options, function(err, res) {
                if (err) {
                    log.error(log.defaultContext(), err);
                    return asyncCB(err);
                }
                actorModelInstance = res;
                actorModel = loopback.getModel('TestStartUpActor', options);
                actorModel.prototype.atomicTypes = ['DEBIT'];
                actorModel.prototype.nonAtomicTypes = ['CREDIT'];
        
                actorModel.prototype.validateCondition = function (stateObj, activity) {
                if (activity.instructionType === 'DEBIT') {
                    return stateObj.quantity >= activity.payload.value;
                }
                };
        
                actorModel.prototype.atomicInstructions = function (stateObj, activity) {
                if (activity.instructionType === 'DEBIT') {
                    stateObj.quantity = stateObj.quantity - activity.payload.value;
                    return stateObj;
                }
                };
        
                actorModel.prototype.nonAtomicInstructions = function (stateObj, activity) {
                if (activity.instructionType === 'CREDIT') {
                    stateObj.quantity = stateObj.quantity + activity.payload.value;
                    return stateObj;
                }
                };
        
                actorModel.prototype.processPendingMessage = function (message, stateObj) {
                if (message.instructionType === 'CREDIT') {
                    stateObj.quantity += message.payload.value;
                } else if (message.instructionType === 'DEBIT') {
                    stateObj.quantity -= message.payload.value;
                }
                return stateObj;
                };

                actorModel.prototype.stateObj = {quantity: 3000};
        
                actorModel.prototype.associatedModels = ['TestStartUpJournal'];
                return asyncCB();
            });
        };
        var createActorInstance = function(asyncCB) {
            data = {};
            actorModel.create(data, options, function(err, res) {
                if (err) {
                    log.error(log.defaultContext(), err);
                    return asyncCB(err);
                }
                actorId = res.id;
                actorInstance = res;
                return asyncCB();
            });
        };
        var createJournalModel = function(asyncCB) {
            data = {
                'name': 'TestStartUpJournal',
                'base': 'BaseJournalEntity'
            };
            modelDefinition.create(data, options, function(err, res) {
                if (err) {
                    log.error(log.defaultContext(), err);
                    return asyncCB(err);
                }
                journalModelInstance = res;
                journalModel = loopback.getModel('TestStartUpJournal', options);
                journalModel.prototype.performBusinessValidations = function (options, cb) {
                  cb();
                };
                return asyncCB();
            });
        };
        var createJournalInstance = function(asyncCB) {
            var connectionString = "postgres://postgres:postgres@" + postgresHost + ":5432/" + dbName;
            var pg = require('pg');
            var client = new pg.Client(connectionString);
            client.connect(function (err) {
                if (err) {
                    log.error(log.defaultContext(), err);
                    return asyncCB(err);
                }
                var finalQueryStr = "INSERT INTO public.\"" + journalModel.modelName.toLowerCase() + "\"(_version,startup,atomicactivitieslist,nonatomicactivitieslist,_type,_createdby,_modifiedby,_createdon,_modifiedon,_scope,_autoscope,_hostname,_fsctx) VALUES($1,$2,$3,$4,$5,$6,$7,$8::TIMESTAMP WITH TIME ZONE,$9::TIMESTAMP WITH TIME ZONE,$10,$11,$12,$13) RETURNING \"id\"";
                var _version = 1;
                var startup = "undefinedTestStartUpActor-test-tenant" + actorId;
                var atomicactivitieslist = [];
                var nonatomicactivitieslist = [
                    {
                        seqNum: 1,
                        entityId: actorId,
                        modelName: actorModel.modelName,
                        payload: {value:10000},
                        instructionType: "CREDIT"
                    }
                ];
                var _type = journalModel.modelName;
                var _createdby = "test-user";
                var _modifiedby = "test-user";
                var _createdon = new Date();
                var _modifiedon = new Date();
                var _scope = ["tenantId:test-tenant"];
                var _autoscope = {
                    tenantId: "test-tenant"
                };
                var _hostname = "ENGPNYC0T9R";
                var _fsctx = {
                    options: {
                        ctx: {
                            tenantId: "test-tenant",
                            remoteUser: "test-user"
                        },
                        exactMatch: false,
                        whereKeysModelDefinition: [],
                        model: "State"
                    },
                    isNewInstance:true
                };
                _fsctx.options['whereKeysTestStartUpActor-test-tenant'] = [];
                var finalParamsStr = [_version, startup, atomicactivitieslist, nonatomicactivitieslist, _type, _createdby, _modifiedby, _createdon, _modifiedon, _scope, _autoscope, _hostname, _fsctx];
                var query = client.query(finalQueryStr, finalParamsStr , function (err, result) {
                    if (err) {
                        log.error(log.defaultContext(), err);
                        return asyncCB(err);
                    }
                    return asyncCB();
                });
            });
        };
        
        async.series([createActorModel, createActorInstance, createJournalModel, createJournalInstance], function(err, res) {
            done(err);
        });
    });

    it('Check Strat Up', function(done) {
        var createJournalInstanceAndCheckBalance = function(done) {
            data = {
                "nonAtomicActivitiesList": [
                    {
                    "entityId": actorId,
                    "payload": {"value": 1000},
                    "modelName": actorModel.clientModelName,
                    "instructionType": "CREDIT"
                    }
                ],
                "_version": uuidv4()
            };
            journalModel.create(data, options, function(err, res) {
                if (err) {
                    log.error(log.defaultContext(), err);
                    return done(err);
                }
                journal2Id = res.id;
                afterTest[actorInstance.stateId] = 14000;
                return done();
            });
        };
        createJournalInstanceAndCheckBalance(done);
    });

    after('check state is updated against DB', function (done) {
        var stateModel = loopback.getModel('State');
        async.retry({ times: 5 }, function (retrycb) {
          async.eachOf(afterTest, function (value, stateId, cb) {
            var query = {
              where: { id: stateId }
            };
            stateModel.find(query, bootstrap.defaultContext, function (err, res) {
              if (err) {
                log.error(log.defaultContext(), err);
                return cb(err);
              } else {
                if (res[0].stateObj.quantity === value) {
                  return cb();
                } else {
                  log.error(log.defaultContext(), 'quantity is: ', res[0].stateObj.quantity, ' but value is: ', value);
                  return cb(new Error('error in assertion against db'));
                }
              }
            });
          }, function (err) {
            if (err) {
              return setTimeout(retrycb, 3000, err);
            } else {
              return retrycb(null, true);
            }
          });
        }, function (err, result) {
          if (err) {
            return done(err);
          } else {
            return done();
          }
        });
      });
});