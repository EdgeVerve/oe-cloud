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
    this.timeout(90000);
    var accessToken;
    var adminAccessToken;

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
          .send({ flows: flows } )
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

    it('Node-Red Test - Should able to execute flow when accessing Literal model - will wait for event emitted from node-red flow', function (done) {
        var flag = true;
        // Listen to event first before firing .find which will trigger the access hook.
        models["Literal"].on("notifyLiteral", function (payload) {
            if (!flag) {
                return;
            }
            flag = false;
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
            adminAccessToken = token;
            return done();
        });

    });

    it('Node-Red Test - admin user should not see flow for test-tenant user', function (done) {
        var api = defaults(supertest(bootstrap.app));
        //console.log(accessToken);
        var url = '/red' + '/flows?access_token=' + adminAccessToken;

        api.set('Accept', 'application/json')
            .set('accessToken', adminAccessToken)
            .get(url)
            .end(function (err, resp) {
                expect(resp.status).to.be.equal(200);
                expect(resp.body.flows.length).to.be.equal(0);
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
        var postUrl = '/red' + '/flows?access_token=' + adminAccessToken;

        api.set('Accept', 'application/json')
            .post(postUrl)
            .set('accessToken', adminAccessToken)
          .send({ flows: flows })
            .end(function (err, resp) {
                expect(resp.status).to.be.equal(200);
                done(err);
            });
    });


    it('Node-Red Test - Admin user Should able to retrieve node red flow same we posted earlier', function (done) {
        var api = defaults(supertest(bootstrap.app));
        //console.log(accessToken);
        var url = '/red' + '/flows?access_token=' + adminAccessToken;

        api.set('Accept', 'application/json')
            .set('accessToken', adminAccessToken)
            .get(url)
            .end(function (err, resp) {
                expect(resp.status).to.be.equal(200);
                expect(resp.body.flows.length).to.be.equal(4);
                expect(resp.body.flows[0].label).to.be.equal('node-red-default');
                expect(resp.body.flows[3].name).to.be.equal('node-red-default');
                return done();
            });
    });


    it('Node-Red Test - Should able to execute flow when accessing Literal model by tenant user - this will cause both the flows to execute - one set by user and one set by admin', function (done) {
        var flag = true;
        var flag2 = true;
        function cb() {
            var cnt = 0;
            return function () {
                ++cnt;
                if (cnt >= 2)
                    return done();
            }
        }
        var done2 = cb();
        // Listen to event first before firing .find which will trigger the access hook.
        models["Literal"].on("notifyLiteral2", function (payload) {
            if (!flag)
              return;
            flag = false;
            expect(payload).not.to.be.undefined;
            expect(payload.ctx).not.to.be.undefined;
            expect(payload.ctx.tenantId).to.be.equal("default");
            return done2();

        });
        
        models["Literal"].on("notifyLiteral", function (payload) {
            if (!flag2)
                return;
            flag2 = false;
            expect(payload).not.to.be.undefined;
            expect(payload.ctx).not.to.be.undefined;
            expect(payload.ctx.tenantId).to.be.equal("test-tenant");
            return done2();

        });
        //this should trigger node red flow for admin flow only
        models["Literal"].find({}, defaultContext, function (err, results) {
            // do nothing..
            // node-red flow should trigger and it should raise the event. 
            // below that event is captured for this test case.
        });
    });
    it('Node-Red Test - switch tenant to post the flow', function (done) {
        var data = {
            tenantId: 'test-tenant'
        };
        var api = defaults(supertest(bootstrap.app));
        var postUrl = bootstrap.basePath + '/BaseUsers/switch-tenant?access_token=' + adminAccessToken;
        api.set('Accept', 'application/json')
            .post(postUrl)
            .send(data)
            .expect(200)
            .end(function (err, result) {
                if (err) {
                    done(err);
                } else {
                    expect(result.body).not.to.be.undefined;
                    expect(result.body.tenantId).to.be.equal('test-tenant');
                    done();
                }
            });
    });

    it('Node-Red Test - should able to create flow for dynamically created model', function (done) {
        var modelName = 'NodeRedTestModel';
        var postData = {
            name: modelName,
            base: 'BaseEntity',
            plural: modelName + 's',
            properties: {}
        };

        models.ModelDefinition.create(postData, defaultContext, function (err, res) {
            if (err)
                return done(err);

            expect(res).not.to.be.undefined;
            var model = loopback.findModel(modelName, defaultContext);
            expect(model).not.to.be.null;

            var flows = [{ "id": "5b4e055c.3134aa", "type": "tab", "label": "node-red-test-tenant2" },
                { "id": "f2978c55.016aa", "type": "async-observer", "z": "5b4e055c.3134aa", "name": "node-red-test-tenant2", "modelname": "NodeRedTestModel", "method": "access", "x": 162, "y": 191, "wires": [["f5c48f2.d0e0aa"]] },
                { "id": "f5c48f2.d0e0aa", "type": "function", "z": "5b4e055c.3134aa", "name": "node-red-test-tenant", "func": "console.log('******* test-tenant ********');\nvar loopback = global.get('loopback');\nvar literalModel = loopback.findModel('" + "NodeRedTestModel" + "', msg.callContext);\n  console.log('**********************--->', literalModel.modelName); literalModel.emit(\"notifyNodeRedTestModel\", msg.callContext);\n\nreturn msg;", "outputs": 1, "noerr": 0, "x": 439, "y": 165, "wires": [["9a0d6af6.7e8eaa"]] },
                { "id": "9a0d6af6.7e8eaa", "type": "debug", "z": "5b4e055c.3134aa", "name": "node-red-test-tenant", "active": true, "console": "false", "complete": "true", "x": 661, "y": 147, "wires": [] }];

            var api = defaults(supertest(bootstrap.app));
            //console.log(accessToken);
            var postUrl = '/red' + '/flows?access_token=' + adminAccessToken;
            console.log('cookie ', _version);
            api.set('Accept', 'application/json')
                .post(postUrl)
                .set('accessToken', adminAccessToken)
                .send({ flows: flows, rev: _version  })
                .end(function (err, resp) {
                    if (err) {
                        console.log(resp); 
                        return done(err);
                    };
                    expect(resp.status).to.be.equal(200);
                    return done(err);
                });
        });
    });

    it('Node-Red Test - should able execute create flow for dynamically created model', function (done) {
        var flag = true;
        // Listen to event first before firing .find which will trigger the access hook.
        var model = loopback.findModel('NodeRedTestModel', defaultContext);
        model.on("notifyNodeRedTestModel", function (payload) {
            console.log('notifyNodeRedTestModel');
            if (!flag)
                return;
            flag = false;
            expect(payload).not.to.be.undefined;
            expect(payload.ctx).not.to.be.undefined;
            expect(payload.ctx.tenantId).to.be.equal("test-tenant");
            return done();

        });
        //this should trigger node red flow for admin flow only
        model.find({}, defaultContext, function (err, results) {
            // do nothing..
            // node-red flow should trigger and it should raise the event. 
            // below that event is captured for this test case.
        });
    });

});

describe(chalk.blue('Access control to node-red test'), function () {
    this.timeout(90000);
    var accessToken_developer;
    var accessToken_admin;

    before('Login to framework as Non Admin user', function (done) {

        var user_developer = {
            'username': 'nonAdminUser',
            'password': 'nonAdminUser',
            'email': 'nonAdminUser@mycompany.com',
            'id': 'developer'
        };

        bootstrap.createTestUser(user_developer, 'developer', function (){
            var userDetails = {
                'password': user_developer.password,
                'email': user_developer.email
            };
            
            bootstrap.login(userDetails, function (token) {
                accessToken_developer = token;
                return done();
            });
        });      

    });

    before('Login to framework as Admin user', function (done) {
        bootstrap.login({ 'username': 'admin', 'password': 'admin' }, function (token) {
            accessToken_admin = token;
            return done();
        });
    });

    it('Node-Red Test - Admin user Should able to accesws node red rout', function (done) {
        var api = defaults(supertest(bootstrap.app));
        var url = '/red/flows?access_token=' + accessToken_admin;

        api.set('Accept', 'application/json')
            .set('accessToken', accessToken_admin)
            .get(url)
            .end(function (err, resp) {
                expect(resp.status).to.be.equal(200);
                return done();
            });
    });

    it('Node-Red Test - non admin user Should Not able to accesws node red rout', function (done) {
        var api = defaults(supertest(bootstrap.app));
        var url = '/red/flows?access_token=' + accessToken_developer;

        api.set('Accept', 'application/json')
            .set('accessToken', accessToken_developer)
            .get(url)
            .end(function (err, resp) {
                expect(resp.status).to.be.equal(401);
                return done();
            });
    });

    it('Node-Red Test - non admin user Should Not able to create node red flow', function (done) {

        var flows = [{ "id": "5b4e055c.3134cc", "type": "tab", "label": "node-red-test-tenant" },
        { "id": "f2978c55.016ab", "type": "async-observer", "z": "5b4e055c.3134cc", "name": "node-red-test-tenant", "modelname": "Literal", "method": "access", "x": 162, "y": 191, "wires": [["f5c48f2.d0e007"]] },
        { "id": "f5c48f2.d0e007", "type": "function", "z": "5b4e055c.3134cc", "name": "node-red-test-tenant", "func": "console.log('******* test-tenant ********');\nvar loopback = global.get('loopback');\nvar literalModel = loopback.findModel('" + "Literal" + "');\nliteralModel.emit(\"notifyLiteral\", msg.callContext);\n\nreturn msg;", "outputs": 1, "noerr": 0, "x": 439, "y": 165, "wires": [["9a0d6af6.7e8ec8"]] },
        { "id": "9a0d6af6.7e8ec8", "type": "debug", "z": "5b4e055c.3134cc", "name": "node-red-test-tenant", "active": true, "console": "false", "complete": "true", "x": 661, "y": 147, "wires": [] }];

        var api = defaults(supertest(bootstrap.app));
        var postUrl = '/red' + '/flows?access_token=' + accessToken_developer;
        
        api.set('Accept', 'application/json')
            .post(postUrl)
            .set('accessToken', accessToken_developer)
            .send({ flows: flows })
            .end(function (err, resp) {
                expect(resp.status).to.be.equal(401);
                done(err);
            });
    });


    after('cleanup', function (done) {
        done();
    });
});