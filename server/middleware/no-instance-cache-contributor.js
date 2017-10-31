/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries.
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/

var log = require('oe-logger')('no-instacne-cache-contributor');

/*
 * This middleware is used to add noInstanceCache option to the request if it was passed as a query paramenter on the request.
 *
 * @name No Instacne Cache Contributor
 * @author Karin angel
 * @memberof Middleware
 */

module.exports = function noInstacneCacheContributor(options) {
  return function noInstacneCacheContributorFn(req, res, next) {
    if (req.query && (!req.query.noInstanceCache || req.query.noInstanceCache === '0')) {
      log.debug(req.callContext, 'noInstanceCache is undefined');
      next();
    } else if (req.query && req.query.noInstanceCache === '1') {
      log.debug(req.callContext, 'request with noInstanceCache was sent with value of 1');
      req.callContext.noInstanceCache = true;
      next();
    } else {
      var err = new Error('invalid value in noInstanceCache was sent. Treating as undefined');
      log.error(req.callContext, err);
      next();
    }
  };
};
