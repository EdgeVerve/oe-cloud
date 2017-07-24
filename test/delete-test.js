/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var expect = chai.expect;
var models = bootstrap.models;
var chalk = require('chalk');
var loopback = require('loopback');
describe(chalk.blue('Delete functionality test - Programmatically'), function () {
    this.timeout(90000);
    var testModel;
    var testModel2;
    var testModel3;
    var testModel4;

    var modelName = 'TestDeleteModel';
    var TestModel = {
        'name': modelName,
        'base': 'BaseEntity',
        'options': {
            'validateUpsert': true
        },
        'properties': {
            'name': {
                'type': 'string',
                'required': true,
                'unique': true
            }
        }
    };
    //without soft delete
    var modelName2 = 'TestModelWithOutSoftDelete';
    var TestModel2 = {
        'name': modelName2,
        'base': 'BaseEntity',
        'options': {
            'validateUpsert': true
        },
        'properties': {
            'name': {
                'type': 'string',
                'required': true,
                'unique': true
            }
        },
        'mixins': { 'SoftDeleteMixin': false }
    };

    //without version
    var modelName3 = 'TestModelWithOutVersion';
    var TestModel3 = {
        'name': modelName3,
        'base': 'BaseEntity',
        'options': {
            'validateUpsert': true
        },
        'properties': {
            'name': {
                'type': 'string',
                'required': true,
                'unique': true
            }
        },
        'mixins': { 'VersionMixin': true }
    };
    //without version and soft delete
    var modelName4 = 'TestModelWithOutBoth';
    var TestModel4 = {
        'name': modelName4,
        'base': 'BaseEntity',
        'options': {
            'validateUpsert': true
        },
        'properties': {
            'name': {
                'type': 'string',
                'required': true,
                'unique': true
            }
        },
        'mixins': {
            'SoftDeleteMixin': false,
            'VersionMixin': true
        }
    };

    before('create test model', function (done) {
        models.ModelDefinition.create([TestModel, TestModel2, TestModel3, TestModel4], bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                testModel = loopback.getModel(modelName, bootstrap.defaultContext);
                testModel2 = loopback.getModel(modelName2, bootstrap.defaultContext);
                testModel3 = loopback.getModel(modelName3, bootstrap.defaultContext);
                testModel4 = loopback.getModel(modelName4, bootstrap.defaultContext);
                done();
            }

        });
    });

    after('delete model clear in memory', function (done) {
        this.timeout(10000);
        models.ModelDefinition.destroyAll({ name: { inq: [TestModel, TestModel2, TestModel3, TestModel4] } }, bootstrap.defaultContext, function (err, res) {// to cover fallback code.
            done();
        });
    });

    it('Should create TestModel with SoftDeleteMixins SET ', function (done) {
        // with both version and soft delete
        expect(testModel).not.to.be.null;
        expect(testModel.definition.properties).not.to.be.undefined;
        expect(Object.keys(testModel.definition.properties)).to.include.members(Object.keys(TestModel.properties));
        expect(Object.keys(testModel.definition.properties)).to.include.members(['_isDeleted']);
        expect(Object.keys(testModel.definition.properties)).to.include.members(['_version']);
        //with version
        expect(testModel2).not.to.be.null;
        expect(testModel2.definition.properties).not.to.be.undefined;
        expect(Object.keys(testModel2.definition.properties)).to.include.members(Object.keys(TestModel2.properties));
        expect(Object.keys(testModel2.definition.properties)).to.not.have.members(['_isDeleted']);
        expect(Object.keys(testModel2.definition.properties)).to.include.members(['_version']);
        //with softDelete
        expect(testModel3).not.to.be.null;
        expect(testModel3.definition.properties).not.to.be.undefined;
        expect(Object.keys(testModel3.definition.properties)).to.include.members(Object.keys(TestModel3.properties));
        expect(Object.keys(testModel3.definition.properties)).to.include.members(['_isDeleted']);
        expect(Object.keys(testModel3.definition.properties)).to.not.have.members(['_version']);
        //without both
        expect(testModel4).not.to.be.null;
        expect(testModel4.definition.properties).not.to.be.undefined;
        expect(Object.keys(testModel4.definition.properties)).to.include.members(Object.keys(TestModel4.properties));
        expect(Object.keys(testModel4.definition.properties)).to.not.have.members(['_isDeleted']);
        expect(Object.keys(testModel4.definition.properties)).to.not.have.members(['_version']);

        done();
    });

    it('Should create a record in TestModel and delete the same with version number - deleteByID ', function (done) {
        var postData = {
            'name': 'TestCaseOne'
        };
        testModel.create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.false;
                testModel.destroyById(res.id, bootstrap.defaultContext, function (err2, res2) {
                    if (err2) {
                        done(err2);
                    } else {
                        expect(res2.count).to.be.equal(1);
                        done();
                    }
                });
            }
        });
    });
    it('Should create a record in TestModel and delete the same - deleteByID', function (done) {
        var postData = {
            'name': 'TestCaseTwo'
        };
        testModel.create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.false;
                testModel.destroyById(res.id, bootstrap.defaultContext, function (err2, res2) {
                    if (err2) {
                        done(err2);
                    } else {
                        done();
                    }
                });
            }
        });
    });

    it('Should create a record in TestModelWithOutSoftDelete and delete the - deleteByID ', function (done) {
        var postData = {
            'name': 'TestCaseThree'
        };
        testModel2.create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.undefined;
                testModel2.destroyById(res.id, bootstrap.defaultContext, function (err2, res2) {
                    if (err2) {
                        done(err2);
                    } else {
                        expect(res2.count).to.be.equal(1);
                        done();
                    }
                });
            }
        });
    });
    it('Should create a record in TestModelWithOutSoftDelete and delete the same (should fail) - deleteByID', function (done) {
        var postData = {
            'name': 'TestCaseFour'
        };
        testModel2.create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.undefined;
                testModel2.destroyById(res.id, bootstrap.defaultContext, function (err2, res2) {
                    if (err2) {
                        done(err2);
                    } else {
                        done();
                    }
                });
            }
        });
    });
    it('Should create a record in TestModelWithOutSoftDelete and delete the same deleteByID', function (done) {
        var postData = {
            'name': 'TestCaseFour2'
        };
        testModel2.create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.undefined;
                testModel2.destroyById(res.id, bootstrap.defaultContext, function (err2, res2) {
                    if (err2) {
                        done(err2);
                    } else {
                        done();
                    }
                });
            }
        });
    });
    it('Should create a record in TestModelWithOutVersion and delete the same, without version number (should pass) - deleteByID', function (done) {
        var postData = {
            'name': 'TestCaseFive'
        };
        testModel3.create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.false;
                testModel3.destroyById(res.id, bootstrap.defaultContext, function (err2, res2) {
                    if (err2) {
                        done(err2);
                    } else {
                        expect(res2.count).to.be.equal(1);
                        done();
                    }
                });
            }
        });
    });
    it('Should create a record in TestModelWithOutVersion and delete the same, without version number (should pass) - deleteByID', function (done) {
        var postData = {
            'name': 'TestCaseFive2'
        };
        testModel3.create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.false;
                testModel3.destroyById(res.id, bootstrap.defaultContext, function (err2, res2) {
                    if (err2) {
                        done(err2);
                    } else {
                        expect(res2.count).to.be.equal(1);
                        done();
                    }
                });
            }
        });
    });

    it('Should create a record in TestModelWithOutBoth and delete the same, without version number (should pass) - deleteByID', function (done) {
        var postData = {
            'name': 'TestCaseSix'
        };
        testModel4.create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.undefined;
                testModel4.destroyById(res.id, bootstrap.defaultContext, function (err2, res2) {
                    if (err2) {
                        done(err2);
                    } else {
                        expect(res2.count).to.be.equal(1);
                        done();
                    }
                });
            }
        });
    });
    it('Should create a record in TestModel and delete the same with where clause - destroyAll', function (done) {
        var postData = {
            'name': 'TestCaseSeven'
        };
        testModel.create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.false;
                testModel.destroyAll({ id: res.id }, bootstrap.defaultContext, function (err2, res2) {
                    if (err2) {
                        done(err2);
                    } else {
                        expect(res2.count).to.be.equal(1);
                        testModel.findById(res.id, bootstrap.defaultContext, function (err3, res3) {
                            if (err3) {
                                done(err3);
                            } else if (res3) {
                                done(new Error('Record not deleted'));
                            } else {
                                done();
                            }
                        });
                    }
                });
            }
        });
    });
    it('Should create a record in TestModelWithOutSoftDelete and delete the same, _isDeleted filed should be not present - destroyAll', function (done) {
        var postData = {
            'name': 'TestCaseEight'
        };
        testModel2.create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.undefined;
                testModel2.destroyAll({ id: res.id }, bootstrap.defaultContext, function (err2, res2) {
                    if (err2) {
                        done(err2);
                    } else {
                        expect(res2.count).to.be.equal(1);
                        done();
                    }
                });
            }
        });
    });
    it('Should create a record in TestModelWithOutVersion and delete the same, without version number (should pass) - destroyAll', function (done) {
        var postData = {
            'name': 'TestCaseNine'
        };
        testModel3.create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.false;
                testModel3.destroyAll({ id: res.id }, bootstrap.defaultContext, function (err2, res2) {
                    if (err2) {
                        done(err2);
                    } else {
                        expect(res2.count).to.be.equal(1);
                        done();
                    }
                });
            }
        });
    });

    it('Should create a record in TestModelWithOutBoth and delete the same - destroyAll', function (done) {
        var postData = {
            'name': 'TestCaseTen'
        };
        testModel4.create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.undefined;
                testModel4.destroyAll({ id: res.id }, bootstrap.defaultContext, function (err2, res2) {
                    if (err2) {
                        done(err2);
                    } else {
                        expect(res2.count).to.be.equal(1);
                        done();
                    }
                });
            }
        });
    });

});
