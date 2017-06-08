/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chalk = require('chalk');
var bootstrap = require('../bootstrap');
var app = bootstrap.app;
var expect = bootstrap.chai.expect;
var loopback = require('loopback');
var models = bootstrap.models;
var chai = require('chai');
chai.use(require('chai-things'));

var modelName = 'Customer';

describe(chalk.blue('Basic Crud for Postgresql connector'), function () {
    
    before('setup test data', function (done) {
        
        var dataSourceConfig = {
            'connector': require('loopback-connector-evpostgresql'),
            'host': 'localhost',
            'port': 5432,
            'url': 'postgres://postgres:postgres@localhost:5432/db2',
            'database': 'db2',
            'password': 'postgres',
            'name': 'db2',
            'user': 'postgres',
            'connectionTimeout': 50000
        };
        
        loopback.createModel({
            'name': modelName,
            'base': 'PersistedModel',
            'strict': false,
            'idInjection': true,
            'options': {
                'validateUpsert': true
            },
            'properties': {
                'name': {
                    'type': 'string'
                },
                'age': {
                    'type': 'number'
                },
                'phone': {
                    'type': 'string'
                }
            }
        });
        var model = loopback.findModel(modelName);
        app.dataSource('db2', dataSourceConfig);
        model.attachTo(app.dataSources['db2']);
        model.app = app;
        done();
    });
    
    after('destroy test models', function (done) {
        var model = loopback.findModel(modelName);
        model.destroyAll({}, bootstrap.defaultContext, done);
    });
    
    
    it('Creation of data should be successful', function (done) {
        var model = loopback.findModel(modelName);
        var data = {
            'name': 'Mike',
            'age': 40,
            'phone': '12345'
        };
        model.create(data, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });
    
    it('Read data from postgres table successfully', function (done) {
        var model = loopback.findModel(modelName);
        model.find({}, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.undefined;
            model.findById(results[0].id, bootstrap.defaultContext, function (err, result) {
                expect(err).to.be.undefined;
                done();
            });
        });
    });
    
    it('Update data successfully', function (done) {
        var model = loopback.findModel(modelName);
        model.find({}, bootstrap.defaultContext, function (err, results) {
            expect(err).to.be.undefined;
            var data = results[0];
            data.name = 'Michael';
            model.upsert(data, bootstrap.defaultContext, function (err, results) {
                expect(err).to.be.null;
                done();
            });
        });
    });
    
    it('Delete data successfully', function (done) {
        var model = loopback.findModel(modelName);
        var data = {
            'name': 'George',
            'age': 45,
            'phone': '54321'
        };
        model.create(data, bootstrap.defaultContext, function (err, result) {
            expect(err).to.be.null;
            model.deleteById(result.id, bootstrap.defaultContext, function (err, results) {
                expect(err).to.be.null;
                done();
            });
        });
    });

});