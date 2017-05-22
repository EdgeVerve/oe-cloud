/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/* jshint -W024 */
/* jshint expr:true */
//to avoid jshint errors for expect

var bootstrap = require('./bootstrap');
var chalk = require('chalk');
var async = require('async');
var log = require('../lib/logger')('switch-data-source-test');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var events = require('events');
var eventEmitter = new events.EventEmitter();
var mongoHost = process.env.MONGO_HOST || 'localhost';

describe(chalk.blue('data-source-personalization-test'), function () {

    this.timeout(60000);

    var models = [
        {
            name: 'md1',
            base: 'BaseEntity',
            properties: {
                'name': {
                    'type': 'string',
                },
                'description': {
                    'type': 'string',
                }
            }
        },
        {
            name: 'md2',
            base: 'BaseEntity',
            properties: {
                'name': {
                    'type': 'string',
                },
                'description': {
                    'type': 'string',
                }
            }
        }
    ];

    var datasources = [
        {
            'host': mongoHost,
            'port': 27017,
            'url': 'mongodb://' + mongoHost + ':27017/tenant1a',
            'database': 'tenant1a',
            'password': 'admin',
            'name': 'appdb',
            'connector': 'mongodb',
            'user': 'admin',
            'id': 'tenant1-appdb',
            'description': 'tenant1a',
            'connectionTimeout': 50000
        },
        {
            'host': mongoHost,
            'port': 27017,
            'url': 'mongodb://' + mongoHost + ':27017/tenant2a',
            'database': 'tenant2a',
            'password': 'admin',
            'name': 'appdb',
            'connector': 'mongodb',
            'user': 'admin',
            'id': 'tenant2-appdb',
            'description': 'tenant2a',
            'connectionTimeout': 50000
        }
   ];

    var tenant1Scope = {
        ignoreAutoScope: false,
        ctx: {
            tenantId: 'tenant1'
        }
    };

    var tenant2Scope = {
        ignoreAutoScope: false,
        ctx: {
            tenantId: 'tenant2'
        }
    };

    var mappings = [
        {
            modelName: 'md1',
            dataSourceName: 'appdb',
        },
        {
            modelName: 'md2',
            dataSourceName: 'appdb',
        }
    ];



    var ModelDefinition = bootstrap.models.ModelDefinition;
    var DataSourceDefinition = bootstrap.models.DataSourceDefinition;
    var DataSourceMapping = bootstrap.models.DataSourceMapping;

    var cleanup = function (done) {
        async.series([function (cb) {
            var model = bootstrap.models['DataSourceDefinition'];
            if (model) {
                var options = {
                    ctx: {}
                };
                options.ignoreAutoScope = true;
                options.fetchAllScopes = true;
                model.remove({}, options, function () {
                    cb();
                });
            } else {
                cb();
            }
        }, function (cb) {
            var model = bootstrap.models['DataSourceMapping'];
             var options = {
                    ctx: {}
                };
                options.ignoreAutoScope = true;
                options.fetchAllScopes = true;
            if (model) {
                model.destroyAll({}, options, function () {
                    cb();
                });
            } else {
                cb();
            }
        }, 
        function (cb) {
            var options = {
                ctx: {}
            };
            options.fetchAllScopes = true;
            ModelDefinition.remove({
                'where': {
                    'name': {
                        inq: ['md1', 'md2']
                    }
                }
            }, options, function () {
                cb();
            });
        }, function () {
            done();
        }]);
    };

    before('setup datasources', function (done) {

        eventEmitter.setMaxListeners(100);

        var callContext = bootstrap.defaultContext;
        callContext.ignoreAutoScope = true;
        callContext.tenantId = 'default';

        var ds;
        async.series([function (cb) {
                cleanup(cb);
                },
        		function (cb) {
                ds = datasources[0];
                DataSourceDefinition.findById(ds.id, tenant1Scope, function (err, res) {
                    if (err) {
                        log.error(callContext, 'error in datasource find', err);
                        return cb(err);
                    }
                    if (!res) {
                        DataSourceDefinition.create(ds, tenant1Scope, function (err, res) {
                            if (err) {
                                log.error(callContext, 'error in datasource find', err);
                                return cb(err);
                            }
                            cb();
                        });
                    } else {
                        log.debug(callContext, 'data source exists ', ds.name, ds.database);
                        cb();
                    }
                });
                },
        		function (cb) {
                ds = datasources[1];
                DataSourceDefinition.findById(ds.id, tenant2Scope, function (err, res) {
                    if (err) {
                        log.error(callContext, 'error in datasource find', err);
                        return cb(err);
                    }
                    if (!res) {
                        DataSourceDefinition.create(ds, tenant2Scope, function (err, res) {
                            if (err) {
                                log.error(callContext, 'error in datasource find', err);
                                return cb(err);
                            }
                            cb();
                        });
                    } else {
                        log.debug(callContext, 'data source exists ', ds.name, ds.database);
                        cb();
                    }
                });

                },
            function (cb) {
                ModelDefinition.create(models, callContext, function (err, res) {
                    if (err) {
                        log.debug(callContext, 'unable to create model');
                        cb();
                    } else {
                        cb();
                    }
                });
                },
        function (cb) {
                DataSourceMapping.create(mappings, callContext, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        cb();
                    }
                });
                },
        function (cb) {
                Object.keys(bootstrap.app.datasources).forEach(function iter(id) {
                    log.debug(callContext, id, bootstrap.app.datasources[id].settings);
                });
                cb();
                },
        function () {
                done();
                }]);
    });

    
    it('tenant1 and model 1 ', function (done) {
        var model = bootstrap.models['md1'];
        var ds = model.getDataSource(tenant1Scope);
        expect(ds).not.to.be.null;
        expect(ds.settings.database).to.equal('tenant1a');
        done();
    });

    it('tenant2 and model 1 ', function (done) {
        var model = bootstrap.models['md2'];
        var ds = model.getDataSource(tenant2Scope);
        expect(ds).not.to.be.null;
        expect(ds.settings.database).to.equal('tenant2a');
        done();
    });

    after('after clean up', function (done) {
        cleanup(function () {
            done();
        });
    });

});
