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
chai.use(require('chai-things'));
var loopback = require('loopback');
var async = require('async');
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var baseUrl = bootstrap.basePath;
var expect = chai.expect;

var models = bootstrap.models;

describe(chalk.blue('data-acl-test'), function () {

    var modelName = 'DataACLModel';

    var user1 = {
        'username': 'foo',
        'password': 'bar',
        'email': 'foo@gmail.com'
    };

    var user2 = {
        'username': 'foo2',
        'password': 'bar2',
        'email': 'foo2@gmail.com'
    };

    var modeldefs = [
        {
            name: modelName,
            base: 'BaseEntity',
            properties: {
                'name': {
                    'type': 'string',
                },
                'description': {
                    'type': 'string',
                },
                'product': {
                    'type': 'string'
                },
                'quantity': {
                    'type': 'number'
                },
                'department': {
                    'type': 'string'
                },
                'category': {
                    'type': 'string'
                }
            }
        }
    ];

    var items = [
        {
            name: 'book-d1-p1',
            category: 'book',
            qunatity: 200,
            department: 'd1',
            product: 'p1'
        },
        {
            name: 'boasdsadok',
            category: 'book',
            qunatity: 500,
            department: 'd1',
            product: 'p2'
        },
        {
            name: 'bo23324432ok',
            category: 'book',
            qunatity: 200,
            department: 'd2',
            id: '50023128-5d57-11e6-8b77-86f30ca893d4',
            product: 'p1'
        },
        {
            name: 'item567',
            category: 'book',
            qunatity: 200,
            department: 'd9',
            product: 'p2'
        },
        {
            name: 'item568',
            category: 'music',
            qunatity: 200,
            department: 'd1',
            product: 'p1'
        },
        {
            name: 'item569',
            category: 'others',
            qunatity: 200,
            department: 'd1',
            product: 'p7'
        },
        {
            name: 'itemo600',
            category: 'music',
            qunatity: 200,
            department: 'd2',
            product: 'p2'
        },
        {
            name: 'item601',
            category: 'book',
            qunatity: 200,
            department: 'd1',
            product: 'p1'
        },
        {
            name: 'item0812341243',
            category: 'music',
            qunatity: 200,
            department: 'd3',
            product: 'special1'
        },
        {
            name: 'item888823',
            category: 'special2',
            qunatity: 200,
            department: 'd1',
            product: 'special2',
            id: '49023128-5d57-11e6-8b77-86f30ca893d4'
        },
        {
            name: 'powaee3213',
            category: 'others',
            qunatity: 200,
            department: 'm1',
            product: 'm3'
        },
        {
            name: 'finance department only',
            category: 'finance',
            qunatity: 200,
            department: 'finance',
            product: 'm3'
        },
        {
            name: 'fetchbyid',
            id: '49023128-5d57-11e6-8b77-86f30ca893d3',
            category: 'byid',
            department: 'byid'
        }

    ];

    var dataacls = [
        {
            model: modelName,
            principalType: 'ROLE',
            principalId: 'ROLEA',
            accessType: 'READ',
            group: 'category',
            filter: { 'category': 'book' }
        },
        {
            model: modelName,
            principalType: 'ROLE',
            principalId: 'ROLEA',
            accessType: 'READ',
            group: 'category',
            filter: { 'category': 'music' }
        },
        {
            model: modelName,
            principalType: 'ROLE',
            principalId: 'ROLEA',
            accessType: 'READ',
            group: 'department',
            filter: { 'department': { 'inq': ['d1', 'd2'] } }
        },
        {
            model: modelName,
            principalType: 'ROLE',
            principalId: 'ROLEB',
            accessType: 'READ',
            filter: { 'category': 'others' }
        },
        {
            model: modelName,
            principalType: 'ROLE',
            principalId: 'ROLEB',
            accessType: 'READ',
            filter: { 'product': { 'inq': ['special1', 'special2'] } }
        },
        {
            model: modelName,
            principalType: 'ROLE',
            principalId: 'ROLEB',
            accessType: 'READ',
            filter: { 'department': '@ctx.department' }
        }

    ];

    var user1token;
    var user2token;

    var ModelDefinition = bootstrap.models.ModelDefinition;

    this.timeout(10000000);

    var cleanup = function (done) {
        async.series([function (cb) {
            var model = loopback.findModel(modelName, bootstrap.defaultContext);
            if (model) {
                model.remove({}, bootstrap.defaultContext, function () {
                    cb();
                });
            } else {
                cb();
            }
        }, function (cb) {
            ModelDefinition.remove({
                'name': modelName
            }, bootstrap.defaultContext, function (err, res) {
                cb();
            });
        }, function () {
            done();
        }]);
    };

    before('setup model for dataacl', function (done) {
        async.series([function (cb) {
            cleanup(cb);
        },
        function (cb) {
            var model = loopback.findModel(modelName, bootstrap.defaultContext);
            if (model) {
                model.remove({}, bootstrap.defaultContext, function () {
                    cb();
                });
            } else {
                cb();
            }
        },
        function (cb) {
            ModelDefinition.remove({
                'name': modelName
            }, bootstrap.defaultContext, function (err, res) {
                cb();
            });
        },
        function (cb) {
            ModelDefinition.create(modeldefs, bootstrap.defaultContext, function (err, res) {
                if (err) {
                    console.log('unable to create model ', JSON.stringify(err));
                    cb();
                } else {
                    var model = loopback.findModel(modelName, bootstrap.defaultContext);
                    model.create(items, bootstrap.defaultContext, function (err, result) {
                        cb();
                    });
                }
            });
        },
        function (cb) {
            models.DataACL.create(dataacls, bootstrap.defaultContext, function (err, res) {
                cb();
            });
        },
        function (cb) {
            bootstrap.createTestUser(user1, 'ROLEA', cb);
        },
        function (cb) {
            bootstrap.createTestUser(user2, 'ROLEB', cb);
        },
        function () {
            done();
        }]);
    });

    it('login1', function (done) {
        var postData = {
            'username': user1.username,
            'password': user1.password
        };

        var postUrl = baseUrl + '/BaseUsers/login';

        // without jwt token
        var api = defaults(supertest(bootstrap.app));
        api.set('Accept', 'application/json')
            .set('tenant_id', 'test-tenant')
            .post(postUrl)
            .send(postData)
            .expect(200).end(function (err, response) {
                user1token = response.body.id;
                done();
            });
    });

    it('fetch1', function (done) {
        var api = defaults(supertest(bootstrap.app));
        var url = bootstrap.basePath + '/' + modelName + 's?access_token=' + user1token;
        api
            .get(url)
            .expect(200).end(function (err, res) {
                var response = res.body;
                expect(response).to.exist;
                response.forEach(function (item) {
                    expect((item.category === 'book' ||
                        item.category === 'music') &&
                        (item.department === 'd1' ||
                            item.department === 'd2')).to.be.true;
                });

                done();
            });
    });

    it('fetch with filter', function (done) {
        var api = defaults(supertest(bootstrap.app));
        var filter = {where:{category:'book'}};

        var url = bootstrap.basePath + '/' + modelName + 's?access_token=' + user1token + '&filter=' + JSON.stringify(filter);
        api
            .get(url)
            .expect(200).end(function (err, res) {
                var response = res.body;
                expect(response).to.exist;
                response.forEach(function (item) {
                    expect((item.category === 'book') &&
                        (item.department === 'd1' ||
                            item.department === 'd2')).to.be.true;
                });

                done();
            });
    });

    it('login2', function (done) {
        var postData = {
            'username': user2.username,
            'password': user2.password
        };

        var postUrl = baseUrl + '/BaseUsers/login';

        // without jwt token
        var api = defaults(supertest(bootstrap.app));
        api.set('Accept', 'application/json')
            .set('tenant_id', 'test-tenant')
            .post(postUrl)
            .send(postData)
            .expect(200).end(function (err, response) {
                user2token = response.body.id;
                done();
            });
    });

    it('fetch2', function (done) {
        var api = defaults(supertest(bootstrap.app));
        var url = bootstrap.basePath + '/' + modelName + 's?access_token=' + user2token;
        api
            .get(url)
            .expect(200).end(function (err, res) {
                var response = res.body;
                expect(response).to.exist;
                response.forEach(function (item) {
                    expect(item.product === 'special1' ||
                        item.product === 'special2' ||
                        item.department === 'finance' ||
                        item.category === 'others').to.be.true;
                });
                done();
            });
    });


    it('fetchbyid - not permissioned', function (done) {
        var api = defaults(supertest(bootstrap.app));
        var url = bootstrap.basePath + '/' + modelName + 's/49023128-5d57-11e6-8b77-86f30ca893d3?access_token=' + user2token;
        api
            .get(url)
            .expect(404).end(function (err, res) {
                var response = res.body;
                expect(response.error.code === 'MODEL_NOT_FOUND').to.be.true;
                done();
            });
    });

    it('fetchbyid - permissioned', function (done) {
        var api = defaults(supertest(bootstrap.app));
        var url = bootstrap.basePath + '/' + modelName + 's/49023128-5d57-11e6-8b77-86f30ca893d4?access_token=' + user2token;
        api
            .get(url)
            .expect(200).end(function (err, res) {
                var response = res.body;
                expect(response.id === '49023128-5d57-11e6-8b77-86f30ca893d4').to.be.true;
                done();
            });
    });

    it('fetch and delete', function (done) {
        var api = defaults(supertest(bootstrap.app));
        var url = bootstrap.basePath + '/' + modelName + 's/50023128-5d57-11e6-8b77-86f30ca893d4/?access_token=' + user1token;
        api
            .get(url)
            .expect(200).end(function (err, res) {
                var response = res.body;
                expect(response).to.exist;
                expect(response._version).not.to.be.null;
                url = bootstrap.basePath + '/' + modelName + 's/50023128-5d57-11e6-8b77-86f30ca893d4/?access_token=' + user1token;
                var api2 = defaults(supertest(bootstrap.app));
                api2.del(url, function (err, res) {
                    expect(res.status).to.be.equal(200);
                    expect(res.body.count).to.be.equal(1);
                    done();

                });
            });
    });

    after('after clean up', function (done) {
        cleanup(done);
    });

});

