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
var _version;
var defaultContext = {
    ctx: {
        tenantId: 'test-tenant',
        remoteUser: 'test-user'
    }
};

/** 
 * @Author : Atul
 * Node red test case : This test will perform following
 * 1. it will use two users. one is admin/admin and other is testuser/testuser++
 * 2. First login as test user and creates a node-red flow. Flow will have four nodes. Async Observer listening on 'before access' on 'Literal' model. Function node emits event on 'Literal' model.
 * 3. Checks if flows are posted correctly 
 * 4. Hook 'notifyLiteral' event on 'Literal' model - if event is received, calling done()
 * 5. Access 'Literal' model by doing .find() on it. This should trigger node-red flow and in turn 'notifyLiteral' event would be sent.
 * 6. Same test cases are executed for admin/admin user. 
 * 7. Test case ensures that admin/admin cannot see testuser/testuser 's flows.
 * 8. Test case also ensures that appropriate flows are fired and executed. eg when default tenant trigger flow, it will not execute test-tenant flow
 * **/


describe(chalk.blue('Node-red test'), function () {

    var accessToken;


    before('Logint to framework', function (done) {
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
            .send(flows)
            .end(function (err, resp) {
                expect(resp.status).to.be.equal(204);
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
                expect(resp.body.length).to.be.equal(4);
                _version = resp.req.res.headers['set-cookie'];
                console.log('cookie ', _version);
                expect(resp.body[0].label).to.be.equal('node-red-test-tenant');
                expect(resp.body[3].name).to.be.equal('node-red-test-tenant');
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
            .set('Cookie', [_version])
            .send(flows)
            .end(function (err, resp) {
                expect(resp.status).to.be.equal(204);
                done(err);
            });
    });

    it('Node-Red Test - Should able to execute flow when accessing Literal model - will wait for event emitted from node-red flow', function (done) {
        var flag = true;
        // Listen to event first before firing .find which will trigger the access hook.
        models["Literal"].on("notifyLiteral", function (payload) {
            if (!flag) {
                return;
            }
            flag = false;
            console.log("notifyLiteral");
            expect(payload).not.to.be.undefined;
            expect(payload.ctx).not.to.be.undefined;
            expect(payload.ctx.tenantId).to.be.equal("test-tenant");
            done();
        });
        //this should trigger node red flow
        models["Literal"].find({}, defaultContext, function (err, results) {
            // do nothing..
            // node-red flow should trigger and it should raise the event. 
            // below that event is captured for this test case.
        });
    });

    it('Node-Red Test - Login with admin user', function (done) {

        bootstrap.login({ 'username': 'admin', 'password': 'admin' }, function (token) {
            accessToken = token;
            return done();
        });

    });

    it('Node-Red Test - admin user should not see flow for test-tenant user', function (done) {
        var api = defaults(supertest(bootstrap.app));
        //console.log(accessToken);
        var url = '/red' + '/flows?access_token=' + accessToken;

        api.set('Accept', 'application/json')
            .set('accessToken', accessToken)
            .get(url)
            .end(function (err, resp) {
                expect(resp.status).to.be.equal(200);
                expect(resp.body.length).to.be.equal(0);
                return done();
            });
    });


    it('Node-Red Test - admin user post flow', function (done) {

        var flows = [{ "id": "504e055c.3134cc", "type": "tab", "label": "node-red-default" },
        { "id": "f0978c55.016ab", "type": "async-observer", "z": "504e055c.3134cc", "name": "node-red-default", "modelname": "Literal", "method": "access", "x": 162, "y": 191, "wires": [["f0c48f2.d0e007"]] },
        { "id": "f0c48f2.d0e007", "type": "function", "z": "504e055c.3134cc", "name": "node-red-default", "func": "console.log('********* default***********');\nvar loopback = global.get('loopback');\nvar literalModel = loopback.findModel('" + "Literal" + "');\nliteralModel.emit(\"notifyLiteral2\", msg.callContext);\n\nreturn msg;", "outputs": 1, "noerr": 0, "x": 439, "y": 165, "wires": [["900d6af6.7e8ec8"]] },
        { "id": "900d6af6.7e8ec8", "type": "debug", "z": "504e055c.3134cc", "name": "node-red-default", "active": true, "console": "false", "complete": "true", "x": 661, "y": 147, "wires": [] }];

        var api = defaults(supertest(bootstrap.app));
        //console.log(accessToken);
        var postUrl = '/red' + '/flows?access_token=' + accessToken;

        api.set('Accept', 'application/json')
            .post(postUrl)
            .set('accessToken', accessToken)
            .send(flows)
            .end(function (err, resp) {
                expect(resp.status).to.be.equal(204);
                done(err);
            });
    });


    it('Node-Red Test - Admin user Should able to retrieve node red flow same we posted earlier', function (done) {
        var api = defaults(supertest(bootstrap.app));
        //console.log(accessToken);
        var url = '/red' + '/flows?access_token=' + accessToken;

        api.set('Accept', 'application/json')
            .set('accessToken', accessToken)
            .get(url)
            .end(function (err, resp) {
                expect(resp.status).to.be.equal(200);
                expect(resp.body.length).to.be.equal(4);
                expect(resp.body[0].label).to.be.equal('node-red-default');
                expect(resp.body[3].name).to.be.equal('node-red-default');
                return done();
            });
    });


    it('Node-Red Test - Should able to execute flow when accessing Literal model - will wait for event emitted from node-red flow for ADMIN user', function (done) {
        var flag = true;
        // Listen to event first before firing .find which will trigger the access hook.
        models["Literal"].on("notifyLiteral2", function (payload) {
            if (!flag)
                return;
            flag = false;
            console.log("notifyLiteral2");
            expect(payload).not.to.be.undefined;
            expect(payload.ctx).not.to.be.undefined;
            expect(payload.ctx.tenantId).to.be.equal("default");
            done();

        });
        //this should trigger node red flow for admin flow only
        models["Literal"].find({}, {
            ctx: {
                tenantId: 'default',
                remoteUser: 'admin'
            }
        }, function (err, results) {
            // do nothing..
            // node-red flow should trigger and it should raise the event. 
            // below that event is captured for this test case.
        });
    });
});