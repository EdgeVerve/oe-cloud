/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;

var models = bootstrap.models;
//var app = bootstrap.app;
//var metadataUrl = bootstrap.basePath + '/ModelDefinitions';

var chai = require('chai');
chai.use(require('chai-things'));

var api = bootstrap.api;
//var uuid = require('node-uuid');

//var debug = require('debug')('model-definition-test');
var async = require('async');

//var loopback = require('loopback');

function create(model, items, callback) {
    async.forEachOf(items,
        function (item, m, callback2) {
            model.create(item, bootstrap.defaultContext, function (a, b) {
                callback2();
            });
        },
        function (err) {
            if (err) {
                throw err;
            }
            callback();
        });
}

function deleteAndCreate(model, items, callback) {
    model.destroyAll({}, bootstrap.defaultContext, function () {
        async.forEachOf(items,
            function (item, m, callback2) {
                model.create(item, bootstrap.defaultContext, function (e, rec) {
                    if (e) {
                        console.error(e.message);
                    }
                    callback2();
                });
            },
            function (err) {
                if (err) {
                    throw err;
                }
                callback();
            });
    });
}


describe(chalk.blue('grid-meta-data'), function () {

    //var loopbackContext;
    //var tenantId = 'test-tenant';
    //var dsname = 'test_ds';
    //var dataSource;
    //var tenantId_id;
    //var requestId;
    this.timeout(10000);

    //fields to populate in fields
    var fields = [
        {
            key: 'category',
            uitype: 'text',
            label: 'Category'
        },
        {
            key: 'price',
            uitype: 'number',
            label: 'Price'
        },
        {
            key: 'description',
            uitype: 'text',
            label: 'Description'
        },
        {
            key: 'date',
            uitype: 'date',
            label: 'Date'
        }
  ];

    //definition of a model : Orer
    var order = {
        "name": "Order",
        "plural": "Orders",
        "base": "BaseEntity",
        "idInjection": false,
        "properties": {
            "category": {
                "type": "string",
                "required": true
            },
            "price": {
                "type": "number",
                "required": true
            },
            "description": {
                "type": "string"
            },
            "date": {
                "type": "date"
            }
        }
    };

    var modelName = "Order";

    var testMetaData = {
        "gridIdentifier": "Order",
        "columnFields": [
            {
                "key": "description",
                "visible": false
      },
            {
                "key": "category",
                "visible": true
      },
            {
                "key": "price"
      }
    ],
        "dialogMetaData": "Order",
        "dialogTemplateUrl": "/bower_components/evf-ui/demo/templates/dialog.html"
    };

    before('Define model and load data', function (done) {
        create(models.ModelDefinition, [order], function (err) {
            if (err) {
                done(err);
            } else {
                deleteAndCreate(models.GridMetaData, [testMetaData], function (err1) {
                    if (err1) {
                        done(err1);
                    } else {
                        deleteAndCreate(models.Field, fields, function (err2) {
                            done(err2);
                        });
                    }
                });
            }

        });
    });


    after('destroy model2', function (done) {
        models['Order'].destroyAll({}, bootstrap.defaultContext, function (err) {
            if (err) {
                console.error(err);
            }

            models['Field'].destroyAll({}, bootstrap.defaultContext, function (err) {
                done(err);
            });
        });
    });


    it('should return the generated gridmetadata', function (done) {

        api
            .get(bootstrap.basePath + '/GridMetaData/' + modelName + '/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                var response = res.body;
                expect(response).to.exist;
                expect(response.columnData).to.exist;
                expect(response.dialogMetaData).to.exist;
                done();
            });

    });

    it('should return only the fields defined in the gridmetadata', function (done) {

        api
            .get(bootstrap.basePath + '/GridMetaData/' + modelName + '/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                var response = res.body;
                expect(response).to.exist;
                expect(response.columnData.length).to.be.equal(3);
                done();
            });

    });

    it('should return the columnData fields with key, uitype, label and visible properties', function (done) {

        api
            .get(bootstrap.basePath + '/GridMetaData/' + modelName + '/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                var response = res.body;
                expect(response).to.exist;
                response.columnData.forEach(function (col) {
                    expect(col.key).to.exist;
                    expect(col.uitype).to.exist;
                    expect(col.label).to.exist;
                    expect(col.visible).to.exist;
                });
                done();
            });

    });

    it('should return columnData field, with visible property set to "true", if it is not provided', function (done) {

        api
            .get(bootstrap.basePath + '/GridMetaData/' + modelName + '/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                var response = res.body;
                expect(response).to.exist;
                expect(response.columnData[2].visible).to.be.true;
                done();
            });

    });

    it('should return error message if there is no entry for the requested grid identifier', function (done) {

        api
            .get(bootstrap.basePath + '/GridMetaData/' + 'unknownGrid' + '/render')
            .set('tenant_id', 'test-tenant')
            .expect(200).end(function (err, res) {
                var error = res.error;
                expect(error).to.exist;
                expect(error.message).to.exist;
                done();
            });

    });

});