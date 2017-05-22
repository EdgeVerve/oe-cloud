/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;
var loopback = require('loopback');
var models = bootstrap.models;
//var app = bootstrap.app;

var chai = require('chai');
chai.use(require('chai-things'));

var studentModelName = 'Student';
var departmentModelName = 'Department';


describe(chalk.blue('Property expression test'), function () {

    this.timeout(20000);

    before('setup test data', function (done) {
          models.ModelDefinition.events.once('model-' + studentModelName + '-available', function () {
          var baseUserModel=loopback.getModel("BaseUser");
          var baseUserData={
      			  "username": "test-user",
      			  "email": "test-user@mycompany.com",
      			  "emailVerified": true,
      			  "id":"test-user",
      			   "password":"default-password",
      				   "_autoScope": {
      					      "tenantId": "test-tenant"
      					    }
      			};
      	  baseUserModel.create(baseUserData, bootstrap.defaultContext, function (err, results) {
          	  expect(err).to.not.be.ok;
            });
        	var studentModel = loopback.getModel(studentModelName);
            var studentData = [{
                    'name': 'David',
                    'departmentId': 1,
                    'departmentName':'Instru',
                    'rollNumber': '1',
                    'studentId': 1
                },
                {
                	 'name': 'Jane',
                	 'departmentId': 2,
                	 'departmentName':'Computer Science',
                     'rollNumber': '2',
                     'studentId': 2
                }];
            studentModel.create(studentData, bootstrap.defaultContext, function (err, results) {
                expect(err).to.not.be.ok;
            });
          
            var deptModel = loopback.getModel(departmentModelName);
            var deptData = [{
                    'departmentName': 'Computer Science',
                    'departmentHead': 'David',
                    'departmentId': 1
                },
                {
                	 'departmentName': 'Electronics',
                	 'departmentHead': 'Rahul',
                	 'departmentId': 2
                }];
            deptModel.create(deptData, bootstrap.defaultContext, function (err, results) {
            	console.info("deptData done",JSON.stringify(err));
                expect(err).to.be.null;
                done();
            });
        });

        models.ModelDefinition.create(
        		{
                    'name': 'Department',
                    'base': 'BaseEntity',
                    'plural': 'departments',
                    'strict': false,
                    'idInjection': true,
                    'options': {
                        'validateUpsert': true
                    },
                    'properties': {
                        'departmentName': {
                            'type': 'string',
                            'required': true
                        },
                        'departmentHead': {
                            'type': 'string'
                        },
                        'departmentId':{
                        	  'type': 'number',
                              'required': true,
                              'id': true
                        }
                    },
                    'validations': [],
                    'relations': {},
                    'acls': [],
                    'methods': {}
                },bootstrap.defaultContext, function (err, model) {
                	if (err) {
                		console.log(err);
                	} else {
                models.ModelDefinition.create(	{
                    'name': 'Student',
                    'base': 'BaseEntity',
                    'plural': 'students',
                    'strict': false,
                    'idInjection': true,
                    'options': {
                        'validateUpsert': true
                    },
                    'properties': {
                        'name': {
                            'type': 'string',
                            'propExpression':'@mDepartment/{{departmentId:@i.departmentId}}.departmentHead'
                        },
                        'departmentId':{
                        	 'type': 'number',
                        	 'propExpression':'@mDepartment/{{departmentName:Electronics}}.departmentId'
                        },
                        'departmentName': {
                            'type': 'string',
                            'propExpression' : '@mDepartment/{{@i.departmentId}}.departmentName'
                        },
                        'rollNumber': {
                            'type': 'string'
                        },
                        'emailAddress': {
                            'type': 'string',
                            'propExpression' : '@mBaseUser/{{username:callContext.ctx.remoteUser}}.email'
                        },
                        'studentId': {
                            'type': 'number',
                            'required': true,
                            'id': true
                        }
                    },
                    'validations': [],
                    'relations': {},
                    'acls': [],
                    'methods': {}
                }, bootstrap.defaultContext, function (err, model) {
                                    if (err) {
                                        console.log(err);
                                    }
                                    expect(err).to.be.not.ok;
                                });
                            }
                            expect(err).to.be.not.ok;
                   });
                   
    });

    after('destroy test models', function (done) {
        models.ModelDefinition.destroyAll({
            name: studentModelName
        }, bootstrap.defaultContext, function (err, d) {
            if (err) {
                console.log('Error - not able to delete modelDefinition entry for studentModelName');
                return done();
            }
            var model = loopback.getModel(studentModelName);
            model.destroyAll({}, bootstrap.defaultContext, function () {
                models.ModelDefinition.destroyAll({
                    name: departmentModelName
                }, bootstrap.defaultContext, function (err, d) {
                    if (err) {
                        console.log('Error - not able to delete modelDefinition entry for departmentModelName');
                        return done();
                    }
                    var model = loopback.getModel(departmentModelName);
                    model.destroyAll({}, bootstrap.defaultContext, function () {
                        done();
                    });
                });
            });
        });
    });


    afterEach('destroy execution context', function (done) {
        done();
    });

    it('Property Expression Test - Should insert data successfully', function (done) {
        var departmentModel = loopback.getModel(departmentModelName);
        var data = {
                    'departmentName': 'Mechanical Engineering',
                    'departmentHead': 'Austin',
                    'departmentId': 3
                    };
        departmentModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.null;
        });
        var studentModel = loopback.getModel(studentModelName);
        var studentData = {
                'name': 'David',
                'departmentId': 2,
                'departmentName':'Test Dept',
                'rollNumber': '3',
                'studentId': 3
            };
        studentModel.create(studentData, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Property Expression Test - Should insert data in database if instance property expression is provided and field is blank or not provided', function (done) {
    	  var studentModel = loopback.getModel(studentModelName); 
          var studentData = {
                  'name': 'Rahul',
                  'departmentId': 2,
                  'rollNumber': '4',
                  'studentId': 4
              };
          studentModel.create(studentData, bootstrap.defaultContext, function (err, results) {
              expect(results.departmentName).to.have.length.above(0);
              done();
          });
    });
    
    it('Property Expression Test - Should not update data if property already has value if property expression is provided', function (done) {
    	var studentModel = loopback.getModel(studentModelName);
        var studentData = {
                'name': 'Rahul',
                'departmentId': 2,
                'departmentName' : 'Science',
                'rollNumber': '5',
                'studentId': 5
            };
        studentModel.create(studentData, bootstrap.defaultContext, function (err, results) {
            expect(results.departmentName).to.equal('Science');
            done();
        });
  });
    
    it('Property Expression Test - Should get data from where instance query if property expression is provided and field is blank or not provided', function (done) {
    	  var studentModel = loopback.getModel(studentModelName);
          var studentData = {
                  'departmentId': 2,
                  'rollNumber': '6',
                  'studentId': 6
              };
          studentModel.create(studentData, bootstrap.defaultContext, function (err, results) {
        	  expect(results.name).to.equal('Rahul');
              done();
          });
    });
      
    it('Property Expression Test - Should get data from where identifier query if property expression is provided and field is blank or not provided', function (done) {
  	    var studentModel = loopback.getModel(studentModelName);        
        var studentData = {
                'rollNumber': '7',
                'studentId': 7
            };
        studentModel.create(studentData, bootstrap.defaultContext, function (err, results) {
      	  expect(results.departmentId).to.equal(2);
            done();
        });
  });
    
    it('Property Expression Test - Should get data from where callcontext query if property expression is provided and field is blank or not provided', function (done) {
    	  var studentModel = loopback.getModel(studentModelName);        
          var studentData = {
                  'rollNumber': '8',
                  'studentId': 8
              };
          studentModel.create(studentData, bootstrap.defaultContext, function (err, results) {
              expect(results.emailAddress).to.equal('test-user@mycompany.com');
              done();
          });
    });
    
});

