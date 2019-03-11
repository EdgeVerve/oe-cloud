/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

module.exports = function enableAuthentication(app) {
  var models = app._models;
  models.forEach(model => {
    model.settings.strictObjectIDCoercion = true;
  });
};
