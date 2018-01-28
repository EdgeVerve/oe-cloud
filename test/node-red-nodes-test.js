/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/*global
    require,before,after,it,describe
*/
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;
var models = bootstrap.models;
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var loopback = require('loopback');


/** 
 * @Author : RSR
 * Http endpoints using find, create and destroy nodes are written in node-red-nodes-flow.json 
 * The below tests invoke the redapi endpoints and confirm that the output is as expected.
 **/


describe(chalk.blue('Node-red Nodes test'), function () {

    var accessToken;
    var adminAccessToken;

    before('Login to framework', function (done) {
        var options = {};
        options.ignoreAutoScope = true;
        options.fetchAllScopes = true;

        // delete all flows from NodeRedFlow model first
        models["NodeRedFlow"].destroyAll({}, options, function (err, r) {
            bootstrap.login(function (token) {
                accessToken = token;
                return done();
            });
        });
    });

    after('cleanup', function (done) {
        done();
    });

    it('Node-Red Test - Should able to create node red flow', function (done) {

        var flows = require('./node-red-nodes-flow.json');

        var api = defaults(supertest(bootstrap.app));
        var postUrl = '/red' + '/flows?access_token=' + accessToken;

        api.set('Accept', 'application/json')
            .post(postUrl)
            .set('accessToken', accessToken)
          .send({ flows: flows } )
            .end(function (err, resp) {
                expect(resp.status).to.be.equal(200);
                done(err);
            });
    });

    it('Create Node - success scenario', function(done) {
        var api = defaults(supertest(bootstrap.app));
        var getUrl = '/redapi/literalinsert?access_token=' + accessToken;
        api.set('Accept', 'application/json')
            .get(getUrl)
            .end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    if (resp.status === 400) {
                        done();
                    } else if (resp.status === 422) {
                        done();
                    } else {
                        expect(resp.status).to.be.equal(200);
                        done();
                    }
                }
            });
    });

    it('Create Node - failure scenario', function(done) {
        var api = defaults(supertest(bootstrap.app));
        var getUrl = '/redapi/literalinsert?access_token=' + accessToken;
        api.set('Accept', 'application/json')
            .get(getUrl)
            .end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    if (resp.status === 400) {
                        done();
                    } else if (resp.status === 422) {
                        done();
                    } else {
                        console.log("@@@@@@@@@@@@@@@ the response is: " + JSON.stringify(resp));
                        expect(resp.status).to.be.equal(200);
                        expect(resp.body.statusCode).to.be.equal(422);
                        done();
                    }
                }
            });
    });

    it('Find Node - success scenario', function(done) {
        var api = defaults(supertest(bootstrap.app));
        var getUrl = '/redapi/literalfind?access_token=' + accessToken;
        api.set('Accept', 'application/json')
            .get(getUrl)
            .end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    if (resp.status === 400) {
                        done();
                    } else if (resp.status === 422) {
                        done();
                    } else {
                        expect(resp.status).to.be.equal(200);
                        expect(resp.body.length).to.be.equal(1);
                        done();
                    }
                }
            });
    });

    it('Destroy Node - success scenario', function(done) {
        var api = defaults(supertest(bootstrap.app));
        var getUrl = '/redapi/literaldelete?access_token=' + accessToken;
        api.set('Accept', 'application/json')
            .get(getUrl)
            .end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    if (resp.status === 400) {
                        done();
                    } else if (resp.status === 422) {
                        done();
                    } else {
                        expect(resp.status).to.be.equal(200);
                        expect(resp.body.count).to.be.equal(1);
                        done();
                    }
                }
            });
    });

    it('Destroy Node - failure scenario', function(done) {
        var api = defaults(supertest(bootstrap.app));
        var getUrl = '/redapi/literaldelete?access_token=' + accessToken;
        api.set('Accept', 'application/json')
            .get(getUrl)
            .end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    if (resp.status === 400) {
                        done();
                    } else if (resp.status === 422) {
                        done();
                    } else {
                        expect(resp.status).to.be.equal(200);
                        expect(resp.body.count).to.be.equal(0);
                        done();
                    }
                }
            });
    });

});