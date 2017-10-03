/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var request = require('request');
var loopback = require('loopback');

var chai = require('chai');
var expect = chai.expect;
var chalk = require('chalk');
var async = require('async');

const serviceName = process.env.APP_IMAGE_NAME;
const domainName = process.env.DOMAIN_NAME;

const serviceHost = serviceName + '.' + domainName;
const baseUrl = 'https://' + serviceHost + '/api/'; 

var token;

var defaultContext = {
    ctx: {
        tenantId: 'default',
        remoteUser: 'admin'
    }
};

describe(chalk.blue(''), function () {
    before('login using admin', function (done) {
        var loginUser = function (cb) {
            var loginData = {'username': 'admin', 'password': 'admin'};
            console.log('Base Url is ', baseurl);
            request.post(
                baseurl + 'BaseUsers/login', {
                json: loginData
                },
                function (error, response, body) {
                    if (error || body.error) {
                    console.log('error:', error || body.error);
                    return cb(error || body.error);
                    }
                    expect(response.statusCode).to.equal(200);
                    console.log('login using admin - success - ', body.id);
                    token = body.id;
                    cb();
                }
            );
        };

        var createNoteDefinition = function (cb) {
            var modelDefinition = loopback.findModel('ModelDefinition');
            var data = {
                'name': 'TestNote',
                'base': 'BaseEntity',
                'properties': {
                    'title': {
                        'type': 'string'
                    },
                    'content': {
                        'type': 'string'
                    }
                }
            };
            modelDefinition.create(data, defaultContext, function (err, record) {
                if (err) {
                    console.log('error:', err);
                    return cb(err);
                }
                console.log('TestNote model definition created');
                return cb();
            });
        };

        var createNoteLogic = function (cb) {
            var testNoteDefinition = loopback.getModel('TestNote', defaultContext);
            testNoteDefinition.prototype.changeTitle = function (title, ctx, monitoringId, version, callback) {
                testNoteDefinition.find({}, ctx, function (err, notes) {
                    if (err) {
                        return callback(err);
                    }
                    async.each(notes, function (note, cb) {
                        note.updateAttribute('title', title, ctx, function (err) {
                        if (err) {
                            log.error(log.defaultContext(), err);
                        }
                        cb();
                        });
                    }, function (err) {
                        callback(err, monitoringId, version);
                    });
                });
            };
        };

        loginUser(function (err) {
            if (err) {
                console.log('err in login: ', err);
                return done(err);
            }
            console.log('login using admin - success');
            createNoteDefinition(function (err) {
                if (err) {
                    console.log('err in creating TestNote definition: ', err);
                    return done(err);
                }
                console.log('creating TestNote definition - success');
                //continue logic here
            });
        });
    });

    it('create', function (done) {

    });
});