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
//var loopback = require('loopback');

describe(chalk.blue('update-test'), function () {

    var accessToken;
    var modelName = 'Record';

    this.timeout(300000);

    before('create model', function (done) {
        bootstrap.login(function (token) {
            accessToken = token;
            var model = bootstrap.models[modelName];
            if (model) {
                model.remove({}, bootstrap.defaultContext, function (err, res) {
                    done();
                });
            } else {
                done();
            }
        });
    });

    var record;

    it('Create Model', function (done) {
        var modelDefinitionData = {
            'name': modelName,
            'plural': modelName,
            'base': 'BaseEntity',
            'strict': false,
            'idInjection': true,
            'validateUpsert': true,
            'cacheable': true,
            'properties': {
                'name': {
                    'type': 'string',
                    'unique': true
                },
                'description': {
                    'type': 'string'
                }
            },
            'validations': [],
            'relations': {},
            'acls': [],
            'methods': {}
        };

        var api = defaults(supertest(bootstrap.app));

        var postUrl = baseUrl + '/ModelDefinitions?access_token=' + accessToken;

        api.set('Accept', 'application/json')
            .post(postUrl)
            .send(modelDefinitionData)
            .end(function (err, resp) {
                if (err) {
                    done(err);
                } else {
                    if (resp.status === 400) {
                        done();
                    } else if (resp.status === 422) {
                        //console.log(resp.body.name);
                        done();
                    } else {
                        expect(resp.status).to.be.equal(200);
                        done();
                    }
                }
            });
    });

    it('create record', function (done) {
        var postData = {
            name: 'Record1',
            description: 'New Record',
            id: 'asdsadsad',
            _version: 'asdsadsad'
        };
        var postUrl = baseUrl + '/' + modelName + '?access_token=' + accessToken;
        var api = defaults(supertest(bootstrap.app));
        api.set('Accept', 'application/json')
            .post(postUrl)
            .send(postData)
            .expect(200).end(function (err, response) {
                expect(response.body).to.be.defined;
                expect(response.body.description).to.be.equal('New Record');
                record = response.body;
                done();
            });
    });

    it('update record', function (done) {

        record.description = 'Update Version 1';
        var postUrl = baseUrl + '/' + modelName + '/' + record.id + '?access_token=' + accessToken;
        var api = defaults(supertest(bootstrap.app));
        api.set('Accept', 'application/json')
            .put(postUrl)
            .send(record)
            .end(function (err, response) {
                expect(response.body).to.be.defined;
                expect(response.body.description).to.be.equal('Update Version 1');
                record = response.body;
                done();
            });
    });

    it('update record with wrong version', function (done) {
        var wrongRecord = JSON.parse(JSON.stringify(record));
        wrongRecord.description = 'Update with wrong version';
        wrongRecord._version = '283d3f7c-8fe6-41d8-9344-6146d3f02c31';
        var postUrl = baseUrl + '/' + modelName + '?access_token=' + accessToken;
        var api = defaults(supertest(bootstrap.app));
        api.set('Accept', 'application/json')
            .put(postUrl)
            .send(wrongRecord)
            .end(function (err, response) {
                expect(response.status).to.be.equal(422);
                expect(response.body.error).to.be.defined;
                done();
            });
    });

    it('delete record', function (done) {
        record.description = 'Update Version 1';
        var postUrl = baseUrl + '/' + modelName + '/' + record.id + '?access_token=' + accessToken;
        var api = defaults(supertest(bootstrap.app));
        api.set('Accept', 'application/json')
            .delete(postUrl)
            .send(record)
            .end(function (err, response) {
                expect(response.status).to.be.equal(200);
                done();
            });
    });

    it('create record 2 with old id', function (done) {
        var postData = {
            name: 'Record2',
            description: 'New Record 2',
            id: record.id
        };
        var postUrl = baseUrl + '/' + modelName + '?access_token=' + accessToken;
        var api = defaults(supertest(bootstrap.app));
        api.set('Accept', 'application/json')
            .post(postUrl)
            .send(postData)
            .expect(200).end(function (err, response) {
                done();
            });
    });

    it('update record with old details', function (done) {
        record.description = 'Update Version 1';
        var postUrl = baseUrl + '/' + modelName + '?access_token=' + accessToken;
        var api = defaults(supertest(bootstrap.app));
        api.set('Accept', 'application/json')
            .put(postUrl)
            .send(record)
            .end(function (err, response) {
                done();
            });
    });

});
