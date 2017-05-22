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

describe(chalk.blue('switch-data-source-test'), function() {

    this.timeout(60000);

    var models = [
        {
            name: 'model1',
            base: 'BaseEntity',
            properties: {
                'name': {
                    'type': 'string',
                },
                'description': {
                    'type': 'string',
                }
            },
            dataSourceName: 'db'
        },
        {
            name: 'model2',
            base: 'BaseEntity',
            properties: {
                'name': {
                    'type': 'string',
                },
                'description': {
                    'type': 'string',
                }
            },
            dataSourceName: 'db'
        },
        {
            name: 'model3',
            base: 'BaseEntity',
            properties: {
                'name': {
                    'type': 'string',
                },
                'description': {
                    'type': 'string',
                }
            },
            dataSourceName: 'db'
        },
        {
            name: 'model4',
            base: 'BaseEntity',
            properties: {
                'name': {
                    'type': 'string',
                },
                'description': {
                    'type': 'string',
                }
            },
            dataSourceName: 'db'
        },
        {
            name: 'model5',
            base: 'BaseEntity',
            properties: {
                'name': {
                    'type': 'string',
                },
                'description': {
                    'type': 'string',
                }
            },
            dataSourceName: 'db'
        },
        {
            name: 'model9',
            base: 'BaseEntity',
            properties: {
                'name': {
                    'type': 'string',
                },
                'description': {
                    'type': 'string',
                }
            },
            dataSourceName: 'emailDs'
        }

    ];

    var datasources = [
        {
            'host': mongoHost,
            'port': 27017,
            'url': 'mongodb://' + mongoHost + ':27017/tenant1a',
            'database': 'tenant1a',
            'password': 'admin',
            'name': 'tenant1a',
            'connector': 'mongodb',
            'user': 'admin',
            'id': 'ds-tenant1a',
            'description': 'tenant1a',
            'connectionTimeout': 50000
        },
        {
            'host': mongoHost,
            'port': 27017,
            'url': 'mongodb://' + mongoHost + ':27017/tenant2a',
            'database': 'tenant2a',
            'password': 'admin',
            'name': 'tenant2a',
            'connector': 'mongodb',
            'user': 'admin',
            'id': 'ds-tenant2a',
            'description': 'tenant2a',
            'connectionTimeout': 50000
        },
        {
            'host': mongoHost,
            'port': 27017,
            'url': 'mongodb://' + mongoHost + ':27017/commondb',
            'database': 'commondb',
            'password': 'commondb',
            'name': 'commondb',
            'connector': 'mongodb',
            'user': 'admin',
            'description': 'accountsModule',
            'id': 'ds-commondb',
            'connectionTimeout': 50000
        },
        {
            'host': mongoHost,
            'port': 27017,
            'url': 'mongodb://' + mongoHost + ':27017/fxdb',
            'database': 'fxdb',
            'name': 'fxdb',
            'connector': 'mongodb',
            'user': 'admin',
            'description': 'fxdb',
            'id': 'ds-fxdb',
            'connectionTimeout': 50000
        },
        {
            'host': mongoHost,
            'port': 27017,
            'url': 'mongodb://' + mongoHost + ':27017/superdb',
            'database': 'superdb',
            'name': 'superdb',
            'connector': 'mongodb',
            'user': 'admin',
            'description': 'fxdb',
            'id': 'ds-superdb',
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

    var mappingsForTenant1 = [
        {
            modelName: 'model1',
            dataSourceName: 'tenant1a',
        },
        {
            modelName: 'model2',
            dataSourceName: 'commondb',
        },
        {
            modelName: 'model3',
            dataSourceName: 'fxdb',
            'scope': {
                'department': 'fx'
            }
        },
        {
            modelName: 'model1',
            dataSourceName: 'superdb',
            priority: 10,
            'scope': {
                'superpower': true
            }
        },
    ];

    var mappingsForTenant2 = [
        {
            modelName: 'model1',
            dataSourceName: 'tenant2a',
        },
        {
            modelName: 'model2',
            dataSourceName: 'commondb',
        },
        {
            modelName: 'model3',
            dataSourceName: 'fxdb',
            'scope': {
                'department': 'fx'
            }
        },
        {
            modelName: 'model1',
            dataSourceName: 'superdb',
            priority: 10,
            'scope': {
                'superpower': true
            }
        },
    ];

    var ModelDefinition = bootstrap.models.ModelDefinition;
    var DataSourceDefinition = bootstrap.models.DataSourceDefinition;
    var DataSourceMapping = bootstrap.models.DataSourceMapping;

    var cleanup = function(done) {
        async.series([function(cb) {
            var model = bootstrap.models['DataSourceDefinition'];
            if (model) {
                var options = {ctx:{}};
                options.ignoreAutoScope = true;
                options.fetchAllScopes = true;
                model.remove({}, options, function() {
                    cb();
                });
            } else {
                cb();
            }
        }, function(cb) {
            var model = bootstrap.models['DataSourceMapping'];
            if (model) {
                model.destroyAll({}, tenant1Scope, function() {
                    cb();
                });
            } else {
                cb();
            }
        }, function(cb) {
            var model = bootstrap.models['DataSourceMapping'];
            if (model) {
                model.destroyAll({}, tenant2Scope, function() {
                    cb();
                });
            } else {
                cb();
            }
        }, function(cb) {

            var options = {ctx:{}};
            options.fetchAllScopes = true;
            ModelDefinition.remove({
                'where': {
                    'name': {
                        inq: ['model1', 'model2', 'model3', 'model4', 'model5']
                    }
                }
            }, options, function() {
                cb();
            });
        }, function() {
            done();
        }]);
    };

    before('setup datasources', function(done) {

        eventEmitter.setMaxListeners(100);

			var callContext = bootstrap.defaultContext;
			callContext.ignoreAutoScope = true;
		
            async.series([function(cb) {
                    cleanup(cb);
                },
        		function(cb) {
                    async.each(datasources, function(ds, callback) {
                        DataSourceDefinition.findById(ds.id, callContext, function(err, res) {
                            if (err) {
                                log.error(log.defaultContext(), 'error in datasource find', err);
                                return callback(err);
                            }
                            if (!res) {
                                DataSourceDefinition.create(ds, callContext, function(err, res) {
                                    if (err) {
                                        log.error(log.defaultContext(), 'error in datasource find', err);
                                        return callback(err);
                                    }
                                    callback();
                                });
                            } else {
                                log.debug(log.defaultContext(), 'data source exists ', ds.name, ds.database);
                                callback();
                            }
                        });
                    }, function(err) {
                        cb();
                    });
                },
            function(cb) {
                    Object.keys(bootstrap.app.datasources).forEach(function(dsname) {
                        log.debug(log.defaultContext(), dsname);
                    });
                    ModelDefinition.create(models, bootstrap.defaultContext, function(err, res) {
                        if (err) {
                            log.debug(log.defaultContext(), 'unable to create model');
                            cb();
                        } else {
                            cb();
                        }
                    });
                },
        function(cb) {
                    DataSourceMapping.create(mappingsForTenant1, tenant1Scope, function(err, res) {
                        if (err) {
                            cb(err);
                        } else {
                            cb();
                        }
                    });
                },
        function(cb) {
                        DataSourceMapping.create(mappingsForTenant2, tenant2Scope, function(err, res) {
                            if (err) {
                                cb(err);
                            } else {
                                cb();
                            }
                        });
                },
        function(cb) {
                    Object.keys(bootstrap.app.datasources).forEach(function iter(id) {
                        log.debug(log.defaultContext(), id, bootstrap.app.datasources[id].settings);
                    });
                    cb();
                },
        function() {
                    done();
                }]);
    });

    it('tenant1 and model 1 ', function(done) {
        var model = bootstrap.models['model1'];
        var ds = model.getDataSource(tenant1Scope);
        expect(ds).not.to.be.null;
        expect(ds.settings.database).to.equal('tenant1a');
        done();
    });

    it('tenant2 and model 1 ', function(done) {
        var model = bootstrap.models['model1'];
        var ds = model.getDataSource(tenant2Scope);
        expect(ds).not.to.be.null;
        expect(ds.settings.database).to.equal('tenant2a');

        done();
    });

    it('model2 tenant1 commondb ', function(done) {
        var model = bootstrap.models['model2'];
        var ds = model.getDataSource(tenant1Scope);
        expect(ds.settings.database).to.equal('commondb');

        done();
    });

    it('model2 tenant2 commondb ', function(done) {
        var model = bootstrap.models['model2'];
        var ds = model.getDataSource(tenant2Scope);
        expect(ds.settings.database).to.equal('commondb');

        done();
    });

    it('department for tenant 1 ', function(done) {
        var callContext = {};
        callContext.ctx = {
            tenantId: 'tenant1',
            department: 'fx'
        };
        var model = bootstrap.models['model3'];
        var ds = model.getDataSource(callContext);
        expect(ds.settings.database).to.equal('fxdb');

        done();
    });

    it('superdb higher priority ', function(done) {
        var callContext = {};

        callContext.ctx = {
            superpower: true,
            tenantId: 'tenant1',
            department: 'fx'
        };

        var model = bootstrap.models['model1'];
        var ds = model.getDataSource(callContext);
        expect(ds.settings.database).to.equal('superdb');

        done();
    });

    after('after clean up', function(done) {
        cleanup(function() {
            done();
        });
    });

});
