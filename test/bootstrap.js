/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var chalk = require('chalk');
var chai = require('chai');
chai.use(require('chai-things'));
//var expect = chai.expect;
var middleware = require('../server/middleware');
middleware['routes:before']['./middleware/otp-middleware']['enabled'] = true;
var appRoot = require('app-root-path');
var evapp = appRoot.require('/server/server');
var options = evapp.options;
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var loopback = require('loopback');
var config = require('../server/config');
// @jsonwebtoken is internal dependency of @oe-jwt-generator
var jwt = require('jsonwebtoken');
var async = require('async');
var fs = require('fs');
var expect = chai.expect;
//var accessToken;
var app = evapp.loopback();
process.env.JWT_CONFIG = "{\"issuer\": \"mycompany.com\",\"audience\": \"mycompany.net\",\"secretOrKey\":\"secret\",\"keyToVerify\":\"client_id\"}";
app.locals.enableJwt = true;
process.env.CONSISTENT_HASH = 'true';

options.clientAppRootDir = __dirname;
var basePath = app.get('restApiRoot');
app.locals.apphome = __dirname;
app.set('disableNodered', false);

//rule engine configuration - begin
app.set('jsFeelRelation', { disabled: false });
app.set('jsFeelExternalFunction', { disabled: false, path: 'test/model-rule-data/data/functions'});

app.set('jsFeelExecutionLogging', false);
app.set('jsFeelLogResult', false);
app.set('jsFeelLexerLogging', false);
//rule engine configuration - end

evapp.boot(app, options, function() {
    app.start();
    app.emit('EVstarted');
});
var basePath = app.get('restApiRoot');


var defaultUser = {
    username: 'testuser',
    password: 'testuser123',
    email: 'testuser@mycompany.com',
    tenantId: 'test-tenant',
    id: 20
};

var defaultContext = {
    ctx: {
        tenantId: 'test-tenant',
        remoteUser: 'test-user'
    }
};

function createAccessToken(username, callback) {
    var User = loopback.getModelByType('BaseUser');
    User.findOne({
        where: {
            username: username
        }
    }, defaultContext, function(err, userRec) {
        if (err) {
            callback(err, null);
        } else if (!userRec) {
            callback(new Error('user not found '), null);
        } else {
            userRec.createAccessToken(User.DEFAULT_TTL, defaultContext, function(err, token) {
                callback(err, token ? token.id : null);
            });
        }
    });
}

var createJWToken = function(user) {
    if (app.locals.enableJwt) {
        var obj = {
            'username': user.username,
            'email': user.email,
        };
        var opts = {
            'issuer': 'mycompany.com',
            'audience': 'mycompany.net',
            'algorithm': 'HS256'
        };
        var token = jwt.sign(obj, 'secret', opts);
        return token;
    }
};

var api = defaults(supertest(app));
if (app.locals.enableJwt) {
    var user = {
        'username': 'testuser',
        'email': 'testuser@mycompany.com',
    };
    var token = createJWToken(user);
    api.set('tenant-id', 'test-tenant');
    api.set('x-jwt-assertion', token);
}


if (config && config.disablecaching === false) {
    config.disablecaching = true;
    console.log('\n==================================================================\n');
    console.log('INFO: Caching is disabled for TestCases : (disablecaching: true)');
    console.log('\n==================================================================\n');
}
if (config && config.disableWorkflow === true) {
    config.disableWorkflow = false;
}

if (config) {
    config.enableDesigner = true;
    config.designer.assetPath = ['client/bower_components/images'];
}

/* When tests are run in git-lab, the oe-studio is not installed and
 * none of the oe-studio routes are setup. We create dummy directory before boot
 */
!fs.existsSync('client') && fs.mkdirSync('client');
!fs.existsSync('client/bower_components') && fs.mkdirSync('client/bower_components');
!fs.existsSync('client/bower_components/sample-element') && fs.mkdirSync('client/bower_components/sample-element');
!fs.existsSync('client/bower_components/images') && fs.mkdirSync('client/bower_components/images');
!fs.existsSync('client/bower_components/oe-studio') && fs.mkdirSync('client/bower_components/oe-studio');
!fs.existsSync('client/bower_components/oe-studio/templates') && fs.mkdirSync('client/bower_components/oe-studio/templates');
!fs.existsSync('client/bower_components/oe-studio/styles') && fs.mkdirSync('client/bower_components/oe-studio/styles');
!fs.existsSync('client/bower_components/oe-studio/index.html') && fs.writeFileSync('client/bower_components/oe-studio/index.html', '<html><body><div>oeCloud.io Page</div></body></html>', 'utf-8');
!fs.existsSync('client/bower_components/oe-studio/templates/default-form.html') && fs.writeFileSync('client/bower_components/oe-studio/templates/default-form.html', '<dom-module id=":componentName"><style></style><template id=":componentName"><div>oeCloud.io Form</div></template><script>Polymer({is:":componentName", properties:{ :modelAlias : {type: Object}});</script></dom-module>', 'utf-8');
!fs.existsSync('client/bower_components/oe-studio/templates/default-list.html') && fs.writeFileSync('client/bower_components/oe-studio/templates/default-list.html', '<dom-module id=":componentName"><style></style><template id=":componentName"><div>oeCloud.io List</div></template><script>Polymer({is:":componentName"});</script></dom-module>', 'utf-8');
!fs.existsSync('client/bower_components/oe-studio/templates/default-page.html') && fs.writeFileSync('client/bower_components/oe-studio/templates/default-page.html', '<html><body><div>oeCloud.io Page</div></body></html>', 'utf-8');
!fs.existsSync('client/bower_components/oe-studio/styles/default-theme.css') && fs.writeFileSync('client/bower_components/oe-studio/styles/default-theme.css', 'some css stuff', 'utf-8');
!fs.existsSync('client/bower_components/images/background.jpg') && fs.writeFileSync('client/bower_components/images/background.jpg', 'dummay asset data', 'utf-8');
!fs.existsSync('client/bower_components/images/audio.mp3') && fs.writeFileSync('client/bower_components/images/audio.mp3', 'dummay asset data', 'utf-8');
!fs.existsSync('client/bower_components/images/video.mp4') && fs.writeFileSync('client/bower_components/images/video.mp4', 'dummay asset data', 'utf-8');
!fs.existsSync('client/bower_components/sample-element/sample-element.html') && fs.writeFileSync('client/bower_components/sample-element/sample-element.html', '<dom-module id="sample-element"><style></style><template id="sample-element"><div>Sample Element</div></template><script>Polymer({is:"sample-element"});</script></dom-module>', 'utf-8');
!fs.existsSync('client/bower_components/sample-element/default-tpl.html') && fs.writeFileSync('client/bower_components/sample-element/default-tpl.html', '<dom-module id=":componentName"><style></style><template id=":componentName"><div>oeCloud.io List</div></template><script>Polymer({is:":componentName"});</script></dom-module>', 'utf-8');

var createTestUser = function(user, rolename, cb) {
    var User = loopback.getModelByType('BaseUser');
    var Role = loopback.getModelByType('BaseRole');
    var RoleMapping = loopback.getModelByType('BaseRoleMapping');

    var dbRole;
    var dbUser;

    async.series([
        function(done) {
            Role.findOne({
                where: {
                    name: rolename
                }
            }, defaultContext, function(err, res) {
                if (res) {
                    dbRole = res;
                    done();
                } else {
                    var role = {
                        name: rolename
                    };
                    Role.create(role, defaultContext, function(err, res) {
                        dbRole = res;
                        done();
                    });
                }
            });
        },
        function(done) {
            User.findOne({
                where: {
                    username: user.username
                }
            }, defaultContext, function(err, res) {
                if (res) {
                    dbUser = res;
                    done();
                } else {
                    User.create(user, defaultContext, function(err2, res) {
                        //console.log('created user ', err2, res);
                        dbUser = res;
                        done();
                    });
                }
            });
        },
        function(done) {
            var UserProfile = loopback.getModelByType('UserProfile');
            UserProfile.findOne({
                where: {
                    userId: dbUser.id
                }
            }, defaultContext, function(err, res) {
                if (res) {
                    done();
                } else {
                    var profile = {
                        firstName: dbUser.username,
                        lastName: 'J.',
                        department: 'finance',
                        userId: dbUser.id
                    };
                    UserProfile.create(profile, defaultContext, function(err2, res) {
                        done();
                    });
                }
            });
        },
        function(done) {
            RoleMapping.findOne({
                where: {
                    principalId: dbUser.id,
                    principalType: 'USER',
                    roleId: dbRole.id
                }
            }, defaultContext, function(err, res) {
                if (err) {
                    throw (new Error(err));
                }
                if (res) {
                    done();
                } else {
                    var mapping = {};
                    mapping.principalId = dbUser.id;
                    mapping.principalType = 'USER';
                    mapping.roleId = dbRole.id;
                    RoleMapping.create(mapping, defaultContext, function(err, res) {
                        //console.log('created mapping ', err, res);
                        done();
                    });
                }
            });
        },
        function() {
            cb();
        }
    ]);
};

var createAdminUser = function(done) {

    var adminUserContext = {
        ctx: {
            tenantId: 'default',
            remoteUser: 'system'
        }
    };

    async.series([function(cb) {
                var Tenant = loopback.getModelByType('Tenant');
                Tenant.create({
                    tenantId: 'default',
                    tenantName: 'default',
                    id: '9fab3286-442a-11e6-beb8-9e71128cae77'
                }, adminUserContext, function(err, res) {
                    if (err) {
                        if (err.code === 11000) {
                            return cb();
                        }
                        cb(err);
                    } else {
                        cb();
                    }
                });
            }, function(cb) {
                var adminUser = {
                    username: 'admin',
                    password: 'admin',
                    email: 'admin@mycompany.com',
                    emailVerified: true,
                    id: 'admin'
                }
                var BaseUser = loopback.getModelByType('BaseUser');
                BaseUser.create(adminUser, adminUserContext, function(err, res) {
                    if (err) {
                        if (err.code === 11000) {
                            return cb();
                        }
                        cb(err);
                    } else {
                        cb();
                    }
                });
            }, function(cb) {
                var UserProfile = loopback.getModelByType('UserProfile');
                UserProfile.create({
                    firstName: 'Super',
                    lastName: 'Administrator',
                    department: 'adminstration',
                    userId: 'admin',
                    id: 'fcd1a724-442a-11e6-beb8-9e71128cae77'
                }, adminUserContext, function(err, res) {
                    if (err) {
                        if (err.code === 11000) {
                            return cb();
                        }
                        cb(err);
                    } else {
                        cb();
                    }
                });
            },
            function(cb) {
                var Role = loopback.getModelByType('BaseRole');
                Role.create({
                    id: 'admin',
                    name: 'admin',
                    description: 'Admin'
                }, adminUserContext, function(err, res) {
                    if (err) {
                        if (err.code === 11000) {
                            return cb();
                        }
                        cb(err);
                    } else {
                        cb();
                    }
                });
            },
            function(cb) {
                var RoleMapping = loopback.getModelByType('BaseRoleMapping');
                RoleMapping.create({
                    id: 'admin',
                    principalType: 'USER',
                    principalId: 'admin',
                    roleId: 'admin'
                }, adminUserContext, function(err, res) {
                    if (err) {
                        if (err.code === 11000) {
                            return cb();
                        }
                        cb(err);
                    } else {
                        cb();
                    }
                });
            }
        ],
        function() {
            done();
        }
    );
};


function login(credentials, cb) {
    var postData = null;
    if (typeof credentials === 'function') {
        postData = {
            'username': defaultUser.username,
            'password': defaultUser.password
        };
        cb = credentials;
    } else {
        postData = credentials;
    }
    var postUrl = basePath + '/BaseUsers/login';
    var api = defaults(supertest(app));
    api.set('Accept', 'application/json')
        .set('tenant_id', 'test-tenant')
        .post(postUrl)
        .send(postData)
        .end(function(err, response) {
            expect(response.body.id).to.be.defined;
            var accessToken = response.body.id;
            cb(accessToken);
        });
}



module.exports = {
    chai: chai,
    app: app,
    appRoot: appRoot,
    basePath: basePath,
    models: app.models,
    api: api,
    options: options,
    createAccessToken: createAccessToken,
    createJWToken: createJWToken,
    createTestUser: createTestUser,
    login: login
};

var createACLsforTest = function(done) {
    var acls = [{
        "model": "dev",
        "principalType": "USER",
        "principalId": "admin",
        "permission": "ALLOW",
        "accessType": "*"
    }];
    var BaseACL = loopback.getModelByType('BaseACL');
    BaseACL.create(acls, defaultContext, function(err, recs) {
        //console.log(recs);
        done();
    });
};

Object.defineProperty(module.exports, "defaultContext", {
    get: function() {
        var callContext = {
            ctx: {
                tenantId: 'test-tenant',
                remoteUser: 'test-user'
            }
        };
        return callContext;
    }
});

// done(err||(new Error(res.body.error.details.messages.name[0])))

describe(chalk.blue('bootstrap test'), function() {

    this.timeout(80000);

    before('wait for boot scripts to complete', function(done) {
        app.on('EVstarted', function() {
            done();
        });
    });

    it('waiting for boot scripts to finish', function(done) {
        createAdminUser(function() {
            createTestUser(defaultUser, 'admin', function() {
                createACLsforTest(done);
            });
        });
    });

});
