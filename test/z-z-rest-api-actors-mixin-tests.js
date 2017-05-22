/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

/* This is a collection of tests that make sure that find on a base actor entity is first called on memory,
 * and if there is no object with the desired Id - the call proceeds to the DB.
 *
 * @author Karin Angel
 */

var loopback = require('loopback');
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var uuid = require('node-uuid');
var chai = require('chai');
var expect = chai.expect;
var logger = require('../lib/logger');
var log = logger('rest-api-actors-mixin-test');

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

describe(chalk.blue('rest-api-actors-mixin-tests'), function() {
    this.timeout(30000);

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
            'base': 'BaseActorEntity'
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
            transferDefinition.prototype.performBusinessValidations = function(cb) {
                cb();
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

    it('actor not in mem not in db. get actor --> empty.', function(done) {

        api
            .set('Accept', 'application/json')
            .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id":"1234567"}}&access_token=' + accessToken)
            .send()
            .expect(200).end((err, res) => {
                if (err) {
                    log.error(err);
                    return done(err);
                } else {
                    expect(res.body.length).to.be.equal(0);
                    return done();
                }
            });
    });

    it('actor not in mem but in db. get actor --> actor.', function(done) {

        log.info(log.defaultContext(), 'post actor with quantity of 0');
        apiRequest('/TestAccounts/', {'qqq': 0, 'stateObj': {'quantity': 0}}, proceed, done);

        function proceed(result) {
            log.info(log.defaultContext(), 'get the actor and check the quantity is 0');
            api
                .set('Accept', 'application/json')
                .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id":"' + result.body.id + '"}}&access_token=' + accessToken)
                .send()
                .expect(200).end((err, res) => {
                    if (err) {
                        log.error(err);
                        return done(err);
                    } else {
                        expect(res.body[0].id).to.be.equal(result.body.id);
                        expect(res.body[0].state).to.be.equal(undefined);
                        return done();
                    }
                });
        }
    });

    it('actor in mem and in db with different quantity. get actor --> actor from mem.', function(done) {
        //put in DB
        log.info(log.defaultContext(), 'post actor with quantity of 0');
        apiRequest('/TestAccounts/', {'rrr': 0, 'stateObj': {'quantity': 0}}, proceed, done);

        //make a transaction with account --> into memory pool
        function proceed(result) {
            log.info(log.defaultContext(), 'credit the account with 20 --> loading actor to memory and changes quantity in memory');
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

            apiRequest('/TestTransfers/', postData, finishTestAndCheck, done);
        }

        //get the account and check the quantity.
        function finishTestAndCheck(result) {
            log.info(log.defaultContext(), 'get the actor and check the quantity is 20');
            api
                .set('Accept', 'application/json')
                .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "' + result.body.nonAtomicActivitiesList[0].entityId + '"}}&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        return done(err);
                    } else {
                        expect(res.body[0].state.stateObj.quantity).to.be.equal(20);
                        expect(res.body[0].id).to.be.equal(result.body.nonAtomicActivitiesList[0].entityId);
                        return done();
                    }
                });
        }

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
                log.info('deleted alltest transfers');
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