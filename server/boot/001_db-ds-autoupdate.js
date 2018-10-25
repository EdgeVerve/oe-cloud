/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * This boot script sets env variable allowing connector to run autoupdate by itself.
 *
 * @memberof Boot Scripts
 * @author Pradeep Kumar Tippa
 * @name DB Datasource AutoUpdate
 */
var log = require('oe-logger')('boot-db-models');
var util = require('../../lib/common/util');
module.exports = function DbDsAutoupdate(app, cb) {
    log.debug(util.bootContext(), 'Setting the environment "ENABLE_DS_AUTOUPDATE" variable to true');
    process.env.ENABLE_DS_AUTOUPDATE = true;
    cb();
};
