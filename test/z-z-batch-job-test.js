/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var loopback = require('loopback');
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var uuidv4 = require('uuid/v4');
var chai = require('chai');
var expect = chai.expect;
var logger = require('oe-logger');
var log = logger('batch-job-tests');
var api = bootstrap.api;
var async = require('async');
var BatchJobRunner = require('../lib/batchJob-runner');
var app = bootstrap.app;

var accessToken;
var accountModel;
var intrestModel;
const accountModelName = 'TestAccountBatchJob';
const accountModelPlural = '/' + accountModelName + 's/';
const transactionModelName = 'TestTransferBatchJob';
const transactionModelPlural = '/' + transactionModelName + 's/';
const intrestModelName = 'IntrestBatchJob';
const intrestModelPlural = '/' + intrestModelName + 's/';

function apiPostRequest(url, postData, callback, done) {
  var version = uuidv4();
  postData._version = version;
  api
    .set('Accept', 'application/json')
    .set('x-evproxy-db-lock', '0')
    .post(bootstrap.basePath + url + '?access_token=' + accessToken)
    .send(postData)
    .end(function (err, res) {
      if (err || res.body.error) {
        log.error(log.defaultContext(), err || (new Error(JSON.stringify(res.body.error))));
        // pktippa@gmail.com
        // Not sure why we are looping it, it may lead to infinite loop
        // and timeout set to 2 secs which is enough to trigger enough requests
        // to log error to CI console fail the CI with Build log exceeded.
        apiPostRequest(url, postData, callback, done);
        //return done(err || (new Error( err.message || JSON.stringify(res.body.error))));
      } else {
        return callback(res, done);
      }
    });
}

function apiGetRequest(url, callback, done) {
    var version = uuidv4();
    api
        .set('Accept', 'application/json')
        .get(bootstrap.basePath + url + '?access_token=' + accessToken)
        .send()
        .end(function(err, res) {
            if (err || res.body.error) {
                log.error(log.defaultContext(), err || (new Error(JSON.stringify(res.body.error))));
                apiGetRequest(url, callback, done);
                //return done(err || (new Error(JSON.stringify(res.body.error))));
            } else {
                return callback(res, done);
            }
        });
}

describe(chalk.blue('batch-job-test'), function () {
  this.timeout(20000);
  // We should login as testuser since we created models using default context with testuser
  // And if the req.callContext doesnt have testuser info, req.url will fail to update
  // tenant specific url, resulting in 404 when accessing API's.
  before('login using testuser', function fnLogin(done) {
    var sendData = {
      'username': 'testuser',
      'password': 'testuser123'
    };

    api
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

  before('create testAccount models', function createModels(done) {
    var modelDefinition = loopback.findModel('ModelDefinition');
    
    var data = {
      'name': intrestModelName,
      'base': 'BaseEntity',
      'properties': {
        'totalFee' : {
            'type': 'number', 
            'default': 0
        }
      }
    };
    modelDefinition.create(data, bootstrap.defaultContext, createAccountModel);    

    function createAccountModel(){
      var data = {
        'name': accountModelName,
        'base': 'BaseActorEntity',
        'properties': {
            'currentMonthFees' : {
                'type': 'number', 
                'default': 0
            }
        }
      };
      modelDefinition.create(data, bootstrap.defaultContext, createTransferModel);      
    }

    function createTransferModel() {
      var data = {
        'name': transactionModelName,
        'base': 'BaseJournalEntity'
      };
      modelDefinition.create(data, bootstrap.defaultContext, addAllFunctions);
    }

    function addAllFunctions() {

      var transferDefinition = loopback.getModel(transactionModelName, bootstrap.defaultContext);
      transferDefinition.prototype.performBusinessValidations = function (options, ctx, cb) {
          cb();
      };

      var accountDefinition = loopback.getModel(accountModelName, bootstrap.defaultContext);
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

      accountDefinition.prototype.calculateFeesPerAccount = function (interestCoefficient, ctx, callback) {

        accountModel.find({}, ctx, (err, accounts)=> {
          async.each(accounts, function(account, cb) {
            var transactionModel = loopback.getModel(transactionModelName, ctx);
            var idFieldName =  accountModel.definition.idName();
            var accountId = account[idFieldName];
            var query = { where: { startup: { regexp: '[0-9a-zA-Z]*' + accountId } } };
            transactionModel.find(query, ctx, function (err, res) {
              var intrest  = !res ? 0 : res.length * interestCoefficient; 
              retryUpdateAttributes(account, intrest, ctx, cb);
            });
          }, function(err) {
            callback(err);
          });
        });
      };    

      accountDefinition.prototype.associatedModels = [transactionModelName];
      return done();
    }

    function retryUpdateAttributes(account, intrest, ctx, callback) {
      account.updateAttribute('currentMonthFees', intrest, ctx, function (err) {
        if (err) {
          log.error(log.defaultContext(), err);
          // Enter Monitoring Per Instance Processing - Maybe
          if (err.message === 'Instance is already locked') {
            return setTimeout(retryUpdateAttributes, 2000, account, intrest, ctx, callback);
          }
        }
        return callback();
      });
    }

  });

  var ids = [];

  before('create 10 accounts with 20 tnxs in each', function (done){
    var createAccounts = [];
    for (var i=0; i<10; i++){
        var accId = accountModelName + '_' + i ;
        ids.push(accId);
    }

    ids.forEach( (accountId, i) => {
        createAccounts.push((callback) => {
            apiPostRequest(accountModelPlural, { 'id': accountId, 'stateObj': { 'quantity': 0 } }, postTransaction, callback);

            function postTransaction(result, callback) {
                var postData =
                  {
                    'nonAtomicActivitiesList': [
                      {
                        'entityId': result.body.id.toString(),
                        'payload': { 'value': 20 },
                        'modelName': accountModelName,
                        'instructionType': 'CREDIT'
                      }
                    ]
                  };
                apiPostRequest(transactionModelPlural,postData, getRequest, callback);
              }

            function getRequest (result, callback) {
                apiGetRequest(accountModelPlural + accountId, (res, ck) => {ck();}, callback);
            }
        });
    });

    async.parallel(createAccounts, function (err){
      return done(err);
    });    
    
  });

  it('test batchJob execution', function createModels(done) {
    accountModel = loopback.getModel(accountModelName, bootstrap.defaultContext);
    intrestModel = loopback.getModel(intrestModelName, bootstrap.defaultContext);
    var idFieldName =  accountModel.definition.idName();

    var msg = {};
    msg.options = bootstrap.defaultContext;
    msg.jobModelName = accountModelName;
    msg.jobFnName = 'calculateFeesPerAccount';
    msg.jobFnParams = [0.5];

    BatchJobRunner.processMsg(msg, ()=> msg.status = 'succsseful');

    function checkResults (tryouts, done) {      
      accountModel.find({}, bootstrap.defaultContext, function(err, accounts) {
          if (err && tryouts === 10){
              log.error(log.defaultContext, err);
              return done(new Error ("Batch Job was not successful"));
          }
          if (err) {
            return setTimeout(checkResults, 500, tryouts+1, done);
          }
          var feeSum = 0;
          async.each(accounts, function(account, cb){
            feeSum += account.currentMonthFees;
            cb();
          }, function(err) {
            if (err) return done(err);
            if (feeSum == 5) return done();
            else if (tryouts < 10 ) return setTimeout(checkResults, 500, tryouts+1, done);
            else return done(new Error ("Batch Job was not successful"));            
          });
      });
    }
    checkResults(1, done);

  });

  after('delete all the test Models', function(done) {
    var deleteContext = {fetchAllScopes: true, ctx: {tenantId: 'test-tenant'}};
    async.each([accountModelName, transactionModelName, intrestModelName], function (modelName, callback) {
      var Model = loopback.getModel(modelName, bootstrap.defaultContext);
      Model.destroyAll({}, deleteContext, function(err) {
        if (err) {
          if (err.message == 'Cannot delete journal entry') return callback();
          
          log.error(err.message);
          return callback(err);
        } else {
          return callback();
        }
      });
    }, function(err) {
      if (err) done(err);
      else done();
      });
    });
});

