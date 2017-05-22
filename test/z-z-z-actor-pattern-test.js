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
var logger = require('../lib/logger');
var log = logger('actor-pattern-tests');
var api = bootstrap.api;
var async = require('async');

var accessToken;

function apiRequest(url, postData, callback, done) {
  var version = uuid.v4();
  postData._version = version;
  api
    .set('Accept', 'application/json')
    .post(bootstrap.basePath + url + '?access_token=' + accessToken)
    .send(postData)
    .end(function (err, res) {
      if (err || res.body.error) {
        log.error(err || (new Error(JSON.stringify(res.body.error))));
        return done(err || (new Error(JSON.stringify(res.body.error))));
      } else {
        return callback(res);
      }
    });
}

describe(chalk.blue('actor-pattern-test'), function () {
  this.timeout(30000);

  before('login using admin', function fnLogin(done) {
    var sendData = {
      'username': 'admin',
      'password': 'admin'
    };

    api
      .post(bootstrap.basePath + '/BaseUsers/login')
      .send(sendData)
      .expect(200).end(function (err, res) {
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
      transferDefinition.prototype.performBusinessValidations = function (cb) {
        cb();
      };

      var accountDefinition = loopback.getModel('TestAccount');

      accountDefinition.prototype.atomicTypes = ['DEBIT'];
      accountDefinition.prototype.nonAtomicTypes = ['CREDIT'];

      accountDefinition.prototype.validateCondition = function (stateObj, activity) {
        if (activity.instructionType === 'DEBIT') {
          return stateObj.quantity >= activity.payload.value;
        }
      };

      accountDefinition.prototype.atomicInstructions = function (stateObj, activity) {
        if (activity.instructionType === 'DEBIT') {
          stateObj.quantity = stateObj.quantity - activity.payload.value;
          return stateObj;
        }
      };

      accountDefinition.prototype.nonAtomicInstructions = function (stateObj, activity) {
        if (activity.instructionType === 'CREDIT') {
          stateObj.quantity = stateObj.quantity + activity.payload.value;
          return stateObj;
        }
      };

      accountDefinition.prototype.processPendingMessage = function (message, stateObj) {
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

  it('should create an account and deposit 20 into the account', function (done) {

    apiRequest('/TestAccounts/', { 'qqq': 0, 'stateObj': { 'quantity': 0 } }, postTransaction, done);

    function postTransaction(result) {
      var postData =
        {
          'nonAtomicActivitiesList': [
            {
              'entityId': result.body.id,
              'payload': { 'value': 20 },
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


  it('should create 3 accounts deposit 20 into all of them', function (done) {
    var actors = [{}, {}, {}];

    async.each(actors, createActor, continueLogic);

    function createActor(actor, cb) {
      apiRequest(
        '/TestAccounts/',
        { 'qqq': 0, 'stateObj': { 'quantity': 0 } },
        function (result) {
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
              'payload': { 'value': 20 },
              'modelName': 'TestAccount',
              'instructionType': 'CREDIT'
            }
          ]
        },
          {
            'nonAtomicActivitiesList': [
              {
                'entityId': actors[1].result.body.id,
                'payload': { 'value': 20 },
                'modelName': 'TestAccount',
                'instructionType': 'CREDIT'
              }
            ]
          },
          {
            'nonAtomicActivitiesList': [
              {
                'entityId': actors[2].result.body.id,
                'payload': { 'value': 20 },
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

  it('should fail to debit from a new account', function (done) {
    apiRequest('/TestAccounts/', { 'qqq': 0, 'stateObj': { 'quantity': 0 } }, postTransaction, done);

    function postTransaction(result) {
      var postData =
        {
          'atomicActivitiesList': [
            {
              'entityId': result.body.id,
              'payload': { 'value': 20 },
              'modelName': 'TestAccount',
              'instructionType': 'DEBIT'
            }
          ]
        };

      api
        .set('Accept', 'application/json')
        .post(bootstrap.basePath + '/TestTransfers/?access_token=' + accessToken)
        .send(postData)
        .expect(500).end(function (err, res) {
          if (err) {
            log.error(err);
          } else {
            log.info(log.defaultContext(), 'the debit succeeded, altough it should not!');
          }
          return done();
        });
    }

  });

  it('should credit an account 20 and then debit the same account 10', function (done) {
    apiRequest('/TestAccounts/', { 'qqq': 0, 'stateObj': { 'quantity': 0 } }, postTransaction, done);

    function postTransaction(result) {
      var postData =
        {
          'nonAtomicActivitiesList': [
            {
              'entityId': result.body.id,
              'payload': { 'value': 20 },
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
              'payload': { 'value': 10 },
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

  it('should credit an account 20 and then debit the same account 10 and then debit it 20 and fail', function (done) {
    apiRequest('/TestAccounts/', { 'qqq': 0, 'stateObj': { 'quantity': 0 } }, postTransaction, done);
    function postTransaction(result) {
      var postData =
        {
          'nonAtomicActivitiesList': [
            {
              'entityId': result.body.id,
              'payload': { 'value': 20 },
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
              'payload': { 'value': 10 },
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
              'payload': { 'value': 20 },
              'modelName': 'TestAccount',
              'instructionType': 'DEBIT'
            }
          ]
        };

      api
        .set('Accept', 'application/json')
        .post(bootstrap.basePath + '/TestTransfers/?access_token=' + accessToken)
        .send(postData)
        .expect(500).end(function (err, res) {
          if (err) {
            log.error(err);
          } else {
            log.info(log.defaultContext(), 'the debit succeeded, altough it should not!');
          }
          return done();
        });
    }
  });

  it('should credit an account in parallel', function (done) {
    apiRequest('/TestAccounts/', { 'id': 'TestAccount6', 'stateObj': { 'quantity': 0 } }, creditParallel, done);

    function creditParallel() {
      var functionArray = [];
      var postData =
        {
          'nonAtomicActivitiesList': [
            {
              'entityId': 'TestAccount6',
              'payload': { 'value': 1 },
              'modelName': 'TestAccount',
              'instructionType': 'CREDIT'
            }
          ]
        };

      function creditFactory() {
        return function creditOne(callback) {
          apiRequest('/TestTransfers/', postData, function (data) {
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
        .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "TestAccount6"}}&access_token=' + accessToken)
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

  it('should debit an account in parallel', function (done) {
    apiRequest('/TestAccounts/', { 'id': 'TestAccount7', 'stateObj': { 'quantity': 0 } }, creditAccount, done);

    function creditAccount() {
      var postData =
        {
          'nonAtomicActivitiesList': [
            {
              'entityId': 'TestAccount7',
              'payload': { 'value': 10 },
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
              'entityId': 'TestAccount7',
              'payload': { 'value': 1 },
              'modelName': 'TestAccount',
              'instructionType': 'DEBIT'
            }
          ]
        };

      function debitFactory() {
        return function creditOne(callback) {
          apiRequest('/TestTransfers/', postData, function (data) {
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
        .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "TestAccount7"}}&access_token=' + accessToken)
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

  it('should debit an account in parallel and then fail', function (done) {
    apiRequest('/TestAccounts/', { 'id': 'TestAccount8', 'stateObj': { 'quantity': 0 } }, creditAccount, done);

    function creditAccount() {
      var postData =
        {
          'nonAtomicActivitiesList': [
            {
              'entityId': 'TestAccount8',
              'payload': { 'value': 10 },
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
              'entityId': 'TestAccount8',
              'payload': { 'value': 1 },
              'modelName': 'TestAccount',
              'instructionType': 'DEBIT'
            }
          ]
        };

      function debitFactory() {
        return function creditOne(callback) {
          apiRequest('/TestTransfers/', postData, function (data) {
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
        .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "TestAccount8"}}&access_token=' + accessToken)
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
              'entityId': 'TestAccount8',
              'payload': { 'value': 1 },
              'modelName': 'TestAccount',
              'instructionType': 'DEBIT'
            }
          ]
        };

      api
        .set('Accept', 'application/json')
        .post(bootstrap.basePath + '/TestTransfers/?access_token=' + accessToken)
        .send(postData)
        .expect(500).end(function (err, res) {
          return done();
        });
    }
  });

  it('should debit and credit an account in parallel', function (done) {
    apiRequest('/TestAccounts/', { 'id': 'TestAccount9', 'stateObj': { 'quantity': 0 } }, creditAccount, done);
    function creditAccount() {
      var postData =
        {
          'nonAtomicActivitiesList': [
            {
              'entityId': 'TestAccount9',
              'payload': { 'value': 10 },
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
              'entityId': 'TestAccount9',
              'payload': { 'value': 1 },
              'modelName': 'TestAccount',
              'instructionType': 'DEBIT'
            }
          ]
        };

      var postDataCredit =
        {
          'nonAtomicActivitiesList': [
            {
              'entityId': 'TestAccount9',
              'payload': { 'value': 1 },
              'modelName': 'TestAccount',
              'instructionType': 'CREDIT'
            }
          ]
        };

      function debitFactory() {
        return function debitOne(callback) {
          apiRequest('/TestTransfers/', postDataDebit, function (data) {
            callback(null, data);
          }, done);
        };
      }

      function creditFactory() {
        return function creditOne(callback) {
          apiRequest('/TestTransfers/', postDataCredit, function (data) {
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
        .get(bootstrap.basePath + '/TestAccounts?filter={"where":{"id": "TestAccount9"}}&access_token=' + accessToken)
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

  it('should create 3 accounts and then deposit 10 in all of them', function (done) {
    var actors = [{}, {}, {}];

    async.each(actors, createActor, continueLogic);

    function createActor(actor, cb) {
      apiRequest(
        '/TestAccounts/',
        { 'qqq': 0, 'stateObj': { 'quantity': 0 } },
        function (result) {
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
              'payload': { 'value': 10 },
              'modelName': 'TestAccount',
              'instructionType': 'CREDIT'
            },
            {
              'entityId': actors[1].result.body.id,
              'payload': { 'value': 10 },
              'modelName': 'TestAccount',
              'instructionType': 'CREDIT'
            },
            {
              'entityId': actors[2].result.body.id,
              'payload': { 'value': 5 },
              'modelName': 'TestAccount',
              'instructionType': 'CREDIT'
            },
            {
              'entityId': actors[2].result.body.id,
              'payload': { 'value': 5 },
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

  it('should create 3 accounts and then deposit 10 in all of them and then withdraw 5 from all of them', function (done) {
    var actors = [{}, {}, {}];

    async.each(actors, createActor, continueLogic);

    function createActor(actor, cb) {
      apiRequest(
        '/TestAccounts/',
        { 'qqq': 0, 'stateObj': { 'quantity': 0 } },
        function (result) {
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
              'payload': { 'value': 10 },
              'modelName': 'TestAccount',
              'instructionType': 'CREDIT'
            },
            {
              'entityId': actors[1].result.body.id,
              'payload': { 'value': 10 },
              'modelName': 'TestAccount',
              'instructionType': 'CREDIT'
            },
            {
              'entityId': actors[2].result.body.id,
              'payload': { 'value': 10 },
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
              'payload': { 'value': 5 },
              'modelName': 'TestAccount',
              'instructionType': 'DEBIT'
            },
            {
              'entityId': actors[1].result.body.id,
              'payload': { 'value': 5 },
              'modelName': 'TestAccount',
              'instructionType': 'DEBIT'
            },
            {
              'entityId': actors[2].result.body.id,
              'payload': { 'value': 5 },
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

  it('should not be able to modify a transaction', function (done) {

    apiRequest('/TestAccounts/', { 'qqq': 0, 'stateObj': { 'quantity': 0 } }, postTransaction, done);

    function postTransaction(result) {
      var postData =
        {
          'nonAtomicActivitiesList': [
            {
              'entityId': result.body.id,
              'payload': { 'value': 20 },
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
              'payload': { 'value': 20 },
              'modelName': 'TestAccount',
              'instructionType': 'CREDIT'
            }
          ]
        };
      postData._version = result.body._version;
      api
        .set('Accept', 'application/json')
        .put(bootstrap.basePath + '/TestTransfers/' + result.body.id + '?access_token=' + accessToken)
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



  //commented out - not changed
  xit('should delete an account ', function (done) {
    var postData = {
      id: 'TestAccount16'
    };
    var version;
    api
      .set('Accept', 'application/json')
      .post(bootstrap.basePath + '/TestAccounts/' + '?access_token=' + accessToken)
      .send(postData)
      .end(function (err, res) {
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
              'entityId': 'TestAccount16',
              'payload': { 'value': 20 },
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
        .delete(bootstrap.basePath + '/TestAccounts/TestAccount16/' + version + '?access_token=' + accessToken)
        .end(function (err, res) {
          if (err || res.body.error) {
            return done(err || (new Error(JSON.stringify(res.body.error))));
          } else {
            return finishTestAndCheck();
          }
        });
    }

    function finishTestAndCheck() {
      checkBalance('TestAccount', 'TestAccount16', function (err, balance) {
        expect(err.message).to.be.equal('actor not in memory');
        return done();
      });
    }
  });

  var deleteContext = { fetchAllScopes: true, ctx: { tenantId: 'test-tenant' } };

  after('delete all the test accounts', function (done) {
    var testAccount = loopback.getModel('TestAccount');
    testAccount.destroyAll({}, deleteContext, function (err) {
      if (err) {
        log.error(err);
        console.log('unable to delete all the TestAccount models');
        return done(err);
      } else {
        log.info('deleted alltest accounts');
        return done();
      }
    });
  });

  after('delete all the test transfers', function (done) {
    var testTransfer = loopback.getModel('TestTransfer');
    testTransfer.destroyAll({}, deleteContext, function (err) {
      if (err) {
        expect(err.message).to.be.equal('Cannot delete journal entry');
        return done();
      } else {
        log.info('deleted alltest transfers');
        return done(new Error('Should not be allowed to delete journal entries!'));
      }
    });
  });


  after('delete all the test states', function (done) {
    var state = loopback.getModel('State');
    state.destroyAll({}, deleteContext, function (err) {
      if (err) {
        log.error(err);
        console.log('unable to delete all the TestState models');
        return done(err);
      } else {
        log.info('deleted alltest states');
        return done();
      }
    });
  });

  after('delete all modelDefinition models', function (done) {
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
