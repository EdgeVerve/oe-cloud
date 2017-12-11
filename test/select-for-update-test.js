/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

var bootstrap = require('./bootstrap');
var chalk = require('chalk');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var async = require('async');
var baseUrl = bootstrap.basePath;
var uuidv4 = require('uuid/v4');
var loopback = require('loopback');
var _ = require('lodash');
if (!process.env.PERF_TEST ||
    (process.env.NODE_ENV && process.env.NODE_ENV !== 'postgres')) {
  return
}

describe(chalk.blue('select for update performance test'), function() {

    var transactionModel = 'SelForUpdTransaction';
    var activityModel = 'ActorActivity';
    var accountBalanceModel = 'SelForUpdAccountBalance';
    var transactionModelPlural = transactionModel + 's';
    var accountBalanceModelPlural = accountBalanceModel + 's';
    var transactionUrl = baseUrl + '/' + transactionModelPlural;

    this.timeout(300000);
    var accessToken;
    var newContext = function() {
      return {
        ctx: {
          tenantId: 'default',
          remoteUser: 'admin'
        }
      };
    };

    it('login', function(done) {
      var postUrl = baseUrl + '/BaseUsers/login';
      var credentials = {username: 'admin', password: 'admin'};
      var api = defaults(supertest(bootstrap.app));

      // without jwt token
      api.set('Accept', 'application/json')
        .set('tenant_id', 'default')
        .post(postUrl)
        .send(credentials)
        .expect(200).end(function(err, response) {
          accessToken = response.body.id;
          done();
        });
    });

    it('Create Models', function(done) {
      var transactionModelData = {
        name: transactionModel,
        plural: transactionModelPlural,
        base: 'BaseEntity',
        properties: {
          activities: [activityModel]
        }
      };

      var accountBalanceModelData = {
        name: accountBalanceModel,
        base: 'BaseEntity',
        overridingMixins: {
          ModelValidations: false,
          DataPersonalizationMixin: false,
          HistoryMixin: false,
          IdempotentMixin: false,
          EvVersionMixin: false,
          FailsafeObserverMixin: false,
          BusinessRuleMixin: false,
          SoftDeleteMixin: true,
          AuditFieldsMixin: true,
          ExpressionAstPopulatorMixin: false,
          CryptoMixin: false,
          PropertyExpressionMixin: false
        },
        properties: {
          amount: 'number'
        }
      };

      var postUrl = baseUrl + '/ModelDefinitions?access_token=' + accessToken;
      var createModel = function(x, cb) {
        var api = defaults(supertest(bootstrap.app));
        api.set('Accept', 'application/json')
            .post(postUrl)
            .send(x)
            .end(function(err, resp) {
                if (err) {
                    cb();
                } else {
                    if (resp.status === 400) {
                        cb();
                    } else if (resp.status === 422) {
                        cb();
                    } else {
                        expect(200);
                        cb();
                    }
                }
            });
      }
      async.eachSeries([transactionModelData, accountBalanceModelData], (x,cb) => createModel(x,cb), done);
    });

    it('cleanup existing data', function(done) {
      var AccountBalance = loopback.findModel(accountBalanceModel, ctx);
      var Transaction = loopback.findModel(transactionModel, ctx);
      var ctx = newContext();
      AccountBalance.destroyAll({}, ctx, function(err) {
        Transaction.destroyAll({}, ctx, function(err) {
          done();
        });
      });
    });

    it('Attach business logic to transaction model', function(done) {
      var ctx1 = newContext();
      var Transaction = loopback.findModel(transactionModel, ctx1);
      var AccountBalance = loopback.findModel(accountBalanceModel, ctx1);
      var TxnLogic = function(model) {
        model.observe('persist', function(ctx, next) {
          model.beginTransaction({
                isolationLevel: model.Transaction.READ_COMMITTED,
                timeout: 30000
            }, function(err, tx) {
              if (err)
                console.log('Unable to start transaction ', err);
              ctx.options.transaction = tx;
              var instance = ctx.instance || ctx.currentInstance || ctx.data;
              var accountList = JSON.parse(JSON.stringify(instance.activities.map(x=>x.entityId)));
              var filter = { where: { id: {inq: accountList}}, selectForUpdate: true};
              AccountBalance.find(filter, ctx.options, function(err, data) {
                data.forEach(function(accountBalance) {
                    var activity = instance.activities.find(x=> x.entityId == accountBalance.id);
                    var delta = activity.instructionType == 'C' ? activity.payload.amount : -activity.payload.amount;
                    accountBalance.amount += delta;
                });
                async.forEach(data, (acct, cb) => AccountBalance.upsert(data, ctx.options, (err, data) => cb(err)) , next)
              });
            });
        });
        model.observe('after save', function(ctx, next) {
          if (ctx.options.transaction) {
            ctx.options.transaction.commit(ctx.options, function(err) {
              next();
            });
          } else {
            console.log('transaction object is missing');
          }
        });
      }
      TxnLogic(Transaction);
      done();
    });

    var accountNumbersArray = Array.from(new Array(1000), (x,i) => (i+1).toString())

    it('Create account balance data', function(done) {
      var postUrl = baseUrl + '/' + accountBalanceModelPlural + '?access_token=' + accessToken;
      var createData = function(x, cb) {
        var api = defaults(supertest(bootstrap.app));
        api.set('Accept', 'application/json')
            .post(postUrl)
            .send(x)
            .end(function(err, resp) {
                if (err) {
                    cb();
                } else {
                    if (resp.status === 400) {
                        cb();
                    } else if (resp.status === 422) {
                        cb();
                    } else {
                        expect(200);
                        cb();
                    }
                }
            });
      }
      var accountBalanceData = accountNumbersArray.map(x=>{return {id:x,balance:0}});

      // do POST async with concurrency of 10
      async.eachSeries(_.chunk(accountBalanceData, 10), (x1,cb1) => async.forEach(x1, (x2,cb2)=>createData(x2,cb2), cb1), done);
    });

    it('Do transaction post', function(done) {
      var postUrl = baseUrl + '/' + transactionModelPlural + '?access_token=' + accessToken;
      var createData = function(x, cb) {
        var api = defaults(supertest(bootstrap.app));
        api.set('Accept', 'application/json')
            .post(postUrl)
            .send(x)
            .end(function(err, resp) {
                if (err) {
                    cb();
                } else {
                    if (resp.status === 400) {
                        cb();
                    } else if (resp.status === 422) {
                        cb();
                    } else {
                        expect(200);
                        cb();
                    }
                }
            });
      }
      var txnData = accountNumbersArray.map(x=>{return {activities:[{entityId: x, payload: {amount: 1}, instructionType: "C"}]}});
      
      async.eachSeries(_.chunk(txnData, 10), (x1,cb1) => async.forEach(x1, (x2,cb2)=>createData(x2,cb2), cb1), done);
    });

    after('after clean up', function(done) {
        done();
    });
});
