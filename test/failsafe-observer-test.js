/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

/**
 *
 *@author Lior Schindler
 */

var bootstrap = require('./bootstrap');
var app = bootstrap.app;
var chai = bootstrap.chai;
var expect = chai.expect;
var models = bootstrap.models;
var eventHistoryManager = require('../lib/event-history-manager');
var debug = require('debug')('failsafe-observer-test');
var uuid = require('node-uuid');

chai.use(require('chai-datetime'));

describe('failsafe-observer-mixin', function () {
    this.timeout(20000);
    var modelName = 'FailSafeTestModel';
    var childModelName = 'FailSafeChildTestModel';

    var TestModelSchema = {
        name: modelName,
        properties: {
            'name': {
                'type': 'string',
                'required': true
            }
        },
        base: 'BaseEntity',
    };

    var TestChildModelSchema = {
        name: childModelName,
        properties: {
            'name': {
                'type': 'string',
                'required': true
            }
        },
        base: modelName
    };

    var defaultContext = { ctx: {} };
    defaultContext.ctx.tenantId = 'testTenant';
    defaultContext.ctx.remoteUser = 'insertUser';
    var backupConstants = {};
    var k = 0;

    before('change event history manager constants', function (done) {
        backupConstants.eventReliabilityReplayThreshold = app.get('eventReliabilityReplayThreshold');
        backupConstants.eventReliabilityReplayInterval = app.get('eventReliabilityReplayInterval');
        backupConstants.eventReliabilityDbPersistenceInterval = app.get('eventReliabilityDbPersistenceInterval');
        app.set('eventReliabilityReplayThreshold', 100);
        app.set('eventReliabilityReplayInterval', 1000);
        app.set('eventReliabilityDbPersistenceInterval', 2000);
        app.set('eventReliabilityMaxRetry', 4);
        eventHistoryManager.init(app);
        done();
    });
    after('restore event history manager constants', function (done) {
        app.set('eventReliabilityReplayThreshold', backupConstants.eventReliabilityReplayThreshold);
        app.set('eventReliabilityReplayInterval', backupConstants.eventReliabilityReplayInterval);
        app.set('eventReliabilityDbPersistenceInterval', backupConstants.eventReliabilityDbPersistenceInterval);
        eventHistoryManager.init(app);
        done();
    });

    function createModelDefinition(modelSchema, cb) {
        models.ModelDefinition.create(modelSchema, defaultContext, function (err, res) {
            if (err) {
                debug('error in create test model', err);
                cb(err);
            } else {
                modelSchema._version = undefined;
                modelSchema._oldVersion = undefined;
                cb();
            }
        });
    }
    beforeEach('create test models', function (done) {
        k++;
        modelName = modelName + k;
        childModelName = childModelName + k;
        TestModelSchema.name = TestModelSchema.name + k;
        TestChildModelSchema.base = TestModelSchema.name;
        TestChildModelSchema.name = TestChildModelSchema.name + k;
        createModelDefinition(TestModelSchema, function (err) {
            if (err) {
                done(err);
            } else {
                createModelDefinition(TestChildModelSchema, function (err) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
            }
        });
    });

    function deleteModelDef(modelName, cb) {
        models.ModelDefinition.destroyAll({}, defaultContext, function (err, res) {
            if (err) {
                cb(err);
            } else {
                debug('number of record deleted -> ', res.count);
                cb();
            }
        });
    }

    function deleteModelInst(modelName, cb) {
        models[modelName].destroyAll({}, defaultContext, function (err, info) {
            if (err) {
                cb(err);
            } else {
                cb();
            }
        });

    }

    afterEach('delete model instances', function (done) {
        return done();
        deleteModelInst(modelName, function (err) {
            if (err) {
                done(err);
            } else {
                deleteModelInst(childModelName, function (err) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
            }
        });
    });

    after('delete model definitions', function (done) {
        deleteModelDef(modelName, function (err) {
            if (err) {
                done(err);
            } else {
                deleteModelDef(childModelName, function (err) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
            }
        });
    });

    it('Should -- make TestModel availabe in the app with failsafe observers fields on Model', function (done) {
        var failSafeObserverFields = ['_fsObservers', 'failSafeObserve'];
        var mixins = ['FailsafeObserverMixin'];
        expect(models[modelName]).to.be.ok;
        expect(Object.keys(models[modelName].settings.mixins)).to.include.members(mixins);
        expect(Object.keys(models[modelName])).to.include.members(failSafeObserverFields);
        done();
    });

    it('Should register an observer in _fsObservers object when adding new oberver ', function (done) {
        var model = models[modelName];
        var test = false;
        var observerLength = model._fsObservers['after save'].observers.length;
        model.observe('after save', function testObserver(ctx, next) {
            test = true;
            next();
        });
        expect(model._fsObservers['after save'].observers.length).to.be.equal(observerLength + 1);
        expect(model._fsObservers['after save'].observerIds.length).to.be.equal(observerLength + 1);
        model.create({ name: 'test', _version: uuid.v4() }, defaultContext, function (err, res) {
            if (err) {
                done(err);
            }
            expect(test).to.be.true;
            done();
        });
    });

    it('should not rerun an after save observer if it finished executing without error', function (done) {
        var model = models[modelName];
        var counter = 0;
        model.observe('after save', function (ctx, next) {
            if (counter <= 1) {
                var c = counter;
                setTimeout(function () {
                    if (c === 0) {
                        done();
                    }
                }, 5000);
                next();
            } else {
                done(new Error('observer called to many times'));
            }
            counter++;
        });
        model.create({ name: 'test', _version: uuid.v4() }, defaultContext, function (err, res) {
            if (err) {
                done(err);
            }
        });
    });

    it('should not rerun an after save observer if it finished executing without error for base model', function (done) {
        var model = models[modelName];
        var childModel = models[childModelName];
        var counter = 0;
        model.observe('after save', function (ctx, next) {
            if (counter <= 1) {
                setTimeout(function () {
                    if (counter === 1) {
                        done();
                    }
                }, 5000);
                next();
            } else {
                done(new Error('observer called to many times'));
            }
            counter++;
        });
        childModel.create({ name: 'test', _version: uuid.v4() }, defaultContext, function (err, res) {
            if (err) {
                done(err);
            }
        });
    });

    it('should not rerun an after save observer when error is not retriable for base model', function (done) {
        var model = models[modelName];
        var err = new Error('testError');
        var childModel = models[childModelName];
        var counter = 0;
        model.observe('after save', function (ctx, next) {
            err.retriable = false;
            if (counter === 0) {
                next(err);
                done();
            } else {
                next();
            }
            counter++;
        });
        childModel.create({ name: 'test', _version: uuid.v4() }, defaultContext, function (error, res) {
            expect(error).to.be.equal(err);
        });
    });

    it('should not rerun an after save observer when error is not retriable', function (done) {
        var model = models[modelName];
        var err = new Error('testError');
        var counter = 0;
        model.observe('after save', function (ctx, next) {
            err.retriable = false;
            if (counter == 0) {
                next(err);
                done();
            } else {
                next();
            }
            counter++;
        });
        model.create({ name: 'test', _version: uuid.v4() }, defaultContext, function (error, res) {
            expect(error).to.be.equal(err);
        });
    });

    it('should rerun an after save observer untill it doesn\'t return an error', function (done) {
        var model = models[modelName];
        var counter = 0;
        model.observe('after save', function (ctx, next) {
            if (counter < 2) {
                counter++;
                next(new Error('testError'));
            } else if (counter === 2) {
                counter++;
                next();
                done();
            } else {
                next();
            }
        });
        model.create({ name: 'test', _version: uuid.v4() }, defaultContext, function (err, res) {
            if (err) {
                done(err);
            }
        });
    });

    it('should rerun an after save observer on base model untill it doesn\'t return an error', function (done) {
        var model = models[modelName];
        var counter = 0;
        model.observe('after save', function (ctx, next) {
            if (counter < 2) {
                counter++;
                next(new Error('testError' + counter));
            } else {
                next();
                done();
            }
        });
        model.create({ name: 'test', _version: uuid.v4() }, defaultContext, function (err, res) {
            if (err) {
                done(err);
            }
        });
    });

    it('should not rerun an after save observer after MAX_RETRY times (set to 4)', function (done) {
        var model = models[modelName];
        var counter = 0;
        model.observe('after save', function (ctx, next) {
            if (counter === 4) {
                setTimeout(function () {
                    done();
                }, 5000);
            }
            if (counter < 5) {
                counter++;
                next(new Error('testError' + counter));
            } else {
                next();
                done(new Error('observer ran too many times'));
            }
        });
        model.create({ name: 'test', _version: uuid.v4() }, defaultContext, function (err, res) {
            if (err) {
                done(err);
            }
        });
    });
});
