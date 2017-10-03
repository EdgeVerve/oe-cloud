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

module.exports.processMsg = function processMsg(msg) {
  if (!accessToken) {
    return setRunnerAccessToken(msg.options, (err) => {
      if (err) {
        return log.error(log.defaultContext(), 'error when trying to get access token for batch job scheduler, with error: ', err);
      }
      return handleMessage(msg);
    });
  }
  handleMessage(msg);
};

var handleMessage = (msg) => {
  var requestOptions = {url: schedulerPath + 'Monitorings/' + msg.monitoringId + '?access_token=' + accessToken, method: 'GET', json: true, body: {}};
  return request(requestOptions, (err, response, body) => {
    if (err) {
      log.debug(log.defaultContext(), 'error in finding monitoring instance. error: ', err);
      var jobModel = msg.jobModelName;
      var Model = loopback.getModel(jobModel, msg.options);
      var jobFn = msg.jobFnName;
      var jobFnParams = msg.jobFnParams;
      jobFnParams.push(msg.options);
      jobFnParams.push(msg.monitoringId);
      jobFnParams.push('null');
      jobFnParams.push(batchFinish);
      try {
        return Model.prototype[jobFn].apply(this, jobFnParams);
      } catch (err) {
        return batchFinish(err, msg.monitoringId, msg.monitoringVersion);
      }
    }
    var data = {
      status: 'Processing',
      runnerStartTime: new Date(),
      _version: body._version
    };
    var requestOptions = {url: schedulerPath + 'Monitorings/' + msg.monitoringId + '?access_token=' + accessToken, method: 'PUT', json: true, body: data};
    return request(requestOptions, (err, response, body) => {
      if (err) {
        log.debug(log.defaultContext(), 'error in sending data to monitoring service. error: ', err);
      }
      var jobModel = msg.jobModelName;
      var Model = loopback.getModel(jobModel, msg.options);
      var jobFn = msg.jobFnName;
      var jobFnParams = msg.jobFnParams;
      jobFnParams.push(msg.options);
      jobFnParams.push(msg.monitoringId);
      jobFnParams.push(body._version);
      jobFnParams.push(batchFinish);
      try {
        return Model.prototype[jobFn].apply(this, jobFnParams);
      } catch (err) {
        return batchFinish(err, msg.monitoringId, msg.monitoringVersion);
      }
    });
  });
};

var batchFinish = (err, monitoringId, monitoringVersion) => {
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
  data._version = monitoringVersion;
  var requestOptions = {url: schedulerPath + 'Monitorings/' + monitoringId + '?access_token=' + accessToken, method: 'PUT', json: true, body: data};
  return request(requestOptions, (err, response, body) => {
    if (err) {
      return log.debug(log.defaultContext(), 'error in sending data to monitoring service. error: ', err);
    }
    return;
  });
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
