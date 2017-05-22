/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var expect = chai.expect;
var models = bootstrap.models;
var debug = require('debug')('version-mixin-test');
var chalk = require('chalk');
var loopback = require('loopback');

describe(chalk.blue('change request model test'), function() {

    var modelName = 'ChangeRequestModelTest';
    var changeRequestId = null;
    var updateInstanceId = null;
    var modelDetails = {
	name : modelName,
	base : 'BaseEntity',
	properties : {
	    'name' : {
		'type' : 'string',
	    }
	},
	plural : modelName
    };

    before('create test model', function(done) {
	    models.ChangeRequest.defineProperty('_status', {
		type : String,
		required : false
	    });

	    models.ModelDefinition.create(modelDetails, bootstrap.defaultContext, function(err, res) {
		if (err) {
		    debug('unable to create VersionMixinTest model');
		    done(err);
		} else {

		    models[modelDetails.name].evObserve('before save', function beforeSaveHookToCreateCR(ctx, next) {

			var modelInstance = ctx.instance || ctx.data;
		    var skipCRCreation = ctx.options.updatedByWorkflow;

			if (!ctx.isNewInstance && !skipCRCreation) {
			    modelInstance.id = ctx.currentInstance.id;
			    var crData = {
				'originalEntityId' : ctx.currentInstance.id,
				'originalEntityType' : ctx.currentInstance._type,
				'changedEntity' : modelInstance,
				'_status' : 'pendingApproval'
			    };
			    var CRModel = loopback.getModel('ChangeRequest');
                var context = bootstrap.defaultContext;
                context.skipCRCreation = skipCRCreation;
			    CRModel.create(crData, context, function evWorkflowMixinCRModelCreateCb(err, instance) {
				if (err) {
				    return next(err, null);
				} else {
				    // the data is deleted because on update it
				    // will be sent to
				    // change Request and no change should be
				    // done to current
				    // Instance of the model
				    delete ctx.data;
					ctx.instanceUpdated = true;
					ctx.updatedInstance = instance;
					ctx.options.statusCode = 202;
				    return next();
				}
			    });
			} else {
			    return next();
			}
		    });
		    done();
		}
	    });
    });


    it('Should check if change request model have publish, cancel and reject api', function(done) {
		expect(typeof models.ChangeRequest.publish).to.be.equal('function');
		expect(typeof models.ChangeRequest.reject).to.be.equal('function');
		expect(typeof models.ChangeRequest.cancel).to.be.equal('function');
		expect(Object.keys(models.ChangeRequest.definition.properties)).to.include.members([ '_status' ]);
		done();
    });

    it('Should check if ChangeRequestModelTest has a before save observer', function(done) {
		var observerList = models.ChangeRequestModelTest._observers['before save'];
		expect(observerList).not.to.be.undefined;
		done();
    });

    it('Should create a record in ChangeRequestModelTest and update the same', function(done) {
	this.timeout(5000);
	var postData = {
	    'name' : 'testone'
	};
	models[modelName].create(postData, bootstrap.defaultContext, function(err, res) {
	    if (err) {
		done(err);
	    } else {
		postData.name = 'testUpdate';
		postData._version = res._version;
		updateInstanceId = res.id;
		res.updateAttributes(postData, bootstrap.defaultContext, function(err2, res2) {
		    if (err2) {
			done(err2);
		    } else {
			//expect(res2).to.be.equal(res);
			models.ChangeRequest.find({}, bootstrap.defaultContext, function(err3, res3) {
			    if (err) {
				done(err);
			    } else {
				expect(res3).to.have.length(1);
				expect(res3[0].changedEntity.name).to.be.equal('testUpdate');
				expect(res3[0]._status).to.be.equal('pendingApproval');
				changeRequestId = res3[0].id;
				done();
			    }
			});
		    }
		});
	    }
	});
    });

    it('should be able to reject a change request ', function(done) {
	// dummy data set for process instance.
	models.ChangeRequest.reject({}, changeRequestId, bootstrap.defaultContext, function(err, instance) {
	    if (err) {
		done(err);
	    } else {
		expect(instance._status).to.be.equal('rejected');
		models[modelName].findById(updateInstanceId, bootstrap.defaultContext, function(err, res) {
		    if (err) {
			done(err);
		    } else {
			expect(res.name).to.be.equal('testone');
			done();
		    }
		});
	    }
	});
    });

    it('should be able to cancel a change request ', function(done) {
	// dummy data set for process instance.
	models.ChangeRequest.cancel({}, changeRequestId, bootstrap.defaultContext, function(err, instance) {
	    if (err) {
		done(err);
	    } else {
		expect(instance._status).to.be.equal('cancelled');
		models[modelName].findById(updateInstanceId, bootstrap.defaultContext, function(err, res) {
		    if (err) {
			done(err);
		    } else {
			expect(res.name).to.be.equal('testone');
			done();
		    }
		});
	    }
	});
    });

    it('should be able to publish a change request ', function(done) {
	models.ChangeRequest.publish({}, changeRequestId, bootstrap.defaultContext, function(err, instance) {
	    if (err) {
		done(err);
	    } else {
		expect(instance._status).to.be.equal('published');
		models[modelName].findById(updateInstanceId, bootstrap.defaultContext, function(err, res) {
		    if (err) {
			done(err);
		    } else {
			done();
		    }
		});
	    }
	});
    });

    it('should not be able to publish a change request with wrong change request id', function(done) {
	models.ChangeRequest.publish({}, 'testFail', bootstrap.defaultContext, function(err, instance) {
	    if (err) {
		expect(err).not.to.be.empty;
		done();
	    } else {
		done(new Error('Change request published with wrong change request id'));
	    }
	});
    });
});
