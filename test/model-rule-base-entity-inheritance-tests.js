/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;
var models = bootstrap.models;
var app = bootstrap.app;
var chai = require('chai');
chai.use(require('chai-things'));
var loopback = require('loopback');
var async = require('async');
var fs = require('fs');

var prefix = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,';

var context = bootstrap.defaultContext;
var adminContext= {"ctx":{"tenantId":"default"}};

class TestCaseError extends Error {
  constructor() {
    super();
    this.message = "The test should not have hit this line. Check code.";
  }
}

describe('model rules with inherited models', function() {
  var baseModel;
  before('creating the base model', function(done){
    var EmployeeBase = {
      name: 'Employee',
      properties: {
        name: 'string',
        age: 'number',
        gender: 'string',
        qualification: 'object',
        section: 'string'
      }
    };

    models.ModelDefinition.create(EmployeeBase, adminContext, (err, model) => {
      if (err) {
        done(err);
      } else {
        baseModel = model;
        expect(baseModel.name).to.equal('Employee');
        done();
      }
    });
  });

  var DecisionTable = models.DecisionTable;
  var insert = function(obj, ctx) {
    return new Promise((resolve, reject) => {
      DecisionTable.create(obj, ctx, (err, record) => {
        if (err) {
          reject(err)
        }
        else {
          resolve(resolve);
        }
      });
    });
  };

  before('Creating decisions for the base model as default tenant', function(done){
    var decisions = [
      {
        name: 'd1',
        document: {
          documentName: 'employee_validation.xlsx',
          documentData: prefix + fs.readFileSync(__dirname + '/model-rule-data/employee_validation.xlsx').toString('base64')
        }
      }
    ];

    Promise.all(decisions.map(d => insert(d, adminContext)))
    .then(results => {
      done();
    })
    .catch(done);
  });

  before('...wiring the model rule to run on base model insert (as default tenant)', (done) => {
    var obj = {
      modelName: 'Employee',
      validationRules: ['d1']
    };

    models.ModelRule.create(obj, adminContext, (err) => {
      if(err) {
        done(err)
      }
      else {
        done();
      }
    });
  });

  before('...asserting the base model rules get invoked on insert', done => {
    var records = [
      {
        name: 'person1',
        age: 23,
        qualification: {
          marks_10: 65,
          marks_12: 65
        }
      },
      {
        name: 'person2',
        age: 24,
        qualification: {
          marks_10: 65,
          marks_12: 59
        }
      }
    ];
    var baseModel = loopback.findModel('Employee', adminContext);

    baseModel.create(records, context, err => {
      expect(err).to.not.be.null;
      baseModel.find({}, context, (errFind, data) => {
        if(errFind) {
          done(errFind)
        }
        else {
          expect(data.length).to.equal(1);
          done();
        }
      });
    });
  }); //end ...before()

  it('should create a derived employee (as test-tenant)', done => {
    var derivedEmployee = {
      name: 'BPOEmployee',
      base: 'Employee',
      properties: {
        shift: 'string'
      }
    };

    models.ModelDefinition.create(derivedEmployee, context, err => {
      if (err) {
        done(err)
      }
      else {
        done();
      }
    });

  });

  // this test should invoke the base model rule and deny
  // insert of the invalid record
  it('should deny insert of record on derived entity for an invalid record', done => {
    var invalidRecord = {
      name: 'Gropher',
      qualification: {
        marks_10: 65,
        marks_12: 55
      },
      shift: 'night',
      age: 34,
      gender: 'M'
    };

    var derivedModel = loopback.findModel('BPOEmployee', context);
    debugger;
    derivedModel.create(invalidRecord, context, err => {
      if (err) {
        // debugger;
        // console.log(err);
        done();
      }
      else {
        done(new TestCaseError());
      }
    });
  });

  it('should also inherit the default populator rules defined on the base employee', done => {
    var empModel;

    var createPopulatorDecision = cb => {
      var data = {
        name: 'Populator1',
        document: {
          documentName: 'populator1.xlsx',
          documentData: prefix + fs.readFileSync(__dirname + '/model-rule-data/populator1.xlsx').toString('base64')
        }
      };
      models.DecisionTable.create(data, context, err => {
        if(err) {
          cb(err);
        }
        else {
          cb();
        }
      });
    };

    var findModelRuleForBaseEmployee = cb => {
      models.ModelRule.findOne({ modelName: 'Employee' }, context, (err, data) => {
        if(err) {
          cb(err)
        }
        else {
          cb(null, data);
        }
      });
    };

    var updateModelRuleForBaseEmployee = (record, cb) => {
      //add a populator rule for employee
      var data = record.__data;
      data.defaultRules = ['Populator1']

      models.ModelRule.upsert(data, context, err => {
        if (err) {
          cb(err);
        }
        else {
          cb();
        }
      });
    };

    var insertBPOEmployeeRecord = cb => {
      var bpoModel = loopback.findModel('BPOEmployee', context);
      var record = {
        name: 'Arif',
        qualification: {
          marks_10: 63,
          marks_12: 65
        },
        gender: "M",
        age: 23,
        shift: 'night'
      };

      bpoModel.create(record, context, (err, inst) => {
        if (err) {
          cb(err)
        }
        else {
          cb(null, inst)
        }
      });

    };

    async.seq(
      createPopulatorDecision, 
      findModelRuleForBaseEmployee, 
      updateModelRuleForBaseEmployee, 
      insertBPOEmployeeRecord)

    ((err, result) => {
      if(err){
        done(err)
      }
      else {
        var data = result.__data;
        expect(data).to.be.defined;
        expect(typeof(data.section)).to.not.equal('undefined');
        expect(data.section).to.equal("men");
        done();  
      }      
    });
  });


});
