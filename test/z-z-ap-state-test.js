/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

/* This is a collection of tests that make sure that the actor-pattern model and its' functions work.
 *
 * @author Ori Press
 */
var loopback = require('loopback');
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var uuid = require('node-uuid');
var chai = require('chai');
var expect = chai.expect;
var models = bootstrap.models;

//var loggerModule = require('../lib/logger');
var api = bootstrap.api;
var app = bootstrap.app;

var accessToken;
var memorypool = require('./../lib/actor-pool.js');

var MAX_RETRY = 25;

function apiRequest(url, postData, callback, done){
    var version = uuid.v4();
    postData._version = version;
    api
        .set('Accept', 'application/json')
        .post(bootstrap.basePath + url + '?access_token=' + accessToken)
        .send(postData)
        .end(function(err, res) {
            if (err || res.body.error) {
                return done(err || (new Error(JSON.stringify(res.body.error))));
            } else {
                return callback(res);
            }
        });
}

function checkBalance(modelName, id, callback) {
    var postData = {};

    postData.modelName = modelName;
    postData.id = id;
    var params = 'params=' + JSON.stringify(postData);
    return memoryChecker(0, params, callback);
}

function memoryChecker(count, params, callback) {
    if (count === MAX_RETRY) {
        return callback(new Error('Reached max retry'));
    }
    api
        .set('Accept', 'application/json')
        .set('Actor-Internal', 'getBalanceFromMemory')
        .post(bootstrap.basePath + '/BaseActorEntities/getBalanceFromMemory' + '?access_token=' + accessToken)
        .send(params)
        .end(function(err, res) {
            if (err) {
                return callback(new Error(err));
            } else if (res.body.error) {
                return callback(new Error(JSON.stringify(res.body.error)));
            } else {
                if (res.body.messages === 0 && res.body.isDirty === false) {
                    return callback(null, res.body.balance);
                } else {
                    return setTimeout(function() {memoryChecker(count + 1, params, callback);}, 500);
                 }
            }
        });
}


describe(chalk.blue('actor-state-test'), function() {
    this.timeout(30000);
    before('init memory pool', function initMemoryPool(done) {
        app.set('memoryInterval', 50);
        memorypool.initPool(app);
        return done();
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
                    return done(err);
                } else {
                    //console.log('access token is ', res.body.id);
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
                'name': 'TestTransferState',
                'base': 'BaseJournalEntity'
            };
            modelDefinition.create(data, bootstrap.defaultContext, addAllFunctions);
        }

        function addAllFunctions() {

            var transferDefinition = loopback.getModel('TestTransferState');
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
                    //var msg = 'TestAccount ' + this.id + ' - Atomic DEBIT, Balance ' + (quantity - value);
                    //console.log(msg);
                    stateObj.quantity = stateObj.quantity - activity.payload.value;
                    return stateObj;
                }
            };

            accountDefinition.prototype.nonAtomicInstructions = function(stateObj, activity) {
                if (activity.instructionType === 'CREDIT') {
                    //console.log('TestAccount ' + this.id + ' - NonAtomic CREDIT, Balance ' + (quantity + activity.value));
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

            accountDefinition.prototype.associatedModels = ['TestTransferState'];
            return done();
        }

    });


    it('make sure state is not rest enabled', function(done) {
        return apiRequest('/TestAccounts/', {'id': 'TestAccount12','stateObj': {'quantity': 0}}, checkState, done);

        function checkState(result) {

            api
                .set('Accept', 'application/json')
                .get(bootstrap.basePath + '/State/' + result.body.id  + '&access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        return done(err);
                    } else {
                        expect(res.body.error.message).to.contain('There is no method to handle GET /State');
                        return done();
                    }
                });
        }
    });

    xit('should create and account deposit 20 into one account and make sure that the state is updated correctly', function(done) {
        apiRequest('/TestAccounts/', [{'id': 'TestAccount13','stateObj': {'quantity': 0}}], postTransaction, done);

        function postTransaction(result){
            var postData =
                {
                    'nonAtomicActivitiesList': [
                        {
                            'entityId': 'TestAccount13',
                            'payload': {'value': 20},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        }
                    ]
                };

            apiRequest('/TestTransferStates/', postData, firstCheck, done);
        }

        function firstCheck() {
            checkBalance('TestAccount', 'TestAccount13', function(err, balance) {
                if (err) {
                    return done(new Error(err));
                } else {
                    expect(balance).to.be.equal(20);
                    return checkState();
                }
            });
        }

        function checkState() {
            var state = loopback.getModel('State');
            state.find({where: {'actorId': 'TestAccount13'}}, bootstrap.defaultContext, function(err, instance) {
                if (err) {
                    return done(new Error(err));
                }
                if (!(instance && instance.length === 1)) {
                    return done(new Error('Couldnt find TestAccount13\'s state model'));
                } else {
                    var stateInstance = instance[0];
                    expect(stateInstance.stateObj.quantity).to.be.equal(20);
                    return done();
                }
            });
        }
    });

    xit('should create and account deposit 20 and then withdraw 10 and make sure that the state is updated correctly', function(done) {
        apiRequest('/TestAccounts/', {'id': 'TestAccount14','stateObj': {'quantity': 0}}, postTransaction, done);

        function postTransaction(result){
            var postData =
                {
                    'nonAtomicActivitiesList': [
                        {
                            'entityId': 'TestAccount14',
                            'payload': {'value': 20},
                            'modelName': 'TestAccount',
                            'instructionType': 'CREDIT'
                        }
                    ]
                };
            apiRequest('/TestTransferStates/', postData, firstCheck, done);
        }

        function firstCheck() {
            checkBalance('TestAccount', 'TestAccount14', function(err, balance) {
                if (err) {
                    return done(new Error(err));
                } else {
                    expect(balance).to.be.equal(20);
                    return checkState();
                }
            });
        }

        function checkState() {
            var state = loopback.getModel('State');
            state.find({where: {'actorId': 'TestAccount14'}}, bootstrap.defaultContext, function(err, instance) {
                if (err) {
                    return done(new Error(err));
                }
                if (!(instance && instance.length === 1)) {
                    return done(new Error('Coudn\'t find TestAccount14\'s state model'));
                } else {
                    var stateInstance = instance[0];
                    expect(stateInstance.stateObj.quantity).to.be.equal(20);
                    return debitAccount();
                }
            });
        }

        function debitAccount() {
            var version = uuid.v4();
            var postData =
                {
                    '_version': version,
                    'atomicActivitiesList': [
                        {
                            'entityId': 'TestAccount14',
                            'payload': {'value': 10},
                            'modelName': 'TestAccount',
                            'instructionType': 'DEBIT'
                        }
                    ]
                };

            apiRequest('/TestTransferStates/', postData, secondCheck, done);
        }

        function secondCheck() {
            checkBalance('TestAccount', 'TestAccount14', function(err, balance){
                if (err) {
                    return done(new Error(err));
                } else {
                    expect(balance).to.be.equal(10);
                    return secondCheckState();
                }
            });
        }

        function secondCheckState() {
            var state = loopback.getModel('State');
            state.find({where: {'actorId': 'TestAccount14'}}, bootstrap.defaultContext, function(err, instance) {
                if (err) {
                    return done(new Error(err));
                }
                if (!(instance && instance.length === 1)) {
                    return done(new Error('Coudn\'t find TestAccount14\'s state model'));
                } else {
                    var stateInstance = instance[0];
                    expect(stateInstance.stateObj.quantity).to.be.equal(10);
                    return done();
                }

            });
        }
    });

    var deleteContext = {fetchAllScopes: true, ctx:{tenantId: 'test-tenant'}};

    after('delete all the test accounts', function(done) {
        var testAccount = loopback.getModel('TestAccount');
        testAccount.destroyAll({}, deleteContext, function(err) {
            if (err) {
                console.log('unable to delete all the TestAccount models');
                return done(err);
            }
            else{
                return done();
            }
        });
    });

    after('delete all the test accounts', function(done) {
        var testTransfer = loopback.getModel('TestTransferState');
        testTransfer.destroyAll({}, deleteContext, function(err) {
            if (err) {
                // There may be some other errors also
                // condition should be it should not pass
                //expect(err.message).to.be.equal('Cannot delete journal entry');
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
                console.log('unable to delete all the TestState models');
                return done();
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

    after('set memory pool interval long', function(done){
        app.set('memoryInterval', 100000);
        memorypool.initPool(app);
        return done();
    });
});
