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
var jwtGenerator = require('oe-jwt-generator');
var server = require('../server/server');
var schedulerHost = process.env.SCHEDULER_HOST || 'localhost';
var schedulerPort = process.env.SCHEDULER_PORT || '3001';
var schedulerPath = 'http://' + schedulerHost + ':' + schedulerPort + '/api/';

module.exports.processMsg = function processMsg(msg) {
  return jwtGenerator({}, server.app, (err, token) => {
    if (err) {
      return log.error(log.defaultContext(), 'error when trying to get access token for batch job scheduler, with error: ', err);
    }
    return handleMessage(msg, token);
  });
};

var handleMessage = (msg, token) => {
  var requestOptions = {url: schedulerPath + 'Monitorings/' + msg.monitoringId, method: 'GET', headers: {'x-jwt-assertion': token}, json: true, body: {}};
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
    var requestOptions = {url: schedulerPath + 'Monitorings/' + msg.monitoringId, headers: {'x-jwt-assertion': token}, method: 'PUT', json: true, body: data};
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

var batchFinish = (err, monitoringId, monitoringVersion, token) => {
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
  jwtGenerator({}, server.app, (err, token) => {
    if (err) {
      return log.error(log.defaultContext(), 'error when trying to get access token for batch job scheduler, with error: ', err);
    }
    data._version = monitoringVersion;
    var requestOptions = { url: schedulerPath + 'Monitorings/' + monitoringId, headers: { 'x-jwt-assertion': token }, method: 'PUT', json: true, body: data };
    return request(requestOptions, (err, response, body) => {
      if (err) {
        return log.debug(log.defaultContext(), 'error in sending data to monitoring service. error: ', err);
      }
      return;
    });
  });
};
