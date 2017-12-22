/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var chai = require('chai');
var path = require('path');
var _ = require('lodash');
chai.use(require('chai-things'));
var mergeUtil = require('../lib/merge-util');
var expect = chai.expect;
var options = bootstrap.options;

describe(chalk.blue('Config files merge test'), function () {
  xit('Test - merge config ', function (done) {
    var serverConfig = {
      'restApiRoot': '/api',
      'host': '0.0.0.0',
      'port': 3000,
      'cookieSecret': 'cookie-secret',
      'remoting': {
        'context': {
          'enableHttpContext': true
        },
        'rest': {
          'normalizeHttpPath': false,
          'xml': false
        },
        'json': {
          'strict': false,
          'limit': '2048kb'
        },
        'urlencoded': {
          'extended': true,
          'limit': '2048kb'
        },
        'cors': false,
        'errorHandler': {
          'disableStackTrace': false
        }
      },
      'legacyExplorer': false,
      'log': {
        'type': 'rotating-file',
        'path': './fw-log.log',
        'period': '1d',
        'count': 3
      },
      'frameworkdsname': 'ev_db',
      'systemId': 'temporaryId',
      'disablecaching': false,
      'disableWorkflow': true,
      'modelstocache': ['ACL', 'ModelDefinition', 'PersonalizationRule'],
      'tenantsource': 'HEADER',
      'tenantkey': 'tenant_id',
      'disableNodered': true,
      'app': 'oecloud.io',
      'realm': 'oecloud',
      'enableJWTAssertion': false,
      'encryptionAlgorithm': 'crypto.aes256',
      'encryptionPassword': 'SomePassword',
      'otpConfig': {
        'FundsTransfer': 'transferFund'
      }
    };
    var clientConfig = {
      'restApiRoot': '/api',
      'host': '0.0.0.0',
      'port': 5000,
      'cookieSecret': 'cookie-secret',
      'remoting': {
        'context': {
          'enableHttpContext': true
        },
        'rest': {
          'normalizeHttpPath': false,
          'xml': false
        },
        'json': {
          'strict': false,
          'limit': '2048kb'
        },
        'urlencoded': {
          'extended': true,
          'limit': '2048kb'
        },
        'cors': false,
        'errorHandler': {
          'disableStackTrace': false
        }
      },
      'legacyExplorer': false,
      'disablecaching': true,
      'modelstocache': ['Loan', 'Country']
    };
    mergeUtil.mergeFn(serverConfig, clientConfig);

    expect(serverConfig).not.to.be.null;
    expect(serverConfig).not.to.be.empty;
    expect(serverConfig).not.to.be.undefined;
    expect(serverConfig.port).to.be.equal(5000);
    expect(serverConfig.modelstocache).to.be.instanceof(Array);
    expect(serverConfig.modelstocache).to.have.length(5);
    expect(serverConfig.frameworkdsname).to.be.equal('ev_db');
    expect(serverConfig.disablecaching).to.be.equal(true);
    done();
  });

  xit('Test - merge middleware ', function (done) {
    var serverMiddleware = {
      'initial:before': {
        'loopback#favicon': {}
      },
      'initial': {
        'compression': {},
        'cors': {
          'params': {
            'origin': true,
            'credentials': true,
            'maxAge': 86400
          }
        }
      },
      'session': {},
      'auth': {},
      'parse': {},
      'routes:before': {
        'loopback#context': {},
        './middleware/http-method-overriding-filter': {},
        './middleware/context-populator-filter': {
          'enabled': true
        },
        './middleware/req-logging-filter': {},
        './middleware/contributor-selector-filter': {},
        './middleware/useragent-populator-filter': {},
        '../server/middleware/model-discovery-filter': ['restApiPath']
      },
      'routes:after': {
      },
      'files': {
        'loopback#static': {
          'params': '$!../client'
        }
      },
      'final': {
        'loopback#urlNotFound': {}
      },
      'final:after': {

      }
    };

    var clientMiddleware = {
      'initial:before': {
        'loopback#favicon': {}
      },
      'initial': {
        'compression': {},
        'cors': {
          'params': {
            'origin': true,
            'credentials': true,
            'maxAge': 86400
          }
        }
      },
      'session': {},
      'auth': {},
      'parse': {},
      'routes:before': {
        './middleware/routes-before-middleware': {},
        '../server/middleware/model-discovery-filter': ['restApiNewPath']
      },
      'routes:after': {
      },
      'files': {
        'loopback#static': {
          'params': '$!../client'
        }
      },
      'final': {
        './middleware/final-middleware': {}
      },
      'final:after': {
        'errorhandler': {}
      }
    };
    var temp = '<dummy>';
    var relativeServerPath = replaceAll(path.relative(options.appRootDir, options.clientAppRootDir), '\\', '/') + '/';
    var relativePath = replaceAll(path.relative(options.appRootDir, ''), '\\', '/') + '/';
    function escapeRegExp(str) {
      return str.replace(/([.*+?^=!:${}()\[\]\/\\])/g, '\\$1');
    }
    function replaceAll(str, find, replace) {
      return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
    }
    var tempmiddleware = replaceAll(JSON.stringify(clientMiddleware), '../', temp);
    tempmiddleware = replaceAll(tempmiddleware, './', relativeServerPath);
    clientMiddleware = JSON.parse(replaceAll(tempmiddleware, temp, relativePath));

    mergeUtil.mergeMiddlewareConfig(serverMiddleware, clientMiddleware);
    expect(serverMiddleware).not.to.be.null;
    expect(serverMiddleware).not.to.be.empty;
    expect(serverMiddleware).not.to.be.undefined;
    expect(Object.getOwnPropertyNames(serverMiddleware['routes:before']).length).to.be.equal(8);
    expect(Object.getOwnPropertyNames(serverMiddleware.final).length).to.be.equal(2);
    expect(Object.getOwnPropertyNames(serverMiddleware['final:after']).length).to.be.equal(1);
    done();
  });

  xit('Test - merge model-config ', function (done) {
    var serverModelConfig = {
      '_meta': {
        'sources': [
          'loopback/common/models',
          'loopback/server/models',
          '../common/models',
          './models'
        ],
        'mixins': [
          'loopback/common/mixins',
          'loopback/server/mixins',
          '../common/mixins',
          './mixins'
        ]
      },
      'BaseUser': {
        'dataSource': 'ev_db',
        'public': true
      },
      'ModelDefinition': {
        'dataSource': 'db',
        'public': true
      },
      'DataSourceDefinition': {
        'dataSource': 'db',
        'public': true
      }
    };

    var clientModelConfig = {
      '_meta': {
        'sources': [
          'loopback/common/models',
          'loopback/server/models',
          '../common/models/demo'
        ],
        'mixins': [
          'loopback/common/mixins',
          'loopback/server/mixins'
        ]
      },
      'BaseUser': {
        'dataSource': 'db',
        'public': true
      },
      'Address': {
        'dataSource': 'db',
        'public': true
      },
      'ComboValue': {
        'dataSource': 'db',
        'public': true
      },
      'Contact': {
        'dataSource': 'db',
        'public': true
      },
      'Country': {
        'dataSource': 'db',
        'public': true
      },
      'Customer': {
        'dataSource': 'db',
        'public': true
      },
      'Deposit': {
        'dataSource': 'db',
        'public': true
      }
    };

    function modifyPath(element) {
      if (element.indexOf('./') === 0 || element.indexOf('../') === 0) {
        // Relative path
        // element = path.resolve(options.clientAppRootDir, element);
        return path.relative(options.appRootDir, path.resolve(options.clientAppRootDir, element));
      }
      return element;
    }

    if (clientModelConfig._meta && clientModelConfig._meta.sources) {
      clientModelConfig._meta.sources = _.map(clientModelConfig._meta.sources, modifyPath);
    }
    if (clientModelConfig._meta && clientModelConfig._meta.mixins) {
      clientModelConfig._meta.mixins = _.map(clientModelConfig._meta.mixins, modifyPath);
    }

    mergeUtil.mergeFn(serverModelConfig, clientModelConfig);

    expect(serverModelConfig).not.to.be.null;
    expect(serverModelConfig).not.to.be.empty;
    expect(serverModelConfig).not.to.be.undefined;
    expect(Object.getOwnPropertyNames(serverModelConfig).length).to.be.equal(10);
    expect(serverModelConfig._meta.sources).to.have.length(5);
    expect(serverModelConfig._meta.mixins).to.have.length(4);
    expect(serverModelConfig.BaseUser.dataSource).to.be.equal('db');
    done();
  });

  xit('Test - merge datasources ', function (done) {
    var serverDatasource = {
      'nullsrc': {
        'name': 'nullsrc',
        'connector': 'memory'
      },
      'db': {
        'host': '127.0.0.1',
        'port': 27017,
        'url': 'mongodb://127.0.0.1:27017/mem_db',
        'database': 'mem_db',
        'password': 'admin',
        'name': 'db',
        'connector': 'mongodb',
        'user': 'admin',
        'connectionTimeout': 50000
      },
      'ev_db': {
        'host': '127.0.0.1',
        'port': 27017,
        'url': 'mongodb://127.0.0.1:27017/ev_db',
        'database': 'ev_db',
        'password': 'admin',
        'name': 'ev_db',
        'connector': 'mongodb',
        'user': 'admin',
        'connectionTimeout': 50000
      },
      'fin_db': {
        'host': '127.0.0.1',
        'port': 27017,
        'url': 'mongodb://127.0.0.1:27017/fin_db',
        'database': 'fin_db',
        'password': 'admin',
        'name': 'fin_db',
        'connector': 'mongodb',
        'user': 'admin',
        'connectionTimeout': 50000
      }
    };

    var clientDatasource = {
      'db2': {
        'name': 'db',
        'connector': 'memory'
      },
      'fin_db': {
        'host': 'localhost',
        'port': 27017,
        'url': 'mongodb://localhost:27017/fin_db',
        'database': 'fin_db',
        'password': 'admin',
        'name': 'fin_db',
        'connector': 'mongodb',
        'user': 'admin',
        'connectionTimeout': 50000
      }
    };

    mergeUtil.mergeDataSourcesObjects(serverDatasource, clientDatasource);

    expect(serverDatasource).not.to.be.null;
    expect(serverDatasource).not.to.be.empty;
    expect(serverDatasource).not.to.be.undefined;
    expect(Object.getOwnPropertyNames(serverDatasource).length).to.be.equal(5);
    expect(serverDatasource.fin_db.host).to.be.equal('localhost');
    expect(serverDatasource.fin_db.connector).to.be.equal('mongodb');
    done();
  });

  xit('Test - merge component config ', function (done) {
    var serverComponetConfig = {
      'loopback-component-explorer': {
        'mountPath': '/explorer'
      },
      './components/my-component.js': {
        'path': '/my-component'
      },
      './components/new-component': 'myApp'
    };

    var clientComponentConfig = {
      'loopback-component-explorer': {
        'mountPath': '/swagger'
      }
    };

    mergeUtil.mergeFn(serverComponetConfig, clientComponentConfig);

    expect(serverComponetConfig).not.to.be.null;
    expect(serverComponetConfig).not.to.be.empty;
    expect(serverComponetConfig).not.to.be.undefined;
    expect(Object.getOwnPropertyNames(serverComponetConfig).length).to.be.equal(3);
    expect(serverComponetConfig['loopback-component-explorer'].mountPath).to.be.equal('/swagger');
    done();
  });

  xit('Test - merge providers.json config ', function (done) {

    var loadAppProviders = mergeUtil.loadAppProviders;
    var applist = [
      {
        "path": "oe-workflow",
        "enabled": false
      },
      {
        "path": "./",
        "enabled": true
      }
    ]
    var providers = loadAppProviders(applist);
    expect(providers).not.to.be.null;
    expect(providers).not.to.be.undefined;
    done();
  });

  xit('Test - merge log config ', function (done) {

    var loadAppLogConfig = mergeUtil.loadAppLogConfig;
    var applist = [
      {
        "path": "oe-workflow",
        "enabled": false
      },
      {
        "path": "./",
        "enabled": true
      }
    ]
    var logConfig = loadAppLogConfig(applist);
    expect(logConfig).not.to.be.null;
    expect(logConfig).not.to.be.undefined;
    done();
  });

  it('Test - Merge all configs using applist', function (done) {
    var loadAppList = mergeUtil.loadAppList;
    var applist = [
      {
        "path": "oe-workflow",
        "enabled": false
      },
      {
        "path": "./",
        "enabled": true
      }
    ]
    var options = loadAppList(applist, "./dummyClientPath", {});
    expect(options).not.to.be.null;
    expect(options).not.to.be.empty;
    expect(options).not.to.be.undefined;
    expect(options).to.include.keys('appRootDir', 'appConfigRootDir', 'modelsRootDir',
      'dsRootDir', 'mixinDirs', 'bootDirs', 'clientAppRootDir', 'skipConfigurePassport',
      'config', 'middleware', 'models', 'dataSources', 'components', 'providerJson');
    expect(options.config).not.to.be.null;
    expect(options.config).not.to.be.empty;
    expect(options.config).not.to.be.undefined;
    expect(options.config).to.include.keys('frameworkdsname', 'restApiRoot', 'host', 'port');
    expect(options.config.modelstocache).to.be.instanceof(Array);
    expect(options.middleware).not.to.be.null;
    expect(options.middleware).not.to.be.empty;
    expect(options.middleware).not.to.be.undefined;
    // Removed 'auth' middleware check since the object is empty.
    expect(options.middleware).to.include.keys('initial:before', 'session:before', 'auth:after');
    done();
  });
});
