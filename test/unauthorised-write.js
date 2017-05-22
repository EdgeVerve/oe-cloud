/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * UnitTest Case
 * Unathorised Update should not be allowed
 *
 * @author Praveen Kumar Gulati
 */
var bootstrap = require('./bootstrap');
var chalk = require('chalk');
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var baseUrl = bootstrap.basePath;

describe(chalk.blue('unauthorised-post'), function() {

    it('unauthorised-post', function(done) {
        var data =  {
            'key': 'BASE_ENTITY1',
            'value': 'Base Entity'
        };

        var api = defaults(supertest(bootstrap.app));

        var postUrl = baseUrl + '/Literals';

        api.set('Accept', 'application/json')
        .post(postUrl)
        .send(data)
        .expect(401)
        .end(function(err, resp) {
            if (err) {
                done(err);
            } else {
                done();
            }
        });
    });

});
