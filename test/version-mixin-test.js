/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * this file test, version control functionality,
 * 1) create a record - new version should be given to it.
 * 2) update a record - should only update with right version number.
 * 		      - should not update if version number is wrong or undefined
 * 3) delete a record - should only delete with right version number.
 * 		      - should not delete if version number is wrong or undefined
 * @author sivankar jain
 */
/* jshint -W024 */
/* jshint expr:true */
//to avoid jshint errors for expect

var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var expect = chai.expect;
var models = bootstrap.models;
var debug = require('debug')('version-mixin-test');
var chalk = require('chalk');

describe(chalk.blue('version-mixin test -Programmatically'), function () {

  this.timeout(300000);
  var modelName = 'VersionMixinTest';
  var modelDetails = {
    name: modelName,
    base: 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
      }
    },
    plural: modelName,
    mixins: {
      SoftDeleteMixin: false,
      IdempotentMixin: false,
      VersionMixin: true
    }
  };

  before('create test model', function (done) {
    models.ModelDefinition.create(modelDetails, bootstrap.defaultContext, function (err, res) {
      if (err) {
        debug('unable to create VersionMixinTest model');
        done(err);
      } else {
        done();
      }
    });
  });

  after('clean up : database', function (done) {
    // clearing data from VersionMixinTest model
    models[modelName].destroyAll({}, bootstrap.defaultContext, function (err, info) {
      if (err) {
        console.log(err);
      } else {
        debug('number of record deleted -> ', info.count);
        models.ModelDefinition.destroyAll({
          "name": modelName
        }, bootstrap.defaultContext, function (err) { });
      }
    });
    done();
  });

  it('should create a new record with version number', function (done) {
    var postData = {
      'name': 'record1'
    };
    models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        expect(res._version).not.to.be.empty;
        done();
      }
    });
  });

  it('should create and update a record  -upsert', function (done) {
    var postData = {
      'name': 'record2'
    };
    models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        res.name = 'updatedRecord2';
        models[modelName].upsert(res, bootstrap.defaultContext, function (err, res1) {
          if (err) {
            done(err);
          } else {
            expect(res1._version).not.to.be.empty;
            expect(res1.name).to.be.equal('updatedRecord2');
            done();
          }
        });
      }
    });
  });

  it('should not update a record with wrong version  -upsert', function (done) {
    // commented out as upsert and autoscope is resulting into new record
    // I think upsert should not allow version on new record
    // Or upsert should never insert if version is present
    // and internally can do update
    var postData = {
      'name': 'record3'
    };
    models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        postData.name = 'updatedRecord3';
        postData._version = 'wrongNumber';
        postData.id = res.id;
        models[modelName].upsert(postData, bootstrap.defaultContext, function (err1, res1) {
          if (err1) {
            expect(err1.message).not.to.be.empty;
            done();
          } else {
            done(new Error('record updated with wrong version number'));
          }
        });
      }
    });
  });

  it('should not update a record without version number  -upsert', function (done) {
    var postData = {
      'name': 'record3'
    };
    models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        postData.name = 'updatedRecord3';
        postData.id = res.id;
        postData._version = undefined;
        models[modelName].upsert(postData, bootstrap.defaultContext, function (err1, res1) {
          if (err1) {
            expect(err1.message).not.to.be.empty;
            done();
          } else {
            done(new Error('record updated without version number'));
          }
        });
      }
    });
  });

  it('should create and update a record  -updateAttributes', function (done) {
    var postData = {
      'name': 'record4'
    };
    models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        models[modelName].findOne({
          where: {
            id: res.id
          }
        }, bootstrap.defaultContext, function (err1, instance) {
          if (err1 || !instance) {
            done(err1 || new Error('record not found'));
          } else {
            postData.name = 'updatedRecord4';
            postData._version = instance._version;
            instance.updateAttributes(postData, bootstrap.defaultContext, function (err2, res1) {
              if (err2) {
                done(err2);
              } else {
                expect(res1._version).not.to.be.empty;
                expect(res1.name).to.be.equal('updatedRecord4');
                done();
              }
            });
          }
        });
      }
    });
  });

  it('should not update a record with wrong version -updateAttributes', function (done) {
    var postData = {
      'name': 'record5'
    };
    models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        models[modelName].findOne({
          where: {
            id: res.id
          }
        }, bootstrap.defaultContext, function (err1, instance) {
          if (err1 || !instance) {
            done(err1 || new Error('record not found'));
          } else {
            postData.name = 'updatedRecord5';
            postData._version = 'WrongVersion';
            postData.id = res.id;
            instance.updateAttributes(postData, bootstrap.defaultContext, function (err2, res1) {
              if (err2) {
                expect(err2.message).not.to.be.empty;
                done();
              } else {
                done(new Error('record updated with wrong version number'));
              }
            });
          }
        });
      }
    });
  });
  it('should update a record without version programitacally -updateAttributes', function (done) {
    var postData = {
      'name': 'record6'
    };
    models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        models[modelName].findOne({
          where: {
            id: res.id
          }
        }, bootstrap.defaultContext, function (err1, instance) {
          if (err1 || !instance) {
            done(err1 || new Error('record not found'));
          } else {
            postData.name = 'updatedRecord6';
            instance.updateAttributes(postData, bootstrap.defaultContext, function (err2, res1) {
              expect(err2).not.to.be.ok;
              done();
            });
          }
        });
      }
    });
  });
  it('should create and update a record with version - upsert 1', function (done) {
    var postData = {
      'name': 'record7'
    };
    models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        postData.name = 'updatedRecord7';
        postData._version = res._version;
        postData.id = res.id;
        models[modelName].upsert(postData, bootstrap.defaultContext, function (err2, res1) {
          if (err2) {
            done(err2);
          } else {
            expect(res1._version).not.to.be.empty;
            done();
          }
        });
      }
    });
  });

  it('should delete a record giving id and version number -deleteById', function (done) {
    var postData = {
      'name': 'record11'
    };
    models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        models[modelName].deleteById(res.id, res._version, bootstrap.defaultContext, function (err2, res1) {
          if (err2) {
            done(new Error('record not deleted without version number'));
          } else {
            expect(res1.count).to.be.equal(1);
            done();
          }
        });
      }
    });
  });

  xit('should create and update a record with version - upsert', function (done) {
    var postData = {
      'name': 'record121'
    };
    var flag = false;
    var flag2 = false;
    models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        postData.name = 'updatedRecord121';
        postData._version = res._version;
        postData.id = res.id;
        models[modelName].upsert(postData, bootstrap.defaultContext, function (err2, res1) {
          if (err2) {
            flag = true;
          } else if (res1) {
            expect(res1.name).to.be.equal(postData.name);
          } else {
            flag = true;
          }
        });
        var postData2 = {};
        postData2.name = 'updatedRecord22222';
        postData2._version = res._version;
        postData2.id = res.id;
        models[modelName].upsert(postData2, bootstrap.defaultContext, function (err2, res1) {
          if (err2) {
            flag2 = true;
          } else if (res1) {
            expect(res1.name).to.be.equal(postData.name);
          } else {
            if (flag) {
              flag2 = true;
            }
          }
        });
        setTimeout(function () {
          if (flag && flag2) {
            done(new Error(' test case failed'));
          } else {
            done();
          }
        }, 1000);
      }
    });
  });



});
