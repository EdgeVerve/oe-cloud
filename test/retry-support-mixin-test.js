/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

/* 
 * @author David Zharnest
 */
var loopback = require('loopback');
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var app = bootstrap.app;
var uuid = require('node-uuid');
var chai = require('chai');
var expect = chai.expect;
var logger = require('oe-logger');
var log = logger('retry-support-test');

var api = bootstrap.api;

var accessToken;

var modelId;

function apiRequest(url, postData, callback, done) {
    var version = uuid.v4();
    postData._version = version;
    api
        .set('Accept', 'application/json')
        .post(bootstrap.basePath + url + '?access_token=' + accessToken)
        .send(postData)
        .end(function(err, res) {
            if (err || res.body.error) {
                log.error(err || (new Error(JSON.stringify(res.body.error))));
                return done(err || (new Error(JSON.stringify(res.body.error))));
            } else {
                return callback(res);
            }
        });
}

describe(chalk.blue('retry-support-tests'), function() {
    this.timeout(30000);

    before('login using admin', function fnLogin(done) {
        var sendData = {
            'username': 'admin',
            'password': 'admin'
        };

        api
            .post(bootstrap.basePath + '/BaseUsers/login')
            .send(sendData)
            .expect(200).end(function(err, res) {
                if (err) {
                    log.error(err);
                    return done(err);
                } else {
                    accessToken = res.body.id;
                    return done();
                }
            });
    });

    before('create test models', function createModels(done) {
        var modelDefinition = loopback.findModel('ModelDefinition');
        var data = {
            'name': 'TestRetryAccount',
            'base': 'BaseEntity',
            'properties': { 
                'yodels': {
                    'type':'string',
                    'id':true
                }
            },
            'mixins': {
                'RetrySupportMixin': true
            },
            'options': {
                stateThreshold: 1
            }
        };

        modelDefinition.create(data, bootstrap.defaultContext, function (err, res) {
            if (err) { 
                return done(err);
            }
            modelId = res.id.toString();
            done();
        });
    });


    it('check that it is retryable', function(done) {

            api
                .set('Accept', 'application/json')
                .get(bootstrap.basePath + '/TestRetryAccounts/isRetryable?access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        return done(err);
                    } else {
                        expect(res.body).to.be.equal('true');
                        return done();
                    }
                });
            
    });

    it('check that the id is yodels', function(done) {

            api
                .set('Accept', 'application/json')
                .get(bootstrap.basePath + '/TestRetryAccounts/primaryKeyField?access_token=' + accessToken)
                .send()
                .end((err, res) => {
                    if (err) {
                        log.error(err);
                        return done(err);
                    } else {
                        expect(res.body.name).to.be.equal('yodels');
                        return done();
                    }
                });
            
    });

    var deleteContext = {fetchAllScopes: true, ctx: {tenantId: 'test-tenant'}};

    after('delete all the test accounts', function(done) {
        var testAccount = loopback.getModel('TestRetryAccount');
        testAccount.destroyAll({}, deleteContext, function(err) {
            if (err) {
                log.error(err);
                return done(err);
            } else {
                return done();
            }
        });
    });

    after('delete all modelDefinition models', function(done) {
        var modelDefinition = loopback.findModel('ModelDefinition');
        modelDefinition.destroyById(modelId, bootstrap.defaultContext, function(err, res) {
                            if (err) {
                                done(err);
                            } else {
                                done();
                            }
                   });
    });
});
