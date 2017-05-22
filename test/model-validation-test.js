/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;
var loopback = require('loopback');
var models = bootstrap.models;
var chai = require('chai');
chai.use(require('chai-things'));
var api = bootstrap.api;
var url = bootstrap.basePath;

var modelName = 'StarWars';

describe(chalk.blue('model-validation PropertyLevel Validation test'), function () {
    this.timeout(20000);

    before('setup test data', function (done) {
        models.ModelDefinition.events.once('model-' + modelName + '-available', function () {
            done();
        });

        models.ModelDefinition.create({
            'name': 'StarWars',
            'base': 'BaseEntity',
            'strict': false,
            'idInjection': true,
            'options': {
                'validateUpsert': true
            },
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
                'numericField3': {
                    'type': 'number',
                    'numericality': 'number',
                    'pattern': '^\\d+(\\.\\d{1,2})?$'
                },
                'clan': {
                    'type': 'string',
                    'required': true,
                    'unique': false,
                    'absencechar': true
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
            'validations': [],
            'relations': {},
            'acls': [],
            'methods': {}
        }, bootstrap.defaultContext, function (err, model) {
            if (err) {
                console.log(err);
            }
            expect(err).to.be.not.ok;
        });
    });


    after('destroy test models', function (done) {
        models.ModelDefinition.destroyAll({
            name: modelName
        }, bootstrap.defaultContext, function (err, d) {
            if (err) {
                console.log('Error - not able to delete modelDefinition entry for mysettings');
                return done();
            }
            var model = loopback.getModel(modelName);
            model.destroyAll({}, bootstrap.defaultContext, function () {
                done();
            });
        });
    });

    afterEach('destroy execution context', function (done) {
        done();
    });

    it('Validation Test - Should insert data successfully', function (done) {

        var myModel = loopback.getModel(modelName);

        var data = {
            'name': 'Anakin',
            'numericField1': 10,
            'gender': 'Male',
            'country': 'Tatooine',
            'clan': 'Jedi',
            'shipName': 'Delta-7B'
        };
        myModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail because name is not unique', function (done) {

        var myModel = loopback.getModel(modelName);

        var data = {
            'name': 'Vader',
            'clan': 'Sith'
        };
        myModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.null;
            myModel.create(data, bootstrap.defaultContext, function (err, results) {
                expect(err).not.to.be.null;
                done();
            });
        });
    });

    it('Validation Test - Should insert  data sucessfully as name is unique w.r.t scope', function (done) {

        var myModel = loopback.getModel(modelName);

        var data1 = {
            'name': 'Snoke',
            'clan': 'Sith',
            'scope': {
                'ship': 'Nebulon Ranger'
            }
        };
        var data2 = {
            'name': 'Snoke',
            'clan': 'Sith',
            'scope': {
                'ship': 'Shieldship'
            }
        };
        myModel.create(data1, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.null;
            myModel.create(data2, bootstrap.defaultContext, function (err, results) {
                expect(err).to.be.null;
                done();
            });
        });
    });

    it('Validation Test - Should fail because pattern for shipName is not proper', function (done) {

        var myModel = loopback.getModel(modelName);

        var data = {
            'name': 'Anakin',
            'numericField1': 12,
            'gender': 'Male',
            'country': 'Tatooine',
            'clan': 'Jedi',
            'shipName': 'Delta-7B#'
        };
        myModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.undefined;
            done();
        });
    });

    it('Validation Test - Should fail because min length of name is 4', function (done) {

        var myModel = loopback.getModel(modelName);

        var data = {
            'name': '3PO',
            'numericField1': 12,
            'gender': 'Male',
            'country': 'Tatooine',
            'clan': 'Jedi'
        };
        myModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.undefined;
            done();
        });
    });

    it('Validation Test - Should fail because max length of name is 7', function (done) {

        var myModel = loopback.getModel(modelName);

        var data = {
            'name': 'ObiWanKenobi',
            'numericField1': 12,
            'gender': 'Male',
            'country': 'Tatooine',
            'clan': 'Jedi'
        };
        myModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail because presence of clan is mandatory', function (done) {

        var myModel = loopback.getModel(modelName);

        var data = {
            'name': 'HanSolo',
            'numericField1': 12,
            'country': 'Tatooine',
            'gender': 'Male'
        };
        myModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail because clan can have only alphabets as absencechar validation is applicable for it', function (done) {

        var myModel = loopback.getModel(modelName);

        var data = {
            'name': 'HanSolo',
            'numericField1': 12,
            'country': 'Tatooine',
            'gender': 'Male',
            'clan': 'Jedi1'
        };
        myModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail because gender value is out of list', function (done) {

        var myModel = loopback.getModel(modelName);

        var data = {
            'name': 'Doku',
            'numericField1': 10,
            'gender': 'Man',
            'country': 'Tatooine',
            'clan': 'Sith'
        };
        myModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.undefined;
            done();
        });
    });

    it('Validation Test - Should fail because country value is from the exclusion list', function (done) {

        var myModel = loopback.getModel(modelName);

        var data = {
            'name': 'Leia',
            'numericField1': 10,
            'gender': 'Female',
            'country': 'England',
            'clan': 'Jedi'
        };
        myModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.undefined;
            done();
        });
    });

    it('Validation Test - Should fail because length of country is not 8', function (done) {

        var myModel = loopback.getModel(modelName);

        var data = {
            'name': 'Luke',
            'numericField1': 10,
            'gender': 'Male',
            'country': 'Australia',
            'clan': 'Jedi'
        };
        myModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.undefined;
            done();
        });
    });

    it('Validation Test - Should fail because numericField2 should be absent', function (done) {

        var myModel = loopback.getModel(modelName);

        var data = {
            'name': 'Amidala',
            'numericField1': 10,
            'numericField2': 12,
            'gender': 'Female',
            'country': 'Tatooine',
            'clan': 'Jedi'
        };
        myModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.undefined;
            done();
        });
    });

    it('Validation Test - Should fail because numericField1 should be integer and input data is decimal number', function (done) {

        var myModel = loopback.getModel(modelName);

        var data = {
            'name': 'YODA',
            'numericField1': 10.5,
            'gender': 'Male',
            'country': 'Tatooine',
            'clan': 'Jedi'
        };
        myModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.undefined;
            done();
        });
    });

    it('Validation Test - Should fail because numericField1 should be integer and input data is NaN', function (done) {

        var myModel = loopback.getModel(modelName);

        var data = {
            'name': 'YODA',
            'numericField1': "10a",
            'gender': 'Male',
            'country': 'Tatooine',
            'clan': 'Jedi'
        };
        myModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail because numericField3 pattern rule is violated', function (done) {

        var myModel = loopback.getModel(modelName);

        var data = {
            'numericField3': 12.345,
            'clan': 'Jedi'
        };
        myModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail because numericField3 should be number', function (done) {

        var myModel = loopback.getModel(modelName);

        var data = {
            'numericField3': '12a',
            'clan': 'Jedi'
        };
        myModel.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).not.to.be.null;
            done();
        });
    });

    it('Validation Test - Should sucessfully insert data', function (done) {
        var URL = url + "/StarWars";

        var postData = {
            'clan': 'Jedi123'
        };

        api.post(URL)
            .set('Accept', 'application/json')
            .send(postData)
            .expect(422).end(function (err, resp) {
                if (err) {
                    throw new Error(err);
                } else {
                    var error = JSON.parse(resp.text).error;
                    expect(error).not.to.be.null;
                    done();
                }
            });

    });

});
