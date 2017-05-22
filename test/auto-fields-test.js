/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * UnitTest Cases for Auto Fields
 *
 * @author Ajith Vasudevan
 */

var bootstrap = require('./bootstrap');
var expect = bootstrap.chai.expect;
var loopback = require('loopback');
var models = bootstrap.models;
var chai = require('chai');
chai.use(require('chai-things'));


describe('Auto Fields Test', function () {

    this.timeout(30000);

    var model = null;
    var modelId = null;

    before('create models', function (done) {
        models.ModelDefinition.create({
            name: 'AutoFieldTestModel',
            base: 'BaseEntity',
            plural: 'AutoFieldTestModels',
            properties: {
                'user': {
                    'type': 'string',
                    'setval': "CALLCONTEXT.ctx.remoteUser"
                },
                'ctxObj': {
                    'type': 'object',
                    'setval': "CTX"
                }
            }
        }, bootstrap.defaultContext, function (err, afModel) {
            if (err) {
                done(err);
            } else {
                expect(err).to.be.null;
                modelId = afModel.id;
                done();
            }
        });
    });

    after('cleanup', function (done) {
        models.ModelDefinition.destroyAll({"id": modelId}, bootstrap.defaultContext, function(err, data) {
            done();
        });
    });


    it('should create a model instance with auto-populated values', function (done) {
        model = loopback.findModel('AutoFieldTestModel');
        expect(model).not.to.be.null;
        expect(model).not.to.be.undefined;
        model.create({}, bootstrap.defaultContext, function(err, data) {
            expect(err).to.be.null;
            expect(data).not.to.be.null;
            expect(data.user).not.to.be.null;
            expect(data.ctxObj).not.to.be.null;
            expect(data.user).to.equal('test-user');
            done();
        });
    });
});