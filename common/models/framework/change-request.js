/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * <b>Problem Statement:</b> When ever there is any update, and it requires
 * approval of another user before updating the instance in Database.</br></br>
 *
 * <b>Solution:</b> This models provides an interface to create a change
 * request for any model instance update, and exposes /publish, /rejected and
 * /cancel api to user to perform action on change request, in case user publish
 * the record, it internally updates the actual model instance for which change
 * request was created otherwise it doesnt update the entity.
 *
 * @class ChangeRequest
 * @author Sivankar jain
 */
// function has too many parameters.'
var loopback = require('loopback');
var logger = require('../../../lib/logger');
var log = logger('change-request');
var uuid = require('node-uuid');

// const SUBMITTED = 'submitted';
// const PENDING_APPROVAL = 'pending_approval';
const
  PUBLISHED = 'published';
const
  REJECTED = 'rejected';
const
  CANCELLED = 'cancelled';

module.exports = function ChangeRequestFn(ChangeRequest) {
  addMethods(ChangeRequest);
  exposeAsRemoteMethods(ChangeRequest);
};

/**
 * Expose /publish, /rejected and /cancel end points to Change Request model.
 *
 * @param {ModelCont}
 *                Model Change request model, to add remote methods to it.
 * @method exposeAsRemoteMethods
 * @memberof ChangeRequest
 */
function exposeAsRemoteMethods(Model) {
  // Method to publish an entity.
  Model.remoteMethod('publish', {
    description: 'To change the status of entity as "published" ',
    accessType: 'WRITE',
    accepts: [{
      arg: 'ctx',
      type: 'object',
      description: 'context',
      http: {
        source: 'context'
      }
    }, {
      arg: 'id',
      type: 'string',
      description: 'change request id'
    }],
    http: {
      verb: 'POST',
      path: '/:id/publish'
    },
    returns: {
      type: Model,
      root: true
    }
  });

  // Method to reject an entity.
  Model.remoteMethod('reject', {
    description: 'To change the status of entity as "rejected" ',
    accessType: 'WRITE',
    accepts: [{
      arg: 'ctx',
      type: 'object',
      description: 'context',
      http: {
        source: 'context'
      }
    }, {
      arg: 'id',
      type: 'string',
      description: 'change request id'
    }],
    http: {
      verb: 'POST',
      path: '/:id/reject'
    },
    returns: {
      type: Model,
      root: true
    }
  });

  // Method to cancel an entity.
  Model.remoteMethod('cancel', {
    description: 'To change the status of entity as "cancelled" ',
    accessType: 'WRITE',
    accepts: [{
      arg: 'ctx',
      type: 'object',
      description: 'context',
      http: {
        source: 'context'
      }
    }, {
      arg: 'id',
      type: 'string',
      description: 'change request id'
    }],
    http: {
      verb: 'POST',
      path: '/:id/cancel'
    },
    returns: {
      type: Model,
      root: true
    }
  });
}

/**
 * Adds /publish, /rejected and /cancel remote methods to Change Request model.
 *
 * @param {ModelCont}
 *                Model Change request model, to add remote methods to it.
 * @memberof ChangeRequest
 */
function addMethods(Model) {
  // Status change end points if not already custom registered in respective
  // models

  Model.publish = function exposeAsRemoteMethodsPublishFn(ctx, id, options, cb) {
    log.info(options, 'Base Entity\'s publish end point called for model [', this.modelName, ']');
    proceedUpdate(ctx, this.modelName, id, PUBLISHED, options, cb);
  };

  Model.reject = function exposeAsRemoteMethodsRejectFn(ctx, id, options, cb) {
    log.info(options, 'Base Entity\'s reject end point called for model [', this.modelName, ']');
    proceedUpdate(ctx, this.modelName, id, REJECTED, options, cb);
  };

  Model.cancel = function exposeAsRemoteMethodsCancelFn(ctx, id, options, cb) {
    log.info(options, 'Base Entity\'s cancel end point called for model [', this.modelName, ']');
    proceedUpdate(ctx, this.modelName, id, CANCELLED, options, cb);
  };

  /**
   * This method updates the entity in data base, in case status is published
   * it updates the actual model Instance for which change request was
   * created. Otherwise it doesnt update the actual model entity.</br>
   * Finally it updates change request instance with appropriate status
   * published, rejected or cancel.
   * @memberof ChangeRequest
   * @param  {object} ctx - dao context
   * @param  {string} modelName - modelname
   * @param  {id} id - id of an instance
   * @param  {string} status - status of an instance
   * @param  {object} options - callcontext options
   * @param  {function} cb -callback
   */
  function proceedUpdate(ctx, modelName, id, status, options, cb) {
    // this check is necessary when we try from swagger usually options is
    // defined as cb and cb is undefined.
    // and programmatically also if user doesn’t send options then the
    // options
    // will be function and cb will be undefined.

    if (typeof cb === 'undefined') {
      if (typeof options === 'function') {
        // create(data, cb);
        cb = options;
        options = {};
      }
    }

    log.info(options, 'in change-request persistUpdates() called with id[', id, '] and status [', status, ']');
    var CrModel = loopback.getModel('ChangeRequest');
    log.debug(options, 'Change Request with id [', id, ']');

    CrModel.findById(id, options, function changeRequestModelFindCb(err, crResult) {
      if (err) {
        cb(err, null);
      }
      if (crResult === null) {
        log.error(options, 'No Change Request found with id [', id, ']');
        return cb('No Change Request found with id [' + id + ']', null);
      }
      log.debug(options, 'CR instance found with status [', crResult._status, ']');
      log.info(options, 'CR instance found with status [', crResult._status, ']');

      var crInstance = crResult;
      if (status === PUBLISHED) {
        log.debug(options, 'Published the changes to the original entity');
        log.info(options, 'Published the changes to the original entity');

        var originalEntityId = crInstance.originalEntityId;
        var originalEntityType = crInstance.originalEntityType;
        var updatedEntity = crInstance.changedEntity;
        // Id needs to be populated as it may not be part of
        // payload. (updateAttributes)
        updatedEntity.id = originalEntityId;

        // Find model by id and update the requested
        log.debug(options, 'Change request updating for model [', originalEntityType, ']');
        log.info(options, 'Change request updating for model [', originalEntityType, ']');

        var Model = loopback.getModel(originalEntityType);
        if (typeof Model === 'undefined') {
          var err1 = new Error(originalEntityType + ' Model not found');
          err1.retriable = false;
          return cb(err1, null);
        }

        updatedEntity._version = updatedEntity._oldVersion;

        // we need to set updatedByWorkflow because this update is done by workflow and
        // not EndUser, so if in case there is any workflow settings for update it
        // should not be triggered

        options.updatedByWorkflow = true;

        Model.upsert(updatedEntity, options, function changeRequestOriginalEntityFindUpdateCb(err, mInstance) {
          if (err) {
            log.debug(options, 'Error occured while updating the changedModel model [', originalEntityType, ']', err);
            log.error(options, 'Error occured while updating the changedModel model [', originalEntityType, ']', err);
            cb(err, null);
          } else if (mInstance) {
            log.debug(options, 'CR model for Entity[', originalEntityType, '] is updated succesfully');
            log.info(options, 'CR model for Entity[', originalEntityType, '] is updated succesfully');

            // Update the status of change-request
            // with the status send

            crInstance._status = status;
            crInstance._newVersion = uuid.v4();
            CrModel.upsert(crInstance, options, function changeRequestOriginalEntityFindUpdateUpsertCb(err, crInstance) {
              if (err) {
                log.debug(options, 'Error occured while updating the CR model');
                log.error(options, 'Error occured while updating the CR model');
                cb(err, null);
              } else {
                log.debug(options, 'CR instance updated with status [', crInstance._status, ']');
                log.info(options, 'CR instance updated with status [', crInstance._status, ']');
                cb(null, crInstance);
              }
            });
          }
        });
      } else {
        log.debug(options, 'No Action required for status [', status, ']');
        log.info(options, 'No Action required for status [', status, ']');
        crInstance._status = status;
        crInstance._newVersion = uuid.v4();
        options.updatedByWorkflow = true;
        CrModel.upsert(crInstance, options, function changeRequestUpsertCb(err, crInstance) {
          if (err) {
            log.debug(options, 'Error occured while updating the CR model');
            log.error(options, 'Error occured while updating the CR model');
            cb(err, null);
          } else {
            log.debug(options, 'CR instance updated with status [', crInstance._status, ']');
            log.info(options, 'CR instance updated with status [', crInstance._status, ']');
            cb(null, crInstance);
          }
        });
      }
    });
  }
}
