/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
//This File contains tests related to Base Users
var chai = require('chai');
var expect = chai.expect;
var chalk = require('chalk');
var app_url = process.env.APP_URL || 'http://localhost:3000/';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
var request = require('supertest')(app_url);
//var mongoHost = process.env.MONGO_HOST || 'localhost';
var accessToken;
var invalidUser = {
    'username': 'test',
    'password': 'test',
};
var adminUser = {
    'username': 'adminUser',
    'password': 'adminUser',
    'email': 'testadmin@ev.com',
};

describe(chalk.blue('integration-test-User'), function() {
    this.timeout(60000);

    it('Check invalid User Creation', function(done) {
        var sendData = invalidUser;
        request
            .post('api/BaseUsers')
            .send(sendData)
            .expect(422).end(function(err, resp) {
                done();
            });
    });
    it('Check User Creation', function(done) {
        var sendData = adminUser;
        createdUser = adminUser;
        request
            .post('api/BaseUsers')
            .send(sendData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    userid = resp.body.id;
                    // createdUser = resp.body;
                    done();
                }
            });
    });

    it('Check invalid login', function(done) {
        var postData = {
            'username': invalidUser.username,
            'password': invalidUser.password
        };
        request
            .post('api/BaseUsers/login')
            .send(postData)
            .expect(401).end(function(err, response) {
                accessToken = response.body.id;
                done();
            });
    });
    it('Check login', function(done) {
        var postData = {
            'username': adminUser.username,
            'password': adminUser.password
        };
        request
            .post('api/BaseUsers/login')
            .send(postData)
            .expect(200).end(function(err, response) {
                accessToken = response.body.id;
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    xit('Check User Updation', function(done) {
        createdUser.email = 'newemail@test.com'
        request
            .put('api/BaseUsers')
            .send(createdUser)
            .end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    var updatedUser = resp.body;
                    expect(updatedUser.email).to.equal('newemail@test.com');
                    done();
                }
            });
    });

    it('Check User Deletion', function(done) {
        request
            .delete('api/BaseUsers')
            .send(userid)
            .end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Check invalid User Deletion', function(done) {
        request
            .delete('api/BaseUsers')
            .send(userid)
            .end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Check invalid logout', function(done) {
        request
            .post('api/BaseUsers/logout')
            .send()
            .expect(500).end(function(err, response) {
                done();
            });
    });
    it('Check logout', function(done) {

        request
            .post('api/BaseUsers/logout?access_token=' + accessToken)
            .send()
            .expect(204).end(function(err, response) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });

    xit('Check password complexity', function(done) {
        request
            .post('api/BaseUsers')
            .send(invalidPwdUser)
            .expect(200).end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });

});