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
var api = bootstrap.api;
var app = bootstrap.app;

describe(chalk.blue('Embed many test'), function () {

    this.timeout(200000);
    var model1schema = {
        'name': {
            'type': 'string'
        },
        balance: {
            type: 'number',
            min: 1000,
            max: 50000
        }
    };
    var opts = {
        'name': 'Account',
        'idInjection': false,
        'base': 'BaseType'
    };

    var model2 = {
        'name': 'CustomerEmbed',
        'idInjection': false,
        'base': 'BaseEntity',
        'properties': {
            'name': {
                'type': 'string'
            }
        }, options: { validateUpsert: true },
        'relations': {
            'accounts': {
                'type': 'embedsMany',
                'model': 'Account',
                'property': 'AccountList',
                'options': {
                    'validate': false,
                    'forceId': false,
                    'persistent': true
                }
            }
        },
        'mixins': {
            ModelValidations: true
        }

    };

    var model3 = {
        name: 'EVFUser',
        properties: {
            name: {
                type: 'string',
                require: true
            },
            accountList: ['Account']
        }
    };

    before('create models  with embed many relations', function (done) {
        var dataSource = app.dataSources['db'];
        var myModel = dataSource.createModel('Account', model1schema, opts);
        myModel.attachTo(dataSource);
        app.model(myModel);

        models.ModelDefinition.create([model2, model3], bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                done();
            }
        });
    });

    after('clean up-', function (done) {
        models.CustomerEmbed.destroyAll({}, bootstrap.defaultContext, function (err, res) {
            console.log(err, '\n', res);
            models.ModelDefinition.destroyAll({ name: 'CustomerEmbed' }, bootstrap.defaultContext, function (err, res) {
                done(err);
            });
        });
    });

    it('should create customer record and account --- rest', function (done) {
        var data = { 'name': 'Shreyas' };
        var accData = { 'name': 'saving', 'id': '1231234123', 'balance': 1500 };
        models.CustomerEmbed.create(data, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                var id = res.id;
                var version = res._version;
                var login = { 'username': 'admin', 'password': 'admin' };
                api
                    .post(bootstrap.basePath + '/BaseUsers/login')
                    .send(login)
                    .expect(200).end(function (err, res) {
                        if (err) {
                            done(err);
                        } else {
                            accData._parentVersion = version;
                            api
                                .post(bootstrap.basePath + '/CustomerEmbeds/' + id + '/accounts?access_token=' + res.body.id)
                                .send(accData)
                                .expect(200).end(function (err, res) {
                                    if (err) {
                                        done(err);
                                    } else {
                                        expect(res.body).not.to.be.undefined;
                                        done();
                                    }
                                });
                        }
                    });
            }
        });
    });

    it('should create a customer and account (with parent version in child data) -- programmatically', function (done) {
        var data = { 'name': 'helloThere' };
        models.CustomerEmbed.create(data, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                var accData = { 'name': 'adas', 'id': '21', '_parentVersion': res._version, 'balance': 1500 };
                res.accounts.create(accData, bootstrap.defaultContext, function (err, res) {
                    if (err) {
                        done(err);
                    } else {
                        expect(res).not.to.be.null;
                        done();
                    }
                });
            }
        });
    });

    it('should create a evfUser with account details -- programmatically', function (done) {
        var data = { 'name': 'helloThere', accountList: [{ name: 'saving', 'balance': 1500 }] };
        models.CustomerEmbed.create(data, bootstrap.defaultContext, function (err, res) {
            if (err) {
                done(err);
            } else {
                models.CustomerEmbed.findById(res.id, bootstrap.defaultContext, function (err, res) {
                    if (err) {
                        done(err);
                    } else {
                        expect(res).not.to.be.null;
                        done();
                    }
                });
            }
        });
    });

    xit('should not allow create a evfUser with account balance less then min -- programmatically', function (done) {
        var data = { 'name': 'helloThere', accountList: [{ name: 'saving', 'balance': 500 }] };
        models.CustomerEmbed.create(data, bootstrap.defaultContext, function (err, res) {
            if (err) {
                expect(err.message).not.to.be.null;
                done();
            } else {
                done(new Error('validation did not work'));
            }
        });
    });
});