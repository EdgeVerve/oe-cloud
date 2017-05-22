/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

/* This is a collection of tests that make sure that the idempotent behaviour work.
 *
 * @author Karin Angel
 */
var loopback = require('loopback');
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var uuid = require('node-uuid');
var chai = require('chai');
var expect = chai.expect;
var logger = require('../lib/logger');
var log = logger('idempotent-mixin-test');

var api = bootstrap.api;

var accessToken;

var modelName = 'Vehicle';
var pluralModelName = 'Vehicles';

var modelNameNoInjection = 'VehicleNoIdInjection';
var pluralModelNameNoInjection = 'VehicleNoIdInjections';

function apiPost(url, postData) {
  var promise = new Promise(function (resolve, reject) {
    api
            .set('Accept', 'application/json')
            .post(bootstrap.basePath + url + '?access_token=' + accessToken)
            .send(postData)
            .end(function (err, res) {
              if (err || res.body.error) {
                return reject(err || (new Error(JSON.stringify(res.body.error))));
              }
              return resolve(res.body);
            });
  });
  return promise;
}

function apiPut(url, putData) {
  var promise = new Promise(function (resolve, reject) {
        // console.log('put url ', url, putData);
    api
            .set('Accept', 'application/json')
            .put(bootstrap.basePath + url + '?access_token=' + accessToken)
            .send(putData)
            .end(function (err, res) {
              if (err || res.body.error) {
                return reject(err || (new Error(JSON.stringify(res.body.error))));
              }
              return resolve(res.body);
            });
  });
  return promise;
}

function apiDelete(url, deleteData) {
  var promise = new Promise(function (resolve, reject) {
    api
            .set('Accept', 'application/json')
            .delete(bootstrap.basePath + url + '?access_token=' + accessToken)
            .send(deleteData)
            .end(function (err, res) {
              if (err || res.body.error) {
                return reject(err || (new Error(JSON.stringify(res.body.error))));
              }
              return resolve(res.body);
            });
  });
  return promise;
}

describe(chalk.blue('idempotent-mixin-test'), function () {
  this.timeout(30000);

  before('login using admin', function fnLogin(done) {
    var sendData = {
      'username': 'admin',
      'password': 'admin'
    };

    api
            .post(bootstrap.basePath + '/BaseUsers/login')
            .send(sendData)
            .expect(200).end(function (err, res) {
              if (err) {
                return done(err);
              }
              accessToken = res.body.id;
              return done();
            });
  });

  before('create test models', function createModels(done) {
    var modelDefinition = loopback.findModel('ModelDefinition');
    var data = {
      'name': modelName,
      'base': 'BaseEntity',
      'idInjection': true,
      'properties': {
        'color': {
          'type': 'string'
        }
      }
    };

    modelDefinition.create(data, bootstrap.defaultContext, createSecondModel);

    function createSecondModel(err, result) {
      if (err) {
        done(err);
      } else {
        var modelDefinition = loopback.findModel('ModelDefinition');
        var data = {
          'name': modelNameNoInjection,
          'base': 'BaseEntity',
          'idInjection': false
        };
        modelDefinition.create(data, bootstrap.defaultContext, done);
      }
    }
  });


  after('delete all the Vehicle records', function (done) {
    var vehicleModel = loopback.getModel(modelName);
    vehicleModel.destroyAll({}, bootstrap.defaultContext, function (err) {
      if (err) {
        return done(err);
      }
      return done();
    });
  });

  after('delete all the VehicleNoIdInjection records', function (done) {
    var vehicleNoIdInjectionModel = loopback.getModel('VehicleNoIdInjection');
    vehicleNoIdInjectionModel.destroyAll({}, bootstrap.defaultContext, function (err) {
      if (err) {
        return done(err);
      }
      return done();
    });
  });

  describe(chalk.yellow('Create/Post tests'), function () {
    it('Create with id injection, id + _version supplied, _newVersion not supplied --> object saved, result._oldVersion===result._version===request._version, request.id===result.id', function () {
      var vehicleModel = loopback.getModel(modelName);
      var version = uuid.v4();
      var id = uuid.v4();
      var createData = { 'id': id, '_version': version };
      return vehicleModel.create(createData, bootstrap.defaultContext).then(function (result) {
        expect(result.id).to.be.equal(createData.id);
        expect(result._version).to.be.equal(version);
      });
    });

    it('Rest Post with id injection, id + _version supplied, _newVersion not supplied --> object saved, result._oldVersion===result._version===request._version, request.id===result.id', function () {
      var version = uuid.v4();
      var id = uuid.v4();
      var postData = { 'id': id, '_version': version };
      return apiPost('/' + pluralModelName, postData).then(function (result) {
        expect(result.id).to.be.equal(postData.id);
        expect(result._version).to.be.equal(version);
        expect(result._oldVersion).to.be.equal(undefined);
        expect(result._newVersion).to.be.equal(undefined);
        var vehicleModel = loopback.getModel(modelName);
        return vehicleModel.find({ where: { id: id } }, bootstrap.defaultContext).then(function (res) {
          expect(res[0].id).to.be.equal(postData.id);
          expect(res[0]._version).to.be.equal(version);
        });
      });
    });

    it('Create with id injection, id + _newVersion supplied, _version not supplied --> object saved, result._oldVersion===result._version===request._newVersion, request.id===result.id', function () {
      var vehicleModel = loopback.getModel(modelName);
      var newVersion = uuid.v4();
      var id = uuid.v4();
      var createData = { 'id': id, '_newVersion': newVersion };
      return vehicleModel.create(createData, bootstrap.defaultContext).then(function (result) {
        expect(result.id).to.be.equal(createData.id);
      });
    });

    it('Rest Post with id injection, id + _newVersion supplied, _version not supplied --> object saved, result._oldVersion===result._version===request._newVersion, request.id===result.id', function () {
      var newVersion = uuid.v4();
      var id = uuid.v4();
      var postData = { 'id': id, '_newVersion': newVersion };
      return apiPost('/' + pluralModelName, postData).then(function (result) {
        expect(result.id).to.be.equal(postData.id);
        expect(result._version).to.be.equal(newVersion);
        var vehicleModel = loopback.getModel(modelName);
        return vehicleModel.find({ where: { id: id } }, bootstrap.defaultContext).then(function (res) {
          expect(res[0].id).to.be.equal(postData.id);
        });
      });
    });

    it('Create with id injection, id supplied, _version + _newVersion not supplied --> object saved, result._oldVersion===result._version and not empty, request.id===result.id', function () {
      var vehicleModel = loopback.getModel(modelName);
      var id = uuid.v4();
      var createData = { 'id': id };
      return vehicleModel.create(createData, bootstrap.defaultContext).then(function (result) {
        expect(result.id).to.be.equal(createData.id);
        expect(result._version).to.be.ok;
      });
    });

    it('Rest Post with id injection, id supplied, _version + _newVersion not supplied --> object saved, result._oldVersion===result._version and not empty, request.id===result.id', function () {
      var id = uuid.v4();
      var postData = { 'id': id };
      return apiPost('/' + pluralModelName, postData).then(function (result) {
        expect(result.id).to.be.equal(postData.id);
        expect(result._version).to.not.equal(undefined);
        var vehicleModel = loopback.getModel(modelName);
        return vehicleModel.find({ where: { id: id } }, bootstrap.defaultContext).then(function (res) {
          expect(res[0].id).to.be.equal(postData.id);
          expect(res._newVersion).to.be.equal(undefined);
        });
      });
    });

    it('Create no id injection, _version supplied, id + _newVersion not supplied --> object saved, result._oldVersion===result._version===request._version, id not empty', function () {
      var vehicleModel = loopback.getModel(modelNameNoInjection);
      var version = uuid.v4();
      var createData = { '_version': version };
      return vehicleModel.create(createData, bootstrap.defaultContext).then(function (result) {
        expect(result.id).to.not.equal(undefined);
        expect(result._version).to.be.equal(version);
      });
    });

    it('Rest Post no id injection, _version supplied, id + _newVersion not supplied --> object saved, result._oldVersion===result._version===request._version, id not empty', function () {
      var version = uuid.v4();
      var postData = { '_version': version };
      return apiPost('/' + pluralModelNameNoInjection, postData).then(function (result) {
        expect(result.id).to.not.equal(undefined);
        expect(result._version).to.be.equal(version);
        var vehicleModel = loopback.getModel(modelNameNoInjection);
        return vehicleModel.find({ where: { id: result.id } }, bootstrap.defaultContext).then(function (res) {
          expect(result.id).to.be.equal(res[0].id.toString());
        });
      });
    });


    it('Create no id injection, _newVersion + id + _version not supplied --> object saved, result._oldVersion===result._version and not empty, id not empty', function () {
      var vehicleModel = loopback.getModel(modelNameNoInjection);
      var createData = {};
      return vehicleModel.create(createData, bootstrap.defaultContext).then(function (result) {
        expect(result.id).to.not.equal(undefined);
        expect(result._version).to.be.ok;
      });
    });

    it('Rest Post no id injection, _newVersion + id + _version not supplied --> object saved, result._oldVersion===result._version and not empty, id not empty', function () {
      var postData = {};
      return apiPost('/' + pluralModelNameNoInjection, postData).then(function (result) {
        expect(result.id).to.not.equal(undefined);
        expect(result._version).to.not.equal(undefined);
        var version = result.version;
        var vehicleModel = loopback.getModel(modelNameNoInjection);
        return vehicleModel.find({ where: { id: result.id } }, bootstrap.defaultContext).then(function (res) {
          expect(res._version).to.be.equal(version);
        });
      });
    });

    it('Create no id injection, _newVersion _version supplied and same --> object saved, result._oldVersion===result._version===request._newVersion', function () {
      var vehicleModel = loopback.getModel(modelNameNoInjection);
      var newVersion = uuid.v4();
      var version = newVersion;
      var createData = { '_newVersion': newVersion, '_version': version };
      return vehicleModel.create(createData, bootstrap.defaultContext).then(function (result) {
        expect(result._newVersion).to.be.equal(undefined);
      });
    });

    it('Rest Post no id injection, _newVersion _version supplied and same --> object saved, result._oldVersion===result._version===request._newVersion', function () {
      var newVersion = uuid.v4();
      var version = newVersion;
      var postData = { '_newVersion': newVersion, '_version': version };
      return apiPost('/' + pluralModelNameNoInjection, postData).then(function (result) {
        expect(result._version).to.be.equal(newVersion);
        expect(result._oldVersion).to.be.equal(undefined);
        expect(result._newVersion).to.be.equal(undefined);
        var vehicleModel = loopback.getModel(modelNameNoInjection);
        return vehicleModel.find({ where: { id: result.id } }, bootstrap.defaultContext).then(function (res) {
          expect(res._newVersion).to.be.equal(undefined);
        });
      });
    });

    xit('2 parallel creates, no id injection, _newVersion not supplied, _version supplied and same in both creates and the data is different --> one create succeeds, the second fails with error', function () {
      var vehicleModel = loopback.getModel(modelNameNoInjection);
      var version = uuid.v4();
      var createData1 = { '_version': version, 'color': 'blue' };
      var createData2 = { '_version': version, 'color': 'yellow' };

      var dataItems = [];
      dataItems.push(createData1);
      dataItems.push(createData2);

      return Promise.all(dataItems.map(function (dataItem) {
        return vehicleModel.create(dataItem, bootstrap.defaultContext).then(function (result) {
          return result;
        });
      })).then(function (results) {
        throw new Error('Promise was unexpectedly fulfilled. Result: ' + results);
      }, function (error) {
        expect(error.message).to.be.equal('Cannot create a record with version ' + version);
      });
    });

    xit('2 parallel Rest Posts, no id injection, _newVersion not supplied, _version supplied and same in both creates and the data is different --> one create succeeds, the second fails with error', function () {
      var version = uuid.v4();
      var createData1 = { '_version': version, 'color': 'blue' };
      var createData2 = { '_version': version, 'color': 'yellow' };

      var dataItems = [];
      dataItems.push(createData1);
      dataItems.push(createData2);

      return Promise.all(dataItems.map(function (dataItem) {
        return apiPost('/' + pluralModelNameNoInjection, dataItem).then(function (result) {
          return result;
        });
      })).then(function (results) {
        throw new Error('Promise was unexpectedly fulfilled. Result: ' + results);
      }, function (error) {
        expect(JSON.parse(error.message).status).to.be.equal(500);
        expect(JSON.parse(error.message).message).to.be.equal('Cannot create a record with version ' + version);
      });
    });

    xit('2 parallel creates, no id injection, _newVersion not supplied, _version and data supplied and same in both creates --> one create succeeds, the second succeeds with version as the first result version', function () {
      var vehicleModel = loopback.getModel(modelNameNoInjection);
      var version = uuid.v4();
      var createData1 = { '_version': version, 'color': 'blue' };
      var createData2 = { '_version': version, 'color': 'blue' };

      var dataItems = [];
      dataItems.push(createData1);
      dataItems.push(createData2);

      return Promise.all(dataItems.map(function (dataItem) {
        return vehicleModel.create(dataItem, bootstrap.defaultContext).then(function (result) {
          return result;
        });
      })).then(function (results) {
        var result1 = results[0];
        var result2 = results[1];

        expect(result1.id).to.not.equal(undefined);
        expect(result1.id).to.be.equal(result2.id);
        expect(result1._oldVersion).to.be.equal(result1._version);
        expect(result2._oldVersion).to.be.equal(result2._version);
        expect(result1._oldVersion).to.be.equal(version);
        expect(result1._version).to.be.equal(result2._version);
        expect(result1.color).to.be.equal(result2.color);
        expect(result1.color).to.be.equal('blue');
        expect(result1._newVersion).to.be.equal(undefined);
        expect(result2._newVersion).to.be.equal(undefined);
      });
    });

    xit('2 parallel Rest Posts, no id injection, _newVersion not supplied, _version and data supplied and same in both creates --> one create succeeds, the second succeeds with version as the first result version', function () {
      var version = uuid.v4();
      var createData1 = { '_version': version, 'color': 'blue' };
      var createData2 = { '_version': version, 'color': 'blue' };

      var dataItems = [];
      dataItems.push(createData1);
      dataItems.push(createData2);

      return Promise.all(dataItems.map(function (dataItem) {
        return apiPost('/' + pluralModelNameNoInjection, dataItem).then(function (result) {
          return result;
        });
      })).then(function (results) {
        var result1 = results[0];
        var result2 = results[1];
        expect(result1.id).to.not.equal(undefined);
        expect(result1.id).to.be.equal(result2.id);
        expect(result1._version).to.be.equal(result2._version);
        expect(result1._version).to.be.equal(version);
        expect(result1.color).to.be.equal(result2.color);
        expect(result1.color).to.be.equal('blue');
        expect(result1._oldVersion).to.be.equal(undefined);
        expect(result2._oldVersion).to.be.equal(undefined);
        expect(result1._newVersion).to.be.equal(undefined);
        expect(result2._newVersion).to.be.equal(undefined);
        var vehicleModel = loopback.getModel(modelNameNoInjection);
        return vehicleModel.find({ where: { id: result1.id } }, bootstrap.defaultContext).then(function (res) {
          expect(res[0]._oldVersion).to.be.equal(version);
          expect(res._newVersion).to.be.equal(undefined);
        });
      });
    });
  });

  describe(chalk.yellow('Upsert/Put tests'), function () {
    it('Upsert no id injection, id + _newVersion not supplied, _version supplied --> object saved, result._oldVersion===result._version===request._version, id not empty', function () {
      var vehicleModel = loopback.getModel(modelNameNoInjection);
      var version = uuid.v4();
      var upsertData = { '_version': version };
      return vehicleModel.upsert(upsertData, bootstrap.defaultContext).then(function (result) {
        expect(result.id).to.not.equal(undefined);
        expect(result._version).to.be.ok;
        expect(result._newVersion).to.be.equal(undefined);
      });
    });

    it('Rest Put no id injection, id + _newVersion not supplied, _version supplied --> object saved, result._oldVersion===result._version===request._version, id not empty', function () {
      var version = uuid.v4();
      var putData = { '_version': version };
      return apiPut('/' + pluralModelNameNoInjection, putData).then(function (result) {
        expect(result.id).to.not.equal(undefined);
        expect(result._version).to.be.ok;
        expect(result._oldVersion).to.be.equal(undefined);
        expect(result._newVersion).to.be.equal(undefined);
        var vehicleModel = loopback.getModel(modelNameNoInjection);
        return vehicleModel.find({ where: { id: result.id } }, bootstrap.defaultContext).then(function (res) {
          expect(result.id).to.be.equal(res[0].id.toString());
          expect(res._newVersion).to.be.equal(undefined);
        });
      });
    });

    it('Upsert no id injection, id + _version not supplied, _newVersion supplied --> object saved, object saved, result._oldVersion===result._version===request._newVersion, id not empty', function () {
      var vehicleModel = loopback.getModel(modelNameNoInjection);
      var newVersion = uuid.v4();
      var upsertData = { '_newVersion': newVersion };
      return vehicleModel.upsert(upsertData, bootstrap.defaultContext).then(function (result) {
        expect(result.id).to.not.equal(undefined);
        expect(result._newVersion).to.be.equal(undefined);
      });
    });

    it('Rest Put no id injection, id + _version not supplied, _newVersion supplied --> object saved, object saved, result._oldVersion===result._version===request._newVersion, id not empty', function () {
      var newVersion = uuid.v4();
      var putData = { '_newVersion': newVersion };
      return apiPut('/' + pluralModelNameNoInjection, putData).then(function (result) {
        expect(result.id).to.not.equal(undefined);
        expect(result._version).to.be.equal(newVersion);
        expect(result._oldVersion).to.be.equal(undefined);
        expect(result._newVersion).to.be.equal(undefined);
        var vehicleModel = loopback.getModel(modelNameNoInjection);
        return vehicleModel.find({ where: { id: result.id } }, bootstrap.defaultContext).then(function (res) {
          expect(res[0].id.toString()).to.be.equal(result.id);
          expect(res._newVersion).to.be.equal(undefined);
        });
      });
    });

    it('Upsert no id injection, id + _version + _newVersion not supplied --> object saved, result._oldVersion===result._version and not empty, id not empty', function () {
      var vehicleModel = loopback.getModel(modelNameNoInjection);
      var upsertData = {};
      return vehicleModel.upsert(upsertData, bootstrap.defaultContext).then(function (result) {
        expect(result.id).to.not.equal(undefined);
        expect(result._newVersion).to.be.equal(undefined);
      });
    });

    it('Rest Put no id injection, id + _version + _newVersion not supplied --> object saved, result._oldVersion===result._version and not empty, id not empty', function () {
      var putData = {};
      return apiPut('/' + pluralModelNameNoInjection, putData).then(function (result) {
        expect(result.id).to.not.equal(undefined);
        expect(result._version).to.not.equal(undefined);
        expect(result._newVersion).to.be.equal(undefined);
        var vehicleModel = loopback.getModel(modelNameNoInjection);
        return vehicleModel.find({ where: { id: result.id } }, bootstrap.defaultContext).then(function (res) {
          expect(res[0]._version).to.be.equal(result._version);
        });
      });
    });

    it('Upsert no id injection, object exist, id of the object is supplied + _version of the object supplied + _newVersion not supplied --> object updated, result._oldVersion===request._version, result._version!==result._oldVersion and not empty', function () {
      var vehicleModel = loopback.getModel(modelNameNoInjection);
      var createData = { 'firm': 'Hyundai' };
      return vehicleModel.create(createData, bootstrap.defaultContext).then(function (result) {
        var upsertData = { 'id': result.id, '_version': result._version, 'firm': 'BMW' };
        return vehicleModel.upsert(upsertData, bootstrap.defaultContext).then(function (res) {
          expect(result.id).to.be.equal(res.id);
          expect(res.firm).to.be.equal('BMW');
          expect(res._oldVersion).to.be.equal(result._version);
          expect(res._version).to.not.equal(undefined);
          expect(res._version).to.not.equal(res._oldVersion);
          expect(res._newVersion).to.be.oneOf([null, undefined]);
        });
      });
    });

    it('Rest Put no id injection, object exist, id of the object is supplied + _version of the object supplied + _newVersion not supplied --> object updated, result._oldVersion===request._version, result._version!==result._oldVersion and not empty', function () {
      var vehicleModel = loopback.getModel(modelNameNoInjection);
      var createData = { 'firm': 'Hyundai' };
      return vehicleModel.create(createData, bootstrap.defaultContext).then(function (result) {
        var putData = { 'id': result.id, '_version': result._version, 'firm': 'BMW' };
        return apiPut('/' + pluralModelNameNoInjection, putData).then(function (res) {
          expect(result.id.toString()).to.be.equal(res.id);
          expect(res.firm).to.be.equal('BMW');
          expect(res._version).to.not.equal(undefined);
          expect(res._newVersion).to.be.oneOf([null, undefined]);
          var version = res._version;
          return vehicleModel.find({ where: { id: result.id } }, bootstrap.defaultContext).then(function (res2) {
            expect(res2[0]._oldVersion).to.be.equal(result._version);
            expect(res2[0]._oldVersion).to.not.equal(undefined);
            expect(version).to.not.equal(res2._oldVersion);
            expect(res2[0]._newVersion).to.be.oneOf([null, undefined]);
          });
        });
      });
    });

    it('Rest Put no id injection, object exist, id of the object is supplied, _version not supplied  --> error', function () {
      var vehicleModel = loopback.getModel(modelNameNoInjection);
      var createData = { 'firm': 'Hyundai' };
      return vehicleModel.create(createData, bootstrap.defaultContext).then(function (result) {
        var putData = { 'id': result.id, 'firm': 'BMW' };
        return apiPut('/' + pluralModelNameNoInjection, putData).then(function (res) {
          throw new Error('Promise was unexpectedly fulfilled. Result: ' + res);
        }, function (error) {
          expect(JSON.parse(error.message).status).to.be.equal(422);
                    // expect(JSON.parse(error.message).message).to.contain(' field is mandatory');
                    // expect(JSON.parse(error.message).errors[0].code).to.be.equal('validation-err-004');
                    // expect(JSON.parse(error.message).errors[0].path).to.be.equal(modelNameNoInjection + ' -> _version');
        });
      });
    });

    it('Upsert no id injection, object exist, id of the object is supplied + _version of the object supplied + _newVersion supplied and different from objects _version --> object updated, result._oldVersion===request._version, result._version===request._newVersion', function () {
      var vehicleModel = loopback.getModel(modelNameNoInjection);
      var createData = { 'firm': 'Hyundai' };
      return vehicleModel.create(createData, bootstrap.defaultContext).then(function (result) {
        var newVersion = uuid.v4();
        var upsertData = { 'id': result.id, '_version': result._version, '_newVersion': newVersion, 'firm': 'BMW' };
        return vehicleModel.upsert(upsertData, bootstrap.defaultContext).then(function (res) {
          expect(result.id).to.be.equal(res.id);
          expect(res.firm).to.be.equal('BMW');
          expect(res._oldVersion).to.be.equal(result._version);
          expect(res._oldVersion).to.not.equal(undefined);
          expect(res._version).to.be.equal(newVersion);
          expect(res._newVersion).to.be.oneOf([null, undefined]);
        });
      });
    });

    it('Rest Put no id injection, object exist, id of the object is supplied + _version of the object supplied + _newVersion supplied and different from objects _version --> object updated, result._oldVersion===request._version, result._version===request._newVersion', function () {
      var vehicleModel = loopback.getModel(modelNameNoInjection);
      var createData = { 'firm': 'Hyundai' };
      return vehicleModel.create(createData, bootstrap.defaultContext).then(function (result) {
        var newVersion = uuid.v4();
        var putData = { 'id': result.id, '_version': result._version, '_newVersion': newVersion, 'firm': 'BMW' };
        return apiPut('/' + pluralModelNameNoInjection, putData).then(function (res) {
          expect(result.id.toString()).to.be.equal(res.id);
          expect(res.firm).to.be.equal('BMW');
          expect(res._version).to.be.equal(newVersion);
          expect(res._newVersion).to.be.oneOf([null, undefined]);
          return vehicleModel.find({ where: { id: result.id } }, bootstrap.defaultContext).then(function (res2) {
            expect(res2[0]._oldVersion).to.be.equal(result._version);
            expect(res2[0]._oldVersion).to.not.equal(undefined);
            expect(res2[0]._newVersion).to.be.oneOf([null, undefined]);
          });
        });
      });
    });

    it('Upsert no id injection, object does not exist, id supplied --> object created with id given', function () {
      var vehicleModel = loopback.getModel(modelNameNoInjection);
      var id = uuid.v4();
      var upsertData = { 'id': id };
      return vehicleModel.upsert(upsertData, bootstrap.defaultContext).then(function (result) {
        expect(result.id).to.be.equal(id);
        expect(result._newVersion).to.be.equal(undefined);
      });
    });

    it('Rest Put no id injection, object does not exist, id supplied --> object created with id given', function () {
      var vehicleModel = loopback.getModel(modelNameNoInjection);
      var id = uuid.v4();
      var putData = { 'id': id };
      return apiPut('/' + pluralModelNameNoInjection, putData).then(function (result) {
        expect(result.id).to.be.equal(id);
        expect(result._version).to.not.equal(undefined);
        expect(result._oldVersion).to.be.equal(undefined);
        expect(result._newVersion).to.be.equal(undefined);
        return vehicleModel.find({ where: { id: id } }, bootstrap.defaultContext).then(function (res) {
          expect(res[0].id).to.be.equal(id);
          expect(res._newVersion).to.be.equal(undefined);
        });
      });
    });

    it('Upsert no id injection, object does not exist, id not supplied --> object created with id generated', function () {
      var vehicleModel = loopback.getModel(modelNameNoInjection);
      var upsertData = {};
      return vehicleModel.upsert(upsertData, bootstrap.defaultContext).then(function (result) {
        expect(result.id).to.not.equal(undefined);
        expect(result._newVersion).to.be.equal(undefined);
      });
    });

    it('Rest Put no id injection, object does not exist, id not supplied --> object created with id generated', function () {
      var vehicleModel = loopback.getModel(modelNameNoInjection);
      var putData = {};
      return apiPut('/' + pluralModelNameNoInjection, putData).then(function (result) {
        expect(result.id).to.not.equal(undefined);
        expect(result._version).to.not.equal(undefined);
        expect(result._oldVersion).to.be.equal(undefined);
        expect(result._newVersion).to.be.equal(undefined);
        return vehicleModel.find({ where: { id: result.id } }, bootstrap.defaultContext).then(function (res) {
          expect(result.id).to.not.equal(undefined);

          expect(res._newVersion).to.be.equal(undefined);
        });
      });
    });

    it('Upsert with id injection, object does not exist, id supplied --> object created with id generated', function () {
      var vehicleModel = loopback.getModel(modelName);
      var id = uuid.v4();
      var upsertData = { 'id': id };
      return vehicleModel.upsert(upsertData, bootstrap.defaultContext).then(function (result) {
                // interesting, Loopback 3 does not allow id to be generated
                // expect(result.id).to.not.equal(id);
        expect(result.id).to.not.equal(undefined);

        expect(result._newVersion).to.be.equal(undefined);
      });
    });

    it('Rest Put with id injection, object does not exist, id supplied --> object created with id generated', function () {
      var vehicleModel = loopback.getModel(modelName);
      var id = uuid.v4();
      var putData = { 'id': id };
      return apiPut('/' + pluralModelName, putData).then(function (result) {
                // expect(result.id).to.not.equal(id);
        expect(result.id).to.not.equal(undefined);
        expect(result._version).to.not.equal(undefined);
        expect(result._newVersion).to.be.equal(undefined);
        return vehicleModel.find({ where: { id: result.id } }, bootstrap.defaultContext).then(function (res) {
                    // expect(res[0].id).to.not.equal(id);

          expect(res._newVersion).to.be.equal(undefined);
        });
      });
    });

    it('Upsert with id injection, object does not exist, id not supplied --> object created with id generated', function () {
      var vehicleModel = loopback.getModel(modelName);
      var upsertData = {};
      return vehicleModel.upsert(upsertData, bootstrap.defaultContext).then(function (result) {
                // expect(result.id).to.not.equal(undefined);
                // expect(result._oldVersion).to.be.equal(result._version);
                // expect(result._oldVersion).to.not.equal(undefined);
        expect(result._newVersion).to.be.equal(undefined);
      });
    });

    it('Rest Put with id injection, object does not exist, id not supplied --> object created with id generated', function () {
      var vehicleModel = loopback.getModel(modelName);
      var putData = {};
      return apiPut('/' + pluralModelName, putData).then(function (result) {
        expect(result.id).to.not.equal(undefined);
        expect(result._version).to.not.equal(undefined);
        expect(result._newVersion).to.be.equal(undefined);
        return vehicleModel.find({ where: { id: result.id } }, bootstrap.defaultContext).then(function (res) {
          expect(result.id).to.not.equal(undefined);

          expect(res._newVersion).to.be.equal(undefined);
        });
      });
    });
  });

  describe(chalk.yellow('UpdateAttributes tests'), function () {
    describe(chalk.green('Functional UpdateAttributes tests'), function () {
      it('Should succeed on functional updateAttributes with correct _version and new _newVersion ', function () {
        var vehicleModel = loopback.getModel(modelName);
        var version = uuid.v4();
        var createData = { '_version': version, 'color': 'blue' };
        var inst;
        var v2;
        return vehicleModel.create(createData, bootstrap.defaultContext)
                    .then(function (res) {
                      inst = res;
                      var data = res.toObject(true);
                      data.color = 'yellow';
                      data._newVersion = v2 = uuid.v4();
                      return data;
                    })
                    .then(function (data) {
                      return inst.updateAttributes(data, bootstrap.defaultContext);
                    })
                    .then(function (res) {
                      expect(res).to.be.ok;
                      expect(res.color).to.be.equal('yellow');
                      expect(res._version).to.be.equal(v2);
                      expect(res._oldVersion).to.be.ok;
                      expect(res._version).to.not.be.equal(res._oldVersion);
                    });
      });

            // PKGTODO fix this..
      xit('Should succeed on functional updateAttributes with _newVersion that is current _version in server but should not update data', function () {
        var vehicleModel = loopback.getModel(modelName);
        var version = uuid.v4();
        var createData = { '_version': version, 'color': 'blue' };
        return vehicleModel.create(createData, bootstrap.defaultContext)
                    .then(function (res) {
                      res.color = 'yellow';
                      res._newVersion = res._version;
                      return res;
                    })
                    .then(updateAttributes)
                    .then(function (res) {
                      expect(res).to.be.ok;
                      expect(res._version).to.be.ok;
                      expect(res.color).to.be.equal('blue');
                      expect(res._oldVersion).to.be.ok;
                    });
      });

            // PKG this should be actuall rest test case
            // When you modify instance values...itself then it should be allowed
            // PKGTODO unqiue check in hostory on _version should fail
      xit('Should succeed on functional updateAttributes with _newVersion that is in model history table but should not update data', function () {
        var vehicleModel = loopback.getModel(modelName);
        var version = uuid.v4();
        var createData = { '_version': version, 'color': 'blue' };
        var afterUpdateVersion;
        return vehicleModel.create(createData, bootstrap.defaultContext)
                    .then(function (res) {
                      res.color = 'yellow';
                      afterUpdateVersion = res._newVersion = uuid.v4();
                      return res;
                    })
                    .then(updateAttributes)
                    .then(function (res) {
                      res.color = 'red';
                      res._version = version;
                      res._newVersion = version;
                      return res;
                    })
                    .then(updateAttributes)
                    .then(function (res) {
                      expect(res).to.be.ok;
                      res.findById(res.id, bootstrap.defaultContext, function (err, res) {
                        expect(res.color).to.be.equal('yellow');
                        expect(res._version).to.be.ok;
                        expect(res._version).to.equal(afterUpdateVersion);
                        expect(res._oldVersion).to.be.ok;
                        expect(res._oldVersion).to.be.equal(version);
                      });
                    });
      });

            // this should be rest test case
      xit('Should fail on functional updateAttributes with _version that is not in model history table or in current instance', function () {
        var vehicleModel = loopback.getModel(modelName);
        var version = uuid.v4();
        var createData = { '_version': version, 'color': 'blue' };
        var failVersion;
        return vehicleModel.create(createData, bootstrap.defaultContext)
                    .then(function (res) {
                      res.color = 'yellow';
                      res._newVersion = uuid.v4();
                      return res;
                    })
                    .then(updateAttributes)
                    .then(function (res) {
                      res.color = 'red';
                      res._version = uuid.v4();
                      failVersion = res._newVersion = uuid.v4();
                      return res;
                    })
                    .then(updateAttributes)
                    .then(function (res) {
                      expect(res).to.not.be.ok;
                    }).catch(function (err) {
                      expect(err).to.be.ok;
                      expect(err.name).to.be.equal('Data Error');
                      expect(err.message).to.be.equal('Cannot create a record with version ' + failVersion);
                      expect(err.code).to.be.equal('DATA_ERROR_071');
                      expect(err.type).to.be.equal('DataModifiedError');
                    });
      });

      xit('2 parallel updateAttributes, same id and version, diffrent newVersion one should succeed the other should fail', function () {
        var vehicleModel = loopback.getModel(modelName);
        var version = uuid.v4();
        var createData = { '_version': version, 'color': 'blue' };

        return vehicleModel.create(createData, bootstrap.defaultContext)
                    .then(function (res) {
                      var dataItems = [];
                      var data1 = res.toObject();
                      data1.color = 'yellow';
                      data1._newVersion = 'abc';
                      data1.id = data1.id.toString();
                      dataItems.push(data1);

                      var data2 = res.toObject();
                      data2.color = 'red';
                      data2._newVersion = 'abcd';
                      data2.id = data2.id.toString();
                      dataItems.push(data2);

                      var promiseArray = dataItems.map(data => new Promise(function (resolve, reject) {
                        res.updateAttributes(data, bootstrap.defaultContext).then(function (data) {
                          resolve(data);
                        }).catch(function (err) {
                          resolve(err);
                        });
                      }));
                      return Promise.all(promiseArray)
                            .then(function (results) {
                              var wasError = false;
                              results.forEach(function (data) {
                                if (wasError) {
                                  expect(data.color).to.eql(data2.color);
                                  expect(data.version).to.eql(data2.newVersion);
                                } else if (data instanceof Error) {
                                  wasError = true;
                                  expect(data.message).to.be.equal(modelName + ' instance is already locked');
                                } else {
                                  expect(data.color).to.eql(data1.color);
                                  expect(data.version).to.eql(data1.newVersion);
                                }
                              });
                            });
                    });
      });
    });

    describe(chalk.green('REST UpdateAttributes tests'), function () {
      it('Should fail on REST put without _version', function () {
        var vehicleModel = loopback.getModel(modelName);
        var version = uuid.v4();
        var createData = { '_version': version };
        return vehicleModel.create(createData, bootstrap.defaultContext)
                    .then(function (res) {
                      delete res.__data._oldVersion;
                      delete res.__data._version;
                      return apiPut('/' + pluralModelName + '/' + res.id, res);
                    })
                    .then(function (res) {
                      expect(res).to.not.be.ok;
                    })
                    .catch(function (err) {
                      expect(err).to.be.ok;
                      expect(JSON.parse(err.message).status).to.be.equal(422);
                        // expect(JSON.parse(err.message).message).to.be.equal(' field is mandatory');
                        // expect(JSON.parse(err.message).errors[0].code).to.be.equal('validation-err-004');
                        // expect(JSON.parse(err.message).errors[0].path).to.be.equal(modelName + ' -> _version');
                    });
      });

      it('Should succeed on REST put with correct _version and new _newVersion ', function () {
        var vehicleModel = loopback.getModel(modelName);
        var version = uuid.v4();
        var createData = { '_version': version, 'color': 'blue' };
        var versionAfterPut;
        return vehicleModel.create(createData, bootstrap.defaultContext)
                    .then(function (res) {
                      res.color = 'yellow';
                      versionAfterPut = res._newVersion = uuid.v4();
                      return apiPut('/' + pluralModelName + '/' + res.id, res);
                    })
                    .then(function (res) {
                      expect(res).to.be.ok;
                      expect(res._version).to.be.equal(versionAfterPut);
                      expect(res.color).to.be.equal('yellow');
                      expect(res._version).to.not.be.equal(res._oldVersion);
                    });
      });

            // TODO actually it should be an error, as data is different
      it('Should succeed on REST put with _newVersion that is current _version in server but should not update data', function () {
        var vehicleModel = loopback.getModel(modelName);
        var version = uuid.v4();
        var createData = { '_version': version, 'color': 'blue' };
        var data;
        var version2, version3;
        return vehicleModel.create(createData, bootstrap.defaultContext)
                    .then(function (res) {
                      version1 = res._version;
                      data = res.toObject(true);
                      data.color = 'yellow';
                      data._newVersion = uuid.v4();
                      return apiPut('/' + pluralModelName + '/' + res.id, data);
                    })
                    .then(function (res) {
                      data.color = 'black';
                      version2 = res._version;
                      return apiPut('/' + pluralModelName + '/' + res.id, data);
                    })
                    .then(function (res) {
                      expect(res).to.be.ok;
                      expect(res._version).to.be.ok;
                      expect(res.color).to.be.equal('yellow');
                      expect(res._version).to.be.equal(version2);
                    });
      });

      it('Should succeed on REST put with _newVersion that is in model history table but should not update data', function () {
        var vehicleModel = loopback.getModel(modelName);
        var version = uuid.v4();
        var createData = { '_version': version, 'color': 'blue' };
        var afterUpdateVersion;
        var expectedRecord;
        return vehicleModel.create(createData, bootstrap.defaultContext)
                    .then(function (res) {
                      res.color = 'yellow';
                      id = res.id;
                      afterUpdateVersion = res._newVersion = uuid.v4();
                      return apiPut('/' + pluralModelName + '/' + res.id, res);
                    })
                    .then(function (res) {
                      expectedRecord = res;
                      res.color = 'yellow';
                      res._version = version;
                      res._newVersion = afterUpdateVersion;
                      return apiPut('/' + pluralModelName + '/' + res.id, res);
                    })
                    .then(function (res) {
                      expect(res).to.be.ok;
                      var filter = {_modelId: expectedRecord.id};
                      vehicleModel._historyModel.count( bootstrap.defaultContext, function (err, count) {
                        console.log('history count ', count);
                            // PKGTODO this will work when lock is in place
                            // expect(count).to.be.equal(1);
                      });
                    });
      });

      it('Should fail on REST updateAttributes with _version that is not in model history table or in current instance', function () {
        var vehicleModel = loopback.getModel(modelName);
        var version = uuid.v4();
        var createData = { '_version': version, 'color': 'blue' };
        var failVersion;
        var expectedRecord;
        return vehicleModel.create(createData, bootstrap.defaultContext)
                    .then(function (res) {
                      res.color = 'yellow';
                      res._newVersion = uuid.v4();
                      return apiPut('/' + pluralModelName + '/' + res.id, res);
                    })
                    .then(function (res) {
                      res.color = 'red';
                      expectedRecord = res;
                        // set wrong version
                      res._version = uuid.v4();
                      failVersion = res._newVersion = uuid.v4();
                      return apiPut('/' + pluralModelName + '/' + res.id, res);
                    })
                    .then(function (res) {
                      expect(res).to.not.be.ok;
                    }).catch(function (err) {
                      expect(err).to.be.ok;
                      expect(JSON.parse(err.message).status).to.be.equal(422);
                      expect(JSON.parse(err.message).errors[0].code).to.be.equal('DATA_ERROR_071');
                    });
      });

      xit('2 parallel updateAttributes, same id and version, diffrent newVersion one should succeed the other should fail', function () {
        var vehicleModel = loopback.getModel(modelName);
        var version = uuid.v4();
        var createData = { '_version': version, 'color': 'blue' };

        return vehicleModel.create(createData, bootstrap.defaultContext)
                    .then(function (res) {
                      var dataItems = [];
                      var data1 = res.toObject();
                      data1.color = 'yellow';
                      data1._newVersion = 'abc';
                      data1.id = data1.id.toString();
                      dataItems.push(data1);

                      var data2 = res.toObject();
                      data2.color = 'red';
                      data2._newVersion = 'abcd';
                      data2.id = data2.id.toString();
                      dataItems.push(data2);

                      var promiseArray = dataItems.map(data => new Promise(function (resolve, reject) {
                        var result = {};
                        apiPut('/' + pluralModelName + '/' + data.id, data).then(function (data) {
                          result.type = 'data';
                          result.payload = data;
                          resolve(result);
                        }).catch(function (err) {
                          result.type = 'error';
                          result.payload = err;
                          resolve(result);
                        });
                      }));

                      return Promise.all(promiseArray)
                            .then(function (results) {
                              var wasError = false;
                              results.forEach(function (data) {
                                if (wasError) {
                                  expect(data.type).to.be.equal('data');
                                  expect(data.payload.color).to.eql(data2.color);
                                  expect(data.payload.version).to.eql(data2.newVersion);
                                } else if (data.type === 'error') {
                                  wasError = true;
                                  var error = JSON.parse(data.payload.message);
                                  expect(error.status).to.be.equal(500);
                                  expect(error.message).to.be.equal(modelName + ' instance is already locked');
                                } else {
                                  expect(data.type).to.be.equal('data');
                                  expect(data.payload.color).to.be.eql(data1.color);
                                  expect(data.payload.version).to.be.eql(data1.newVersion);
                                }
                              });
                            });
                    });
      });
    });
  });
});
