/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var api = bootstrap.api;
var models = bootstrap.models;
var logger = require('../lib/logger');
var log = logger('data-personalization-test');
var loopback = require('loopback');
var async = require('async');
var app = bootstrap.app;

describe(chalk.blue('Data Personalization Test --REST'), function DatPersonalizationRest() {
  // Testmodel  has no autoscoped variable.
  this.timeout(1000000);
  var modelName = 'DataPersonalizationTestModel';
  var modelDetails = {
    name: modelName,
    base: 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
        'required': true
      }
    },
    strict: false,
    idInjection: false,
    plural: modelName,
    mixins: {
      'HistoryMixin': true
    }
  };

  // Testmodel one has one autoscoped variable(tenantId)
  var modelName1 = 'DataPersonalizationModelOne';
  var modelDetails1 = {
    name: modelName1,
    base: 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
        'required': true
      }
    },
    strict: false,
    idInjection: true,
    plural: modelName1,
    mixins: {
      'HistoryMixin': true
    },
    autoscope: [
      'tenantId'
    ]
  };

  // Testmodel two has two autoscoped variable(tenantId,username)
  var modelName2 = 'DataPersonalizationModelTwo';
  var modelDetails2 = {
    name: modelName2,
    base: 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
        'required': true
      }
    },
    strict: false,
    idInjection: false,
    plural: modelName2,
    mixins: {
      'HistoryMixin': true
    },
    autoscope: [
      'tenantId', 'username'
    ]
  };

  var myScopeModel = 'MyScope';
  var modelDetailsScope = {
    name: myScopeModel,
    base: 'BaseEntity',
    properties: {
      'device': {
        'type': 'string'
      },
      'location': {
        'type': 'string'
      },
      'lang': {
        'type': 'string'
      }
    },
    strict: false,
    idInjection: false,
    plural: myScopeModel,
    mixins: {
      'HistoryMixin': true,
      'SoftDeleteMixin': false
    }
  };

  var myScopeModel1 = 'ModelWithScopeAsModel';
  var modelDetailsScopeModel = {
    name: myScopeModel1,
    base: 'BaseEntity',
    properties: {
      'name': {
        'type': 'string'
      },
      'scope': {
        'type': myScopeModel
      }
    },
    strict: false,
    idInjection: false,
    plural: myScopeModel1,
    mixins: {
      'HistoryMixin': true
    },
    autoscope: [
      'tenantId'
    ]
  };

  var testData = [
    {
      'name': 'noScope'
    },
    {
      'name': 's1d1',
      'scope': {
        'device': 'ios'
      }
    },
    {
      'name': 's1d2',
      'scope': {
        'device': 'android'
      }
    },
    {
      'name': 's1d3',
      'scope': {
        'device': 'windows'
      }
    },
    {
      'name': 's2d1l1',
      'scope': {
        'device': 'ios',
        'location': 'us'
      }
    },
    {
      'name': 's2d1l2',
      'scope': {
        'device': 'ios',
        'location': 'uk'
      }
    },
    {
      'name': 's2d1l3',
      'scope': {
        'device': 'ios',
        'location': 'in'
      }
    },
    {
      'name': 's2d2l1',
      'scope': {
        'device': 'android',
        'location': 'us'
      }
    },
    {
      'name': 's2d2l2',
      'scope': {
        'device': 'android',
        'location': 'uk'
      }
    },
    {
      'name': 's2d2l3',
      'scope': {
        'device': 'android',
        'location': 'in'
      }
    },
    {
      'name': 's2d1ln1',
      'scope': {
        'device': 'ios',
        'lang': 'en-us'
      }
    },
    {
      'name': 's2d1ln2',
      'scope': {
        'device': 'ios',
        'lang': 'en-uk'
      }
    },
    {
      'name': 's2d1ln3',
      'scope': {
        'device': 'ios',
        'lang': 'en-in'
      }
    },
    {
      'name': 's2d2ln1',
      'scope': {
        'device': 'android',
        'lang': 'en-us'
      }
    },
    {
      'name': 's2d2ln2',
      'scope': {
        'device': 'android',
        'lang': 'en-uk'
      }
    },
    {
      'name': 's2d2ln3',
      'scope': {
        'device': 'android',
        'lang': 'en-in'
      }
    },
    {
      'name': 's2l1ln1',
      'scope': {
        'location': 'us',
        'lang': 'en-us'
      }
    },
    {
      'name': 's2l1ln2',
      'scope': {
        'location': 'us',
        'lang': 'en-uk'
      }
    },
    {
      'name': 's2l1ln3',
      'scope': {
        'location': 'us',
        'lang': 'en-in'
      }
    },
    {
      'name': 's2l2ln1',
      'scope': {
        'location': 'uk',
        'lang': 'en-us'
      }
    },
    {
      'name': 's2l2ln2',
      'scope': {
        'location': 'uk',
        'lang': 'en-uk'
      }
    },
    {
      'name': 's2l2ln3',
      'scope': {
        'location': 'uk',
        'lang': 'en-in'
      }
    },
    {
      'name': 's2l3ln1',
      'scope': {
        'location': 'in',
        'lang': 'en-us'
      }
    },
    {
      'name': 's2l3ln2',
      'scope': {
        'location': 'in',
        'lang': 'en-uk'
      }
    },
    {
      'name': 's2l3ln3',
      'scope': {
        'location': 'in',
        'lang': 'en-in'
      }
    },
    {
      'name': 's3d1l1ln1',
      'scope': {
        'location': 'us',
        'lang': 'en-us',
        'device': 'ios'
      }
    },
    {
      'name': 's3d2l3ln2',
      'scope': {
        'location': 'in',
        'lang': 'en-uk',
        'device': 'android'
      }
    },
    {
      'name': 's3d3l3ln3',
      'scope': {
        'location': 'in',
        'lang': 'en-in',
        'device': 'windows'
      }
    },
    {
      'name': 's3d3l1ln3',
      'scope': {
        'location': 'us',
        'lang': 'en-in',
        'device': 'windows'
      }
    },
    {
      'name': 's3d3l2ln3',
      'scope': {
        'location': 'uk',
        'lang': 'en-in',
        'device': 'windows'
      }
    }
  ];
  var testData1 = [
    {
      'name': 'e1'
    },
    {
      'name': 's1l1',
      'scope': {
        'location': 'us'
      }
    }
  ];

  before('Create Test model', function restBeforeAll(done) {
    async.parallel([
      function asyncModel(callback) {
        models.ModelDefinition.create(modelDetails, bootstrap.defaultContext, function modelCreate(err, res) {
          if (err) {
            log.debug(bootstrap.defaultContext, 'unable to create DataPersonalizationTestModel model');
            callback(err);
          } else {
            callback();
          }
        });
      },
      function asyncModelOne(callback) {
        models.ModelDefinition.create(modelDetails1, bootstrap.defaultContext, function modelOneCreate(err, res) {
          if (err) {
            log.debug(bootstrap.defaultContext, 'unable to create DataPersonalizationTestModel1 model');
            callback(err);
          } else {
            callback();
          }
        });
      },
      function asyncModelTwo(callback) {
        models.ModelDefinition.create(modelDetails2, bootstrap.defaultContext, function modelTwoCreate(err, res) {
          if (err) {
            log.debug(bootstrap.defaultContext, 'unable to create DataPersonalizationTestModel2 model');
            callback(err);
          } else {
            callback();
          }
        });
      },
      function asyncDetailScopeModel(callback) {
        models.ModelDefinition.create(modelDetailsScope, bootstrap.defaultContext, function detailScopeModelCreate(err, res) {
          if (err) {
            callback(err);
          } else {
            callback();
          }
        });
      },
      function asyncScopeModel(callback) {
        models.ModelDefinition.create(modelDetailsScopeModel, bootstrap.defaultContext, function scopeModelCreate(err, res) {
          if (err) {
            callback(err);
          } else {
            callback();
          }
        });
      }
    ],
      function asyncFinalCb(err) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });

  after('Remove Test Model', function restAfterAll(done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'device': ['ios', 'windows', 'android'],
      'location': ['us', 'in', 'uk'],
      'lang': ['en-us', 'en-in'],
      'roles': ['admin', 'designer']
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'username': '0',
      'device': '0',
      'location': '0',
      'lang': '0',
      'roles': '0'
    };

    models[modelName].destroyAll({}, callContext, function modelDestroyAll(err, result) {
      if (err) {
        done(err);
      }
      models[modelName1].destroyAll({}, callContext, function modelDestroyAll(err, result) {
        if (err) {
          done(err);
        }
        models[modelName2].destroyAll({}, callContext, function modelDestroyAll(err, result) {
          if (err) {
            done(err);
          }
          done();
        });
      });
    });
  });

  it('- Should insert data into TestModel with and without any manual scope into non-autoscoped test model[Group of records]', function (done) {
    var url1 = bootstrap.basePath + '/' + modelName;
    api
      .post(url1)
      .send(testData1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          done();
        }
      });
  });

  it('- Should insert data into TestModel with and without any manual scope [Group of records]', function (done) {
    var url = bootstrap.basePath + '/' + modelName2;
    api
      .post(url)
      .send(testData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          done();
        }
      });
  });

  it('- Should insert data into TestModel without any manual or auto scope in data', function (done) {
    var postData = {
      'name': 'noScope'
    };
    var url = bootstrap.basePath + '/' + modelName1;
    api
      .post(url)
      .send(postData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body.name).to.be.equal('noScope');
          done();
        }
      });
  });

  it('- Should insert data into TestModel with manual scope', function (done) {
    var postData = {
      'name': 's3d2l3ln1',
      'scope': {
        'location': 'in',
        'lang': 'en-us',
        'device': 'android'
      }
    };
    var url = bootstrap.basePath + '/' + modelName1;
    api
      .post(url)
      .send(postData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body.name).to.be.equal('s3d2l3ln1');
          done();
        }
      });
  });

  it('- Should not insert data into TestModel with auto scope defined on model and not passed as part of header or query string', function (done) {
    var postData = {
      'name': 's3d2l1ln1',
      'scope': {
        'location': 'us',
        'lang': 'en-us',
        'device': 'android'
      }
    };
    var url = bootstrap.basePath + '/' + modelName1;
    api
      .post(url)
      .send(postData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(500);
    done();
  });

  it('- Should not insert data into TestModel with auto scope', function (done) {
    var postData = {
      'name': 's3d2l1ln1',
      'scope': {
        'location': 'us',
        'lang': 'en-us',
        'device': 'android',
        'tenantId': 'test-tenant'
      }
    };
    var url = bootstrap.basePath + '/' + modelName1;
    api
      .post(url)
      .send(postData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(500);
    done();
  });

  it('- Should retrieve data from TestModel without any manual scope contributors', function (done) {
    var url = bootstrap.basePath + '/' + modelName2;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.empty;
          done();
        }
      });
  });

  it('- Should retrieve data from TestModel with context contributors', function (done) {
    var url = bootstrap.basePath + '/' + modelName2;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .set('device', 'ios')
      .set('location', 'in')
      .set('lang', 'en-in')
      .set('x-ctx-weight-device', '30')
      .set('x-ctx-weight-location', '20')
      .set('x-ctx-weight-lang', '50')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.empty;
          done();
        }
      });
  });

  it('- Should retrieve data from TestModel without any autoscoped values defined on Model', function (done) {
    var url = bootstrap.basePath + '/' + modelName;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .set('device', 'ios')
      .set('location', 'in')
      .set('lang', 'en-in')
      .set('x-ctx-weight-device', '30')
      .set('x-ctx-weight-location', '20')
      .set('x-ctx-weight-lang', '50')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.empty;
          done();
        }
      });
  });

  it('- Should not retrieve any data from TestModel with autoscoped values defined on Model but not provided by user', function (done) {
    var url = bootstrap.basePath + '/' + modelName2;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('device', 'ios')
      .set('location', 'in')
      .set('lang', 'en-in')
      .set('x-ctx-weight-device', '30')
      .set('x-ctx-weight-location', '20')
      .set('x-ctx-weight-lang', '50')
      .expect(500);
    done();
  });

  it('- Should retrieve data from TestModel in Descending order based on score calculated from context', function (done) {
    var url = bootstrap.basePath + '/' + modelName2;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .set('device', 'windows')
      .set('location', 'IN')
      .set('lang', 'en-IN')
      .set('x-ctx-weight-device', '30')
      .set('x-ctx-weight-location', '20')
      .set('x-ctx-weight-lang', '50')
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.empty;
          expect(result.body[0].name).to.be.equal('s3d3l3ln3');
          done();
        }
      });
  });

  it('- Should retrieve data from TestModel in Descending order based on score calculated from context', function (done) {
    var url = bootstrap.basePath + '/' + modelName2;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .set('device', 'ios')
      .set('location', 'us')
      .set('lang', 'en-us')
      .set('x-ctx-weight-device', '50')
      .set('x-ctx-weight-location', '20')
      .set('x-ctx-weight-lang', '30')
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.empty;
          expect(result.body[0].name).to.be.equal('s3d1l1ln1');
          done();
        }
      });
  });

  it('- Should retrieve data from TestModel without any scope when defaults is set', function (done) {
    var url = bootstrap.basePath + '/' + modelName2;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .set('defaults', true)
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.empty;
          expect(result.body[0].name).to.be.equal('noScope');
          done();
        }
      });
  });

  it('- Should be able to post data with scope containing array of values', function (done) {
    var url = bootstrap.basePath + '/' + modelName1;
    var postData = {
      'name': 'S1RolesArray',
      'scope': {
        'roles': ['admin', 'designer']
      }
    };
    api
      .post(url)
      .send(postData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body.name).to.be.equal('S1RolesArray');
          done();
        }
      });
  });

  it('- Should be able retrieve all record with scope values in ignoreList', function (done) {
    var url = bootstrap.basePath + '/' + modelName1;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .set('x-ignore-context', '["device"]')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body).to.have.length(1);
          done();
        }
      });
  });

  it('- Should be able to insert data into TestModel with manual scope being a another Model', function (done) {
    var postData = {
      'name': 'modelWithScopeAsModel',
      'scope': {
        'location': 'in',
        'lang': 'en-us',
        'device': 'android'
      }
    };
    var url = bootstrap.basePath + '/' + myScopeModel1;
    api
      .post(url)
      .send(postData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          // console.log("=================",result.body);
          expect(result).not.to.be.null;
          expect(result).not.to.be.empty;
          expect(result).not.to.be.undefined;
          expect(result.body.name).to.be.equal('modelWithScopeAsModel');
          done();
        }
      });
  });

  it('- Should be able to retrieve data from TestModel with manual scope being a another Model', function (done) {
    var url = bootstrap.basePath + '/' + myScopeModel1;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .set('location', 'in')
      .set('lang', 'en-us')
      .set('device', 'android')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          // console.log("================", result.body);
          expect(result).not.to.be.null;
          expect(result).not.to.be.empty;
          expect(result).not.to.be.undefined;
          expect(result.body[0].name).to.be.equal('modelWithScopeAsModel');
          done();
        }
      });
  });

  it('- Should be able to update data in TestModel with manual scope being a another Model', function (done) {
    var url = bootstrap.basePath + '/' + myScopeModel1;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .set('location', 'in')
      .set('lang', 'en-us')
      .set('device', 'android')
      .expect(200).end(function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("==============", res.body);
          var postData = res.body[0];
          postData.name = 'modelWithScopeAsModelUpdate';
          api
            .put(url)
            .send(postData)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('tenant_id', 'test-tenant')
            .set('location', 'in')
            .set('lang', 'en-us')
            .set('device', 'android')
            .expect(200).end(function (err, result) {
              if (err) {
                done(err);
              } else {
                // console.log("--------------", result.body);
                expect(result).not.to.be.null;
                expect(result).not.to.be.empty;
                expect(result).not.to.be.undefined;
                expect(result.body.name).to.be.equal('modelWithScopeAsModelUpdate');
                done();
              }
            });
        }
      });
  });

  it('- Should be able to delete data in TestModel with manual scope being a another Model', function (done) {
    var url = bootstrap.basePath + '/' + myScopeModel1;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .set('location', 'in')
      .set('lang', 'en-us')
      .set('device', 'android')
      .expect(200).end(function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("==============", res.body);
          url = url + '/' + res.body[0].id;
          api
            .delete(url)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('tenant_id', 'test-tenant')
            .set('location', 'in')
            .set('lang', 'en-us')
            .set('device', 'android')
            .expect(200).end(function (err, result) {
              if (err) {
                done(err);
              } else {
                // console.log("--------------", result.body);
                expect(result).not.to.be.null;
                expect(result).not.to.be.empty;
                expect(result).not.to.be.undefined;
                expect(result.body.count).to.be.equal(1);
                done();
              }
            });
        }
      });
  });

  it('- Should be able to write custom query on scope which will take higher precidence on manual scope query', function (done) {
    var url = bootstrap.basePath + '/' + modelName1 + '?filter={"where":{"scope.device": "android"}}';
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .set('device', 'windows')
      .set('lang', 'en-us')
      .set('location', 'in')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body).to.have.length(1);
          expect(result.body[0].name).to.be.equal('s3d2l3ln1');
          done();
        }
      });
  });

  it('- Test for insertion of data in model connected to memory DB', function (done) {
    var memDbModel = {
      'name': 'NewMemDBModel',
      'base': 'PersistedModel',
      'strict': false,
      'idInjection': false,
      'options': {
        'validateUpsert': true
      },
      'properties': {
        'name': {
          'type': 'string',
          'required': true
        }
      },
      'hidden': [],
      'validations': [],
      'relations': {},
      'acls': [],
      'methods': {},
      'mixins': {
        'ObserverMixin': true,
        'ModelValidations': true,
        'HistoryMixin': true,
        'DataPersonalizationMixin': true
      },
      'autoscope': [
        'org'
      ]
    };

    var data = {
      'name': 'scopedRecord',
      'scope': {
        'device': 'mobile',
        'location': 'in'
      }
    };

    var newmodel = loopback.createModel(memDbModel);
    app.model(newmodel, {
      dataSource: 'nullsrc'
    });

    var url = bootstrap.basePath + '/NewMemDBModels';
    api
      .post(url)
      .send(data)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('org', 'ev')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body.name).to.be.equal('scopedRecord');
          done();
        }
      });
  });

  it('- Test for fetching data from a model connected to memory DB', function (done) {
    var url = bootstrap.basePath + '/NewMemDBModels';
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('org', 'ev')
      .set('location', 'in')
      .set('device', 'mobile')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body).to.be.instanceof(Array);
          expect(result.body).to.have.length(1);
          expect(result.body[0].name).to.be.equal('scopedRecord');
          done();
        }
      });
  });

  it('- Test for insertion of data in model(no autoscope) connected to memory DB', function (done) {
    var memDbModel = {
      'name': 'NewMemDBModelNoAutoScope',
      'base': 'PersistedModel',
      'strict': false,
      'idInjection': false,
      'options': {
        'validateUpsert': true
      },
      'properties': {
        'name': {
          'type': 'string',
          'required': true
        }
      },
      'hidden': [],
      'validations': [],
      'relations': {},
      'acls': [],
      'methods': {},
      'mixins': {
        'ObserverMixin': true,
        'ModelValidations': true,
        'HistoryMixin': true,
        'DataPersonalizationMixin': true
      }
    };

    var data = {
      'name': 'scopedRecord',
      'scope': {
        'device': 'mobile',
        'location': 'in'
      }
    };
    var newmodel = loopback.createModel(memDbModel);
    app.model(newmodel, {
      dataSource: 'nullsrc'
    });

    var url = bootstrap.basePath + '/NewMemDBModelNoAutoScopes';
    api
      .post(url)
      .send(data)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body.name).to.be.equal('scopedRecord');
          done();
        }
      });
  });

  it('- Test for fetching data from a model(no autoscope) connected to memory DB', function (done) {
    var url = bootstrap.basePath + '/NewMemDBModelNoAutoScopes';
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('location', 'in')
      .set('device', 'mobile')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body).to.be.instanceof(Array);
          expect(result.body).to.have.length(1);
          expect(result.body[0].name).to.be.equal('scopedRecord');
          done();
        }
      });
  });

  it('- Test for fetching data from a model connected to memory DB with wrong contributor values', function (done) {
    var url = bootstrap.basePath + '/NewMemDBModels';
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('org', 'ev')
      .set('location', 'in')
      .set('device', 'tab')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.undefined;
          expect(result.body).to.be.instanceof(Array);
          done();
        }
      });
  });

  it('- Test for mixin applied property on model while posting data', function (done) {
    var modelWithOutMixin = {
      'name': 'NewModelWithOutMixin',
      'base': 'BaseEntity',
      'strict': false,
      'idInjection': false,
      'options': {
        'validateUpsert': true
      },
      'properties': {
        'name': {
          'type': 'string',
          'required': true
        }
      },
      'hidden': [],
      'validations': [],
      'relations': {},
      'acls': [],
      'methods': {},
      'mixins': {
        'HistoryMixin': true,
        'DataPersonalizationMixin': false
      },
      'autoscope': [
        'tenantId'
      ]
    };

    var data = {
      'name': 'scopedRecord',
      'scope': {
        'device': 'mobile',
        'location': 'in'
      }
    };

    models.ModelDefinition.create(modelWithOutMixin, bootstrap.defaultContext, function (err, res) {
      if (err) {
        log.debug(bootstrap.defaultContext, 'unable to create model');
        done(err);
      } else {
        var url = bootstrap.basePath + '/NewModelWithOutMixins';
        api
          .post(url)
          .send(data)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .expect(200).end(function (err, result) {
            if (err) {
              done(err);
            } else {
              expect(result.body).not.to.be.null;
              expect(result.body).not.to.be.empty;
              expect(result.body).not.to.be.undefined;
              expect(result.body.name).to.be.equal('scopedRecord');
              done();
            }
          });
      }
    });
  });

  it('- Test for mixin applied property on model while getting data', function (done) {
    var url = bootstrap.basePath + '/NewModelWithOutMixins';
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body).to.be.instanceof(Array);
          expect(result.body).to.have.length(1);
          expect(result.body[0].name).to.be.equal('scopedRecord');
          done();
        }
      });
  });

  it('- Should be able to post a record with unique validation on property with scope', function (done) {
    var modelUnique = 'NewModelUnique';
    var modelDetailsUnique = {
      name: modelUnique,
      base: 'BaseEntity',
      properties: {
        'a': {
          'type': 'string',
          'unique': true
        },
        'b': {
          'type': 'string',
          'unique': true
        }
      },
      strict: false,
      idInjection: false,
      mixins: {
        'HistoryMixin': true
      },
      autoscope: [
        'org'
      ],
      scoreScheme: 'max'
    };

    var postData = [
      {
        'a': '1',
        'b': '1',
        'scope': {
          'rule': 'x'
        }
      },
      {
        'a': '2',
        'b': '2',
        'scope': {
          'rule': 'x'
        }
      },
      {
        'a': '1',
        'b': '1',
        'scope': {
          'rule': 'y',
          'category': 'x'
        }
      },
      {
        'a': '2',
        'b': '1',
        'scope': {
          'rule': 'y',
          'category': 'y'
        }
      },
      {
        'a': '1',
        'b': '2',
        'scope': {
          'rule': 'y',
          'category': 'y'
        }
      }
    ];

    var callContext = {};
    callContext.ctx = {
      'tenantId': 'unique-tenant'
    };

    callContext.ctxWeights = {
      'tenantId': '0'
    };

    models.ModelDefinition.create(modelDetailsUnique, callContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        var url = bootstrap.basePath + '/NewModelUniques';
        api
          .post(url)
          .send(postData)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('org', 'fin')
          .expect(200).end(function (err, result) {
            if (err) {
              done(err);
            } else {
              expect(result.body).not.to.be.null;
              expect(result.body).not.to.be.empty;
              expect(result.body).not.to.be.undefined;
              expect(result.body).to.be.instanceof(Array);
              expect(result.body).to.have.length(5);
              done();
            }
          });
      }
    });
  });

  it('- Should be able to get unique records with unique validation on property with scope', function (done) {
    var url = bootstrap.basePath + '/NewModelUniques';
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('org', 'fin')
      .set('rule', 'y')
      .set('category', 'y')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body).to.be.instanceof(Array);
          expect(result.body).to.have.length(2);
          done();
        }
      });
  });
});

describe(chalk.blue('Data Personalization Test --Programatic'), function () {
  // this.timeout(1000000);
  // Testmodel  has no autoscoped variable.
  var modelName = 'DataPersonalizationTestModel';

  // Testmodel one has one autoscoped variable(tenantId)
  var modelName1 = 'DataPersonalizationModelOne';

  // Testmodel two has two autoscoped variable(tenantId,username)
  var modelName2 = 'DataPersonalizationModelTwo';

  var myScopeModel1 = 'ModelWithScopeAsModel';

  var testData = [
    {
      'name': 'noScope'
    },
    {
      'name': 's1d1',
      'scope': {
        'device': 'ios'
      }
    },
    {
      'name': 's1d2',
      'scope': {
        'device': 'android'
      }
    },
    {
      'name': 's1d3',
      'scope': {
        'device': 'windows'
      }
    },
    {
      'name': 's2d1l1',
      'scope': {
        'device': 'ios',
        'location': 'us'
      }
    },
    {
      'name': 's2d1l2',
      'scope': {
        'device': 'ios',
        'location': 'uk'
      }
    },
    {
      'name': 's2d1l3',
      'scope': {
        'device': 'ios',
        'location': 'in'
      }
    },
    {
      'name': 's2d2l1',
      'scope': {
        'device': 'android',
        'location': 'us'
      }
    },
    {
      'name': 's2d2l2',
      'scope': {
        'device': 'android',
        'location': 'uk'
      }
    },
    {
      'name': 's2d2l3',
      'scope': {
        'device': 'android',
        'location': 'in'
      }
    },
    {
      'name': 's2d1ln1',
      'scope': {
        'device': 'ios',
        'lang': 'en-us'
      }
    },
    {
      'name': 's2d1ln2',
      'scope': {
        'device': 'ios',
        'lang': 'en-uk'
      }
    },
    {
      'name': 's2d1ln3',
      'scope': {
        'device': 'ios',
        'lang': 'en-in'
      }
    },
    {
      'name': 's2d2ln1',
      'scope': {
        'device': 'android',
        'lang': 'en-us'
      }
    },
    {
      'name': 's2d2ln2',
      'scope': {
        'device': 'android',
        'lang': 'en-uk'
      }
    },
    {
      'name': 's2d2ln3',
      'scope': {
        'device': 'android',
        'lang': 'en-in'
      }
    },
    {
      'name': 's2l1ln1',
      'scope': {
        'location': 'us',
        'lang': 'en-us'
      }
    },
    {
      'name': 's2l1ln2',
      'scope': {
        'location': 'us',
        'lang': 'en-uk'
      }
    },
    {
      'name': 's2l1ln3',
      'scope': {
        'location': 'us',
        'lang': 'en-in'
      }
    },
    {
      'name': 's2l2ln1',
      'scope': {
        'location': 'uk',
        'lang': 'en-us'
      }
    },
    {
      'name': 's2l2ln2',
      'scope': {
        'location': 'uk',
        'lang': 'en-uk'
      }
    },
    {
      'name': 's2l2ln3',
      'scope': {
        'location': 'uk',
        'lang': 'en-in'
      }
    },
    {
      'name': 's2l3ln1',
      'scope': {
        'location': 'in',
        'lang': 'en-us'
      }
    },
    {
      'name': 's2l3ln2',
      'scope': {
        'location': 'in',
        'lang': 'en-uk'
      }
    },
    {
      'name': 's2l3ln3',
      'scope': {
        'location': 'in',
        'lang': 'en-in'
      }
    },
    {
      'name': 's3d1l1ln1',
      'scope': {
        'location': 'us',
        'lang': 'en-us',
        'device': 'ios'
      }
    },
    {
      'name': 's3d2l3ln2',
      'scope': {
        'location': 'in',
        'lang': 'en-uk',
        'device': 'android'
      }
    },
    {
      'name': 's3d3l3ln3',
      'scope': {
        'location': 'in',
        'lang': 'en-in',
        'device': 'windows'
      }
    },
    {
      'name': 's3d3l1ln3',
      'scope': {
        'location': 'us',
        'lang': 'en-in',
        'device': 'windows'
      }
    },
    {
      'name': 's3d3l2ln3',
      'scope': {
        'location': 'uk',
        'lang': 'en-in',
        'device': 'windows'
      }
    }
  ];
  var testData1 = [
    {
      'name': 'e1'
    },
    {
      'name': 's1l1',
      'scope': {
        'location': 'us'
      }
    }
  ];

  after('Remove Test Model', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': ['test-tenant', 'test-tenant'],
      'username': 'testuser',
      'device': ['ios', 'windows', 'android'],
      'location': ['us', 'in', 'uk'],
      'lang': ['en-us', 'en-in'],
      'roles': ['admin', 'designer']
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'username': '0',
      'device': '0',
      'location': '0',
      'lang': '0',
      'roles': '0'
    };

    models[modelName].destroyAll({}, callContext, function (err, result) {
      if (err) {
        done(err);
      }
      // console.log('destroy response1 ', err, result);
      models[modelName1].destroyAll({}, callContext, function (err, result) {
        if (err) {
          done(err);
        }
        // console.log('destroy response2 ', err, result);
        models[modelName2].destroyAll({}, callContext, function (err, result) {
          if (err) {
            done(err);
          }
          // console.log('destroy response3 ', err, result);
          done();
        });
      });
    });
  });

  it('- Should insert data into TestModel with and without any manual scope [Group of records]', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser'
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'username': '0'
    };

    models[modelName2].create(testData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        done();
      }
    });
  });

  it('- Should insert data into TestModel with and without any manual scope into non-autoscoped test model[Group of records]', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant'

    };

    callContext.ctxWeights = {
      'tenantId': '0'
    };

    models[modelName].create(testData1, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        done();
      }
    });
  });

  it('- Should insert data into TestModel without any manual or auto scope in data', function (done) {
    var postData = {
      'name': 'noScope'
    };

    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant'
    };

    callContext.ctxWeights = {
      'tenantId': '0'
    };

    models[modelName1].create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result.name).to.be.equal('noScope');
        // expect(result.body.scope).not.to.be.null;
        //  expect(result.body.scope).not.to.be.undefined;
        // expect(result.body.scope.tenantId).to.be.equal('test-tenant');
        done();
      }
    });
  });

  it('- Should insert data into TestModel with manual scope', function (done) {
    var postData = [
      {
        'name': 's3d2l3ln1',
        'scope': {
          'location': 'in',
          'lang': 'en-us',
          'device': 'android'
        }
      },
      {
        'name': 'S1Deviceios',
        'scope': {
          'device': 'ios'
        }
      },
      {
        'name': 'S1Devicewindows',
        'scope': {
          'device': 'windows'
        }
      }];

    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant'

    };

    callContext.ctxWeights = {
      'tenantId': '0'
    };

    models[modelName1].create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result).to.be.instanceof(Array);
        expect(result).to.have.length(3);
        done();
      }
    });
  });

  it('- Should not insert data into TestModel with auto scope defined on model and not passed as part of header or query string', function (done) {
    var postData = {
      'name': 's3d2l1ln1',
      'scope': {
        'location': 'us',
        'lang': 'en-us',
        'device': 'android'
      }
    };

    var callContext = {};
    callContext.ctx = {};

    models[modelName1].create(postData, callContext, function (err, result) {
      if (err) {
        expect(err).not.to.be.null;
        done();
      } else {
        done(new Error('Should not insert without autoscope value'));
      }
    });
  });

  it('- Should not insert data into TestModel with auto scope', function (done) {
    var postData = {
      'name': 's3d2l1ln1',
      'scope': {
        'location': 'us',
        'lang': 'en-us',
        'device': 'android',
        'tenantId': 'test-tenant'
      }
    };

    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant'

    };

    callContext.ctxWeights = {
      'tenantId': '0'
    };

    models[modelName1].create(postData, callContext, function (err, result) {
      if (err) {
        expect(err).not.to.be.null;
        done();
      } else {
        done(new Error('Should not insert with autoscope values in scope'));
      }
    });
  });

  it('- Should retrieve data from TestModel without any manual scope contributors', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser'
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'username': '0'
    };

    models[modelName2].find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.empty;
        done();
      }
    });
  });

  it('- Should retrieve data from TestModel with context contributors', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'device': 'ios',
      'location': 'in',
      'lang': 'en-in'

    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'username': '0',
      'device': '30',
      'location': '20',
      'lang': '50'
    };

    models[modelName2].find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.empty;
        done();
      }
    });
  });

  it('- Should retrieve data from TestModel without any autoscoped values defined on Model', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'device': 'ios',
      'location': 'in',
      'lang': 'en-in'

    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'username': '0',
      'device': '30',
      'location': '20',
      'lang': '50'
    };

    models[modelName].find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.empty;
        done();
      }
    });
  });

  it('- Should not retrieve any data from TestModel with autoscoped values defined on Model but not provided by user', function (done) {
    var callContext = {};
    callContext.ctx = {

      'device': 'ios',
      'location': 'in',
      'lang': 'en-in'

    };

    callContext.ctxWeights = {

      'device': '30',
      'location': '20',
      'lang': '50'
    };

    models[modelName2].find({}, callContext, function (err, result) {
      if (err) {
        done();
      } else {
        done(new Error('insufficient  data'));
      }
    });
  });

  it('- Should retrieve data from TestModel in Descending order based on score calculated from context', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'device': 'windows',
      'location': 'in',
      'lang': 'en-in'

    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'username': '0',
      'device': '30',
      'location': '20',
      'lang': '50'
    };

    models[modelName2].find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.empty;
        expect(result[0].name).to.be.equal('s3d3l3ln3');
        done();
      }
    });
  });

  it('- Should retrieve data from TestModel in Descending order based on score calculated from context', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'device': 'ios',
      'location': 'us',
      'lang': 'en-us'

    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'username': '0',
      'device': '50',
      'location': '20',
      'lang': '30'
    };

    models[modelName2].find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.empty;
        expect(result[0].name).to.be.equal('s3d1l1ln1');
        done();
      }
    });
  });

  it('- Should retrieve data from TestModel without any scope when defaults is set', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'defaults': true
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'username': '0',
      'defaults': '0'
    };
    models[modelName2].find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.empty;
        expect(result[0].name).to.be.equal('noScope');
        done();
      }
    });
  });

  it('- Should be able to post data with scope containing array of values', function (done) {
    var postData = {
      'name': 'S1RolesArray',
      'scope': {
        'roles': ['admin', 'designer']
      }
    };

    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser'
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'username': '0'
    };

    models[modelName1].create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result._scope).to.be.instanceof(Array);
        expect(result._scope).to.have.length(3);
        expect(result._scope).to.have.members(['roles:admin', 'roles:designer', 'tenantId:test-tenant']);
        expect(result.name).to.be.equal('S1RolesArray');
        done();
      }
    });
  });

  it('- Should be able to get data with scope containing array of values', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'device': ['ios', 'windows'],
      'username': 'testuser'
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'username': '0',
      'device': '0'
    };

    models[modelName1].find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result).to.be.instanceof(Array);
        expect(result).to.have.length(3);
        done();
      }
    });
  });

  it('- Should be able to post data with ignoreAutoScope setting', function (done) {
    var postData = {
      'name': 'skipAutoScopeRecord'
    };
    var callContext = { ctx: {} };
    callContext.ignoreAutoScope = 'true';
    models[modelName1].create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result._scope).to.have.length(1);
        expect(result._scope).to.have.members(['tenantId:default']);
        expect(result.name).to.be.equal('skipAutoScopeRecord');
        done();
      }
    });
  });

  it('- Should be able retrieve records including the autoscope default', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'roles': ['admin'],
      'device': 'android'
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'username': '0',
      'roles': '0',
      'device': '0'
    };

    models[modelName1].find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result).to.have.length(2);
        done();
      }
    });
  });

  it('- Should be able to write custom query on scope which will take higher precidence on manual scope query', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'device': 'windows'
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'username': '0',
      'device': '0'
    };

    models[modelName1].find({
      'where': {
        'scope.device': 'ios'
      }
    }, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result).to.have.length(1);
        expect(result[0].name).to.be.equal('S1Deviceios');
        done();
      }
    });
  });

  it('- Should be able retrieve default autoscoped records when ignore autoscope set internally', function (done) {
    var callContext = {};
    callContext.ignoreAutoScope = true;

    models[modelName1].find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result).to.have.length(1);
        expect(result[0].name).to.be.equal('skipAutoScopeRecord');
        done();
      }
    });
  });

  it('- Should be able to insert data into TestModel with manual scope being a another Model', function (done) {
    var postData = {
      'name': 'modelScopeAsModel',
      'scope': {
        'location': 'in',
        'lang': 'en-us',
        'device': 'android'
      }
    };

    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant'
    };

    callContext.ctxWeights = {
      'tenantId': '0'
    };

    models[myScopeModel1].create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        // console.log("=================",result);
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result.name).to.be.equal('modelScopeAsModel');
        expect(result._scope).to.be.instanceof(Array);
        expect(result._scope).to.have.length(4);
        expect(result.scope.__data).to.include.keys('location', 'lang', 'device');
        done();
      }
    });
  });

  it('- Should be able to retrieve data from TestModel with manual scope being a another Model', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'location': 'in',
      'lang': 'en-us',
      'device': 'android'
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'location': '0',
      'lang': '0',
      'device': '0'
    };

    models[myScopeModel1].find({ 'where': { 'name': 'modelScopeAsModel' } }, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        // console.log("----------", result);
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result[0].name).to.be.equal('modelScopeAsModel');
        expect(result[0]._scope).to.be.instanceof(Array);
        expect(result[0]._scope).to.have.length(4);
        expect(result[0].scope.__data).to.include.keys('location', 'lang', 'device');
        done();
      }
    });
  });

  it('- Should be able to update in TestModel with manual scope being a another Model', function (done) {
    var postData = {
      'name': 'modelScopeAsModelUpdate',
      'scope': {
        'location': 'in',
        'lang': 'en-us',
        'device': 'android'
      }
    };

    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'location': 'in',
      'lang': 'en-us',
      'device': 'android'
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'location': '0',
      'lang': '0',
      'device': '0'
    };
    models[myScopeModel1].find({ 'where': { 'name': 'modelScopeAsModel' } }, callContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        postData._version = res[0]._version;
        postData.id = res[0].id;
        models[myScopeModel1].upsert(postData, callContext, function (err, result) {
          if (err) {
            done(err);
          } else {
            // console.log("-------------", result);
            expect(result).not.to.be.null;
            expect(result).not.to.be.empty;
            expect(result).not.to.be.undefined;
            expect(result.name).to.be.equal('modelScopeAsModelUpdate');
            expect(result._scope).to.be.instanceof(Array);
            expect(result._scope).to.have.length(4);
            expect(result.scope.__data).to.include.keys('location', 'lang', 'device');
            done();
          }
        });
      }
    });
  });

  it('- Should be able to delete data from TestModel with manual scope being a another Model', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'location': 'in',
      'lang': 'en-us',
      'device': 'android'
    };

    callContext.ctxWeights = {
      'tenantId': '0'
    };
    models[myScopeModel1].find({ 'where': { 'name': 'modelScopeAsModelUpdate' } }, callContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log("================", res);
        models[myScopeModel1].deleteById(res[0].id, callContext, function (err, result) {
          if (err) {
            done(err);
          } else {
            // console.log('-------------', result);
            expect(result).not.to.be.null;
            expect(result).not.to.be.empty;
            expect(result).not.to.be.undefined;
            expect(result.count).to.be.equal(1);
            done();
          }
        });
      }
    });
  });

  it('- Test for insertion of data in model connected to memory DB', function (done) {
    var memDbModel = {
      'name': 'MemDBModel',
      'base': 'PersistedModel',
      'strict': false,
      'idInjection': false,
      'options': {
        'validateUpsert': true
      },
      'properties': {
        'name': {
          'type': 'string',
          'required': true
        }
      },
      'hidden': [],
      'validations': [],
      'relations': {},
      'acls': [],
      'methods': {},
      'mixins': {
        'ObserverMixin': true,
        'ModelValidations': true,
        'HistoryMixin': true,
        'DataPersonalizationMixin': true
      },
      'autoscope': [
        'tenantId'
      ]
    };

    var data = {
      'name': 'scopedRecord',
      'scope': {
        'roles': ['admin', 'designer'],
        'device': 'mobile',
        'location': 'in'
      }
    };

    var newmodel = loopback.createModel(memDbModel);
    app.model(newmodel, {
      dataSource: 'nullsrc'
    });

    var myModel = loopback.findModel('MemDBModel');

    myModel.create(data, bootstrap.defaultContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result.name).to.be.equal('scopedRecord');
        done();
      }
    });
  });

  it('- Test for fetching data from a model connected to memory DB', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'location': 'in',
      'roles': ['admin', 'designer'],
      'device': 'mobile'
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'location': '0',
      'roles': '0',
      'device': '0'
    };
    var myModel = loopback.findModel('MemDBModel');
    myModel.find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result[0].name).to.be.equal('scopedRecord');
        done();
      }
    });
  });

  it('- Test for insertion of data in model(no autoscope) connected to memory DB', function (done) {
    var memDbModel = {
      'name': 'MemDBModelNoAutoScope',
      'base': 'PersistedModel',
      'strict': false,
      'idInjection': false,
      'options': {
        'validateUpsert': true
      },
      'properties': {
        'name': {
          'type': 'string',
          'required': true
        }
      },
      'hidden': [],
      'validations': [],
      'relations': {},
      'acls': [],
      'methods': {},
      'mixins': {
        'ObserverMixin': true,
        'ModelValidations': true,
        'HistoryMixin': true,
        'DataPersonalizationMixin': true
      }
    };

    var data = {
      'name': 'scopedRecord',
      'scope': {
        'roles': ['admin', 'designer'],
        'device': 'mobile',
        'location': 'in'
      }
    };
    var newmodel = loopback.createModel(memDbModel);
    app.model(newmodel, {
      dataSource: 'nullsrc'
    });

    var myModel = loopback.findModel('MemDBModelNoAutoScope');

    myModel.create(data, bootstrap.defaultContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result.name).to.be.equal('scopedRecord');
        done();
      }
    });
  });

  it('- Test for fetching data from a model(no autoscope) connected to memory DB', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'location': 'in',
      'roles': ['admin', 'designer'],
      'device': 'mobile'
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'location': '0',
      'roles': '0',
      'device': '0'
    };
    var myModel = loopback.findModel('MemDBModelNoAutoScope');
    myModel.find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result[0].name).to.be.equal('scopedRecord');
        done();
      }
    });
  });

  it('- Test for fetching data from a model connected to memory DB with wrong contributor values', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'location': 'in',
      'roles': ['admin', 'designer'],
      'device': 'tab'
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'location': '0',
      'roles': '0',
      'device': '0'
    };
    callContext.ignoreContextList = ['device'];
    var myModel = loopback.findModel('MemDBModel');
    myModel.find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).to.be.empty;
        expect(result).not.to.be.undefined;
        done();
      }
    });
  });

  it('- Test for mixin applied property on model while posting data', function (done) {
    var modelWithOutMixin = {
      'name': 'ModelWithOutMixin',
      'base': 'BaseEntity',
      'strict': false,
      'idInjection': false,
      'options': {
        'validateUpsert': true
      },
      'properties': {
        'name': {
          'type': 'string',
          'required': true
        }
      },
      'hidden': [],
      'validations': [],
      'relations': {},
      'acls': [],
      'methods': {},
      'mixins': {
        'HistoryMixin': true,
        'DataPersonalizationMixin': false
      },
      'autoscope': [
        'tenantId'
      ]
    };
    var data = {
      'name': 'scopedRecord',
      'scope': {
        'roles': ['admin', 'designer'],
        'device': 'mobile',
        'location': 'in'
      }
    };

    models.ModelDefinition.create(modelWithOutMixin, bootstrap.defaultContext, function (err, res) {
      if (err) {
        log.debug(bootstrap.defaultContext, 'unable to create DataPersonalizationTestModel model');
        done(err);
      } else {
        models.ModelWithOutMixin.create(data, bootstrap.defaultContext, function (err, result) {
          if (err) {
            done(err);
          } else {
            expect(result).not.to.be.null;
            expect(result).not.to.be.empty;
            expect(result).not.to.be.undefined;
            expect(result.name).to.be.equal('scopedRecord');
            expect(result._scope).to.be.undefined;
            expect(result._autoScope).to.be.undefined;
            done();
          }
        });
      }
    });
  });

  it('- Test for mixin applied property on model while getting data', function (done) {
    var callContext = { ctx: {} };

    models.ModelWithOutMixin.find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        // console.log("=============",result);
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result[0].name).to.be.equal('scopedRecord');
        expect(result[0]._scope).to.be.oneOf([null, undefined]);
        expect(result[0]._autoScope).to.be.oneOf([null, undefined]);
        done();
      }
    });
  });

  it('- Should be able to update record with scope for same tenant', function (done) {
    var postData = {
      'name': 'myRecord',
      'scope': {
        'org': 'ev'
      }
    };

    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant'
    };

    callContext.ctxWeights = {
      'tenantId': '0'
    };

    models[modelName1].create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result._scope).to.be.instanceof(Array);
        expect(result.name).to.be.equal('myRecord');
        postData.id = result.id;
        postData._version = result._version;
        postData.name = 'changedName';
        models[modelName1].upsert(postData, callContext, function (err, res) {
          if (err) {
            done(err);
          } else {
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            expect(res._scope).to.be.instanceof(Array);
            expect(res.name).to.be.equal('changedName');

            callContext.ctx = {
              'tenantId': 'test-tenant',
              'org': 'ev'
            };

            callContext.ctxWeights = {
              'tenantId': '0',
              'org': '1'
            };

            models[modelName1].find({ where: { 'name': 'myRecord' } }, callContext, function (err, res1) {
              if (err) {
                done(err);
              } else {
                expect(res1).not.to.be.null;
                expect(res1).to.be.empty;
                expect(res1).not.to.be.undefined;

                models[modelName1].find({}, callContext, function (err, res2) {
                  if (err) {
                    done(err);
                  } else {
                    expect(res2).not.to.be.null;
                    expect(res2).not.to.be.empty;
                    expect(res2).not.to.be.undefined;
                    expect(res2[0].name).to.be.equal('changedName');
                    done();
                  }
                });
              }
            });
          }
        });
      }
    });
  });

  it('- Should create a new record when scope is changed for upsert for same tenant', function (done) {
    var postData = {
      'name': 'upsertTestRecord',
      'scope': {
        'org': 'infy'
      }
    };

    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant'
    };

    callContext.ctxWeights = {
      'tenantId': '0'
    };

    models[modelName1].create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result._scope).to.be.instanceof(Array);
        expect(result.name).to.be.equal('upsertTestRecord');

        postData.id = result.id;
        postData._version = result._version;
        postData.name = 'upsertTestRecordChanged';
        postData.scope.unit = 'finacle';

        models[modelName1].upsert(postData, callContext, function (err, res) {
          if (err) {
            done(err);
          } else {
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            expect(res._scope).to.be.instanceof(Array);
            expect(res.name).to.be.equal('upsertTestRecordChanged');

            callContext.ctx = {
              'tenantId': 'test-tenant',
              'org': 'infy',
              'unit': 'finacle'
            };

            callContext.ctxWeights = {
              'tenantId': '0',
              'org': '1',
              'unit': '1'
            };

            models[modelName1].find({ where: { 'name': 'upsertTestRecord' } }, callContext, function (err, res1) {
              if (err) {
                done(err);
              } else {
                expect(res1).not.to.be.null;
                expect(res1).not.to.be.empty;
                expect(res1).not.to.be.undefined;
                expect(res1[0].name).to.be.equal('upsertTestRecord');

                models[modelName1].find({}, callContext, function (err, res2) {
                  if (err) {
                    done(err);
                  } else {
                    expect(res2).not.to.be.null;
                    expect(res2).not.to.be.empty;
                    expect(res2).not.to.be.undefined;
                    expect(res2[0].name).to.be.equal('upsertTestRecordChanged');
                    expect(res2[1].name).to.be.equal('upsertTestRecord');
                    done();
                  }
                });
              }
            });
          }
        });
      }
    });
  });

  it('- Should not be able to update data created by another tenant', function (done) {
    var postData = {
      'name': 'newRecord',
      'scope': {
        'org': 'fin'
      }
    };

    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'org': 'fin'
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'org': '1'
    };

    models[modelName1].create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result._scope).to.be.instanceof(Array);
        expect(result.name).to.be.equal('newRecord');
        postData.id = result.id;
        postData._version = result._version;
        postData.name = 'newRecordChanged';

        callContext.ctx = {
          'tenantId': 'new-tenant',
          'org': 'fin'
        };


        models[modelName1].upsert(postData, callContext, function (err, res) {
          if (err) {
            done(err);
          } else {
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            expect(res._scope).to.be.instanceof(Array);
            expect(res.name).to.be.equal('newRecordChanged');

            models[modelName1].find({}, callContext, function (err, res1) {
              if (err) {
                done(err);
              } else {
                expect(res1).not.to.be.null;
                expect(res1).not.to.be.empty;
                expect(res1).not.to.be.undefined;
                expect(res1[0].name).to.be.equal('newRecordChanged');

                callContext.ctx = {
                  'tenantId': 'test-tenant',
                  'org': 'fin'
                };


                models[modelName1].find({}, callContext, function (err, res2) {
                  if (err) {
                    done(err);
                  } else {
                    expect(res2).not.to.be.null;
                    expect(res2).not.to.be.empty;
                    expect(res2).not.to.be.undefined;
                    expect(res2[0].name).to.be.equal('newRecord');
                    done();
                  }
                });
              }
            });
          }
        });
      }
    });
  });

  it('- Should be able to update record with scope for same tenant when idInjection is false on model', function (done) {
    var postData = {
      'name': 'myRecord',
      'scope': {
        'org': 'ev'
      }
    };

    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'test-case'
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'username': '0'
    };

    models[modelName2].create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result._scope).to.be.instanceof(Array);
        expect(result.name).to.be.equal('myRecord');
        postData.id = result.id;
        postData._version = result._version;
        postData.name = 'changedName';

        models[modelName2].upsert(postData, callContext, function (err, res) {
          if (err) {
            done(err);
          } else {
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            expect(res._scope).to.be.instanceof(Array);
            expect(res.name).to.be.equal('changedName');

            callContext.ctx = {
              'tenantId': 'test-tenant',
              'username': 'test-case',
              'org': 'ev'
            };

            callContext.ctxWeights = {
              'tenantId': '0',
              'username': '0',
              'org': '1'
            };

            models[modelName2].find({ where: { 'name': 'myRecord' } }, callContext, function (err, res1) {
              if (err) {
                done(err);
              } else {
                expect(res1).not.to.be.null;
                expect(res1).to.be.empty;
                expect(res1).not.to.be.undefined;

                models[modelName2].find({}, callContext, function (err, res2) {
                  if (err) {
                    done(err);
                  } else {
                    expect(res2).not.to.be.null;
                    expect(res2).not.to.be.empty;
                    expect(res2).not.to.be.undefined;
                    expect(res2[0].name).to.be.equal('changedName');
                    done();
                  }
                });
              }
            });
          }
        });
      }
    });
  });

  it('- Should create a new record when scope is changed for upsert for same tenant when idInjection is false on model', function (done) {
    var postData = {
      'name': 'upsertTestRecord',
      'scope': {
        'org': 'infy'
      }
    };

    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'test-case'
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'username': '0'
    };

    models[modelName2].create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result._scope).to.be.instanceof(Array);
        expect(result.name).to.be.equal('upsertTestRecord');

        postData.id = result.id;
        postData._version = result._version;
        postData.name = 'upsertTestRecordChanged';
        postData.scope.unit = 'finacle';

        models[modelName2].upsert(postData, callContext, function (err, res) {
          if (err) {
            expect(err).not.to.be.null;
            expect(err).not.to.be.undefined;
            done();
          } else {
            done(new Error('should throw an error because of same id'));
          }
        });
      }
    });
  });

  it('- Should not be able to update data created by another tenant when idInjection is false on model', function (done) {
    var postData = {
      'name': 'newRecord',
      'scope': {
        'org': 'ev'
      }
    };

    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'test-case'
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'username': '0'
    };

    models[modelName2].create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result._scope).to.be.instanceof(Array);
        expect(result.name).to.be.equal('newRecord');
        postData.id = result.id;
        postData._version = result._version;
        postData.name = 'newRecordChanged';

        callContext.ctx = {
          'tenantId': 'new-tenant',
          'username': 'new-test-case'
        };

        models[modelName2].upsert(postData, callContext, function (err, res) {
          if (err) {
            expect(err).not.to.be.null;
            expect(err).not.to.be.undefined;
            done();
          } else {
            done(new Error('Should not update the record of other tenant'));
          }
        });
      }
    });
  });

  it('- Should be able to post a record with unique validation on property with scope', function (done) {
    var modelUnique = 'ModelUnique';
    var modelDetailsUnique = {
      name: modelUnique,
      base: 'BaseEntity',
      properties: {
        'a': {
          'type': 'string',
          'unique': true
        },
        'b': {
          'type': 'string',
          'unique': true
        }
      },
      strict: false,
      idInjection: false,
      mixins: {
        'HistoryMixin': true
      },
      autoscope: [
        'tenantId'
      ],
      scoreScheme: 'max'
    };

    var postData = [
      {
        'a': '1',
        'b': '1',
        'scope': {
          'rule': 'x'
        }
      },
      {
        'a': '2',
        'b': '2',
        'scope': {
          'rule': 'x'
        }
      },
      {
        'a': '1',
        'b': '1',
        'scope': {
          'rule': 'y',
          'category': 'x'
        }
      },
      {
        'a': '2',
        'b': '1',
        'scope': {
          'rule': 'y',
          'category': 'y'
        }
      },
      {
        'a': '1',
        'b': '2',
        'scope': {
          'rule': 'y',
          'category': 'y'
        }
      }
    ];

    var callContext = {};
    callContext.ctx = {
      'tenantId': 'unique-tenant'
    };

    callContext.ctxWeights = {
      'tenantId': '0'
    };

    models.ModelDefinition.create(modelDetailsUnique, callContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        var uniquePropModel = loopback.getModel('ModelUnique');
        uniquePropModel.create(postData, callContext, function (err, result) {
          if (err) {
            done(err);
          } else {
            expect(result).not.to.be.null;
            expect(result).not.to.be.empty;
            expect(result).not.to.be.undefined;
            expect(result).to.be.instanceof(Array);
            expect(result).to.have.length(5);
            done();
          }
        });
      }
    });
  });

  it('- Should be able to get unique records with unique validation on property with scope', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'unique-tenant',
      'rule': 'y',
      'category': 'y'
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'rule': '0',
      'category': '0'
    };

    var uniquePropModel = loopback.getModel('ModelUnique');
    uniquePropModel.find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result).to.be.instanceof(Array);
        expect(result).to.have.length(2);
        done();
      }
    });
  });
});

describe(chalk.blue('Data Personalization -Test for Persisted Model Static calls --REST'), function () {
  this.timeout(1000000);
  var modelName = 'DataPersonalizationModel';
  var newModelDetails = {
    name: modelName,
    base: 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
        'required': true
      }
    },
    strict: false,
    idInjection: false,
    plural: modelName,
    mixins: {
      'HistoryMixin': true,
      'VersionMixin': true
    },
    autoscope: [
      'tenantId'
    ]
  };

  var testData = [
    {
      'name': 'emptyscope',
      'id': '1a'
    },
    {
      'name': 's1l1',
      'id': '2a'
    },
    {
      'name': 's1l1',
      'id': '3a'
    }

  ];

  before('Create Test model', function (done) {
    models.ModelDefinition.create(newModelDetails, bootstrap.defaultContext, function (err, res) {
      if (err) {
        log.debug(bootstrap.defaultContext, 'unable to create DataPersonalizationModel model');
        done(err);
      } else {
        done();
      }
    });
  });

  after('Remove Test Model', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser'
    };

    callContext.ctxWeights = {
      'tenantId': '0',
      'username': '0'
    };

    models[modelName].destroyAll({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        log.debug(bootstrap.defaultContext, 'Records deleted from Test model');
        // models['ModelDefinition'].destroyAll({ "where": { "name": modelName } }, function(err, result) {
        //     if (err) {
        //         done(err);
        //     }
        //     else {
        //         done();
        //     }
        // });
      }
    });
    done();
  });

  it('- POST', function (done) {
    var url = bootstrap.basePath + '/' + modelName;
    api
      .post(url)
      .send(testData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          testData = result.body;
          done();
        }
      });
  });

  it('- EXISTS', function (done) {
    var url = bootstrap.basePath + '/' + modelName + '/1a/exists';
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body.exists).to.be.equal(true);
          done();
        }
      });
  });

  it('- GET', function (done) {
    var url = bootstrap.basePath + '/' + modelName;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          done();
        }
      });
  });

  it('- GET by ID', function (done) {
    var url = bootstrap.basePath + '/' + modelName + '/1a';
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body.name).to.be.equal('emptyscope');
          done();
        }
      });
  });

  it('- COUNT', function (done) {
    var url = bootstrap.basePath + '/' + modelName + '/count';
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body.count).to.be.equal(3);
          done();
        }
      });
  });

  it('- PUT', function (done) {
    var postData = testData[1];
    delete postData._version;
    postData.id = 2;
    postData.name = 's1d1';

    var url = bootstrap.basePath + '/' + modelName;
    api
      .put(url)
      .send(postData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body.name).to.be.equal('s1d1');
          testData[1] = result.body;
          done();
        }
      });
  });

  it('- FINDONE', function (done) {
    var url = bootstrap.basePath + '/' + modelName + '/findOne';
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body[1]).to.be.undefined;
          done();
        }
      });
  });

  it('- PUT by ID', function (done) {
    var postData = testData[2];
    postData.name = 's1l-us';
    var url = bootstrap.basePath + '/' + modelName + '/3a';
    api
      .put(url)
      .send(postData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body.name).to.be.equal('s1l-us');
          testData[2] = result.body;
          done();
        }
      });
  });

  it('- DELETE by ID', function (done) {
    var url = bootstrap.basePath + '/' + modelName + '/1a';
    api
      .del(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('tenant_id', 'test-tenant')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
});
