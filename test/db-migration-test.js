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
var path = require('path');
var app = bootstrap.app;
var expect = bootstrap.chai.expect;
var dbm = require('../lib/db-migrate-helper');
describe(chalk.blue('Database Migration'), function() {
  // To test this test case individually from mocha enable the below timeout
  //this.timeout(1000000);
  describe(chalk.green('Migration Switch'), function(){

    before('Add -m switch to command args', function(done) {
      process.argv.push('-m');
      done();
    });

    after('Remove -m switch to command args', function(done) {
      process.argv.pop();
      done();
    });

    describe(chalk.yellow('Autoupdate'), function() {

      it('Run only Autoupdate', function(done) {
        dbm(app, bootstrap.options, true, function(err, data){
          done();
        });
      });
      
    });

    describe(chalk.yellow('With enableMigration'), function() {

      var enableMigrationSetting;
      var appHome;
      before('Set enableMigration, apphome', function(done) {
        enableMigrationSetting = app.get('enableMigration');
        app.set('enableMigration', true);
        appHome = app.locals.apphome;
        app.locals.apphome = path.join(__dirname, 'database-migration', 'test1', 'app');
        done();
      });

      after('Reset enableMigration, apphome', function(done) {
        app.set('enableMigration', enableMigrationSetting || false);
        app.locals.apphome = appHome;
        done();
      });

      it('Run Migration', function(done){
        // This will run autoupdate also again
        dbm(app, bootstrap.options, true, function(err, data){
          done();
        });
      });

      it('Run Migration Again', function(done){
        // This will run autoupdate also again
        dbm(app, bootstrap.options, true, function(err, data){
          done();
        });
      });

      describe(chalk.magenta('Without -m arg'), function() {
        var appHome;
        before('Remove -m Switch', function(done) {
          appHome = app.locals.apphome;
          app.locals.apphome = path.join(__dirname, 'database-migration', 'test2', 'app');
          process.argv.pop();
          done();
        });

        after('Add -m Switch', function(done) {
          process.argv.push('-m');
          app.locals.apphome = appHome;
          done();
        });

        it('Check for WAIT mode', function(done) {
          dbm(app, bootstrap.options, true, function(err, data){
            done();
          });
        });

      });

    });

    describe(chalk.yellow('With enableMigration with next version'), function() {

      var enableMigrationSettingNxtVer;
      var appHomeNxtVer;
      before('Set enableMigration, apphome', function(done) {
        enableMigrationSettingNxtVer = app.get('enableMigration');
        app.set('enableMigration', true);
        appHomeNxtVer = app.locals.apphome;
        app.locals.apphome = path.join(__dirname, 'database-migration', 'test2', 'app');
        done();
      });

      after('Reset enableMigration, apphome', function(done) {
        app.set('enableMigration', enableMigrationSettingNxtVer || false);
        app.locals.apphome = appHomeNxtVer;
        done();
      });

      it('Run Migration with next version', function(done){
        // This will run autoupdate also again
        dbm(app, bootstrap.options, true, function(err, data){
          done();
        });
      });

    });

  });
    
});