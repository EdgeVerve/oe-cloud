/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/* eslint-disable no-console */
var process = require('process');
module.exports = function setAppUrl(app, next) {
  if (process.env.APP_URL) {
    app.set('evproxyurl', process.env.APP_URL);
    console.log('setting proxy url to ', process.env.APP_URL);
  }
  next();
};
