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
var async = require('async');

var chai = require('chai');
chai.use(require('chai-things'));

var api = bootstrap.api;

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

describe(chalk.blue('literal test'), function () {
    this.timeout(20000);

    var data = [
        {
            "key": "Auth Scheme",
            "value": "Auth Scheme",
            "scope": {
                "lang": "en-US"
            }
        },
        {
            "key": "External Id",
            "value": "External Id",
            "scope": {
                "lang": "en-US"
            }
        },
        {
            "key": "Profile",
            "value": "Profile",
            "scope": {
                "lang": "en-US"
            }
        },
        {
            "key": "rangeOverflow",
            "value": "Must be max $max$ characters",
            "scope": {
                "lang": "en-US"
            }
        },
        {
            "key": "rangeUnderflow",
            "value": "Min $min$ allowed for $field$",
            "placeholders":["field","min"],
            "scope": {
                "lang": "en-US"
            }
        }
    ];

    before('setup test data', function (done) {
                deleteAndCreate(models.Literal, data, function (err1) {
                    done(err1);
                });
    });

    it('get locale data', function (done) {

        api.get('/api/Literals/render/en-US')
            .set('Accept', 'application/json')
//            .set('TENANT_ID', tenantId)
//            .set('REMOTE_USER', 'testUser')
//            .set('DEVICE_TYPE', 'android')
            .expect(200).end(function (err, resp) {
                if (err) {
                    return done(err);
                }
                var result = resp.body;
                expect(result['Auth Scheme']).not.to.be.null;
                done();
            });
    });

    it('translates $xxx$ into placeholders', function (done) {

        api.get(bootstrap.basePath+'/Literals/render/en-US')
            .set('Accept', 'application/json')
            .set('tenant_id', 'test-tenant')
            .set('lang', 'en-US')
            .expect(200).end(function (err, resp) {
                if (err) {
                    return done(err);
                }            
                var result = resp.body;
            
                var record = result['rangeOverflow'];
                expect(record).to.exist;
                expect(record.placeholders).to.exist;
                expect(record.placeholders.max).to.exist;
                expect(record.placeholders.max.content).to.equal("$1");
                done();
            });
    });
    
    it('If placeholders ordering is defined they are honoured', function (done) {

        api.get(bootstrap.basePath+'/Literals/render/en-US')
            .set('Accept', 'application/json')
            .set('tenant_id', 'test-tenant')
            .set('lang', 'en-US')
            .expect(200).end(function (err, resp) {
                if (err) {
                    return done(err);
                }            
                var result = resp.body;

                var record = result['rangeUnderflow'];
                expect(record).to.exist;
                expect(record.placeholders).to.exist;
                expect(record.placeholders.min).to.exist;
                expect(record.placeholders.min.content).to.equal("$2");
                expect(record.placeholders.field).to.exist;
                expect(record.placeholders.field.content).to.equal("$1");
                done();
            });
    });    
    after('clean up', function (done) {
        models.Literal.destroyAll({}, bootstrap.defaultContext, function (err, d) {
            if (err) {
                console.log('Error - not able to delete literals ', err, d);
                return done();
            }
            done();
        });
    });



});