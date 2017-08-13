var request = require('request');
var async = require('async');
//var uuid = require('node-uuid');
// var chai = require('chai');
// var expect = chai.expect;
var chalk = require('chalk');
var exec = require('child_process').exec;

var APP_IMAGE_NAME = process.env.APP_IMAGE_NAME;
var  DOMAIN_NAME = process.env.DOMAIN_NAME;
const SERVICE_NAME = APP_IMAGE_NAME + "_web";

//var baseurl = "https://$EVFURL/api/";
//var baseurl = "https://mayademo.oecloud.local/api/";
var baseurl = "https://" + APP_IMAGE_NAME + "." + DOMAIN_NAME + "/api/";

var modelPlural = 'Notes';
var eventHistoryPlural = 'EventsHistroy/';
var EventHistoryModel;

var createLoginData = {"username":"admin","password":"admin","email":"ev_admin@edgeverve.com"};



process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var token;

describe(chalk.blue('Failsafe - integrationTest'), function() {
  
  before('login using admin', function fnLogin(done) {
    var loginData = {"username":"admin","password":"admin"};
    console.log('Base Url is ', baseurl);
    
    request.post(
      baseurl + "BaseUsers/login", {
        json: loginData
      },
      function(error, response, body) {
        if (error || body.error) {
          console.log("error:", error || body.error);
          done(error || body.error);
        } else {
          console.log("success");
          token = body.id;
          done();
        }
      });
  });

  var checkServiceCount = (x, cb) => {
    console.log('checkServiceCount ', x);
    exec ("docker service ps " + SERVICE_NAME + " --format '{{json .ID}}' | wc -l", (err, stdout) => {
      if (err) {
        console.log("Error in getServiceCount: " + err)
      } else {
        var countStatus = stdout;
        if (countStatus != x){
          console.log('checkServiceCount - waiting ');
          console.log("checkServiceCount - Status: " + countStatus + ", expected: " + x );
          setTimeout(checkServiceCount, 100, x, cb);
        } else {
          console.log('checkServiceCount - finished');
          cb();
        }
      }
    });
  }

  it('Recover - Default sceanrio', function (done) {
    var eventHistoryStatus = {};
    eventHistoryStatus.undefined = 0;
    eventHistoryStatus.RecoveryFinished = 0;
    eventHistoryStatus.ToBeRecovered = 0;
    eventHistoryStatus.InRecovery = 0;
    
    async.series({
      clearHistory: (callback) => {

        console.log("At clear history");
        request.get({
            url: baseurl + eventHistoryPlural + '?access_token=' + token,
            strictSSL : false,
            json: true,
            headers: {
                'tenantId': 'default',
                'Accept': 'application/json'
            }
          }, 
          function(error, response, body) {
            if (err) console.log("error in fetching event-history records:", error || body.error);
            console.log("Recived event history records");
            console.log(body);
            var eventHistoryRecords = body;

            eventHistoryRecords.forEach((eventHistoryRecord) => {
              console.log("Tring to delete " + eventHistoryRecord.id);
              request.delete(
                baseurl + eventHistoryPlural + eventHistoryRecord.id + '?access_token=' + token,
                function(error, response, body) {
                  if (error || body.error) {
                    console.log("error in deleting event-history record:", error || body.error);
                  } 
                  console.log("Delete success" );                  
                }
              );
            }, (err)=> {
              callback();
            })
        });
      },
      scaleServiceCountUp: function(callback){
        console.log('scaleServiceCountUp');
        // load 5 node servers
        exec("docker service scale " + SERVICE_NAME + "=5", (err, stdout) => {
          if (err) console.log("Error in func One: " + err);
          checkServiceCount(5, callback);  
        })
      },
      initiateNodes: function(callback) {
        // create multipel nodes
        console.log('create 50 note records');
        for (var i=0; i<100; i++){
          var createUrl = baseurl + modelPlural + "/" + i + "/" + '?access_token=' + token;
          request.post({
            url: createUrl,
            json: {},
            headers: {},
            method: 'POST'
          }, function (error, r, body) { });
        }
        callback();    
      },
      scaleServiceCountDown: function(callback){
        console.log('scaleServiceCountDown');
        //scale down 3 nodes 
        exec("docker service scale " + SERVICE_NAME + "=3", (err, stdout) => {
          if (err) console.log("Error in func One: " + err);
          checkServiceCount(3, callback);  
        })
      }, 
      checkDeadNodesStatus: function (callback){
        console.log('checkDeadNodesStatus');
        // query event history model to verify nodes where recovered 
        eventHistoryModel = getEventHistoryModel();
        eventHistoryModel.find({}, ignoreScopeOptions, function (err, results) {
          
          results.array.forEach(function(eventHistoryRecord) {
            var sttaus  = eventHistoryRecord.status;
            eventHistoryStatus[status]++;
          }, this);
          callback();
        });
      }
    }, function(err, results) {
        // results is now equal to: {one: 1, two: 2}
        console.log(eventHistoryStatus);
        done();
    });
  });
});