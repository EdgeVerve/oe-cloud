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
var logger = require('oe-logger');
var log = logger('data-personalization-test');
var loopback = require('loopback');
var async = require('async');
var app = bootstrap.app;

describe(chalk.blue('Data Personalization Test --REST'), function DataPersonalizationRest() {
  this.timeout(1000000);
  var fiveKageModel;
  var tailedBeastModel;
  var animeCharacterModel;
  var personalizedModelScope;
  var PersonalizedModelWithScopeAsModel;
  var testUserAccessToken;

  // Testmodel has no autoscoped variable(not auto-scoped)
  var fiveKage = 'FiveKage';
  var fiveKageDetails = {
    name: fiveKage,
    base: 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
        'required': true
      }
    },
    strict: false,
    idInjection: false,
    plural: fiveKage,
    mixins: {
      'HistoryMixin': true
    }
  };

  // Testmodel one has one autoscoped variable(tenantId)
  var tailedBeast = 'TailedBeast';
  var tailedBeastsDetails = {
    name: tailedBeast,
    base: 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
        'required': true
      }
    },
    strict: false,
    idInjection: true,
    plural: tailedBeast,
    mixins: {
      'HistoryMixin': true
    },
    autoscope: [
      'tenantId'
    ]
  };

  // Testmodel two has two autoscoped variable(tenantId,username)
  var animeCharacter = 'AnimeCharacter';
  var animeCharacterDetails = {
    name: animeCharacter,
    base: 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
        'required': true
      }
    },
    strict: false,
    idInjection: false,
    plural: animeCharacter,
    mixins: {
      'HistoryMixin': true
    },
    autoscope: [
      'tenantId', 'username'
    ]
  };

  var myScopeModel = 'CustomScope';
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
      'SoftDeleteMixin': false,
      'FailsafeObserverMixin': false
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

  var characterData = [
    {
      'name': 'Naruto'
    },
    {
      'name': 'Hinata',
      'scope': {
        'device': 'ios'
      }
    },
    {
      'name': 'Sasuke',
      'scope': {
        'device': 'android'
      }
    },
    {
      'name': 'Sakura',
      'scope': {
        'device': 'windows'
      }
    },
    {
      'name': 'RockLee',
      'scope': {
        'device': 'ios',
        'location': 'us'
      }
    },
    {
      'name': 'Gaara',
      'scope': {
        'device': 'ios',
        'location': 'uk'
      }
    },
    {
      'name': 'Shikamaru',
      'scope': {
        'device': 'ios',
        'location': 'in'
      }
    },
    {
      'name': 'Choji',
      'scope': {
        'device': 'android',
        'location': 'us'
      }
    },
    {
      'name': 'Shino',
      'scope': {
        'device': 'android',
        'location': 'uk'
      }
    },
    {
      'name': 'TenTen',
      'scope': {
        'device': 'android',
        'location': 'in'
      }
    },
    {
      'name': 'Minato',
      'scope': {
        'device': 'ios',
        'lang': 'en-us'
      }
    },
    {
      'name': 'Nagato',
      'scope': {
        'device': 'ios',
        'lang': 'en-uk'
      }
    },
    {
      'name': 'Itachi',
      'scope': {
        'device': 'ios',
        'lang': 'en-in'
      }
    },
    {
      'name': 'Madara',
      'scope': {
        'device': 'android',
        'lang': 'en-us'
      }
    },
    {
      'name': 'Neji',
      'scope': {
        'device': 'android',
        'lang': 'en-uk'
      }
    },
    {
      'name': 'Might Guy',
      'scope': {
        'device': 'android',
        'lang': 'en-in'
      }
    },
    {
      'name': 'Jiraya',
      'scope': {
        'location': 'us',
        'lang': 'en-us'
      }
    },
    {
      'name': 'Sai',
      'scope': {
        'location': 'us',
        'lang': 'en-uk'
      }
    },
    {
      'name': 'Tsunade',
      'scope': {
        'location': 'us',
        'lang': 'en-in'
      }
    },
    {
      'name': 'Kakashi',
      'scope': {
        'location': 'uk',
        'lang': 'en-us'
      }
    },
    {
      'name': 'Karin',
      'scope': {
        'location': 'uk',
        'lang': 'en-uk'
      }
    },
    {
      'name': 'Ino',
      'scope': {
        'location': 'uk',
        'lang': 'en-in'
      }
    },
    {
      'name': 'Sasori',
      'scope': {
        'location': 'in',
        'lang': 'en-us'
      }
    },
    {
      'name': 'Orochimaru',
      'scope': {
        'location': 'in',
        'lang': 'en-uk'
      }
    },
    {
      'name': 'Obito',
      'scope': {
        'location': 'in',
        'lang': 'en-in'
      }
    },
    {
      'name': 'Hashirama',
      'scope': {
        'location': 'us',
        'lang': 'en-us',
        'device': 'ios'
      }
    },
    {
      'name': 'Kiba',
      'scope': {
        'location': 'in',
        'lang': 'en-uk',
        'device': 'android'
      }
    },
    {
      'name': 'Killer Bee',
      'scope': {
        'location': 'in',
        'lang': 'en-in',
        'device': 'windows'
      }
    },
    {
      'name': 'Temari',
      'scope': {
        'location': 'us',
        'lang': 'en-in',
        'device': 'windows'
      }
    },
    {
      'name': 'Asuma',
      'scope': {
        'location': 'uk',
        'lang': 'en-in',
        'device': 'windows'
      }
    }
  ];

  var kageData = [
    {
      'name': 'HoKage'
    },
    {
      'name': 'RaiKage',
      'scope': {
        'location': 'us'
      }
    }
  ];

  // Creating testuser access token since removed jwt-assertion middleware
  // so that we can access the models which are created using bootstrap.defaultContext
  // are based on testuesr and test-tenant.
  before('Create Test User Accesstoken', function(done) {
    var testUser = {
      'username': 'testuser',
      'password': 'testuser123'
    };
    bootstrap.login(testUser, function(returnedAccesstoken) {
      testUserAccessToken = returnedAccesstoken;
      done();
    });
  });

  before('Create Test model', function restBeforeAll(done) {
    async.parallel([
      function asyncModel(callback) {
        models.ModelDefinition.create(fiveKageDetails, bootstrap.defaultContext, function modelCreate(err, res) {
          if (err) {
            log.debug(bootstrap.defaultContext, 'unable to create DataPersonalizationModel model');
            callback(err);
          } else {
            callback();
          }
        });
      },
      function asyncModelOne(callback) {
        models.ModelDefinition.create(tailedBeastsDetails, bootstrap.defaultContext, function modelOneCreate(err, res) {
          if (err) {
            log.debug(bootstrap.defaultContext, 'unable to create DataPersonalizationModel1 model');
            callback(err);
          } else {
            callback();
          }
        });
      },
      function asyncModelTwo(callback) {
        models.ModelDefinition.create(animeCharacterDetails, bootstrap.defaultContext, function modelTwoCreate(err, res) {
          if (err) {
            log.debug(bootstrap.defaultContext, 'unable to create DataPersonalizationModel2 model');
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
          fiveKageModel = loopback.getModel(fiveKage, bootstrap.defaultContext);
          tailedBeastModel = loopback.getModel(tailedBeast, bootstrap.defaultContext);
          animeCharacterModel = loopback.getModel(animeCharacter, bootstrap.defaultContext);
          personalizedModelScope = loopback.getModel(myScopeModel, bootstrap.defaultContext);
          PersonalizedModelWithScopeAsModel = loopback.getModel(myScopeModel1, bootstrap.defaultContext);
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

    fiveKageModel.destroyAll({}, callContext, function modelDestroyAll(err, result) {
      if (err) {
        done(err);
      }
      tailedBeastModel.destroyAll({}, callContext, function modelDestroyAll(err, result) {
        if (err) {
          done(err);
        }
        animeCharacterModel.destroyAll({}, callContext, function modelDestroyAll(err, result) {
          if (err) {
            done(err);
          }
          done();
        });
      });
    });
  });

  it('- Should insert data into TestModel with and without any manual scope into non-autoscoped test model[Group of records]', function (done) {
    var url = bootstrap.basePath + '/' + fiveKage + '?access_token=' + testUserAccessToken;
    api
      .post(url)
      .send(kageData)
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
    var url = bootstrap.basePath + '/' + animeCharacter + '?access_token=' + testUserAccessToken;
    api
      .post(url)
      .send(characterData)
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
      'name': 'Kurama'
    };
    var url = bootstrap.basePath + '/' + tailedBeast + '?access_token=' + testUserAccessToken;
    api
      .post(url)
      .send(postData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body.name).to.be.equal('Kurama');
          done();
        }
      });
  });

  it('- Should insert data into TestModel with manual scope', function (done) {
    var postData = {
      'name': 'Ten-Tails',
      'scope': {
        'location': 'in',
        'lang': 'en-us',
        'device': 'android'
      }
    };
    var url = bootstrap.basePath + '/' + tailedBeast + '?access_token=' + testUserAccessToken;
    api
      .post(url)
      .send(postData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body.name).to.be.equal('Ten-Tails');
          done();
        }
      });
  });

  it('- Should not insert data into TestModel with auto scope defined on model and not passed as part of header or query string', function (done) {
    var postData = {
      'name': 'Shukaku',
      'scope': {
        'location': 'us',
        'lang': 'en-us',
        'device': 'android'
      }
    };
    var url = bootstrap.basePath + '/' + tailedBeast + '?access_token=' + testUserAccessToken;
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
      'name': 'Matatabi',
      'scope': {
        'location': 'us',
        'lang': 'en-us',
        'device': 'android',
        'tenantId': 'test-tenant'
      }
    };
    var url = bootstrap.basePath + '/' + tailedBeast + '?access_token=' + testUserAccessToken;
    api
      .post(url)
      .send(postData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(500);
    done();
  });

  it('- Should retrieve data from TestModel without any manual scope contributors', function (done) {
    var url = bootstrap.basePath + '/' + animeCharacter + '?access_token=' + testUserAccessToken;
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
    var url = bootstrap.basePath + '/' + animeCharacter + '?access_token=' + testUserAccessToken;
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
    var url = bootstrap.basePath + '/' + fiveKage + '?access_token=' + testUserAccessToken;
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
    var url = bootstrap.basePath + '/' + animeCharacter + '?access_token=' + testUserAccessToken;
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
    var url = bootstrap.basePath + '/' + animeCharacter + '?access_token=' + testUserAccessToken;
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
          expect(result.body[0].name).to.be.equal('Killer Bee');
          done();
        }
      });
  });

  it('- Should retrieve data from TestModel in Descending order based on score calculated from context', function (done) {
    var url = bootstrap.basePath + '/' + animeCharacter + '?access_token=' + testUserAccessToken;
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
          expect(result.body[0].name).to.be.equal('Hashirama');
          done();
        }
      });
  });

  it('- Should retrieve data from TestModel without any scope when defaults is set', function (done) {
    var url = bootstrap.basePath + '/' + animeCharacter + '?access_token=' + testUserAccessToken;
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
          expect(result.body[0].name).to.be.equal('Naruto');
          done();
        }
      });
  });

  it('- Should be able to post data with scope containing array of values', function (done) {
    var url = bootstrap.basePath + '/' + tailedBeast + '?access_token=' + testUserAccessToken;
    var postData = {
      'name': 'Son Goku',
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
          expect(result.body.name).to.be.equal('Son Goku');
          done();
        }
      });
  });

  it('- Should be able retrieve all record with scope values in ignoreList', function (done) {
    var url = bootstrap.basePath + '/' + tailedBeast + '?access_token=' + testUserAccessToken;
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

  it('- Should be able to write custom query on scope which will take higher precidence on manual scope query', function (done) {
    var url = bootstrap.basePath + '/' + tailedBeast  + '?access_token=' + testUserAccessToken +  '&filter={"where":{"scope.device": "android"}}';
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
          expect(result.body[0].name).to.be.equal('Ten-Tails');
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
    var url = bootstrap.basePath + '/' + myScopeModel1 + '?access_token=' + testUserAccessToken;
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
    var url = bootstrap.basePath + '/' + myScopeModel1 + '?access_token=' + testUserAccessToken;
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
    var url = bootstrap.basePath + '/' + myScopeModel1 + '?access_token=' + testUserAccessToken;
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
    var postUrl = url + '?access_token=' + testUserAccessToken;
    api
      .get(postUrl)
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
          url = url + '/' + res.body[0].id + '?access_token=' + testUserAccessToken;
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

    var url = bootstrap.basePath + '/NewMemDBModels' + '?access_token=' + testUserAccessToken;
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
    var url = bootstrap.basePath + '/NewMemDBModels' + '?access_token=' + testUserAccessToken;
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

    var url = bootstrap.basePath + '/NewMemDBModelNoAutoScopes'+ '?access_token=' + testUserAccessToken;
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
    var url = bootstrap.basePath + '/NewMemDBModelNoAutoScopes' + '?access_token=' + testUserAccessToken;
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
    var url = bootstrap.basePath + '/NewMemDBModels' + '?access_token=' + testUserAccessToken;
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
        var url = bootstrap.basePath + '/NewModelWithOutMixins' + '?access_token=' + testUserAccessToken;
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
    var url = bootstrap.basePath + '/NewModelWithOutMixins' + '?access_token=' + testUserAccessToken;
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

    models.ModelDefinition.create(modelDetailsUnique, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        var url = bootstrap.basePath + '/NewModelUniques'+ '?access_token=' + testUserAccessToken;
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
    var url = bootstrap.basePath + '/NewModelUniques' + '?access_token=' + testUserAccessToken;
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
//End Of Describe


describe(chalk.blue('Data Personalization Test --Programatic'), function () {
  this.timeout(200000);

  var fiveKageModel;
  var tailedBeastModel;
  var animeCharacterModel;
  var personalizedModelScope;
  var PersonalizedModelWithScopeAsModel;

  // Testmodel has no autoscoped variable(not auto-scoped)
  var fiveKage = 'FiveKage';
  // Testmodel one has one autoscoped variable(tenantId)
  var tailedBeast = 'TailedBeast';
  // Testmodel two has two autoscoped variable(tenantId,username)
  var animeCharacter = 'AnimeCharacter';
  var myScopeModel = 'CustomScope';
  var myScopeModel1 = 'ModelWithScopeAsModel';

  var characterData = [
    {
      'name': 'Naruto'
    },
    {
      'name': 'Hinata',
      'scope': {
        'device': 'ios'
      }
    },
    {
      'name': 'Sasuke',
      'scope': {
        'device': 'android'
      }
    },
    {
      'name': 'Sakura',
      'scope': {
        'device': 'windows'
      }
    },
    {
      'name': 'RockLee',
      'scope': {
        'device': 'ios',
        'location': 'us'
      }
    },
    {
      'name': 'Gaara',
      'scope': {
        'device': 'ios',
        'location': 'uk'
      }
    },
    {
      'name': 'Shikamaru',
      'scope': {
        'device': 'ios',
        'location': 'in'
      }
    },
    {
      'name': 'Choji',
      'scope': {
        'device': 'android',
        'location': 'us'
      }
    },
    {
      'name': 'Shino',
      'scope': {
        'device': 'android',
        'location': 'uk'
      }
    },
    {
      'name': 'TenTen',
      'scope': {
        'device': 'android',
        'location': 'in'
      }
    },
    {
      'name': 'Minato',
      'scope': {
        'device': 'ios',
        'lang': 'en-us'
      }
    },
    {
      'name': 'Nagato',
      'scope': {
        'device': 'ios',
        'lang': 'en-uk'
      }
    },
    {
      'name': 'Itachi',
      'scope': {
        'device': 'ios',
        'lang': 'en-in'
      }
    },
    {
      'name': 'Madara',
      'scope': {
        'device': 'android',
        'lang': 'en-us'
      }
    },
    {
      'name': 'Neji',
      'scope': {
        'device': 'android',
        'lang': 'en-uk'
      }
    },
    {
      'name': 'Might Guy',
      'scope': {
        'device': 'android',
        'lang': 'en-in'
      }
    },
    {
      'name': 'Jiraya',
      'scope': {
        'location': 'us',
        'lang': 'en-us'
      }
    },
    {
      'name': 'Sai',
      'scope': {
        'location': 'us',
        'lang': 'en-uk'
      }
    },
    {
      'name': 'Tsunade',
      'scope': {
        'location': 'us',
        'lang': 'en-in'
      }
    },
    {
      'name': 'Kakashi',
      'scope': {
        'location': 'uk',
        'lang': 'en-us'
      }
    },
    {
      'name': 'Karin',
      'scope': {
        'location': 'uk',
        'lang': 'en-uk'
      }
    },
    {
      'name': 'Ino',
      'scope': {
        'location': 'uk',
        'lang': 'en-in'
      }
    },
    {
      'name': 'Sasori',
      'scope': {
        'location': 'in',
        'lang': 'en-us'
      }
    },
    {
      'name': 'Orochimaru',
      'scope': {
        'location': 'in',
        'lang': 'en-uk'
      }
    },
    {
      'name': 'Obito',
      'scope': {
        'location': 'in',
        'lang': 'en-in'
      }
    },
    {
      'name': 'Hashirama',
      'scope': {
        'location': 'us',
        'lang': 'en-us',
        'device': 'ios'
      }
    },
    {
      'name': 'Kiba',
      'scope': {
        'location': 'in',
        'lang': 'en-uk',
        'device': 'android'
      }
    },
    {
      'name': 'Killer Bee',
      'scope': {
        'location': 'in',
        'lang': 'en-in',
        'device': 'windows'
      }
    },
    {
      'name': 'Temari',
      'scope': {
        'location': 'us',
        'lang': 'en-in',
        'device': 'windows'
      }
    },
    {
      'name': 'Asuma',
      'scope': {
        'location': 'uk',
        'lang': 'en-in',
        'device': 'windows'
      }
    }
  ];

  var kageData = [
    {
      'name': 'HoKage'
    },
    {
      'name': 'RaiKage',
      'scope': {
        'location': 'us'
      }
    }
  ];

  before('Create Test Models', function (done) {
    fiveKageModel = loopback.getModel(fiveKage, bootstrap.defaultContext);
    tailedBeastModel = loopback.getModel(tailedBeast, bootstrap.defaultContext);
    animeCharacterModel = loopback.getModel(animeCharacter, bootstrap.defaultContext);
    personalizedModelScope = loopback.getModel(myScopeModel, bootstrap.defaultContext);
    PersonalizedModelWithScopeAsModel = loopback.getModel(myScopeModel1, bootstrap.defaultContext);
    done();
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

    fiveKageModel.destroyAll({}, callContext, function modelDestroyAll(err, result) {
      if (err) {
        done(err);
      }
      tailedBeastModel.destroyAll({}, callContext, function modelDestroyAll(err, result) {
        if (err) {
          done(err);
        }
        animeCharacterModel.destroyAll({}, callContext, function modelDestroyAll(err, result) {
          if (err) {
            done(err);
          }
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

    animeCharacterModel.create(characterData, callContext, function (err, result) {
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

    fiveKageModel.create(kageData, callContext, function (err, result) {
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
      'name': 'Saiken'
    };

    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant'
    };

    callContext.ctxWeights = {
      'tenantId': '0'
    };

    tailedBeastModel.create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result.name).to.be.equal('Saiken');
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
        'name': 'Shukaku',
        'scope': {
          'location': 'in',
          'lang': 'en-us',
          'device': 'android'
        }
      },
      {
        'name': 'Kurama',
        'scope': {
          'device': 'ios'
        }
      },
      {
        'name': 'Gyuki',
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

    tailedBeastModel.create(postData, callContext, function (err, result) {
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
      'name': 'Ten-Tails',
      'scope': {
        'location': 'us',
        'lang': 'en-us',
        'device': 'android'
      }
    };

    var callContext = {};
    callContext.ctx = {};

    tailedBeastModel.create(postData, callContext, function (err, result) {
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
      'name': 'Matatabi',
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

    tailedBeastModel.create(postData, callContext, function (err, result) {
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

    animeCharacterModel.find({}, callContext, function (err, result) {
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

    animeCharacterModel.find({}, callContext, function (err, result) {
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

    fiveKageModel.find({}, callContext, function (err, result) {
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

    animeCharacterModel.find({}, callContext, function (err, result) {
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

    animeCharacterModel.find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.empty;
        expect(result[0].name).to.be.equal('Killer Bee');
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

    animeCharacterModel.find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.empty;
        expect(result[0].name).to.be.equal('Hashirama');
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
    animeCharacterModel.find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.empty;
        expect(result[0].name).to.be.equal('Naruto');
        done();
      }
    });
  });

  it('- Should be able to post data with scope containing array of values', function (done) {
    var postData = {
      'name': 'Saiken',
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

    tailedBeastModel.create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result._scope).to.be.instanceof(Array);
        expect(result._scope).to.have.length(3);
        expect(result._scope).to.have.members(['roles:admin', 'roles:designer', 'tenantId:test-tenant']);
        expect(result.name).to.be.equal('Saiken');
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

    tailedBeastModel.find({}, callContext, function (err, result) {
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
      'name': 'Kyubi'
    };
    var callContext = { ctx: {} };
    callContext.ignoreAutoScope = 'true';
    tailedBeastModel.create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result._scope).to.have.length(1);
        expect(result._scope).to.have.members(['tenantId:default']);
        expect(result.name).to.be.equal('Kyubi');
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

    tailedBeastModel.find({}, callContext, function (err, result) {
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

    tailedBeastModel.find({
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
        expect(result[0].name).to.be.equal('Kurama');
        done();
      }
    });
  });

  it('- Should be able retrieve default autoscoped records when ignore autoscope set internally', function (done) {
    var callContext = {};
    callContext.ignoreAutoScope = true;

    tailedBeastModel.find({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result).to.have.length(1);
        expect(result[0].name).to.be.equal('Kyubi');
        done();
      }
    });
  });

  it('- Should be able to update record with scope for same tenant', function (done) {
    var postData = {
      'name': 'Isobu',
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

    tailedBeastModel.create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result._scope).to.be.instanceof(Array);
        expect(result.name).to.be.equal('Isobu');
        postData.id = result.id;
        postData._version = result._version;
        postData.name = 'Isobu Part2';
        tailedBeastModel.upsert(postData, callContext, function (err, res) {
          if (err) {
            done(err);
          } else {
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            expect(res._scope).to.be.instanceof(Array);
            expect(res.name).to.be.equal('Isobu Part2');

            callContext.ctx = {
              'tenantId': 'test-tenant',
              'org': 'ev'
            };

            callContext.ctxWeights = {
              'tenantId': '0',
              'org': '1'
            };

            tailedBeastModel.find({ where: { 'name': 'Isobu' } }, callContext, function (err, res1) {
              if (err) {
                done(err);
              } else {
                expect(res1).not.to.be.null;
                expect(res1).to.be.empty;
                expect(res1).not.to.be.undefined;

                tailedBeastModel.find({}, callContext, function (err, res2) {
                  if (err) {
                    done(err);
                  } else {
                    expect(res2).not.to.be.null;
                    expect(res2).not.to.be.empty;
                    expect(res2).not.to.be.undefined;
                    expect(res2[0].name).to.be.equal('Isobu Part2');
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
      'name': 'Chomei',
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

    tailedBeastModel.create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result._scope).to.be.instanceof(Array);
        expect(result.name).to.be.equal('Chomei');

        postData.id = result.id;
        //postData._version = result._version;
        postData.name = 'Chomei part2';
        postData.scope.unit = 'finacle';

        tailedBeastModel.upsert(postData, callContext, function (err, res) {
          if (err) {
            done(err);
          } else {
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            expect(res._scope).to.be.instanceof(Array);
            expect(res.name).to.be.equal('Chomei part2');

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

            tailedBeastModel.find({ where: { 'name': 'Chomei' } }, callContext, function (err, res1) {
              if (err) {
                done(err);
              } else {
                expect(res1).not.to.be.null;
                expect(res1).not.to.be.empty;
                expect(res1).not.to.be.undefined;
                expect(res1[0].name).to.be.equal('Chomei');

                tailedBeastModel.find({}, callContext, function (err, res2) {
                  if (err) {
                    done(err);
                  } else {
                    expect(res2).not.to.be.null;
                    expect(res2).not.to.be.empty;
                    expect(res2).not.to.be.undefined;
                    expect(res2[0].name).to.be.equal('Chomei part2');
                    expect(res2[1].name).to.be.equal('Chomei');
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
      'name': 'Nine tails',
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

    tailedBeastModel.create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result._scope).to.be.instanceof(Array);
        expect(result.name).to.be.equal('Nine tails');
        postData.id = result.id;
        postData._version = result._version;
        postData.name = 'Nine tails Kurama';

        callContext.ctx = {
          'tenantId': 'new-tenant',
          'org': 'fin'
        };


        tailedBeastModel.upsert(postData, callContext, function (err, res) {
          if (err) {
            done(err);
          } else {
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            expect(res._scope).to.be.instanceof(Array);
            expect(res.name).to.be.equal('Nine tails Kurama');

            tailedBeastModel.find({}, callContext, function (err, res1) {
              if (err) {
                done(err);
              } else {
                expect(res1).not.to.be.null;
                expect(res1).not.to.be.empty;
                expect(res1).not.to.be.undefined;
                expect(res1[0].name).to.be.equal('Nine tails Kurama');

                callContext.ctx = {
                  'tenantId': 'test-tenant',
                  'org': 'fin'
                };


                tailedBeastModel.find({}, callContext, function (err, res2) {
                  if (err) {
                    done(err);
                  } else {
                    expect(res2).not.to.be.null;
                    expect(res2).not.to.be.empty;
                    expect(res2).not.to.be.undefined;
                    expect(res2[0].name).to.be.equal('Nine tails');
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
      'name': 'Rinn',
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

    animeCharacterModel.create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result._scope).to.be.instanceof(Array);
        expect(result.name).to.be.equal('Rinn');
        postData.id = result.id;
        postData._version = result._version;
        postData.name = 'Rinn Nohara';

        animeCharacterModel.upsert(postData, callContext, function (err, res) {
          if (err) {
            done(err);
          } else {
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            expect(res._scope).to.be.instanceof(Array);
            expect(res.name).to.be.equal('Rinn Nohara');

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

            animeCharacterModel.find({ where: { 'name': 'Rinn' } }, callContext, function (err, res1) {
              if (err) {
                done(err);
              } else {
                expect(res1).not.to.be.null;
                expect(res1).to.be.empty;
                expect(res1).not.to.be.undefined;

                animeCharacterModel.find({}, callContext, function (err, res2) {
                  if (err) {
                    done(err);
                  } else {
                    expect(res2).not.to.be.null;
                    expect(res2).not.to.be.empty;
                    expect(res2).not.to.be.undefined;
                    expect(res2[0].name).to.be.equal('Rinn Nohara');
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
      'name': 'Zetsu',
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

    animeCharacterModel.create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result._scope).to.be.instanceof(Array);
        expect(result.name).to.be.equal('Zetsu');

        postData.id = result.id;
        postData._version = result._version;
        postData.name = 'Black Zetsu';
        postData.scope.unit = 'finacle';

        animeCharacterModel.upsert(postData, callContext, function (err, res) {
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
      'name': 'Kabuto',
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

    animeCharacterModel.create(postData, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result._scope).to.be.instanceof(Array);
        expect(result.name).to.be.equal('Kabuto');
        postData.id = result.id;
        postData._version = result._version;
        postData.name = 'Kabuto Yakushi';

        callContext.ctx = {
          'tenantId': 'new-tenant',
          'username': 'new-test-case'
        };

        animeCharacterModel.upsert(postData, callContext, function (err, res) {
          if (err) {
            return done(err);
            //expect(err).not.to.be.null;
            //expect(err).not.to.be.undefined;
            //done();
          }
          else {
            //done(new Error('Should not update the record of other tenant'));
            expect(res.id).to.not.equal(postData.id);
            return done();
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
        var uniquePropModel = loopback.getModel('ModelUnique', callContext);
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

    var uniquePropModel = loopback.getModel('ModelUnique', callContext);
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

    PersonalizedModelWithScopeAsModel.create(postData, callContext, function (err, result) {
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

    PersonalizedModelWithScopeAsModel.find({ 'where': { 'name': 'modelScopeAsModel' } }, callContext, function (err, result) {
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
    PersonalizedModelWithScopeAsModel.find({ 'where': { 'name': 'modelScopeAsModel' } }, callContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        postData._version = res[0]._version;
        postData.id = res[0].id;
        PersonalizedModelWithScopeAsModel.upsert(postData, callContext, function (err, result) {
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
    PersonalizedModelWithScopeAsModel.find({ 'where': { 'name': 'modelScopeAsModelUpdate' } }, callContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log("================", res);
        PersonalizedModelWithScopeAsModel.deleteById(res[0].id, callContext, function (err, result) {
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
        log.debug(bootstrap.defaultContext, 'unable to create DataPersonalizationModel model');
        done(err);
      } else {
        var ModelWithOutMixins = loopback.getModel('ModelWithOutMixin', bootstrap.defaultContext);
        ModelWithOutMixins.create(data, bootstrap.defaultContext, function (err, result) {
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

    var ModelWithOutMixins = loopback.getModel('ModelWithOutMixin', bootstrap.defaultContext);
    ModelWithOutMixins.find({}, callContext, function (err, result) {
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

});
//End Of Describe


describe(chalk.blue('Data Personalization -Test for Persisted Model Static calls --REST'), function () {
  this.timeout(1000000);
  var modelName = 'OnlineGames';
  var personalizedModel;
  var testUserAccessToken;
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
      'name': 'Assasins Creed',
      'id': '1a'
    },
    {
      'name': 'Counter Strike',
      'id': '2a'
    },
    {
      'name': 'Injustice',
      'id': '3a'
    }
  ];

  // Creating testuser access token since removed jwt-assertion middleware
  // so that we can access the models which are created using bootstrap.defaultContext
  // are based on testuesr and test-tenant.
  before('Create Test User Accesstoken', function(done) {
    var testUser = {
      'username': 'testuser',
      'password': 'testuser123'
    };
    bootstrap.login(testUser, function(returnedAccesstoken) {
      testUserAccessToken = returnedAccesstoken;
      done();
    });
  });

  before('Create Test model', function (done) {
    models.ModelDefinition.create(newModelDetails, bootstrap.defaultContext, function (err, res) {
      if (err) {
        log.debug(bootstrap.defaultContext, 'unable to create DataPersonalizationTestModel model');
        done(err);
      } else {
        personalizedModel = loopback.getModel(modelName, bootstrap.defaultContext);
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

    personalizedModel.destroyAll({}, callContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        log.debug(bootstrap.defaultContext, 'Records deleted from Test model');
      }
    });
    done();
  });

  it('- POST', function (done) {
    var url = bootstrap.basePath + '/' + modelName + '?access_token=' + testUserAccessToken;
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
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body).to.have.length(3);
          done();
        }
      });
  });

  it('- EXISTS', function (done) {
    var url = bootstrap.basePath + '/' + modelName + '/1a/exists' + '?access_token=' + testUserAccessToken;
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
    var url = bootstrap.basePath + '/' + modelName + '?access_token=' + testUserAccessToken;
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
          expect(result.body).to.have.length(3);
          done();
        }
      });
  });

  it('- GET by ID', function (done) {
    var url = bootstrap.basePath + '/' + modelName + '/1a' + '?access_token=' + testUserAccessToken;
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
          expect(result.body.name).to.be.equal('Assasins Creed');
          done();
        }
      });
  });

  it('- COUNT', function (done) {
    var url = bootstrap.basePath + '/' + modelName + '/count' + '?access_token=' + testUserAccessToken;
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
    postData.id = '4a';
    postData.name = 'Sword Art Online';

    var url = bootstrap.basePath + '/' + modelName + '?access_token=' + testUserAccessToken;
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
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body.name).to.be.equal('Sword Art Online');
          testData[1] = result.body;
          done();
        }
      });
  });

  it('- FINDONE', function (done) {
    var url = bootstrap.basePath + '/' + modelName + '/findOne?' + '?access_token=' + testUserAccessToken + '&{"where":{"name":"Assasins Creed"}';
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
          expect(result.body.name).to.be.equal('Assasins Creed');
          done();
        }
      });
  });

  it('- PUT by ID', function (done) {
    var postData = testData[2];
    postData.name = 'Injustice 2';
    var url = bootstrap.basePath + '/' + modelName + '/3a' + '?access_token=' + testUserAccessToken;
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
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body.name).to.be.equal('Injustice 2');
          testData[2] = result.body;
          done();
        }
      });
  });

  it('- DELETE by ID', function (done) {
    var url = bootstrap.basePath + '/' + modelName + '/1a' + '?access_token=' + testUserAccessToken;
    api
      .del(url)
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
          expect(result.body.count).to.be.equal(1);
          done();
        }
      });
  });
});
//End of Describe