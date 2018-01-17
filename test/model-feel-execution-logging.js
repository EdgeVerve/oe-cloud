/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/* jshint -W024 */
/* jshint expr:true */
//to avoid jshint errors for expect

var bootstrap = require('./bootstrap');
var chalk = require('chalk');
var async = require('async');
var log = require('oe-logger')('model-rule-execution-logging');
var chai = require('chai');
var expect = chai.expect;
var loopback = require('loopback');
chai.use(require('chai-things'));
var models = bootstrap.models;
var prefix = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,';
var fs = require('fs');
var util = require('util');
var inspect = (obj) => util.inspect(obj, { showHidden: true, depth: null })
var Customer;

describe(chalk.blue('model-feel-execution-logging'), function() {
  before('creating the model', function(done) {
    var data = {
      name: 'LoanBank',
      properties: {
        name: {
          type: 'string',
          id: true
        },
        employment: {
          type: 'object'
        },
        amount: 'number',
        type: 'string', // requested product
      }
    };

    models.ModelDefinition.create(data, bootstrap.defaultContext, function (err, models) {
      var testModel = loopback.getModel(data.name, bootstrap.defaultContext);
      // testModelWithBase = loopback.getModel(testModelAsBasePM, bootstrap.defaultContext);
      expect(testModel.modelName).to.equal('LoanBank-test-tenant');
      Customer = testModel;

      done(err);
    });
  });

  before('create a decision table', function(done) {
    // debugger;
    var binData = fs.readFileSync(__dirname + '/model-rule-data/eligibilityUSA.xlsx');
    var docData = prefix + binData.toString('base64');
   
    var data = [
      {
        name: 'Eligibility',
        document: {
          documentName: 'eligibilityUSA.xlsx',
          documentData : docData
        }
      }
    ];

    var DecisionTable = models.DecisionTable;

    DecisionTable.create(data, bootstrap.defaultContext, function(err) {
      if (err) {
        done(err);
      }
      else {
        done();
      }
    });
  });

  it('positive case', function(done) {
    var DecisionTable = models.DecisionTable;
    var payload = {
      name: 'Ashish',
      employment : {
        monthlyIncome: 200,
        yearsOfExperience: 7
      },
      type: 'PERSONAL_LOAN',
      amount: 950
    };


    DecisionTable.exec('Eligibility', payload, bootstrap.defaultContext, function(err, data) {
      expect(data.eligibility).to.equal(payload.amount);
      done();
    });
  });


  
});