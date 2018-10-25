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
// var uuidv4 = require('uuid/v4');

describe(chalk.blue('OTP tests'), function () {

  var modelName = 'BaseOTP';
  var url = baseUrl + '/' + modelName;

  var data = {
    email: 'abc@abc.com',
    phone: '1234567890'
  };

  var otpId;
  var defaultContext = {
    ctx: {
      tenantId: 'test-tenant',
      remoteUser: 'test-user'
    }
  };

  function getOTPInstance(id, options, cb) {
    var baseOTP = bootstrap.app.models.BaseOTP;
    baseOTP.findOne({ 'id': id }, options, cb);
  }

  it('Send OTP - email and phone', function (done) {
    var postData = {
      'email': data.email,
      'phone': data.phone
    };
    var postUrl = url + '/send';

    var api = defaults(supertest(bootstrap.app));
    api.set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .post(postUrl)
      .send(postData)
      .expect(200)
      .end(function (err, response) {
        if (err) {
          done(err);
        } else {
          otpId = response.body.otpId;
          done();
        }
      });
  });

  it('Verify OTP - invalid', function (done) {
    var postData = {
      'otpId': otpId,
      'otp': 0
    };
    var postUrl = url + '/verify';

    var api = defaults(supertest(bootstrap.app));
    api.set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .post(postUrl)
      .send(postData)
      .end(function (err, response) {
        if (err) {
          done(err);
        } else {
          expect(response.error.message).to.be.equal.toString('Verification failed');
          done();
        }
      });
  });

  it('Resend OTP - check maximum retries 1', function (done) {
    var postData = {
      'otpId': otpId
    };
    var postUrl = url + '/resend';

    var api = defaults(supertest(bootstrap.app));
    api.set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .post(postUrl)
      .send(postData)
      .expect(200).end(function (err, response) {
        if (err) {
          done(err);
        } else {
          var status = response.body;
          done();
        }
      });
  });

  it('Resend OTP - check maximum retries 2', function (done) {
    var postData = {
      'otpId': otpId
    };
    var postUrl = url + '/resend';

    var api = defaults(supertest(bootstrap.app));
    api.set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .post(postUrl)
      .send(postData)
      .expect(200).end(function (err, response) {
        if (err) {
          done(err);
        } else {
          var status = response.body;
          done();
        }
      });
  });

  it('Resend OTP - check maximum retries 3', function (done) {
    var postData = {
      'otpId': otpId
    };
    var postUrl = url + '/resend';

    var api = defaults(supertest(bootstrap.app));
    api.set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .post(postUrl)
      .send(postData)
      .expect(200).end(function (err, response) {
        if (err) {
          done(err);
        } else {
          var status = response.body;
          done();
        }
      });
  });

  it('Resend OTP - exceeded maximum retries', function (done) {
    var postData = {
      'otpId': otpId
    };
    var postUrl = url + '/resend';

    var api = defaults(supertest(bootstrap.app));
    api.set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .post(postUrl)
      .send(postData)
      .end(function (err, response) {
        if (err) {
          done(err);
        } else {
          expect(response.body.error.message).to.be.equal('Exceeded maximum resend');
          done();
        }
      });
  });

  it('Verify OTP - valid', function (done) {
    var postData = {
      'otpId': otpId,
      'otp': 1234
    };
    var postUrl = url + '/verify';

    var api = defaults(supertest(bootstrap.app));
    getOTPInstance(otpId, defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        postData.otp = res.otp;
        api.set('Accept', 'application/json')
          .set('tenant_id', 'test-tenant')
          .post(postUrl)
          .send(postData)
          .expect(200).end(function (err, response) {
            if (err) {
              done(err);
            } else {
              var status = response.body.status;
              if (status === 'verified') {
                done();
              } else {
                done(new Error('Unable to verify'));
              }
            }
          });
      }
    });
  });

  it('Verify OTP - retry verified otp', function (done) {
    var postData = {
      'otpId': otpId,
      'otp': 1234
    };
    var postUrl = url + '/verify';

    var api = defaults(supertest(bootstrap.app));
    api.set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .post(postUrl)
      .send(postData)
      .end(function (err, response) {
        if (err) {
          done(err);
        } else {
          expect(response.body.error.message).to.be.equal('No record found');
          done();
        }
      });
  });

  after('after clean up', function (done) {
    done();
  });

});
