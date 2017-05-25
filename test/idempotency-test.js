/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var bootstrap = require('./bootstrap');
var chalk = require('chalk');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var baseUrl = bootstrap.basePath;
var uuid = require('node-uuid');

describe('basic-idempotency', function () {

    this.timeout(10000);
    var app = bootstrap.app;
    var baseurl = app.get('restApiRoot');
    var Note = app.models.Note;
    var options = bootstrap.defaultContext;
    var baseurl = app.get('restApiRoot');
    var accessToken;
    
     before('login', function (done) {
         Note = app.models.Note;
         bootstrap.createAccessToken(bootstrap.defaultContext.ctx.remoteUser.username, function (err, token) {
             accessToken = token;
             var modelDetails = {
                 "name": "Note2",
                 "base": "BaseEntity",
                 "strict": false,
                 "properties": {
                     "title": {
                         "type": "string"
                     },
                     "content": {
                         "type": "string"
                     }
                 }
             };
             app.models.ModelDefinition.create(modelDetails, bootstrap.defaultContext, function modelCreate(err, res) {
                 if (err) {
                     log.debug(bootstrap.defaultContext, 'unable to create Note2 model');
                     done(err);
                 } else {
                     Note = app.models.Note2;
                     done();
                 }
             });
        });
    });
    
    var inst;
    it('duplicate create', function (done) {
        var data = {
            title: 'my note',
            content: 'Hello word',
            _newVersion: uuid.v4()
        };
        Note.create(data, options, function (err, rec1) {
            expect(err).to.be.null;
            expect(rec1._version).to.be.defined;
            Note.create(data, options, function (err, rec2) {
                expect(err).to.be.not.ok;
                expect(rec1.id.toString()).to.be.equal(rec2.id.toString());
                done();
            });
        });
    });

    it('duplicate update via put with id', function (done) {
        var data = {
            title: 'rose',
            content: 'content abcd',
            _newVersion: uuid.v4()
        };
        var url = baseurl + '/Note2s' + '?access_token=' + accessToken;
        var api = defaults(supertest(app));
        api.set('Accept', 'application/json')
            .post(url)
            .send(data)
            .end(function (err, response) {
                expect(err).to.be.null;
                expect(response.body).to.be.defined;
                var rec1 = response.body;
                var api = defaults(supertest(app));
                var url = baseurl + '/Note2s/' + rec1.id + '?access_token=' + accessToken;
                rec1._newVersion = uuid.v4();
                rec1.content = 'update1';
                api.set('Accept', 'application/json')
                    .put(url)
                    .send(rec1)
                    .end(function (err, response) {
                        expect(err).to.be.null;
                        expect(response.status).to.be.least(200);
                        api.set('Accept', 'application/json')
                            .put(url)
                            .send(rec1)
                            .end(function (err, response) {
                                expect(err).to.be.null;
                                expect(response.status).to.be.equal(200);
                                done();
                            });
                    });
            });
    });

});
