var request = require('request');

// var uuid = require('node-uuid');
var chai = require('chai');
var expect = chai.expect;
var chalk = require('chalk');

const serviceName = process.env.APP_IMAGE_NAME;
const domainName = process.env.DOMAIN_NAME;

const serviceHost = serviceName + '.' + domainName;
const baseUrl = 'https://' + serviceHost; 

const loginData = {'username': 'admin', 'password': 'admin'};

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var token;


describe(chalk.blue(''), function () {
  it('should login through ldap', function (done) {
    this.timeout(10000);
    console.log('Base Url is ', baseUrl);
    request.post(baseUrl + '/auth/ldap', { json: loginData }, function (error, response, body) {
      if (error || body.error) {
        console.log('error:', error || body.error);
        done(error || body.error);
      } else {
        expect(response.statusCode).to.equal(200);
        expect(body.access_token).to.be.ok;
        expect(body.userId).to.be.ok;
        done();
      }
    });
  });
});
