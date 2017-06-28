/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/*global
    require,before,after,it,describe
*/
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;
var loopback = require('loopback');
var models = bootstrap.models;
var api = bootstrap.api;
var defaults = require('superagent-defaults');
var supertest = require('supertest');

/// This test case demonstrates model personalization
/// there are two models - Employee and EmployeeAddress where EmployeeAddress is child of Employee

/// 1. We will create these two models by posting into ModelDefinition with global scope and create relations among them.
/// 2. We will create data in these models using implicite composte as icici user and citi user
/// 3. we will see data is exclusive so that citi will not see icici data and vice a versa
/// 4. we will personalized Employee model for icici
/// 5. we will see the effect of it as data  will start going to another personalized model
/// 6. we will personalized EmployeeAddress model for citi
/// 7. we will see effect particulalry for related model personalization
/// 8. we will also check same through Web API.


describe(chalk.blue('Model Personalization test'), function () {

  this.timeout(60000);
  // globalscope , iciciscope and citiscope
  var globalCtx = {
    ignoreAutoScope: true,
    ctx: {}
  };

  var iciciCtx = {
    ctx: {
      tenantId: 'icici',
      remoteUser: 'iciciuser'
    }
  };

  var citiCtx = {
    ctx: {
      tenantId: 'citi',
      remoteUser: 'citiuser2'
    }
  };

  var citiUser = {
    'username': 'citiuser2',
    'password': 'password++',
    'email': 'asdsad@gmail.com',
    'tenantId': 'citi'
  };

  var token = bootstrap.createJWToken(citiUser);

  var citiapi = defaults(supertest(bootstrap.app));

  before('setup test data', function (done) {
    bootstrap.createTestUser(citiUser, 'ev-admin', function () {

      // this will be in default tenant scope
      models.ModelDefinition.create({
        'name': 'Employee',
        'idInjection': false,
        'base': 'BaseEntity',
        properties: {
          'name': {
            'type': 'string',
            'required': true
          }
        },
        'relations': {
          'address': {
            'type': 'hasMany',
            'model': 'EmployeeAddress',
            'foreignKey': 'EmployeeId'
          }
        },
        'filebased': false,
        'acls': [{
          'principalType': 'ROLE',
          'principalId': '$everyone',
          'permission': 'ALLOW',
          'accessType': '*'
        }]
      }, globalCtx, function (err, model) {
        expect(err).to.be.not.ok;

        models.ModelDefinition.create({
          name: 'EmployeeAddress',
          'idInjection': false,
          base: 'BaseEntity',
          properties: {
            'city': {
              'type': 'string',
              'required': true
            }
          },
          'relations': {},
          filebased: false
        }, globalCtx, function (err2, model2) {
          expect(err2).to.be.not.ok;
          done();
        });
      });
    });


  });

  after('destroy test models', function (done) {
    models.ModelDefinition.destroyAll({
      name: 'Employee'
    }, bootstrap.defaultContext, function (err) {
      if (err) {
        return done(err);
      }
      models.ModelDefinition.destroyAll({
        name: 'EmployeeAddress'
      }, globalCtx, function (err) {
        if (err) {
          return done(err);
        }
        loopback.findModel('Employee', iciciCtx).destroyAll({}, globalCtx, function (err) {
          if (err) {
            return done(err);
          }
          loopback.findModel('EmployeeAddress', iciciCtx).destroyAll({}, globalCtx, function (err) {
            if (err) {
              return done(err);
            }
            models.ModelDefinition.destroyAll({}, globalCtx, function (err) {
              if (err) {
                return done(err);
              }
              return done();
            });
          });
        });
      });
    });
  });

  it('Populate data as Icicic - 2 Employee record should be created and 2 address records each should be created', function (done) {
    var Employee = loopback.getModel('Employee', bootstrap.defaultContext);
    Employee.create([{
      'name': 'Tom',
      'id': 1,
      'address': [{
        'city': 'Denver',
        'id': 11
      }, {
        'id': 12,
        'city': 'Frankfort'
      }]
    }, {
      'name': 'Harry',
      'id': 2,
      'address': [{
        'city': 'London',
        'id': 21
      }, {
        'id': 22,
        'city': 'Paris'
      }]
    }], iciciCtx, function (err, results) {
      if (err) {
        return done(err);
      }
      expect(results[0]).to.have.property('name');
      expect(results[0]).to.have.property('id');
      expect(results[0]).to.have.property('address');
      expect(results[0].name).to.equal('Tom');
      expect(results[0].address[0]).to.have.property('city');
      expect(results[0].address[0].city).to.equal('Denver');
      expect(results[0].address[1].city).to.equal('Frankfort');
      expect(results[1]).to.have.property('name');
      expect(results[1]).to.have.property('id');
      expect(results[1]).to.have.property('address');
      expect(results[1].name).to.equal('Harry');
      expect(results[1].address[0]).to.have.property('city');
      expect(results[1].address[0].city).to.equal('London');
      expect(results[1].address[1].city).to.equal('Paris');
      done();
    });
  });

  it('Model Personalization Populate data as Citi - 1 Employee record should be created and 2 address records should be created', function (done) {
    var Employee = loopback.getModel('Employee', bootstrap.defaultContext);
    Employee.create([{
      'name': 'John',
      'id': 11,
      'address': [{
        'city': 'Mumbai',
        'id': 111
      }, {
        'id': 112,
        'city': 'Delhi'
      }]
    }
    ], citiCtx, function (err, results) {
      if (err) {
        return done(err);
      }
      expect(results[0]).to.have.property('name');
      expect(results[0]).to.have.property('id');
      expect(results[0]).to.have.property('address');
      expect(results[0].name).to.equal('John');
      expect(results[0].address[0]).to.have.property('city');
      expect(results[0].address[0].city).to.equal('Mumbai');
      expect(results[0].address[1].city).to.equal('Delhi');
      done();
    });
  });


  it('Model Personalization Test - Fetch data as Citi - should return ONE Employees and two addresses for it', function (done) {
    var Employee = loopback.getModel('Employee', citiCtx);
    Employee.find({
      include: 'address'
    }, citiCtx, function (err, results) {
      if (err) {
        console.log(err);
        return done(err);
      }
      //console.log(JSON.stringify(results));
      expect(results.length).to.equal(1);
      expect(results[0]).to.have.property('name');
      expect(results[0]).to.have.property('id');
      expect(results[0]).to.have.property('address');
      expect(results[0].name).to.equal('John');
      expect(results[0].__data.address[0]).to.have.property('city');
      expect(results[0].__data.address[0].city).to.equal('Mumbai');

      done();
    });
  });


  it('Model Personalization Test - Fetch data as Icici - should return TWO Employees and ONE addresses for each', function (done) {
    var Employee = loopback.getModel('Employee', iciciCtx);
    Employee.find({
      include: 'address'
    }, iciciCtx, function (err, results) {
      if (err) {
        console.log(err);
        return done(err);
      }
      //console.log(JSON.stringify(results));
      expect(results.length).to.equal(2);
      expect(results[0]).to.have.property('name');
      expect(results[0]).to.have.property('id');
      expect(results[0]).to.have.property('address');
      expect(results[0].name).to.equal('Tom');
      expect(results[0].__data.address[0]).to.have.property('city');
      expect(results[0].__data.address[0].city).to.equal('Denver');
      done();
    });
  });



  it('Model Personalization Test - Personalized Employee model for icici', function (done) {
    // new Employee model will b created in mongo
    // mongo:true is set so that new collection will be used
    models.ModelDefinition.create({
      'name': 'Employee',
      'variantOf': 'Employee',
      'idInjection': false,
      'base': 'Employee',
      properties: {
        'age': {
          'type': 'number'
        }
      },
      'acl': []
    }, iciciCtx, function (err, m) {
      if (err) {
        console.log(err);
        return done(err);
      }
      var Employee = loopback.getModel('Employee', iciciCtx);
      Employee.create([{
        'name': 'Icici Tom',
        'age': 10,
        'id': 31,
        'address': [{
          'city': 'Bangalore',
          'id': 311
        }]
      }], iciciCtx, function (err, results) {
        if (err) {
          console.log(JSON.stringify(err));
          return done(err);
        }

        expect(results.length).to.equal(1);
        expect(results[0]).to.have.property('name');
        expect(results[0]).to.have.property('id');
        expect(results[0]).to.have.property('address');
        expect(results[0].name).to.equal('Icici Tom');
        expect(results[0].address[0]).to.have.property('city');
        expect(results[0].address[0].city).to.equal('Bangalore');
        // previous records for icici are still retain  as new records are will use same collection
        // user can have new collection if he/she wants
        Employee.find({
          include: 'address'
        }, iciciCtx, function (err, results) {
          expect(results.length).to.equal(3);
          expect(results[2]).to.have.property('name');
          expect(results[2]).to.have.property('id');
          expect(results[2]).to.have.property('address');
          expect(results[2].name).to.equal('Icici Tom');
          expect(results[2].__data.address[0]).to.have.property('city');
          expect(results[2].__data.address[0].city).to.equal('Bangalore');

          done();
        });

      });

    });
  });


  it('Model Personalization Test - Address is not personalized and it should return 5 records for icici', function (done) {
    // two records from 1st testcase and other is just when we personalized
    var address = loopback.getModel('EmployeeAddress', iciciCtx);

    address.find({}, iciciCtx, function (err, results) {
      if (err) {
        console.log(err);
        return done(err);
      }
      expect(results.length).to.equal(5);
      expect(results[0].city).to.equal('Denver');
      done();
    });
  });


  it('Model Personalization Test - Fetch data as Citi - should still return ONE Employees and two addresses for it', function (done) {
    // demonstrating that for citi - nothing yet affected
    var Employee = loopback.getModel('Employee', citiCtx);
    Employee.find({
      include: 'address'
    }, citiCtx, function (err, results) {
      if (err) {
        console.log(err);
        return done(err);
      }
      //console.log(JSON.stringify(results));
      expect(results.length).to.equal(1);
      expect(results[0]).to.have.property('name');
      expect(results[0]).to.have.property('id');
      expect(results[0]).to.have.property('address');
      expect(results[0].name).to.equal('John');
      expect(results[0].__data.address[0]).to.have.property('city');
      expect(results[0].__data.address[0].city).to.equal('Mumbai');

      done();
    });
  });


  it('Model Personalization Test - Personalized Address model for citi', function (done) {
    //EmployeeAddress model is personalized and new model with random number will be created
    //mongodb: true is set thus it will create new collection
    models.ModelDefinition.create({
      'name': 'EmployeeAddress',
      'variantOf': 'EmployeeAddress',
      'idInjection': false,
      'base': 'EmployeeAddress',
      'mongodb': true,
      properties: {
        'zip': {
          'type': 'string'
        }
      },
      'filebased': false
    }, citiCtx, function (err, m) {
      if (err) {
        console.log(err);
        return done(err);
      }
      var Employee = loopback.getModel('Employee', citiCtx);
      Employee.create([{
        'name': 'Citi Tom',
        'age': 10,
        'id': 51,
        'address': [{
          'city': 'Citi Bangalore',
          'zip': '560001',
          'id': 511
        }]
      }], citiCtx, function (err, results) {
        if (err) {
          console.log(JSON.stringify(err));
          return done(err);
        }
        // will see this new record of address is created in newly created address collection
        // while Employee will be in same old collection
        expect(results.length).to.equal(1);
        expect(results[0]).to.have.property('name');
        expect(results[0]).to.have.property('id');
        expect(results[0]).to.have.property('address');
        expect(results[0].name).to.equal('Citi Tom');
        expect(results[0].address[0]).to.have.property('city');
        expect(results[0].address[0].city).to.equal('Citi Bangalore');

        Employee.find({
          include: 'address'
        }, citiCtx, function (err, results) {
          expect(results.length).to.equal(2);
          expect(results[0].name).to.equal('John'); // Employee is still using base Employee
          expect(results[1].name).to.equal('Citi Tom');
          expect(results[0].__data.address.length).to.equal(0); // address got overriden so old records will not be available
          expect(results[1].__data.address[0]).to.have.property('city'); //address is coming from newer model
          expect(results[1].__data.address[0].city).to.equal('Citi Bangalore');
          expect(results[1].__data.address[0].zip).to.equal('560001');

          done();
        });

      });
    });
  });

  it('Model Personalization Test - Personalized Address model for citi should return 1 record from personalized address model. Sepeate collection for address', function (done) {
    var address = loopback.getModel('EmployeeAddress', citiCtx);
    address.find({}, citiCtx, function (err, results) {
      if (err) {
        console.log(err);
        return done(err);
      }
      expect(results.length).to.equal(1);
      expect(results[0].city).to.equal('Citi Bangalore');
      done();
    });
  });

  xit('Model Personalization Test - AA Web API Employee model should return 2 records', function (done) {
    citiapi.set('x-jwt-assertion', token)
      .set('Accept', 'application/json')
      .get(bootstrap.basePath + '/Employees')
      .expect(200).end(function (err, res) {
        //console.log('response body : ' + JSON.stringify(res.body, null, 4));
        if (err || res.body.error) {
          done(err || (new Error(res.body.error)));
        }
        var results = res.body;
        expect(results.length).to.equal(2);
        expect(results[0].name).to.equal('John');
        expect(results[1].name).to.equal('Citi Tom');
        done();
      });
  });


  xit('Model Personalization Test - Web API Personalized Address model for citi should return 1 record from personalized address model', function (done) {
    citiapi.set('x-jwt-assertion', token)
      .set('Accept', 'application/json')
      .get(bootstrap.basePath + '/EmployeeAddresses')
      .send()
      .expect(200).end(function (err, res) {
        //console.log('response body : ' + JSON.stringify(res.body, null, 4));
        if (err || res.body.error) {
          return done(err || (new Error(res.body.error)));
        }
        var results = res.body;
        expect(results.length).to.equal(2);
        expect(results[0].city).to.equal('Citi Bangalore');
        done();
      });
  });

  it('Model Personalization Test - Personalized Employee model for citi', function (done) {

    var Employeemodel = {
      'name': 'Employee',
      'variantOf': 'Employee',
      'idInjection': false,
      'mongodb': true,
      properties: {
        'firstName': {
          'type': 'string'
        }
      },
      'filebased': false
    };

    citiapi
      .set('Accept', 'application/json')
      .post(bootstrap.basePath + '/ModelDefinitions')
      .send(Employeemodel)
      .expect(200).end(function (err, res) {
        //console.log('response body : ' + JSON.stringify(res.body, null, 4));
        if (err || res.body.error) {
          done(err || (new Error(res.body.error)));
        }
        //var results = res.body;
        done();
      });
  });

  it('Model Personalization Test - Web API Personalized Employee model for citi should return 0 record from personalized address model', function (done) {
    citiapi
      .set('Accept', 'application/json')
      .get(bootstrap.basePath + '/Employees')
      .send()
      .expect(200).end(function (err, res) {
        //console.log('response body : ' + JSON.stringify(res.body, null, 4));
        if (err || res.body.error) {
          return done(err || (new Error(res.body.error)));
        }
        var results = res.body;
        expect(results.length).to.equal(0);
        done();
      });
  });

});
