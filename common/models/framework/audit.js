/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

var logger = require('../../../lib/logger')('audit.js');
var bunyan = require('bunyan');
var gelfStream = require('gelf-stream');
var auditConfig = require('../../../server/audit-config');

module.exports = function auditModel(Audit) {
  Audit.disableRemoteMethod('deleteById', true);
  Audit.disableRemoteMethod('upsert', true);
  Audit.disableRemoteMethod('updateAll', true);
  Audit.disableRemoteMethod('updateAttributes', false);

  Audit.prototype.event = function auditLog() {
    if (auditConfig) {
      var stream = gelfStream.forBunyan(auditConfig.host, auditConfig.port);
      var log = bunyan.createLogger({
        name: 'audit',
        streams: [{
          type: 'raw',
          stream: stream
        }]
      });

      var message = '';
      for (var i = 0; i < arguments.length; i++) {
        message = message + arguments[i];
      }

      log.info(logger.defaultContext(), message);
      stream.end();
    } else {
      logger.fatal(logger.defaultContext(), 'Audit failed');
      // var err = new Error('Audit failed');
      // err.retriable = false;
      // cb(err , 'Audit failed');
    }
  };
};
