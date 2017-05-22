/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This file loads file based Job to jobScheduler model, and also schedule job from database on Boot.
 *
 * @memberof Boot Scripts
 * @author Sivankar Jain
 * @name Z Job Scheduler
 */
var schedulerConfigs = require('../job-scheduler-config.json').configs;
var logger = require('../../lib/logger');
var log = logger('z-job-scheduler');
var util = require('../../lib/common/util');

module.exports = function DBModels(app, cb) {
  var jobScheduler = app.models.JobScheduler;

  jobScheduler.find({ where: { enable: true } }, util.bootContext(), function emitJobToSchedule(err, instances) {
    if (err) {
      log.error(util.bootContext(), 'Error :', err);
    } else {
      instances.forEach(function forEachRecordEmitScheduleJobEvent(instance) {
        jobScheduler.emit('scheduleJob', instance, util.bootContext());
      });
    }
  });

  schedulerConfigs.forEach(function forEachConfiguration(config) {
    jobScheduler.create(config, util.bootContext(), function createRecord(err, res) {
      if (err) {
        log.error(util.bootContext(), 'Error :', err);
      } else {
        log.info(util.bootContext(), 'job configuration created', res);
      }
    });
  });

  cb();
};
