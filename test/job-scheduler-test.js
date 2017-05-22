/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This test file, checks for job scheduler functionality.
 * it schedule a job based on current time and wait for that job to be completed.
 * @author sivankar jain
 */
var bootstrap = require('./bootstrap');
var models = bootstrap.models;
var logger = require('../lib/logger');
var log = logger('job-scheduler-test');
var Uuid = require('node-uuid');

describe('job-scheduler test', function () {
    this.timeout(200000);
    var modelDetails = {
        'name': 'JobSchedulerTest',
        'plural': 'JobSchedulerTest',
        'base': 'BaseEntity',
        'properties': {
            'name': 'string'
        }
    };
    modelDetails._version = Uuid.v4();
    before('setup model', function (done) {
        models.ModelDefinition.create(modelDetails, bootstrap.defaultContext, function (err, instance) {
            if (err) {
                log.error(bootstrap.defaultContext, err);
                done(err);
            } else {
                log.info(bootstrap.defaultContext, 'instance created', instance);
                models[modelDetails.name].on('deleteRecordsById', function (record) {
                    log.info(bootstrap.defaultContext, 'inside delete record by id listener');
                    models[modelDetails.name].deleteById(record.id, bootstrap.defaultContext, function (err, instance) {
                        if (err) {
                            log.error(bootstrap.defaultContext, err);
                        } else {
                            log.info(bootstrap.defaultContext, 'instance deleted', instance);
                        }
                    });
                });
                done();
            }
        });
    });

    it('should create record in job scheduler test model', function (done) {
        var data1 = {
            name: 'test1'
        };
        var data2 = {
            name: 'test2'
        };
        var data3 = {
            name: 'test3'
        };
        var data4 = {
            name: 'test4'
        };
        data1._version = Uuid.v4();
        data2._version = Uuid.v4();
        data3._version = Uuid.v4();
        data4._version = Uuid.v4();
        models[modelDetails.name].create(data1, bootstrap.defaultContext, function () {
            models[modelDetails.name].create(data2, bootstrap.defaultContext, function () {
                models[modelDetails.name].create(data3, bootstrap.defaultContext, function () {
                    models[modelDetails.name].create(data4, bootstrap.defaultContext, function () {
                        done();
                    });
                });
            });
        });
    });

    it('should create a new Job for a given configuration', function (done) {
        var date = new Date();
        date.setSeconds(date.getSeconds() + 3);
        var cronPattern = date.getSeconds() + ' ' + date.getMinutes() + ' ' + date.getHours() + ' * * 0-6';
        var jobConfig = {
            'name': 'clean JobSchedulerTest',
            'schedule': cronPattern,
            'modelQuery': {
                'attribute': 'definition.name',
                'value': 'JobSchedulerTest',
                'operation': 'EqualsTo'
            },
            'dataQuery': {},
            'eventName': 'deleteRecordsById',
            'payload': {},
            'enable': true
        };
        jobConfig._version = Uuid.v4();
        models.JobScheduler.create(jobConfig, bootstrap.defaultContext, function (err) {
            if (err) {
                done(err);
            } else {
                setTimeout(function () {
                    models[modelDetails.name].find({}, bootstrap.defaultContext, function (err, instance) {
                        if (err) {
                            log.error(bootstrap.defaultContext, err);
                            done(err);
                        } else if (instance.length > 0) {
                            done(new Error('clean-up job failed, model ', modelDetails.name, ', number of record in db ', instance.length));
                        } else {
                            done();
                        }
                    });
                }, 10000);
            }
        });
    });

    it('should update the job config and disable it', function (done) {
        models.JobScheduler.find({
            where: {
                name: 'clean JobSchedulerTest'
            }
        }, bootstrap.defaultContext, function (err, instance) {
            if (err) {
                done(err);
            } else {
                console.log('length ', instance.length);
                
                instance.forEach(function (job) {
                    job.enable = false;
                    job._newVersion = Uuid.v4();
                    console.log('call job upsert ', job.id, job._version, job._newVersion);
                    models.JobScheduler.upsert(job, bootstrap.defaultContext, function (err, updateInstance) {
                        if (err) {
                            log.error(bootstrap.defaultContext, err);
                            done(err);
                        } else {
                            console.log('updateInstance ', updateInstance.id, updateInstance._version);
                            log.info(bootstrap.defaultContext, 'job instance updated', updateInstance);
                            done();
                        }
                    });
                });
            }
        });
    });
});
