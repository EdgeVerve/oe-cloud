/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var request = require('request');
var async = require('async');
var chai = require('chai');
var expect = chai.expect;
var chalk = require('chalk');
var exec = require('child_process').exec;

const APP_IMAGE_NAME = process.env.APP_IMAGE_NAME;
const  DOMAIN_NAME = process.env.DOMAIN_NAME;
const SERVICE_NAME = APP_IMAGE_NAME + '_web';

var baseurl = 'https://' + APP_IMAGE_NAME + '.' + DOMAIN_NAME + '/api/';

var modelPlural = 'Notes/';
var eventHistoryPlural = 'EventsHistroy/';
var headers = {'tenantId': 'default', 'Accept': 'application/json'};
var eventHistoryRecords;
var results;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var token;

describe(chalk.blue('Failsafe - integrationTest'), function () {
  before('login using admin', function fnLogin(done) {
    var loginData = {'username': 'admin', 'password': 'admin'};
    console.log('Base Url is ', baseurl);
    request.post(
      baseurl + 'BaseUsers/login', {
        json: loginData
      },
      function (error, response, body) {
        if (error || body.error) {
          console.log('error:', error || body.error);
          done(error || body.error);
        } else {
          expect(response.statusCode).to.equal(200);
          console.log('login using admin - success - ' + body.id);
          token = body.id;
          eventHistoryRecords = {
            url: baseurl + eventHistoryPlural + '?access_token=' + token,
            strictSSL: false, json: true, 'headers': headers
          };
          done();
        }
      });
  });

  var scaleTo = (n, cb) => {
    exec('docker service scale ' + SERVICE_NAME + '=' + n, (err, stdout) => {
      if (err) console.log('Error in func One: ' + err);
      verifyScale(n, cb);
    });
  };

  var verifyScale = (n, cb) => {
    exec('docker service ps ' + SERVICE_NAME + ' --format "{{json .CurrentState}}" | grep Running | wc -l', (err, stdout) => {
      if (err) {
        setTimeout(verifyScale, 100, n, cb);
      } else {
        var countStatus = parseInt(stdout, 10);
        if (countStatus !== n) {
          setTimeout(verifyScale, 5000, n, cb);
        } else {
          cb();
        }
      }
    });
  };

  var getServiceStatus = (callback) => {
    console.log("Step 5: get eventHistoryRecord status.");
    initResults();
    request.get(eventHistoryRecords, function (error, response, records) {
      if (error) {
        console.log('Step 5: error accord while fetching eventHistoryRecords: ' + error);
        return callback(error);
      }
      expect(response.statusCode).to.equal(200);
      expect(records.length).to.not.equal(0);
      var status;
      records.forEach((eventHistoryRecord) => {
        results[eventHistoryRecord.status]++;
      }, this);
      console.log(results);
      if (results.RecoveryFinished < 2) {
        setTimeout(getServiceStatus, 5*5000, callback);
       } else {
        console.log("Step 5: 2 dead hosts where recovered.");        
         return callback();
       }
    });
  };

  var initResults = () => {
    results = {};
    results.undefined = 0;
    results.RecoveryFinished = 0;
    results.ToBeRecovered = 0;
    results.InRecovery = 0;
  };

  it('Recover - Default sceanrio', function (done) {
    async.series({
      scaleServiceTo5: (callback) => {
        console.log('Step 2: scale service to 5.');
        scaleTo(5,callback);
      },
      createModelInstances: (callback) => {
        console.log('Step 3: creat model instaces.');
        var createUrl = baseurl + modelPlural + '?access_token=' + token;
        async.times(100, (i, next) => {
          request.post({url: createUrl, json: {}, headers: headers, method: 'POST'}, function (error, r, body) {
            expect(r.statusCode).to.equal(200);
            return next(null, body.id);
          });
        }, (err, results) => {
          if (err) {
            return done(err);
          }
          return callback();
        });
      },
      scaleServiceCountDown: (callback) => {
        console.log('Step 4: scale services down to 3');
        scaleTo(3, callback);
      },
      getServiceStatus: getServiceStatus
    }, (err) => {
      console.log('Step 6: done.')
      if (err) {
        return done(err);
      }
      
      if (results.RecoveryFinished === 2 ) {
        return done();
      }
      console.log('Test failed, please view the results below');
      console.log(results);
      return done(new Error('Not All dead hosts were recoverd'));
    });
  });
});
