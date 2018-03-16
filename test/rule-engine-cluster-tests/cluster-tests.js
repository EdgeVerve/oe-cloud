const chalk = require('chalk');
const https = require('https');
const assert = require('assert');
const url = require('url');
const querystring = require('querystring');
const util = require('util');

describe(chalk.blue('rule cluster tests'), function(){

  var credo = {
    'username' : "admin",
    'password' : 'admin'
  };

  var access_token_node1;
  var access_token_node2;

  it('should successfuly log-in to node1', done => {
    var reqObj = url.parse("https://test.node1.oecloud.local/auth/local");
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
        // console.log(data);
        result = JSON.parse(data);

        assert(result.access_token, "access_token absent in node1 response");
        access_token_node1 = result.access_token;

        done();
      });
    });

    req.on('error', done);

    req.write(payload);

    req.end();

  });

  it('should successfuly log-in to node2', done => {
    var reqObj = url.parse("https://test.node2.oecloud.local/auth/local");
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
        // console.log(data);
        result = JSON.parse(data);

        assert(result.access_token, "access_token absent for node2 response");
        access_token_node2 = result.access_token;
        done();
      });
    });

    req.on('error', done);

    req.write(payload);

    req.end();

  });

  it('should create Employee model (via node1)', done => {

    var employeeModel = {
      name: 'Employee',
      properties: {
        name: 'string',
        qualification: 'object'
      }
    };

    var payload = JSON.stringify(employeeModel);

    var reqOpts = {
      host: 'test.node1.oecloud.local',
      path: '/api/ModelDefinitions',
      method: 'POST',
      headers: {
        'Content-Type' : 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'access_token' : access_token_node1
      }
    };

    var req = https.request(reqOpts, res => {
      assert(res.statusCode === 200, "Expected status code 200. Got: " + res.statusCode);
      done();
    });

    req.on('error', done);

    req.write(payload);

    req.end();

  });
  //
  it('should assert that the Employee model exists (in node2)', done => {
    var endpoint = 'https://test.node2.oecloud.local/api/ModelDefinitions?filter=%s'
    var filter = { where: { name: 'Employee'}};

    var options = url.parse(util.format(endpoint, querystring.stringify(filter)));

    https.get(options, res => {
      assert(res.statusCode === 200, 'Status code not 200. Got: ' + res.statusCode);
      done();
    });
  });
});
