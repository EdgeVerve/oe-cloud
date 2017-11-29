/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries.
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
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
var loopback = require('loopback');
var os = require('os');
var currHostName = os.hostname();

chai.use(require('chai-datetime'));

describe('failsafe-observer-mixin', function () {
    this.timeout(90000);
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
        eventHistoryManager.config(app);
        done();
    });
    after('restore event history manager constants', function (done) {
        app.set('eventReliabilityReplayThreshold', backupConstants.eventReliabilityReplayThreshold);
        app.set('eventReliabilityReplayInterval', backupConstants.eventReliabilityReplayInterval);
        app.set('eventReliabilityDbPersistenceInterval', backupConstants.eventReliabilityDbPersistenceInterval);
        eventHistoryManager.config(app);
        done();
    });

    function createModelDefinition(modelSchema, cb) {
        models.ModelDefinition.create(modelSchema, defaultContext, function (err, res) {
            if (err) {
                console.log('error in create test model', err);
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
        var model = loopback.getModel(modelName, defaultContext);
        model.destroyAll({}, defaultContext, function (err, info) {
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
        var model = loopback.getModel(modelName, defaultContext);
        expect(model).to.be.ok;
        expect(Object.keys(model.settings.mixins)).to.include.members(mixins);
        expect(Object.keys(model)).to.include.members(failSafeObserverFields);
        done();
    });

    it('Should register an observer in _fsObservers object when adding new oberver ', function (done) {
        var model = loopback.getModel(modelName, defaultContext);
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
        var model = loopback.getModel(modelName, defaultContext);
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
        var model = loopback.getModel(modelName, defaultContext);
        var childModel = loopback.getModel(childModelName, defaultContext);
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
        var model = loopback.getModel(modelName, defaultContext);
        var err = new Error('testError');
        var childModel = loopback.getModel(childModelName, defaultContext);
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
        var model = loopback.getModel(modelName, defaultContext);
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
        var model = loopback.getModel(modelName, defaultContext);
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

    xit('recovery should end with RecoveryFinished in the db', function (done) {
        var model = loopback.getModel(modelName, defaultContext);
        var counter = 0;
        model.observe('after save', function (ctx, next) {
            if (counter < 2) {
                counter++;
                next(new Error('testError'));
            } else if (counter === 2) {
                counter++;
                next();
                //done();
            } else {
                next();
            }
        });
        model.create({ name: 'test', _version: uuid.v4() }, defaultContext, function (err, res) {
            if (err) {
                return done(err);
            }
        });

        setTimeout(function () {
            var ev = loopback.getModel('EventHistory', defaultContext);

            ev.find({ where: { hostName: currHostName } }, defaultContext, function (err, results) {
                if (err) {
                    done(err);
                } else if (!results || results.length === 0) {
                    done();
                } else {
                    results[0].updateAttribute('status',  'ToBeRecovered', defaultContext, function (err) {
                        if (err) {
                            done(err);
                        } else {
                            eventHistoryManager.recovery(currHostName, function (err) {
                                 if (err) {
                                    done(err);
                                    // TO DO - error handling here
                                } else {
                                    ev.find({ where: { hostName: currHostName } }, defaultContext, function (err, results) {
                                        if (err) {
                                            done(err);
                                        } else {
                                            expect(results[0].status).to.be.equal('RecoveryFinished');
                                        }
                                    });
                                    done();
                                }
                            });
                        }
                    });
                }
        });}, 5000);
    });

    it('should rerun an after save observer on base model untill it doesn\'t return an error', function (done) {
        var model = loopback.getModel(modelName, defaultContext);
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
        var model = loopback.getModel(modelName, defaultContext);
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
