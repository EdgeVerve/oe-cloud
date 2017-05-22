/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
module.exports = function enableAuthentication(server) {
  var disableDefaultAuth = server.get('disableDefaultAuth');
  if (!disableDefaultAuth) {
    server.enableAuth();
  }
};
