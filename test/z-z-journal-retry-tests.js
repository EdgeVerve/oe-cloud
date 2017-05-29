/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries. 
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/

/* This is a collection of tests that make sure that find on a base actor entity is first called on memory,
 * and if there is no object with the desired Id - the call proceeds to the DB.
 *
 * @author David Zharnest
 */

var loopback = require('loopback');
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var app = bootstrap.app;
var uuid = require('node-uuid');
var chai = require('chai');
var expect = chai.expect;
var logger = require('evf-logger');
var log = logger('rest-api-actors-mixin-test');
var eventHistoryManager = require('../ev-modules/ev-event-history-manager');

var api = bootstrap.api;

var accessToken;

function apiRequest(url, postData, callback, done){
    var version = uuid.v4();
    postData._version = version;
    api
        .set('Accept', 'application/json')
        .post(bootstrap.basePath + url + '?access_token=' + accessToken)
        .send(postData)
        .end(function(err, res) {
            if (err || res.body.error) {
                log.error(err || (new Error(JSON.stringify(res.body.error))));
                return done(err || (new Error(JSON.stringify(res.body.error))));
            } else {
                return callback(res);
            }
        });
}

describe(chalk.blue('journal-retry-tests'), function() {
    this.timeout(30000);

    var backupConstants = {};
    var pendingId;

    before('change event history manager constants', function (done) {
        backupConstants.eventReliabilityReplayThreshold = app.get('eventReliabilityReplayThreshold');
        backupConstants.eventReliabilityReplayInterval = app.get('eventReliabilityReplayInterval');
        backupConstants.eventReliabilityDbPersistenceInterval = app.get('eventReliabilityDbPersistenceInterval');
        app.set('eventReliabilityReplayThreshold', 100);
        app.set('eventReliabilityReplayInterval', 1000);
        app.set('eventReliabilityDbPersistenceInterval', 2000);
        app.set('eventReliabilityMaxRetry', 4);
        eventHistoryManager.init(app);
        done();
    });
    after('restore event history manager constants', function (done) {
        app.set('eventReliabilityReplayThreshold', backupConstants.eventReliabilityReplayThreshold);
        app.set('eventReliabilityReplayInterval', backupConstants.eventReliabilityReplayInterval);
        app.set('eventReliabilityDbPersistenceInterval', backupConstants.eventReliabilityDbPersistenceInterval);
        eventHistoryManager.init(app);
        done();
    });

    before('login using admin', function fnLogin(done) {
        var sendData = {
            'username': 'admin',
            'password': 'admin'
        };

        api
            .post(bootstrap.basePath + '/BaseUsers/login')
            .send(sendData)
            .expect(200).end(function(err, res) {
                if (err) {
                    log.error(err);
                    return done(err);
                } else {
                    accessToken = res.body.id;
                    return done();
                }
            });
    });


    before('create test models', function createModels(done) {
        var modelDefinition = loopback.findModel('ModelDefinition');
        var data = {
            'name': 'TestAccount',
            'base': 'BaseActorEntity',
            'options': {
                stateThreshold: 1
            }
        };

        modelDefinition.create(data, bootstrap.defaultContext, createTransferModel);

        function createTransferModel() {
            var data = {
                'name': 'TestTransfer',
                'base': 'BaseJournalEntity'
            };
            modelDefinition.create(data, bootstrap.defaultContext, addAllFunctions);
        }

        function addAllFunctions() {

            var transferDefinition = loopback.getModel('TestTransfer');
            transferDefinition.prototype.retriable = true;
            transferDefinition.prototype.performBusinessValidations = function(cb) {
                if (transferDefinition.prototype.retriable  === true) {
                    transferDefinition.prototype.retriable = false;
                    var err = new Error('biz validation error');
                    return cb(err);
                } else {
                    return cb();
                }
            };

            var accountDefinition = loopback.getModel('TestAccount');
            accountDefinition.prototype.atomicTypes = ['DEBIT'];
            accountDefinition.prototype.nonAtomicTypes = ['CREDIT'];

            accountDefinition.prototype.validateCondition = function(stateObj, activity) {
                if (activity.instructionType === 'DEBIT') {
                    return stateObj.quantity >= activity.payload.value;
                }
            };

            accountDefinition.prototype.atomicInstructions = function(stateObj, activity) {
                if (activity.instructionType === 'DEBIT') {
                    stateObj.quantity = stateObj.quantity - activity.payload.value;
                    return stateObj;
                }
            };

            accountDefinition.prototype.nonAtomicInstructions = function(stateObj, activity) {
                if (activity.instructionType === 'CREDIT') {
                    stateObj.quantity = stateObj.quantity + activity.payload.value;
                    return stateObj;
                }
            };

            accountDefinition.prototype.processPendingMessage = function(message, stateObj) {
                if (message.instructionType === 'CREDIT') {
                    stateObj.quantity +=  message.payload.value;
                } else if (message.instructionType === 'DEBIT') {
                    stateObj.quantity -=  message.payload.value;
                }
                return stateObj;
            };

            accountDefinition.prototype.associatedModels = ['TestTransfer'];
            return done();
        }

    });

    it('fail business validation should return pending error', function(done) {
        //put in DB
        log.debug(log.defaultContext(), 'post actor with quantity of 0');
        apiRequest('/TestAccounts/', {'rrr': 0, 'stateObj': {'quantity': 0}}, proceed, done);

        //make a transaction with account --> into memory pool
        function proceed(result) {
            log.debug(log.defaultContext(), 'credit the account with 20 --> loading actor to memory and changes quantity in memory');
            var postData =
                {
                    'nonAtomicActivitiesList': [
                        {
                            'entityId': result.body.id,
                            'payload': {'value': 20},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        }
                    ]
                };

            var version = uuid.v4();
            postData._version = version;
            api
                .set('Accept', 'application/json')
                .post(bootstrap.basePath + '/TestTransfers/' + '?access_token=' + accessToken)
                .send(postData)
                .end(function(err, res) {
                    if (err || res.body.error) {
                        var msg = res.body.error.message;
                        expect(msg).to.contain('Pending');
                        pendingId = msg.substring(msg.indexOf(' ') + 1);
                        return done();
                    } else {
                        return done(new Error('Transaction Should be Pending'));
                    }
                });
        }
    });

    it('pending record status should be success', function(done) {
        setTimeout(function() {
            api
                .set('Accept', 'application/json')
                .get(bootstrap.basePath + '/PendingJournals?filter={"where":{"id": "' + pendingId + '"}}&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        return done(err);
                    } else {
                        expect(res.body[0].status).to.be.equal('success');
                        return done();
                    }
                });
        }, 1000);
    });

    var deleteContext = {fetchAllScopes: true, ctx: {tenantId: 'test-tenant'}};

    after('delete all the test accounts', function(done) {
        var testAccount = loopback.getModel('TestAccount');
        testAccount.destroyAll({}, deleteContext, function(err) {
            if (err) {
                log.error(err);
                return done(err);
            } else {
                return done();
            }
        });
    });

    after('delete all the test transfers', function(done) {
        var testTransfer = loopback.getModel('TestTransfer');
        testTransfer.destroyAll({},  deleteContext, function(err) {
            if (err) {
                expect(err.message).to.be.equal('Cannot delete journal entry');
                return done();
            } else {
                log.debug('deleted alltest transfers');
                return done(new Error('Should not be allowed to delete journal entries!'));
            }
        });
    });

    after('delete all the test states', function(done) {
        var state = loopback.getModel('State');
        state.destroyAll({}, deleteContext, function(err) {
            if (err) {
                log.error(err);
                return done(err);
            } else {
                return done();
            }
        });
    });

    after('delete all modelDefinition models', function(done) {
        //        models.ModelDefinition.destroyAll({}, bootstrap.defaultContext, function(err, res) {
        //                    if (err) {
        //                        done(err);
        //                    } else {
        //                        done();
        //                    }
        //           });
        done();
    });
});
