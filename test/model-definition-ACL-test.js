/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * UnitTest Cases for Dynamically Create Model with ACLs  Using REST api's
 * ACLs applied on model are:
 * 	1) User to be denied to findById
 *  2) Users under Guest Role to be denied to create/insert data.
 *  3) $everyone to deny get count.
 *
 *
 * Steps involved :
 * 		1) Create two user.													 POST /BaseUsers
 * 		2) Create role : Guest				 								 POST /Roles
 * 		3) Map user2 to the Guest role using 								 POST /Roles/{id}/principals api
 * 		4) Create model with above listed ACLs.								 POST /ModelDefinition
 * 		5) Login using User1 credentials.	 								 Post /BaseUser/login
 * 			use the id(AccessToken).
 * 		6) Insert data into the model. use accessToken provided during login.POST /modelName?access_token=<value>
 * 		7) Find the data Inserted using ID,should not be allowed asper ACL1. GET /modelName/{id}?access_token=<value>
 *		8) Logout User1														 POST /BaseUsers/logout?access_token
 *		9) Login User2 who is mapped to Guest role							 Post /BaseUser/login
 *		10)Insert into model, should not be allowed asper ACL2				 POST /modelName?access_token=<value>
 *		11)Logout user2														 POST /BaseUsers/logout?access_token
 *		12)Get the count of records in Model, should not allow asper ACL3	 GET /modelName/counts
 *@author sivankar jain
 */

var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;
var models = bootstrap.models;
var supertest = require('supertest');
var defaults = require('superagent-defaults');
var loopback = require('loopback');
var baseUrl = bootstrap.basePath;
var modelDefitnionUrl = bootstrap.basePath + '/ModelDefinitions';

var chai = require('chai');
chai.use(require('chai-things'));

var api = bootstrap.api;

var app = bootstrap.app;
var supertest = require('supertest');
var api1 = supertest(app);

var debug = require('debug')('model-definition-ACL-test');

describe(chalk.blue('model-definition-ACL'), function () {
  after('destroy context', function (done) {
    done();
    //commented as pre-defined roles and users gets deleted
    /*
        models.BaseUser.destroyAll(function () {
            //console.log('model-definition-ACL-test    clean up - BaseUser');
        });

        var model = loopback.getModel('ModelDefinitionHistory');
        if (model) {
            model.destroyAll(function (err, info) { 
                console.log('model-definition-ACL-test    clean up - ModelDefinitionHistory');
            });
        }

        models.BaseRole.destroyAll(function () {
            //console.log('model-definition-ACL-test    clean up - ModelDefinition');
        });

        models.BaseRoleMapping.destroyAll(function () {
            //console.log('model-definition-ACL-test    clean up - ModelDefinition');
        });

        models.ModelDefinition.destroyAll(function () {
            //console.log('model-definition-ACL-test    clean up - ModelDefinition');
            done();
        });
   */

  });

  describe(chalk.yellow('Dynamically create model with ACL using ModelDefinition' +
    ' and check if ACLs are applied  --using REST APIs'), function () {

      this.timeout(20000);

      var BaseUser = {
        'username': 'TestUser1',
        'email': 'TestUser1@ev.com',
        'tenantId': 'test-tenant',
        'password': 'password++'
      };
      var userId1, userId2;
      var modelName = 'TestRoleWithACLOne';
      var plural = 'TestRolesWithACLsss';
      var dataId;
      var accessToken, accessToken2;
      var roleId;

      var BaseUser2 = {
        'username': 'TestUser2',
        'email': 'TestUser2@ev.com',
        'tenantId': 'test-tenant',
        'password': 'password++'
      };

      it('create user1  -- using POST /BaseUsers ', function (done) {
        api.post(baseUrl + '/BaseUsers')
          .send(BaseUser)
          .expect(200).end(function (err, res) {
            debug('response body : ' + JSON.stringify(res.body, null, 4));
            if (err || res.body.error) {
              done(err || (new Error(res.body.error.details.messages.name[0])));
            } else {
              userId1 = res.body.id;
              done();
            }
          });
      });

      it('create user2  -- using POST /BaseUsers ', function (done) {

        api.post(baseUrl + '/BaseUsers')
          .send(BaseUser2)
          .expect(200).end(function (err, res) {
            debug('response body : ' + JSON.stringify(res.body, null, 4));
            if (err || res.body.error) {
              done(err || (new Error(res.body.error.details.messages.name[0])));
            } else {
              userId2 = res.body.id;
              done();
            }
          });
      });

      it('Create Role ', function (done) {
        var postData = {
          name: 'Guest'
        };
        var postUrl = baseUrl + '/BaseRoles';

        api
          .post(postUrl)
          .send(postData)
          .expect(200).end(function (err, res) {
            if (err || res.body.error) {
              done(err || (new Error(res.body.error.details.message)));
            } else {
              roleId = res.body.id;
              done();
            }
          });
      });

      it('Map user2 to the Role', function (done) {

        var postData = {
          'principalType': 'USER',
          'principalId': userId2
        };

        var postUrl = baseUrl + '/BaseRoles/' + roleId + '/principals';

        api
          .post(postUrl)
          .send(postData)
          .expect(200).end(function (err, res) {
            debug('response body : ' + JSON.stringify(res.body, null, 4));
            if (err || res.body.error) {
              done(err || (new Error(res.body.error.details.message)));
            } else {
              done();
            }
          });
      });

      it('Dynamically Create model with ACL for user ', function (done) {

        var aclUser = {
          'principalType': 'USER',
          'principalId': userId1,
          'permission': 'DENY',
          'property': 'findById'
        };

        var aclRole = {
          'principalType': 'ROLE',
          'principalId': 'Guest',
          'permission': 'DENY',
          'property': 'create'
        };

        var aclDenyEveryone = {
          'principalType': 'ROLE',
          'principalId': '$everyone',
          'permission': 'DENY',
          'property': 'count'
        };
        var postData = {
          name: modelName,
          base: 'BaseEntity',
          properties: {
            'name': 'string'
          },
          plural: plural,
          acls: []
        };
        postData.acls.push(aclUser);
        postData.acls.push(aclRole);
        postData.acls.push(aclDenyEveryone);
        api
          .post(modelDefitnionUrl)
          .send(postData)
          .expect(200).end(function (err, res) {
            debug('response body : ' + JSON.stringify(res.body, null, 4));
            if (err || res.body.error) {
              done(err || (new Error(res.body.error.details.message)));
            }
            else {
              var model = res.body;
              expect(model).not.to.be.null;
              expect(model.acls).to.deep.include.members(postData.acls); //.to.be.eql(postData.acls);
              expect(model.properties).not.to.be.undefined;

              return done()
            };
          });
      });

      it('Login Test user1 to check for ACLs for type USER ', function (done) {
        var postData = {
          'username': BaseUser.username,
          'password': BaseUser.password
        };
        var postUrl = baseUrl + '/BaseUsers/login';

        api
          .post(postUrl)
          .send(postData)
          .expect(200).end(function (err, res) {
            //console.log('respose data - ',res.body,res.header);
            debug('response body : ' + JSON.stringify(res.body, null, 4));
            if (err || res.body.error) {
              done(err || (new Error(res.body.error.message)));
            } else {
              accessToken = res.body.id;
              done();
            }
          });

      });

      it('Insert into recently created model By USER 1', function (done) {
        var postData = {
          'name': 'TestDataOne'
        };
        var postUrl = baseUrl + '/' + plural + '?access_token=' + accessToken;
        //console.log('postUrl - ',postUrl);
        api
          .post(postUrl)
          .send(postData)
          .end(function (err, res) {
            expect(res.status, 200);
            debug('response body : ' + JSON.stringify(res.body, null, 4));
            if (err || res.body.error) {
              done(err || (new Error(res.body.error.message)));
            } else {
              dataId = res.body.id;
              done();
            }
          });
      });

      it('shoult not be Authorized to Find records for USER 1', function (done) {
        var postUrl = baseUrl + '/' + plural + '/' + dataId + '?access_token=' + accessToken;
        console.log(postUrl);
        api1
          .get(postUrl)
          .set('tenant_id', 'test-tenant')
          .set('remote_user', BaseUser.username)
          .send()
          .end(function (err, res) {
            expect(res.status, 401);
            debug('response body : ' + JSON.stringify(res.body, null, 4));
            if (err) {
              done(err);
            } else {
              done();
            }
          });

      });

      it('Logout User 1', function (done) {
        var postUrl = baseUrl + '/BaseUsers/logout?access_token=' + accessToken;
        var api1 = defaults(supertest(app));
        api1
          .post(postUrl)
          .expect(204).end(function (err, res) {
            debug('response body : ' + JSON.stringify(res.body, null, 4));
            if (err || res.body.error) {
              done(err || (new Error(res.body.error.message)));
            } else {
              done();
            }
          });

      });

      it('Login Test user2 to check for ACLs for type ROLE ', function (done) {
        var postData = {
          'username': BaseUser2.username,
          'password': BaseUser2.password
        };
        var postUrl = baseUrl + '/BaseUsers/login';

        api
          .post(postUrl)
          .send(postData)
          .expect(200).end(function (err, res) {
            debug('response body : ' + JSON.stringify(res.body, null, 4));
            if (err || res.body.error) {
              done(err || (new Error(res.body.error.message)));
            } else {
              accessToken2 = res.body.id;
              done();
            }
          });

      });

      it('Should not be allowed to Insert data into model for USER 2 Guest Role ', function (done) {
        var postData = {
          'name': 'TestDataTwoThree'
        };
        var postUrl = baseUrl + '/' + plural + '?access_token=' + accessToken2;

        api1
          .post(postUrl)
          .set('tenant_id', 'test-tenant')
          .set('remote_user', BaseUser2.username)
          .send(postData)
          .expect(401).end(function (err, res) {
            debug('response body : ' + JSON.stringify(res.body, null, 4));
            if (err) {
              done(err);
            } else {
              done();
            }
          });
      });

      it('Logout User 2', function (done) {

        var postUrl = baseUrl + '/BaseUsers/logout?access_token=' + accessToken2;

        api
          .post(postUrl)
          .expect(204).end(function (err, res) {
            debug('response body : ' + JSON.stringify(res.body, null, 4));
            if (err || res.body.error) {
              done(err || (new Error(res.body.error.message)));
            } else {
              done();
            }
          });
      });

      it('Should not be allowed any one to get Count ', function (done) {

        var postUrl = baseUrl + '/' + plural + '/count';

        api
          .get(postUrl)
          .set('tenant_id', 'test-tenant')
          .set('remote_user', BaseUser2.username)
          .send()
          .expect(401).end(function (err, res) {
            debug('response body : ' + JSON.stringify(res.body, null, 4));
            if (err) {
              done(err);
            } else {
              done();
            }
          });
      });

      xit('create user  using post /BaseUsers/signUp', function (done) {
        var BaseUser = {
          'email': 'TestAdmin2@mycompany.com',
          'password': 'Admin2',
          'subscriptionType': 'Standard',
          'organizationName': 'infy'
        };

        api.post(baseUrl + '/BaseUsers/signUp')
          .send(BaseUser)
          .expect(200).end(function (err, res) {
            //console.log('response body : ' + JSON.stringify(res.body,null,4));
            debug('response body : ' + JSON.stringify(res.body, null, 4));
            if (err || res.body.error) {
              done(err || (new Error(res.body.error.message)));
            } else {
              done();
            }
          });
      });
    });
});