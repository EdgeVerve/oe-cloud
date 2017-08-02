/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/* jshint -W024 */
/* jshint expr:true */
// to avoid jshint errors for expect

var bootstrap = require('./bootstrap');
var chalk = require('chalk');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var baseUrl = bootstrap.basePath;
var mongoHost = process.env.MONGO_HOST || 'localhost';
var dbName = process.env.DB_NAME || 'db';
// function GenerateModelName(model) {
//    return model + Math.floor(Math.random() * (999));
// }

describe(chalk.blue('multi-tenancy-test'), function () {
  var accessTokens = {};

  var productModelName = 'MyProducts';

  var tenants = [{
    tenantId: 'tenant1',
    tenantName: 'tenant1'
  }, {
    tenantId: 'tenant2',
    tenantName: 'tenant2'
  }];

  var datasources = [{
    'host': mongoHost,
    'port': 27017,
    'url': 'mongodb://' + mongoHost + ':27017/' + dbName + '1',
    'database': 'db1',
    'password': 'admin',
    'name': 'db1',
    'connector': 'mongodb',
    'user': 'admin',
    'connectionTimeout': 50000
  }, {
    'host': mongoHost,
    'port': 27017,
    'url': 'mongodb://' + mongoHost + ':27017/' + dbName + '2',
    'database': 'db2',
    'password': 'admin',
    'name': 'db2',
    'connector': 'mongodb',
    'user': 'admin',
    'connectionTimeout': 50000
  }];

  var user1 = {
    'username': 'user1',
    'password': 'password++',
    'email': 'user1@gmail.com'
  };

  var user2 = {
    'username': 'user2',
    'password': 'password++',
    'email': 'user2@gmail.com'
  };

  var mappings1 = [{
    modelName: productModelName,
    dataSourceName: datasources[0].name
  }, {
    modelName: 'BaseUser',
    dataSourceName: datasources[0].name
  }];

  var mappings2 = [{
    modelName: productModelName,
    dataSourceName: datasources[1].name
  }, {
    modelName: 'BaseUser',
    dataSourceName: datasources[1].name
  }];

  function cleandb(done) {
    bootstrap.models.Tenant.destroyAll({}, bootstrap.defaultContext, function (err, res) {
      bootstrap.models.DataSourceDefinition.destroyAll({}, bootstrap.defaultContext, function (err, res) {
        bootstrap.models.ModelDefinition.destroyAll({}, bootstrap.defaultContext, function (err, res) {
          bootstrap.models.DataSourceMapping.destroyAll({}, bootstrap.defaultContext, function (err, res) {
            done();
          });
        });
      });
    });
  }

  before('setup', function (done) {
    cleandb(done);
  });

  //    after('cleanup', function(done) {
  //        cleandb(done);
  //    });

  it('login as admin', function (done) {
    var postData = {
      'username': 'admin',
      'password': 'admin'
    };
    var postUrl = baseUrl + '/BaseUsers/login';
    var api = defaults(supertest(bootstrap.app));
    api.set('Accept', 'application/json')
      .post(postUrl)
      .send(postData)
      .expect(200).end(function (err, response) {
        accessTokens.admin = response.body.id;
        done();
      });
  });

  it('Create Tenants', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var postUrl = baseUrl + '/Tenants?access_token=' + accessTokens.admin;
    api.set('Accept', 'application/json')
      .post(postUrl)
      .send(tenants)
      .expect(200)
      .end(function (err, response) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });

  it('Create Common Product Model for Both Tenants', function (done) {
    var modelDefinitionData = {
      'name': productModelName,
      'plural': productModelName,
      'base': 'BaseEntity',
      'strict': false,
      'idInjection': true,
      'validateUpsert': true,
      'properties': {
        'name': {
          'type': 'string',
          'unique': true
        }
      },
      'validations': [],
      'relations': {},
      'acls': [],
      'methods': {}
    };

    var api = defaults(supertest(bootstrap.app));

    var postUrl = baseUrl + '/ModelDefinitions?access_token=' + accessTokens.admin;

    api.set('Accept', 'application/json')
      .post(postUrl)
      .send(modelDefinitionData)
      .end(function (err, response) {
        if (err) {
          done(err);
        } else {
          if (response.statusCode !== 200) {
            console.log(response.body);
          }
          expect(response.statusCode).to.be.equal(200);
          done();
        }
      });
  });

  it('Create DataSources', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var postUrl = baseUrl + '/DataSourceDefinitions?access_token=' + accessTokens.admin;
    api.set('Accept', 'application/json')
      .post(postUrl)
      .send(datasources)
      .end(function (err, response) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });

  it('switch tenant 1', function (done) {
    var data = {
      tenantId: tenants[0].tenantId
    };
    var api = defaults(supertest(bootstrap.app));
    var postUrl = baseUrl + '/BaseUsers/switch-tenant?access_token=' + accessTokens.admin;
    api.set('Accept', 'application/json')
      .post(postUrl)
      .send(data)
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.undefined;
          expect(result.body.tenantId).to.be.equal(tenants[0].tenantId);
          done();
        }
      });
  });

  it('Create DataSource Mappings for tenant1', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var postUrl = baseUrl + '/DataSourceMappings?access_token=' + accessTokens.admin;
    api.set('Accept', 'application/json')
      .post(postUrl)
      .send(mappings1)
      .end(function (err, response) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });

  it('Create User1 in tenant1', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var postUrl = baseUrl + '/BaseUsers?access_token=' + accessTokens.admin;
    api.set('Accept', 'application/json')
      .post(postUrl)
      .send(user1)
      .expect(200).end(function (err, resp) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });

  it('login as user1 in tenant1', function (done) {
    var postData = {
      'username': user1.username,
      'password': user1.password
    };
    var postUrl = baseUrl + '/BaseUsers/login';
    var api = defaults(supertest(bootstrap.app));
    api.set('Accept', 'application/json')
      .post(postUrl)
      .set('tenant_id', tenants[0].tenantId)
      .send(postData)
      .expect(200).end(function (err, response) {
        expect(response.body).not.to.be.undefined;
        expect(response.body.id).not.to.be.undefined;
        accessTokens.user1 = response.body.id;
        done();
      });
  });

  xit('Post Data to Product in tenant1 ', function (done) {
    var postData = {
      'name': 'data1'
    };

    var api = defaults(supertest(bootstrap.app));

    var postUrl = baseUrl + '/' + productModelName + '?access_token=' + accessTokens.user1;

    api.set('Accept', 'application/json')
      .post(postUrl)
      .send(postData)
      .end(function (err, response) {
        if (err) {
          done(err);
        } else {
          if (response.statusCode !== 200) {
            console.log(response.body);
          }
          expect(response.statusCode).to.be.equal(200);
          var callContext = {
            ctx: {}
          };
          callContext.ctx.tenantId = tenants[0].tenantId;
          var model = bootstrap.models[productModelName];
          model.find(function (err, list) {
            expect(list[0]._autoScope.tenantId).to.be.equal(tenants[0].tenantId);
            done();
          });
        }
      });
  });

  it('switch tenant to tenant2', function (done) {
    var data = {
      tenantId: tenants[1].tenantId
    };
    var api = defaults(supertest(bootstrap.app));
    var postUrl = baseUrl + '/BaseUsers/switch-tenant?access_token=' + accessTokens.admin;
    api.set('Accept', 'application/json')
      .post(postUrl)
      .send(data)
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).not.to.be.undefined;
          expect(result.body.tenantId).to.be.equal(tenants[1].tenantId);
          done();
        }
      });
  });

  it('Create DataSource Mappings for tenant2', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var postUrl = baseUrl + '/DataSourceMappings?access_token=' + accessTokens.admin;
    api.set('Accept', 'application/json')
      .post(postUrl)
      .send(mappings2)
      .end(function (err, response) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });

  it('Create User2 in tenant2', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var postUrl = baseUrl + '/BaseUsers?access_token=' + accessTokens.admin;
    api.set('Accept', 'application/json')
      .post(postUrl)
      .send(user2)
      .expect(200)
      .end(function (err, resp) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });

  it('login as user2 in tenant2', function (done) {
    var postData = {
      'username': user2.username,
      'password': user2.password
    };
    var postUrl = baseUrl + '/BaseUsers/login';
    var api = defaults(supertest(bootstrap.app));
    api.set('Accept', 'application/json')
      .post(postUrl)
      .set('tenant_id', tenants[1].tenantId)
      .send(postData)
      .expect(200).end(function (err, response) {
        expect(response.body).not.to.be.undefined;
        expect(response.body.id).not.to.be.undefined;
        accessTokens.user2 = response.body.id;
        done();
      });
  });

  it('Create Variant Model', function (done) {
    var variantModel = productModelName + 'variant';
    var modelDefinitionData = {
      'name': variantModel,
      'base': productModelName,
      'variantOf': productModelName,
      'strict': false,
      'idInjection': true,
      'validateUpsert': true,
      'properties': {
        'Tenant2Field': {
          'type': 'string',
          'default': 'default value'
        }
      },
      'validations': [],
      'relations': {},
      'acls': [],
      'methods': {}
    };

    var api = defaults(supertest(bootstrap.app));

    var postUrl = baseUrl + '/ModelDefinitions?access_token=' + accessTokens.user2;

    api.set('Accept', 'application/json')
      .post(postUrl)
      .send(modelDefinitionData)
      .end(function (err, response) {
        if (err) {
          done(err);
        } else {
          if (response.statusCode !== 200) {
            console.log(response.body);
          }
          expect(response.statusCode).to.be.equal(200);
          done();
        }
      });
  });

  xit('Post Data to Product in tenant2', function (done) {
    var postData = {
      'name': 'data2'
    };
    var api = defaults(supertest(bootstrap.app));

    var postUrl = baseUrl + '/' + productModelName + '?access_token=' + accessTokens.user2;

    api.set('Accept', 'application/json')
      .post(postUrl)
      .send(postData)
      .end(function (err, response) {
        if (err) {
          done(err);
        } else {
          if (response.statusCode !== 200) {
            console.log(response.body);
          }
          expect(response.statusCode).to.be.equal(200);
          var callContext = {
            ctx: {}
          };
          callContext.ctx.tenantId = tenants[1].tenantId;
          var model = bootstrap.models[productModelName];
          model.find(function (err, list) {
            expect(list[0]._autoScope.tenantId).to.be.equal(tenants[1].tenantId);
            expect(list[0].Tenant2Field).to.be.equal('default value');
            done();
          });
        }
      });
  });
});
