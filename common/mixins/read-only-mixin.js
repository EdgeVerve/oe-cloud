
var logger = require('oe-logger');
var log = logger('read-only-mixin');

module.exports = function ReadOnlyMixin(Model) {
  if (Model.definition.name === 'BaseEntity') {
    log.debug(log.defaultContext(), 'skipping mixin for - ', Model.definition.name);
    return;
  }

  Model.disableRemoteMethod('upsert', true);
  Model.disableRemoteMethod('updateAll', true);
  Model.disableRemoteMethod('updateAttributes', false);
  Model.disableRemoteMethod('deleteById', true);
  Model.disableRemoteMethod('destroyById', true);
  Model.disableRemoteMethod('createChangeStream', true);
  Model.disableRemoteMethod('replaceById', true);
  Model.disableRemoteMethod('replaceOrCreate', true);
  Model.disableRemoteMethod('patchOrCreate', true);
  Model.disableRemoteMethod('replaceById', true);
  Model.disableRemoteMethod('patchAttributes', true);


  log.debug(log.defaultContext(), 'Applied Read-Only mixin on ' + Model.moduleName);
};
