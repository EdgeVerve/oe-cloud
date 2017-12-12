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
var uuidv4 = require('uuid/v4');

describe(chalk.blue('basic-test-api'), function() {

    var modelName = 'ItemModel';
    var plural = modelName + 's';
    var url = baseUrl + '/' + plural;

    this.timeout(30000);

    var user1 = {
        'username': 'foo',
        'password': 'bar',
        'email': 'foo@mycompany.com',
        'tenantId': 'test-tenant'
    };

    var accessToken = '';
    var idValue = uuidv4();

    before('create model', function(done) {
        bootstrap.createTestUser(user1, 'admin', done);
    });

    it('login', function(done) {
        var postData = {
            'username': user1.username,
            'password': user1.password
        };
        var postUrl = baseUrl + '/BaseUsers/login?some_param=abcd';

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

    it('Create Model', function(done) {
        var modelDefinitionData = {
            'name': modelName,
            'plural': plural,
            'base': 'BaseEntity',
            'idInjection': false,
            'options': {
                'validateUpsert': true
            },
            'properties': {
                'orgId': {
                    'type': 'string',
                    'id': true
                },
                'name': {
                    'type': 'string',
                },
                'field1': {
                    'pattern2': '^abc',
                    'type': 'string'
                },
                'field2': {
                    'in': ['value1', 'value2'],
                    'type': 'string'
                },
                'field3': {
                    type: 'number',
                    'max': 2000
                },
                'birthDate': {
                    'type': 'date'
                },
                'fromTime': {
                    'type': 'timestamp'
                },
                'toTime': {
                    'type': 'timestamp'
                },
                'emailId': {
                    'type': 'email'
                },
                'mynumber': {
                    'type': 'number'
                }
            },
            'validations': [],
            'relations': {
            },
            'acls': [],
            'methods': {},
            'hidden': []
        };

        var api = defaults(supertest(bootstrap.app));

        var postUrl = baseUrl + '/ModelDefinitions?access_token=' + accessToken;


        api.set('Accept', 'application/json')
            .post(postUrl)
            .send(modelDefinitionData)
            .end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    if (resp.status === 400) {
                        done();
                    } else if (resp.status === 422) {
                        done();
                    } else {
                        expect(200);
                        done();
                    }
                }
            });
    });

    it('Create data', function(done) {
        var api = defaults(supertest(bootstrap.app));

        var postUrl = url + '?access_token=' + accessToken;
        var data = {
            name: 'rsr',
            orgId: idValue,
            birthDate: '2016-01-18',
            fromTime: '2016-01-02T01:00:00.000Z',
            toTime: '2016-01-02T23:00:00.000Z',
            emailId: 'abc@dad.com',
            field1: 'vasad'
        };

        api.set('Accept', 'application/json')
            .post(postUrl)
            .send(data)
            .end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    //console.log(resp.status, resp.body);
                    if (resp.status === 400) {
                        done();
                    } else if (resp.status === 422) {
                        if (resp.body.error && resp.body.error.details && resp.body.error.details.messages) {
                            console.log(resp.body.error.details.messages.errs);
                        }
                        done();
                    } else {
                        expect(200);
                        done();
                    }
                }
            });
    });

    it('Create data in array', function(done) {
        var api = defaults(supertest(bootstrap.app));

        var postUrl = url + '?access_token=' + accessToken;
        var data = [{
            name: 'abc1',
            orgId: uuidv4(),
            birthDate: '2016-01-18',
            fromTime: '2016-01-02T01:00:00.000Z',
            toTime: '2016-01-02T23:00:00.000Z',
            emailId: 'abc1@dad.com',
            field1: 'vasad'
        }, {
            name: 'abc2',
            orgId: uuidv4(),
            birthDate: '2016-01-19',
            fromTime: '2016-01-02T01:00:00.000Z',
            toTime: '2016-01-02T23:00:00.000Z',
            emailId: 'abc2@dad.com',
            field1: 'vasad'
        },
        ];

        api.set('Accept', 'application/json')
            .post(postUrl)
            .send(data)
            .end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    //console.log(resp.status, resp.body);
                    if (resp.status === 400) {
                        done();
                    } else if (resp.status === 422) {
                        if (resp.body.error && resp.body.error.details && resp.body.error.details.messages) {
                            console.log(resp.body.error.details.messages.errs);
                        }
                        done();
                    } else {
                        expect(200);
                        done();
                    }
                }
            });
    });

    it('Create data with put', function(done) {
        var api = defaults(supertest(bootstrap.app));

        var postUrl = url + '?access_token=' + accessToken;
        var data = {
            name: 'pkg',
            birthDate: '2016-01-18',
            fromTime: '2016-01-02T01:00:00.000Z',
            toTime: '2016-01-02T23:00:00.000Z',
            emailId: 'pkg@dad.com',
            field1: '23232'
        };

        api.set('Accept', 'application/json')
            .put(postUrl)
            .send(data)
            .end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    //console.log(resp.status, resp.body);
                    if (resp.status === 400) {
                        done();
                    } else if (resp.status === 422) {
                        if (resp.body.error && resp.body.error.details && resp.body.error.details.messages) {
                            console.log(resp.body.error.details.messages.errs);
                        }
                        done();
                    } else {
                        expect(200);
                        done();
                    }
                }
            });
    });

    it('find by id', function(done) {
        var api = defaults(supertest(bootstrap.app));
        var getUrl = url + '/' + idValue + '?access_token=' + accessToken;
        api.set('Accept', 'application/json')
            .get(getUrl)
            .end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    //console.log(resp.body);
                    if (resp.status === 400) {
                        done();
                    } else if (resp.status === 422) {
                        done();
                    } else {
                        expect(200);
                        expect(resp.body.orgId).to.be.equal(idValue);
                        done();
                    }
                }
            });
    });

    after('after clean up', function(done) {
        done();
    });

});
