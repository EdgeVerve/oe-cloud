/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This test is for unit-testing the query result caching feature in the framework.
 * The test involves creating a test model, inserting a record into it, fetching the 
 * record (so that it caches), deleting the record from the database by directly accessing
 * the DB (bypassing the framework, so that cache is not ecicted), fetching the 
 * record again to see that the records are still fetched (from cache).
 * 
 *  Author: Karin Angel
 */

var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var expect = chai.expect;
var MarkAsCacheable = require('../server/boot/05_mark-as-cache-able');
var config = require('../server/config');


describe('Mark As Cache Able Test', function () {
    var app1 = {};
    app1.models = {modelToCache: 'mockModelToCache'};

    var app2 = {};
    app2.models = {modelNotToCache: 'mockModelMyModelName'};

    var app3 = {};
    app3.models = {modelToCache: 'mockModelToCache'};

    var disablecachingOld = config.disablecaching;
    config.disablecaching = false;
    var modelstocacheOld = config.modelstocache;
    config.modelstocache = ['modelToCache'];

    it('should add cachable model name to globals', function (done) {
        config.disablecaching = false;
         MarkAsCacheable(app1, function(err) {
             if (err) {
                 return done(err);
             } else {
                expect(global.evcacheables['modelToCache']).to.be.equal(true);
                return done();
             }
         });
    });

    it('should not add non cachable model name to globals', function (done) {
        config.disablecaching = false;
        MarkAsCacheable(app2, function(err) {
            if (err) {
                return done(err);
            } else {
                expect(global.evcacheables['modelNotToCache']).to.be.equal(undefined);
                return done();
            }
        });
    });

    it('should not add cachable model name to globals if disablecaching flag is true', function (done) {
        config.disablecaching = true;
        delete global.evcacheables['modelToCache'];
        MarkAsCacheable(app3, function(err) {
            if (err) {
                return done(err);
            } else {
                expect(global.evcacheables['modelToCache']).to.be.equal(undefined);
                return done();
            }
        });
    });

    after('mark disablecaching flag in config to true and set modelstocache to original', function (done) {
        config.disablecaching = disablecachingOld;
        config.modelstocache = modelstocacheOld;
        delete global.evcacheables['modelToCache'];
        return done();
    });
});