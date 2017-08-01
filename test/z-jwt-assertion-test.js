/**
 * 
 * ©2016-2017 mycompany Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var app = bootstrap.app;
var chai = require('chai');
chai.use(require('chai-things'));
var expect = chai.expect;
var loopback = require('loopback');
var models = bootstrap.models;
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var jwt = require('jsonwebtoken');
var jwtUtil = require('../lib/jwt-token-util');
var api = supertest(app);
var appDetails = {
    "appId": "abc123",
    "appName": "external app",
    "supportedRoles": ["manager"]
}

var roleDetail = {
    "id": "manager",
    "name": "manager"
}

var testModel = {
    "properties": {
        "name": { "type": "string" }
    },
    "name": "managerTable",
    "plural": "managerTables",
    "base": "BaseEntity",
    "acls": [{
            "accessType": "*",
            "principalType": "ROLE",
            "principalId": "$everyone",
            "permission": "DENY",
            "property": "*"
        },
        {
            "accessType": "*",
            "principalType": "ROLE",
            "principalId": "manager",
            "permission": "ALLOW",
            "property": "*"
        }
    ]

}

var demouser1 = {
    'username': 'demouser1@gmail.com',
    'password': 'password++',
    'email': 'demouser1@gmail.com',
    'tenantId': 'test-tenant',
    'id': 10
};

var demouser2 = {
    'username': 'demouser2@gmail.com',
    'password': 'password ++',
    'email': 'demouser2@gmail.com',
    'tenantId': 'test-tenant',
    'id': 100
};

var demouser3 = {
    'username': 'demouser3@gmail.com',
    'password': 'password++',
    'email': 'demouser3@gmail.com',
    'tenantId': 'test-tenant',
    'id': 1000
}

var createToken = function(user, key, algo) {
    var secret = key || 'secret';
    var token = jwt.sign(user, secret);
    return token;
};

// Test cases for testing the JWT authentication scheme .
describe(chalk.blue('JWT assertion test'), function() {
    var endPointUrl = bootstrap.basePath + '/BaseUsers';

    this.timeout(5000);

    before('Adding user to BaseUser', function(done) {
        var User = loopback.getModelByType('User');
        User.create([demouser1, demouser3], bootstrap.defaultContext, function(err, users) {
            if (err) {
                done(err);
            } else {
                var trustedApp = loopback.getModelByType('TrustedApp');
                trustedApp.create(appDetails, bootstrap.defaultContext, function(err, tapp) {
                    if (err) {
                        done(err);
                    } else {
                        var modelDef = loopback.getModelByType('ModelDefinition');
                        modelDef.create(testModel, bootstrap.defaultContext, function(err, model) {
                            if (err) {
                                done(err);
                            } else {
                                var role = loopback.getModelByType('BaseRole');
                                role.create(roleDetail, bootstrap.defaultContext, function(err, role) {
                                    if (err) {
                                        done(err);
                                    } else {
                                        done()
                                    }
                                })
                            }
                        })
                    }
                })
            }
        });
    });

    it('Test - Authorized user - Should give user details ', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'sub': 'demouser1@gmail.com',
            'username': 'demouser1@gmail.com',
            'email': 'demouser1@gmail.com'
        };
        var jwt = createToken(jwtOptions);

        var api = defaults(supertest(app));
        api.get(endPointUrl + '/10')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Authorized User - Should give User access even if app details not present but jwt username matches', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'client_id': 'abc456',
            'sub': 'demouser3@gmail.com',
            'username': 'demouser3@gmail.com',
            'email': 'demouser3@gmail.com'
        };
        var jwt = createToken(jwtOptions);

        var api = defaults(supertest(app));
        api.get(endPointUrl + '/1000')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Unauthorized user - Should not give user details', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'sub': 'demouser@gmail.com',
            'username': 'demouser@gmail.com',
            'email': 'demouser@gmail.com'
        };

        var jwt = createToken(jwtOptions);
        api.get(endPointUrl + '/30')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Token expired - Should not give user details', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1456498420,
            'aud': 'mycompany.net',
            'sub': 'demouser1@gmail.com',
            'username': 'demouser1@gmail.com',
            'email': 'demouser1@gmail.com'
        };

        var jwt = createToken(jwtOptions);

        api.get(endPointUrl + '/10')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Invalid audience - Should not give user details', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany',
            'sub': 'demouser1@gmail.com',
            'username': 'demouser1@gmail.com',
            'email': 'demouser1@gmail.com'
        };

        var jwt = createToken(jwtOptions);
        api.get(endPointUrl + '/10')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Invalid secret - Should not give user details', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'sub': 'demouser1@gmail.com',
            'username': 'demouser1@gmail.com',
            'email': 'demouser1@gmail.com'
        };
        var secret = "invalid";
        var jwt = createToken(jwtOptions, secret);

        api.get(endPointUrl + '/10')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Invalid issuer - Should not give user details', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'infosys.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'sub': 'demouser1@gmail.com',
            'username': 'demouse1r@gmail.com',
            'email': 'demouser1@gmail.com'
        };

        var jwt = createToken(jwtOptions);

        api.get(endPointUrl + '/10')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Username and email missing - Should not give user details', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'infosys.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'sub': 'demouser1@gmail.com'
        };

        var jwt = createToken(jwtOptions);
        api.get(endPointUrl + '/10')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - New user - Should not give user details', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'infosys.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'sub': 'demouser@gmail.com',
            'username': 'demouser@ev.com'
        };

        var jwt = createToken(jwtOptions);
        api.get(endPointUrl + '/10')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Authorized app - Should give app access to test model with access only to manager ', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'client_id': 'abc123'
        };
        var jwt = createToken(jwtOptions);

        var api = defaults(supertest(app));
        api.get(bootstrap.basePath + '/managerTables')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .set('username', 'rocky')
            .set('email', 'rocky@email.com')
            .set('roles', '["manager"]')
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Authorized app - Should not give app access if trusted app not found ', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'client_id': 'abc456'
        };
        var jwt = createToken(jwtOptions);

        var api = defaults(supertest(app));
        api.get(bootstrap.basePath + '/managerTables')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .set('username', 'rocky')
            .set('email', 'rocky@email.com')
            .set('roles', '["manager"]')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Authorized app - Should not give app access to test model with unsupported role passed ', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'client_id': 'abc123'
        };
        var jwt = createToken(jwtOptions);

        var api = defaults(supertest(app));
        api.get(bootstrap.basePath + '/managerTables')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .set('username', 'rocky')
            .set('email', 'rocky@email.com')
            .set('roles', '["supplier"]')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Authorized app - Should not give app access if username email not given in header ', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'client_id': 'abc123'
        };
        var jwt = createToken(jwtOptions);

        var api = defaults(supertest(app));
        api.get(bootstrap.basePath + '/managerTables')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .set('roles', '["manager"]')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });

    it('Test - Authorized User - Should not give model access if app details not present but jwt username matches just by role passed in header', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'client_id': 'abc456',
            'sub': 'demouser1@gmail.com',
            'username': 'demouser1@gmail.com',
            'email': 'demouser1@gmail.com'
        };
        var jwt = createToken(jwtOptions);

        var api = defaults(supertest(app));
        api.get(endPointUrl + '/managerTables')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .set('username', 'rocky')
            .set('email', 'rocky@email.com')
            .set('roles', '["manager"]')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });

    it('Test - PublicKey sanitation code returns key', function(done) {
        var PublicKey = "-----BEGIN PUBLIC KEY-----MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCZfwG/2xBCStgRGWTCrkujlw7i8CGiDGERiUppttA2z6SgAhz0SctlCZsPBHEgFKy67NIg4DD2KYlYuUhX50XEjg+QeYC5TGbMinOSyv+i5dgF9EswM5w9mZ4MQ3qO6cIiuvKJeftzlp4Nip3tZgjeSEMP2al6q5wDaEGh269kwQIDAQAB-----END PUBLIC KEY-----";
        var result = jwtUtil.sanitizePublicKey(PublicKey);
        expect(result).not.to.be.null
        done();
    });
    it('Test - Authorized app - Should give app access to test model with access only to manager ', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'client_id': 'abc123'
        };
        var jwt = createToken(jwtOptions);

        var api = defaults(supertest(app));
        api.get(bootstrap.basePath + '/managerTables')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .set('username', 'rocky')
            .set('email', 'rocky@email.com')
            .set('roles', '["manager"]')
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Authorized app - Should not give app access if trusted app not found ', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'client_id': 'abc456'
        };
        var jwt = createToken(jwtOptions);

        var api = defaults(supertest(app));
        api.get(bootstrap.basePath + '/managerTables')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .set('username', 'rocky')
            .set('email', 'rocky@email.com')
            .set('roles', '["manager"]')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Authorized app - Should not give app access to test model with unsupported role passed ', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'client_id': 'abc123'
        };
        var jwt = createToken(jwtOptions);

        var api = defaults(supertest(app));
        api.get(bootstrap.basePath + '/managerTables')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .set('username', 'rocky')
            .set('email', 'rocky@email.com')
            .set('roles', '["supplier"]')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Authorized app - Should not give app access if username email not given in header ', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'client_id': 'abc123'
        };
        var jwt = createToken(jwtOptions);

        var api = defaults(supertest(app));
        api.get(bootstrap.basePath + '/managerTables')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .set('roles', '["manager"]')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Authorized User - Should give User access even if app details not present but jwt username matches', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'client_id': 'abc456',
            'sub': 'demouser1@gmail.com',
            'username': 'demouser1@gmail.com',
            'email': 'demouser1@gmail.com'
        };
        var jwt = createToken(jwtOptions);

        var api = defaults(supertest(app));
        api.get(endPointUrl + '/10')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Authorized User - Should not give model access if app details not present but jwt username matches just by role passed in header', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'client_id': 'abc456',
            'sub': 'demouser1@gmail.com',
            'username': 'demouser1@gmail.com',
            'email': 'demouser1@gmail.com'
        };
        var jwt = createToken(jwtOptions);

        var api = defaults(supertest(app));
        api.get(endPointUrl + '/managerTables')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .set('username', 'rocky')
            .set('email', 'rocky@email.com')
            .set('roles', '["manager"]')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });

});

describe(chalk.blue('JWT assertion inherited model test'), function() {
    var endPointUrl2 = bootstrap.basePath + '/UserTestModel2';
    before('Changing config to use JWT Assertion', function(done) {
        var BaseUser = loopback.findModel('BaseUser');
        var newUserModel = 'UserTestModel2';
        var modelDetails = {
            name: newUserModel,
            base: BaseUser,
            plural: newUserModel
        };

        var newmodel = loopback.createModel(modelDetails);
        newmodel.clientModelName = newUserModel;
        newmodel.clientPlural = newUserModel + 's';
        app.model(newmodel, {
            dataSource: 'db'
        });

        var user = loopback.findModel('UserTestModel2');
        user.create(demouser2, bootstrap.defaultContext, function(err, res) {
            if (err) {
                done(err);
                // delete app.models["UserTestModel2"];
            }
            done();
        });
    });

    after('Remove Test Model', function(done) {
        models.UserTestModel2.destroyById(100, bootstrap.defaultContext, function(err, res) {
            if (err) {
                done(err);
            }
            done();
        });
    });

    it('Test - Authorized user - Should give user details ', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'sub': 'demouser2@gmail.com',
            'username': 'demouser2@gmail.com',
            'email': 'demouser2@gmail.com'
        };

        var jwt = createToken(jwtOptions);
        var api = defaults(supertest(app));
        api.get(endPointUrl2 + '/100')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Unauthorized user - Should not give user details', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'sub': 'demouser@gmail.com',
            'username': 'demouser@gmail.com',
            'email': 'demouser@gmail.com'
        };

        var jwt = createToken(jwtOptions);
        var api = defaults(supertest(app));
        api.get(endPointUrl2 + '/200')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Token expired - Should not give user details', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1456498420,
            'aud': 'mycompany.net',
            'sub': 'demouser2@gmail.com',
            'username': 'demouser2@gmail.com',
            'email': 'demouser2@gmail.com'
        };

        var jwt = createToken(jwtOptions);
        var api = defaults(supertest(app));
        api.get(endPointUrl2 + '/100')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Invalid audience - Should not give user details', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany',
            'sub': 'demouser2@gmail.com',
            'username': 'demouser2@gmail.com',
            'email': 'demouser2@gmail.com'
        };

        var jwt = createToken(jwtOptions);
        var api = defaults(supertest(app));
        api.get(endPointUrl2 + '/100')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Invalid secret - Should not give user details', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'mycompany.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'sub': 'demouser2@gmail.com',
            'username': 'demouser2@gmail.com',
            'email': 'demouser2@gmail.com'
        };
        var secret = "invalid";
        var jwt = createToken(jwtOptions, secret);
        var api = defaults(supertest(app));
        api.get(endPointUrl2 + '/100')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Invalid issuer - Should not give user details', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'infosys.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'sub': 'demouser2@gmail.com',
            'username': 'demouse2r@gmail.com',
            'email': 'demouser2@gmail.com'
        };

        var jwt = createToken(jwtOptions);
        var api = defaults(supertest(app));
        api.get(endPointUrl2 + '/100')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - Username and email missing - Should not give user details', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'infosys.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'sub': 'demouser2@gmail.com'
        };

        var jwt = createToken(jwtOptions);
        var api = defaults(supertest(app));
        api.get(endPointUrl2 + '/100')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('Test - New user - Should not give user details', function(done) {
        // JWT
        var jwtOptions = {
            'iss': 'infosys.com',
            'iat': 1489992854,
            'exp': 1837148054,
            'aud': 'mycompany.net',
            'sub': 'demouser@gmail.com',
            'username': 'demouser2@ev.com'
        };

        var jwt = createToken(jwtOptions);
        var api = defaults(supertest(app));
        api.get(endPointUrl2 + '/100')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('x-jwt-assertion', jwt)
            .set('tenant_id', 'test-tenant')
            .expect(401)
            .end(function(err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
});