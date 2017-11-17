/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/* eslint-disable no-console */
var path = require('path');
module.exports = function Explorer(server) {
  if (process.env.DISABLE_EXPLORER && process.env.DISABLE_EXPLORER !== 'false') {
    return;
  }
  var explorer;
  var explorerPathName = '/explorer';
  try {
    explorer = require('oe-explorer');
  } catch (err) {
    // Print the message only when the app was started via `server.listen()`.
    // Do not print any message when the project is used as a component.
    server.once('started', function explorerServerStarted(baseUrl) {
      console.log(
        'Run `npm install oe-explorer` to enable the oeCloud explorer'
      );
    });
    return;
  }
  var swaggerUiDist = require('oe-swagger-ui').dist;
  var restApiRoot = server.get('restApiRoot');
  var explorerDir = path.join(__dirname, '..', '..', 'client', 'explorer');
  var uiDirs = [explorerDir, swaggerUiDist];

  var explorerApp = explorer.routes(server, {
    basePath: restApiRoot,
    uiDirs: uiDirs
  });
  server.use(explorerPathName, explorerApp);
  server.once('started', function explorerServerStarted() {
    var baseUrl = server.get('url').replace(/\/$/, '');
    // express 4.x (loopback 2.x) uses `mountpath`
    // express 3.x (loopback 1.x) uses `route`
    console.log('Browse your REST API at %s%s', baseUrl, explorerPathName);
  });
};
