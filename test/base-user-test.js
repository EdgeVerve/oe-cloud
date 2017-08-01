/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var bootstrap = require('./bootstrap');
var chalk = require('chalk');
var api = bootstrap.api;
var baseUrl = bootstrap.basePath;
var access_token;
describe(chalk.blue('BaseUser Test'), function () {
    before('Create User', function(done) {
        var credentials = {
            username: 'basetestuser',
            password:  'basetestuser123'
        };
        var testUser = {
            username: credentials.username,
            password: credentials.password,
            email: 'basetestuser@mycompany.com',
            tenantId: 'test-tenant',
            id: 21
        };
        bootstrap.createTestUser(testUser, 'admin', function() {
            bootstrap.login(credentials, function(accessToken) {
                access_token = accessToken;
                done();
            });
        });
    });
    it('Get Session without access_token', function(done) {
        var url = baseUrl + '/BaseUsers/session';
        api.set('Accept', 'application/json')
            .set('tenant_id', 'test-tenant')
            .get(url)
            .expect(200).end(function(err, response) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Get Session with access_token', function(done) {
        var url = baseUrl + '/BaseUsers/session?access_token=' + access_token;
        api.set('Accept', 'application/json')
            .set('tenant_id', 'test-tenant')
            .get(url)
            .expect(200).end(function(err, response) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
});