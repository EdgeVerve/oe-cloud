/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

var bootstrap = require('./bootstrap');
var chalk = require('chalk');
var log = require('oe-logger')('concurrency-test');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var defaults = require('superagent-defaults');
var supertest = require('supertest');

describe(chalk.blue('concurrency-test'), function() {
    this.timeout(2000);
    var testModelName = 'MyConcurrentModel';
    var url = bootstrap.basePath + '/' + testModelName + 's';
    var testModelDetails = {
        name: testModelName,
        base: 'BaseEntity',
        properties: {
            'name': {
                'type': 'string',
            },
            'description': {
                'type': 'string',
            }
        },
        dataSourceName: 'db'
    };

    var ModelDefinition = bootstrap.models.ModelDefinition;

    before('create model', function(done) {
        var model = bootstrap.models[testModelName];
        if (model) {
            done();
        } else {
            ModelDefinition.create(testModelDetails, bootstrap.defaultContext, function(err, res) {
                if (err) {
                    console.log('unable to create model ', err);
                    done(err);
                } else {
                    var model = bootstrap.models[testModelName];
                    model.evObserve('before save', function testBeforeSaveFnConc(ctx, next) {
                        process.nextTick(function() {
                            next();
                        });
                    });
                    done();
                }
            });
        }
    });
    var user1 = {
        'username': 'foo',
        'password': 'bar',
        'email': 'foo@gmail.com',
        'tenantId': 'test-tenant'
    };
    before('create model', function(done) {
        bootstrap.createTestUser(user1, 'admin', done);
    });

    var accessToken = '';

    it('login', function(done) {
        var postData = {
            'username': user1.username,
            'password': user1.password
        };
        var postUrl = bootstrap.basePath + '/BaseUsers/login?some_param=abcd';

        // without jwt token
        var api = defaults(supertest(bootstrap.app));
        api.set('Accept', 'application/json')
            .set('tenant_id', 'test-tenant')
            .post(postUrl)
            .send(postData)
            .expect(200).end(function(err, response) {
                accessToken = response.body.id;
                done();
            });
    });

    var savedInstance;
    var data = {
        'name': 'Name1',
        'description': 'OK'
    };


    it('create and find data ', function(done) {
        var model = bootstrap.models[testModelName];
        model.destroyAll({}, bootstrap.defaultContext, function(err, res) {
            model.create(data, bootstrap.defaultContext, function(err, res) {
                model.find({
                    'where': {
                        'name': 'Name1'
                    }
                }, bootstrap.defaultContext, function(err, res) {
                    savedInstance = res[0];
                    log.debug(bootstrap.defaultContext, 'verify data ', err, res);
                    expect(res[0].description).to.be.equal('OK');
                    res[0].reload(bootstrap.defaultContext, function(err, reload) {
                        expect(reload.description).to.be.equal('OK');
                        done();
                    });
                });
            });
        });
    });

    it('concurrency with url', function(done) {
        var count = 0;
        var errorCount = 0;
        var concurrentData1 = JSON.parse(JSON.stringify(savedInstance));
        concurrentData1.name = 'Name2';
        var concurrentData2 = JSON.parse(JSON.stringify(savedInstance));
        concurrentData2.name = 'Name3';
        var api = defaults(supertest(bootstrap.app));

        var postUrl = url + '?access_token=' + accessToken;

        api.set('Accept', 'application/json')
            .put(postUrl)
            .send(concurrentData1)
            .end(function(err, resp) {
                count++;
                if (err || resp.status !== 200) {
                    errorCount++;
                } else {
                    savedInstance = resp.body;
                }
                if (count === 2) {
                    if (errorCount === 1) {
                        done();
                    } else {
                        done(new Error('concurrent updates are overwriting each other'));
                    }
                }

            });

        api.set('Accept', 'application/json')
            .put(postUrl)
            .send(concurrentData2)
            .end(function(err, resp) {
                count++;
                if (err || resp.status !== 200) {
                    errorCount++;
                } else {
                    savedInstance = resp.body;
                }
                if (count === 2) {
                    if (errorCount === 1) {
                        done();
                    } else {
                        done(new Error('concurrent updates are overwriting each other'));
                    }
                }
            });
    });

    it('concurrency with js', function(done) {
        var count = 0;
        var errorCount = 0;
        var model = bootstrap.models[testModelName];
        var concurrentData1 = JSON.parse(JSON.stringify(savedInstance));
        concurrentData1.name = 'Name2';
        var concurrentData2 = JSON.parse(JSON.stringify(savedInstance));
        concurrentData2.name = 'Name3';

        model.upsert(concurrentData1, bootstrap.defaultContext, function(err, data) {
            if (err) {
                errorCount++;
            }
            count++;
            if (count === 2) {
                if (errorCount === 1) {
                    done();
                } else {
                    done(new Error('concurrent updates are overwriting each other'));
                }
            }
        });
        model.upsert(concurrentData2, bootstrap.defaultContext, function(err, data) {
            if (err) {
                errorCount++;
            }
            count++;
            if (count === 2) {
                if (errorCount === 1) {
                    done();
                } else {
                    done(new Error('concurrent updates are overwriting each other'));
                }
            }
        });
    });

});
