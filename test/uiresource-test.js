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
describe(chalk.blue('UIResource-test'), function () {
  this.timeout(10000);

  var htmlData, cssData;
  
  before('prepare test data', function (done) {
    options = {};
    options.ignoreAutoScope = true;
    options.fetchAllScopes = true;
    bootstrap.models.UIResource.destroyAll({}, options, function (err, r) {
      if (err) return done(err);

      htmlData = {
          name: 'test.html',
          type: 'text/html',
          content: '<html></html>'
      };
      cssData = {
          name: 'main.css',
          type: 'text/css',
          content: '.root { background: red}'
      };
      jsonData = {
          name: 'mydata',
          type: 'application/json',
          content: '{"score":100,"subject":"js"}'
      };
      
      bootstrap.models.UIResource.create([htmlData, cssData, jsonData
      ], options, function (err, r) {
        done(err);
      });
    });
  });

  it('returns 404 for non-existing pages', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = baseUrl + '/UIResources/content/nonexistent.html';
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


  it('returns html-data with appropriate contentType', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = baseUrl + '/UIResources/content/' + htmlData.name;
    api.get(getUrl)
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.headers['content-type']).to.equal(htmlData.type);
          expect(result.text).to.equal(htmlData.content);
          done();
        }
      });
  });

  it('returns css-data with appropriate contentType', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = baseUrl + '/UIResources/content/' + cssData.name;
    api.get(getUrl)
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.headers['content-type']).to.equal(cssData.type);
          expect(result.text).to.equal(cssData.content);
          done();
        }
      });
  });

  it('returns json-data with appropriate contentType', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = baseUrl + '/UIResources/content/' + jsonData.name;
    api.get(getUrl)
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.headers['content-type']).to.equal(jsonData.type);
          expect(result.text).to.equal(jsonData.content);
          expect(result.body).to.exist;
          expect(result.body.score).to.equal(100);
          expect(result.body.subject).to.equal('js');
          done();
        }
      });
  });
  
});
