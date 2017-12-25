/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

/* This is a collection of tests that make sure that the idempotent behaviour work.
 *
 */

var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var api = bootstrap.api;
var models = bootstrap.models;
var logger = require('oe-logger');
var log = logger('data-personalization-test');
var loopback = require('loopback');

describe(chalk.blue('Idempotent behaviour --REST'), function () {
  this.timeout(300000);
  var state;
  var testUserAccessToken;
  var modelName = 'TestState';
  var modelDetails = {
    name: modelName,
    base: 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
        'required': true
      }
    },
    strict: false,
    idInjection: false,
    plural: modelName,
    mixins: {
      'HistoryMixin': true,
      'VersionMixin': true,
      'IdempotentMixin': true
    }
  };

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

  before('Create Test model', function (done) {
    models.ModelDefinition.create(modelDetails, bootstrap.defaultContext, function (err, res) {
      if (err) {
        log.debug(bootstrap.defaultContext, 'unable to create IdempotentTestModel');
        done(err);
      } else {
        done();
      }
    });
  });

  it('- Test for Idempotent behaviour - CREATE operation ', function (done) {
    var testData = {
      'name': 'Telangana',
      '_newVersion': 't1'
    };
    var baseurl = bootstrap.basePath + '/' + modelName;
    var url = baseurl + '?access_token=' + testUserAccessToken;
    api
      .post(url)
      .send(testData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          // console.log('========',result.body);
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body.name).to.be.equal('Telangana');
          api
            .post(url)
            .send(testData)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(200).end(function (err, result1) {
              if (err) {
                done(err);
              } else {
                // console.log('========',result1.body);
                expect(result1.body).not.to.be.null;
                expect(result1.body).not.to.be.empty;
                expect(result1.body).not.to.be.undefined;
                expect(result1.body.name).to.be.equal('Telangana');

                api
                  .get(baseurl + '/count' + '?access_token=' + testUserAccessToken)
                  .set('Content-Type', 'application/json')
                  .set('Accept', 'application/json')
                  .expect(200).end(function (err, res) {
                    if (err) {
                      done(err);
                    } else {
                      // console.log('========',res.body);
                      expect(res.body).not.to.be.null;
                      expect(res.body).not.to.be.empty;
                      expect(res.body).not.to.be.undefined;
                      expect(res.body.count).to.be.equal(1);
                      done();
                    }
                  });
              }
            });
        }
      });
  });

  it('- Test for Idempotent behaviour - UPDATE operation ', function (done) {
    var testData = {
      'name': 'Madras State',
      '_newVersion': 'm1'
    };
    var baseurl = bootstrap.basePath + '/' + modelName;
    var url = baseurl + '?access_token=' + testUserAccessToken
    api
      .put(url)
      .send(testData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          // console.log('========',result.body);
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body.name).to.be.equal('Madras State');
          var testData = {
            'name': 'Tamil Nadu',
            '_newVersion': 'm2',
            '_version': 'm1'
          };
          testData.id = result.body.id;
          api
            .put(url)
            .send(testData)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(200).end(function (err, result1) {
              if (err) {
                done(err);
              } else {
                // console.log('========',result1.body);
                expect(result1.body).not.to.be.null;
                expect(result1.body).not.to.be.empty;
                expect(result1.body).not.to.be.undefined;
                expect(result1.body.name).to.be.equal('Tamil Nadu');

                api
                  .put(url)
                  .send(testData)
                  .set('Content-Type', 'application/json')
                  .set('Accept', 'application/json')
                  .expect(200).end(function (err, result2) {
                    if (err) {
                      done(err);
                    } else {
                      // console.log('========',result2.body);
                      expect(result2.body).not.to.be.null;
                      expect(result2.body).not.to.be.empty;
                      expect(result2.body).not.to.be.undefined;
                      expect(result2.body.name).to.be.equal('Tamil Nadu');

                      api
                        .get(baseurl + '/count' + '?access_token=' + testUserAccessToken)
                        .set('Content-Type', 'application/json')
                        .set('Accept', 'application/json')
                        .expect(200).end(function (err, res) {
                          if (err) {
                            done(err);
                          } else {
                            // console.log('========',res.body);
                            expect(res.body).not.to.be.null;
                            expect(res.body).not.to.be.empty;
                            expect(res.body).not.to.be.undefined;
                            expect(res.body.count).to.be.equal(2);
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

  it('- Test for Idempotent behaviour - DELETE operation ', function (done) {
    var testData = {
      'name': 'Mysore',
      '_newVersion': 'ms1'
    };
    var baseurl = bootstrap.basePath + '/' + modelName;
    var url = baseurl + '?access_token=' + testUserAccessToken;
    api
      .post(url)
      .send(testData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          // console.log('========',result.body);
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body.name).to.be.equal('Mysore');
          var url2 = baseurl + '/' + result.body.id + '?access_token=' + testUserAccessToken;
          api
            .del(url2)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(200).end(function (err, result1) {
              if (err) {
                done(err);
              } else {
                // console.log('========', result1.body);
                expect(result1.body).not.to.be.null;
                expect(result1.body).not.to.be.empty;
                expect(result1.body).not.to.be.undefined;
                expect(result1.body.count).to.be.equal(1);
                api
                  .del(url2)
                  .set('Content-Type', 'application/json')
                  .set('Accept', 'application/json')
                  .expect(200).end(function (err, result2) {
                    if (err) {
                      done(err);
                    } else {
                      // console.log('========', result2.body);
                      expect(result2.body).not.to.be.null;
                      expect(result2.body).not.to.be.empty;
                      expect(result2.body).not.to.be.undefined;
                      expect(result2.body.count).to.be.equal(1);
                      api
                        .get(baseurl + '/count' + '?access_token=' + testUserAccessToken)
                        .set('Content-Type', 'application/json')
                        .set('Accept', 'application/json')
                        .expect(200).end(function (err, res) {
                          if (err) {
                            done(err);
                          } else {
                            // console.log('========', res.body);
                            expect(res.body).not.to.be.null;
                            expect(res.body).not.to.be.empty;
                            expect(res.body).not.to.be.undefined;
                            expect(res.body.count).to.be.equal(2);
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

  it('- Test for Idempotent behaviour - update attributes operation ', function (done) {
    var testData = {
      'name': 'Madhya Bharat',
      '_newVersion': 'mb1'
    };
    var baseurl = bootstrap.basePath + '/' + modelName;
    var url = baseurl + '?access_token=' + testUserAccessToken;
    api
      .post(url)
      .send(testData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          // console.log('========', result.body);
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body.name).to.be.equal('Madhya Bharat');
          var testData1 = {};
          testData1._newVersion = 'mb2';
          testData1._version = result.body._version;
          testData1.name = 'Madhya Pradesh';
          testData1.id = result.body.id;
          var newUrl = baseurl + '/' + result.body.id + '?access_token=' + testUserAccessToken;
          api
            .put(newUrl)
            .send(testData1)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(200).end(function (err, result1) {
              if (err) {
                done(err);
              } else {
                // console.log('========', result1.body);
                expect(result1.body).not.to.be.null;
                expect(result1.body).not.to.be.empty;
                expect(result1.body).not.to.be.undefined;
                expect(result1.body.name).to.be.equal('Madhya Pradesh');

                api
                  .put(newUrl)
                  .send(testData1)
                  .set('Content-Type', 'application/json')
                  .set('Accept', 'application/json')
                  .expect(200).end(function (err, result2) {
                    if (err) {
                      done(err);
                    } else {
                      // console.log('========', result2.body);
                      expect(result2.body).not.to.be.null;
                      expect(result2.body).not.to.be.empty;
                      expect(result2.body).not.to.be.undefined;
                      expect(result2.body.name).to.be.equal('Madhya Pradesh');

                      api
                        .get(baseurl + '/count' + '?access_token=' + testUserAccessToken)
                        .set('Content-Type', 'application/json')
                        .set('Accept', 'application/json')
                        .expect(200).end(function (err, res) {
                          if (err) {
                            done(err);
                          } else {
                            // console.log('========', res.body);
                            expect(res.body).not.to.be.null;
                            expect(res.body).not.to.be.empty;
                            expect(res.body).not.to.be.undefined;
                            expect(res.body.count).to.be.equal(3);
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

  it('- Test for Idempotent behaviour - CREATE operation on array of records', function (done) {
    var testData = [
      {
        'name': 'Rajasthan',
        '_newVersion': 'rj1'
      },
      {
        'name': 'Andhra Pradesh',
        '_newVersion': 'ap1'
      },
      {
        'name': 'Kerala',
        '_newVersion': 'ke1'
      },
      {
        'name': 'Uttaranchal',
        '_newVersion': 'ut1'
      }
    ];
    var baseurl = bootstrap.basePath + '/' + modelName;
    var url = baseurl + '?access_token=' + testUserAccessToken;
    api
      .post(url)
      .send(testData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200).end(function (err, result) {
        if (err) {
          done(err);
        } else {
          // console.log('========',result.body);
          expect(result.body).not.to.be.null;
          expect(result.body).not.to.be.empty;
          expect(result.body).not.to.be.undefined;
          expect(result.body.length).to.be.equal(4);
          api
            .post(url)
            .send(testData)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(200).end(function (err, result1) {
              if (err) {
                done(err);
              } else {
                // console.log('========',result.body);
                expect(result1.body).not.to.be.null;
                expect(result1.body).not.to.be.empty;
                expect(result1.body).not.to.be.undefined;
                expect(result1.body.length).to.be.equal(4);

                api
                  .get(baseurl + '/count' + '?access_token=' + testUserAccessToken)
                  .set('Content-Type', 'application/json')
                  .set('Accept', 'application/json')
                  .expect(200).end(function (err, res) {
                    if (err) {
                      done(err);
                    } else {
                      // console.log('========',res.body);
                      expect(res.body).not.to.be.null;
                      expect(res.body).not.to.be.empty;
                      expect(res.body).not.to.be.undefined;
                      expect(res.body.count).to.be.equal(7);
                      done();
                    }
                  });
              }
            });
        }
      });
  });

  it('- Test for Idempotent behaviour - UPDATE operation on array of records', function (done) {
    var testData = [
      {
        'name': 'Punjab',
        '_newVersion': 'pb1'
      }
    ];


    var model = loopback.getModel(modelName, bootstrap.defaultContext);
    var baseurl = bootstrap.basePath + '/' + modelName;
    var url =  baseurl + '?access_token=' + testUserAccessToken;
    model.find({
      'where': {
        'name': 'Uttaranchal'
      }
    }, bootstrap.defaultContext, function (err, result) {
      if (err) {
        done(err);
      } else {
        // console.log('========', result);
        expect(result).not.to.be.null;
        expect(result).not.to.be.empty;
        expect(result).not.to.be.undefined;
        expect(result[0].name).to.be.equal('Uttaranchal');
        result[0].name = 'Uttarakhand';
        result[0]._newVersion = 'ut2';
        testData.push(result[0]);
        api
          .put(url)
          .send(testData)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .expect(200).end(function (err, result1) {
            if (err) {
              done(err);
            } else {
              expect(result1.body).not.to.be.null;
              expect(result1.body).not.to.be.empty;
              expect(result1.body).not.to.be.undefined;
              expect(result1.body.length).to.be.equal(2);

              api
                .put(url)
                .send(testData)
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .expect(200).end(function (err, result2) {
                  if (err) {
                    done(err);
                  } else {
                    // console.log('========', result2.body);
                    expect(result2.body).not.to.be.null;
                    expect(result2.body).not.to.be.empty;
                    expect(result2.body).not.to.be.undefined;
                    expect(result2.body.length).to.be.equal(2);

                    api
                      .get(baseurl + '/count' + '?access_token=' + testUserAccessToken)
                      .set('Content-Type', 'application/json')
                      .set('Accept', 'application/json')
                      .expect(200).end(function (err, res) {
                        if (err) {
                          done(err);
                        } else {
                          // console.log('========', res.body);
                          expect(res.body).not.to.be.null;
                          expect(res.body).not.to.be.empty;
                          expect(res.body).not.to.be.undefined;
                          expect(res.body.count).to.be.equal(8);
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

});

describe(chalk.blue('Idempotent behaviour --Programatic'), function () {
  this.timeout(30000);
  var city;
  var modelName = 'City';
  var modelDetails = {
    name: modelName,
    base: 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
        'required': true
      }
    },
    strict: false,
    idInjection: false,
    relations: {
      'state': {
        'type': 'hasOne',
        'model': 'TestState'
      }
    },
    plural: modelName,
    mixins: {
      'HistoryMixin': true,
      'VersionMixin': true,
      'IdempotentMixin': true

    }
  };


  before('Create Test model', function (done) {
    models.ModelDefinition.create(modelDetails, bootstrap.defaultContext, function (err, res) {
      if (err) {
        log.debug(bootstrap.defaultContext, 'unable to create TestModel');
        done(err);
      } else {
        done();
      }
    });
  });

  it('- Test for Idempotent behaviour - create ', function (done) {
    var testData = {
      'name': 'Bangalore',
      '_newVersion': '10'
    };
    var testData2 = JSON.parse(JSON.stringify(testData));
    var model = loopback.getModel(modelName, bootstrap.defaultContext);

    model.create(testData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log('-------', res);
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res.name).to.be.equal('Bangalore');

        model.create(testData2, bootstrap.defaultContext, function (err, res1) {
          if (err) {
            done(err);
          } else {
            // console.log('-------', res1);
            expect(res1).not.to.be.null;
            expect(res1).not.to.be.empty;
            expect(res1).not.to.be.undefined;
            expect(res1.name).to.be.equal('Bangalore');

            model.find({
              where: {
                name: 'Bangalore'
              }
            }, bootstrap.defaultContext, function (err, res2) {
              if (err) {
                done(err);
              } else {
                // console.log('-------', res2);
                expect(res2).not.to.be.null;
                expect(res2).not.to.be.empty;
                expect(res2).not.to.be.undefined;
                expect(res2.length).to.be.equal(1);
                done();
              }
            });

          }
        });
      }
    });
  });

  it('- Test for Idempotent behaviour - upsert ', function (done) {
    var testData = {
      'name': 'calcutta',
      '_newVersion': '20'
    };
    var testData2 = Object.assign({}, testData);
    var model = loopback.getModel(modelName, bootstrap.defaultContext);
    model.upsert(testData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log('-------', res);
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res.name).to.be.equal('calcutta');

        model.upsert(testData2, bootstrap.defaultContext, function (err, res1) {
          if (err) {
            done(err);
          } else {
            // console.log('-------', res1);
            expect(res1).not.to.be.null;
            expect(res1).not.to.be.empty;
            expect(res1).not.to.be.undefined;
            expect(res1.name).to.be.equal('calcutta');

            model.find({
              where: {
                name: 'calcutta'
              }
            }, bootstrap.defaultContext, function (err, res2) {
              if (err) {
                done(err);
              } else {
                // console.log('-------', res2);
                expect(res2).not.to.be.null;
                expect(res2).not.to.be.empty;
                expect(res2).not.to.be.undefined;
                expect(res2.length).to.be.equal(1);
                done();
              }
            });
          }
        });
      }
    });
  });

  it('- Test for Idempotent behaviour - update attribute ', function (done) {
    var model = loopback.getModel(modelName, bootstrap.defaultContext);

    model.find({
      where: {
        name: 'Bangalore'
      }
    }, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else if (res.length) {
        // console.log('---', res);
        var testData = res[0];
        testData.name = 'Bengaluru';
        res[0]._newVersion = '30';
        res[0].updateAttribute('name', 'Bengaluru', bootstrap.defaultContext, function (err, res1) {
          if (err) {
            done(err);
          } else {
            // console.log('-------', res1);
            expect(res1).not.to.be.null;
            expect(res1).not.to.be.empty;
            expect(res1).not.to.be.undefined;
            expect(res1.name).to.be.equal('Bengaluru');
            res[0].updateAttribute('name', 'Bengaluru', bootstrap.defaultContext, function (err, res2) {
              if (err) {
                done(err);
              } else {
                // console.log('-------', res2);
                expect(res2).not.to.be.null;
                expect(res2).not.to.be.empty;
                expect(res2).not.to.be.undefined;
                expect(res2.name).to.be.equal('Bengaluru');
                model.find({
                  where: {
                    name: 'Bengaluru'
                  }
                }, bootstrap.defaultContext, function (err, res3) {
                  if (err) {
                    done(err);
                  } else {
                    // console.log('-------', res3);
                    expect(res3).not.to.be.null;
                    expect(res3).not.to.be.empty;
                    expect(res3).not.to.be.undefined;
                    expect(res3.length).to.be.equal(1);
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

  it('- Test for Idempotent behaviour - update attributes ', function (done) {
    var model = loopback.getModel(modelName, bootstrap.defaultContext);

    model.find({
      where: {
        name: 'calcutta'
      }
    }, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else if (res.length) {
        // console.log('---', res);
        var testData = res[0].toObject();
        testData.name = 'Kolkata';
        testData._newVersion = '40';
        testData._version = res[0]._version;
        var testData2 = Object.assign({}, testData);
        res[0].updateAttributes(testData, bootstrap.defaultContext, function (err, res1) {
          if (err) {
            done(err);
          } else {
            // console.log('-------', res1);
            expect(res1).not.to.be.null;
            expect(res1).not.to.be.empty;
            expect(res1).not.to.be.undefined;
            expect(res1.name).to.be.equal('Kolkata');
            res[0].updateAttributes(testData2, bootstrap.defaultContext, function (err, res2) {
              if (err) {
                done(err);
              } else {
                // console.log('-------', res2);
                expect(res2).not.to.be.null;
                expect(res2).not.to.be.empty;
                expect(res2).not.to.be.undefined;
                expect(res2.name).to.be.equal('Kolkata');
                model.find({
                  where: {
                    name: 'Kolkata'
                  }
                }, bootstrap.defaultContext, function (err, res3) {
                  if (err) {
                    done(err);
                  } else {
                    // console.log('-------', res3);
                    expect(res3).not.to.be.null;
                    expect(res3).not.to.be.empty;
                    expect(res3).not.to.be.undefined;
                    expect(res3.length).to.be.equal(1);
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

  it('- Test for Idempotent behaviour - updateById ', function (done) {
    var model = loopback.getModel(modelName, bootstrap.defaultContext);
    var testData = {
      'name': 'Madras',
      '_newVersion': 'M1'
    };
    model.create(testData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log('-------', res);
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res.name).to.be.equal('Madras');
        var id = res.id;
        var testData1 = {};
        testData1.id = id;
        testData1.name = 'Chennai';
        testData1._newVersion = 'M2';
        testData1._version = res._version;
        var testData2 = Object.assign({}, testData1);
        model.upsert(testData1, bootstrap.defaultContext, function (err, res1) {
          if (err) {
            done(err);
          } else {
            // console.log('-------', res1);
            expect(res1).not.to.be.null;
            // expect(res1).not.to.be.empty;
            // expect(res1).not.to.be.undefined;
            // expect(res1.count).to.be.equal(1);
            model.upsert(testData2, bootstrap.defaultContext, function (err, res2) {
              if (err) {
                done(err);
              } else {
                // console.log('-------', res2);
                expect(res2).not.to.be.null;
                // expect(res2).not.to.be.empty;
                // expect(res2).not.to.be.undefined;
                // expect(res2.count).to.be.equal(1);
                model.find({
                  where: {
                    name: 'Chennai'
                  }
                }, bootstrap.defaultContext, function (err, res3) {
                  if (err) {
                    done(err);
                  } else {
                    // console.log('-------', res3);
                    expect(res3).not.to.be.null;
                    expect(res3).not.to.be.empty;
                    expect(res3).not.to.be.undefined;
                    expect(res3.length).to.be.equal(1);
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

  // Update and UpdateAll are going via same flow in "before connector"
  // the way of doing upsert with current version is not clear in updateall.
  // This will be taken up later - As of now, we do not support updateAll
  xit('- Test for Idempotent behaviour - updateAll ', function (done) {
    var model = loopback.getModel(modelName, bootstrap.defaultContext);
    var testData = {
      'name': 'Mysore',
      '_newVersion': 'C1'
    };
    model.create(testData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        model.updateAll({
          name: 'Mysore',
          _version: res._version
        }, {
            name: 'Mysuru'
          }, bootstrap.defaultContext, function (err, res1) {
            if (err) {
              done(err);
            } else {
              // console.log('-------', res1);
              expect(res1).not.to.be.null;
              expect(res1).not.to.be.empty;
              expect(res1).not.to.be.undefined;
              expect(res1.count).to.be.equal(1);
              done();
            }
          });
      }
    });

  });

  it('- Test for Idempotent behaviour - findOrCreate', function (done) {
    var model = loopback.getModel(modelName, bootstrap.defaultContext);
    var testData = {
      'name': 'Delhi',
      '_newVersion': 'D1'
    };
    model.findOrCreate({
      where: {
        name: 'Delhi'
      }
    }, testData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log("-------", res);
        model.findOrCreate({
          where: {
            name: 'Delhi'
          }
        }, testData, bootstrap.defaultContext, function (err, res1) {
          if (err) {
            done(err);
          } else {
            // console.log('-------', res1);
            expect(res1).not.to.be.null;
            expect(res1).not.to.be.empty;
            expect(res1).not.to.be.undefined;
            model.find({
              where: {
                name: 'Delhi'
              }
            }, bootstrap.defaultContext, function (err, res3) {
              if (err) {
                done(err);
              } else {
                // console.log('-------', res3);
                expect(res3).not.to.be.null;
                expect(res3).not.to.be.empty;
                expect(res3).not.to.be.undefined;
                expect(res3.length).to.be.equal(1);
                done();
              }
            });
          }
        });
      }
    });
  });

  //For deleteById, destroyById, removeById
  it('- Test for Idempotent behaviour - destroyById ', function (done) {
    var model = loopback.getModel(modelName, bootstrap.defaultContext);
    var testData = {
      'name': 'Mumbai',
      '_newVersion': 'did10'
    };
    model.create(testData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res.name).to.be.equal('Mumbai');
        model.destroyById(res.id, bootstrap.defaultContext, function (err, res1) {
          if (err) {
            done(err);
          } else {
            // console.log('-------', res1);
            expect(res1).not.to.be.null;
            expect(res1).not.to.be.empty;
            expect(res1).not.to.be.undefined;
            expect(res1.count).to.be.equal(1);
            model.destroyById(res.id, bootstrap.defaultContext, function (err, res2) {
              if (err) {
                done(err);
              } else {
                // console.log('-------', res2);
                expect(res2).not.to.be.null;
                expect(res2).not.to.be.empty;
                expect(res2).not.to.be.undefined;
                expect(res2.count).to.be.equal(1);
                model.find({
                  where: {
                    name: 'Mumbai'
                  }
                }, bootstrap.defaultContext, function (err, res3) {
                  if (err) {
                    done(err);
                  } else {
                    // console.log('-------', res3);
                    expect(res3).not.to.be.undefined;
                    expect(res3.length).to.be.equal(0);
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

  //For deleteAll, destroyAll, remove
  it('- Test for Idempotent behaviour - destroyAll ', function (done) {
    var model = loopback.getModel(modelName, bootstrap.defaultContext);
    var options = bootstrap.defaultContext;
    options.requestId = '1001';
    model.destroyAll({}, options, function (err, res1) {
      if (err) {
        done(err);
      } else {
        expect(res1).not.to.be.null;
        expect(res1).not.to.be.empty;
        expect(res1).not.to.be.undefined;
        expect(res1.count).to.be.equal(4);
        options.requestId = '1001';
        model.destroyAll({}, options, function (err, res2) {
          if (err) {
            done(err);
          } else {
            expect(res2).not.to.be.null;
            expect(res2).not.to.be.empty;
            expect(res2).not.to.be.undefined;
            expect(res2.count).to.be.equal(4);
            model.find({
              where: {
                name: 'Mumbai'
              }
            }, bootstrap.defaultContext, function (err, res3) {
              if (err) {
                done(err);
              } else {
                expect(res3).not.to.be.undefined;
                expect(res3.length).to.be.equal(0);
                done();
              }
            });
          }
        });
      }
    });
  });

  it('- Test for Idempotent behaviour - create (array of records) ', function (done) {
    var testData = [
      {
        'name': 'Agra',
        '_newVersion': 'x1'
      },
      {
        'name': 'Jaipur',
        '_newVersion': 'y1'
      },
      {
        'name': 'Poona',
        '_newVersion': 'z1'
      }
    ];
    var testData2 = JSON.parse(JSON.stringify(testData));
    var model = loopback.getModel(modelName, bootstrap.defaultContext);
    model.create(testData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log('-------', res);
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res.length).to.be.equal(3);
        model.create(testData2, bootstrap.defaultContext, function (err, res1) {
          if (err) {
            done(err);
          } else {
            // console.log('-------', res1);
            expect(res1).not.to.be.null;
            expect(res1).not.to.be.empty;
            expect(res1).not.to.be.undefined;
            expect(res1.length).to.be.equal(3);

            model.find({}, bootstrap.defaultContext, function (err, res2) {
              if (err) {
                done(err);
              } else {
                // console.log('-------', res2);
                expect(res2).not.to.be.null;
                expect(res2).not.to.be.empty;
                expect(res2).not.to.be.undefined;
                expect(res2.length).to.be.equal(3);
                done();
              }
            });

          }
        });
      }
    });
  });

  it('- Test for Idempotent behaviour - upsert (array of records)', function (done) {
    var testData = [
      {
        'name': 'Shimla',
        '_newVersion': 's1'
      }
    ];

    var model = loopback.getModel(modelName, bootstrap.defaultContext);
    model.find({
      where: {
        name: 'Poona'
      }
    }, bootstrap.defaultContext, function (err, record) {
      if (err) {
        done(err);
      } else {
        // console.log('---------', record);
        expect(record).not.to.be.null;
        expect(record).not.to.be.empty;
        expect(record).not.to.be.undefined;
        record[0].name = 'pune';
        record[0]._newVersion = 'z2';
        testData.push(record[0]);
        var testData2 = JSON.parse(JSON.stringify(testData));
        model.upsert(testData, bootstrap.defaultContext, function (err, res) {
          if (err) {
            done(err);
          } else {
            // console.log('-------', res);
            expect(res).not.to.be.null;
            expect(res).not.to.be.empty;
            expect(res).not.to.be.undefined;
            expect(res.length).to.be.equal(2);

            model.upsert(testData2, bootstrap.defaultContext, function (err, res1) {
              if (err) {
                done(err);
              } else {
                // console.log('-------', res1);
                expect(res1).not.to.be.null;
                expect(res1).not.to.be.empty;
                expect(res1).not.to.be.undefined;
                expect(res1.length).to.be.equal(2);

                model.find({}, bootstrap.defaultContext, function (err, res2) {
                  if (err) {
                    done(err);
                  } else {
                    // console.log('-------', res2);
                    expect(res2).not.to.be.null;
                    expect(res2).not.to.be.empty;
                    expect(res2).not.to.be.undefined;
                    expect(res2.length).to.be.equal(4);
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

  it('- Test for Idempotent behaviour - updating an already updated record ', function (done) {
    var testData = {
      'name': 'Ooty',
      '_newVersion': 'o1'
    };
    var model = loopback.getModel(modelName, bootstrap.defaultContext);
    model.create(testData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        // console.log('-------', res);
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res.name).to.be.equal('Ooty');

        var updateData1 = {};
        updateData1.name = 'Udhagamandalam';
        updateData1._newVersion = 'o2';
        updateData1._version = res._version;
        updateData1.id = res.id;

        model.upsert(updateData1, bootstrap.defaultContext, function (err, res1) {
          if (err) {
            done(err);
          } else {
            // console.log('-------', res1);
            expect(res1).not.to.be.null;
            expect(res1).not.to.be.empty;
            expect(res1).not.to.be.undefined;
            expect(res1.name).to.be.equal('Udhagamandalam');

            var updateData2 = {};
            updateData2.name = 'Udhagamandalam';
            updateData2._newVersion = 'o3';
            updateData2._version = res._version;
            updateData2.id = res.id;
            model.upsert(updateData2, bootstrap.defaultContext, function (err, res2) {
              if (err) {
                // console.log('-------------', err);
                expect(err.type).to.be.equal('DataModifiedError');
                done();
              } else {
                done(new Error('Should not update the record which is already updated'));
              }
            });

          }
        });
      }
    });
  });

  it('- Test for Idempotent behaviour - updating a deleted record ', function (done) {
    var testData = {
      'name': 'Cochin',
      '_newVersion': 'co1'
    };

    var model = loopback.getModel(modelName, bootstrap.defaultContext);
    model.create(testData, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      } else {
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res.name).to.be.equal('Cochin');

        model.destroyById(res.id, bootstrap.defaultContext, function (err, res1) {
          if (err) {
            done(err);
          } else {
            expect(res1).not.to.be.null;
            expect(res1).not.to.be.empty;
            expect(res1).not.to.be.undefined;
            expect(res1.count).to.be.equal(1);
            var updateData = res;
            updateData._newVersion = 'co2';
            updateData.name = 'Kochi';
            updateData._version = 'co1';

            model.upsert(updateData, bootstrap.defaultContext, function (err, res2) {
              if (err) {
                expect(err.type).to.be.equal('DataDeletedError');
                done();
              } else {
                done('Error: Should not be bale to modify deleted record');
              }
            });

          }
        });
      }
    });
  });
});
