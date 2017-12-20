/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * UnitTest Cases for Auto Fields
 *
 * @author Ajith Vasudevan
 */

var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;
var loopback = require('loopback');
var models = bootstrap.models;
var chai = require('chai');
var api = bootstrap.api;
chai.use(require('chai-things'));

var accessToken;


describe('Auto Fields Test', function() {

    this.timeout(30000);

    var model = null;
    var modelId = null;

    before('create models', function (done) {
      bootstrap.login(function (token) {
        accessToken = token;
        //return done();

        models.ModelDefinition.create({
          name: 'AutoFieldTestModel',
          base: 'BaseEntity',
          plural: 'AutoFieldTestModels',
          mixins: {
            "AutoFieldsMixin": true,
          },
          properties: {
            'user': {
              'type': 'string',
              'setval': "CALLCONTEXT.ctx.remoteUser"
            },
            'headerValue': {
              'type': 'string',
              'setval': "CTX.somekey"
            },
            'email': {
              'type': 'string',
              'setval': "USER.email"
            },
            'ctxObj': {
              'type': 'object',
              'setval': "CTX"
            }
          }
        }, bootstrap.defaultContext, function (err, afModel) {
          if (err) {
            done(err);
          } else {
            expect(err).to.be.null;
            modelId = afModel.id;
            done();
          }
        });
      });


    });

    after('cleanup', function(done) {
        models.ModelDefinition.destroyAll({ "id": modelId }, bootstrap.defaultContext, function(err, data) {
            done();
        });
    });


    it('should create a model instance with auto-populated values', function(done) {
        model = loopback.findModel('AutoFieldTestModel', bootstrap.defaultContext);
        expect(model).not.to.be.null;
        expect(model).not.to.be.undefined;
        var data = {
        };
        // Passing access_token as query param, rather than header, it was not used anywhere
        // It was passing before since jwt-assertion.js middleware gets triggered by default
        // and get it authenticated with x-jwt-assertion which was set in bootstrap.js
        // , i.e. if we set the jwt-assertion to "enabled": false, the test case is getting failed.
        api.set('Accept', 'application/json')
          .post(bootstrap.basePath + '/AutoFieldTestModels?access_token='+ accessToken)
          .set('somekey', 'k')
          //.set('Cookie', [_version])
          .send(data)
          .end(function (err, resp) {
            expect(resp.status).to.be.equal(200);
            expect(resp.body.headerValue).to.equal('k');
            expect(resp.body.user).to.equal('testuser');
            expect(resp.body.email).to.equal('testuser@mycompany.com');
            done(err);
          });
    });
});