var loopback = require('loopback');
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var uuid = require('node-uuid');
var chai = require('chai');
var expect = chai.expect;
var logger = require('oe-logger');
var log = logger('batch-job-tests');
var api = bootstrap.api;
var async = require('async');
var BatchJobRunner = require('../lib/batchJob-runner')

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
  var version = uuid.v4();
  postData._version = version;
  api
    .set('Accept', 'application/json')
    .set('x-evproxy-db-lock', '0')
    .post(bootstrap.basePath + url + '?access_token=' + accessToken)
    .send(postData)
    .end(function (err, res) {
      if (err || res.body.error) {
        log.error(log.defaultContext(), err || (new Error(JSON.stringify(res.body.error))));
        apiPostRequest(url, postData, callback, done);
        //return done(err || (new Error( err.message || JSON.stringify(res.body.error))));
      } else {
        return callback(res, done);
      }
    });
}

function apiGetRequest(url, callback, done) {
    var version = uuid.v4();
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
    }
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
      transferDefinition.prototype.performBusinessValidations = function (options, cb) {
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

      accountDefinition.prototype.calculateFeesPerAccount = function (account, ctx, callback){
        var transactionModel = loopback.getModel(transactionModelName, ctx);
        var idFieldName =  accountModel.definition.idName();
        var accountId = account[idFieldName];
        var query = { where: { startup: { regexp: '[0-9a-zA-Z]*' + accountId } } };
        transactionModel.find(query, ctx, function (err, res) {
          var intrest  = !res ? 0 : res.length; 
          account.updateAttribute('currentMonthFees', intrest, ctx, function (err) {
            if (err) log.error(log.defaultContext(), err);
            callback(err);
          });
        })     
      };

      var intrestDefinition = loopback.getModel(intrestModelName, bootstrap.defaultContext);
      accountDefinition.prototype.calculateFeesWithErrorPerAccount = function (account, ctx, callback){
        var transactionModel = loopback.getModel(transactionModelName, ctx);
        var idFieldName =  accountModel.definition.idName();
        var accountId = account[idFieldName];
        var lastChar = accountId.charAt(accountId.length-1);
        if (['0', '2', '4', '6', '8'].includes(lastChar)){
          account.updateAttribute('currentMonthFees', 0, ctx, function (err) {
            if (err) log.error(log.defaultContext(), err);
            callback(new Error('Random Error'));
          });
        } else {
          var query = { where: { startup: { regexp: '[0-9a-zA-Z]*' + accountId } } };
          transactionModel.find(query, ctx, function (err, res) {
            var intrest  = !res ? 0 : res.length; 
            account.updateAttribute('currentMonthFees', intrest, ctx, function (err) {
              if (err) log.error(log.defaultContext(), err);
              callback(err);
            });
          });
        }      
      };

      intrestDefinition.prototype.calculateTotalFees = function(ctx, callback){
        var idFieldName =  accountModel.definition.idName();
        var query = {};
        //query.where[idFieldName]= { regexp: accountModelName + '_' + '[0-9]*' };

        accountModel.find(query, ctx, function(err, accounts) {
            if (err){
                log.error(log.defaultContext, err);
                callback(err);
            }
            var feeSum = 0;
            async.each(accounts, function(account, cb){
              feeSum += account.currentMonthFees;
              cb();
            }, function(err) {
                apiPostRequest(intrestModelPlural, {'totalFee': feeSum}, (err, callback) => {callback(err);}, callback);
            })
        })
      };

      accountDefinition.prototype.associatedModels = [transactionModelName];
      return done();
    }

  });

  before('create batchJob models', function createModels(done) {
    var modelDefinition = loopback.findModel('ModelDefinition');
    var data = {
      'name': 'TestBatchJob',
      'base': 'BaseEntity',
      'properties': {
        "jobType": {
            "type": "string",
            "required": true
        },
        "fetchModelName": {
            "type": "string"
        },
        "fetchQuery": {
            "type": "string"
        },
        "fetchFilePath": {
            "type": "string"
        },
        "fetchDelimiter": {
            "type": "string"
        },
        "processEachModelName": {
            "type": "string",
            "required": true
        },
        "processEachFunction": {
            "type": "string",
            "required": true
        },
        "generateResultsModelName": {
            "type": "string",
            "required": true
        },
        "generateResultsFunctionName": {
            "type": "string",
            "required": true
        },
        "runPeriodically": {
            "type": "boolean",
            "required": true
        },
        "cronTime": {
            "type": "string"
        },
        "jobTime": {
            "type": "date"
        },
        "timeZone": {
            "type": "string",
            "required": true
        },
        "priority": {
            "type": "string",
            "required": true
        }
      }
    };

    modelDefinition.create(data, bootstrap.defaultContext, (err) => {
        if (err)
            done(err)
        else 
            done();
    });

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
      done(err);
    });    
    
  });

  it('test batchJob execution', function createModels(done) {
    accountModel = loopback.getModel(accountModelName, bootstrap.defaultContext);
    intrestModel = loopback.getModel(intrestModelName, bootstrap.defaultContext);
    var idFieldName =  accountModel.definition.idName();

    var msg = {};
    msg.i = 2;
    msg.options = bootstrap.defaultContext;
    msg.jobType = "model";
    msg.fetchModelName = accountModelName;
    msg.fetchQuery = {};
    //msg.fetchQuery.where[idFieldName]= { regexp: accountModelName + '_' + '[0-9]*' };
    msg.processEachModelName = accountModelName;
    msg.processEachFunction = "calculateFeesPerAccount";
    msg.generateResultsModelName = intrestModelName ;
    msg.generateResultsFunctionName = 'calculateTotalFees';

    BatchJobRunner.processMsg(msg);

    function checkResults (tryouts, done) {
        intrestModel.find({}, bootstrap.defaultContext, (err, res) => {
            var instance = res[0] || {};
            if (err) return done(err);
            if (instance.totalFee == 10) return done();
            else if (tryouts < 10 ) setTimeout(checkResults, 500, tryouts+1, done);
            else return done(new Error ("Batch Job was not successful"));
        })
    }
    checkResults(1, done);
  })

  it('test batchJob execution - continue job in case of error', function createModels(done) {
    accountModel = loopback.getModel(accountModelName, bootstrap.defaultContext);
    intrestModel = loopback.getModel(intrestModelName, bootstrap.defaultContext);
    var idFieldName =  accountModel.definition.idName();

    var msg = {};
    msg.options = bootstrap.defaultContext;
    msg.jobType = "model";
    msg.fetchModelName = accountModelName;
    msg.fetchQuery = {};
    //msg.fetchQuery.where[idFieldName]= { regexp: accountModelName + '_' + '[0-9]*' };
    msg.processEachModelName = accountModelName;
    msg.processEachFunction = "calculateFeesWithErrorPerAccount";
    msg.generateResultsModelName = intrestModelName ;
    msg.generateResultsFunctionName = 'calculateTotalFees';

    BatchJobRunner.processMsg(msg);

    function checkResults (tryouts, done) {
        intrestModel.find({}, bootstrap.defaultContext, (err, res) => {
            var instance = res[1] || {};
            if (err) return done(err);
            if (instance.totalFee == 5) return done();
            else if (tryouts < 10 ) setTimeout(checkResults, 500, tryouts+1, done);
            else return done(new Error ("Batch Job was not successful"));
        })
    }
    checkResults(1, done);
  })

});
