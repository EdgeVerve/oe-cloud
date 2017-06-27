/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries.
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
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
    * @param {string} name name.
    * @param {function} options options.
    * @param {function} cb callback.
    * @memberof UIResource
    * @name content
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

    UIResource.find(filter, options, function uiResourceContentFindCb(err, results) {
      if (err) {
        cb(err);
      }
      if (results && results[0]) {
        cb(null, results[0]);
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
