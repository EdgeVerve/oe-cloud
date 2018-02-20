/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/* jshint -W024 */
/* jshint expr:true */
//to avoid jshint errors for expect

var bootstrap = require('./bootstrap');
var chalk = require('chalk');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var util = require('../lib/common/util.js');

describe(chalk.blue('client-sdk-test'), function (done) {

    it('get routes for client sdk', function (done) {
        var routes = util.getRoutes(bootstrap.app);

        // checking for some random models that should be present in routes
        expect(routes).to.include.keys('NavigationLink','BaseUser');

        // checking some random api's of model. (checking for random model NavigationLink)
        expect(routes.NavigationLink).to.include.keys('count','countChildren','create','createChildren','findById','findChildrenById');

        // checking accepts property of model api's
        expect(routes.NavigationLink.findChildrenById.accepts.length).to.be.equal(2);
        expect(routes.NavigationLink.findChildrenById.accepts[0].arg).to.be.equal('fk');
        expect(routes.NavigationLink.findChildrenById.accepts[1].arg).to.be.equal('id');

        done();
    });

});
