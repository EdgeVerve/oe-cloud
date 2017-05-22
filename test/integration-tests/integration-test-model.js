/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
//This File contains tests related to Model Definitions
//var chai = require('chai');
//var expect = chai.expect;
var chalk = require('chalk');
var app_url = process.env.APP_URL || 'http://localhost:3000/';
process.env.NODE_TLS_REJECT_UNAUTHORIZED=0;
var request = require('supertest')(app_url);
//var mongoHost = process.env.MONGO_HOST || 'localhost';
var accessToken;
var testUser = {
    'username': 'testadmin',
    'email': 'test@admin.com',
    'password': 'testadmin'
};

var testRoleMapping = {
    "id": "testadmin",
    "principalType": "testadmin",
    "principalId": "testadmin",
    "_isDeleted": false,
    "roleId": "admin"
};

var testModel = {
    'name': 'StarWars',
    'base': 'BaseEntity',
    'strict': false,
    'idInjection': true,
    'validateUpsert': true,
    'cacheable': true,
    'properties': {
        'name': {
            'type': 'string',
            'unique': true,
            'min': 4,
            'max': 7
        },
        'numericField1': {
            'type': 'number',
            'numericality': 'integer'
        },
        'numericField2': {
            'type': 'number',
            'absence': true
        },
        'clan': {
            'type': 'string',
            'required': true
        },
        'country': {
            'type': 'string',
            'notin': ['England'],
            'is': 8
        },
        'gender': {
            'type': 'string',
            'in': ['Male', 'Female'],
            'required': false
        },
        'shipName': {
            'type': 'string',
            'pattern': '^[A-Za-z0-9-]+$'
        }
    },
    'id': 'StarWars',
    'validations': [],
    'relations': {},
    'acls': [],
    'methods': {}
};

var testData = [{
    'name': 'Anakin',
    'numericField1': 10,
    'gender': 'Male',
    'country': 'Tatooine',
    'clan': 'Jedi',
    'shipName': 'Delta-7B'
}, {
    'name': 'Amidala',
    'numericField1': 10,
    'gender': 'Female',
    'country': 'Tatooine',
    'clan': 'Jedi'
}, {
    'name': 'Doku',
    'numericField1': 10,
    'gender': 'Male',
    'country': 'Tatooine',
    'clan': 'Sith'
}];

var testModifiedModel = {
    'name': 'StarWars',
    'base': 'BaseEntity',
    'strict': false,
    'idInjection': true,
    'validateUpsert': true,
    'cacheable': true,
    'properties': {
        'model-name': {
            'type': 'string',
            'unique': true,
            'min': 4,
            'max': 7
        },
        'numericField1': {
            'type': 'number',
            'numericality': 'integer'
        },
        'numericField2': {
            'type': 'number',
            'absence': true
        },
        'clan': {
            'type': 'string',
            'required': true
        },
        'country': {
            'type': 'string',
            'notin': ['England'],
            'is': 8
        },
        'gender': {
            'type': 'string',
            'in': ['Male', 'Female'],
            'required': false
        },
        'shipName': {
            'type': 'string',
            'pattern': '^[A-Za-z0-9-]+$'
        },
        'reviewed': {
            'type': 'boolean'
        }
    },
    'id': 'StarWars',
    'validations': [],
    'relations': {},
    'acls': [],
    'methods': {}
};

describe(chalk.blue('integration-test-model'), function() {
    this.timeout(60000);

    it('Checks server', function(done) {
        request
            .get('/')
            .expect(200)
            .end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });

    it('Checks User Creation', function(done) {
        var sendData = testUser;
        request
            .post('api/BaseUsers')
            .send(sendData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });

    it('Checks Base Role Mapping Creation', function(done) {
        var sendData = testRoleMapping;
        request
            .post('api/BaseRoleMappings')
            .send(sendData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });
    it('login using test-admin', function(done) {
        var sendData = {
            'username': testUser.username,
            'password': testUser.password
        };

        request
            .post('api/BaseUsers/login')
            .send(sendData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    accessToken = resp.body.id;
                    done();
                }
            });
    });

    it('Checks Model Creation with Property Validations and cacheable true', function(done) {
        var sendData = testModel;
        request
            .post('api/ModelDefinitions?access_token=' + accessToken)
            .set('tenant_id', 'test-tenant')
            .set('REMOTE_USER', 'testUser')
            .send(sendData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });

    it('should be able to post data successfully', function(done) {
        var sendData = testData;
        request
            .post('api/StarWars?access_token=' + accessToken)
            .set('tenant_id', 'test-tenant')
            .set('REMOTE_USER', 'testUser')
            .send(sendData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });

    it('should fail because data is invalid', function(done) {
        var sendData = {
            'name': 'Anakin',
            'numericField1': 10,
            'gender': 'Male',
            'country': 'Tatooine',
            'clan': 'Jedi',
            'shipName': 'Delta-7B#'
        };

        request
            .post('api/StarWars?access_token=' + accessToken)
            .set('tenant_id', 'test-tenant')
            .set('REMOTE_USER', 'testUser')
            .send(sendData)
            .expect(422).end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });

    it('Should create the model with custom validations successfully', function(done) {
        var sendData = {
            'name': 'ActiveShips',
            'base': 'BaseEntity',
            'strict': false,
            'idInjection': true,
            'options': {
                'validateUpsert': true
            },
            'properties': {
                'name': {
                    'type': 'string',
                    'required': true
                },
                'active': {
                    'type': 'boolean',
                    'required': true
                }
            },
            'validations': [],
            'oeValidations': {
                'nameCheck': {
                    'validateWhen': {},
                    'type': 'reference',
                    'errorCode': 'ship-err-001',
                    'refModel': 'StarWars',
                    'refWhere': '{\"shipName\":\"{{name}}\"}'
                }
            },
            'relations': {},
            'acls': [],
            'methods': {}
        };

        request
            .post('api/ModelDefinitions?access_token=' + accessToken)
            .set('tenant_id', 'test-tenant')
            .set('REMOTE_USER', 'testUser')
            .send(sendData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });

    it('should successfully insert the data in Child model', function(done) {
        var sendData = {
            'name': 'Delta-7B',
            'active': true
        };

        request
            .post('api/ActiveShips?access_token=' + accessToken)
            .set('tenant_id', 'test-tenant')
            .set('REMOTE_USER', 'testUser')
            .send(sendData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });

    it('should fail to insert the data in child model', function(done) {
        var sendData = {
            'name': 'Delta-8B',
            'active': true
        };

        request
            .post('api/ActiveShips?access_token=' + accessToken)
            .set('tenant_id', 'test-tenant')
            .set('REMOTE_USER', 'testUser')
            .send(sendData)
            .expect(422).end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });

    it('should create a personalization rule', function(done) {
        var sendData = {
            'modelName': 'StarWars',
            'personalizationRule': {
                'sort': {
                    'name': 'desc'
                },
                'filter': {
                    'clan': 'Jedi'
                },
                'fieldValueReplace': {
                    'gender': {
                        'Male': 'M',
                        'Female': 'F'
                    }
                },
                'fieldReplace': {
                    'numericField1': 'field1'
                }
            },
            'scope': {
                'clanType': 'Jedi'
            }
        };

        request
            .post('api/PersonalizationRules?access_token=' + accessToken)
            .set('tenant_id', 'test-tenant')
            .set('REMOTE_USER', 'testUser')
            .send(sendData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });

    it('should be able to modify model at runtime-Step1:delete', function(done) {
        request
            .delete('api/ModelDefinitions/' + testModel.id + '?access_token=' + accessToken)
            .expect(200).end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });

    xit('should be able to modify model at runtime-Step2:Create modified model', function(done) {
        var sendData = testModifiedModel;
        request
            .post('api/ModelDefinitions?access_token=' + accessToken)
            .set('tenant_id', 'test-tenant')
            .set('REMOTE_USER', 'testUser')
            .send(sendData)
            .expect(200).end(function(err, resp) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });

});