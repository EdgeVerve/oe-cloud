/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * Author: Pradeep Kumar Tippa
 */
var bootstrap = require('./bootstrap');
var chalk = require('chalk');
var app = bootstrap.app;
var expect = bootstrap.chai.expect;
var dbm = require('../lib/db-migrate-helper');
describe(chalk.blue('Database Migration'), function() {
  this.timeout(1000000);
  describe('Migration Switch', function(){

    before('Add -m switch to command args', function(done) {
      process.argv.push('-m');
      done();
    });

    after('Remove -m switch to command args', function(done) {
      process.argv.pop();
      done();
    });

    describe('Autoupdate', function() {

      it('Run only Autoupdate', function() {
        dbm(app, bootstrap.options, true, function(err, data){
          done();
        });
      });
      
    });

    describe('With enableMigration', function() {

      var enableMigrationSetting;
      before('Set enableMigration', function(done) {
        enableMigrationSetting = app.get('enableMigration');
        app.set('enableMigration', true);
        done();
      });

      after('Reset enableMigration', function(done) {
        app.set('enableMigration', enableMigrationSetting || false);
        done();
      });

      it('Run Migration', function(done){
        // This will run autoupdate also again
        dbm(app, bootstrap.options, true, function(err, data){
          done();
        });
      });

    });

  });
    
});