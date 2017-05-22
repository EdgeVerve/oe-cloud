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

describe(chalk.blue('misclaneous-test'), function() {
	this.timeout(10000);

    var accessToken = '';

    before('prepare test data', function(done) {
        var postData = {
            'username': 'admin',
            'password': 'admin'
        };

        var postUrl = baseUrl + '/BaseUsers/login';

        // without jwt token
        var api = defaults(supertest(bootstrap.app));
        api.set('Accept', 'application/json')
        .set('tenant_id', 'default')
        .post(postUrl)
        .send(postData)
        .expect(200).end(function(err, response) {
            
            accessToken = response.body.id;
            done();
        });
    });

    it('switch tenant', function(done) {
        var data = {
            tenantId: 'new-tenant'
        };
        var api = defaults(supertest(bootstrap.app));
        var postUrl = baseUrl + '/BaseUsers/switch-tenant?access_token='  + accessToken;
        api.set('Accept', 'application/json')
        .post(postUrl)
        .send(data)
        .expect(200)
        .end(function(err, result) {
            if (err) {
                done(err);
            } else {
                expect(result.body).not.to.be.undefined;
                expect(result.body.tenantId).to.be.equal('new-tenant');
                done();
            }
        });
    });

	
    it('getinfo', function(done) {
        var api = defaults(supertest(bootstrap.app));
        var url = baseUrl + '/dev/getinfo?access_token='  + accessToken;
        api.get(url)
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err, result) {
            if (err) {
                done(err);
            } else {
                expect(result.body).not.to.be.undefined;
                expect(result.body.callContext).not.to.be.undefined;
                done();
            }
        });
    });
   
    it('checkACL', function(done) {
        var api = defaults(supertest(bootstrap.app));
        var url = baseUrl + '/dev/checkACL/Literal/create?access_token='  + accessToken;
        api.get(url)
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err, result) {
            if (err) {
                done(err);
            } else {
                expect(result.body).not.to.be.undefined;
                done();
            }
        });
    });
});
