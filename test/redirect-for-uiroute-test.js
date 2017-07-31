/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/* jshint -W024 */
/* jshint expr:true */
//to avoid jshint errors for expect

var bootstrap = require('./bootstrap');
var chalk = require('chalk');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var baseUrl = bootstrap.basePath;

var options;
describe(chalk.blue('uiroutes-test'), function () {
  this.timeout(10000);

  before('prepare test data', function (done) {
    options = {};
    options.ignoreAutoScope = true;
    options.fetchAllScopes = true;
    bootstrap.models.UIRoute.destroyAll({}, options, function (err, r) {
      if (err) return done(err);

      bootstrap.models.UIRoute.create({
        name: 'test-path',
        path: '/test-path',
        type: 'elem',
        import: '/dummy/test-path.html'
      }, options, function (err, r) {
        done(err);
      });
    });
  });

  it('returns 404 for non-existing routes', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = '/non-existing-path';
    api.get(getUrl)
      .expect(404)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });


  it('returns redirect for existing routes', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = '/test-path';
    api.get(getUrl)
      .expect(302)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
});
