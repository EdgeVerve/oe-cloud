/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * UnitTest Cases for transaction handling in mongodb
 *
 *
 * Steps involved : 1. clear all model data
 * 2. begin transaction
 * 3. create an model
 * 4. create another model
 * ** do set of create and update operations
 * 5. commit and database should have 2 entries
 *
 * *************************************
 * 6. begin another transaction
 * 7. create and entry
 * 8. create same entry (it should through error for unique constraint)
 * 9. if error, rollback
 * 10. database should not have any new entry
 *
 *
 */

//var loopback = require('loopback');
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;
var loopback = require('loopback');
var models = bootstrap.models;
var chai = require('chai');
chai.use(require('chai-things'));
var uTxnId = 1234;
//var uuid = require('node-uuid');
//var debug = require('debug')('model-transaction-test');



describe(chalk.blue('transaction test'), function () {

    this.timeout(12000);

    before('create models', function (done) {
        models.ModelDefinition.create({
            name: 'Shipment',
            base: 'BaseEntity',
            plural: 'Shipment',
            properties: {
                'name': {
                    'type': 'string',
                    'required': true,
                    'unique': true
                },
                'products': {
                    'type': 'string',
                    'required': true
                }
            },
            filebased: false
        }, bootstrap.defaultContext, function (err, shipment) {
            if (err) {
                done(err);
            } else {
                expect(err).to.not.be.ok;
                models.ModelDefinition.create({
                    name: 'OrderTransactionModel',
                    base: 'BaseEntity',
                    plural: 'OrderTransactionModels',
                    properties: {
                        'name': {
                            'type': 'string',
                            'required': true,
                            'unique': true
                        },
                        'shipments': {
                            'type': 'string',
                            'required': true
                        }
                    },
                    filebased: false
                }, bootstrap.defaultContext, function (err, order) {
                    if (err) {
                        return done(err);
                    }
                    expect(err).to.not.be.ok;
                    done();
                });
            }
        });
    });

    after('cleanup', function (done) {
        models.ModelDefinition.destroyAll({
            name: "Shipment"
        }, bootstrap.defaultContext, function a(err) {});
        models.ModelDefinition.destroyAll({
            name: "OrderTransactionModel"
        }, bootstrap.defaultContext, function a(err) {});
        done();
    });

    it('should start a transaction and commit successfully', function (done) {

        var order = loopback.getModel('OrderTransactionModel');
        var shipment = loopback.getModel('Shipment');
        shipment.beginTransaction({
            isolationLevel: shipment.Transaction.READ_COMMITTED
        }, function (err, tx) {
            expect(err).to.not.be.ok;
            var options = JSON.parse(JSON.stringify(bootstrap.defaultContext));
            options.transaction = tx;
            shipment.create({
                'name': 'shipmentOne',
                'products': 'Monitor'
            }, options, function (err, res2) {
                if (err) {
                    done(err);
                } else {
                    order.create({
                        'name': 'orderOne',
                        'shipments': 'shipment one'
                    }, options, function (err, res4) {
                        if (err) {
                            tx.rollback(function (err) {
                                done(err);
                            });
                        } else {
                            tx.commit(function (err) {
                                if (err) {
                                    done(err);
                                } else {
                                    done();
                                }
                            });
                        }
                    });
                }
            });
        });

    });

    it('should start a transaction and rollback for error, rollback successfully', function (done) {

        var order = models['OrderTransactionModel'];
        var shipment = models['Shipment'];
        shipment.beginTransaction({
            isolationLevel: shipment.Transaction.READ_COMMITTED
        }, function (err, tx) {
            expect(err).to.not.be.ok;
            var options = JSON.parse(JSON.stringify(bootstrap.defaultContext));
            options.transaction = tx;
            shipment.create({
                'name': 'shipmentThree',
                'products': 'Monitor'
            }, options, function (err, res2) {
                expect(err).to.be.null;
                shipment.create({
                    'name': 'shipmentFour',
                    'products': 'Monitor'
                }, options, function (err, res3) {
                    expect(err).to.be.null;
                    order.create({
                        'name': 'orderThree',
                        'shipments': 'shipment one and two'
                    }, options, function (err, res4) {
                        expect(err).to.be.null;
                        order.create({
                            'name': 'orderOne',
                            'shipments': 'shipment one and two'
                        }, options, function (err, res4) {
                            expect(err).not.to.be.null; // unique constraint
                            if (err) {
                                tx.rollback(function (err) {
                                    expect(err).to.be.null;
                                    done(err);
                                });
                            } else {
                                tx.commit(function (err) {
                                    done(err);
                                });
                            }
                        });
                    });
                });
            });
        });
    });

    it('should start a transaction, do update, and then commit', function (done) {
        var order = models['OrderTransactionModel'];
        var shipment = models['Shipment'];
        shipment.beginTransaction({
            isolationLevel: shipment.Transaction.READ_COMMITTED
        }, function (err, tx) {
            expect(err).to.not.be.ok;
            var options = JSON.parse(JSON.stringify(bootstrap.defaultContext));
            options.transaction = tx;
            uTxnId = tx.connection.transactionId;
            shipment.create({
                'name': 'shipment100',
                'products': 'mouse'
            }, options, function (err, res2) {
                expect(err).to.be.null;
                shipment.create({
                    'name': 'shipment101',
                    'products': 'keyboard'
                }, options, function (err, res3) {
                    expect(err).to.be.null;
                    order.find({}, options, function (err, res) {
                        order.upsert({
                            'name': res[0].name,
                            'shipments': 'shipment updated 100 and 101',
                            'id': res[0].id,
                            '_version': res[0]._version
                        }, options, function (err, res4) {
                            expect(err).to.be.null;
                            if (err) {
                                tx.rollback(function (err) {
                                    done(err);
                                });
                            } else {
                                tx.commit(function (err) {
                                    expect(err).to.be.null;
                                    done(err);
                                });
                            }
                        });
                    });

                });
            });
        });

    });

    it('should start a transaction, do update, and then rollback for error', function (done) {
        var order = models['OrderTransactionModel'];
        var shipment = models['Shipment'];
        shipment.beginTransaction({
            isolationLevel: shipment.Transaction.READ_COMMITTED
        }, function (err, tx) {
            expect(err).to.not.be.ok;
            var options = JSON.parse(JSON.stringify(bootstrap.defaultContext));
            options.transaction = tx;
            shipment.create({
                'name': 'shipment1000',
                'products': 'Monitor'
            }, options, function (err, res2) {
                expect(err).to.be.null;
                shipment.create({
                    'name': 'shipment1001',
                    'products': 'Monitor'
                }, options, function (err, res3) {
                    expect(err).to.be.null;
                    order.find({}, options, function (err, res) {
                        order.upsert({
                            'name': res[0].name,
                            'shipments': 'shipment updated 1000 and 1001',
                            'id': res[0].id,
                            '_version': res[0]._version
                        }, options, function (err, res4) {
                            expect(err).to.be.null;
                            order.create({
                                'name': 'orderOne',
                                'shipments': 'shipment one and two again'
                            }, options, function (err, res4) {
                                expect(err).not.to.be.null; // unique constraint
                                if (err) {
                                    tx.rollback(function (err) {
                                        expect(err).to.be.null;
                                        done(err);
                                    });
                                } else {
                                    tx.commit(function (err) {
                                        done(err);
                                    });
                                }
                            });
                        });
                    });

                });
            });
        });

    });

    it('should emit reconcile job with valid data', function (done) {
        var dbT = models['DbTransaction'];
        if (!dbT.dataSource.isRelational()) {
            dbT.update({ "transactionId": uTxnId }, { "status": "changing" }, function (err, res) {
                if (!err) {
                    dbT.emit('reconcile', {
                        'transactionId': uTxnId,
                        'options': bootstrap.defaultContext
                    }); //at this moment no callback
                    done();
                } else {
                    done(err);
                }
            });
        } else {
            console.log('***Below testcases are bypassed as they are running on relational database***');
            done();
        }
    });

    it('should emit reconcile job with no data', function (done) {
        var dbtx = models['DbTransaction'];
        dbtx.emit('reconcile', {
            'transaction': '345',
            'options' : bootstrap.defaultContext
        });
        done();
    });
});
