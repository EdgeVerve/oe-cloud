/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries.
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/

var log = require('oe-logger')('db-lock-contributor');
var config = require('../config.js');
var DB_LOCK_MODE = config.dbLockMode;

/*
 * This middleware is used to decide which DB Lock method will be used - the connector dbLock or an empty lock.
 *
 * @name DB Lock Contributor
 * @author Karin angel
 * @memberof Middleware
 */

module.exports = function dbLockContributor(options) {
  return function dbLockContributorFn(req, res, next) {
    if (!req.headers['x-evproxy-db-lock'] || req.headers['x-evproxy-db-lock'] === '0') {
      log.debug(req.callContext, 'x-evproxy-db-lock header is undefined');
      next();
    } else if (req.headers['x-evproxy-db-lock'] === '1') {
      log.debug(req.callContext, 'x-evproxy-db-lockk header has value of 1');
      req.callContext.lockMode = DB_LOCK_MODE;
      next();
    } else {
      var err = new Error('invalid value in x-evproxy-db-lockk header');
      log.error(req.callContext, err);
      throw err;
    }
  };
};
