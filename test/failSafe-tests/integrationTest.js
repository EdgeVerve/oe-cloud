var request = require('request');
var async = require('async');
var uuid = require('node-uuid');
var chai = require('chai');
var expect = chai.expect;
var chalk = require('chalk');

const Docker = require('node-docker-api').Docker
const docker = new Docker({ socketPath: '/var/run/docker.sock' })

var baseurl = "https://$EVFURL/api/";

var modelPlural = 'Notes';

var createLoginData = {"username":"admin","password":"admin","email":"ev_admin@edgeverve.com"};

var loginData = {"username":"admin","password":"admin"};

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var token;

var ids = []; 

ids.push("a");
ids.push("b");
ids.push("c");
ids.push("d");
ids.push("e");
ids.push("f");
ids.push("g");
ids.push("h");
ids.push("i");
ids.push("j");

var tempIds = [];

var funcArray = [];

describe(chalk.blue('Failsafe - integrationTest'), function() {
    //this.timeout(180000);

  before('login using admin', function fnLogin(done) {
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
                      token = body.id;
                      //setup(body.id);
                      done();
                    }
      });

  });


  it('Recover - Default sceanrio', function (done) {
    //create 50 note records 
    for (var i=0; i<50; i++){
      var createUrl = baseurl + modelPlural + "/" + i + "/" + '?access_token=' + token;
      request.post({
        url: createUrl,
        json: {},
        headers: {},
        method: 'POST'
      }, function (error, r, body) {
          done(error, body.id);
      });

    }
   
    async.series({
      one : function(callback){
            docker.container.list()
                .then(function(containers) {
                  var listSize = containers.length;
                  console.log("Number of containers" + listSize);
                  callback();
                  });
      },
      two: function(callback) {
          // Scale down one serevr
          docker.container.name(APP_IMAGE_NAME)
            .then(function (container){
              var cId = container.id;
              Console.log ("deleted conatiner id: " + cId);
              container.delete({ force: true })
              callback();
            });
      },
      three: function(callback){
        // Wait 
          setTimeout(function() {
              callback(null, 2);
          }, 5*60*1000);
      }, 
      four: function (callback){
        // check container size 
        docker.container.list()
          .then(function(containers) {
            var listSize = containers.length;
            console.log("Number of containers" + listSize);
            callback();
      });
      }
    }, function(err, results) {
        // results is now equal to: {one: 1, two: 2}
        done();
    });
  });
});