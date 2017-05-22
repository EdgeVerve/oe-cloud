/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

/* This is a collection of tests that make sure that the business validations extension point of actor pattern work.
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
var log = logger('business-validations-test');

var api = bootstrap.api;

var accessToken;

function apiRequest(url, postData, callback, done) {
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

function doSynchronousActions() {
    var count = 100000000;
    while (count > 0) {
        count--;
    }
    return;
}

function doAsynchronousActions(cb) {
    api
        .set('Accept', 'application/json')
        .get(bootstrap.basePath + '/BaseRoles/' + '?access_token=' + accessToken)
        .end(function(err, res) {
            if (err || res.body.error) {
                log.error(log.defaultContext(), err.message || JSON.stringify(res.body.error));
                cb(err || (new Error(JSON.stringify(res.body.error))));
            } else {
                cb();
            }
        });
}

function doAsynchronousActionsFail(cb) {
    api
        .set('Accept', 'application/json')
        .get(bootstrap.basePath + '/BaseRoles/' + '?access_token=' + accessToken)
        .end(function(err, res) {
            log.error(log.defaultContext(), 'failing IO on purpose');
            cb(new Error('failing IO on purpose'));
        });
}

describe(chalk.blue('business-validations-tests'), function() {
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


    it('trivial bussiness validation + atomic action pass --> transaction should pass', function(done) {

        var transferDefinition = loopback.getModel('TestTransfer');
        transferDefinition.prototype.performBusinessValidations = function(cb) {
            log.info(log.defaultContext(), 'trivial implementation');
            cb();
        };

        //credit an account 20 and then debit the same account 10
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

            apiRequest('/TestTransfers/', postData, finalCheck, done);
        }

        function finalCheck(result) {
            api
                .set('Accept', 'application/json')
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

    it('trivial bussiness validation + atomic action fails --> transaction should fail', function(done) {

        var transferDefinition = loopback.getModel('TestTransfer');
        transferDefinition.prototype.performBusinessValidations = function(cb) {
            log.info(log.defaultContext(), 'trivial implementation');
            cb();
        };

        //fail to debit from a new account
        apiRequest('/TestAccounts/', {'qqq': 0, 'stateObj': {'quantity': 0}}, postTransaction, done);

        function postTransaction(result) {
            var version = uuid.v4();
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
            postData._version = version;
            api
                .set('Accept', 'application/json')
                .post(bootstrap.basePath + '/TestTransfers/?access_token=' + accessToken)
                .send(postData)
                .expect(500).end(function(err, res) {
                    log.error(err);
                    return done();
                });
        }
    });

    it('synchronous bussiness validation pass + atomic action pass --> transaction should pass', function(done) {
        var transferDefinition = loopback.getModel('TestTransfer');

        transferDefinition.prototype.performBusinessValidations = function(cb) {
            log.info(log.defaultContext(), 'synchronous implementation');
            doSynchronousActions();
            cb();
        };

        //credit an account 20 and then debit the same account 10
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

            apiRequest('/TestTransfers/', postData, midWait, done);
        }

        function midWait(result) {
            setTimeout(midTestCheck, 3000, result);
        }

        function midTestCheck(result) {
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

    it('synchronous bussiness validation pass + atomic action fails --> transaction should fail', function(done) {
        var transferDefinition = loopback.getModel('TestTransfer');
        transferDefinition.prototype.performBusinessValidations = function(cb) {
            log.info(log.defaultContext(), 'synchronous implementation');
            doSynchronousActions();
            cb();
        };

        //fail to debit from a new account
        apiRequest('/TestAccounts/', {'qqq': 0, 'stateObj': {'quantity': 0}}, postTransaction, done);

        function postTransaction(result) {
            var version = uuid.v4();
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
            postData._version = version;
            api
                .set('Accept', 'application/json')
                .post(bootstrap.basePath + '/TestTransfers/?access_token=' + accessToken)
                .send(postData)
                .expect(500).end(function(err, res) {
                    log.error(err);
                    return done();
                });
        }
    });

    it('synchronous bussiness validation fails + atomic action should pass but does not start --> transaction should fail', function(done) {
        var transferDefinition = loopback.getModel('TestTransfer');
        transferDefinition.prototype.performBusinessValidations = function(cb) {
            log.info(log.defaultContext(), 'synchronous implementation');
            doSynchronousActions();
            log.error(log.defaultContext(), 'failing synchronous actions on purpose');
            cb(new Error('failing synchronous actions on purpose'));
        };

        //debit the account 0
        apiRequest('/TestAccounts/', {'qqq': 0, 'stateObj': {'quantity': 0}}, postTransaction, done);

        function postTransaction(result) {
            var version = uuid.v4();
            var postData =
                {
                    'atomicActivitiesList': [
                        {
                            'entityId': result.body.id,
                            'payload': {'value': 0},
                            'modelName': 'TestAccount',
                            'instructionType': 'DEBIT'
                        }
                    ]
                };
            postData._version = version;
            api
                 .set('Accept', 'application/json')
                 .post(bootstrap.basePath + '/TestTransfers/?access_token=' + accessToken)
                 .send(postData)
                 .expect(500).end(function(err, res) {
                        log.error(err);
                        return done();
                    });
        }
    });

    it('synchronous bussiness validation fails + atomic action should fail but does not start --> transaction should fail', function(done) {
        var transferDefinition = loopback.getModel('TestTransfer');
        transferDefinition.prototype.performBusinessValidations = function(cb) {
            log.info(log.defaultContext(), 'synchronous implementation');
            doSynchronousActions();
            log.error(log.defaultContext(), 'failing synchronous actions on purpose');
            cb(new Error('failing sync actions on purpose'));
        };

        //fail to debit from a new account
        apiRequest('/TestAccounts/', {'qqq': 0, 'stateObj': {'quantity': 0}}, postTransaction, done);

        function postTransaction(result) {
            var version = uuid.v4();
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
            postData._version = version;
            api
                .set('Accept', 'application/json')
                .post(bootstrap.basePath + '/TestTransfers/?access_token=' + accessToken)
                .send(postData)
                .expect(500).end(function(err, res) {
                    log.error(err);
                    return done();
                });
        }
    });

    it('asynchronous bussiness validation pass + atomic action pass --> transaction should pass', function(done) {
        var transferDefinition = loopback.getModel('TestTransfer');
        transferDefinition.prototype.performBusinessValidations = function(cb) {
            log.info(log.defaultContext(), 'asynchronous implementation');
            doAsynchronousActions(cb);
        };

        //credit an account 20 and then debit the same account 10
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

            apiRequest('/TestTransfers/', postData, finalCheck, done);
        }

        function finalCheck(result) {
            api
                .set('Accept', 'application/json')
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

    it('asynchronous bussiness validation pass + atomic action fails --> transaction should fail', function(done) {
        var transferDefinition = loopback.getModel('TestTransfer');
        transferDefinition.prototype.performBusinessValidations = function(cb) {
            log.info(log.defaultContext(), 'asynchronous implementation');
            doAsynchronousActions(cb);
        };

        //fail to debit from a new account
        apiRequest('/TestAccounts/', {'qqq': 0, 'stateObj': {'quantity': 0}}, postTransaction, done);

        function postTransaction(result) {
            var version = uuid.v4();
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
            postData._version = version;
            api
                .set('Accept', 'application/json')
                .post(bootstrap.basePath + '/TestTransfers/?access_token=' + accessToken)
                .send(postData)
                .expect(500).end(function(err, res) {
                    log.error(err);
                    return done();
                });
        }
    });

    it('asynchronous bussiness validation fails + atomic action should pass but does not start --> transaction should fail', function(done) {
        var transferDefinition = loopback.getModel('TestTransfer');
        transferDefinition.prototype.performBusinessValidations = function(cb) {
            log.info(log.defaultContext(), 'asynchronous implementation');
            doAsynchronousActionsFail(cb);
        };

        //debit an account 0
        apiRequest('/TestAccounts/', {'qqq': 0, 'stateObj': {'quantity': 0}}, postTransaction, done);

        function postTransaction(result) {
            var version = uuid.v4();
            var postData =
                {
                    'atomicActivitiesList': [
                        {
                            'entityId': result.body.id,
                            'payload': {'value': 0},
                            'modelName': 'TestAccount',
                            'instructionType': 'DEBIT'
                        }
                    ]
                };
            postData._version = version;
            api
                 .set('Accept', 'application/json')
                 .post(bootstrap.basePath + '/TestTransfers/?access_token=' + accessToken)
                 .send(postData)
                 .expect(500).end(function(err, res) {
                        log.error(err);
                        return done();
                    });
        }
    });

    it('asynchronous bussiness validation fails + atomic action should fails but does not start --> transaction should fail', function(done) {
        var transferDefinition = loopback.getModel('TestTransfer');
        transferDefinition.prototype.performBusinessValidations = function(cb) {
            log.info(log.defaultContext(), 'asynchronous implementation');
            doAsynchronousActionsFail(cb);
        };

        //fail to debit from a new account
        apiRequest('/TestAccounts/', {'qqq': 0, 'stateObj': {'quantity': 0}}, postTransaction, done);

        function postTransaction(result) {
            var version = uuid.v4();
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
            postData._version = version;
            api
                .set('Accept', 'application/json')
                .post(bootstrap.basePath + '/TestTransfers/?access_token=' + accessToken)
                .send(postData)
                .expect(500).end(function(err, res) {
                    log.error(err);
                    return done();
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
        testTransfer.destroyAll({}, deleteContext, function(err) {
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
