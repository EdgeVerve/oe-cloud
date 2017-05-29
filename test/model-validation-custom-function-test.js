/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries. 
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;
var loopback = require('loopback');
var models = bootstrap.models;
var chai = require('chai');
chai.use(require('chai-things'));

var modelName = 'OrganisationModel';
describe(chalk.blue('Validation custom function test'), function() {

    this.timeout(50000);

    before('setup test data', function(done) {
        models.ModelDefinition.events.once('model-' + modelName + '-available', function() {
            done();
        });

        models.ModelDefinition.create({
            'name': modelName,
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
                    'required': true
                },
                'location': {
                    'type': 'string'
                }
            },
            'validations': [],
            'relations': {},
            'acls': [],
            'methods': {}
        }, bootstrap.defaultContext, function(err, modelDefinitionData) {
            if (err) {
                console.log(err);
            }
            expect(err).to.be.not.ok;
            var model = loopback.getModel(modelName);
            model.customValidations = [];
            var customArr = [];

            function locationLengthCheck(data, options, cb) {
                if (data.location.length < 4) {
                    cb(null, {
                        'fieldName': 'location',
                        'errMessage': 'minimum length violated for location',
                        'errCode': 'custom-err'
                    });
                } else {
                    cb(null, null);
                }
            }

            function locationValueCheck(data, options, cb) {
                if (['INDIA', 'AUSTRALIA', 'CANADA'].indexOf(data.location) < 0) {
                    cb(null, {
                        'fieldName': 'location',
                        'errMessage': 'location is out of the allowed list',
                        'errCode': 'custom-err'
                    });
                } else {
                    cb(null, null);
                }
            }

            customArr.push(locationLengthCheck);
            customArr.push(locationValueCheck);

            model.customValidations = customArr;
        });
    });

    after('destroy test models', function(done) {
        models.ModelDefinition.destroyAll({
            name: modelName
        }, bootstrap.defaultContext, function(err, d) {
            if (err) {
                console.log('Error - not able to delete modelDefinition entry for mysettings');
                return done();
            }
            var model = loopback.getModel(modelName);
            model.destroyAll({}, bootstrap.defaultContext, function() {
                done();
            });
        });
    });

    it('Validation Test - Should fail to insert data', function(done) {
        var model = loopback.getModel(modelName);
        var data = {
            'location': "USA"
        };
        model.create(data, bootstrap.defaultContext, function(err, results) {
            expect(err).to.be.not.null;
            done();
        });
    });
    it('Validation Test - Should successfully insert data', function(done) {
        var model = loopback.getModel(modelName);
        var data = {
            'name': "OrganisationOne",
            'location': "INDIA"
        };
        model.create(data, bootstrap.defaultContext, function(err, results) {
            expect(err).to.be.null;
            done();
        });
    });

});