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
var modelDefModel = app.models.ModelDefinition;
describe(chalk.blue('Database Migration'), function() {
  // To test this test case individually from mocha enable the below timeout
  this.timeout(90000);
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
          // The validation check for autoupdate is index(es) creation, schema change, or ModelDefinition table updates 
          expect(err).to.be.undefined;
          expect(data).to.be.undefined;
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
          expect(err).to.be.null;
          expect(data).not.to.be.null;
          expect(data).not.to.be.undefined;
          expect(data.key).to.be.equal('version');
          expect(data._type).to.be.equal('SystemConfig');
          expect(data.value).not.to.be.null;
          expect(data.value).not.to.be.undefined;
          expect(data.value).to.deep.equal({'oe-cloud':'0.9.0'});
          var filter = {
            where: {
              or: [
                {
                  name: 'DBMigrationTestModel0'
                },
                {
                  name: 'DBMigrationTestModel1'
                }
              ]
            }
          };
          modelDefModel.find(filter, {ctx: {tenantId: 'default'}}, function(modelDefErr, modelDefdata){
            expect(modelDefErr).to.be.null;
            expect(modelDefdata).not.to.be.null;
            expect(modelDefdata).not.to.be.undefined;
            expect(modelDefdata).to.be.an('array');
            // Data should contain both DBMigrationTestModel0, DBMigrationTestModel1
            // ModelDefinition instances which are uploaded from version 0.8.10, 0.9.0
            expect(modelDefdata.length).to.be.equal(2);
            done();
          });
        });
      });

      it('Run Migration Again', function(done){
        // This will run autoupdate also again
        dbm(app, bootstrap.options, true, function(err, data){
          expect(err).to.be.undefined;
          // Data will also be empty since there is nothing to migrate
          // Since migration completed in previous test case.
          expect(data).to.be.undefined;
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
            expect(err).to.be.undefined;
            // Data will also be empty since this is just to Cover the WAIT mode.
            expect(data).to.be.undefined;
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
          expect(err).to.be.null;
          expect(data).not.to.be.null;
          expect(data).not.to.be.undefined;
          expect(data.key).to.be.equal('version');
          expect(data._type).to.be.equal('SystemConfig');
          expect(data.value).not.to.be.null;
          expect(data.value).not.to.be.undefined;
          expect(data.value).to.deep.equal({'oe-cloud':'0.9.1', 'oe-component-sample-test': '0.1.0'});
          var filter = {
            where: {
              or: [
                {
                  name: 'DBMigrationTestModel1'
                },
                {
                  name: 'DBMigrationTestModel2'
                },
                {
                  name: 'DBMigrationTestModel3'
                }
              ]
            }
          };
          modelDefModel.find(filter, {ctx: {tenantId: 'default'}}, function(modelDefErr, modelDefdata){
            expect(modelDefErr).to.be.null;
            expect(modelDefdata).not.to.be.null;
            expect(modelDefdata).not.to.be.undefined;
            expect(modelDefdata).to.be.an('array');
            // Data should contain all DBMigrationTestModel1, DBMigrationTestModel2, DBMigrationTestModel3
            // ModelDefinition instances which are uploaded from version 0.9.1
            // via test2/app and test2/node_modules/oe-component-sample-test
            expect(modelDefdata.length).to.be.equal(3);
            var modelDefDataJson = JSON.parse(JSON.stringify(modelDefdata));
            expect(modelDefDataJson).not.to.be.null;
            expect(modelDefDataJson).not.to.be.undefined;
            var updatedModel = modelDefDataJson.find(function(model){
              return model.name === 'DBMigrationTestModel1'
            });
            expect(updatedModel).not.to.be.null;
            expect(updatedModel).not.to.be.undefined;
            expect(updatedModel.properties).to.deep.equal({'name':'string', 'type': 'string'});;
            done();
          });
        });
      });

    });

  });
    
});