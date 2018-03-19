const chalk = require('chalk');
const https = require('http');
const assert = require('assert');
const url = require('url');
const querystring = require('querystring');
const util = require('util');
const fs = require('fs');
const verbose = process.env.DEBUG_TEST || 0;

const node1 = "http://localhost:3000/";
const node2 = "http://localhost:3001";

// Using urlToOptions from the nodejs source itself
// https://github.com/nodejs/node/blob/1329844a0808705091891175a6bee58358380af6/lib/internal/url.js#L1305-L1322
function urlToOptions(url) {
  var options = {
    protocol: url.protocol,
    hostname: url.hostname,
    hash: url.hash,
    search: url.search,
    pathname: url.pathname,
    path: `${url.pathname}${url.search}`,
    href: url.href
  };
  if (url.port !== '') {
    options.port = Number(url.port);
  }
  if (url.username || url.password) {
    options.auth = `${url.username}:${url.password}`;
  }
  return options;
};

var prefix = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,';

var makeUrl = function(server, apiPath) {
  // return util.format('%s%s', server, apiPath);
  var urlInfo = new url.URL(server);
  urlInfo.pathname = apiPath;
  return urlInfo;
};

function assertStatusCode200(result) {
  var status_code = result.res.statusCode;
  var response = result.responseText;
  console.assert(status_code === 200,
    "Expected status code 200.",
    util.format("Got status code: %s.", status_code),
    "Response text:\n", response);
}

function postData(urlInfo, data) {
  // console.log('POST:', options.href, 'DATA:', data);
  return new Promise((resolve, reject) => {
    var payload = JSON.stringify(data);
    var options = urlToOptions(urlInfo);
    options.method = 'POST';
    options.headers = {
      'Content-Type' : 'application/json',
      'Content-Length' : payload.length
    };
    // console.log('POST:', options, 'Payload:', payload);
    if (verbose) {
      console.log('POST:', options, 'Payload:', payload);
    }
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

function get(urlInfo) {
  // console.log('GET:', options.href);
  return new Promise((resolve, reject) => {
    var options = urlToOptions(urlInfo);
    if (verbose) {
      console.log('GET:', options);
    }
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
    // var reqObj = url.parse("https://test.node1.oecloud.local/auth/local");
    // var payload = JSON.stringify(credo);

    var urlInfo = makeUrl(node1, "/auth/local");

    postData(urlInfo, credo).then(result => {
      assertStatusCode200(result);
      var data = result.responseText;
      access_token_node1 = JSON.parse(data).access_token;
      assert(access_token_node1, "got no access token post login");
      done();
    });

  });

  it('should successfuly log-in to node2', done => {
    var urlInfo = makeUrl(node2, "/auth/local");
    postData(urlInfo, credo).then(result => {
      assertStatusCode200(result);
      var data = result.responseText;
      access_token_node1 = JSON.parse(data).access_token;
      assert(access_token_node2, "got no access token post login");
      done();
    });
  });

  it('should create Employee model (via node1)', done => {

    var employeeModel = {
      name: 'Employee',
      properties: {
        name: 'string',
        qualification: 'object'
      }
    };



    // var options = new url.URL('https://test.node1.oecloud.local/api/ModelDefinitions');
    var options = makeUrl(node1, "/api/ModelDefinitions");
    options.searchParams.append('access_token', access_token_node1);

    postData(options, employeeModel).then(result => {
      assertStatusCode200(result);
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
    // var endpoint = new url.URL('https://test.node2.oecloud.local/api/ModelDefinitions');
    var endpoint = makeUrl(node2, "/api/ModelDefinitions");
    var filter = { where: { name: 'Employee'}};
    endpoint.searchParams.append('access_token', access_token_node2);
    endpoint.searchParams.append('filter', JSON.stringify(filter));
    // var options = url.parse(util.format(endpoint, access_token_node2, querystring.escape(JSON.stringify(filter))));

    get(endpoint).then(result => {
      console.log(result.responseText)
      assertStatusCode200(result.res);
      var data = JSON.parse(result.responseText);
      assert(Array.isArray(data), 'expected response to be an array');
      var record = data[0];
      assert(record, "expected a record");
      // console.log(record);
      assert(record.name === 'Employee', "model name should be \"Employee\"");
      done();
    })
    .catch(done);
  });

  it('should insert a decision called "TestDecision" into DecisionTable (via node1)', done => {
    // var options = new url.URL('https://test.node1.oecloud.local/api/DecisionTables');
    var options = makeUrl(node1, "/api/DecisionTables");
    options.searchParams.append('access_token', access_token_node1);

    var data = {
      name: 'TestDecision',
      document: {
        documentName: 'foo.xlsx',
        documentData: prefix + fs.readFileSync('./test/model-rule-data/employee_validation.xlsx').toString('base64')
      }
    };

    postData(options, data).then(result => {
      assertStatusCode200(result);
      done();
    })
    .catch(done);

  });

  it('should assert that "TestDecision" is available (in node2)', done => {
    // var options = new url.URL('https://test.node2.oecloud.local/api/DecisionTables');
    var options = makeUrl(node2, "/api/DecisionTables");
    options.searchParams.append('access_token', access_token_node2);
    options.searchParams.append('filter', JSON.stringify({ where: {name: 'TestDecision'}}));
    // console.log('Url:', options.href);
    get(options).then(result => {
      assertStatusCode200(result);
      done();
    })
    .catch(done);
  });

  it('should successfully attach a model validation rule to the Employee model (via node2)', done => {
    // var options = new url.URL('https://test.node2.oecloud.local/api/ModelRules');
    var options = makeUrl(node2, "/api/ModelRules");
    options.searchParams.append('access_token', access_token_node2);

    var record = {
      name: 'Employee',
      validationRules: ['TestDecision']
    };

    setTimeout(() => {
      postData(options, record).then(result => {
        // console.log(result.responseText);
        var response = JSON.parse(result.responseText);
        console.log(response);
        assertStatusCode200(result.res);
        done();
      })
      .catch(done);
    }, 5000)

  });

  it('should successfully insert a valid employee record (via node1)', done => {
    // var options = new url.URL('https://test.node1.oecloud.local/api/Employees');
    var options = makeUrl(node1, "api/Employees");
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
    // var options = new url.URL('https://test.node2.oecloud.local/api/Employees');
    var options = makeUrl(node2, "api/Employees");
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
    // var options = new url.URL('https://test.node2.oecloud.local/api/Employees');
    var options = makeUrl(node2, "api/Employees");
    options.searchParams.append('access_token', access_token_node2);

    var data = {
      name: 'Emp2',
      qualification: {
        marks_10: 45,
        marks_12: 65
      }
    };

    postData(options, data).then(result => {
      // assertStatusCode200(result.res);
      assert(result.res.statusCode !== 200);
      done();
    })
    .catch(done);
  });

  it('should assert the absence of the record attempted to save in the previous step (via node1)', done => {
    // var options = new url.URL('https://test.node1.oecloud.local/api/Employees');
    var options = makeUrl(node1, "api/Employees");
    options.searchParams.append('access_token', access_token_node1);
    options.searchParams.append('filter', JSON.stringify({ where: { name: 'Emp2' }}));

    get(options).then(result => {
      assertStatusCode200(result);
      var data = JSON.parse(result.responseText);
      assert(Array.isArray(data), "response received is not an array");
      assert(data.length === 0, "Expected length of data: 0. Actual length received: " + data.length);
      // assert(data[0].name === 'Emp1', 'Expected "Emp1", Actual: ' + data[0].name);
      done();
    })
    .catch(done);
  });

  // it('should not take down nodes when inserting a file containing an incorrect rule', done => {
  //   var testData = [
  //     'node1', 'node2'
  //   ];
  //
  //   var fileContents = prefix + fs.readFileSync('./test/model-rule-data/corrupt.xlsx');
  //   var tasks = testData.map(n => {
  //     var options = new url.URL(util.format('https://test.%s.oecloud.local/api/DecisionTables'));
  //     options.searchParams.append('access_token', n === 'node1' ? access_token_node1 : access_token_node2);
  //     var d = {
  //       name: 'd-' + n,
  //       document: {
  //         documentName: 'corrupt-' + n + '.xlsx',
  //         documentData: fileContents
  //       }
  //     };
  //     return postData(options, d);
  //   });
  //
  //   Promise.all(tasks).then(results => {
  //     done('Should not have inserted in the first place');
  //   })
  //   .catch(err => {
  //     //So we did get some error
  //
  //     //assert that the nodes are still alive...
  //     var checks = testData.map(n => {
  //       return get(util.format('https://test.%s.oecloud.local/', n));
  //     });
  //
  //     Promise.all(checks).then(results => {
  //       results.map(r => {
  //         assertStatusCode200(r.res);
  //       });
  //       done();
  //     })
  //     .catch(done);
  //   });
  // });
});
