var oecloud = require('../../');
var logger = require('oe-logger');
var log = logger('base-entity');

log.debug(log.defaultContext(), 'BaseEntity.js is loaded');

module.exports = function (Model) {
  log.debug(log.defaultContext(), 'BaseEntity.js is loaded for ', Model.modelName);
  var sources = oecloud.options.baseEntitySources;
  if (sources) {
    sources.forEach(source => {
      var f = require(source);
      if (typeof f === 'function') {
        f(Model);
      }
    });
  }
};


