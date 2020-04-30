/**
 *
 * �2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var bootstrap = require('./bootstrap.js');
var loopback = require('loopback');
var chalk = require('chalk');
var chai = require('chai');
chai.use(require('chai-things'));
var expect = chai.expect;
var app = bootstrap.app;
var api = bootstrap.api;
var basePath = bootstrap.basePath;

// Atul : Below code is commented - kept is as reference to test behavior when by default BaseEntity write operation is protected.
// when this code is uncommented, t-17 would fail.
// app.setACLToBaseEntity({
//   "accessType": "WRITE",
//   "principalType": "ROLE",
//   "principalId": "$unauthenticated",
//   "permission": "DENY"
//   });

app.observe('loaded', function (ctx, next) {
  if (!app.options.baseEntitySources) {
    app.options.baseEntitySources = [process.cwd() + '/test/common/models/base-entity-test.js'];
  }
  app.attachMixinsToModelDefinition('NewMixin');
  app.attachMixinsToBaseEntity('TestMixin');
  app.addSettingsToBaseEntity({ mysettings: true });
  app.addSettingsToModelDefinition({ xsettings: true });
  return next();
});

function deleteAllUsers(done) {
  var userModel = loopback.findModel('User');
  userModel.destroyAll({}, {}, function (err) {
    if (err) {
      return done(err);
    }
    userModel.find({}, {}, function (err2, r2) {
      if (err2) {
        return done(err2);
      }
      if (r2 && r2.length > 0) {
        return done(new Error('Error : users were not deleted'));
      }
    });
    return done(err);
  });
}

var globalCtx = {
  ignoreAutoScope: true,
  ctx: { tenantId: '/default' }
};
var defaultContext = {
  ctx: { tenantId: '/default' }
};


describe(chalk.blue('oeCloud Test Started'), function (done) {
  this.timeout(10000);

  before('wait for boot scripts to complete', function (done) {
    deleteAllUsers(function () {
      return done();
    });
  });

  afterEach('destroy context', function (done) {
    done();
  });

  it('t1-1 create user admin/admin with /default tenant', function (done) {
    // app.removeForceId('User');
    // app.removeForceId('Role');
    // app.removeForceId('RoleMapping');
    var userModel = loopback.findModel('User');
    // userModel.settings.forceId = false;
    // var validations = userModel.validations;
    // if (validations.id && validations.id[0].validation === 'absence' && validations.id[0].if === 'isNewRecord' ) {
    //  validations.id.shift();
    // }
    var url = basePath + '/users';
    api.set('Accept', 'application/json')
      .post(url)
      .send([{ id: 'admin', username: 'admin', password: 'admin', email: 'admin@admin.com' },
        { id: 'evuser', username: 'evuser', password: 'evuser', email: 'evuser@evuser.com' },
        { id: 'infyuser', username: 'infyuser', password: 'infyuser', email: 'infyuser@infyuser.com' },
        { id: 'bpouser', username: 'bpouser', password: 'bpouser', email: 'bpouser@bpouser.com' },
        { id: 'iciciuser', username: 'iciciuser', password: 'iciciuser', email: 'iciciuser@iciciuser.com' },
        { id: 'citiuser', username: 'citiuser', password: 'citiuser', email: 'citiuser@citiuser.com' }
      ])
      .end(function (err, response) {
        var result = response.body;
        expect(result[0].id).to.be.defined;
        expect(result[1].id).to.be.defined;
        expect(result[2].id).to.be.defined;
        expect(result[3].id).to.be.defined;
        expect(result[4].id).to.be.defined;
        expect(result[5].id).to.be.defined;
        done(err);
      });
  });

  it('t1-2 create roles', function (done) {
    var roleModel = loopback.findModel('Role');
    // roleModel.settings.forceId = false;
    // var validations = roleModel.validations;
    // if (validations.id && validations.id[0].validation === 'absence' && validations.id[0].if === 'isNewRecord' ) {
    //  validations.id.shift();
    // }
    roleModel.create([
      { id: 'admin', name: 'admin' },
      { id: 'businessUser', name: 'businessUser' },
      { id: 'guest', name: 'guest' },
      { id: 'poweruser', name: 'poweruser' }
    ], function (err, result) {
      return done(err);
    });
  });

  it('t1-3 create user role mapping', function (done) {
    var roleMapping = loopback.findModel('RoleMapping');
    // var validations = roleMapping.validations;
    // if (validations.id && validations.id[0].validation === 'absence' && validations.id[0].if === 'isNewRecord' ) {
    //  validations.id.shift();
    // }
    // roleMapping.settings.forceId = false;
    roleMapping.create([
      { id: 'adminuser', principalType: roleMapping.USER, principalId: 'admin', roleId: 'admin' },
      { id: 'businessUser', principalType: roleMapping.USER, principalId: 'infyuser', roleId: 'businessUser' },
      { id: 'poweruser', principalType: roleMapping.USER, principalId: 'infyuser', roleId: 'poweruser' },
      { id: 'guestuser', principalType: roleMapping.USER, principalId: 'evuser', roleId: 'guest' }
    ], function (err, result) {
      return done(err);
    });
  });

  var adminToken;
  it('t2 Login with admin credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
      .post(url)
      .send({ username: 'admin', password: 'admin' })
      .end(function (err, response) {
        var result = response.body;
        adminToken = result.id;
        expect(adminToken).to.be.defined;
        done();
      });
  });


  var infyToken;
  it('t3 Login with infy credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
      .post(url)
      .send({ username: 'infyuser', password: 'infyuser' })
      .end(function (err, response) {
        var result = response.body;
        infyToken = result.id;
        expect(infyToken).to.be.defined;
        done();
      });
  });

  var evToken;
  it('t4 Login with ev credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
      .post(url)
      .send({ username: 'evuser', password: 'evuser' })
      .end(function (err, response) {
        var result = response.body;
        evToken = result.id;
        expect(evToken).to.be.defined;
        done();
      });
  });


  var bpoToken;
  it('t5 Login with bpo credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
      .post(url)
      .send({ username: 'bpouser', password: 'bpouser' })
      .end(function (err, response) {
        var result = response.body;
        bpoToken = result.id;
        expect(bpoToken).to.be.defined;
        done();
      });
  });


  var icicitoken;
  it('t5 Login with bpo credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
      .post(url)
      .send({ username: 'iciciuser', password: 'iciciuser' })
      .end(function (err, response) {
        var result = response.body;
        icicitoken = result.id;
        expect(bpoToken).to.be.defined;
        done();
      });
  });


  var cititoken;
  it('t5 Login with bpo credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
      .post(url)
      .send({ username: 'citiuser', password: 'citiuser' })
      .end(function (err, response) {
        var result = response.body;
        cititoken = result.id;
        expect(bpoToken).to.be.defined;
        done();
      });
  });

  it('t6 Create Model dynamically', function (done) {
    var m = {
      name: 'NewCustomer',
      base: 'BaseEntity',
      properties: {
        name: {
          type: 'string'
        },
        age: {
          type: 'number'
        },
        officeEmail: {
          type: 'email'
        }
      }
    };

    var url = basePath + '/ModelDefinitions?access_token=' + adminToken;
    api.set('Accept', 'application/json')
      .post(url)
      .send(m)
      .end(function (err, response) {
        console.log(err);
        var result = response.body;

        expect(result.name).to.be.equal('NewCustomer');
        done();
      });
  });

  function newCustomerListener(ctx, next) {
    console.log('Before save called');
    ctx.instance.name = ctx.instance.name + 'XXXXX';
    return next();
  }

  it('t7 hooking observer', function (done) {
    var modelDefinition = loopback.findModel('ModelDefinition');
    modelDefinition.find({
      where: { name: 'NewCustomer' }
    }, {}, function (err, results) {
      var item = results[0];
      expect(item.name).to.be.equal('NewCustomer');
      var newCustomerModel = loopback.findModel('NewCustomer');
      newCustomerModel.evObserve('before save', newCustomerListener);

      newCustomerModel.create({ name: 'x' }, {}, function (err, results) {
        if (err) {
          return done(err);
        }
        expect(results.name).to.be.equal('xXXXXX');
        return done();
      });
    });
  });

  it('t8 removing observer', function (done) {
    var newCustomerModel = loopback.findModel('NewCustomer');
    newCustomerModel.evRemoveObserver('before save', newCustomerListener);

    newCustomerModel.create({ name: 'y' }, {}, function (err, results) {
      if (err) {
        return done(err);
      }
      expect(results.name).to.be.equal('y');
      return done();
    });
  });

  const utils = require('../lib/common/util.js');
  it('t9 utility function testing', function (done) {
    var newCustomerModel = loopback.findModel('NewCustomer');
    var x = utils.isInstanceQuery(newCustomerModel, { where: { name: 'x' } });
    if (x) {
      return done(new Error('Expcted instnace query flag to be false'));
    }
    x = utils.isInstanceQuery(newCustomerModel, { where: { and: [{ name: 'x' }, { id: 1 }] } });
    if (!x) {
      return done(new Error('Expcted instnace query flag to be true'));
    }
    x = utils.isInstanceQuery(newCustomerModel, { where: { and: [{ name: 'x' }, { age: 1 }, { and: [{ id: 1 }, { age: 10 }] }] } });
    if (!x) {
      return done(new Error('Expcted instnace query flag to be true'));
    }
    x = utils.isInstanceQuery('NewCustomer', { where: { and: [{ name: 'x' }, { age: 1 }, { and: [{ id: 1 }, { age: 10 }] }] } });
    if (!x) {
      return done(new Error('Expcted instnace query flag to be true'));
    }
    x = utils.isInstanceQuery(newCustomerModel, { where: { and: [{ name: 'x' }, { age: 1 }, { or: [{ id: 1 }, { age: 10 }] }] } });
    if (x) {
      return done(new Error('Expcted instnace query flag to be flase'));
    }

    var id = utils.getIdValue(newCustomerModel, { id: 10, name: 'A' });

    var f = utils.checkDependency(app, ['./']);
    f = utils.checkDependency(app, './');

    var o1 = { x: 'x', a1: [12, 3, 4] };
    var o2 = { y: 'y', a2: [1122, 33, 44], a1: [1122, 33, 44] };

    var o3 = utils.mergeObjects(o1, o2);
    expect(o3.x).to.be.equal('x');
    expect(o3.y).to.be.equal('y');
    var y;
    utils.mergeObjects(y, o1);
    expect(utils.isBaseEntity(newCustomerModel)).to.be.equal(true);

    newCustomerModel.find({ where: { and: [{ name: 'x' }, { and: [{ id: 1 }, { age: 10 }] }, { age: { inq: [10, 20] } }] } }, {}, function (err, r) {
      if (err) {
        return done(err);
      }
      newCustomerModel.find(function (err, d) {
        return done(err);
      });
    });
  });

  it('t10-1 testing wrapper functions', function (done) {
    var newCustomerModel = loopback.findModel('NewCustomer');
    newCustomerModel.findById(1, {
      where: { name: 'X' }
    }, function (err, r) {
      return done(err);
    });
  });


  it('t10-2 testing wrapper functions', function (done) {
    var newCustomerModel = loopback.findModel('NewCustomer');
    newCustomerModel.findById(1, function (err, r) {
      return done(err);
    });
  });

  it('t10-3 testing wrapper functions - findOne', function (done) {
    var newCustomerModel = loopback.findModel('NewCustomer');
    newCustomerModel.findOne(function (err, r) {
      return done(err);
    });
  });


  var parentModelName = 'MyTestModel';
  var enumName = 'MyTestEnum';


  it('t11-1 enum test', function (done) {
    var enumName = 'MyTestEnum';
    var enumConfig = {
      'name': enumName,
      'base': 'EnumBase',
      'strict': true,
      'properties': {},
      'validations': [],
      'relations': {},
      'acls': [],
      'methods': {},
      'enumList': [
        {
          code: 'M',
          description: 'Monthly'
        },
        {
          code: 'S',
          description: 'Semi'
        },
        {
          code: 'A',
          description: 'Annual'
        },
        {
          code: 'Qu',
          description: 'Quarterly'
        }
      ]
    };

    var parentModelConfig = {
      'name': parentModelName,
      'base': 'BaseEntity',
      'strict': true,
      'properties': {
        'code': {
          'type': 'string',
          'enumtype': 'MyTestEnum',
          'required': true
        }
      },
      'validations': [],
      'relations': {},
      'acls': [],
      'methods': {}
    };
    var modelDefinition = loopback.findModel('ModelDefinition');
    loopback.createModel(enumConfig);
    modelDefinition.create(parentModelConfig, globalCtx, function (err, model) {
      done(err);
    });
  });

  it('t11-2 enum test - should be valid if code is exact match', function (done) {
    var myenum = loopback.findModel(enumName);
    expect(myenum.isValidEnum('S')).to.be.equal(true);
    done();
  });
  it('t11-3 enum test - should be valid if code is different case', function (done) {
    var myenum = loopback.findModel(enumName);
    expect(myenum.isValidEnum('s')).to.be.equal(true);
    done();
  });
  it('t11-4 enum test - should be invalid if code is not valid', function (done) {
    var myenum = loopback.findModel(enumName);
    expect(myenum.isValidEnum('Y')).to.be.equal(false);
    done();
  });
  it('t11-5 enum test - should be invalid if code is partial match', function (done) {
    var myenum = loopback.findModel(enumName);
    expect(myenum.isValidEnum('Q')).to.be.equal(false);
    done();
  });
  it('t11-6 enum test - should return correct description for given code', function (done) {
    var myenum = loopback.findModel(enumName);
    expect(myenum.toDescription('S')).to.be.equal('Semi');
    done();
  });
  it('t11-7 enum test - should return correct description for code in different case', function (done) {
    var myenum = loopback.findModel(enumName);
    expect(myenum.toDescription('qu')).to.be.equal('Quarterly');
    done();
  });
  it('t11-8 enum test - should return undefined for incorrect code', function (done) {
    var myenum = loopback.findModel(enumName);
    expect(myenum.toDescription('y')).to.be.undefined;
    done();
  });
  // it('t11-9 enum test - should should return invalid model for invalid enum', function (done) {
  //  var mymodel = loopback.findModel(parentModelName, globalCtx);
  //  var mymodeldata = {
  //    code: 'KKK'
  //  };
  //  var context = {
  //    options: defaultContext
  //  };
  //  var mymodelobj = new mymodel(mymodeldata);
  //  mymodelobj.isValid(function (ret) {
  //    expect(ret).to.be.equal(false);
  //    done();
  //  }, context);
  // });
  it('t11-9 enum test - should should return valid model for valid enum', function (done) {
    var mymodel = loopback.findModel(parentModelName, globalCtx);
    var mymodeldata = {
      code: 'Qu'
    };
    var context = {
      options: globalCtx
    };
    var mymodelobj = new mymodel(mymodeldata);
    mymodelobj.isValid(function (ret) {
      expect(ret).to.be.equal(true);
      done();
    }, context);
  });


  var currentDB = process.env.NODE_ENV || '';
  var datasourceFile;

  if (!currentDB) {
    datasourceFile = './datasources.json';
  } else {
    datasourceFile = './datasources.' + currentDB + '.js';
  }


  var db2 = require(datasourceFile);
  var newds = Object.assign({}, db2.db);

  newds.name = 'oe-cloud-test-newdb';
  newds.id = 'oe-cloud-test-newdb';

  if (currentDB && (currentDB.toLowerCase().indexOf('mongo') >= 0 || currentDB.toLowerCase().indexOf('postgre') >= 0)) {
    var dbname = process.env.DB_NAME || 'oe-cloud-test';
    newds.database = dbname + '-newdb';
    if (db2.db.url) {
      var y = db2.db.url.split('/');
      var len = y.length;
      var last = y[len - 1];
      last = last + '-newdb';
      y[len - 1] = last;
      newds.url = y.join('/');
      // newds.url = db2.db.url.replace('oe-cloud-test', 'oe-cloud-test-newdb');
    }
  } else if (currentDB && currentDB.toLowerCase().indexOf('oracle') >= 0) {
    newds.user = newds.user + '-newdb';
  } else {
    newds.url = db2.db.url.replace('oe-cloud-test', 'oe-cloud-test-newdb');
  }

  console.log(JSON.stringify(newds));

  var datasources = [newds];

  it('t12 - creating datasource', function (done) {
    var ds = datasources[0];
    var DataSourceDefinition = loopback.findModel('DataSourceDefinition');
    DataSourceDefinition.findById(ds.id, defaultContext, function (err, res) {
      if (err) {
        log.error(defaultContext, 'error in datasource find', err);
        return done(err);
      }
      if (!res) {
        DataSourceDefinition.create(ds, defaultContext, function (err, res) {
          return done(err);
        });
      } else {
        return done();
      }
    });
  });

  it('t13 - changing datasource of model', function (done) {
    var ds = app.datasources['oe-cloud-test-newdb'];
    var newCustomerModel = loopback.findModel('NewCustomer');
    ds.attach(newCustomerModel);
    newCustomerModel.create({ name: 'CustomerInNewDB' }, defaultContext, function (err, res) {
      return done(err);
    });
  });

  it('t14 - testing group by', function (done) {
    var customerModel = loopback.findModel('Customer');
    customerModel.create([{ name: 'A', age: 30 }, { name: 'B', age: 30 }], {}, function (err, r) {
      if (err) return done(err);
      customerModel.find({ group: { groupBy: ['age'] } }, {}, function (err2, r2) {
        if (err2) return done(err2);
        console.log(r2);
        return done();
      });
    });
  });
  it('t15 - Calling aboutMe api', function (done) {
    var url = basePath + '/users/aboutMe?access_token=' + infyToken;
    api.set('Accept', 'application/json')
      .get(url)
      .end(function (err, response) {
        var result = response.body;
        expect(result.username).to.be.equal('infyuser');
        expect(result.email).to.be.equal('infyuser@infyuser.com');
        done(err);
      });
  });
  var tmpCustomerId;
  it('t16-1 - Testing HasOne relationship overriden functions', function (done) {
    var customerModel = loopback.findModel('Customer');
    customerModel.find({}, function (err, result) {
      var record = result[0];
      tmpCustomerId = record.id;
      var url = basePath + '/customers/' + tmpCustomerId + '/spouseRel?access_token=' + infyToken;
      api.set('Accept', 'application/json')
        .post(url)
        .send({ name: 'Spouse1', id: '1', customerId: tmpCustomerId })
        .end(function (err, response) {
          var result = response.body;
          done(err);
        });
    });
  });
  it('t16-2 - Testing HasOne relationship overriden functions(update)', function (done) {
    var url = basePath + '/customers/' + tmpCustomerId + '/spouseRel?access_token=' + infyToken;
    api.set('Accept', 'application/json')
      .put(url)
      .send({ name: 'Spouse1', id: '1', customerId: tmpCustomerId })
      .end(function (err, response) {
        var result = response.body;
        done(err);
      });
  });

  it('t16-3 - Testing HasOne relationship overriden functions(destroy)', function (done) {
    var url = basePath + '/customers/' + tmpCustomerId + '/spouseRel?access_token=' + infyToken;
    api.set('Accept', 'application/json')
      .delete(url)
      .end(function (err, response) {
        console.log(response.error);
        done(err);
      });
  });

  it('t17 - Able to create record in customer without passing access token', function (done) {
    var url = basePath + '/customers';
    api.set('Accept', 'application/json')
      .post(url)
      .send({ name: 'customer created without access token', age: 10 })
      .end(function (err, response) {
        console.log(response.error);
        done(err);
      });
  });
  it('t17 - Should not Able to create record in customer without passing valid access token', function (done) {
    var acl = { accessType: 'WRITE', permission: 'DENY', principalId: '$unauthenticated', principalType: 'ROLE' };
    var baseEntity = loopback.findModel('Customer');
    baseEntity.settings.acls = [];
    baseEntity.settings.acls.push(acl);
    var url = basePath + '/customers';
    api.set('Accept', 'application/json')
      .post(url)
      .send({ name: 'Another customer created without access token', age: 10 })
      .end(function (err, response) {
        if (response.status != 401) {
          return done(new Error('unauthorized access should not be allowed'));
        }
        done();
      });
  });
});
