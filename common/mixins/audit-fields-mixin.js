/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This mixin adds audit properties such as _type, _createdBy, _modifiedBy,
 * _createdOn, _modifiedOn to model and populate them before they are saved into
 * database. <br>
 * <br>
 *
 * Description about the properties: <br>
 * <table border='1'>
 * <tr>
 * <th>Name</th>
 * <th>Type</th>
 * <th>Description</th>
 * </tr>
 * <tr>
 * <td>_type</td>
 * <td>string</td>
 * <td>modelName.</td>
 * </tr>
 * <tr>
 * <td>_createdBy</td>
 * <td>string</td>
 * <td>remote user who has created the record.</td>
 * </tr>
 * <tr>
 * <td>_createdOn</td>
 * <td>Date</td>
 * <td>time stamp of creation.</td>
 * </tr>
 * <tr>
 * <td>_modifiedBy</td>
 * <td>string</td>
 * <td>remote user who has modified the record.</td>
 * </tr>
 * <tr>
 * <td>_modifiedOn</td>
 * <td>Date</td>
 * <td>time stamp of modification.</td>
 * </tr>
 * </table>
 *
 * @mixin Audit Mixin
 * @author Sivankar Jain
 */

var logger = require('../../lib/logger');
var log = logger('audit-fields-mixin');

module.exports = function AuditFieldsMixin(Model) {
  if (Model.definition.name === 'BaseEntity') {
    log.debug(log.defaultContext(), 'skipping mixin for - ', Model.definition.name);
    return;
  }

  Model.defineProperty('_type', {
    type: String,
    length: 50,
    required: true
  });
  Model.defineProperty('_createdBy', {
    type: String,
    length: 50,
    required: true
  });
  Model.defineProperty('_modifiedBy', {
    type: String,
    length: 50,
    required: true
  });

  Model.defineProperty('_createdOn', {
    type: 'timestamp',
    required: true
  });

  Model.defineProperty('_modifiedOn', {
    type: 'timestamp',
    required: true
  });

  Model.evObserve('before save', injectAuditFields);
};

/**
 * This is an before save observer hook to auto inject Audit properties to the
 * Posted data.<br><br>
 *
 * It checks if posted data is a new instance or an update. In case of new
 * Instance it populates all the audit fields, where as in case of update it
 * modifies _modifiedBy and _modifiedOn with the appropriate user and time stamp respectively.
 *
 * @param {object} ctx - ctx object, which is populated by DAO.
 * @param {function} next - move to the next function in the queue
 * @return {function} next - move to the next function in the queue
 * @memberof Audit Mixin
 */
function injectAuditFields(ctx, next) {
  if (!ctx.Model.definition.settings.mixins.AuditFieldsMixin) {
    log.info(ctx.options, 'AuditFieldsMixin disabled for model - ', ctx.Model.modelName);
    return next();
  }
  log.debug(ctx.options, 'Before save called. Model Name - ', ctx.Model.modelName);

  log.info(ctx.options, 'Saving entity - ', ctx.Model.modelName);
  var context = ctx.options;
  var cctx = context.ctx || {};

  var remoteUser = cctx.remoteUser || 'system';

  var currentDateTime = new Date();

  var protectedFields = ['_type', '_createdBy', '_modifiedBy', '_createdOn', '_modifiedOn'];
  var postData = ctx.instance || ctx.data;
  var currentInstance = ctx.currentInstance;
  // if user provide data for any protectedField those data are removed, and
  // auto set.
  protectedFields.forEach(function AuditFieldsMixinProtectedFieldsForEachCb(field) {
    if (currentInstance) {
      postData[field] = currentInstance[field];
    } else {
      delete postData[field];
      if (postData[field]) {
        postData.unsetAttribute(field);
      }
    }
  });
  if (ctx.instance) {
    log.debug(ctx.options, 'isNewInstance = ', ctx.isNewInstance);
    // full save.
    if (ctx.isNewInstance) {
      // Auto-populate entity type
      ctx.instance._type = ctx.Model.definition.name;

      // Auto-populate created by user id and timestamp
      ctx.instance._createdBy = remoteUser;
      ctx.instance._createdOn = currentDateTime;
    }

    // Update modified by user id and timestamp
    ctx.instance._modifiedBy = remoteUser;
    ctx.instance._modifiedOn = currentDateTime;
  } else {
    // partial update of possibly multiple models.
    ctx.data._modifiedBy = remoteUser;
    ctx.data._modifiedOn = currentDateTime;
  }
  return next();
}
