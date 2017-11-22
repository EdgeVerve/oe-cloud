/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var request = require('request');

// var uuid = require('node-uuid');
var chai = require('chai');
var expect = chai.expect;
var chalk = require('chalk');
var async = require('async');

const serviceName = process.env.APP_IMAGE_NAME;
const domainName = process.env.DOMAIN_NAME;

//const serviceHost = serviceName + '.' + domainName;
const baseUrl = 'http://localhost:3001' //'https://' + serviceHost;

const johnLoginData = {'username': 'john', 'password': 'johnpass'};

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var token;
var johnUserId;

function login(loginData, cb) {
  request.post(baseUrl + '/auth/ldap', { json: loginData }, function (error, response, body) {
    if (error || body.error) {
      console.log('error:', error || body.error);
      cb(error || body.error);
    } else {
      expect(response.statusCode).to.equal(200);
      expect(body.access_token).to.be.ok;
      expect(body.userId).to.be.ok;
      token = body.access_token;
      cb(null, body.userId);
    }
  });
}

describe(chalk.blue(''), function () {
  it('should login through ldap', function (done) {
    this.timeout(10000);
    console.log('Base Url is ', baseUrl);
    login(johnLoginData, function(err, userId) {
      done(err);
    });
  });

  it('should create roleMapping based on ldapRoleMapping', function (done) {
    this.timeout(10000);
    async.series([createRole, createLdapRoleMapping, johnLogin, assertRoleMapping], (err)=>{
      return done(err);
    });
  });
});

function createRole(cb) {
  var role = {
    name: 'customer',
    id: 'customer'
  };
  request.post(baseUrl + '/api/BaseRoles/?access_token=' + token, { json: role }, (error, response, body) => {
    if (error || body.error) {
      console.log('error:', error || body.error);
      return cb(error || body.error);
    }
    expect(response.statusCode).to.equal(200);
    cb();
  });
}

function createLdapRoleMapping(cb) {
  var ldapRoleMapping = {
    groupName: 'cn=bank-customers,ou=groups,dc=example,dc=org',
    roles: ['customer']
  };
  request.post(baseUrl + '/api/LdapRoleMappings?access_token=' + token, { json: ldapRoleMapping }, (error, response, body) => {
    if (error || body.error) {
      console.log('error:', error || body.error);
      return cb(error || body.error);
    }
    expect(response.statusCode).to.equal(200);
    cb();
  });
}

function johnLogin(cb){
    login(johnLoginData, (err, userId) => {
      if (err) {
        return cb(err);
      }
      johnUserId = userId;
      cb();
    });
}

function assertRoleMapping(cb) {
  var queryString = {
    access_token: token,
    filter: {
        where: {
            roleId: 'customer'
        }
    }
  };
  request.get(baseUrl + '/api/BaseRoleMappings', { qs: queryString, json: true }, (error, response, body) => {
    if (error || body.error) {
      console.log('error:', error || body.error);
      return cb(error || body.error);
    }
    expect(response.statusCode).to.equal(200);
    expect(body.length).to.equal(1);
    expect(body[0].roleId).to.equal('customer');
    expect(body[0].principalId).to.equal(johnUserId);
    return cb();
  });
}
