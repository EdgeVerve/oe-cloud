/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var bootstrap = require('../bootstrap');
var app = bootstrap.app;
if (process.argv[3] && !isNaN(parseInt(process.argv[3]))) {
  app.set('port', process.argv[3]);
}
var chai = bootstrap.chai;
var expect = chai.expect;
var models = bootstrap.models;
var modelName = 'ConsistentHashModel';
var os = require('os');

describe('Consistent Hash Server', function () {
  var model;
  before('Create Model and Upload Data', function (done) {
    this.timeout(4000);
    bootstrap.login(function (accessToken) {
      console.log("AccessToken ", accessToken);
    });
    // Change to findOrCreate
    models.ModelDefinition.findOne({ 'where': { 'name': modelName } }, bootstrap.defaultContext, function (err, res) {
      if (!res) {
        var consistHashModel = {
          name: modelName,
          base: 'BaseEntity',
          plural: 'ConsistentHashModels',
          options: {
            validateUpsert: true,
            proxyEnabled: true
          },
          properties: {
            accountName: {
              type: 'string',
              required: true
            },
            limitAmount: {
              type: 'number',
              default: 0
            },
            portNumber: {
              type: 'string'
            },
            hostname: {
              type: 'string'
            }
          },
          filebased: false
        };
        models.ModelDefinition.create(consistHashModel, bootstrap.defaultContext, function (err, model) {
          if (err) {
            console.log(err);
          }
          expect(err).to.be.null;
          model = loopback.getModel(modelName, bootstrap.defaultContext);
          checkAndCreateData(done);
        });
      } else {
        checkAndCreateData(done);
      }
    });

    function checkAndCreateData(done) {
      // Change to findOrCreate
      model.find({ where: { id: { inq: ['consist-101', 'consist-201'] } } }, bootstrap.defaultContext, function (err, val) {
        if (val.length > 0) {
          done();
        } else {
          model.create([{ accountName: 'tywin', id: 'consist-101' }, { accountName: 'tyrion', id: 'consist-201' }], bootstrap.defaultContext, function (err, res) {
            done();
          });
        }
      });
      model.report = function report1(options, cb) {

        model.findById('consist-101', options, function (err, rec1) {
          if (err) {
            return cb(err, {});
          }
          model.findById('consist-201', options, function (err, rec2) {
            if (err) {
              return cb(err, {});
            }
            var data = {
              acct1: rec1,
              acct2: rec2
            }
            return cb(err, data);
          });
        });
      };
      model.remoteMethod('report', {
        description: 'Report of Getting accounts by id\'s and combining them.',
        accessType: 'READ',
        accepts: [
        ],
        http: {
          verb: 'GET',
          path: '/report'
        },
        returns: {
          type: 'object',
          root: true
        }
      });
      model.observe('after accesss', function (ctx, next) {
        var data = ctx.instance || ctx.currentInstance || ctx.data || ctx.accdata;
        if (data) {
          if (Array.isArray(data) || data === Array) {
            data.forEach(function (item) {
              item.portNumber = app.get('port');
              item.hostname = os.hostname();
            });
          } else {
            data.portNumber = app.get('port');
            data.hostname = os.hostname();
          }
        }
        next();
      });
      model.customUpdateAttributes = function (options, cb) {

        model.findById('consist-101', options, function (err, rec1) {
          if (err) {
            return cb(err);
          }
          rec1.limitAmount = rec1.limitAmount + 1000;
          rec1.updateAttributes(rec1, options, function (err, rec1) {
            model.findById('consist-201', options, function (err, rec2) {
              if (err) {
                return cb(err);
              }
              rec2.limitAmount = rec2.limitAmount + 1000;
              rec2.updateAttributes(rec2, options, function (err, rec2) {
                var data = {
                  acct1: rec1,
                  acct2: rec2
                };
                cb(err, data);
              });
            });
          });
        });
      };

      model.remoteMethod('customUpdateAttributes', {
        description: 'increarse limit amount by 1000 for consist-101, consist-201',
        accessType: 'WRITE',
        accepts: [
        ],
        http: {
          verb: 'GET',
          path: '/customUpdateAttributes'
        },

        returns: {
          type: 'object',
          root: true
        }
      });

      model.customUpsert = function (options, cb) {

        model.findById('consist-101', options, function (err, rec1) {
          if (err) {
            return cb(err);
          }
          rec1.limitAmount = rec1.limitAmount + 1000;
          model.upsert(rec1, options, function (err, rec1) {
            model.findById('consist-201', options, function (err, rec2) {
              if (err) {
                return cb(err);
              }
              rec2.limitAmount = rec2.limitAmount + 1000;
              model.upsert(rec2, options, function (err, rec2) {
                var data = {
                  acct1: rec1,
                  acct2: rec2
                };
                cb(err, data);
              });
            });
          });
        });
      };
      model.remoteMethod('customUpsert', {
        description: 'Custom Upsert',
        accessType: 'WRITE',
        accepts: [
        ],
        http: {
          verb: 'GET',
          path: '/customUpsert'
        },
        returns: {
          type: 'object',
          root: true
        }
      });
    }
  });

  it('Waiting for Client requests.', function (done) {
    this.timeout(242000);
    setTimeout(function () {
      done();
    }, 240000);
  });


});
