/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var config = {};
if (process.env.CONFIG) {
  config = process.env.CONFIG;
  config = JSON.parse(config);
}

module.exports = config;
