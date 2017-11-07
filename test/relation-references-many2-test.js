/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

var bootstrap = require('./bootstrap');
var chalk = require('chalk');
var async = require('async');
var log = require('oe-logger')('switch-data-source-test');
var chai = require('chai');
var expect = chai.expect;
var loopback = require('loopback');
chai.use(require('chai-things'));

describe(chalk.blue('relation-references-many-recursive-relation'), function () {

  var modelName = 'RefMany2';
  var ids;

  var testModel = {
    name: modelName,
    base: 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
      }
    },
    relations: {
      'parent': {
        'type': 'referencesMany',
        'model': modelName,
        'foreignKey': 'parentIds'
      },
      'children': {
        'type': 'hasMany',
        'model': modelName,
        'foreignKey': 'parentIds'
      }
    }
  };

  var data = [{
    'name': 'Name1',
    'description': 'OK'
  },{
    'name': 'Name2',
    'description': 'OK'
  }];

  var ModelDefinition = bootstrap.models.ModelDefinition;

  var iciciUser = {
    'username': 'iciciUser',
    'password': 'password++',
    'email': 'iciciuser@gmail.com',
    'tenantId': 'icici'
  };

  before('create model', function (done) {
    async.series([
      function createModel(cb) {
        ModelDefinition.create(testModel, bootstrap.defaultContext, function (err, res) {
          if (err) {
            if (err.statusCode === 422) {
              cb();
            } else {
              cb(err);
            }
          } else {
            cb();
          }
        });
      },
      function (cb) {
        // this line is just to test context lost problem
        bootstrap.createTestUser(iciciUser, 'admin', cb);
      },
      function alldone(err) {
        done();
      }
    ]);
  });

  it('create and find data ', function (done) {
    var model = loopback.getModel(modelName, bootstrap.defaultContext);
    model.destroyAll({}, bootstrap.defaultContext, function (err, res) {
      model.create(data, bootstrap.defaultContext, function (err, res) {
        ids = res.map(x=>JSON.parse(JSON.stringify(x.id)));
        done();
      });
    });
  });

  it('embedsMany - foreign key incorrect values ', function (done) {
    var model = loopback.getModel(modelName, bootstrap.defaultContext);
    var data = {dependentName: 'wrong', parentIds: ['blah1', 'blah2']};
    model.create(data, bootstrap.defaultContext, function (err, res) {
      expect(err.statusCode).to.be.eq(422);
      done();
    });
  });

  var instance;
  it('embedsMany - foreign key correct array ', function (done) {
    var model = loopback.getModel(modelName, bootstrap.defaultContext);
    var data = {dependentName: 'ok', parentIds: ids};
    model.create(data, bootstrap.defaultContext, function (err, res) {
      expect(err).to.be.null;
      expect(res).not.to.be.null;
      instance = res;
      done();
    });
  });

  var parentInstance;
  it('embedsMany - javascript api test ', function (done) {
    instance.parent(null, bootstrap.defaultContext, function(err, res) {
      expect(err).to.be.null;
      expect(res.length).to.be.eq(2);
      parentInstance = res[0];
      done();
    })
  });

  it('embedsMany - javascript reverse api test ', function (done) {
    parentInstance.children(null, bootstrap.defaultContext, function(err, res) {
      expect(err).to.be.null;
      expect(res.length).to.be.eq(1);
      done();
    })
  });

  after('after clean up', function (done) {
    var model = loopback.getModel(modelName, bootstrap.defaultContext);
    model.destroyAll({}, bootstrap.defaultContext, function (err, info) {
      if (err) {
        done(err);
      } else {
        log.debug(bootstrap.defaultContext, 'number of record deleted -> ', info.count);
        done();
      }
    });
  });

});
