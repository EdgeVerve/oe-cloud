/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * Author: Pradeep Kumar Tippa
 */
var bootstrap = require('./bootstrap');
var chalk = require('chalk');
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var app = bootstrap.app;
var api = defaults(supertest(bootstrap.app));
var baseUrl = bootstrap.basePath;
var expect = bootstrap.chai.expect;
var chai = require('chai');
chai.use(require('chai-things'));
var loopback = require('loopback');
var path = require('path');
var access_token;
var testTenant = 'test-tenant';
var fs = require('fs');
describe(chalk.blue('Admin Model'), function() {
    describe(chalk.green('Upload'), function(){
        var orgAppHome;
        before('Set apphome & get access token', function(done) {
            orgAppHome = app.locals.apphome;
            app.locals.apphome = path.join(__dirname, 'admin-model', 'metadata');
            bootstrap.login(function(accessToken) {
                access_token = accessToken;
                done();
            });
        });
        after('Reset apphome', function(done) {
            app.locals.apphome = orgAppHome;
            done();
        });
        it('Upload Metadata models', function(done) {
            var postUrl = baseUrl + '/admin/upload?access_token='+access_token;
            api.set('Accept', 'application/json')
            .set('tenant_id', testTenant)
            .post(postUrl)
            .send({})
            .end(function(err, response) {
                expect(err).to.be.null;
                var model = loopback.findModel('AdminModelTest', {ctx: {tenantId: testTenant}});
                expect(model).not.to.be.null;
                expect(model).not.to.be.undefined;
                done();
            });
        });
        it('Upload Same Metadata models again', function(done) {
            var postUrl = baseUrl + '/admin/upload?access_token='+access_token;
            api.set('Accept', 'application/json')
            .set('tenant_id', testTenant)
            .post(postUrl)
            .send({})
            .end(function(err, response) {
                expect(err).to.be.null;
                var model = loopback.findModel('AdminModelTest', {ctx: {tenantId: testTenant}});
                expect(model).not.to.be.null;
                expect(model).not.to.be.undefined;
                done();
            });
        });
        // This is cover the code with the check of metadataModelList check.
        describe(chalk.yellow('Without metadata model list'), function() {
            var orgMetadataModelList;
            before('Set modellist to emtpy', function(done) {
                orgMetadataModelList = app.get('metadataModelList');
                app.set('metadataModelList', '');
                done();
            });
            after('ReSet modellist to original value', function(done) {
                app.set('metadataModelList', orgMetadataModelList);
                done();
            });
            it('Try Upload', function(done) {
                var postUrl = baseUrl + '/admin/upload?access_token='+access_token;
                api.set('Accept', 'application/json')
                .set('tenant_id', testTenant)
                .post(postUrl)
                .send({})
                .expect(200).end(function(err, response) {
                    expect(err).to.be.null;
                    expect(response).not.to.be.null;
                    done();
                });
            });
        });
    });
    describe(chalk.blue('Download'), function() {
        it('Download metadata models', function(done) {
            var getUrl = baseUrl + '/admin/download?access_token='+access_token;
            api.set('Accept', 'application/octet-stream')
            .set('tenant_id', testTenant)
            .get(getUrl)
            .buffer()
            .parse(binaryParser)
            .end(function(err, response) {
                expect(err).to.be.null;
                expect(response).not.to.be.null;
                expect(response).not.to.be.undefined;
                expect(response.body).not.to.be.null;
                expect(response.body).not.to.be.undefined;
                done();
                /*
                // Able to get the zip file, but it only contains a folder with name ModelDefinition.json
                // Idea is to have file with name ModelDefinition.json and content
                fs.writeFile("abc.zip", response.body,  "binary",function(err) {
                    if(err) {
                        console.log(err);
                    } else {
                        console.log("The file was saved!");
                    }
                    done();
                });*/
            });
        });
        function binaryParser(res, callback) {
            res.setEncoding('binary');
            res.data = '';
            res.on('data', function (chunk) {
                res.data += chunk;
            });
            res.on('end', function () {
                callback(null, new Buffer(res.data, 'binary'));
            });
        }
        // This is cover the code with the check of metadataModelList check.
        describe(chalk.green('Without metadata model list'), function() {
            var orgMetadataModelList;
            before('Set modellist to emtpy', function(done) {
                orgMetadataModelList = app.get('metadataModelList');
                app.set('metadataModelList', '');
                done();
            });
            after('ReSet modellist to original value', function(done) {
                app.set('metadataModelList', orgMetadataModelList);
                done();
            });
            it('Try Download', function(done) {
                var getUrl = baseUrl + '/admin/download?access_token='+access_token;
                api.set('Accept', 'application/octet-stream')
                .set('tenant_id', testTenant)
                .get(getUrl)
                .end(function(err, response) {
                    expect(err).to.be.null;
                    expect(response).not.to.be.null;
                    expect(response).not.to.be.undefined;
                    expect(response.body).not.to.be.null;
                    expect(response.body).not.to.be.undefined;
                    expect(response.body.error).not.to.be.null;
                    expect(response.body.error).not.to.be.undefined;
                    done();
                });
            });
        });
    });
});