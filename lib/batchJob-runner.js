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
  var batchJob = new BatchJob(msg, callback);
  return batchJob.preRun();
};

var BatchJob = function BatchJob(_msg, _callback) {
  var message = _msg;
  var finalCB = _callback;

  this.preRun = function preRun() {
    var data = {
      status: 'Processing',
      runnerStartTime: new Date()
    };
    updateJobMonitoring(message.monitoringId, data, () => runJob.bind(this)());
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
    updateJobMonitoring(message.monitoringId, data, finalCB);
  };

  var updateJobMonitoring = function (monitoringId, data, callback) {
    jwtGenerator({}, server.app, (err, token) => {
      if (err) {
        return log.error(log.defaultContext(), 'error when trying to get access token for batch job scheduler, with error: ', err);
      }
      acquireMonitorVersion(token);
    });

    var acquireMonitorVersion = (token) => {
      var requestOptions = {
        url: schedulerPath + 'Monitorings/' + monitoringId, headers: {'x-jwt-assertion': token}, method: 'GET', json: true, body: {}
      };
      request(requestOptions, (err, response, body) => {
        if (err || body.error) {
          log.debug(log.defaultContext(), 'Error in requesting monitor instance. error: ', err || body.error);
        }
        data._version = body ? body._version : null;
        sendMonitoringUpdate(data, token);
      });
    };

    var sendMonitoringUpdate = (data, token) => {
      var requestOptions = {
        url: schedulerPath + 'Monitorings/' + monitoringId, headers: {'x-jwt-assertion': token}, method: 'PUT', json: true, body: data
      };
      return request(requestOptions, (err, response, body) => {
        if (err || body.error) {
          log.debug(log.defaultContext(), 'Error in sending data to monitoring service. error: ', err || body.error);
        }
        callback();
      });
    };
  };
};
