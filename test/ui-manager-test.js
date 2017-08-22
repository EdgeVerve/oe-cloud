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
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var baseUrl = bootstrap.basePath;

var options;
var accessToken;
describe(chalk.blue('ui-manager-test'), function () {
  this.timeout(10000);

  before('prepare test data', function (done) {
    options = {};
    options.ignoreAutoScope = true;
    options.fetchAllScopes = true;
    bootstrap.login(function (token) {
      accessToken = token;
      done();
    });
  });

  it('Creates the UIRoute, NavigationLink and UIComponent entries', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var postUrl = '/api/UIManagers/generate/Literal';
    api.set('Authorization', accessToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .post(postUrl)
      .send({})
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).to.exist;
          expect(result.body.status).to.be.true;
          expect(result.body.messages).to.exist.and.be.an('array');
          expect(result.body.messages.length).to.equal(3);
          expect(result.body.messages).all.to.satisfy(function(item){
            return item.endsWith('-created');  
          });
          done();
        }
      });
  });

  it('Returns error if model is not found', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var postUrl = '/api/UIManagers/generate/InvalidModel';
    api.set('Authorization', accessToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .post(postUrl)
      .send({})
      .expect(500)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).to.exist;
          expect(result.body.error).to.exist;
          expect(result.body.error.status).to.be.false;
          expect(result.body.error.messages).to.exist.and.be.an('array');
          expect(result.body.error.messages.length).to.equal(1);
          expect(result.body.error.messages[0]).to.equal('invalid-model-name');
          done();
        }
      });
  });


  it('Calling /generate second time returns appropriate message', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var postUrl = '/api/UIManagers/generate/Literal';
    api.set('Authorization', accessToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .post(postUrl)
      .send({})
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {          
          expect(result.body).to.exist;
          expect(result.body.status).to.be.true;
          expect(result.body.messages).to.exist.and.be.an('array');
          expect(result.body.messages.length).to.equal(3);
          expect(result.body.messages).all.to.satisfy(function(item){
            return item.endsWith('-already-defined');  
          });
          done();
        }
      });
  });
});
