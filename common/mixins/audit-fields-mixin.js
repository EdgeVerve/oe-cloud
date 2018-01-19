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

module.exports = function AuditFieldsMixin(Model) {
  if (Model.definition.name === 'BaseEntity') {
    return;
  }

  Model.defineProperty('_type', {
    type: String,
    length: 50
  });
  Model.defineProperty('_createdBy', {
    type: String,
    length: 50
  });
  Model.defineProperty('_modifiedBy', {
    type: String,
    length: 50
  });

  Model.defineProperty('_createdOn', {
    type: 'timestamp'
  });

  Model.defineProperty('_modifiedOn', {
    type: 'timestamp'
  });

  if ((Model.settings.overridingMixins && !Model.settings.overridingMixins.AuditFieldsMixin) || !Model.settings.mixins.AuditFieldsMixin) {
    Model.evRemoveObserver('before save', injectAuditFields);
  } else {
    Model.evObserve('before save', injectAuditFields);
  }
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
  var context = ctx.options;
  var cctx = context.ctx || {};

  var remoteUser = cctx.remoteUser || 'system';

  var currentDateTime = new Date();

  var protectedFields = ['_type', '_createdBy', '_modifiedBy', '_createdOn', '_modifiedOn'];
  var postData = ctx.instance || ctx.data;
  // var currentInstance = ctx.currentInstance;
  // if user provide data for any protectedField those data are removed, and
  // auto set.
  var isInstance = ctx.instance;
  protectedFields.forEach(function AuditFieldsMixinProtectedFieldsForEachCb(field) {
    if (isInstance) {
      postData.unsetAttribute(field);
    } else {
      delete postData[field];
    }
  });
  if (isInstance) {
    // full save.
    if (ctx.isNewInstance) {
      // Auto-populate entity type
      postData._type = ctx.Model.definition.name;

      // Auto-populate created by user id and timestamp
      postData._createdBy = remoteUser;
      postData._createdOn = currentDateTime;
    }
  }
  postData._modifiedBy = remoteUser;
  postData._modifiedOn = currentDateTime;
  return next();
}
