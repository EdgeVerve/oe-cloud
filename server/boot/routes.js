/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var path = require('path');
var fs = require('fs');
/**
 * This script is responsible for creating routes for bower_Components check.
 * It also creates route for homepage, login and debug using plain express model.
 *
 * @memberof Boot Scripts
 * @author Praveen Gulati (kpraveen)
 * @name Creates routes for homepage, login and debug
 */

module.exports = function Routes(app) {
  var router = new app.loopback.Router();

  router.get('/', function routesGetDefaultCb(req, res) {
    var subPath = app.get('subPath');
    if (subPath) {
      var indexFile = fs.readFileSync(path.join(__dirname, '../../client/index.html'), 'utf8');
      indexFile = indexFile.replace('/explorer', '/' + subPath + '/explorer/');
      indexFile = indexFile.replace('/auth/local', '/' + subPath + '/auth/local');
      indexFile = indexFile.replace('/api/dev/create-tenant', '/' + subPath + '/api/dev/create-tenant');
      res.setHeader('content-type', 'text/HTML');
      res.send(indexFile);
    } else {
      res.sendFile('index.html', { root: path.join(__dirname, '../../client') });
    }
  });

  app.use(router);
};
