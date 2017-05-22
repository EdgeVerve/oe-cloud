/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
// var app = bootstrap.app;
var chai = require('chai');
chai.use(require('chai-things'));
// var loopback = require('loopback');
var models = bootstrap.models;

// Test case to remove demo user which was used for testing and logging in using JWT.
describe(chalk.blue('Remove Demo User'), function () {
  after('Remove Demo user', function (done) {
    models.BaseUser.destroyById('30', bootstrap.defaultContext, function (err, res) {
      if (err) {
        done(err);
      }
      done();
    });
  });
});
