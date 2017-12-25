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
var supertest = require('supertest');
var app = bootstrap.app;
var api = supertest(app);
var apiV2 = bootstrap.api;
var models = bootstrap.models;
var logger = require('oe-logger');
var log = logger('data-hierarchy-test');
var loopback = require('loopback');
var async = require('async');

describe(chalk.blue('Data Hierarchy Test --Programatic'), function () {
  this.timeout(50000);
  var RegionModel;
  var ProductModel;
  var SettingsModel;

  var regionModel = 'Region';
  var regionModelDetails = {
    name: regionModel,
    base: 'BaseEntity',
    properties: {
      'regionName': {
        'type': 'string',
        'required': true
      }
    },
    strict: false,
    idInjection: true,
    plural: regionModel,
    mixins: {
      'HistoryMixin': true,
      'DataHierarchyMixin': true,
      'SoftDeleteMixin': false
    },
    autoscope: [
      'tenantId'
    ],
    'hierarchyScope': ['regionHierarchy']
  };

  var productModel = 'Product';
  var productModelDetails = {
    name: productModel,
    base: 'BaseEntity',
    properties: {
      'productName': {
        'type': 'string',
        'required': true
      }
    },
    strict: false,
    idInjection: true,
    plural: productModel,
    mixins: {
      'HistoryMixin': true,
      'DataHierarchyMixin': true,
      'SoftDeleteMixin': false
    },
    autoscope: [
      'tenantId'
    ],
    hierarchyScope: ['regionHierarchy']
  };

  var settingsModel = 'SystemSettings';
  var settingsModelDetails = {
    name: settingsModel,
    base: 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
        'unique': true
      },
      'value': 'object'
    },
    strict: false,
    idInjection: true,
    plural: settingsModel,
    mixins: {
      'HistoryMixin': true,
      'DataPersonalizationMixin': false,
      'DataHierarchyMixin': true,
      'SoftDeleteMixin': false

    },
    autoscope: [
      'tenantId'
    ],
    hierarchyScope: ['regionHierarchy'],
    upward: true
  };

  before('Create Test models', function (done) {
    models.ModelDefinition.create(regionModelDetails, bootstrap.defaultContext, function (err, res) {
      if (err) {
        log.debug(bootstrap.defaultContext, 'unable to create Region model');
        done(err);
      } else {
        models.ModelDefinition.create(productModelDetails, bootstrap.defaultContext, function (err, res) {
          if (err) {
            log.debug(bootstrap.defaultContext, 'unable to create Product model');
            done(err);
          } else {
            models.ModelDefinition.create(settingsModelDetails, bootstrap.defaultContext, function (err, res) {
              if (err) {
                log.debug(bootstrap.defaultContext, 'unable to create Settings model');
                done(err);
              } else {
                RegionModel = loopback.getModel(regionModel, bootstrap.defaultContext);
                ProductModel = loopback.getModel(productModel, bootstrap.defaultContext);
                SettingsModel = loopback.getModel(settingsModel, bootstrap.defaultContext);
                done();
              }
            });
          }
        });
      }
    });
  });

  after('Remove Data from Test Models', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser'
    };
    RegionModel.destroyAll({}, callContext, function (err, result) {
      if (err) {
        done(err);
      }
      ProductModel.destroyAll({}, callContext, function (err, result) {
        if (err) {
          done(err);
        }
        SettingsModel.destroyAll({}, callContext, function (err, result) {
          if (err) {
            done(err);
          }
          done();
        });
      });
    });
  });

  it('Create region Hierarchy in region model', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser'
    };

    async.series([
      function (callback) {
        var testData = {
          'regionName': 'Continents',
          'id': 'root'
        };
        RegionModel.create(testData, callContext, function (err, result) {
          if (err) {
            callback(err);
          } else {
            expect(result).not.to.be.null;
            expect(result).not.to.be.empty;
            expect(result).not.to.be.undefined;
            expect(result._hierarchyScope.regionHierarchy).to.be.equal(',root,');
            callback();
          }
        });
      },
      function (callback) {
        var testData = {
          'regionName': 'Asia',
          'id': 'asia'
        };
        RegionModel.create(testData, callContext, function (err, result) {
          if (err) {
            callback(err);
          } else {
            expect(result).not.to.be.null;
            expect(result).not.to.be.empty;
            expect(result).not.to.be.undefined;
            expect(result._hierarchyScope.regionHierarchy).to.be.equal(',root,asia,');
            callback();
          }
        });
      },
      function (callback) {
        var testData = {
          'regionName': 'India',
          'id': 'india',
          'parentId': 'asia'
        };
        RegionModel.create(testData, callContext, function (err, result) {
          if (err) {
            callback(err);
          } else {
            expect(result).not.to.be.null;
            expect(result).not.to.be.empty;
            expect(result).not.to.be.undefined;
            expect(result._hierarchyScope.regionHierarchy).to.be.equal(',root,asia,india,');
            callback();
          }
        });
      },
      function (callback) {
        var testData = {
          'regionName': 'Delhi',
          'id': 'delhi',
          'parentId': 'india'
        };
        RegionModel.create(testData, callContext, function (err, result) {
          if (err) {
            callback(err);
          } else {
            expect(result).not.to.be.null;
            expect(result).not.to.be.empty;
            expect(result).not.to.be.undefined;
            expect(result._hierarchyScope.regionHierarchy).to.be.equal(',root,asia,india,delhi,');
            callback();
          }
        });
      },
      function (callback) {
        var testData = {
          'regionName': 'Bangalore',
          'id': 'bangalore',
          'parentId': 'india'
        };
        RegionModel.create(testData, callContext, function (err, result) {
          if (err) {
            callback(err);
          } else {
            expect(result).not.to.be.null;
            expect(result).not.to.be.empty;
            expect(result).not.to.be.undefined;
            expect(result._hierarchyScope.regionHierarchy).to.be.equal(',root,asia,india,bangalore,');
            callback();
          }
        });
      },
      function (callback) {
        var testData = {
          'regionName': 'Japan',
          'id': 'japan',
          'parentId': 'asia'
        };
        RegionModel.create(testData, callContext, function (err, result) {
          if (err) {
            callback(err);
          } else {
            expect(result).not.to.be.null;
            expect(result).not.to.be.empty;
            expect(result).not.to.be.undefined;
            expect(result._hierarchyScope.regionHierarchy).to.be.equal(',root,asia,japan,');
            callback();
          }
        });
      },
      function (callback) {
        var testData = {
          'regionName': 'Tokyo',
          'id': 'tokyo',
          'parentId': 'japan'
        };
        RegionModel.create(testData, callContext, function (err, result) {
          if (err) {
            callback(err);
          } else {
            expect(result).not.to.be.null;
            expect(result).not.to.be.empty;
            expect(result).not.to.be.undefined;
            expect(result._hierarchyScope.regionHierarchy).to.be.equal(',root,asia,japan,tokyo,');
            callback();
          }
        });
      }
    ], function (err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('Create products hierarchy based on region', function (done) {
    var callContext = {};

    async.series([
      function (callback) {
        callContext.ctx = {
          'tenantId': 'test-tenant',
          'username': 'testuser',
          'regionHierarchy': ',root,asia,'
        };
        var newProduct = {
          'productName': 'Coca-Cola'
        };
        ProductModel.create(newProduct, callContext, function (err, res) {
          if (err) {
            callback(err);
          } else {
            // console.log("-------------", res);
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            expect(res.productName).to.be.equal('Coca-Cola');
            expect(res._hierarchyScope.regionHierarchy).to.be.equal(',root,asia,');
            callback();
          }
        });
      },
      function (callback) {
        callContext.ctx = {
          'tenantId': 'test-tenant',
          'username': 'testuser',
          'regionHierarchy': ',root,asia,india,'
        };
        var newProduct = {
          'productName': 'Diet coke'
        };
        ProductModel.create(newProduct, callContext, function (err, res) {
          if (err) {
            callback(err);
          } else {
            // console.log("-------------", res);
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            expect(res.productName).to.be.equal('Diet coke');
            expect(res._hierarchyScope.regionHierarchy).to.be.equal(',root,asia,india,');
            callback();
          }
        });
      },
      function (callback) {
        callContext.ctx = {
          'tenantId': 'test-tenant',
          'username': 'testuser',
          'regionHierarchy': ',root,asia,india,delhi,'
        };
        var newProduct = {
          'productName': 'Coke Zero'
        };
        ProductModel.create(newProduct, callContext, function (err, res) {
          if (err) {
            callback(err);
          } else {
            // console.log("-------------", res);
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            expect(res.productName).to.be.equal('Coke Zero');
            expect(res._hierarchyScope.regionHierarchy).to.be.equal(',root,asia,india,delhi,');
            callback();
          }
        });
      },
      function (callback) {
        callContext.ctx = {
          'tenantId': 'test-tenant',
          'username': 'testuser',
          'regionHierarchy': ',root,asia,india,'
        };
        var newProduct = {
          'productName': 'Pulpy Orange'
        };
        ProductModel.create(newProduct, callContext, function (err, res) {
          if (err) {
            callback(err);
          } else {
            // console.log("-------------", res);
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            expect(res.productName).to.be.equal('Pulpy Orange');
            expect(res._hierarchyScope.regionHierarchy).to.be.equal(',root,asia,india,');
            callback();
          }
        });
      }
    ], function (err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('Get products based on regional context Asia/India', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'regionHierarchy': ',root,asia,india,'
    };

    ProductModel.find({}, callContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log("==============", res);
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res).to.be.instanceof(Array);
        expect(res).to.have.length(2);
        done();
      }
    });
  });

  it('Get products based on regional context Asia/India/Delhi', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'regionHierarchy': ',root,asia,india,delhi,'
    };

    ProductModel.find({}, callContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log("==============", res);
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res).to.be.instanceof(Array);
        expect(res).to.have.length(1);
        expect(res[0].productName).to.be.equal('Coke Zero');
        done();
      }
    });
  });

  it('Get products based on regional context Asia/India with depth *', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'regionHierarchy': ',root,asia,india,'
    };

    ProductModel.find({ 'depth': '*' }, callContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log("==============", res);
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res).to.be.instanceof(Array);
        expect(res).to.have.length(3);
        done();
      }
    });
  });

  it('Get products based on regional context Asia/India with depth 1', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'regionHierarchy': ',root,asia,india,'
    };

    ProductModel.find({ 'depth': '1' }, callContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log("==============", res);
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res).to.be.instanceof(Array);
        expect(res).to.have.length(3);
        done();
      }
    });
  });

  it('Get products based on regional context Asia/India with depth 3(Actual level of hierarchy ends at 1)', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'regionHierarchy': ',root,asia,india,'
    };

    ProductModel.find({ 'depth': '3' }, callContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log("==============", res);
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res).to.be.instanceof(Array);
        expect(res).to.have.length(3);
        done();
      }
    });
  });

  it('Create SystemSetings based on regionHierarchy', function (done) {
    var callContext = {};

    async.series([
      function (callback) {
        callContext.ctx = {
          'tenantId': 'test-tenant',
          'username': 'testuser',
          'regionHierarchy': ',root,asia,india,'
        };
        var newSetting = {
          'name': 'passwordPolicy',
          'value': {
            'maxLength': 8
          }
        };
        SettingsModel.create(newSetting, callContext, function (err, res) {
          if (err) {
            callback(err);
          } else {
            // console.log("-------------", res);
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            expect(res.name).to.be.equal('passwordPolicy');
            expect(res._hierarchyScope.regionHierarchy).to.be.equal(',root,asia,india,');
            callback();
          }
        });
      },
      function (callback) {
        callContext.ctx = {
          'tenantId': 'test-tenant',
          'username': 'testuser',
          'regionHierarchy': ',root,asia,india,bangalore,'
        };
        var newSetting = {
          'name': 'passwordPolicy',
          'value': {
            'maxLength': 12
          }
        };
        SettingsModel.create(newSetting, callContext, function (err, res) {
          if (err) {
            callback(err);
          } else {
            // console.log("-------------", res);
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            expect(res.name).to.be.equal('passwordPolicy');
            expect(res._hierarchyScope.regionHierarchy).to.be.equal(',root,asia,india,bangalore,');
            callback();
          }
        });
      }
    ], function (err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('Get settings based on regional context Asia/India with upward true on model', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'regionHierarchy': ',root,asia,india,'
    };

    SettingsModel.find({}, callContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log("==============", res);
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res).to.be.instanceof(Array);
        expect(res).to.have.length(1);
        expect(res[0].value.maxLength).to.be.equal(8);
        done();
      }
    });
  });

  it('Get settings based on regional context Asia/India/Bangalore with upward true on model without depth', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'regionHierarchy': ',root,asia,india,bangalore,'
    };

    SettingsModel.find({}, callContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log("==============", res);
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res).to.be.instanceof(Array);
        expect(res).to.have.length(1);
        expect(res[0].value.maxLength).to.be.equal(12);
        done();
      }
    });
  });

  it('Get settings based on regional context Asia/India/Bangalore with upward true on model with depth 1', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'regionHierarchy': ',root,asia,india,bangalore,'
    };

    SettingsModel.find({ 'depth': '1' }, callContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log("==============", res);
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res).to.be.instanceof(Array);
        expect(res).to.have.length(1);
        expect(res[0].value.maxLength).to.be.equal(12);
        done();
      }
    });
  });

  it('Get settings based on regional context Asia/India/Delhi with upward true on model(Test for fallback)', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'regionHierarchy': ',root,asia,india,delhi,'
    };

    SettingsModel.find({}, callContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log("==============", res);
        expect(res).not.to.be.null;
        expect(res).to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res).to.be.instanceof(Array);
        expect(res).to.have.length(0);
        done();
      }
    });
  });

  it('Get settings based on regional context Asia/India/Delhi with upward true on model with depth(Test for fallback)', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'regionHierarchy': ',root,asia,india,delhi,'
    };

    SettingsModel.find({ 'depth': 1 }, callContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log("==============", res);
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res).to.be.instanceof(Array);
        expect(res).to.have.length(1);
        expect(res[0].value.maxLength).to.be.equal(8);
        done();
      }
    });
  });

  it('Should throw an error if type of hierarchy key in model definition is not of type string (Create)', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'employeeHierarchy': ',principal,headMaster,teacher,'
    };

    var employeeModel = {
      "name": "EmployeeModel",
      "properties": {
        "empName": "string"
      },
      'base': 'PersistedModel',
      "mixins": {
        'ObserverMixin': true,
        'ModelValidations': true,
        'HistoryMixin': true,
        'DataPersonalizationMixin': true,
        'DataHierarchyMixin': true,
        'SoftDeleteMixin': false
      },
      'hierarchyScope': [{ employeeHierarchy: "test" }]
    }

    var newmodel = loopback.createModel(employeeModel);
    newmodel.clientModelName = "EmployeeModel";
    newmodel.clientPlural = "EmployeeModels";
    app.model(newmodel, {
      dataSource: 'db'
    });
    var myModel = loopback.findModel('EmployeeModel');

    myModel.create({ empName: 'Mikasa' }, callContext, function (err, result) {
      if (err) {
        expect(err).not.to.be.null;
        expect(err).not.to.be.empty;
        expect(err).not.to.be.undefined;
        expect(err.code).to.be.equal('DATA_HIERARCHY_ERROR_001');
        expect(err.name).to.be.equal('Hierarchy Scope Definition Error');
        expect(err.type).to.be.equal('Type mismatch in Declaration');
        done();
      } else {
        done('Error: Should throw an error "Type mismatch in Declaration"');
      }
    });

  });

  it('Should throw an error if type of hierarchy key in model definition is not of type string (find)', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'employeeHierarchy': ',principal,headMaster,teacher,'
    };
    var myModel = loopback.findModel('EmployeeModel');

    myModel.find({ where: { empName: 'Mikasa' } }, callContext, function (err, result) {
      if (err) {
        expect(err).not.to.be.null;
        expect(err).not.to.be.empty;
        expect(err).not.to.be.undefined;
        expect(err.code).to.be.equal('DATA_HIERARCHY_ERROR_001');
        expect(err.name).to.be.equal('Hierarchy Scope Definition Error');
        expect(err.type).to.be.equal('Type mismatch in Declaration');
        done();
      } else {
        done('Error: Should throw an error "Type mismatch in Declaration"');
      }
    });

  });

  it('Should throw an error if parent not found for given parentId (create)', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'staffmodelHierarchy': ',principal,headMaster,teacher,',
      'studentinchargeHierarchy': ',root,'
    };

    var staffModel = {
      "name": "StaffModel",
      "properties": {
        "name": "string"
      },
      "mixins": {
        'HistoryMixin': true,
        'DataHierarchyMixin': true,
        'SoftDeleteMixin': false
      },
      autoscope: [
        'tenantId'
      ],
      'hierarchyScope': ['staffmodelHierarchy', 'studentinchargeHierarchy']
    }

    models.ModelDefinition.create(staffModel, bootstrap.defaultContext, function (err, res) {
      if (err) {
        log.debug(bootstrap.defaultContext, 'unable to create dummyTestModel model');
        done(err);
      } else {
        var myModel = loopback.getModel('StaffModel', bootstrap.defaultContext);
        myModel.create({ name: 'Asuna', parentId: 'school' }, callContext, function (err, result) {
          if (err) {
            expect(err).not.to.be.null;
            expect(err).not.to.be.empty;
            expect(err).not.to.be.undefined;
            expect(err.code).to.be.equal('DATA_HIERARCHY_ERROR_003');
            expect(err.name).to.be.equal('Parent Not Found');
            expect(err.type).to.be.equal('ParentNotFound');
            done();
          } else {
            done('Error: Should throw an error "Parent Not Found"');
          }
        });
      }
    });
  });

  it('Should throw an error if hierarchy data not provided for defined hierarchy (create)', function (done) {
    var callContext = {};
    callContext.ctx = {
      'tenantId': 'test-tenant',
      'username': 'testuser',
      'staffmodelHierarchy': ',principal,headMaster,teacher,'
    };

    var myModel = loopback.getModel('StaffModel', bootstrap.defaultContext);
    myModel.create({ name: 'Kirito' }, callContext, function (err, result) {
      if (err) {
        expect(err).not.to.be.null;
        expect(err).not.to.be.empty;
        expect(err).not.to.be.undefined;
        expect(err.code).to.be.equal('DATA_HIERARCHY_ERROR_002');
        expect(err.name).to.be.equal('Hierarchy Personalization error');
        expect(err.type).to.be.equal('Insufficient data');
        done();
      } else {
        done('Error: Should throw an error "Insufficient data"');
      }
    });
  });

});
// END of Describe


describe(chalk.blue('Data Hierarchy Test --REST'), function () {
  var RegionModel;
  var ProductModel;
  var SettingsModel;

  var regionModel = 'Region';
  var productModel = 'Product';
  var settingsModel = 'SystemSettings';
  this.timeout(50000);
  var testUserAccessToken;
  var asiaUserAccessToken;
  var indiaUserAccessToken;
  var delhiUserAccessToken;
  var bangaloreUserAccessToken;

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

  before('Create Test models and users', function (done) {
    var atModel = loopback.getModelByType('AccessToken');
    var user = loopback.getModelByType('BaseUser');

    user.defineProperty('region', {
      type: 'string'
    });

    atModel.defineProperty('regionHierarchy', {
      type: 'string'
    });


    atModel.observe('before save', function (ctx, next) {
      var data = ctx.data || ctx.instance;
      var userid = data.userId;
      user.find({ 'where': { 'id': userid } }, bootstrap.defaultContext, function (err, instance) {
        if (err) {
          next(err);
        } else if (instance.length) {
          // console.log("========================= instance", instance);
          RegionModel.findOne({ where: { regionName: instance[0].region } }, bootstrap.defaultContext, function (err, res) {
            if (err) {
              next(err);
            } else if (res) {
              // console.log("========================== res", res);
              data.__data.regionHierarchy = res._hierarchyScope.regionHierarchy;
              // console.log("*********************", ctx.instance);
              next();
            } else {
              next();
            }
          });
        } else {
          next();
        }
      });
    });


    async.series([
      function (callback) {
        // var aSession = loopback.getModelByType('AuthSession');
        // aSession.defineProperty('_hierarchyScope', {
        //     type: 'string'
        // });
        user.dataSource.autoupdate(['BaseUser', 'AuthSession'], function fnDSAutoUpdate(err) {
          if (err) callback(err);
          callback();
        });
      },
      function (callback) {
        var userDetails = {
          'username': 'AsiaUser',
          'password': 'AsiaUser@1',
          'email': 'AsiaUser@mycompany.com',
          'region': 'Asia'
        };
        user.create(userDetails, bootstrap.defaultContext, function (err, res) {
          if (err) {
            callback(err);
          } else {
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            callback();
          }
        });
      }, function (callback) {
        var userDetails = {
          'username': 'Indiauser',
          'password': 'IndiaUser@1',
          'email': 'IndiaUser@mycompany.com',
          'region': 'India'
        };
        user.create(userDetails, bootstrap.defaultContext, function (err, res) {
          if (err) {
            callback(err);
          } else {
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            callback();
          }
        });
      }, function (callback) {
        var userDetails = {
          'username': 'DelhiUser',
          'password': 'DelhiUser@1',
          'email': 'DelhiUser@mycompany.com',
          'region': 'Delhi'
        };
        user.create(userDetails, bootstrap.defaultContext, function (err, res) {
          if (err) {
            callback(err);
          } else {
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            callback();
          }
        });
      }, function (callback) {
        var userDetails = {
          'username': 'BangaloreUser',
          'password': 'BangaloreUser@1',
          'email': 'BangaloreUser@mycompany.com',
          'region': 'Bangalore'
        };
        user.create(userDetails, bootstrap.defaultContext, function (err, res) {
          if (err) {
            callback(err);
          } else {
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            callback();
          }
        });
      }, function (callback) {
        var userDetails = {
          'username': 'JapanUser',
          'password': 'JapanUser@1',
          'email': 'JapanUser@mycompany.com',
          'region': 'Japan'
        };
        user.create(userDetails, bootstrap.defaultContext, function (err, res) {
          if (err) {
            callback(err);
          } else {
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            callback();
          }
        });
      }],
      function (err) {
        if (err) {
          done(err);
        } else {
          RegionModel = loopback.getModel(regionModel, bootstrap.defaultContext);
          ProductModel = loopback.getModel(productModel, bootstrap.defaultContext);
          SettingsModel = loopback.getModel(settingsModel, bootstrap.defaultContext);
          done();
        }
      });
  });

  after('Remove Data from Test Models', function (done) {
    var atModel = loopback.getModelByType('AccessToken');
    RegionModel.destroyAll({}, bootstrap.defaultContext, function (err, result) {
      if (err) {
        done(err);
      }
      ProductModel.destroyAll({}, bootstrap.defaultContext, function (err, result) {
        atModel.removeObserver('before save');
        if (err) {
          done(err);
        }
        done();
      });
    });
  });

  it('Create region Hierarchy in region model', function (done) {
    this.timeout(60000);
    // Passing access_token query param
    var url = bootstrap.basePath + '/' + regionModel + '?access_token='+testUserAccessToken;
    async.series([
      function (callback) {
        var testData = {
          'regionName': 'Continents',
          'id': 'root'
        };
        apiV2
          .post(url)
          .send(testData)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .expect(200).end(function (err, result) {
            if (err) {
              callback(err);
            } else {
              // console.log("------------", result.body);
              expect(result.body).not.to.be.null;
              expect(result.body).not.to.be.empty;
              expect(result.body).not.to.be.undefined;
              expect(result.body.id).to.be.equal('root');
              callback();
            }
          });
      },
      function (callback) {
        var testData = {
          'regionName': 'Asia',
          'id': 'asia'
        };
        apiV2.post(url)
          .send(testData)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .expect(200).end(function (err, result) {
            if (err) {
              callback(err);
            } else {
              expect(result.body).not.to.be.null;
              expect(result.body).not.to.be.empty;
              expect(result.body).not.to.be.undefined;
              expect(result.body.id).to.be.equal('asia');
              callback();
            }
          });
      },
      function (callback) {
        var testData = {
          'regionName': 'India',
          'id': 'india',
          'parentId': 'asia'
        };
        apiV2.post(url)
          .send(testData)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .expect(200).end(function (err, result) {
            if (err) {
              callback(err);
            } else {
              expect(result.body).not.to.be.null;
              expect(result.body).not.to.be.empty;
              expect(result.body).not.to.be.undefined;
              expect(result.body.id).to.be.equal('india');
              callback();
            }
          });
      },
      function (callback) {
        var testData = {
          'regionName': 'Delhi',
          'id': 'delhi',
          'parentId': 'india'
        };
        apiV2.post(url)
          .send(testData)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .expect(200).end(function (err, result) {
            if (err) {
              callback(err);
            } else {
              expect(result.body).not.to.be.null;
              expect(result.body).not.to.be.empty;
              expect(result.body).not.to.be.undefined;
              expect(result.body.id).to.be.equal('delhi');
              callback();
            }
          });
      },
      function (callback) {
        var testData = {
          'regionName': 'Bangalore',
          'id': 'bangalore',
          'parentId': 'india'
        };
        apiV2.post(url)
          .send(testData)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .expect(200).end(function (err, result) {
            if (err) {
              callback(err);
            } else {
              expect(result.body).not.to.be.null;
              expect(result.body).not.to.be.empty;
              expect(result.body).not.to.be.undefined;
              expect(result.body.id).to.be.equal('bangalore');
              callback();
            }
          });
      },
      function (callback) {
        var testData = {
          'regionName': 'Japan',
          'id': 'japan',
          'parentId': 'asia'
        };
        apiV2.post(url)
          .send(testData)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .expect(200).end(function (err, result) {
            if (err) {
              callback(err);
            } else {
              expect(result.body).not.to.be.null;
              expect(result.body).not.to.be.empty;
              expect(result.body).not.to.be.undefined;
              expect(result.body.id).to.be.equal('japan');
              callback();
            }
          });
      },
      function (callback) {
        var testData = {
          'regionName': 'Tokyo',
          'id': 'tokyo',
          'parentId': 'japan'
        };
        apiV2.post(url)
          .send(testData)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .expect(200).end(function (err, result) {
            if (err) {
              callback(err);
            } else {
              expect(result.body).not.to.be.null;
              expect(result.body).not.to.be.empty;
              expect(result.body).not.to.be.undefined;
              expect(result.body.id).to.be.equal('tokyo');
              callback();
            }
          });
      }
    ], function (err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('Create products hierarchy based on region', function (done) {
    this.timeout(6000000);
    var url = bootstrap.basePath + '/' + productModel;
    async.series([
      function (callback) {
        var userDetails = {
          'password': 'AsiaUser@1',
          'email': 'AsiaUser@mycompany.com'
        };
        var newProduct = {
          'productName': 'Coca-Cola'
        };
        bootstrap.login(userDetails, function (token) {
          asiaUserAccessToken = token;
          var newUrl = url + '?access_token=' + asiaUserAccessToken;
          api
            .post(newUrl)
            .send(newProduct)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .end(function (err, res) {
              if (err) {
                callback(err);
              } else {
                // console.log("-------------", res.body);
                expect(res.body).not.to.be.null;
                expect(res.body).not.to.be.empty;
                expect(res.body).not.to.be.undefined;
                expect(res.body.productName).to.be.equal('Coca-Cola');
                callback();
              }
            });
        });
      },
      function (callback) {
        var userDetails = {
          'password': 'IndiaUser@1',
          'email': 'IndiaUser@mycompany.com'
        };
        var newProduct = {
          'productName': 'Diet coke'
        };
        bootstrap.login(userDetails, function (token) {
          indiaUserAccessToken = token;
          var newUrl = url + '?access_token=' + indiaUserAccessToken;

          api
            .post(newUrl)
            .send(newProduct)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .end(function (err, res) {
              if (err) {
                callback(err);
              } else {
                // console.log("-------------", res.body);
                expect(res.body).not.to.be.null;
                expect(res.body).not.to.be.empty;
                expect(res.body).not.to.be.undefined;
                expect(res.body.productName).to.be.equal('Diet coke');
                callback();
              }
            });
        });
      },
      function (callback) {
        var userDetails = {
          'password': 'DelhiUser@1',
          'email': 'DelhiUser@mycompany.com'
        };
        var newProduct = {
          'productName': 'Coke Zero'
        };
        bootstrap.login(userDetails, function (token) {
          delhiUserAccessToken = token;
          var newUrl = url + '?access_token=' + delhiUserAccessToken;
          api
            .post(newUrl)
            .send(newProduct)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .end(function (err, res) {
              if (err) {
                callback(err);
              } else {
                // console.log("-------------", res.body);
                expect(res.body).not.to.be.null;
                expect(res.body).not.to.be.empty;
                expect(res.body).not.to.be.undefined;
                expect(res.body.productName).to.be.equal('Coke Zero');
                callback();
              }
            });
        });
      },
      function (callback) {
        var newProduct = {
          'productName': 'Pulpy Orange'
        };
        var newUrl = url + '?access_token=' + indiaUserAccessToken;
        api
          .post(newUrl)
          .send(newProduct)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .end(function (err, res) {
            if (err) {
              callback(err);
            } else {
              // console.log("-------------", res.body);
              expect(res.body).not.to.be.null;
              expect(res.body).not.to.be.empty;
              expect(res.body).not.to.be.undefined;
              expect(res.body.productName).to.be.equal('Pulpy Orange');
              callback();
            }
          });
      }
    ], function (err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('Get products based on regional context Asia/India', function (done) {
    var url = bootstrap.basePath + '/' + productModel + '?access_token=' + indiaUserAccessToken;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("==============", res.body);
          expect(res.body).not.to.be.null;
          expect(res.body).not.to.be.empty;
          expect(res.body).not.to.be.undefined;
          expect(res.body).to.be.instanceof(Array);
          expect(res.body).to.have.length(2);
          done();
        }
      });
  });

  it('Get products based on regional context Asia/India/Delhi', function (done) {
    var url = bootstrap.basePath + '/' + productModel + '?access_token=' + delhiUserAccessToken;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("==============", res.body);
          expect(res.body).not.to.be.null;
          expect(res.body).not.to.be.empty;
          expect(res.body).not.to.be.undefined;
          expect(res.body).to.be.instanceof(Array);
          expect(res.body).to.have.length(1);
          expect(res.body[0].productName).to.be.equal('Coke Zero');
          done();
        }
      });
  });

  it('Get products based on regional context Asia/India with depth *', function (done) {
    var filter = 'filter={"depth":"*"}';
    var url = bootstrap.basePath + '/' + productModel + '?access_token=' + indiaUserAccessToken + '&' + filter;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("==============", res.body);
          expect(res.body).not.to.be.null;
          expect(res.body).not.to.be.empty;
          expect(res.body).not.to.be.undefined;
          expect(res.body).to.be.instanceof(Array);
          expect(res.body).to.have.length(3);
          done();
        }
      });
  });

  it('Get products based on regional context Asia/India with depth 1', function (done) {
    var filter = 'filter={"depth":"1"}';
    var url = bootstrap.basePath + '/' + productModel + '?access_token=' + indiaUserAccessToken + '&' + filter;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("==============", res.body);
          expect(res.body).not.to.be.null;
          expect(res.body).not.to.be.empty;
          expect(res.body).not.to.be.undefined;
          expect(res.body).to.be.instanceof(Array);
          expect(res.body).to.have.length(3);
          done();
        }
      });
  });

  it('Get products based on regional context Asia/India with depth 3(Actual level of hierarchy ends at 1)', function (done) {
    var filter = 'filter={"depth":"3"}';
    var url = bootstrap.basePath + '/' + productModel + '?access_token=' + indiaUserAccessToken + '&' + filter;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("==============", res.body);
          expect(res.body).not.to.be.null;
          expect(res.body).not.to.be.empty;
          expect(res.body).not.to.be.undefined;
          expect(res.body).to.be.instanceof(Array);
          expect(res.body).to.have.length(3);
          done();
        }
      });
  });

  it('Create SystemSetings based on regionHierarchy', function (done) {
    this.timeout(6000);
    var url = bootstrap.basePath + '/' + settingsModel;

    async.series([
      function (callback) {
        var newSetting = {
          'name': 'passwordPolicy',
          'value': {
            'maxLength': 8
          }
        };
        var newUrl = url + '?access_token=' + indiaUserAccessToken;
        api
          .post(newUrl)
          .send(newSetting)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .end(function (err, res) {
            if (err) {
              callback(err);
            } else {
              // console.log("-------------", res.body);
              expect(res.body).not.to.be.null;
              expect(res.body).not.to.be.empty;
              expect(res.body).not.to.be.undefined;
              expect(res.body.name).to.be.equal('passwordPolicy');
              callback();
            }
          });
      },
      function (callback) {
        var newSetting = {
          'name': 'passwordPolicy',
          'value': {
            'maxLength': 12
          }
        };
        var userDetails = {
          'password': 'BangaloreUser@1',
          'email': 'BangaloreUser@mycompany.com'
        };
        bootstrap.login(userDetails, function (token) {
          bangaloreUserAccessToken = token;
          var newUrl = url + '?access_token=' + bangaloreUserAccessToken;
          api
            .post(newUrl)
            .send(newSetting)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .end(function (err, res) {
              if (err) {
                callback(err);
              } else {
                // console.log("-------------", res.body);
                expect(res.body).not.to.be.null;
                expect(res.body).not.to.be.empty;
                expect(res.body).not.to.be.undefined;
                expect(res.body.name).to.be.equal('passwordPolicy');
                callback();
              }
            });
        });
      }
    ], function (err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('Get settings based on regional context Asia/India with upward true on model', function (done) {
    var url = bootstrap.basePath + '/' + settingsModel + '?access_token=' + indiaUserAccessToken;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("==============", res.body);
          expect(res.body).not.to.be.null;
          expect(res.body).not.to.be.empty;
          expect(res.body).not.to.be.undefined;
          expect(res.body).to.be.instanceof(Array);
          expect(res.body).to.have.length(1);
          expect(res.body[0].value.maxLength).to.be.equal(8);
          done();
        }
      });
  });

  it('Get settings based on regional context Asia/India/Bangalore with upward true on model without depth', function (done) {
    var url = bootstrap.basePath + '/' + settingsModel + '?access_token=' + bangaloreUserAccessToken;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("==============", res.body);
          expect(res.body).not.to.be.null;
          expect(res.body).not.to.be.empty;
          expect(res.body).not.to.be.undefined;
          expect(res.body).to.be.instanceof(Array);
          expect(res.body).to.have.length(1);
          expect(res.body[0].value.maxLength).to.be.equal(12);
          done();
        }
      });
  });

  it('Get settings based on regional context Asia/India/Bangalore with upward true on model with depth 1', function (done) {
    var filter = 'filter={"depth":1}';
    var url = bootstrap.basePath + '/' + settingsModel + '?access_token=' + bangaloreUserAccessToken + '&' + filter;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("==============", res.body);
          expect(res.body).not.to.be.null;
          expect(res.body).not.to.be.empty;
          expect(res.body).not.to.be.undefined;
          expect(res.body).to.be.instanceof(Array);
          expect(res.body).to.have.length(1);
          expect(res.body[0].value.maxLength).to.be.equal(12);
          done();
        }
      });
  });

  it('Get settings based on regional context Asia/India/Delhi with upward true on model(Test for fallback)', function (done) {
    var url = bootstrap.basePath + '/' + settingsModel + '?access_token=' + delhiUserAccessToken;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("==============", res.body);
          expect(res.body).not.to.be.null;
          expect(res.body).to.be.empty;
          expect(res.body).not.to.be.undefined;
          expect(res.body).to.be.instanceof(Array);
          expect(res.body).to.have.length(0);
          done();
        }
      });
  });

  it('Get settings based on regional context Asia/India/Delhi with upward true on model with depth(Test for fallback)', function (done) {
    var filter = 'filter={"depth":1}';
    var url = bootstrap.basePath + '/' + settingsModel + '?access_token=' + delhiUserAccessToken + '&' + filter;
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          // console.log("==============", res.body);
          expect(res.body).not.to.be.null;
          expect(res.body).not.to.be.empty;
          expect(res.body).not.to.be.undefined;
          expect(res.body).to.be.instanceof(Array);
          expect(res.body).to.have.length(1);
          expect(res.body[0].value.maxLength).to.be.equal(8);
          done();
        }
      });
  });

  it('Should throw an error if type of hierarchy key in model definition is not of type string (Create)', function (done) {
    var data = { empName: 'Erin' };
    var url = bootstrap.basePath + '/EmployeeModels';
    api
      .post(url)
      .send(data)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('employeeHierarchy', ',principal,headMaster,teacher,')
      .end(function (err, res) {
        if (err) {
          done('Error: Should throw an error "Type mismatch in Declaration"');
        } else {
          expect(res.body.error).not.to.be.null;
          expect(res.body.error).not.to.be.empty;
          expect(res.body.error).not.to.be.undefined;
          expect(res.body.error.code).to.be.equal('DATA_HIERARCHY_ERROR_001');
          expect(res.body.error.name).to.be.equal('Hierarchy Scope Definition Error');
          expect(res.body.error.type).to.be.equal('Type mismatch in Declaration');
          done();
        }
      });

  });

  it('Should throw an error if type of hierarchy key in model definition is not of type string (find)', function (done) {
    var url = bootstrap.basePath + '/EmployeeModels?filter={ "where": { "empName": "Erin" } }';
    api
      .get(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('employeeHierarchy', ',principal,headMaster,teacher,')
      .end(function (err, res) {
        if (err) {
          done('Error: Should throw an error "Type mismatch in Declaration"');
        } else {
          expect(res.body.error).not.to.be.null;
          expect(res.body.error).not.to.be.empty;
          expect(res.body.error).not.to.be.undefined;
          expect(res.body.error.code).to.be.equal('DATA_HIERARCHY_ERROR_001');
          expect(res.body.error.name).to.be.equal('Hierarchy Scope Definition Error');
          expect(res.body.error.type).to.be.equal('Type mismatch in Declaration');
          done();
        }
      });

  });

  it('Should throw an error if parent not found for given parentId (Create)', function (done) {
    // Passing access_token query param
    var url = bootstrap.basePath + '/StaffModels?access_token=' + testUserAccessToken;
    var data = { name: 'Naruto', parentId: 'konaha' };
    apiV2
      .post(url)
      .send(data)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('staffmodel-Hierarchy', ',principal,headMaster,teacher,')
      .set('studentincharge-Hierarchy', ',root,')
      .end(function (err, res) {
        if (err) {
          done('Error: Should throw an error "Parent Not Found"');
        } else {
          expect(res.body.error).not.to.be.null;
          expect(res.body.error).not.to.be.empty;
          expect(res.body.error).not.to.be.undefined;
          expect(res.body.error.code).to.be.equal('DATA_HIERARCHY_ERROR_003');
          expect(res.body.error.name).to.be.equal('Parent Not Found');
          expect(res.body.error.type).to.be.equal('ParentNotFound');
          done();
        }
      });
  });

  it('Should throw an error if hierarchy data not provided for defined hierarchy (Create)', function (done) {
    var data = { name: 'Hinata' };
    // Passing access_token query param
    var url = bootstrap.basePath + '/StaffModels?access_token=' + testUserAccessToken;
    apiV2
      .post(url)
      .send(data)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('staffmodel-Hierarchy', ',principal,headMaster,teacher,')
      .end(function (err, res) {
        if (err) {
          done('Error: Should throw an error "Insufficient data"');
        } else {
          expect(res.body.error).not.to.be.null;
          expect(res.body.error).not.to.be.empty;
          expect(res.body.error).not.to.be.undefined;
          expect(res.body.error.code).to.be.equal('DATA_HIERARCHY_ERROR_002');
          expect(res.body.error.name).to.be.equal('Hierarchy Personalization error');
          expect(res.body.error.type).to.be.equal('Insufficient data');
          done();
        }
      });
  });

});
// END of Describe
