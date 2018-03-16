const chalk = require('chalk');
const https = require('https');
const assert = require('assert');
const url = require('url');
const querystring = require('querystring');
const util = require('util');
const fs = require('fs');

var prefix = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,';

function assertStatusCode200(res) {
  var status_code = res.statusCode;
  assert(status_code === 200, util.format('Expected status code 200. Actual status code: %s', status_code));
}

function postData(options, data) {
  return new Promise((resolve, reject) => {
    var payload = JSON.stringify(data);
    options.method = 'POST';
    options.headers = {
      'Content-Type' : 'application/json',
      'Content-Length' : payload.length
    };
    var req = https.request(options, res => {
      var outputString = "";
      res.on('data', chunk => outputString += chunk);
      res.on('end', () => {
        resolve({ res, responseText: outputString });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(options) {
  return new Promise((resolve, reject) => {
    var req = https.get(options, res => {
      var data = "";
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          res,
          responseText: data
        });
      });
    });

    req.on('error', reject);
  });
}

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

      // assert(status_code === 200, "Expected 200 status code. Got: " + status_code);
      assertStatusCode200(res);

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

      // assert(status_code === 200, "Expected 200 status code. Got: " + status_code);
      assertStatusCode200(res);

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
      path: '/api/ModelDefinitions?access_token=' + access_token_node1,
      method: 'POST',
      headers: {
        'Content-Type' : 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    var req = https.request(reqOpts, res => {
      // assert(res.statusCode === 200, "Expected status code 200. Got: " + res.statusCode);
      assertStatusCode200(res);
      done();
    });

    req.on('error', done);

    req.write(payload);

    req.end();

  });
  //
  it('should assert that the Employee model exists (in node2)', done => {
    var endpoint = 'https://test.node2.oecloud.local/api/ModelDefinitions?access_token=%sfilter=%s'
    var filter = { where: { name: 'Employee'}};

    var options = url.parse(util.format(endpoint, access_token_node2, querystring.stringify(filter)));

    https.get(options, res => {
      // assert(res.statusCode === 200, 'Status code not 200. Got: ' + res.statusCode);
      assertStatusCode200(res);
      done();
    });
  });

  it('should insert a decision called "TestDecision" into DecisionTable (via node1)', done => {
    var options = new url.URL('https://test.node1.oecloud.local/api/DecisionTables');
    options.searchParams.append('access_token', access_token_node1);

    var data = {
      name: 'TestDecision',
      document: {
        documentName: 'foo.xlsx',
        documentData: prefix + fs.readFileSync('./test/model-rule-data/employee_validation.xlsx').toString('base64')
      }
    };

    postData(options, data).then(result => {
      assertStatusCode200(result.res);
      done();
    }, done);

  });

  it('should assert that "TestDecision" is available (in node2)', done => {
    var options = new url.URL('https://test.node2.oecloud.local/api/DecisionTables');
    options.searchParams.append('access_token', access_token_node2);
    options.searchParams.append('filter', querystring.stringify({ where: {name: 'TestDecision'}}));

    get(options).then(result => {
      assertStatusCode200(result.res);
      done();
    }, done);
  });

  // it('should successfully attach a model rule to the Employee model', done => {
  //
  // });
});
