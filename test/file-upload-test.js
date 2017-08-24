/**
 * 
 * ©2016-2017 mycompany Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var app = bootstrap.app;
var chai = require('chai');
chai.use(require('chai-things'));
var loopback = require('loopback');
var models = bootstrap.models;
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var fs = require('fs');
var api = supertest(app);


// Test cases for testing the file upload functionality.
describe(chalk.blue('File upload test'), function() {
    var accessToken;
    this.timeout(5000);
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

    after('delete uploaded file', function(done) {
        fs.unlink('./test/x.png', function(err) {
            done();
        });
    });

    it('should upload file successfully', function(done) {
        var filename = 'x.png';

        var api = defaults(supertest(app));
        api.post(bootstrap.basePath + '/documents/test/upload?access_token=' + accessToken)
            .set('tenant_id', 'test-tenant')
            .field('name', 'image upload')
            .attach('image', './test/upload-file-data/' + filename)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done()
                }
            });

    });
    xit('should upload file fail for file size', function(done) {

    });

    xit('should upload file fail for unsupported file type', function(done) {

    });
});