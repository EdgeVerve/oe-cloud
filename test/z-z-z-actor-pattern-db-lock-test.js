/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.

The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries.
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/
/* This is a collection of tests that make sure that the actor-pattern model and its' functions work when db lock mode is on.
 *
 * @author Karin Angel
 */
var loopback = require('loopback');
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var uuid = require('node-uuid');
var chai = require('chai');
var expect = chai.expect;
var logger = require('oe-logger');
var log = logger('actor-pattern-db-lock-tests');
var api = bootstrap.api;
var async = require('async');

var accessToken;

function apiRequest(url, postData, callback, done) {
    var version = uuid.v4();
    postData._version = version;
    api
        .set('Accept', 'application/json')
        .set('x-evproxy-db-lock', '1')
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

describe(chalk.blue('actor-pattern-db-lock-test'), function() {
    this.timeout(30000);

    before('login using admin', function fnLogin(done) {
        var sendData = {
            'username': 'admin',
            'password': 'admin'
        };

        api
            .set('x-evproxy-db-lock', '1')
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
                    stateObj.quantity += message.payload.value;
                } else if (message.instructionType === 'DEBIT') {
                    stateObj.quantity -= message.payload.value;
                }
                return stateObj;
            };

            accountDefinition.prototype.associatedModels = ['TestTransfer'];
            return done();
        }
    });

    it('should create an account and deposit 20 into the account', function(done) {

        apiRequest('/TestAccounts/', {'qqq': 0, 'stateObj': {'quantity': 0}}, postTransaction, done);

        function postTransaction(result) {
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

        function finishTestAndCheck(result) {
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
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


    it('should create 3 accounts deposit 20 into all of them', function(done) {
        var actors = [{}, {}, {}];

        async.each(actors, createActor, continueLogic);

        function createActor(actor, cb) {
            apiRequest(
                '/TestAccounts/',
                {'qqq': 0, 'stateObj': {'quantity': 0}},
                function(result) {
                    actor.result = result;
                    return cb();
                },
                done
            );
        }

        function continueLogic() {
            var postData =
                [{
                    'nonAtomicActivitiesList': [
                        {
                            'entityId': actors[0].result.body.id,
                            'payload': {'value': 20},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        }
                    ]
                },
                {
                    'nonAtomicActivitiesList': [
                        {
                            'entityId': actors[1].result.body.id,
                            'payload': {'value': 20},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        }
                    ]
                },
                {
                    'nonAtomicActivitiesList': [
                        {
                            'entityId': actors[2].result.body.id,
                            'payload': {'value': 20},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        }
                    ]
                }];

            apiRequest('/TestTransfers/', postData, finishTestAndCheck, done);
        }

        function finishTestAndCheck(result) {
            async.each(actors, getActorAndCheck, continueLogicSecond);
        }

        function getActorAndCheck(actor, cb) {
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "' + actor.result.body.id + '"}}&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        return cb(err);
                    } else {
                        expect(res.body[0].state.stateObj.quantity).to.be.equal(20);
                        expect(res.body[0].id).to.be.equal(actor.result.body.id);
                        return cb();
                    }
                });
        }

        function continueLogicSecond(err) {
            if (err) {
                return done(err);
            } else {
                return done();
            }
        }
    });

    it('should fail to debit from a new account', function(done) {
        apiRequest('/TestAccounts/', {'qqq': 0, 'stateObj': {'quantity': 0}}, postTransaction, done);

        function postTransaction(result) {
            var postData =
                {
                    'atomicActivitiesList': [
                        {
                            'entityId': result.body.id,
                            'payload': {'value': 20},
                            'modelName': 'TestAccount',
                            'instructionType': 'DEBIT'
                        }
                    ]
                };

            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .post(bootstrap.basePath + '/TestTransfers/?access_token=' + accessToken)
                .send(postData)
                .expect(500).end(function(err, res) {
                    if (err) {
                        log.error(err);
                    } else {
                        log.debug(log.defaultContext(), 'the debit succeeded, altough it should not!');
                    }
                    return done();
                });
        }

    });

    it('should credit an account 20 and then debit the same account 10', function(done) {
        apiRequest('/TestAccounts/', {'qqq': 0, 'stateObj': {'quantity': 0}}, postTransaction, done);

        function postTransaction(result) {
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

            apiRequest('/TestTransfers/', postData, midTestCheck, done);
        }

        function midTestCheck(result) {
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .get(bootstrap.basePath + '/TestAccounts?filter={"where": {"id": "' + result.body.nonAtomicActivitiesList[0].entityId + '"}}&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        return done(err);
                    } else {
                        expect(res.body[0].state.stateObj.quantity).to.be.equal(20);
                        expect(res.body[0].id).to.be.equal(result.body.nonAtomicActivitiesList[0].entityId);
                        return debitAccount(res);
                    }
                });
        }

        function debitAccount(result) {
            var postData =
                {
                    'atomicActivitiesList': [
                        {
                            'entityId': result.body[0].id,
                            'payload': {'value': 10},
                            'modelName': 'TestAccount',
                            'instructionType': 'DEBIT'
                        }
                    ]
                };

            apiRequest('/TestTransfers/', postData, finalCheck, done);
        }

        function finalCheck(result) {
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "' + result.body.atomicActivitiesList[0].entityId + '"}}&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        return done(err);
                    } else {
                        expect(res.body[0].state.stateObj.quantity).to.be.equal(10);
                        expect(res.body[0].id).to.be.equal(result.body.atomicActivitiesList[0].entityId);
                        return done();
                    }
                });
        }
    });

    it('should credit an account 20 and then debit the same account 10 and then debit it 20 and fail', function(done) {
        apiRequest('/TestAccounts/', {'qqq': 0, 'stateObj': {'quantity': 0}}, postTransaction, done);
        function postTransaction(result) {
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

            apiRequest('/TestTransfers/', postData, midTestCheck, done);
        }

        function midTestCheck(result) {
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "' + result.body.nonAtomicActivitiesList[0].entityId + '"}}&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        return done(err);
                    } else {
                        expect(res.body[0].state.stateObj.quantity).to.be.equal(20);
                        expect(res.body[0].id).to.be.equal(result.body.nonAtomicActivitiesList[0].entityId);
                        return debitAccount(res);
                    }
                });
        }

        function debitAccount(result) {
            var postData =
                {
                    'atomicActivitiesList': [
                        {
                            'entityId': result.body[0].id,
                            'payload': {'value': 10},
                            'modelName': 'TestAccount',
                            'instructionType': 'DEBIT'
                        }
                    ]
                };

            apiRequest('/TestTransfers/', postData, secondCheck, done);
        }

        function secondCheck(result) {
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "' + result.body.atomicActivitiesList[0].entityId + '"}}&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        return done(err);
                    } else {
                        expect(res.body[0].state.stateObj.quantity).to.be.equal(10);
                        expect(res.body[0].id).to.be.equal(result.body.atomicActivitiesList[0].entityId);
                        return debitAndFail(res);
                    }
                });
        }

        function debitAndFail(result) {
            var postData =
                {
                    'atomicActivitiesList': [
                        {
                            'entityId': result.body[0].id,
                            'payload': {'value': 20},
                            'modelName': 'TestAccount',
                            'instructionType': 'DEBIT'
                        }
                    ]
                };

            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .post(bootstrap.basePath + '/TestTransfers/?access_token=' + accessToken)
                .send(postData)
                .expect(500).end(function(err, res) {
                    if (err) {
                        log.error(err);
                    } else {
                        log.debug(log.defaultContext(), 'the debit succeeded, altough it should not!');
                    }
                    return done();
                });
        }
    });

    it('should credit an account in parallel', function(done) {
        apiRequest('/TestAccounts/', {'id': 'TestAccount216', 'stateObj': {'quantity': 0}}, creditParallel, done);

        function creditParallel() {
            var functionArray = [];
            var postData =
                {
                    'nonAtomicActivitiesList': [
                        {
                            'entityId': 'TestAccount216',
                            'payload': {'value': 1},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        }
                    ]
                };

            function creditFactory() {
                return function creditOne(callback) {
                    apiRequest('/TestTransfers/', postData, function(data) {
                        callback(null, data);
                    }, done);
                };
            }

            for (var i = 0; i < 3; i++) {
                functionArray.push(creditFactory());
            }
            async.parallel(functionArray, finalCheck);
        }

        function finalCheck(err) {
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "TestAccount216"}}&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        done(err);
                    } else {
                        expect(res.body[0].state.stateObj.quantity).to.be.equal(3);
                        done();
                    }
                });
        }
    });

    it('should debit an account in parallel', function(done) {
        apiRequest('/TestAccounts/', {'id': 'TestAccount17', 'stateObj': {'quantity': 0}}, creditAccount, done);

        function creditAccount() {
            var postData =
                {
                    'nonAtomicActivitiesList': [
                        {
                            'entityId': 'TestAccount17',
                            'payload': {'value': 10},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        }
                    ]
                };
            apiRequest('/TestTransfers/', postData, debitParallel, done);
        }

        function debitParallel() {
            var functionArray = [];
            var postData =
                {
                    'atomicActivitiesList': [
                        {
                            'entityId': 'TestAccount17',
                            'payload': {'value': 1},
                            'modelName': 'TestAccount',
                            'instructionType': 'DEBIT'
                        }
                    ]
                };

            function debitFactory() {
                return function debitOne(callback) {
                    apiRequest('/TestTransfers/', postData, function(data) {
                        callback(null, data);
                    }, done);
                };
            }

            for (var i = 0; i < 3; i++) {
                functionArray.push(debitFactory());
            }
            async.parallel(functionArray, finalCheck);
        }

        function finalCheck() {
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "TestAccount17"}}&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        done(err);
                    } else {
                        expect(res.body[0].state.stateObj.quantity).to.be.equal(7);
                        done();
                    }
                });
        }
    });

    it('should debit an account in parallel and then fail', function(done) {
        apiRequest('/TestAccounts/', {'id': 'TestAccount18', 'stateObj': {'quantity': 0}}, creditAccount, done);

        function creditAccount() {
            var postData =
                {
                    'nonAtomicActivitiesList': [
                        {
                            'entityId': 'TestAccount18',
                            'payload': {'value': 10},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        }
                    ]
                };
            apiRequest('/TestTransfers/', postData, debitParallel, done);
        }

        function debitParallel() {
            var functionArray = [];
            var postData =
                {
                    'atomicActivitiesList': [
                        {
                            'entityId': 'TestAccount18',
                            'payload': {'value': 1},
                            'modelName': 'TestAccount',
                            'instructionType': 'DEBIT'
                        }
                    ]
                };

            function debitFactory() {
                return function debitOne(callback) {
                    apiRequest('/TestTransfers/', postData, function(data) {
                        callback(null, data);
                    }, done);
                };
            }

            for (var i = 0; i < 10; i++) {
                functionArray.push(debitFactory());
            }
            async.parallel(functionArray, firstCheck);
        }

        function firstCheck() {
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "TestAccount18"}}&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        done(err);
                    } else {
                        expect(res.body[0].state.stateObj.quantity).to.be.equal(0);
                        return tryToDebitAndFail();
                    }
                });
        }

        function tryToDebitAndFail() {
            var postData =
                {
                    'atomicActivitiesList': [
                        {
                            'entityId': 'TestAccount18',
                            'payload': {'value': 1},
                            'modelName': 'TestAccount',
                            'instructionType': 'DEBIT'
                        }
                    ]
                };

            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .post(bootstrap.basePath + '/TestTransfers/?access_token=' + accessToken)
                .send(postData)
                .expect(500).end(function(err, res) {
                    return done();
                });
        }
    });

    it('should debit and credit an account in parallel', function(done) {
        apiRequest('/TestAccounts/', {'id': 'TestAccount19', 'stateObj': {'quantity': 0}}, creditAccount, done);
        function creditAccount() {
            var postData =
                {
                    'nonAtomicActivitiesList': [
                        {
                            'entityId': 'TestAccount19',
                            'payload': {'value': 10},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        }
                    ]
                };
            apiRequest('/TestTransfers/', postData, debitParallel, done);
        }

        function debitParallel() {
            var functionArray = [];
            var postDataDebit =
                {
                    'atomicActivitiesList': [
                        {
                            'entityId': 'TestAccount19',
                            'payload': {'value': 1},
                            'modelName': 'TestAccount',
                            'instructionType': 'DEBIT'
                        }
                    ]
                };

            var postDataCredit =
                {
                    'nonAtomicActivitiesList': [
                        {
                            'entityId': 'TestAccount19',
                            'payload': {'value': 1},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        }
                    ]
                };

            function debitFactory() {
                return function debitOne(callback) {
                    apiRequest('/TestTransfers/', postDataDebit, function(data) {
                        callback(null, data);
                    }, done);
                };
            }

            function creditFactory() {
                return function creditOne(callback) {
                    apiRequest('/TestTransfers/', postDataCredit, function(data) {
                        callback(null, data);
                    }, done);
                };
            }

            for (var i = 0; i < 10; i++) {
                functionArray.push(debitFactory());
            }
            functionArray.push(creditFactory());

            async.parallel(functionArray, finalCheck);
        }

        function finalCheck() {
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "TestAccount19"}}&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        done(err);
                    } else {
                        expect(res.body[0].state.stateObj.quantity).to.be.equal(1);
                        done();
                    }
                });
        }
    });

    it('should create 3 accounts and then deposit 10 in all of them', function(done) {
        var actors = [{}, {}, {}];

        async.each(actors, createActor, continueLogic);

        function createActor(actor, cb) {
            apiRequest(
                '/TestAccounts/',
                {'qqq': 0, 'stateObj': {'quantity': 0}},
                function(result) {
                    actor.result = result;
                    return cb();
                },
                done
            );
        }

        function continueLogic() {
            var postData =
                {
                    'nonAtomicActivitiesList': [
                        {
                            'entityId': actors[0].result.body.id,
                            'payload': {'value': 10},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        },
                        {
                            'entityId': actors[1].result.body.id,
                            'payload': {'value': 10},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        },
                        {
                            'entityId': actors[2].result.body.id,
                            'payload': {'value': 5},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        },
                        {
                            'entityId': actors[2].result.body.id,
                            'payload': {'value': 5},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        },
                    ]
                };

            apiRequest('/TestTransfers/', postData, finishTestAndCheck, done);
        }

        function finishTestAndCheck(result) {
            async.each(actors, getActorAndCheck, continueLogicSecond);
        }

        function getActorAndCheck(actor, cb) {
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "' + actor.result.body.id + '"}}&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        return cb(err);
                    } else {
                        expect(res.body[0].state.stateObj.quantity).to.be.equal(10);
                        expect(res.body[0].id).to.be.equal(actor.result.body.id);
                        return cb();
                    }
                });

        }

        function continueLogicSecond(err) {
            if (err) {
                log.error(err);
                return done(err);
            } else {
                return done();
            }
        }
    });

    it('should create 3 accounts and then deposit 10 in all of them and then withdraw 5 from all of them', function(done) {
        var actors = [{}, {}, {}];

        async.each(actors, createActor, continueLogic);

        function createActor(actor, cb) {
            apiRequest(
                '/TestAccounts/',
                {'qqq': 0, 'stateObj': {'quantity': 0}},
                function(result) {
                    actor.result = result;
                    return cb();
                },
                done
            );
        }

        function continueLogic() {
            var postData =
                {
                    'nonAtomicActivitiesList': [
                        {
                            'entityId': actors[0].result.body.id,
                            'payload': {'value': 10},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        },
                        {
                            'entityId': actors[1].result.body.id,
                            'payload': {'value': 10},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        },
                        {
                            'entityId': actors[2].result.body.id,
                            'payload': {'value': 10},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        }
                    ]
                };

            apiRequest('/TestTransfers/', postData, midCheck, done);
        }

        function midCheck(result) {
            async.each(actors, getActorAndmidCheck, continueLogicSecond);
        }

        function getActorAndmidCheck(actor, cb) {
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "' + actor.result.body.id + '"}}&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        return cb(err);
                    } else {
                        expect(res.body[0].state.stateObj.quantity).to.be.equal(10);
                        expect(res.body[0].id).to.be.equal(actor.result.body.id);
                        return cb();
                    }
                });
        }

        function continueLogicSecond(err) {
            if (err) {
                log.error(err);
                return done(err);
            } else {
                debitAccount();
            }
        }


        function debitAccount() {
            var postData =
                {
                    'atomicActivitiesList': [
                        {
                            'entityId': actors[0].result.body.id,
                            'payload': {'value': 5},
                            'modelName': 'TestAccount',
                            'instructionType': 'DEBIT'
                        },
                        {
                            'entityId': actors[1].result.body.id,
                            'payload': {'value': 5},
                            'modelName': 'TestAccount',
                            'instructionType': 'DEBIT'
                        },
                        {
                            'entityId': actors[2].result.body.id,
                            'payload': {'value': 5},
                            'modelName': 'TestAccount',
                            'instructionType': 'DEBIT'
                        },
                    ]
                };

            apiRequest('/TestTransfers/', postData, finalCheck, done);
        }

        function finalCheck(result) {
            async.each(actors, getActorsAndFinalCheck, continueLogicThird);
        }

        function getActorsAndFinalCheck(actor, cb) {
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "' + actor.result.body.id + '"}}&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        return cb(err);
                    } else {
                        expect(res.body[0].state.stateObj.quantity).to.be.equal(5);
                        expect(res.body[0].id).to.be.equal(actor.result.body.id);
                        return cb();
                    }
                });
        }

        function continueLogicThird(err) {
            if (err) {
                log.error(err);
                return done(err);
            } else {
                return done();
            }
        }
    });

    it('should not be able to modify a transaction', function(done) {

        apiRequest('/TestAccounts/', {'qqq': 0, 'stateObj': {'quantity': 0}}, postTransaction, done);

        function postTransaction(result) {
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

            apiRequest('/TestTransfers/', postData, modifyTrans, done);
        }

        function modifyTrans(result) {
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
            postData._version = result.body._version;
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .put(bootstrap.basePath + '/TestTransfers/' + result.body.id  + '?access_token=' + accessToken)
                .send(postData)
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        return done(err);
                    } else {
                        expect(res.body.error.message).to.be.equal('Cannot update existing journal entry');
                        return done();
                    }
                });
        }
    });

    it('should delete an account ', function(done) {
        var postData = {
            id: 'TestAccount116',
            'qqq': 0,
            'stateObj': {
                'quantity': 0
            }
        };
        var version;
        api
            .set('Accept', 'application/json')
            .set('x-evproxy-db-lock', '1')
            .post(bootstrap.basePath + '/TestAccounts/' + '?access_token=' + accessToken)
            .send(postData)
            .end(function(err, res) {
                if (err || res.body.error) {
                    return done(err || (new Error(JSON.stringify(res.body.error))));
                } else {
                    version = res.body._version;
                    return postTransaction();
                }
            });

        function postTransaction() {
            var postData =
                {
                    'nonAtomicActivitiesList': [
                        {
                            'entityId': 'TestAccount116',
                            'payload': {'value': 20},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        }
                    ]
                };

            apiRequest('/TestTransfers/', postData, deleteAccount, done);
        }

        function deleteAccount() {
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .delete(bootstrap.basePath + '/TestAccounts/TestAccount116/' + version + '?access_token=' + accessToken)
                .end(function(err, res) {
                    if (err || res.body.error) {
                        return done(err || (new Error(JSON.stringify(res.body.error))));
                    } else {
                        return finishTestAndCheck();
                    }
                });
        }

        function finishTestAndCheck() {
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "' + postData.entityId + '"}}&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        return done(err);
                    } else {
                        expect(res.body.length).to.be.equal(0);
                        return done();
                    }
                });
        }
    });

    it('should create 10 accounts in parallel. Then credit them with 1000 in parallel. Then debit 3*10 from all of them in parallel', function(done) {

        var ids = [];
        ids.push('a1');
        ids.push('b1');
        ids.push('c1');
        ids.push('d1');
        ids.push('e1');
        ids.push('f1');
        ids.push('g1');
        ids.push('h1');
        ids.push('i1');
        //ids.push('j1');

        var createData = {
            stateObj: {quantity: 0}
        };
        var functionArray = [];

        function actorFactory(id) {
            return function createOne(callback) {
                createData.id = id;
                apiRequest('/TestAccounts/', createData, function(data) {
                    callback(null, data);
                }, done);
            };
        }

        ids.forEach(function(id) {
            functionArray.push(actorFactory(id));
        });

        async.parallel(functionArray, addInitialBudjet);

        function addInitialBudjet() {
            var addBudjetData = {
                'payload': {'value': 1000},
                'modelName': 'TestAccount',
                'instructionType': 'CREDIT'
            };

            var addTrans = {};
            addTrans.nonAtomicActivitiesList = [];

            ids.forEach(function(id) {
                var activity = JSON.parse(JSON.stringify(addBudjetData));
                activity.entityId = id;
                addTrans.nonAtomicActivitiesList.push(activity);
            });

            apiRequest('/TestTransfers/', addTrans, midCheck, done);
        }

        function midCheck() {
            async.each(ids, getActorsAndMidCheck, continueMidLogic);
        }

        function getActorsAndMidCheck(id, cb) {
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "' + id + '"}}&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        return cb(err);
                    } else {
                        expect(res.body[0].state.stateObj.quantity).to.be.equal(1000);
                        expect(res.body[0].id).to.be.equal(id);
                        return cb();
                    }
                });
        }

        function continueMidLogic(err) {
            if (err) {
                log.error(err);
                return done(err);
            } else {
                atomicTransactions();
            }
        }

        function atomicTransactions() {
            var debitData = {
                'payload': {'value': 3},
                'modelName': 'TestAccount',
                'instructionType': 'DEBIT'
            };

            var reduceTrans = {};
            reduceTrans.atomicActivitiesList = [];

            ids.forEach(function(id) {
                var activity = JSON.parse(JSON.stringify(debitData));
                activity.entityId = id;
                reduceTrans.atomicActivitiesList.push(activity);
            });

            var functionArray = [];

            function debitFactory() {
                return function debitAll(callback) {
                    apiRequest('/TestTransfers/', reduceTrans, function(data) {
                        callback(null, data);
                    }, done);
                };
            }

            for (var y = 0; y < 10; y++) {
                functionArray.push(debitFactory());
            }

            async.parallel(functionArray, finalCheck);
        }

        function finalCheck() {
            async.each(ids, getActorsAndFinalCheck, continueFinalLogic);
        }

        function getActorsAndFinalCheck(id, cb) {
            api
                .set('Accept', 'application/json')
                .set('x-evproxy-db-lock', '1')
                .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "' + id + '"}}&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        return cb(err);
                    } else {
                        expect(res.body[0].state.stateObj.quantity).to.be.equal(970);
                        expect(res.body[0].id).to.be.equal(id);
                        return cb();
                    }
                });
        }

        function continueFinalLogic(err) {
            if (err) {
                log.error(err);
                return done(err);
            } else {
                return done();
            }
        }
    });

    var deleteContext = {fetchAllScopes: true, ctx: {tenantId: 'test-tenant'}};

    after('delete all the test accounts', function(done) {
        var testAccount = loopback.getModel('TestAccount');
        testAccount.destroyAll({}, deleteContext, function(err) {
            if (err) {
                log.error(err);
                console.log('unable to delete all the TestAccount models');
                return done(err);
            } else {
                log.debug('deleted alltest accounts');
                return done();
            }
        });
    });

    after('delete all the test transfers', function(done) {
        var testTransfer = loopback.getModel('TestTransfer');
        testTransfer.destroyAll({}, deleteContext, function(err) {
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
                console.log('unable to delete all the TestState models');
                return done(err);
            } else {
                log.debug('deleted alltest states');
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
