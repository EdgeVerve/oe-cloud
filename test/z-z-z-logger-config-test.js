/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

var loopback = require('loopback');
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var loggerConfigUrl = bootstrap.basePath + '/LoggerConfigs/';
var loggerModule = require('../lib/logger');
var api = bootstrap.api;

var debug = require('debug')('logger-config-test');
var accessToken;
var originalLogConfig;


var levelMap = {
    'debug': 10,
    'info': 20,
    'warn': 30,
    'error': 40,
    'none': 50,
    'fatal': 60
};

describe(chalk.blue('logger-config-test'), function () {

    this.timeout(10000);

    before('login using admin', function fnLogin(done) {
        var sendData = {
            'username': 'admin',
            'password': 'admin'
        };

        api
            .post(bootstrap.basePath + '/BaseUsers/login')
            .send(sendData)
            .expect(200).end(function (err, res) {
                if (err) {
                    return done(err);
                } else {
                    //console.log("acces token is ", res.body.id);
                    accessToken = res.body.id;
                    var loggerModel = loopback.findModel('LoggerConfig');
                    loggerModel.findOne({}, {tenantId: 'default'}, function (err, model) {
                        if (err) {
                            console.log('unable to save the original loggerConfig');
                            return done(new Error('unabled to save the original loggerConfig'));
                        }
                        originalLogConfig = model;
                        return done();
                    });
                }
            });
    });

    it('should change the logger configuration of a single test logger', function (done) {
        var testLogger = loggerModule('test-logger');
        testLogger.debug('');
        var postData = {
            'data' : {'test-logger' : 'info'}
        };

        api
            .set('Accept', 'application/json')
            .post(loggerConfigUrl + '?access_token=' + accessToken)
            .send(postData)
            .expect(200).end(function (err, res) {
                debug('response body : ' + JSON.stringify(res.body, null, 4));
                if (err || res.body.error) {
                    console.log('res body error is : ', res.body.error);
                    return done(err || (new Error(res.body.error)));
            } else {
                setTimeout (function() {
                    var checkerArray = (loggerModule('LOGGER-CONFIG')).getLoggers(); //get array of loggers to check them
                    if(checkerArray['test-logger'].level === 20){
                        done();
                    } else {
                        return done(new Error('Logger level not changed'));
                    }
                }, 1500);
            }
        });
    });

    it('should change the logger configuration of all the loggers', function (done) {
        var testLogger = loggerModule('test-logger');
        testLogger.debug('');
        var postData = {
            'data' : {'all' : 'warn'}
        };

        api
            .set('Accept', 'application/json')
            .post(loggerConfigUrl + '?access_token=' + accessToken)
            .send(postData)
            .expect(200).end(function (err, res) {
                debug('response body : ' + JSON.stringify(res.body, null, 4));
                if (err || res.body.error) {
                    console.log('res body error is : ', res.body.error);
                    return done(err || (new Error(res.body.error)));
            } else {
                setTimeout (function() {
                    var checkerArray = (loggerModule('LOGGER-CONFIG')).getLoggers(); //get array of loggers to check them
                    Object.keys(checkerArray).forEach(function (key)
                    {
                        if(checkerArray[key].level !== 30){
                                return done(new Error('Logger levels unchanged in all test'));
                            }
                        });
                        return done();
                }, 1500);
            }
        });
    });

    it('should try fetching the list of all loggers', function (done) {
        var loggerArray = loggerModule('LOGGER-CONFIG').getLoggers();
        api
        .set('Accept', 'application/json')
        .post(loggerConfigUrl + '/list' + '?access_token=' + accessToken)
        .expect(200).end(function (err, res) {
            debug('response body : ' + JSON.stringify(res.body, null, 4));
            if (err || res.body.error) {
                console.log('res body error is : ', res.body.error);
                return done(err || (new Error(res.body.error)));
            } else {
            var bodyObj = res.body.Loggers;
            Object.keys(loggerArray).forEach(function (value) {
                if(!(bodyObj[value] && (levelMap[bodyObj[value]] === (loggerArray[value]).level))) {
                    return done(new Error('Problem when trying to list all loggers via LoggerConfig\'s remote method'));
                    }
                });
            return done();
                }
        });
    });

    it('set logging in header', function (done) {
         api
        .set('Accept', 'application/json')
        .set('logging', 10)
        .get('/api/Literals')
         .end(function(err, resp) {
             // You will see log statements on console
             // So not really a test case, but example
             done(err);
         });
    });
       
    after('restore the original log configuration', function (done) {
        var loggerModel = loopback.findModel('LoggerConfig');
        loggerModel.destroyAll({}, {tenantId: 'default'}, function (err){
            if (err) {
                console.log('unable to destroy loggerConfig models');
                return done(new Error('unable to destory loggerConfig models'));
            }
            else {
                loggerModel.create(originalLogConfig, {tenantId: 'default'}, function (err) {
                    if (err) {
                        console.log('unable to restore the original LoggerConfig');
                        return done(new Error('unable to restore the original LoggerConfig'));
                    }
                    return done();
                });
            }
        });
    });
});
