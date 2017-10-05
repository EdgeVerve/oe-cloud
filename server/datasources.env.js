/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var datasources = {};
if (process.env.DATASOURCES) {
  datasources = process.env.DATASOURCES;
  datasources = JSON.parse(datasources);
}
module.exports = datasources;
