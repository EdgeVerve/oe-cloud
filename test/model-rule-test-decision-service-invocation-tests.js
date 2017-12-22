/*
©2015-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries. 
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/

// This test case will execute a decision service
// and perform model record validation.

// Here the validation is done for loan amount, type of loan, and,
// number of years of employment experience. The rule goes something
// like if loan amount <=1000 and experience > 6 the record is valid;
// else invalid

// Author: deostroll

var fs = require('fs');
var path = require('path');

var async = require('async');
var chai = require('chai');
var chaiThings = require('chai-things');
var chalk = require('chalk');
var logger = require('oe-logger');
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var loopback = require('loopback');
var bootstrap = require('./bootstrap');

var app = bootstrap.app;
var expect = bootstrap.chai.expect;
var log = logger('model-rule-test');
var models = bootstrap.models;

// var decisionTableRules = ['PropertyPopulator', 'PropertyPopulatorOne', 'validation'] // Files in mode-rule-data folder should be of same name.
var testModelName = 'ServiceModelRuleTest';
var testModelPlural = 'ServiceModelRuleTests';
// Model with base as PersistedModel
var testModelAsBasePM = 'ModelWithBasePM';

var testModel;
var testModelWithBase;

// Model id and _version required for doing upsert
var modelRuleId, modelRuleVersion;
chai.use(chaiThings);

describe(chalk.blue('model validations using decision service'), function () {
    before('create the temporary model.', function (done) {
        // Forming model metadata
        var data = [{
            name: testModelName,
            base: 'BaseEntity',
            plural: testModelPlural,
            properties: {
                amount: 'number',
                type:'string',
                experience: 'number'
            }
        }];
        // Creating Model in Loopback.
        models.ModelDefinition.create(data, bootstrap.defaultContext, function (err, models) {
            testModel = loopback.getModel(testModelName, bootstrap.defaultContext);
            // testModelWithBase = loopback.getModel(testModelAsBasePM, bootstrap.defaultContext);
            done(err);
        });
    });

    before('creating the decision graph & service', function(done){
        var graphData = JSON.parse(fs.readFileSync('test/model-rule-data/approve-graph.json', { encoding: 'utf8' }));
        var feelData = JSON.parse(fs.readFileSync('test/model-rule-data/approve-feel.json', { encoding: 'utf8'}));

        var decisionGraphData = {
            name: 'ApproveDecision',
            decisions: [],
            data: feelData,
            payload: null,
            graph: graphData
        };

        models.DecisionGraph.create(decisionGraphData, bootstrap.defaultContext, function(err, data){
            if (err) {
                done(err)
            }
            else {
                expect(data.name).to.equal(decisionGraphData.name);
                var decisionServiceData = {
                    name: 'ApproveValidation',
                    decisions: ['Approve'],
                    graphId: decisionGraphData.name
                };

                models.DecisionService.create(decisionServiceData, bootstrap.defaultContext, function(err, data) {
                    expect(data.name).to.equal(decisionServiceData.name);
                    done(err);
                });
            }
        });

    });

    it('should insert into model into model rules table to register for validation without errors', function(done){
        var modelRuleData = {
            modelName: testModelName,
            validationRules: ['ApproveValidation'], //this is a decision service
            isService: true
        };

        models.ModelRule.create(modelRuleData, bootstrap.defaultContext, done);

    });

    it('should deny insertion of record to target model if record  data is incorrect', function(done){
        var incorrectRecordData = {
            amount: 1000,
            type: 'PERSONAL_LOAN',
            experience: 5
        };
        debugger;
        testModel.create(incorrectRecordData, bootstrap.defaultContext, function(err) {
            if (err !== null) {
                done(new Error('test model should not have inserted the record'));
            }
            else {
                done();
            }
        });
    });

    it('should allow insertion of record to target model if record  data is valid', function(done){
        var data = {
            amount: 1000,
            type: 'PERSONAL_LOAD',
            experience: 5
        };

        testModel.create(data, bootstrap.defaultContext, function(err, result) {
            if (err) {
                done(err)
            }
            else {
                expect(result).to.be.object;
                expect(result.amount).to.equal(data.amount);
                done();
            }
        });
    });

    after('resetting model', function(done) {
        testModelName = 'ServiceModelPropertyPopulationTest';
        testModelPlural = 'ServiceModelPropertyPopulationTests';
        console.log("After of first Describe block");
        done();
    });
});

describe(chalk.blue('model data populators with decision services'), function(){
    before('create the temporary model.', function (done) {
        // Forming model metadata
        var data = [{
            name: testModelName,
            base: 'BaseEntity',
            plural: testModelPlural,
            properties: {
                name: 'string',
                age:'number',
                gender: 'string',
                category: 'string'
            }
        }];
        // Creating Model in Loopback.
        models.ModelDefinition.create(data, bootstrap.defaultContext, function (err, models) {
            testModel = loopback.getModel(testModelName, bootstrap.defaultContext);
            // testModelWithBase = loopback.getModel(testModelAsBasePM, bootstrap.defaultContext);
            done(err);
        });
    });

    before('creating the decision graph & service', function(done){
        var graphData = JSON.parse(fs.readFileSync('test/model-rule-data/category-graph.json', { encoding: 'utf8' }));
        var feelData = JSON.parse(fs.readFileSync('test/model-rule-data/category-feel.json', { encoding: 'utf8'}));

        var decisionGraphData = {
            name: 'CategoryDecision',
            decisions: [],
            data: feelData,
            payload: null,
            graph: graphData
        };

        models.DecisionGraph.create(decisionGraphData, bootstrap.defaultContext, function(err, data){
            if (err) {
                done(err)
            }
            else {
                expect(data.name).to.equal(decisionGraphData.name);
                var decisionServiceData = {
                    name: 'AssignCategory',
                    decisions: ['Category'],
                    graphId: decisionGraphData.name
                };

                models.DecisionService.create(decisionServiceData, bootstrap.defaultContext, function(err, data) {
                    expect(data.name).to.equal(decisionServiceData.name);
                    done(err);
                });
            }
        });

    });


    after('second after block', function(done) {
        console.log("After of second Describe block");
        done();
    });


    it('should insert into model into model rules table to register for property population without errors', function(done){
        var modelRuleData = {
            modelName: testModelName,
            defaultRules: ['AssignCategory'],            
            isService: true
        };

        models.ModelRule.create(modelRuleData, bootstrap.defaultContext, (err, res) =>{
            done();
        });

    });

    it('should assign category to the appropriate model instance', function(done){
        var instanceData = {
            name: 'Amit',
            age: 32,
            gender: 'M'
        };

        testModel.create(instanceData, bootstrap.defaultContext, function(err, result) {
            if (err) {
                done(err)
            }
            else {
                expect('category' in result).to.be.true;
                expect(result.category).to.equal('adult');
                done();
            }
        });
    });

});