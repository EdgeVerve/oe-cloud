/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var providers = {};
if (process.env.PROVIDERS) {
  providers = process.env.PROVIDERS;
  providers = JSON.parse(providers);
}
module.exports = providers;
