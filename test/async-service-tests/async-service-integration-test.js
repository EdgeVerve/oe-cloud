/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var request = require('request');

var chai = require('chai');
var expect = chai.expect;
var chalk = require('chalk');

const serviceName = process.env.APP_IMAGE_NAME;
const retryServiceName = process.env.RETRY_SERVICE_NAME;
const domainName = process.env.DOMAIN_NAME;

const serviceHost = serviceName + '.' + domainName;
const baseUrl = 'https://' + serviceHost + '/api/';
const baseRetryUrl = 'https://' + retryServiceName + '.' + domainName + '/api/';

const loginData = {'username': 'admin', 'password': 'admin'};
const testModelName = 'RetryTestModel';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var token;


describe(chalk.blue('retry integration tests'), function () {
  before('login to oecloud', function (done) {
    this.timeout(180000);
    console.log('Base Url is ', baseUrl);
    request.post(baseUrl + 'BaseUsers/login', { json: loginData }, function (error, response, body) {
      if (error || body.error) {
        console.log('error:', error || body.error);
        done(error || body.error);
      } else {
        token = body.id;
        done();
      }
    });
  });

  it('should post to async retry service wait 20 seconds and check that the post was successful', function (done) {
    var postData = {
      blabla: 'abcdefg',
      amount: 10,
      status: 'testing'
    };
    var url = baseRetryUrl + testModelName + '?access_token=' + token;
    var headers = {
      'x-host': serviceHost
    };
    var options = {
      url: url,
      headers: headers,
      json: postData
    };
    console.log('posting with ', options);
    request.post(options, function (error, response, body) {
      if (error || body.error) {
        console.log('error:', error || body.error);
        done(error || body.error);
      } else {
        console.log('post response body:', body);
        expect(response.statusCode).to.equal(200);
        expect(body.id).to.equal(postData.blabla);
        setTimeout(checkPost, 20000);
        function checkPost() {
          request.get(baseUrl + testModelName + '/' + postData.blabla + '?access_token=' + token, function (error, response, body) {
            if (error || body.error) {
              console.log('error:', error || body.error);
              done(error || body.error);
            } else {
              console.log('get response body:', body);
              body = JSON.parse(body);
              expect(response.statusCode).to.equal(200);
              expect(body).to.include(postData);
              done();
            }
          });
        }
      }
    });
  });
});
