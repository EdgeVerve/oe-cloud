/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var supertest = require('supertest');
var app = bootstrap.app;
var loopback = require('loopback');
var async = require('async');

describe(chalk.blue('Model Personalizaton Test VariantOf'), function () {
  before('before', function (done) {
    done();
  });

  after('after', function (done) {
    done();
  });

  it('Create personalized model of ModelDefinition for tenant wayne', function (done) {
    var modelDefinition = loopback.findModel('ModelDefinition');
    var options = {
      ctx: {
        tenantId: "wayne"
      }
    }
    var definition = {};
    definition.name = "ModelDefinition";
    definition.variantOf = "ModelDefinition";
    definition.autoscope = ["region"];
    modelDefinition.create(definition, options, function (err, res) {
      if (err) {
        done(err);
      } else {
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res.name).to.be.equal('ModelDefinition');
        done();
      }
    });
  });

  it('Create personalized model for tenant wayne', function (done) {
    var options = {
      ctx: {
        tenantId: "wayne",
        region: "dc"
      }
    }
    var modelDefinition = loopback.findModel('ModelDefinition', options);

    var personalizedModel = {
      name: "WayneEnterprize",
      base: "BaseEntity",
      properties: {
        "p1": "string"
      }
    }
    modelDefinition.create(personalizedModel, options, function (err, res) {
      if (err) {
        done(err);
      } else {
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res.name).to.be.equal('WayneEnterprize');
        expect(res.modelId).to.be.equal('WayneEnterprize-wayne-dc');
        done();
      }
    });
  });

  it('Create personalized model for tenant stark', function (done) {
    var options = {
      ctx: {
        tenantId: "stark"
      }
    }
    var modelDefinition = loopback.findModel('ModelDefinition', options);

    var personalizedModel = {
      name: "StarkIndustries",
      base: "BaseEntity",
      properties: {
        "p1": "string"
      }
    }
    modelDefinition.create(personalizedModel, options, function (err, res) {
      if (err) {
        done(err);
      } else {
        expect(res).not.to.be.null;
        expect(res).not.to.be.empty;
        expect(res).not.to.be.undefined;
        expect(res.name).to.be.equal('StarkIndustries');
        expect(res.modelId).to.be.equal('StarkIndustries-stark');
        done();
      }
    });
  });
});
