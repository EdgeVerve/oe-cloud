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
  if (app.get('enableMigration')) {
    if (util.checkForMigrationSwitch('ON') === 'ON') {
      log.debug(util.bootContext(), 'DB Migration is enabled, but the migration switch also provided, setting the environment "ENABLE_DS_AUTOUPDATE" variable to true');
      process.env.ENABLE_DS_AUTOUPDATE = true;
    } else {
      log.debug(util.bootContext(), 'DB Migration is enabled, but the migration switch not provided, setting the environment "ENABLE_DS_AUTOUPDATE" variable to false');
      process.env.ENABLE_DS_AUTOUPDATE = false;
    }
  } else {
    log.debug(util.bootContext(), 'DB Migration is disabled, setting the environment "ENABLE_DS_AUTOUPDATE" variable to true');
    process.env.ENABLE_DS_AUTOUPDATE = true;
  }
  cb();
};
