/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var bootstrap = require('./bootstrap');
var chai = require('chai');
chai.use(require('chai-things'));
var expect = chai.expect;
var app = bootstrap.app;
var defaults = require('superagent-defaults');
var supertest = require('supertest');
let api = defaults(supertest(app));

describe('JWT For Access Token', function(){

  this.timeout(20000);
  let accessToken;
  before('Setting up JWT_FOR_ACCESS_TOKEN env variable', (done) => {
    process.env.JWT_FOR_ACCESS_TOKEN = true;
    done();
  });

  before('Login', (done) => {
    let testUser = {
      username: 'testuser',
      password: 'testuser123'
    };
    bootstrap.login(testUser, (returnedToken) => {
      expect(returnedToken).to.be.defined;
      accessToken = returnedToken;
      done();
    });
  });

  it('Access User with id with JWT token passed as access_token query', (done) => {
    expect(accessToken).to.be.defined;
    // 20 is the userId of the test-user created in bootstrap.
    let url = bootstrap.basePath + '/BaseUsers' + '/20' + '?access_token=' + accessToken;
    api
      .get(url)
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res).to.be.defined;
        expect(res.body).to.be.defined;
        expect(res.body.id).to.be.defined;
        expect(res.body.username).to.be.defined;
        // Converting to String & comparing the same, since id fields are string type in Postgres, Oracle.
        expect(res.body.id.toString()).to.be.equal('20');
        expect(res.body.username).to.be.equal('testuser');
        done();
      });
  });

  it('Access User with id with JWT token passed as x-jwt-assertion header', (done) => {
    expect(accessToken).to.be.defined;
    // 20 is the userId of the test-user created in bootstrap.
    let url = bootstrap.basePath + '/BaseUsers' + '/20';
    api
      .get(url)
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .set('x-jwt-assertion', accessToken)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res).to.be.defined;
        expect(res.body).to.be.defined;
        expect(res.body.id).to.be.defined;
        expect(res.body.username).to.be.defined;
        // Converting to String & comparing the same, since id fields are string type in Postgres, Oracle.
        expect(res.body.id.toString()).to.be.equal('20');
        expect(res.body.username).to.be.equal('testuser');
        done();
      });
  });

  after('Removing the JWT_FOR_ACCESS_TOKEN env variable', (done) => {
    delete process.env.JWT_FOR_ACCESS_TOKEN;
    done();
  });

});