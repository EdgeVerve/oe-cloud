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

  // var path = require('path');

  var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

  router.get('/', function routesGetDefaultCb(req, res) {
    res.sendFile('index.html', { root: path.join(__dirname, '../../client') });
  });

  router.get('/homepage', ensureLoggedIn('/login'), function routesGetHomepageCb(req, res) {
    var obj = {};
    obj.url = req.session.returnTo;
    if (!obj.url) {
      obj.url = '/home';
    }
    res.send(obj);
  });

  router.get('/login', function routesGetLoginCb(req, res) {
    res.sendFile('login.html', { root: path.join(__dirname, '../../client') });
  });

  router.get('/debug', function routesGetLoginCb(req, res) {
    var model = app.models.DataSourceDefinition;
    var ret = model.getDataSource().settings;
    res.send(JSON.stringify(ret));
  });

  app.use(router);
};
