var fs = require('fs');
var path = require('path');
var util = require('../../lib/common/util.js');
var templatePath = path.join(__dirname, '../../lib', 'client-sdk.template');
var template = fs.readFileSync(templatePath, 'utf8');

module.exports = function createClientSDK(server) {
  server.get('/client-sdk.js', function sendClientSDK(req, res) {
    var routes = util.getRoutes(server);
    var resp = template.replace('__ROUTES__', JSON.stringify(routes));
    res.setHeader('content-type', 'text/javascript');
    res.end(resp);
  });
};
