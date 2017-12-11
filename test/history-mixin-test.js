/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This file test the functionality of history management, it checks if history
 * is maintained for different Write operation such as update and delete.
 * 
 * and it also checks if /history rest api works fine with and without filter.
 * 
 * @author Sivankar Jain
 */
/* jshint -W024 */
/* jshint expr:true */
// to avoid jshint errors for expect
var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var expect = chai.expect;
var models = bootstrap.models;
var loopback = require('loopback');
var debug = require('debug')('history-mixin-test');
var uuidv4 = require('uuid/v4');
var api = bootstrap.api;

describe('history-mixin tests	Programmatically', function () {

  this.timeout(50000);

  var modelName = 'MixinTest';
  var modelDetails = {
    name: modelName,
    base: 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
        'required': true,
        'unique': true
      }
    },
    strict: false,
    plural: modelName,
    mixins: {
      VersionMixin: true
    }
  };
  var model;

  before('create test model', function (done) {
    models.ModelDefinition.create(modelDetails, bootstrap.defaultContext, function (err, res) {
      if (err) {
        debug('unable to create historyMixinTest model');
        done(err);
      } else {
        model = loopback.getModel(modelName, bootstrap.defaultContext);
        done();
      }
    });
  });

  it('should create a history model for Test model', function (done) {
    var mainModel = loopback.getModel(modelName, bootstrap.defaultContext);
    var model = loopback.getModel(mainModel.modelName + 'History', bootstrap.defaultContext);
    expect(model).not.to.be.null;
    expect(model).not.to.be.undefined;
    done();
  });


  it('should insert data to TestModel, check if version is set and history model is empty ---programmatically',
    function (done) {
      this.timeout(50000);
      var postData = {
        'name': 'TestCaseOne'
      };
      model.create(postData, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          model.history({}, bootstrap.defaultContext, function (err, historyRes) {
            if (err) {
              done(err);
            } else {
              expect(historyRes).to.be.empty;
              done();
            }
          });
        }
      });
    });

  it('should insert data to TestModel model, update the same record multiple times and retrive its history.' +
    ' --programmatically',
    function (done) {

      this.timeout(15000);
      var postData = {
        'name': 'TestCaseTwo'
      };
      var dataId;
      model.create(postData, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          postData.id = res.id;
          postData.name = 'update1';
          postData._version = res._version;
          model.upsert(postData, bootstrap.defaultContext, function (err, upsertRes) {
            if (err) {
              done(err);
            } else {
              postData.name = 'update2';
              postData.id = upsertRes.id;
              postData._version = upsertRes._version;
              model.upsert(postData, bootstrap.defaultContext, function (err, upsertRes) {
                if (err) {
                  done(err);
                } else {
                  model.history({
                    where: {
                      _modelId: dataId
                    }
                  },
                    bootstrap.defaultContext, function (err, historyRes) {
                      if (err) {
                        done(err);
                      } else {
                        expect(historyRes).not.to.be.empty;
                        expect(historyRes).to.have.length(2);
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

  it('should insert data to TestModel model, destroy the same record retrive its history ', function (done) {
    this.timeout(10000);

    var postData = {
      'name': 'TestCaseFour'
    };
    var dataId;
    model.create(postData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        dataId = res.id;
        model.deleteById(dataId, bootstrap.defaultContext, function (err, upsertRes) {
          if (err) {
            done(err);
          } else {
            model.history({
              where: {
                _modelId: dataId
              }
            }, bootstrap.defaultContext, function (err, historyRes) {
              if (err) {
                done(err);
              } else {
                expect(historyRes).to.have.length(1);
                done();
              }
            });
          }
        });
      }
    });
  });

  it('should insert new record, using upsert if id is not defined.', function (done) {

    var postData = {
      'name': 'TestCaseFive',
      '_version': uuidv4()
    };
    model.upsert(postData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        expect(res.name).to.be.equal('TestCaseFive');
        expect(res.id).not.to.be.null;
        expect(res.id).not.to.be.undefined;
        done();
      }
    });
  });

  it('should insert data to TestModel model,update the same record multiple times and retrive its history--REST api',
    function (done) {
      this.timeout(10000);

      var postData = {
        'name': 'TestCaseThree'
      };
      var url = bootstrap.basePath + '/' + modelName + '/history';
      var dataId;
      var version;
      model.create(postData, bootstrap.defaultContext, function (err, res) {
        if (err) {
          done(err);
        } else {
          postData.id = res.id;
          postData._version = res._version;
          postData.name = 'newName';
          model.upsert(postData, bootstrap.defaultContext, function (err, upsertRes) {
            if (err) {
              done(err);
            } else {
              api
                .get(url)
                .send()
                .expect(200).end(function (err, historyRes) {
                  debug('response body : ' + JSON.stringify(historyRes.body, null, 4));
                  if (err) {
                    done(err);
                  } else {
                    expect(historyRes.body).not.to.be.empty;
                    expect(historyRes.body).to.have.length(4);
                    done();
                  }
                });
            }
          });
        }
      });
    });

});
