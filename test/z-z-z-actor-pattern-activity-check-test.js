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
var expect = chai.expect;
var app = bootstrap.app;
var loopback = require('loopback');
var options = bootstrap.defaultContext;
var async = require('async');
var logger = require('oe-logger');
var log = logger('actor-pattern-activity-check-test');
var uuidv4 = require('uuid/v4');

describe('Actor startUp Test', function () {
    var modelDefinition = loopback.findModel('ModelDefinition');
    var actorModelInstance;
    var actorModel;
    var actorId;
    var actorInstance;
    var journalModelInstance;
    var journalModel;
    var journal1Id;
    var journal2Id;
    var data;
    var afterTest = {};

    before('create actor Model', function(done) {
        var createActorModel = function(asyncCB) {
            data = {
              'name': 'TestActivitiesActor',
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
                actorModel = loopback.getModel('TestActivitiesActor', options);
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
        
                actorModel.prototype.associatedModels = ['TestActivitiesJournal'];
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
                actorInstance = res;
                actorId = res.id;
                return asyncCB();
            });
        };
        var createJournalModel = function(asyncCB) {
            data = {
                'name': 'TestActivitiesJournal',
                'base': 'BaseJournalEntity'
            };
            modelDefinition.create(data, options, function(err, res) {
                if (err) {
                    log.error(log.defaultContext(), err);
                    return asyncCB(err);
                }
                journalModelInstance = res;
                journalModel = loopback.getModel('TestActivitiesJournal', options);
                journalModel.prototype.performBusinessValidations = function (options, cb) {
                  cb();
                };
                return asyncCB();
            });
        };
        var createJournalInstance = function(asyncCB) {
            data = {
                "nonAtomicActivitiesList": [
                    {
                    "entityId": actorId,
                    "payload": {"value": 1000},
                    "modelName": actorModel.clientModelName,
                    "instructionType": "CREDIT"
                    }
                ],
                "atomicActivitiesList": [
                    {
                    "entityId": actorId,
                    "payload": {"value": 1},
                    "modelName": actorModel.clientModelName,
                    "instructionType": "DEBIT"
                    }
                ],
                "_version": uuidv4()
            };
            var optionsWithLock = options;
            journalModel.create(data, optionsWithLock, function(err, res) {
                if (err) {
                    log.error(log.defaultContext(), err);
                    return asyncCB(err);
                }
                journalId = res.id;
                afterTest[actorInstance.stateId] = 3999;
                asyncCB();
            });
        };
        
        async.series([createActorModel, createActorInstance, createJournalModel, createJournalInstance], function(err, res) {
            done(err);
        });
    });

    it('Check activities in db', function(done) {
        var checkActivities = function(done) {
            var activitiesModel = loopback.getModel('ActorActivity', options);
            activitiesModel.find({}, options, function (err, res) {
                if (err) {
                    return done(err);
                } else if (activitiesModel.getDataSource().connector.name === 'postgresql') {
                    expect(res.length).to.be.equal(2);
                    return done();
                } else {
                    expect(res.length).to.be.equal(0);
                    return done();
                }
            });
        };
        checkActivities(done);
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