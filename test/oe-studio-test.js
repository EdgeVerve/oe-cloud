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

var appconfig = require('../server/config');

var options;
var accessToken;
describe(chalk.blue('oe-studio-test'), function () {
  this.timeout(10000);

  before('prepare test data', function (done) {
    options = {};
    options.ignoreAutoScope = true;
    options.fetchAllScopes = true;
    bootstrap.login(function (token) {
      accessToken = token;
      done();
    });
  });

  xit('redirects to login page when not logged in', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = appconfig.designer.mountPath;
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


  it('returns designer index page', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = appconfig.designer.mountPath;
    api.set('Authorization', accessToken)
      .get(getUrl)
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });

  it('Redirects to designer.mountPath when designer.html is requested', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = '/designer.html';
    api.set('Authorization', accessToken)
      .get(getUrl)
      .expect(302)
      .end(function (err, result) {
      
        if (err) {
          done(err);
        } else {
          expect(result.header.location).to.exist;
          expect(result.header.location).to.equal(appconfig.designer.mountPath);
          
          done();
        }
      });
  });
  
  it('returns API endpoints for model', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = appconfig.designer.mountPath + '/routes/Literals';
    api.set('Authorization', accessToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .get(getUrl)
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.status).to.equal(200);
          expect(result.body).to.exist;
          expect(result.body).to.be.an('array');
          expect(result.body).all.to.satisfy(function(item){
            return (item.path && item.path.indexOf('/Literals')===0);
          });
          done();
        }
      });
  });

  
  it('returns designer config', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = appconfig.designer.mountPath + '/config';
    api.set('Authorization', accessToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .get(getUrl)
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).to.exist;
          expect(result.body).to.be.an('object');
          expect(result.body.mountPath).to.equal(appconfig.designer.mountPath);
          done();
        }
      });
  });

  it('returns template data', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = appconfig.designer.mountPath + '/templates';
    api.set('Authorization', accessToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .get(getUrl)
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).to.exist;
          expect(result.body).to.be.an('array');
          expect(result.body).all.to.satisfy(function(item){
            return (item.file && item.path && item.content && item.type);
          });
          done();
        }
      });
  });

  it('returns style data', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = appconfig.designer.mountPath + '/styles';
    api.set('Authorization', accessToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .get(getUrl)
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).to.exist;
          expect(result.body).to.be.an('array');
          expect(result.body).all.to.satisfy(function(item){
            return (item.file && item.path);
          });
          done();
        }
      });
  });

  
  it('returns assets data', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = appconfig.designer.mountPath + '/assets';
    api.set('Authorization', accessToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .get(getUrl)
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).to.exist;
          expect(result.body).to.be.an('object');
          expect(result.body.images).to.be.ok;
          expect(result.body.videos).to.be.ok;
          expect(result.body.audios).to.be.ok;
          done();
        }
      });
  });

  it('returns images data', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = appconfig.designer.mountPath + '/assets/images';
    api.set('Authorization', accessToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .get(getUrl)
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).to.exist;
          expect(result.body).to.be.an('array');
          expect(result.body).all.to.satisfy(function(item){
            return (item.file && item.path && item.size);
          });
          done();
        }
      });
  });

  it('returns video data', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = appconfig.designer.mountPath + '/assets/videos';
    api.set('Authorization', accessToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .get(getUrl)
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).to.exist;
          expect(result.body).to.be.an('array');
          expect(result.body).all.to.satisfy(function(item){
            return (item.file && item.path && item.size);
          });
          done();
        }
      });
  });

  it('returns audio data', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = appconfig.designer.mountPath + '/assets/audios';
    api.set('Authorization', accessToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .get(getUrl)
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).to.exist;
          expect(result.body).to.be.an('array');
          expect(result.body).all.to.satisfy(function(item){
            return (item.file && item.path && item.size);
          });
          done();
        }
      });
  });

  it('returns elements', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = appconfig.designer.mountPath + '/elements';
    api.set('Authorization', accessToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .get(getUrl)
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).to.exist;
          expect(result.body).to.be.an('array');
          expect(result.body).all.to.satisfy(function(item){
            return (item.name && item.tag && item.category && item.config && item.config.importUrl);
          });
          done();
        }
      });
  });

  it('save-file saves the file', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var postUrl = appconfig.designer.mountPath + '/save-file';
    api.set('Authorization', accessToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .post(postUrl)
      .send({file:"client/bower_components/test.html", data: "my-file-dummy-content"})
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).to.exist;
          expect(result.body.status).to.be.true;
          done();
        }
      });
  });

  it('returns properties', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var getUrl = appconfig.designer.mountPath + '/properties/Literals';
    api.set('Authorization', accessToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .get(getUrl)
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          console.log(result.body);
          expect(result.body).to.exist;
          expect(result.body.key).not.to.be.undefined;
          expect(result.body.key.type).to.be.equal('String');
          done();
        }
      });
  });

  it('create default UI', function (done) {
    var api = defaults(supertest(bootstrap.app));
    var postUrl = appconfig.designer.mountPath + '/createDefaultUI';
    api.set('Authorization', accessToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .post(postUrl)
      .send({ modelName: "TestModel" })
      .expect(200)
      .end(function (err, result) {
        if (err) {
          done(err);
        } else {
          expect(result.body).to.exist;
          expect(result.body.message).to.be.equal('Default UI created');
          api.set('Authorization', accessToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .post(postUrl)
            .send({ modelName: "TestModel" })
            .expect(200)
            .end(function (err, result) {
              if (err) {
                done(err);
              } else {
                expect(result.body).to.exist;
                expect(result.body.message).to.be.equal('Default UI already exists');
                done();
              }
            });
        }
      });
  });

});
