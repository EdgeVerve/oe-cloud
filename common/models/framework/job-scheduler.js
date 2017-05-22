/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This models provides a way to schedule a Job at run time. It uses Cron Job
 * node module to schedule jobs. it provides different properties to to
 * configure a job, based on the given configuration it schedules a job.<br>
 *
 * <pre>
 * name		string		name of the configuration must be unique				[required]
 * schedule	string		scheduler time, takes cron format time, to schedule the job.		[required]
 * modelQuery	object		takes query to select model, for selected model job is scheduled	[required]
 * dataQuery	object		takes query to selecte data from above selected model			[optional]
 * eventName	string		takes even name to be fired on selected model, with selected data. 	[required]
 * payload	object		takes an json object as a extra payload and send it to event.		[optional]
 * enable	boolean		to enable to disable job scheduler.					[optional]
 * </pre>
 *
 * @class JobScheduler
 * @author Sivankar Jain
 */
var loopback = require('loopback');
var CronJob = require('cron').CronJob;
var _ = require('lodash');

var logger = require('../../../lib/logger');
var log = logger('job-scheduler');
module.exports = function JobScheduler(jobScheduler) {
  /**
   * schedule job for one or more instance.
   */
  jobScheduler.observe('after save', function jobSchedulerObserveAfterSaveFn(ctx, next) {
    if (ctx.isNewInstance) {
      scheduleJob(ctx.instance, ctx.options);
    } else {
      jobScheduler.find(ctx.where, ctx.options, function jobSchedulerObserveAfterSaveFindCb(err, instances) {
        if (err) {
          log.error(ctx.options, 'error while executing find, from jobScheduler. Error : ', err);
        } else if (instances.length) {
          instances.forEach(function jobSchedulerObserveAfterSaveForEachInstanceFn(instance) {
            scheduleJob(instance, ctx.options);
          });
        } else {
          log.info(ctx.options, 'Job scheduler: No records found for query : ', ctx.where);
        }
      });
    }
    next();
  });

  /**
   * It emit a event to schedule/stop a Job, based on configuration enable is
   * set to true/false.
   *
   * @param {object}instance - model instance
   * @param {object}options - callcontext options
   */
  function scheduleJob(instance, options) {
    if (instance.enable) {
      jobScheduler.emit('scheduleJob', instance, options);
    } else {
      // TODO : emit a event to stop a scheduled job.
      jobScheduler.emit('stopRunningJob', instance);
    }
  }

  /**
   * Schedules a job based on the schedulerConfig configuration.
   */
  jobScheduler.on('scheduleJob', function jobSchedulerOnScheduledJobFn(schedulerConfig, options) {
    var models = jobScheduler.app._models;
    var cronPattern = _.clone(schedulerConfig.schedule);

    try {
      var job = new CronJob({
        cronTime: cronPattern,
        onTick: function jobSchedulerOnScheduledJobOnTickFn() {
          /**
           * Actual job function which will get executed. This
           * function finds out the applicable models and records and
           * emits the configured event on that model
           */
          log.info(options, 'Job ', schedulerConfig.name, ' scheduled');
          var modelQuery = schedulerConfig.modelQuery;

          var modelsToApply = getFilteredModels(models, modelQuery);
          if (modelsToApply) {
            modelsToApply.forEach(function jobSchedulerOnScheduledJobApplyForEachFn(modelname) {
              var model = loopback.getModel(modelname);
              options = options || {};
              schedulerConfig.payload = schedulerConfig.payload || {};
              schedulerConfig.payload.callContext = _.cloneDeep(options);
              options.fetchAllScopes = true;
              var query = _.cloneDeep(schedulerConfig.dataQuery);
              model.find(query, options, function jobSchedulerOnScheduledJobModelFindCb(err, res) {
                if (err) {
                  log.error(options, 'err in job scheduler', err);
                  return;
                }
                log.info(options, 'query result model ', modelname, ' : ', res);
                res.forEach(function jobSchedulerOnScheduledJobResForEachFn(value) {
                  Object.keys(schedulerConfig.payload).forEach(function jobSchedulerOnScheduledJobResForEachKeysFn(key) {
                    value[key] = schedulerConfig.payload[key];
                  });
                  model.emit(schedulerConfig.eventName, value, options);
                });
              });
            });
          }
        },
        start: true
      });

      job.start();
    } catch (e) {
      log.error(options, 'Error while scheduling Job. Error= ', e);
    }
  });
};

/**
 * Applies the filter expression on the models registry and returns filtered
 * models.
 * @param {array} models list of models in app.
 * @param {object} modelQuery filter, to select models from modelList
 * @return {array} filterd model list.
 *
 * @memberof JobScheduler
 */
function getFilteredModels(models, modelQuery) {
  var modelsToApply = [];

  models.forEach(function jobSchedulerGetFilteredModelsForEachFn(model) {
    var res = _.get(model, modelQuery.attribute);
    switch (modelQuery.operation) {
      case 'EqualsTo':
        if (res === modelQuery.value) {
          modelsToApply.push(model.definition.name);
        }
        break;

      case 'NotEqualsTo':
        if (res !== modelQuery.value) {
          modelsToApply.push(model.definition.name);
        }
        break;
      default:
    }
  });

  return modelsToApply;
}
