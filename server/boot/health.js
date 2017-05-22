/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var logger = require('../../lib/logger');
var log = logger('health');
var DataSource = require('loopback-datasource-juggler').DataSource;
var dataSources = require('./../datasources.json');
var finished;
var cacheDataSources = (function single() {
  var dataSourcesArray;

  function init() {
    var instancesArray = {};
    for (var key in dataSources) {
      if (dataSources.hasOwnProperty(key)) {
        instancesArray[key] = new DataSource(dataSources[key]);
      }
    }
    return instancesArray;
  }

  return {
    getInstance: function getInstanceFn() {
      if (!dataSourcesArray) {
        dataSourcesArray = init();
      }
      return dataSourcesArray;
    }
  };
})();

module.exports = function healthCheck(server) {
  server.get('/health', function serverGet(req, res) {
    var dataSource;
    finished = 0;
    var dataSourcesArray = cacheDataSources.getInstance();
    for (var key in dataSourcesArray) {
      if (dataSourcesArray.hasOwnProperty(key)) {
        dataSource = dataSourcesArray[key];
        if (dataSource && dataSource.connector && dataSource.ping) {
          var callback = getCallback(key, res);
          dataSource.ping(callback);
        } else {
          log.warn(log.defaultContext(), 'Health can\'t be checked for datasource because the connector doesn\'t have ping ', key);
        }
      }
    }
  });
};

function getCallback(currentKey, res) {
  return function getCallBackFn() {
    if (arguments[0]) {
      res.status(500);
      res.end('The db ' + currentKey + ' had an error: ' + arguments[0]);
    }
    finished++;
    if (finished === Object.keys(dataSources).length - 1) {
      res.end('All the datasources are up.');
    }
  };
}
