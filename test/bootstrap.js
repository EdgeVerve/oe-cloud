/**
 *
 * 2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

const _require = require;

require = function (a) {
  if (a === 'oe-cloud') {
    return _require('../index.js');
  }
  return _require(a);
};

var oecloud = require('oe-cloud');
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var api = defaults(supertest(oecloud));

oecloud.boot(__dirname, function (err) {
  if (err) {
    console.log(err);
    process.exit(1);
  }
  oecloud.start();
  oecloud.emit('test-start');
});

describe('oe-cloud test Started', function () {
  this.timeout(10000);
  it('Waiting for application to start', function (done) {
    oecloud.on('test-start', function () {
      done();
    });
  });
});

module.exports = {
  app: oecloud,
  api: api,
  basePath: oecloud.get('restApiRoot')
};
