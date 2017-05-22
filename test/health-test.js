/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This is a collection of tests that make sure that the health url (/health) works.
 *
 * @author Ori Press
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var url = '/health';

var chai = require('chai');
chai.use(require('chai-things'));
var api = bootstrap.api;

var debug = require('debug')('logger-config-test');

describe(chalk.blue('health-url-test'), function () {
    it('get a response from the server', function (done) {
        api
            .set('Accept', 'application/json')
            .get(url)
            .end(function (err, res) {
                debug('response body : ' + JSON.stringify(res.body, null, 4));
                if (err || res.body.error) {
                    done(err || (new Error(res.body.error)));
                } else {
                    if (res.status === 500) {
                        console.log("Checked health an got a 500 error code.");
                    }
                    done();
                }
            });
    });
});
