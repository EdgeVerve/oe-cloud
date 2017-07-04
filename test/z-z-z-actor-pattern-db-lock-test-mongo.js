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
var MongoClient = require('mongodb').MongoClient;
var mongoHost = process.env.MONGO_HOST || 'localhost';

var accessToken;

function apiRequest(url, postData, callback, done) {
  var version = uuid.v4();
  postData._version = version;
  api
    .set('Accept', 'application/json')
    .set('x-evproxy-db-lock', '1')
    .post(bootstrap.basePath + url + '?access_token=' + accessToken)
    .send(postData)
    .end(function (err, res) {
      if (err || res.body.error) {
        log.error(log.defaultContext(), err || (new Error(JSON.stringify(res.body.error))));
        return done(err || (new Error(JSON.stringify(res.body.error))));
      } else {
        return callback(res);
      }
    });
}

describe(chalk.blue('actor-pattern-db-lock-test'), function () {
  this.timeout(40000);
  var afterTest = {};

  before('login using admin', function fnLogin(done) {
    var sendData = {
      'username': 'admin',
      'password': 'admin'
    };

    api
      .set('x-evproxy-db-lock', '1')
      .post(bootstrap.basePath + '/BaseUsers/login')
      .send(sendData)
      .expect(200).end(function (err, res) {
        if (err) {
          log.error(log.defaultContext(), err);
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

      var transferDefinition = loopback.getModel('TestTransfer', bootstrap.defaultContext);
      transferDefinition.prototype.performBusinessValidations = function (cb) {
        cb();
      };

      var accountDefinition = loopback.getModel('TestAccount', bootstrap.defaultContext);

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

  it('Only actor pattern entities should acquire DB lock.', function (done) {
    /**
     * After creating an accout and commiting a deposit transaction, the db shold hold:
     * - zero records for tnx entity (TestTransfers) lock, since it inherit base entity
     * - one record for account entity (TestAccount) lock, since it inherit base actor entity
     * implementaion : 
     * - base entity has dbLockRequired == false.
     * - base actor entity has dbLockRequired== true.
     */

    apiRequest('/TestAccounts/', { 'stateObj': { 'quantity': 0 } }, postTransaction, done);

    var testAccountsId;

    function postTransaction(result) {
      testAccountsId = result.body.id;
      var postData = {
        'nonAtomicActivitiesList': [
          {
            'entityId': testAccountsId,
            'payload': { 'value': 20 },
            'modelName': 'TestAccount',
            'instructionType': 'CREDIT'
          }
        ]
      };

      apiRequest('/TestTransfers/', postData, finishTestAndCheck, done);
    }

    function finishTestAndCheck(result) {
      var url = 'mongodb://' + mongoHost + ':27017/db';
      MongoClient.connect(url, function (err, db) {
        if (err) return done(err);
        else {
          db.collection("Lock").find().toArray(function (err, res) {
            if (err) {
              log.error(log.defaultContext(), err);
              return done(err);
            } else {
              //console.log ("Results: " + res);
              var testAccountLockCounter = 0;
              var newModelName1 = loopback.findModel('TestAccount', bootstrap.defaultContext);
              res.forEach(function (element) {
                if (element.modelName === "TestTransfers") {
                  return done(new Error("Lock was acquired on entity where dbLockRequired == false"))
                } else if (element.modelName === newModelName1.modelName && element.modelId == testAccountsId) testAccountLockCounter++;
              }, this);

              if (testAccountLockCounter > 0) {
                return done();
              } else {
                return done(new Error("No TestAccounts Lock found, should be atleast one."));
              }
            }
          });
        }
      });
    }
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

  after('unset the dbLock header', function (done) {
    api.set('x-evproxy-db-lock', '0');
    return done();
  });
});