/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/* jshint -W024 */
/* jshint expr:true */
//to avoid jshint errors for expect
var util = require('util');
var bootstrap = require('./bootstrap');
var chalk = require('chalk');
var async = require('async');
var log = require('oe-logger')('model-rule-belongsTo-self-relation-test');
var chai = require('chai');
var expect = chai.expect;
var loopback = require('loopback');
chai.use(require('chai-things'));
var models = bootstrap.models;
var fs = require('fs');
var prefix = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,';

var People;

describe(chalk.blue('model-rule-belongsTo-self-relation-test'), function() {
  before('creating the parent model', function(done) {
    var data = {
      name: 'People',
      properties: {
        name: 'string',
        age: 'number',
        department: 'string',
        designation: 'string',
        pid: {
          type: 'number',
          id: true
        }        
      },
      relations: {
        manager: {
          type: 'belongsTo',
          model: 'People'
        }
      }
    };

    models.ModelDefinition.create(data, bootstrap.defaultContext, function (err, models) {
      var testModel = loopback.getModel(data.name, bootstrap.defaultContext);
      // testModelWithBase = loopback.getModel(testModelAsBasePM, bootstrap.defaultContext);
      expect(testModel.modelName).to.equal('People-test-tenant');
      People = testModel;

      done(err);
    });
  });

  var custId;
  // var orderId;
  before('creating some dummy data in People', function(done) {
    var data = JSON.parse(fs.readFileSync(__dirname + '/model-rule-data/peoples.json', { encoding: 'utf8'}));

    People.create(data, bootstrap.defaultContext, function(err, result) {
      if (err) {
        done(err)
      }
      else {
        expect(err).to.be.null;
        // console.dir(result);
        expect(result.length).to.equal(9);
        // custId = result.id;
        done();
      }
    });
  });

  before('creating a decision table that validates this', function(done) {

    var docData = prefix + fs.readFileSync(__dirname + '/model-rule-data/validate_entry.xlsx').toString('base64');

    var data = {
      name: 'validateEntry',
      document: {
        documentName: 'validate_entry.xlsx',
        documentData: docData
      }
    };

    var DecisionTable = models.DecisionTable;

    DecisionTable.create(data, bootstrap.defaultContext, function(err) {
      done(err);
    });

  });


  before('attach the model rule', function(done) {
    var data = {
      modelName: People.modelName,
      validationRules: ['validateEntry']
    };

    var ModelRule = models.ModelRule;

    ModelRule.create(data, bootstrap.defaultContext, function(err) {
      done(err);
    });
  });

  it('should disallow the entry for an invalid people record', function(done){
    var data = {
      name: 'Rijesh',
      age: 26,
      designation: 'manager',
      department: 'hr',
      managerId: 3,
      pid: 10
    };
    // debugger;
    People.create(data, bootstrap.defaultContext, function(err) {
      // debugger;
      expect(err).to.not.be.null;
      // console.dir(err);
      // console.log(util.inspect(err, { showHidden: true, depth: null }));
      expect(err.details).to.be.defined;
      expect(err.details.messages).to.be.defined;
      expect(err.details.messages.DecisionTable).to.be.array;
      expect(err.details.messages.DecisionTable.length).to.equal(1);
      var errMessage = err.details.messages.DecisionTable[0];
      expect(errMessage).to.be.string;
      expect(errMessage).to.equal('manager should not be: josie');
      done();
    });
  });

  it('should allow the entry for a valid people record', function(done){
    var data = {
      name: 'Rijesh',
      age: 26,
      designation: 'manager',
      department: 'hr',
      managerId: 2,
      pid: 10
    };
    // debugger;
    People.create(data, bootstrap.defaultContext, function(err, result) {
      // debugger;
      // done(err);
      if (err) {
        done(err)
      }
      else {
        expect(result.name).to.equal(data.name);
        done();
      }
    });
  });
});