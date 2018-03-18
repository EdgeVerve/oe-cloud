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

function assertStatusCodeNot200(res) {
  var status_code = res.statusCode;
  assert(status_code !== 200, "status code expected was a not ");
}

function postData(urlInfo, data) {
  // console.log('POST:', options.href, 'DATA:', data);
  return new Promise((resolve, reject) => {
    var payload = JSON.stringify(data);
    var options = {};
    options.path = urlInfo.pathname;
    options.host = urlInfo.hostname;
    options.port = urlInfo.port || 443;
    options.method = 'POST';
    options.headers = {
      'Content-Type' : 'application/json',
      'Content-Length' : payload.length
    };
    console.log('POST:', options, 'Payload:', payload);
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
  console.log('GET:', options.href);
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



    var options = new url.URL('https://test.node1.oecloud.local/api/ModelDefinitions');
    options.searchParams.append('access_token', access_token_node1);

    postData(options, employeeModel).then(result => {
      assertStatusCode200(result.res);
      var data = JSON.parse(result.responseText);
      assert(!Array.isArray(data), "expected the json response to be an object");
      assert(data.name, "record retrieved should have \"name\" as a property");
      assert(data.name === employeeModel.name, "does not match what we input for creation");
      done();
    })
    .catch(done)

  });
  //
  it('should assert that the Employee model exists (in node2)', done => {
    var endpoint = 'https://test.node2.oecloud.local/api/ModelDefinitions?access_token=%sfilter=%s'
    var filter = { where: { name: 'Employee'}};

    var options = url.parse(util.format(endpoint, access_token_node2, querystring.escape(JSON.stringify(filter))));

    get(options).then(result => {
      assertStatusCode200(result.res);
      var data = JSON.parse(result.responseText);
      assert(Array.isArray(data), 'expected response to be an array');
      var record = data[0];
      assert(record, "expected a record");
      console.log(record);
      assert(record.name === 'Employee', "model name should be \"Employee\"");
      done();
    })
    .catch(done);
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
    })
    .catch(done);

  });

  it('should assert that "TestDecision" is available (in node2)', done => {
    var options = new url.URL('https://test.node2.oecloud.local/api/DecisionTables');
    options.searchParams.append('access_token', access_token_node2);
    options.searchParams.append('filter', JSON.stringify({ where: {name: 'TestDecision'}}));
    // console.log('Url:', options.href);
    get(options).then(result => {
      assertStatusCode200(result.res);
      done();
    })
    .catch(done);
  });

  it('should successfully attach a model validation rule to the Employee model (via node2)', done => {
    var options = new url.URL('https://test.node2.oecloud.local/api/ModelRules');
    options.searchParams.append('access_token', access_token_node2);

    var record = {
      name: 'Employee',
      validationRules: ['TestDecision']
    };

    postData(options, record).then(result => {
      assertStatusCode200(result.res);
      done();
    })
    .catch(done);
  });

  it('should successfully insert a valid employee record (via node1)', done => {
    var options = new url.URL('https://test.node1.oecloud.local/api/Employees');
    options.searchParams.append('access_token', access_token_node1);

    var data = {
      name: 'Emp1',
      qualification: {
        marks_10: 65,
        marks_12: 65
      }
    };

    postData(options, data).then(result => {
      assertStatusCode200(result.res);
      var data = JSON.parse(result.responseText);
      console.log(data);
      done();
    })
    .catch(done);
  });

  it('should assert the presence of the above inserted record (via node2)', done => {
    var options = new url.URL('https://test.node2.oecloud.local/api/Employees');
    options.searchParams.append('access_token', access_token_node2);
    options.searchParams.append('filter', JSON.stringify({ where: { name: 'Emp1' }}));

    get(options).then(result => {
      assertStatusCode200(result.res);
      var data = JSON.parse(result.responseText);
      assert(Array.isArray(data), "response received is not an array");
      assert(data.length === 1, "Expected length of data: 1. Actual length received: " + data.length);
      assert(data[0].name === 'Emp1', 'Expected "Emp1", Actual: ' + data[0].name);
      done();
    })
    .catch(done);
  });

  it('should deny insert of invalid record (via node2)', done => {
    var options = new url.URL('https://test.node2.oecloud.local/api/Employees');
    options.searchParams.append('access_token', access_token_node1);

    var data = {
      name: 'Emp2',
      qualification: {
        marks_10: 45,
        marks_12: 65
      }
    };

    postData(options, data).then(result => {
      // assertStatusCode200(result.res);

      done();
    })
    .catch(done);
  });

  it('should assert the absence of the record attempted to save in the previous step (via node1)', done => {
    var options = new url.URL('https://test.node1.oecloud.local/api/Employees');
    options.searchParams.append('access_token', access_token_node2);
    options.searchParams.append('filter', JSON.stringify({ where: { name: 'Emp2' }}));

    get(options).then(result => {
      assertStatusCode200(result.res);
      var data = JSON.parse(result.responseText);
      assert(Array.isArray(data), "response received is not an array");
      assert(data.length === 0, "Expected length of data: 0. Actual length received: " + data.length);
      // assert(data[0].name === 'Emp1', 'Expected "Emp1", Actual: ' + data[0].name);
      done();
    })
    .catch(done);
  });

  it('should not take down nodes when inserting a file containing an incorrect rule', done => {
    var testData = [
      'node1', 'node2'
    ];

    var fileContents = prefix + fs.readFileSync('./test/model-rule-data/corrupt.xlsx');
    var tasks = testData.map(n => {
      var options = new url.URL(util.format('https://test.%s.oecloud.local/api/DecisionTables'));
      options.searchParams.append('access_token', n === 'node1' ? access_token_node1 : access_token_node2);
      var d = {
        name: 'd-' + n,
        document: {
          documentName: 'corrupt-' + n + '.xlsx',
          documentData: fileContents
        }
      };
      return postData(options, d);
    });

    Promise.all(tasks).then(results => {
      done('Should not have inserted in the first place');
    })
    .catch(err => {
      //So we did get some error

      //assert that the nodes are still alive...
      var checks = testData.map(n => {
        return get(util.format('https://test.%s.oecloud.local/', n));
      });

      Promise.all(checks).then(results => {
        results.map(r => {
          assertStatusCode200(r.res);
        });
        done();
      })
      .catch(done);
    });
  });
});
