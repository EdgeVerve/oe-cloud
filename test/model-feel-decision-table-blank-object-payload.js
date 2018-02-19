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
var log = require('oe-logger')('model-rule-belongsTo-relation-test');
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

describe(chalk.blue('model-feel-decision-table-blank-object-payload-test'), function() {
  before('creating the model', function(done) {
    var data = {
      name: 'Customer2',
      properties: {
        name: {
          type: 'string',
          id: true
        },
        amount: {
          type: 'object'
        }
      }
    };

    models.ModelDefinition.create(data, bootstrap.defaultContext, function (err, models) {
      var testModel = loopback.getModel(data.name, bootstrap.defaultContext);
      // testModelWithBase = loopback.getModel(testModelAsBasePM, bootstrap.defaultContext);
      expect(testModel.modelName).to.equal('Customer2-test-tenant');
      Customer = testModel;

      done(err);
    });
  });

  before('inserting some initial data', function(done) {
    var data = [
      {
        name: 'foo',
        amount: {
          value: 250,
          currency: 'INR'
        }
      },
      {
        name: 'foo1',
        amount: {
          value: 250,
          currency: 'US'
        }
      },
      {
        name: 'foo3',
        amount: {}
      }
    ];

    Customer.create(data, bootstrap.defaultContext, done);
  });

  before('get convinced that model data insertion does not throw an error for insertion of record with amount as blank string', function(done) {
    var data = {
      name: 'foo4',
      amount: ""
    };

    Customer.create(data, bootstrap.defaultContext, function(err) {
      console.dir(err);
      expect(err).to.be.null;
      done();
    });
  });

  before('create a decision table', function(done) {
    debugger;
    var binData = fs.readFileSync(__dirname + '/model-rule-data/blank_object.xlsx');
    var docData = prefix + binData.toString('base64');
    var binData2 = fs.readFileSync(__dirname + '/model-rule-data/blank_object2.xlsx');
    var docData2 = prefix + binData2.toString('base64');

    var binData3 = fs.readFileSync(__dirname + '/model-rule-data/blank_object3.xlsx');
    var docData3 = prefix + binData3.toString('base64');

    var data = [
      {
        name: 'TestDecision2',
        document: {
          documentName: 'blank_object.xlsx',
          documentData : docData
        }
      },
      {
        name: 'TestDecision3',
        document: {
          documentName: 'blank_object2.xlsx',
          documentData: docData2
        }
      },
      {
        name: 'TestDecision4a',
        document: {
          documentName : 'blank_object3.xlsx',
          documentData: docData3
        }
      }
    ];

    var DecisionTable = models.DecisionTable;
    // console.log(DecisionTable.modelName)

    DecisionTable.create(data, bootstrap.defaultContext, function(err) {
      if (err) {
        // console.dir(err)
        done(err);
      }
      else {
        done();
      }
    });
  });

  it('should execute the decision table rule correctly - test 1', function(done) {
    var DecisionTable = models.DecisionTable;
    Customer.findOne({ where: { name: 'foo'}}, bootstrap.defaultContext, function(err, result) {
      expect(result.name).to.equal('foo');
      expect(result.amount.value).to.equal(250);
      expect(result.amount.currency).to.equal('INR');
      // console.dir(result);
      // result.options = bootstrap.defaultContext;
      // result.options.modelName = Customer.modelName;
      // debugger;
      var payload = result.__data;
      payload.options = bootstrap.defaultContext;
      payload.options.modelName = Customer.modelName;

      DecisionTable.exec('TestDecision2', payload, bootstrap.defaultContext, function(err, dtResult) {
        if (err) {
          console.log('error')
          console.dir(err);
          done(err)
        }
        else {
          console.log('pass')
          // console.dir(dtResult);
          expect(dtResult).to.be.array;
          expect(dtResult[0].errMessage).to.be.true;
          done();
        }
        // expect(dtResult)

      });
    });
  });


  it('should fail to execute the decision table rule correctly - test 2 - because we are trying to fetch non-existent property on an object', function(done) {
    var DecisionTable = models.DecisionTable;
    Customer.findOne({ where: { name: 'foo3'}}, bootstrap.defaultContext, function(err, result) {

      expect(result.name).to.equal('foo3');
      var payload = result.__data;
      payload.options = bootstrap.defaultContext;
      payload.options.modelName = Customer.modelName;

      DecisionTable.exec('TestDecision3', payload, bootstrap.defaultContext, function(err, dtResult) {
        if (err) {
          // console.log('error')
          console.dir(err);
          done(err)
        }
        else {
          // console.log('pass')
          console.dir(dtResult);
          expect(dtResult).to.be.array;
          expect(dtResult[0].errCode).to.equal('JS_FEEL_ERR');
          done();

          // conclusion: we cannot find the presence/absence
          // like this we need an external function for this
          // use case.
        }
        // expect(dtResult)

      });
    });
  });

  // note: add the necessary external function config
  // in the corresponding environment: server/config.whatever.json
  it('should execute the decision table correctly', function(done) {
    var DecisionTable = models.DecisionTable;
    var executor = function(payload) {
      return new Promise((resolve, reject) => {
        DecisionTable.exec('TestDecision4a', payload, bootstrap.defaultContext, function(err, dtResult) {
          if (err) {
            // console.log('ValidationResult:', err);
            reject(err)
          }
          else {
            // console.log('reject')
            // console.log(arguments);
            resolve(dtResult);
          }
        })
      })
    };
    // debugger;
    Customer.find({ }, bootstrap.defaultContext, function(err, results) {
      // console.log(inspect(results))
      // expect(results.map).to.be.function;
      if (err) {
        done(err);
      }
      else {

        // expect(results.length).to.equal(4);
        console.log('records:', inspect(results));
        var promises = results.map( r => {
          var pl = r.__data;
          pl.options = bootstrap.defaultContext;
          pl.modelName = Customer.modelName;
          return executor(pl);
        });


        Promise.all(promises).then(function(responses) {

          console.log('responses:', inspect(responses));
          done();
        }).catch(e => {
          console.dir(e);
          done(e);
        });
      }

    });
  });

  after(function(){
    //model-feel-decision-table-blank-object-payload-test.js
    debugger;
  });
});
