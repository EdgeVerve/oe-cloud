/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var path = require('path');

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
    res.sendFile('index.html', { root: path.join(__dirname, '../../client') });
  });

  app.use(router);
};
