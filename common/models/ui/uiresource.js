/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
* @classdesc This model stores the User-Interface Resources and allows them to be pulled by UI based on scope.
* name - name of the ui-resource, unique within scope. Browsers/Client will request for resource based on this name.
* type - 'Content-Type' of the resource
* content - the resource data
* A custom remote route UIResources/content/<resource-name> extracts the `content` from the
* given record and returns. `type` property on record decides the 'Content-Type' http header.
*
* @kind class
* @class UIResource
* @author Rohit Khode
*/

module.exports = function UIResourceFn(UIResource) {
  /**
  * Extracts the `content` from the given record and returns.
  * `type` property on record decides the 'Content-Type' http header.
  *
  * @memberof UIResource
  * @name content
  * @param  {string} name - name
  * @param  {object} options - call context options
  * @param  {function} cb -callback function
  */
  UIResource.content = function uiResourceContentFn(name, options, cb) {
    // var self = this;

    var filter = {
      where: {
        name: name
      }
    };

    if (!cb && typeof options === 'function') {
      cb = options;
      options = {};
    }

    UIResource.findOne(filter, options, function uiResourceContentFindCb(err, data) {
      if (err) {
        cb(err);
      }
      if (data) {
        cb(null, data);
      } else {
        cb({
          status: 404,
          message: 'Resource ' + name + ' not found.'
        }, null);
      }
    });
  };

  UIResource.remoteMethod(
    'content', {
      returns: [{
        type: 'object',
        root: true,
        description: 'resource content'
      }],
      accepts: [{
        arg: 'name',
        type: 'string',
        http: {
          source: 'path'
        }
      }],
      http: {
        path: '/content/:name',
        verb: 'get'
      }
    }
  );

  UIResource.afterRemote('content', function UIResourceContent(context, remoteMethodOutput, next) {
    context.res.setHeader('Content-Type', context.result.type);
    context.res.end(context.result.content);
  });
};
