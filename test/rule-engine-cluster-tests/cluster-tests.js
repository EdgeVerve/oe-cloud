const chalk = require('chalk');
const https = require('https');
const assert = require('assert');
const url = require('url');

describe(chalk.blue('rule cluster tests'), function(){

  var credo = {
    'username' : "admin",
    'password' : 'admin'
  };

  var access_token_node1;
  var access_token_node2;

  it('should successfuly log-in to node1', done => {
    var reqObj = url.parse("https://test.node1.oelcoud.local/api/local");
    var payload = JSON.stringify(credo);
    reqObj.method = 'POST';
    reqObj.headers = {
      'Content-Type' : 'application/json',
      'Content-Length' : Buffer.byteLength(payload)
    };

    var req = https.request(reqObj, res => {
      var data = "";
      var status_code = res.statusCode;

      assert(status_code === 200, "Expected 200 status code. Got: " + status_code);

      res.on('data', chunk => data += chunk);

      res.on('end', () => {
        console.log(data);
        done();
      });
    });

    req.on('error', done);

    req.write(payload);

    req.end();

  });

  it('should successfuly log-in to node2', done => {
    var reqObj = url.parse("https://test.node2.oelcoud.local/api/local");
    var payload = JSON.stringify(credo);
    reqObj.method = 'POST';
    reqObj.headers = {
      'Content-Type' : 'application/json',
      'Content-Length' : Buffer.byteLength(payload)
    };

    var req = https.request(reqObj, res => {
      var data = "";
      var status_code = res.statusCode;

      assert(status_code === 200, "Expected 200 status code. Got: " + status_code);

      res.on('data', chunk => data += chunk);

      res.on('end', () => {
        console.log(data);
        done();
      });
    });

    req.on('error', done);

    req.write(payload);

    req.end();

  });

  // it('should create model via node1', done => {
  //   var employeeModel = {
  //     name: 'Employee',
  //     properties: {
  //       name: 'string',
  //       qualification: 'object'
  //     }
  //   };
  //
  //   var payload = JSON.stringify(employeeModel);
  //
  //   var reqOpts = {
  //     host: 'test.node1.oecloud.local',
  //     path: '/api/ModelDefinitions',
  //     method: 'POST',
  //     headers: {
  //       'Content-Type' : 'application/json',
  //       'Content-Length': Buffer.byteLength(payload)
  //     }
  //   };
  //
  //   var req = https.request(reqOpts, res => {
  //     assert(res.statusCode === 200, "Expected status code 200. Got: " + res.statusCode);
  //     done();
  //   });
  //
  //   req.on('error', done);
  //
  //   req.write(payload);
  //
  //   req.end();
  //
  // });
  //
  // it('should')
});
