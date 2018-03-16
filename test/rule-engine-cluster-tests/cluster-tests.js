const chalk = require('chalk');
const https = require('https');
const assert = require('assert');

describe(chalk.blue('rule cluster tests'), function(){
  it('should assert node1 is up', done => {
    https.get('https://test.node1.oecloud.local/status', res => {
      assert(res.statusCode === 200, "Expected 200 OK status. Instead got: " + res.statusCode);
      done();
    });
  });

  it('should assert node2 is up', done => {
    https.get('https://test.node2.oecloud.local/status', res => {
      assert(res.statusCode === 200, "Expected 200 OK status. Instead got: " + res.statusCode);
      done();
    });
  });
});
