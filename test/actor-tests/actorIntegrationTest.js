var request = require('request');
var async = require('async');
var uuid = require('node-uuid');
var chai = require('chai');
var expect = chai.expect;
var chalk = require('chalk');

var baseurl = "https://$EVFURL/api/";

var actorPlural = 'Inventories';

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

describe(chalk.blue('integrationTest'), function() {
    this.timeout(120000);

  function checkBalance(num, next) {
    if (!token) {
        console.log('login failed');
        process.exit(-100);
    }
    console.log(token);


    var urls = [];
    urls.push(baseurl + actorPlural + "/a/" + '?access_token=' + token);
    urls.push(baseurl + actorPlural + "/b/" + '?access_token=' + token);
    urls.push(baseurl + actorPlural + "/c/" + '?access_token=' + token);
    urls.push(baseurl + actorPlural + "/d/" + '?access_token=' + token);
    urls.push(baseurl + actorPlural + "/e/" + '?access_token=' + token);
    urls.push(baseurl + actorPlural + "/f/" + '?access_token=' + token);
    urls.push(baseurl + actorPlural + "/g/" + '?access_token=' + token);
    urls.push(baseurl + actorPlural + "/h/" + '?access_token=' + token);
    urls.push(baseurl + actorPlural + "/i/" + '?access_token=' + token);
    urls.push(baseurl + actorPlural + "/j/" + '?access_token=' + token);

    var funcCheckArray = [];

     function check1Balance(done) {
       var url = urls.pop();
        request.get(
            {
                url: url,
                strictSSL : false,
                json: true,
                headers: {
                    'tenantId': 'default',
                    'Accept': 'application/json'
                }
            },
            function(error, response, body) {
                if (error || body.error) {
                    console.log("error:", error || body.error);
                } else {
                    console.log("account: ", body.id, 'balance: ', body.state.stateObj.quantity);
                }
                expect(body.state.stateObj.quantity).to.be.equal(num);
                done(error, body.state.stateObj.quantity);
            });
     }

      for (var y = 0; y < 10; y++) {
        funcCheckArray.push(check1Balance);
      }

      async.parallel(funcCheckArray, function (err, results) {
                                if (err) {
                                    console.log(err);
                                    done(err);
                                } else {
                                  console.log("Done! ", results);
                                  next();
                                }
                                
                            });
  }


it('should log in', function(done) {
console.log('Base Url is ', baseurl);
request.post(
              baseurl + "BaseUsers", {
                json: createLoginData
              },
              function(error, response, body) {
                if (error) {
			            console.log("error:", error);
                  done(error);
                } else {
                  login();
		            }
	});

function login() {
request.post(
              baseurl + "BaseUsers/login", {
                json: loginData
              },
              function(error, response, body) {
                if (error) {
			            console.log("error:", error);
                  done(error);
                } else {
                  if (body.status != 200) {
                    console.log("error: ", body);
                  }
                  token = body.id;
                  setup(body.id);
		            }
	});
}

  function setup(token) {
    console.log('start init actor', token);

    var hierarchyData = {"stateObj": {"quantity":0}, "id":""};
    var createUrl = baseurl + "Inventories?access_token=" + token;

  function initActors(done) {
    var localData = hierarchyData;
    hierarchyData.id = tempIds.pop();
    request.post(
              createUrl, {
                json: hierarchyData
              },
              function(error, response, body) {
                if (error) {
			            console.log("error: ", error);
                  done(error);
                } else {
                  if (body.status != 200) {
                    console.log("error: ", body);
                  }
                  expect(response.statusCode).to.be.equal(200);
                  expect(body.id).not.to.be.equal(undefined);
                  done(null, body.id);
		            }
	        });
  }

  for (var y = 0; y < 10; y++) {
      funcArray.push(initActors);
    }

    tempIds = ids.slice();

    async.parallel(funcArray, function (err, results) {
                                if (err) {
                                    console.log(err);
                                    process.exit(-1);
                                } else {
                                  console.log("Done! ", results);
                                  addBudget();
                                }
                                
                            });
  }

  var addBudegtData = {
      "entityId": "",
      "payload": {"value":1000},
      "modelName": "Inventory",
      "instructionType": "CREDIT"
    };
  var addBudgetUrl = baseurl + "InventoryTransactions?access_token=" + token;

  var addTrans = {};
  addTrans.nonAtomicActivitiesList = [];

  function budgetAdd(done) {
        var localTrans = JSON.parse(JSON.stringify(addTrans));
        var addBudgetUrl = baseurl + "InventoryTransactions?access_token=" + token;
          localTrans._version = uuid.v4();
          request.post({
            url: addBudgetUrl,
            json: localTrans,
            headers: { 
              //'x-evproxy-db-lock': '1'
              //'Content-Type' : 'application/x-www-form-urlencoded' 
            },
            method: 'POST'
          }, function (error, r, body) {
              done(error, body.id);
          });
    }

function addBudget() {
    console.log('Now add Budget');
    ids.forEach(function(element) {
      var activity = JSON.parse(JSON.stringify(addBudegtData));
      activity.entityId = element;
      addTrans.nonAtomicActivitiesList.push(activity);
    }, this);

    funcArray.splice(0,funcArray.length)

    for (var y = 0; y < 10; y++) {
      funcArray.push(budgetAdd);
    }

    async.parallel(funcArray, function (err, results) {
                                if (err) {
                                    console.log(err);
                                    done(err);
                                } else {
                                  console.log("Done! ", results);
                                  checkBalance(10000, deleteAmount);
                                }
                                
                            }
    );

}

function deleteAmount() {
    console.log('Now delete atomic');
    var addTransD = {};
    addTransD.atomicActivitiesList = [];


    function debit(done) {
        var localTrans = JSON.parse(JSON.stringify(addTransD));
        var addBudgetUrl = baseurl + "InventoryTransactions?access_token=" + token;
        localTrans._version = uuid.v4();
        request.post(
              addBudgetUrl, {
                json: localTrans
              },
              function(error, response, body) {
                if (error) {
			            console.log("error:", error);
                } else {
                  console.log("created ", body.id);
		            }
                done(error, body.id);
	        });
    }


    var disburseData = {
      "entityId": "",
      "payload": {"value":3},
      "modelName": "Inventory",
      "instructionType": "DEBIT"
    };

    ids.forEach(function(element) {
      var activity = JSON.parse(JSON.stringify(disburseData));
      activity.entityId = element;
      addTransD.atomicActivitiesList.push(activity);
    }, this);

    funcArray.splice(0,funcArray.length)

    for (var y = 0; y < 10; y++) {
      funcArray.push(debit);
    }

    async.parallel(funcArray, function (err, results) {
                                if (err) {
                                    console.log(err);
                                    done(err);
                                } else {
                                  console.log("Done! ", results);
                                  checkBalance(9970, done);
                                }
                                
                            }
    );

}

});

});
