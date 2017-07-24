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
var log = require('oe-logger')('switch-data-source-test');
var chai = require('chai');
var expect = chai.expect;
var loopback = require('loopback');
chai.use(require('chai-things'));

describe(chalk.blue('relation-has-one'), function () {

  var parentModelName = 'HasOneParent';
  var childModelName = 'HasOneChild';

  var testChildModel = {
    name: childModelName,
    base: 'BaseEntity',
    properties: {
      'childName': {
        'type': 'string',
      }
    },
    relations: {
      'parent': {
        'type': 'belongsTo',
        'model': parentModelName
      }
    }
  };

  var testParentModel = {
    name: parentModelName,
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
      'child': {
        'type': 'hasOne',
        'model': childModelName,
        'foreignKey': 'parentId'
      }
    }
  };

  var data = {
    'name': 'Name1',
    'description': 'OK'
  };

  var ModelDefinition = bootstrap.models.ModelDefinition;

  var iciciUser = {
    'username': 'iciciUser',
    'password': 'password++',
    'email': 'iciciuser@gmail.com',
    'tenantId': 'icici'
  };

  before('create model', function (done) {
    async.series([
      function createChildModel(cb) {
        ModelDefinition.create(testChildModel, bootstrap.defaultContext, function (err, res) {
          if (err) {
            console.log('unable to create model ', err);
            cb(err);
          } else {
            cb();
          }
        });
      },
      function createParentModel(cb) {
        ModelDefinition.create(testParentModel, bootstrap.defaultContext, function (err, res) {
          if (err) {
            console.log('unable to create model ', err);
            cb(err);
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

    var model = loopback.getModel(parentModelName, bootstrap.defaultContext);
    model.destroyAll({}, bootstrap.defaultContext, function (err, res) {
      model.create(data, bootstrap.defaultContext, function (err, res) {
        model.find({
          'where': {
            'name': 'Name1'
          }
        }, bootstrap.defaultContext, function (err, res) {
          log.debug(bootstrap.defaultContext, 'verify data ', err, res);

          res[0].reload(bootstrap.defaultContext, function (err, parent) {
            parent.child.create({
              childName: 'Child1'
            }, bootstrap.defaultContext, function (err, response) {
              expect(response.parentId).to.be.equal(parent.id);
              done();
            });
          });
        });
      });
    });
  });


  after('after clean up', function (done) {
    var model = loopback.getModel(parentModelName, bootstrap.defaultContext);
    model.destroyAll({}, bootstrap.defaultContext, function (err, info) {
      if (err) {
        done(err);
      } else {
        log.debug(bootstrap.defaultContext, 'number of record deleted -> ', info.count);
        ModelDefinition.destroyAll({
          'name': parentModelName
        }, bootstrap.defaultContext, function () {
          done();
        });
      }
    });
  });

});
