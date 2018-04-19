/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;
var models = bootstrap.models;
var app = bootstrap.app;
var chai = require('chai');
chai.use(require('chai-things'));
var loopback = require('loopback');
var oeUtil = require('./../lib/common/util');
var async = require('async');

describe('inheritance util tests', function() {
  it('should create a litter of inherited models', done => {
    var names = ['X', 'Y', 'Z', 'A'];
    // debugger;
    var ins = (name, idx) => new Promise((resolve, reject) => {
      
      var r;

      if(idx === 0) {
        r = {
          name,
          properties:{
            [`a${name}${idx}`] : 'string'
          }
        }
      }
      else {
        r = {
          name,
          base: names[idx - 1],
          properties:{
            [`a${name}${idx}`] : 'string'
          }
        }
      }

      models.ModelDefinition.create(r, bootstrap.defaultContext, err => {
        if (err) {
          reject(err)
        }
        else {
          resolve();
        }
      });
    });

    var tasks = names.map((n,i) => cb => {
      ins(n, i).then(() => cb()).catch(err => cb(err));
    });

    async.series(tasks, (err) => err ? done(err) : done());
  }).timeout(10000);

  it('should assert that traverseInheritanceTree util works correctly', () => {
    var model = loopback.findModel('A', bootstrap.defaultContext);
    var results = [];
    // debugger;
    expect(model.modelName).to.equal('A-test-tenant');
    debugger;
    oeUtil.traverseInheritanceTree(model, bootstrap.defaultContext, base => {
      results.push(base.modelName);
    });

    expect(results).to.eql(['X', 'Y', 'Z'].reverse().map(n => `${n}-test-tenant`));

  });
});
