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

module.exports.processMsg = function processMsg(msg, callback) {
  return jwtGenerator({}, server.app, (err, token) => {
    var batchJob = new BatchJob(msg, token, callback);
    if (err) {
      return log.error(log.defaultContext(), 'error when trying to get access token for batch job scheduler, with error: ', err);
    }
    return batchJob.preRun();
  });
};

var BatchJob = function BatchJob(_msg, _token, _callback) {
  var message = _msg;
  var finalCB = _callback;
  var token = _token;

  this.preRun = function preRun() {
    var data = {
      status: 'Processing',
      runnerStartTime: new Date(),
      // _version: body._version
      _version: message._version
    };
    var requestOptions = {url: schedulerPath + 'Monitorings/' + message.monitoringId, headers: {'x-jwt-assertion': token}, method: 'PUT', json: true, body: data};
    return request(requestOptions, (err, response, body) => {
      if (err) {
        log.debug(log.defaultContext(), 'Error in sending data to monitoring service. error: ', err);
      }
      runJob.bind(this)();
    });
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
    jwtGenerator({}, server.app, (err, token) => {
      if (err) {
        return log.error(log.defaultContext(), 'error when trying to get access token for batch job scheduler, with error: ', err);
      }
      data._version = message.monitoringVersion;
      var requestOptions = { url: schedulerPath + 'Monitorings/' + message.monitoringId, headers: { 'x-jwt-assertion': token }, method: 'PUT', json: true, body: data };
      return request(requestOptions, (err, response, body) => {
        if (err) {
          return log.debug(log.defaultContext(), 'error in sending data to monitoring service. error: ', err);
        }
        return;
      });
    });
    return finalCB();
  };
};
