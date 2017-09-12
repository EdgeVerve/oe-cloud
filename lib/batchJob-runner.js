var loopback = require('loopback');
var logger = require('oe-logger');
var log = logger('scheduler-runner');

module.exports.processMsg = function processMsg(msg) {
  var jobModel = msg.jobModelName;
  var Model = loopback.getModel(jobModel, msg.options);

  var jobFn = msg.jobFnName;
  var jobFnParams = msg.jobFnParams;
  jobFnParams.push(msg.options);
  jobFnParams.push(msg.monitoringId);
  jobFnParams.push(batchFinish);

  Model.prototype[jobFn].apply(this, jobFnParams);
};

var batchFinish = (err, monitoringId) => {
  if (err) log.error(log.defaultContext, err);
  log.info(log.defaultContext, 'Bath job finished.');
};
