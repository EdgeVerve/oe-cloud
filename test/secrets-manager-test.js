/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

var secretsManager = require('../lib/secrets-manager.js');
var chalk = require('chalk');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));

var orchestrator;
var vcapServices;

describe(chalk.blue('secrets-manager'), function () {
    
    this.timeout(60000);

    before("setting required data", function(done){
        orchestrator = process.env.ORCHESTRATOR;
        vcapServices = process.env.VCAP_SERVICES;
        done();
    });

    after("cleaning up secrets", function(done){
        process.env.ORCHESTRATOR = orchestrator;
        process.env.VCAP_SERVICES = vcapServices;
        done();
    });

    it("Docker secrets are populated in env variable", function(done){
        process.env.ORCHESTRATOR = "DockerSwarm";
        process.env.DOCKER_SECRETS_FOLDER = "./test/secrets-test-data";
        secretsManager.populateSecrets();
        expect(process.env.TESTMONGOHOST).to.be.equal('testmongohost');
        expect(process.env.TESTMONGOUSER).to.be.equal('testmongouser');                
        done();
    });

    it("PCF secrets are populated in env variable", function(done){
        process.env.ORCHESTRATOR = "PCF";
        process.env.PCF_SERVICES = "[\"TEST_MONGO_SECRETS\"]";
        process.env.VCAP_SERVICES = '{"user-provided":[{"credentials":{"TEST_MONGO_HOST":"10.0.0.1","TEST_MONGO_PASSWORD":"password","TEST_MONGO_USER":"oecloud"},"syslog_drain_url":"","volume_mounts":[],"label":"user-provided","name":"TEST_MONGO_SECRETS","tags":[]}]}';
        secretsManager.populateSecrets();
        expect(process.env.TEST_MONGO_HOST).to.be.equal('10.0.0.1');
        expect(process.env.TEST_MONGO_PASSWORD).to.be.equal('password');
        expect(process.env.TEST_MONGO_USER).to.be.equal('oecloud');
        done();
    });
});