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

describe(chalk.blue('relation-references-many'), function () {

  var sourceModelName = 'RefManySource';
  var dependentModelName = 'RefManyDependent';
  var ids;

  var testdependentModel = {
    name: dependentModelName,
    base: 'BaseEntity',
    properties: {
      'dependentName': {
        'type': 'string',
      }
    },
    relations: {
      'source': {
        'type': 'referencesMany',
        'model': sourceModelName,
        'foreignKey': 'sourceIds'
      }
    }
  };

  var testsourceModel = {
    name: sourceModelName,
    base: 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
      },
      'description': {
        'type': 'string',
      }
    },
    dataSourceName: 'db',
    relations: {
      'dependent': {
        'type': 'hasOne',
        'model': dependentModelName,
        'foreignKey': 'sourceIds'
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
      function createdependentModel(cb) {
        ModelDefinition.create(testdependentModel, bootstrap.defaultContext, function (err, res) {
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
      function createsourceModel(cb) {
        ModelDefinition.create(testsourceModel, bootstrap.defaultContext, function (err, res) {
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
    var model = loopback.getModel(sourceModelName, bootstrap.defaultContext);
    model.destroyAll({}, bootstrap.defaultContext, function (err, res) {
      model.create(data, bootstrap.defaultContext, function (err, res) {
        ids = res.map(x=>JSON.parse(JSON.stringify(x.id)));
        done();
      });
    });
  });

  it('embedsMany - empty foreign key ', function (done) {
    var model = loopback.getModel(dependentModelName, bootstrap.defaultContext);
    var data = {dependentName: 'empty'};
    model.create(data, bootstrap.defaultContext, function (err, res) {
      expect(err).to.be.null;
      expect(res).not.to.be.null;
      done();
    });
  });

  it('embedsMany - foreign key all wrong ', function (done) {
    var model = loopback.getModel(dependentModelName, bootstrap.defaultContext);
    var data = {dependentName: 'wrong1', sourceIds: ['something', 'something2']};
    model.create(data, bootstrap.defaultContext, function (err, res) {
      expect(err.statusCode).to.be.eq(422);
      done();
    });
  });

  it('embedsMany - foreign key few wrong ', function (done) {
    var model = loopback.getModel(dependentModelName, bootstrap.defaultContext);
    var data = {dependentName: 'wrong2'};
    data.sourceIds = JSON.parse(JSON.stringify(ids));
    data.sourceIds.push('notok');
    model.create(data, bootstrap.defaultContext, function (err, res) {
      expect(err.statusCode).to.be.eq(422);
      done();
    });
  });

  var instance;
  it('embedsMany - foreign key correct array ', function (done) {
    var model = loopback.getModel(dependentModelName, bootstrap.defaultContext);
    var data = {dependentName: 'ok', sourceIds: ids};
    model.create(data, bootstrap.defaultContext, function (err, res) {
      expect(err).to.be.null;
      expect(res).not.to.be.null;
      instance = res;
      done();
    });
  });

  it('embedsMany - javascript api test ', function (done) {
    instance.source(null, bootstrap.defaultContext, function(err, res) {
      expect(err).to.be.null;
      expect(res.length).to.be.eq(2);
      done();
    })
  });

  after('after clean up', function (done) {
    var model = loopback.getModel(sourceModelName, bootstrap.defaultContext);
    model.destroyAll({}, bootstrap.defaultContext, function (err, info) {
      if (err) {
        done(err);
      } else {
        log.debug(bootstrap.defaultContext, 'number of record deleted -> ', info.count);
        ModelDefinition.destroyAll({
          'name': sourceModelName
        }, bootstrap.defaultContext, function () {
          done();
        });
      }
    });
  });

});
