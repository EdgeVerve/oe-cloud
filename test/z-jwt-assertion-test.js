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
var loopback = require('loopback');
var models = bootstrap.models;
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var jwt = require('jsonwebtoken');
var api = supertest(app);

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

var createToken = function (user, key) {
  var secret = key || 'secret';
  var token = jwt.sign(user, secret);
  return token;
};

// Test cases for testing the JWT authentication scheme .
describe(chalk.blue('JWT assertion test'), function () {
  var endPointUrl = bootstrap.basePath + '/BaseUsers';

  this.timeout(5000);

  before('Adding user to BaseUser', function (done) {
    var User = loopback.getModelByType('User');
    User.create(demouser1, bootstrap.defaultContext, function (err, user) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('Test - Authorized user - Should give user details ', function (done) {
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
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
  it('Test - Unauthorized user - Should not give user details', function (done) {
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
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
  it('Test - Token expired - Should not give user details', function (done) {
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
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
  it('Test - Invalid audience - Should not give user details', function (done) {
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
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
  it('Test - Invalid secret - Should not give user details', function (done) {
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
    var secret = 'invalid';
    var jwt = createToken(jwtOptions, secret);

    api.get(endPointUrl + '/10')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('x-jwt-assertion', jwt)
      .set('tenant_id', 'test-tenant')
      .expect(401)
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
  it('Test - Invalid issuer - Should not give user details', function (done) {
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
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
  it('Test - Username and email missing - Should not give user details', function (done) {
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
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
  it('Test - New user - Should not give user details', function (done) {
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
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
});

describe(chalk.blue('JWT assertion inherited model test'), function () {
  var endPointUrl2 = bootstrap.basePath + '/UserTestModel2';
  before('Changing config to use JWT Assertion', function (done) {
    var BaseUser = loopback.findModel('BaseUser');
    var newUserModel = 'UserTestModel2';
    var modelDetails = {
      name: newUserModel,
      base: BaseUser,
      plural: newUserModel
    };

    var newmodel = loopback.createModel(modelDetails);
    app.model(newmodel, {
      dataSource: 'db'
    });

    var user = loopback.findModel('UserTestModel2');
    user.create(demouser2, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
        // delete app.models["UserTestModel2"];
      }
      done();
    });
  });

  after('Remove Test Model', function (done) {
    models.UserTestModel2.destroyById(100, bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      }
      done();
    });
  });

  it('Test - Authorized user - Should give user details ', function (done) {
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
    api.get(endPointUrl2 + '/100')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('x-jwt-assertion', jwt)
      .set('tenant_id', 'test-tenant')
      .expect(200)
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
  it('Test - Unauthorized user - Should not give user details', function (done) {
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

    api.get(endPointUrl2 + '/200')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('x-jwt-assertion', jwt)
      .set('tenant_id', 'test-tenant')
      .expect(401)
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
  it('Test - Token expired - Should not give user details', function (done) {
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

    api.get(endPointUrl2 + '/100')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('x-jwt-assertion', jwt)
      .set('tenant_id', 'test-tenant')
      .expect(401)
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
  it('Test - Invalid audience - Should not give user details', function (done) {
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

    api.get(endPointUrl2 + '/100')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('x-jwt-assertion', jwt)
      .set('tenant_id', 'test-tenant')
      .expect(401)
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
  it('Test - Invalid secret - Should not give user details', function (done) {
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
    var secret = 'invalid';
    var jwt = createToken(jwtOptions, secret);

    api.get(endPointUrl2 + '/100')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('x-jwt-assertion', jwt)
      .set('tenant_id', 'test-tenant')
      .expect(401)
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
  it('Test - Invalid issuer - Should not give user details', function (done) {
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

    api.get(endPointUrl2 + '/100')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('x-jwt-assertion', jwt)
      .set('tenant_id', 'test-tenant')
      .expect(401)
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
  it('Test - Username and email missing - Should not give user details', function (done) {
    // JWT
    var jwtOptions = {
      'iss': 'infosys.com',
      'iat': 1489992854,
      'exp': 1837148054,
      'aud': 'mycompany.net',
      'sub': 'demouser2@gmail.com'
    };

    var jwt = createToken(jwtOptions);
    api.get(endPointUrl2 + '/100')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('x-jwt-assertion', jwt)
      .set('tenant_id', 'test-tenant')
      .expect(401)
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
  it('Test - New user - Should not give user details', function (done) {
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
    api.get(endPointUrl2 + '/100')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('x-jwt-assertion', jwt)
      .set('tenant_id', 'test-tenant')
      .expect(401)
      .end(function (err, res) {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
});
