/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
* @classdesc This model stores the data to auto configure, application level client side routing using page.js
* The model has following properties
* Property |              Description
* ---------|-------------------------------
* `name`   | route name
* `path`   | relative url along with placeholders e.g. /customer/:id
* `type`   | <ul><li>page -> html data from "import" is fetched and added as innerHtml of target.</li><li>meta -> ui-metadata from "import" is fetched, component is generated and added inside target</li><li>list -> <ev-model-list> with relevant "import" is added inside target</li><li>elem -> If element with 'name' is NOT registered yet, 'import' is href-imported and 'name' element is added.</li></ul>
* `import` | as explained above
* `target` | element-query-selection for target element, non-mandatory the default taken from specified global.
*
* e.g.
*
*    [{
*        "type": "page",
*        "name": "receipts",
*        "path": "/receipts",
*        "import": "receipts-partial.html"
*    },
*    {
*        "type": "elem",
*        "name": "cfe-loan-details",
*        "path": "/loan",
*        "import": "../business/cfe-loan-details.html"
*    }]
*
* Note: If you specify `path` as "@default", the current location.pathname is configured to execute that route.
* This then also becomes the default 404 handler.
*
*
* @kind class
* @class UIRoute
* @author Rohit Khode
*/

/*
* this method can be overriden in application in boot script
* to have different behaviour
*/

module.exports = function uiRoute(UIRoute) {
  var routes = {};

  UIRoute.prototype.redirectHandler = function redirectHandler(app) {
    if (!routes[this.path]) {
      app.get(this.path, function getPath(req, res) {
        res.redirect('/?redirectTo=' + req.originalUrl);
      });
    }
    routes[this.path] = true;
  };
};
