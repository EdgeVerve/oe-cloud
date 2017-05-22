/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

var loopback = require('loopback');
var log = require('../../lib/logger')('redirect-for-uiroutes');

/**
 * This boot script registers express handler for each UIRoute
 * to redirect to / with redirectTo = url
 * So that when user presses refresh in browser
 * client side router will take user to redirectTo
 * If application needs to change or remove this behaviour
 * set disableRedirectForUIRoutes to false, implement new
 * behaviour in its own boot script
 * For example groupName handling can be done in app
 *
 * @memberof Boot Scripts
 * @author Praveen Gulati
 * @name Redirect Handling for UI Routes
 */

module.exports = function redirectForUIRoutes(app) {
  var UIRoute = loopback.getModelByType('UIRoute');

  var disableRedirectForUIRoutes = UIRoute.app.get('disableRedirectForUIRoutes');
  if (!disableRedirectForUIRoutes) {
    UIRoute.observe('after save', function uiRouteAFterSave(ctx, next) {
      if (ctx.instance) {
        var route = ctx.instance;
        route.redirectHandler(app);
      }
      next();
    });

    var options = {
      ctx: {}
    };

    options.ignoreAutoScope = true;
    options.fetchAllScopes = true;
    UIRoute.find({
      where: {}
    }, options, function uiRouteFind(err, res) {
      if (err) {
        log.error(options, err);
      }
      res.forEach(function resForEachFn(route) {
        route.redirectHandler(app);
      });
    });
  }
};
