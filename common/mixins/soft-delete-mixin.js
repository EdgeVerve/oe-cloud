/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This mixin is to provide support for soft delete for a given model.<br>
 *
 * This mixin add a new property _isDeleted to the model and overrides
 * destroyedById and DestroyAll method to update records and set per filter and
 * set _isDelete to true. By default _isDeleted is set to false.<br>
 *
 * It also set an access observer hook to alter the query, it add filter
 * _isDelete = false so only records with _isDeleted : false are return.
 *
 * @mixin Soft Delete
 * @author Sivankar Jain
 */

var mergeQuery = require('loopback-datasource-juggler/lib/utils').mergeQuery;

module.exports = function SoftDeleteMixin(Model) {
  if (Model.modelName === 'BaseEntity') {
    return;
  }

  Model.settings._softDelete = true;

  Model.defineProperty('_isDeleted', {
    type: 'boolean',
    default: false
  });

  Model.evObserve('access', addSoftDeleteFilter);
};

/**
 * Adds an access observer hook to add query filter _isDelete: false, so only
 * records with _isDeleted : false are return.
 *
 * @param {object}
 *                ctx - ctx object, which is populated by DAO.
 * @param {function}
 *                next - move to the next function in the queue
 * @returns {function} next - move to the next function in the queue
 * @memberof Soft Delete
 */
function addSoftDeleteFilter(ctx, next) {
  if (!ctx.Model.settings._softDelete) {
    return next();
  }
  ctx.query = ctx.query || {};
  if (ctx.query.fetchDeleted) {
    mergeQuery(ctx.query, {
      where: {
        _isDeleted: true
      }
    });
  } else {
    mergeQuery(ctx.query, {
      where: {
        _isDeleted: false
      }
    });
  }
  next();
}
