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
var app = bootstrap.app;
var _version;
var defaultContext = {
    ctx: {
        tenantId: 'test-tenant',
        remoteUser: 'test-user'
    }
};

describe(chalk.blue('Node-red test'), function () {

    var accessToken;
    var adminAccessToken;

    before('Logint to framework', function (done) {
        var options = {};
        options.ignoreAutoScope = true;
        options.fetchAllScopes = true;
        app.set('nodeRedSplitToFiles', true);
        // delete all flows from NodeRedFlow model first
        models["NodeRedFlow"].destroyAll({}, options, function (err, r) {
            bootstrap.login(function (token) {
                accessToken = token;
                return done();
            });
        });
    });

    after('cleanup', function (done) {
        app.set('nodeRedSplitToFiles', false);
        done();
    });

    it('Node-Red Test - Should able to create node red flow', function (done) {

        var flows = [{ "id": "5b4e055c.3134cc", "type": "tab", "label": "node-red-test-tenant" },
        { "id": "f2978c55.016ab", "type": "async-observer", "z": "5b4e055c.3134cc", "name": "node-red-test-tenant", "modelname": "Literal", "method": "access", "x": 162, "y": 191, "wires": [["f5c48f2.d0e007"]] },
        { "id": "f5c48f2.d0e007", "type": "function", "z": "5b4e055c.3134cc", "name": "node-red-test-tenant", "func": "console.log('******* test-tenant ********');\nvar loopback = global.get('loopback');\nvar literalModel = loopback.findModel('" + "Literal" + "');\nliteralModel.emit(\"notifyLiteral\", msg.callContext);\n\nreturn msg;", "outputs": 1, "noerr": 0, "x": 439, "y": 165, "wires": [["9a0d6af6.7e8ec8"]] },
        { "id": "9a0d6af6.7e8ec8", "type": "debug", "z": "5b4e055c.3134cc", "name": "node-red-test-tenant", "active": true, "console": "false", "complete": "true", "x": 661, "y": 147, "wires": [] }];

        var api = defaults(supertest(bootstrap.app));
        //console.log(accessToken);
        var postUrl = '/red' + '/flows?access_token=' + accessToken;

        api.set('Accept', 'application/json')
            .post(postUrl)
            .set('accessToken', accessToken)
            .send({ flows: flows })
            .end(function (err, resp) {
                expect(resp.status).to.be.equal(200);
                done(err);
            });
    });

    it('Node-Red Test - Should able to retrieve node red flow same we posted earlier', function (done) {
        var api = defaults(supertest(bootstrap.app));
        //console.log(accessToken);
        var url = '/red' + '/flows?access_token=' + accessToken;

        api.set('Accept', 'application/json')
            .set('accessToken', accessToken)
            .get(url)
            .end(function (err, resp) {
                expect(resp.status).to.be.equal(200);
                expect(resp.body.flows.length).to.be.equal(4);
                _version = resp.body.rev; //resp.req.res.headers['set-cookie'];
                console.log('version ', _version);
                expect(resp.body.flows[0].label).to.be.equal('node-red-test-tenant');
                expect(resp.body.flows[3].name).to.be.equal('node-red-test-tenant');
                return done();
            });
    });

    it('Node-Red Test - Should able to update existing node red flow', function (done) {

        var flows = [{ "id": "5b4e055c.3134cc", "type": "tab", "label": "node-red-test-tenant-updated" },
        { "id": "f2978c55.016ab", "type": "async-observer", "z": "5b4e055c.3134cc", "name": "node-red-test-tenant-updated", "modelname": "Literal", "method": "access", "x": 162, "y": 191, "wires": [["f5c48f2.d0e007"]] },
        { "id": "f5c48f2.d0e007", "type": "function", "z": "5b4e055c.3134cc", "name": "node-red-test-tenant", "func": "console.log('******* test-tenant ********');\nvar loopback = global.get('loopback');\nvar literalModel = loopback.findModel('" + "Literal" + "');\nliteralModel.emit(\"notifyLiteral\", msg.callContext);\n\nreturn msg;", "outputs": 1, "noerr": 0, "x": 439, "y": 165, "wires": [["9a0d6af6.7e8ec8"]] },
        { "id": "9a0d6af6.7e8ec8", "type": "debug", "z": "5b4e055c.3134cc", "name": "node-red-test-tenant", "active": true, "console": "false", "complete": "true", "x": 661, "y": 147, "wires": [] }];

        var api = defaults(supertest(bootstrap.app));
        //console.log(accessToken);
        var postUrl = '/red' + '/flows?access_token=' + accessToken;

        api.set('Accept', 'application/json')
            .post(postUrl)
            .set('accessToken', accessToken)
            //.set('Cookie', [_version])
            .send({ flows: flows, rev: _version })
            .end(function (err, resp) {
                expect(resp.status).to.be.equal(200);
                _version = resp.body.rev;
                console.log('version2 : ', _version);
                done(err);
            });
    });

});