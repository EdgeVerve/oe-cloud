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

describe(chalk.blue('Delete functionality test - Programmatically'), function () {
    this.timeout(90000);

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
        expect(models[modelName]).not.to.be.null;
        expect(models[modelName].definition.properties).not.to.be.undefined;
        expect(Object.keys(models[modelName].definition.properties)).to.include.members(Object.keys(TestModel.properties));
        expect(Object.keys(models[modelName].definition.properties)).to.include.members(['_isDeleted']);
        expect(Object.keys(models[modelName].definition.properties)).to.include.members(['_version']);
        //with version
        expect(models[modelName2]).not.to.be.null;
        expect(models[modelName2].definition.properties).not.to.be.undefined;
        expect(Object.keys(models[modelName2].definition.properties)).to.include.members(Object.keys(TestModel2.properties));
        expect(Object.keys(models[modelName2].definition.properties)).to.not.have.members(['_isDeleted']);
        expect(Object.keys(models[modelName2].definition.properties)).to.include.members(['_version']);
        //with softDelete
        expect(models[modelName3]).not.to.be.null;
        expect(models[modelName3].definition.properties).not.to.be.undefined;
        expect(Object.keys(models[modelName3].definition.properties)).to.include.members(Object.keys(TestModel3.properties));
        expect(Object.keys(models[modelName3].definition.properties)).to.include.members(['_isDeleted']);
        expect(Object.keys(models[modelName3].definition.properties)).to.not.have.members(['_version']);
        //without both
        expect(models[modelName3]).not.to.be.null;
        expect(models[modelName3].definition.properties).not.to.be.undefined;
        expect(Object.keys(models[modelName3].definition.properties)).to.include.members(Object.keys(TestModel4.properties));
        expect(Object.keys(models[modelName3].definition.properties)).to.not.have.members(['_isDeleted']);
        expect(Object.keys(models[modelName3].definition.properties)).to.not.have.members(['_version']);

        done();
    });

    it('Should create a record in TestModel and delete the same with version number - deleteByID ', function (done) {
        var postData = {
            'name': 'TestCaseOne'
        };
        models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.false;
                models[modelName].destroyById(res.id, bootstrap.defaultContext, function (err2, res2) {
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
        models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.false;
                models[modelName].destroyById(res.id, bootstrap.defaultContext, function (err2, res2) {
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
        models[modelName2].create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.undefined;
                models[modelName2].destroyById(res.id, bootstrap.defaultContext, function (err2, res2) {
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
        models[modelName2].create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.undefined;
                models[modelName2].destroyById(res.id, bootstrap.defaultContext, function (err2, res2) {
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
        models[modelName2].create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.undefined;
                models[modelName2].destroyById(res.id, bootstrap.defaultContext, function (err2, res2) {
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
        models[modelName3].create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.false;
                models[modelName3].destroyById(res.id, bootstrap.defaultContext, function (err2, res2) {
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
        models[modelName3].create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.false;
                models[modelName3].destroyById(res.id, bootstrap.defaultContext, function (err2, res2) {
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
        models[modelName4].create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.undefined;
                models[modelName4].destroyById(res.id, bootstrap.defaultContext, function (err2, res2) {
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
        models[modelName].create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.false;
                models[modelName].destroyAll({ id: res.id }, bootstrap.defaultContext, function (err2, res2) {
                    if (err2) {
                        done(err2);
                    } else {
                        expect(res2.count).to.be.equal(1);
                        models[modelName].findById(res.id, bootstrap.defaultContext, function (err3, res3) {
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
        models[modelName2].create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.undefined;
                models[modelName2].destroyAll({ id: res.id }, bootstrap.defaultContext, function (err2, res2) {
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
        models[modelName3].create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.false;
                models[modelName3].destroyAll({ id: res.id }, bootstrap.defaultContext, function (err2, res2) {
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
        models[modelName4].create(postData, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                expect(res.name).to.be.equal(postData.name);
                expect(res['_isDeleted']).to.be.undefined;
                models[modelName4].destroyAll({ id: res.id }, bootstrap.defaultContext, function (err2, res2) {
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
