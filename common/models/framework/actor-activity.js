/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var logger = require('oe-logger');
var log = logger('actor-activity');

module.exports = function (ActorActivity) {
  ActorActivity.on('dataSourceAttached', function onAttach(Model) {
    var options = {
      'ctx': {
        'remoteUser': 'admin',
        'tenantId': 'default'
      }
    };
    if (Model.dataSource.name === 'loopback-connector-postgresql') {
      Model.findOrCreate({where: {'modelName': 'xxx' }}, {'modelName': 'xxx'}, options, function (err, instance, created) {
        if (err) {
          log.debug('did not create dummy record ActorActivity');
        }
      });
    }
  });
};
