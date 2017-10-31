/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * This test is for unit-testing the Instance result caching feature in datasource juggler.
 * The test involves creating a test model, inserting a record into it, fetching the
 * record (so that it caches), deleting the record from the database by directly accessing
 * the DB (bypassing the framework, so that cache is not ecicted), fetching the
 * record again to see that the records are still fetched (from cache).
 *
 *  Author: Lior Schindler
 */


var bootstrap = require('./bootstrap');
var uuid = require('node-uuid');
var chai = bootstrap.chai;
var expect = chai.expect;
var app = bootstrap.app;
var models = bootstrap.models;
var loopback = require('loopback');
var async = require('async');
var api = bootstrap.api;
var debug = require('debug')('caching-test');
var config = require('../server/config');
var MongoClient = require('mongodb').MongoClient;
var mongoHost = process.env.MONGO_HOST || 'localhost';
var pg = require('pg');
var postgresHost = process.env.POSTGRES_HOST || 'localhost';
var logger = require('oe-logger');
var log = logger('instance-caching-test');
var oracleHost = process.env.ORACLE_HOST || 'localhost';
var oraclePort = process.env.ORACLE_PORT || 1521;
var oracleService = process.env.ORACLE_SID || 'orclpdb.ad.infosys.com';
var oracleUser = process.env.ORACLE_USERNAME || 'oeadmin';
var oraclePassword = process.env.ORACLE_PASSWORD || 'oeadmin';

var defaultContext = {
  ctx: {
    tenantId: 'limits'
  }
};;
var altContext = {
  ctx: {
    tenantId: 'gravity'
  }
};;
var modelName = 'InstanceCachingTest';
var modelNameNoInstanceCache = 'InstanceCachingTestNoInstanceCache';
var dsName = 'db';
var dbname = process.env.DB_NAME || 'db';
var dataSource;
var accessToken = null;

function apiPostRequest(url, postData, callback, done) {
  var version = uuid.v4();
  postData._version = version;
  api
    .set('Accept', 'application/json')
    .set('x-evproxy-db-lock', '1')
    .post(bootstrap.basePath + url + '?access_token=' + accessToken)
    .send(postData)
    .end(function (err, res) {
      if (err || res.body.error) {
        //log.error(log.defaultContext(), err || (new Error(JSON.stringify(res.body.error))));
        return done(err || (new Error(JSON.stringify(res.body.error))));
      } else {
        return callback(res);
      }
    });
}

function apiGetRequest(url, callback, done) {
  var version = uuid.v4();
  api
    .set('Accept', 'application/json')
    .set('x-evproxy-db-lock', '1')
    .get(bootstrap.basePath + url + '?access_token=' + accessToken)
    .send()
    .end(function (err, res) {
      if (err || res.body.error) {
        //log.error(log.defaultContext(), err || (new Error(JSON.stringify(res.body.error))));
        return done(err || (new Error(JSON.stringify(res.body.error))));
      } else {
        return callback(res);
      }
    });
}

function mongoDeleteById(id, newModelName, cb) {
  if (dataSource.name === 'mongodb') {
    var url = 'mongodb://' + mongoHost + ':27017/' + dbname;
    MongoClient.connect(url, function (err, db) {
      if (err) {
        return cb(err);
      } else {
        db.collection(newModelName).deleteOne({ _id: id }, function (err, numberRemoved) {
          if (err) {
            return cb(err);
          }
          debug("Number of records removed " + numberRemoved);
          cb();
        });
      }
    });
  } else if (dataSource.name === 'oracle') {
    var oracledb = require('oracledb');
    oracledb.autoCommit = true;
    var loopbackModelNoCache = loopback.getModel(modelName, bootstrap.defaultContext);
    var idFieldName = loopbackModelNoCache.definition.idName();
    oracledb.getConnection({
      "password": oraclePassword,
      "user": oracleUser,
      "connectString": oracleHost + ":" + oraclePort + "/" + oracleService
    }, function (err, connection) {
      if (err) {
        return cb(err);
      }
      connection.execute(
        "DELETE from \"" + loopbackModelNoCache.modelName.toUpperCase() + "\"  WHERE " + idFieldName + " = '" + id + "'",
        function (error, result) {
          if (err) {
            return cb(err);
          }
          debug("Number of records removed " + result.rowsAffected);
          cb();
        });
    });
  } else {
    var loopbackModelNoCache = loopback.getModel(modelName, bootstrap.defaultContext);
    var idFieldName = loopbackModelNoCache.definition.idName();
    var connectionString = "postgres://postgres:postgres@" + postgresHost + ":5432/" + dbname;
    var client = new pg.Client(connectionString);
    client.connect(function (err) {
      if (err)
        cb(err);
      else {
        var query = client.query("DELETE from \"" + loopbackModelNoCache.modelName.toLowerCase() + "\"  WHERE " + idFieldName + " = '" + id + "'", function (err, result) {
          if (err) {
            return cb(err);
          }
          debug("Number of records removed " + result.rowCount);
          cb();
        });
      }
    });
  }

}

describe('Instance Caching Test', function () {
  // return; // Disabling this test case because it is not working in PostgreSQL. This will be fixed by Lior.
  var TestModel = null;
  var TestModelNoInstanceCache = null;
  this.timeout(20000);
  before('login using admin', function fnLogin(done) {
    dataSource = app.datasources[dsName];
    var sendData = {
      'username': 'admin',
      'password': 'admin'
    };

    api
      .set('x-evproxy-db-lock', '1')
      .post(bootstrap.basePath + '/BaseUsers/login')
      .send(sendData)
      .expect(200).end(function (err, res) {
        if (err) {
          log.error(log.defaultContext(), err);
          return done(err);
        } else {
          accessToken = res.body.id;
          return done();
        }
      });
  });

  before('Create Test Model', function (done) {
    var modelDefinition = loopback.findModel('ModelDefinition');
    dataSource = app.datasources[dsName];
    var data = {
      'name': modelName,
      'base': 'BaseEntity',
      'idInjection': true,
      'disableInstanceCache' : false,
      'options': {
        instanceCacheSize: 2000,
        instanceCacheExpiration: 100000,
        queryCacheSize: 2000,
        queryCacheExpiration: 100,
        disableManualPersonalization: true
      },
      'properties': {
        'name': {
          'type': 'string'
        }
      }
    };

    modelDefinition.create(data, bootstrap.defaultContext, function (err, model) {
      if (err) {
        return done(err);
      } else {
        // Delete all records in the table associated with this TestModel
        TestModel = loopback.getModel(modelName, bootstrap.defaultContext);
        TestModel.destroyAll({}, defaultContext, function (err, info) {
          if (err) {
            return done(err);
          } else {
            done();
          }
        });
      }
    });
  });

  before('Create Test Model with No InstanceCache', function (done) {
    var modelDefinition = loopback.findModel('ModelDefinition');
    dataSource = app.datasources[dsName];
    var data = {
      'name': modelNameNoInstanceCache,
      'base': 'BaseEntity',
      'idInjection': true,
      'disableInstanceCache': false,
      'options': {
        instanceCacheSize: 2000,
        instanceCacheExpiration: 100000,
        queryCacheSize: 2000,
        queryCacheExpiration: 100,
        disableManualPersonalization: true,
        disableInstanceCache: true
      },
      'properties': {
        'name': {
          'type': 'string'
        }
      }
    };

    modelDefinition.create(data, bootstrap.defaultContext, function (err, model) {
      if (err) {
        return done(err);
      } else {
        // Delete all records in the table associated with this TestModel
        TestModelNoInstanceCache = loopback.getModel(modelNameNoInstanceCache, bootstrap.defaultContext);
        TestModelNoInstanceCache.destroyAll({}, defaultContext, function (err, info) {
          if (err) {
            return done(err);
          } else {
            done();
          }
        });
      }
    });
  });

  describe('CRUD tests', function () {
    dataSource = app.datasources[dsName];
    it('Should NOT cache the Test instance after create', function (done) {
      var id = uuid.v4();
      var result1, result2;
      TestModel.create({
        name: "Lior",
        id: id
      }, defaultContext, function (err, data) {
        if (err) {
          console.log(err);
          return done(err);
        } else {
          result1 = Object.assign({}, data.toObject());
          mongoDeleteById(id, TestModel.modelName, function (err) {
            if (err) {
              return done(err);
            }
            TestModel.find({ "where": { "id": id } }, defaultContext, function (err, data2) {
              if (err) {
                return done(err);
              } else if (data2.length === 0) {
                return done();
              }
              return done(new Error('should not cache instance'));
            })
          });
        }
      });
    });

    it('Should cache the Test instance after findById', function (done) {
      var id = uuid.v4();
      var result1, result2;
      TestModel.create({
        name: "Lior",
        id: id
      }, defaultContext, function (err, data) {
        if (err) {
          console.log(err);
          return done(err);
        } else {
          TestModel.find({ "where": { "id": id } }, defaultContext, function (err, data) {
            if (err) {
              return done(err);
            } else if (data.length !== 1) {
              return done('find should return one instance');
            }
            result1 = Object.assign({}, data[0].toObject());
            mongoDeleteById(id, TestModel.modelName, function (err) {
              if (err) {
                return done(err);
              }
              TestModel.find({ "where": { "id": id } }, defaultContext, function (err, data2) {
                if (err) {
                  return done(err);
                } else if (data2.length === 0) {
                  return done('instance not cached');
                }
                result2 = Object.assign({}, data2[0].toObject());
                expect(models[TestModel.modelName]).not.to.be.null;
                expect(result1).not.to.be.null;
                expect(result2).not.to.be.null;
                expect(result1).to.deep.equal(result2);
                expect(result1.__data === result2.__data).to.be.true;
                return done();
              });
            });
          });
        }
      });
    });

    it('Should cache the Test instance after findById, for system generated id', function (done) {
      var result1, result2;
      TestModel.create({
        name: "Lior",
      }, defaultContext, function (err, data) {
        if (err) {
          console.log(err);
          return done(err);
        } else {
          var id = data.id;
          TestModel.find({ "where": { "id": id } }, defaultContext, function (err, data) {
            if (err) {
              return done(err);
            } else if (data.length !== 1) {
              return done('find should return one instance');
            }
            result1 = Object.assign({}, data[0].toObject());
            mongoDeleteById(id, TestModel.modelName, function (err) {
              if (err) {
                return done(err);
              }
              TestModel.find({ "where": { "id": id } }, defaultContext, function (err, data2) {
                if (err) {
                  return done(err);
                } else if (data2.length === 0) {
                  return done('instance not cached')
                }
                result2 = Object.assign({}, data2[0].toObject());
                expect(models[TestModel.modelName]).not.to.be.null;
                expect(result1).not.to.be.null;
                expect(result2).not.to.be.null;
                expect(result1).to.deep.equal(result2);
                expect(result1.__data === result2.__data).to.be.true;
                return done();
              });
            });
          });
        }
      });
    });

    it('Should cache the Test instance after upsert', function (done) {
      var id = uuid.v4();
      var result1, result2;
      TestModel.create({
        name: 'Lior',
        id: id
      }, defaultContext, function (err, data) {
        if (err) {
          console.log(err);
          return done(err);
        } else {
          data.name = 'karin';
          TestModel.upsert(data, defaultContext, function (err, data) {
            if (err) {
              console.log(err);
              return done(err);
            }
            result1 = Object.assign({}, data.toObject());
            mongoDeleteById(id, TestModel.modelName, function (err) {
              if (err) {
                return done(err);
              }
              TestModel.find({ "where": { "id": id } }, defaultContext, function (err, data2) {
                if (err) {
                  return done(err);
                } else if (data2.length === 0) {
                  return done('instance not cached')
                }
                result2 = Object.assign({}, data2[0].toObject());
                expect(models[TestModel.modelName]).not.to.be.null;
                expect(result1).not.to.be.null;
                expect(result2).not.to.be.null;
                //expect(result1).to.deep.equal(result2);
                expect(result1.__data === result2.__data).to.be.true;
                return done();
              });
            });
          });
        }
      });
    });

    it('Should cache the Test instance after save', function (done) {
      var id = uuid.v4();
      var result1, result2;
      TestModel.create({
        name: 'Lior',
        id: id
      }, defaultContext, function (err, data) {
        if (err) {
          console.log(err);
          return done(err);
        } else {
          data.name = 'Tamar';
          data.save(defaultContext, function (err, data) {
            if (err) {
              console.log(err);
              return done(err);
            }
            result1 = Object.assign({}, data.toObject());
            mongoDeleteById(id, TestModel.modelName, function (err) {
              if (err) {
                return done(err);
              }
              TestModel.find({ "where": { "id": id } }, defaultContext, function (err, data2) {
                if (err) {
                  return done(err);
                } else if (data2.length === 0) {
                  return done('instance not cached')
                }
                result2 = Object.assign({}, data2[0].toObject());
                expect(models[TestModel.modelName]).not.to.be.null;
                expect(result1).not.to.be.null;
                expect(result2).not.to.be.null;
                expect(result1).to.deep.equal(result2);
                expect(result1.__data === result2.__data).to.be.true;
                return done();
              })
            });
          });
        }
      });
    });

    it('Should cache the Test instance after updateAttributes', function (done) {
      var id = uuid.v4();
      var result1, result2;
      TestModel.create({
        name: 'Lior',
        assign: {
          change: 'this field should be deleted'
        },
        id: id
      }, defaultContext, function (err, data) {
        if (err) {
          console.log(err);
          return done(err);
        } else {
          data.updateAttributes({ name: 'Eduardo', assign: { new: 'should only see this field' } }, defaultContext, function (err, data) {
            if (err) {
              console.log(err);
              return done(err);
            }
            result1 = Object.assign({}, data.toObject(), { name: 'Eduardo', assign: { new: 'should only see this field' } });
            mongoDeleteById(id, TestModel.modelName, function (err) {
              if (err) {
                return done(err);
              }
              TestModel.find({ "where": { "id": id } }, defaultContext, function (err, data2) {
                if (err) {
                  return done(err);
                } else if (data2.length === 0) {
                  return done('instance not cached')
                }
                result2 = Object.assign({}, data2[0].toObject());
                expect(models[TestModel.modelName]).not.to.be.null;
                expect(result1).not.to.be.null;
                expect(result2).not.to.be.null;
                expect(result1).to.deep.equal(result2);
                expect(result1.__data === result2.__data).to.be.true;
                return done();
              })
            });
          });
        }
      });
    });

    it('Should clear instance cache after destroyAll', function (done) {
      var id = uuid.v4();
      var result1, result2;
      TestModel.create({
        name: 'Ori',
        id: id
      }, defaultContext, function (err, data) {
        if (err) {
          console.log(err);
          return done(err);
        } else {
          TestModel.destroyAll({}, defaultContext, function (err) {
            if (err) {
              console.log(err);
              return done(err);
            }
            TestModel.find({ "where": { "id": id } }, defaultContext, function (err, data2) {
              if (err) {
                return done(err);
              }
              expect(data2.length).to.be.equal(0);
              return done();
            });
          });
        }
      });
    });

    it('Should delete the Test instance from cache after deleteByid', function (done) {
      var id = uuid.v4();
      var result1, result2;
      TestModel.create({
        name: 'Tamar',
        id: id
      }, defaultContext, function (err, data) {
        if (err) {
          console.log(err);
          return done(err);
        } else {
          TestModel.destroyById(id, defaultContext, function (err) {
            if (err) {
              console.log(err);
              return done(err);
            }
            TestModel.find({ "where": { "id": id } }, defaultContext, function (err, data2) {
              if (err) {
                return done(err);
              }
              expect(data2.length).to.be.equal(0);
              return done();
            });
          });
        }
      });
    });

    it('Should delete the Test instance from cache after deleteByid and version', function (done) {
      var id = uuid.v4();
      var result1, result2;
      TestModel.create({
        name: 'Tamar',
        id: id
      }, defaultContext, function (err, data) {
        if (err) {
          console.log(err);
          return done(err);
        } else {
          TestModel.destroyById(id, data._version, defaultContext, function (err) {
            if (err) {
              console.log(err);
              return done(err);
            }
            TestModel.find({ "where": { "id": id } }, defaultContext, function (err, data2) {
              if (err) {
                return done(err);
              }
              expect(data2.length).to.be.equal(0);
              return done();
            });
          });
        }
      });
    });

    it('Should clear cache after update', function (done) {
      var id = uuid.v4();
      TestModel.create({
        name: "Praveen",
        id: id
      }, defaultContext, function (err, data) {
        if (err) {
          console.log(err);
          return done(err);
        } else {
          mongoDeleteById(id, TestModel.modelName, function (err) {
            if (err) {
              return done(err);
            }
            TestModel.find({ "where": { "id": id } }, defaultContext, function (err, data2) {
              if (err) {
                return done(err);
              }
              expect(data2.length).to.be.equal(0);
              return done();
            });
          });
        }
      });
    });

    it('Should delete empty instance in cache after create', function (done) {
      var id = uuid.v4();
      var result1, result2;
      TestModel.find({ "where": { "id": id } }, defaultContext, function (err, data) {
        if (err) {
          return done(err);
        } else if (data.length !== 0) {
          return done('There should not be an instance yet');
        }
        TestModel.create({
          name: "Lior",
          id: id
        }, defaultContext, function (err, data) {
          if (err) {
            console.log(err);
            return done(err);
          } else {
            TestModel.find({ "where": { "id": id } }, defaultContext, function (err, data) {
              if (err) {
                return done(err);
              } else if (data.length !== 1) {
                return done('find should return one instance');
              }
              result1 = Object.assign({}, data[0].toObject());
              mongoDeleteById(id, TestModel.modelName, function (err) {
                if (err) {
                  return done(err);
                }
                TestModel.find({ "where": { "id": id } }, defaultContext, function (err, data2) {
                  if (err) {
                    return done(err);
                  } else if (data2.length === 0) {
                    return done('instance not cached')
                  }
                  result2 = Object.assign({}, data2[0].toObject());
                  expect(models[TestModel.modelName]).not.to.be.null;
                  expect(result1).not.to.be.null;
                  expect(result2).not.to.be.null;
                  expect(result1).to.deep.equal(result2);
                  expect(result1.__data === result2.__data).to.be.true;
                  return done();
                });
              });
            });
          }
        });
      });
    });

    it('Should not cache id queries with operators', function (done) {
      var id1 = uuid.v4();
      var id2 = uuid.v4();
      var result1, result2;
      TestModel.create({
        name: "Atul",
        id: id1
      }, defaultContext, function (err, data) {
        if (err) {
          console.log(err);
          return done(err);
        } else {
          TestModel.find({ "where": { "id": { "inq": [id1, id2] } } }, defaultContext, function (err, data) {
            if (err) {
              return done(err);
            } else if (data.length !== 1) {
              return done('find should return one instance');
            }
            TestModel.create({
              name: "Ramesh",
              id: id2
            }, defaultContext, function (err, data) {
              TestModel.find({ "where": { "id": { "inq": [id1, id2] } } }, defaultContext, function (err, data) {
                if (err) {
                  return done(err);
                } else if (data.length !== 2) {
                  return done('find should return two instances');
                }
                return done();
              });
            });
          });
        }
      });
    });

    it('Should not cache in instance cache if disableInstanceCache flag is on, test1', function (done) {
      /**
       * 1. create new modle instance
       * 2. run a find query
       * 3. at this point, in a normal case, the instance should be cached
       * 4. change the db directly in the DB.
       * 5. comper the record by quering again, at this point if the record is cached the result should e not updated.
       */
      var id = uuid.v4();

      apiPostRequest('/' + modelNameNoInstanceCache + 's/', { "name": "value1", "id": id }, apiRequest_find, done);

      function apiRequest_find(result, callback) {
        apiGetRequest('/' + modelNameNoInstanceCache + 's/' + id, callback ? callback : dbQuery_update, done);
      }

      function dbQuery_update(result) {
        var loopbackModelNoCache = loopback.getModel(modelNameNoInstanceCache, bootstrap.defaultContext);
        if (dataSource.name === 'mongodb') {
          MongoClient.connect('mongodb://' + mongoHost + ':27017/'+dbname, function (err, db) {
            if (err) return done(err);
            else {
              db.collection(loopbackModelNoCache.modelName).update({ "_id": id }, { $set: { name: "value2" } }, { upsert: true }, function (err) {
                if (err) return done(err);
                else apiRequest_find(result, comperCacheToDb);
              });
            }
          });
        } else if (dataSource.name === 'oracle') {
          var oracledb = require('oracledb');
          oracledb.autoCommit = true;
          var idFieldName = loopbackModelNoCache.definition.idName();
          oracledb.getConnection({
            "password": oraclePassword,
            "user": oracleUser,
            "connectString": oracleHost + ":" + oraclePort + "/" + oracleService
          }, function (err, connection) {
            if (err) {
              return done(err);
            }
            connection.execute(
              "UPDATE \"" + loopbackModelNoCache.modelName.toUpperCase() + "\" SET name = 'value2' WHERE " + idFieldName + " = '" + id + "'",
              function (error, result) {
                if (err) {
                  return done(err);
                } else {
                  apiRequest_find(result, comperCacheToDb);
                }
              });
          });
        } else {
          var idFieldName = loopbackModelNoCache.definition.idName();
          var connectionString = "postgres://postgres:postgres@" + postgresHost + ":5432/" + dbname;
          var client = new pg.Client(connectionString);
          client.connect(function (err) {
            if (err)
              done(err);
            else {
              var query = client.query("UPDATE \"" + loopbackModelNoCache.modelName.toLowerCase() + "\" SET name = 'value2' WHERE " + idFieldName + " = '" + id + "'", function (err, result) {
                if (err) {
                  return done(err);
                }
                else {
                  apiRequest_find(result, comperCacheToDb);
                }
              });
            }
          });
        }
      }

      function comperCacheToDb(result) {
        if (result.body.name === "value2") return done();
        else return done(new Error("Model cached to instance cache, although disableInstanceCache flag is on"));
      }
    });

    it('Should not cache in instance cache if disableInstanceCache flag is on, test2', function (done) {
      var id = uuid.v4();
      TestModelNoInstanceCache.create({ "name": modelNameNoInstanceCache, "id": id }, defaultContext, function (err, result) {
        if (err) {
          return done(err);
        } else {
          result.name = 'karin';
          TestModelNoInstanceCache.upsert(result, defaultContext, function (err, data) {
            if (err) {
              return done(err);
            } else {
              if (global.evDisableInstanceCache[modelNameNoInstanceCache]
                && !global.instanceCache[modelNameNoInstanceCache]
                && !global.queryCache[modelNameNoInstanceCache]) {
                return done();
              } else {
                return done(err);
              }
            }
          });
        }
      });
    });
  });

  describe('Personalization tests', function () {
    xit('Should create two instances with the same id and diffrenet scope, find from cache should still work', function (done) {
      var id = uuid.v4();
      var result1, result2;
      TestModel.create({
        name: "limits",
        id: id
      }, defaultContext, function (err, data) {
        if (err) {
          return done(err);
        }
        result1 = Object.assign({}, data.toObject());
        TestModel.create({
          name: "gravity",
          id: id
        }, altContext, function (err, data) {
          if (err) {
            return done(err);
          }
          TestModel.find({ "where": { "id": id } }, defaultContext, function (err, data2) {
            if (err) {
              return done(err);
            }
            result2 = Object.assign({}, data2.toObject());
            expect(result1).not.to.be.null;
            expect(result2).not.to.be.null;
            expect(result1).to.deep.equal(result2);
            expect(result1.__data === result2.__data).to.be.true;
          });
        });

      });
    });

  });


  //    after('Cleanup', function (done) {
  //        TestModel.destroyAll({}, defaultContext, function (err, info) {
  //            if (err) {
  //                console.log(err, info);
  //            }
  //            done();
  //        });
  //    });
});
