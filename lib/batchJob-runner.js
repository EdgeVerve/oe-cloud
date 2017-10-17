/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var loopback = require('loopback');
var logger = require('oe-logger');
var log = logger('scheduler-runner');
var request = require('request');
var accessToken;
var process = require('process');
var schedulerHost = process.env.SCHEDULER_HOST || 'localhost';
var schedulerPort = process.env.SCHEDULER_PORT || '3001';
var config = require('../server/config.json');
var schedulerPath = 'http://' + schedulerHost + ':' + schedulerPort + '/api/';

module.exports.processMsg = function processMsg(msg, callback) {
  var batchJob = new BatchJob(msg, callback);
  if (!accessToken) {
    return setRunnerAccessToken(msg.options, (err) => {
      if (err) {
        return log.error(log.defaultContext(), 'Error when trying to get access token for batch job scheduler, with error: ', err);
      }
      return batchJob.preRun();
    });
  }
  batchJob.preRun();
};

var BatchJob = function BatchJob(_msg, _callback) {
  var message = _msg;
  var finalCB = _callback;

  this.preRun = function preRun() {
    console.log('msg ' + message.index + ' started processing');
    // var requestOptions = {url: schedulerPath + 'Monitorings/' + message.monitoringId + '?access_token=' + accessToken, method: 'GET', json: true, body: {}};
    // return request(requestOptions, function (err, response, body) {
    //   if (err) {
    //     log.debug(log.defaultContext(), 'Error in finding monitoring instance. error: ', err);
    //     runJob.bind(this)();
    //   }
    var data = {
      status: 'Processing',
      runnerStartTime: new Date(),
      // _version: body._version
      _version: message._version
    };
    var requestOptions = {url: schedulerPath + 'Monitorings/' + message.monitoringId + '?access_token=' + accessToken, method: 'PUT', json: true, body: data};
    return request(requestOptions, (err, response, body) => {
      if (err) {
        log.debug(log.defaultContext(), 'Error in sending data to monitoring service. error: ', err);
      }
      runJob.bind(this)();
    });
    // });
  };

  var runJob = function runJob() {
    var jobModel = message.jobModelName;
    var Model = loopback.getModel(jobModel, message.options);
    var jobFn = message.jobFnName;
    var jobFnParams = message.jobFnParams;
    jobFnParams.push(message.options);
    // jobFnParams.push(msg.monitoringId);
    // jobFnParams.push('null');
    jobFnParams.push(this.postJob.bind(this));
    try {
      return Model.prototype[jobFn].apply(this, jobFnParams);
    } catch (err) {
      return this.postJob(err);
    }
  };

  this.postJob = function finish(err) {
    var data;
    if (err) {
      log.error(log.defaultContext, 'Batch job failed with error: ', err);
      data = {
        status: 'Failed Processing',
        errorMsg: err.message,
        runnerEndTime: new Date()
      };
    } else {
      log.info(log.defaultContext, 'Bath job finished.');
      data = {
        status: 'Finished Processing',
        runnerEndTime: new Date()
      };
    }
    console.log('msg finished.');
    data._version = message.monitoringVersion;
    var requestOptions = {url: schedulerPath + 'Monitorings/' + message.monitoringId + '?access_token=' + accessToken, method: 'PUT', json: true, body: data};
    request(requestOptions, (err, response, body) => {
      if (err) {
        log.debug(log.defaultContext(), 'error in sending data to monitoring service. error: ', err);
      }
      // return;
    });
    return finalCB();
  };
};

var setRunnerAccessToken = function (options, cb) {
  // need to change to get access token of runner user (that will be added in boot)
  var BaseUser = loopback.getModel('BaseUser', options);
  var userDetails = config.defaultUser;
  var loginDetails = {
    'username': userDetails.userName,
    'password': userDetails.password
  };
  BaseUser.login(loginDetails, options, (err, result) => {
    if (err) {
      return cb(err);
    }
    accessToken = result.id;
    return cb();
  });
};
