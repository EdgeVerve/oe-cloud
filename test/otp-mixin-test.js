/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;
var loopback = require('loopback');
var models = bootstrap.models;
var chai = require('chai');
var api = bootstrap.api;
chai.use(require('chai-things'));
var url = bootstrap.basePath;
var modelName = 'OTPCountry';

describe(chalk.blue('otp mixin test'), function() {
    this.timeout(20000);
    var testUsertoken;

    before('Create testuser Accesstoken', function(done) {
        var testUser = {
            'username': 'testuser',
            'password': 'testuser123'
        };
        bootstrap.login(testUser, function(returnedAccesstoken) {
            testUsertoken = returnedAccesstoken;
            done();
        });
    });

    before('setup test data', function(done) {
        models.ModelDefinition.create({
            'properties': { 'name': 'String', 'capital': 'String', 'population': 'Number' },
            'name': 'OTPCountry',
            'base': 'BaseEntity',
            'plural': 'OTPCountries',
            'strict': false,
            'idInjection': true,
            'options': {
                'enableOTP': [{
                    'method': 'POST',
                    'authWhen': '@i.population>1000'
                }]
            },
            'validations': [],
            'relations': {},
            'acls': [],
            'methods': {}
        }, bootstrap.defaultContext, function(err, modeldef) {
            if (err) {
                return done(err);
            }
            expect(err).to.be.not.ok;
            var ds = bootstrap.app.dataSources.db;
            var model = loopback.getModel(modelName, bootstrap.defaultContext);
            expect(model).not.to.be.undefined;
            model.attachTo(ds);
            done();
        });
    });


    after('destroy test models', function(done) {
        models.ModelDefinition.destroyAll({ name: modelName }, bootstrap.defaultContext, function(err, d) {
            if (err) {
                console.log('Error - not able to delete modelDefinition entry for mysettings');
                return done();
            }
            var model = loopback.getModel(modelName, bootstrap.defaultContext);
            model.destroyAll({}, bootstrap.defaultContext, function(err, d) {
                if (err) {
                    console.log('Error - not able to delete ' + modelName + ' data');
                    return done(err);
                }
                done();
            });
        });
    });

    afterEach('destroy execution context', function(done) {
        done();
    });

    xit('t2 should send otp to user loginOtp api is called', function(done) {
        var postData = { 'username': 'test', 'password': 'test' };
        var loginUrl = bootstrap.basePath + '/BaseUsers/loginOTP' + '?access_token=' + testUsertoken;
        api.post(loginUrl)
            .set('Accept', 'application/json')
            .send(postData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    return done(err);
                }
                var results = JSON.parse(resp.text);
                expect(results).keys('response', 'username');
                done();
            });
    });

    xit('t3 should verify otp and generate access token for user', function(done) {
        var BaseUser = loopback.findModel('BaseUser');
        var OTP = loopback.findModel('OTP');
        var userQuery = { where: { username: 'test' } };
        BaseUser.findOne(userQuery, function(err, user) {
            if (err) {
                return done(err);
            }
            var otpQuery = { where: { userId: user.id } };
            OTP.findOne(otpQuery, function(err, otp) {
                if (err) {
                    return done(err);
                }
                var postData = { 'username': 'test', 'otp': otp.token };
                var verifyOtpUrl = bootstrap.basePath + '/BaseUsers/validateOTP' + '?access_token=' + testUsertoken;
                api.post(verifyOtpUrl)
                    .set('Accept', 'application/json')
                    .send(postData)
                    .expect(200).end(function(err, resp) {
                        if (err) {
                            return done(err);
                        }
                        var results = JSON.parse(resp.text);
                        expect(results).keys('id', 'ttl', 'created', 'userId');
                        done();
                    });
            });
        });
    });

    it('t4 should send otp to user if otp is not in request and OtpWhen condition is passing', function(done) {
        var postData = { 'name': 'US', 'capital': 'Washington', 'population': 10000 };
        var apiUrl = url + '/OTPCountries' + '?access_token=' + testUsertoken;
        api.post(apiUrl)
            .set('Accept', 'application/json')
            .send(postData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    return done(err);
                }
                var results = JSON.parse(resp.text);
                expect(results).keys('status', 'otpId');
                done();
            });
    });

    it('should not apply otp authentication if OtpWhen condition not passed', function(done) {
        var postData = { 'name': 'US', 'capital': 'Washington', 'population': 10 };
        var Url = url + '/OTPCountries' + '?access_token=' + testUsertoken;
        api.post(Url)
            .set('Accept', 'application/json')
            .send(postData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    return done(err);
                }
                var results = JSON.parse(resp.text);
                expect(results).to.include.keys('name', 'capital', 'population', 'id', '_createdBy', '_createdOn', '_modifiedBy', '_modifiedOn', '_type', '_isDeleted');
                done();
            });
    });

    it('t5 should verify otp and send response to user if otp is provided and correct', function(done) {
        var postData = { 'name': 'India', 'capital': 'delhi', 'population': 11000 };

        var Url = url + '/OTPCountries' + '?access_token=' + testUsertoken;
        api.post(Url)
            .set('Accept', 'application/json')
            .send(postData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    return done(err);
                }
                var results = JSON.parse(resp.text);
                expect(results).keys('status', 'otpId');
                var OTP = loopback.findModel('OTP');
                var condition = { 'where': { 'id': results.otpId } };
                OTP.findOne(condition, bootstrap.defaultContext, function(err, otp) {
                    var otpData = { 'otp': otp.token, 'otpId': results.otpId };
                    var Url = url + '/OTPCountries' + '?access_token=' + testUsertoken;
                    api.post(Url)
                        .set('Accept', 'application/json')
                        .send(otpData)
                        .expect(200).end(function(err, resp) {
                            if (err) {
                                return done(err);
                            }
                            var results = JSON.parse(resp.text);
                            expect(results).to.include.keys('name', 'capital', 'population', 'id', '_createdBy', '_createdOn', '_modifiedBy', '_modifiedOn', '_type', '_isDeleted');

                            done();
                        });
                });
            });
    });

    it('t6 should check otp and send err response to user if otp is provided but not correct', function(done) {
        var postData = { 'name': 'US', 'capital': 'Washington', 'population': 13000 };
        var Url = url + '/OTPCountries' + '?access_token=' + testUsertoken;
        api.post(Url)
            .set('Accept', 'application/json')
            .send(postData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    return done(err);
                }
                var results = JSON.parse(resp.text);
                expect(results).keys('status', 'otpId');
                var OTP = loopback.findModel('OTP');
                var condition = { 'where': { 'id': results.otpId } };
                OTP.findOne(condition, bootstrap.defaultContext, function(err, otp) {
                    otp.token = otp.token + 1;
                    var otpData = { 'otp': otp.token, 'otpId': results.otpId };
                    var Url = url + '/OTPCountries' + '?access_token=' + testUsertoken;
                    api.post(Url)
                        .set('Accept', 'application/json')
                        .send(otpData)
                        .expect(422).end(function(err, resp) {
                            if (err) {
                                return done(err);
                            }
                            var results = JSON.parse(resp.text);
                            expect(results.message).to.be.equal('otp auth failed');
                            done();
                        });
                });
            });
    });

    it('t7 resend otp test', function(done) {
        var postData = { 'name': 'US', 'capital': 'Washington', 'population': 10000 };
        var apiUrl = url + '/OTPCountries' + '?access_token=' + testUsertoken;
        api.post(apiUrl)
            .set('Accept', 'application/json')
            .send(postData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    return done(err);
                }
                var results = JSON.parse(resp.text);
                expect(results).keys('status', 'otpId');

                var resendOtpUrl = url + '/OTPs/resendOtp' + '?access_token=' + testUsertoken;
                var resendData = { 'otpId': results.otpId };

                api.post(resendOtpUrl)
                    .set('Accept', 'application/json')
                    .send(resendData)
                    .expect(200).end(function(err, resp) {
                        var results = JSON.parse(resp.text);
                        expect(results).keys('status', 'otpId');
                        done();
                    });
            });
    });
});