/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

// There will be 3 implementations of messaging, using mqtt, multicast, and simple broadcast using web sockets, but all should be optional and not part of ev-foundation module
var globalMessaging = require('./broadcaster-client');

globalMessaging.init();

module.exports = {
  publish: globalMessaging.publish,
  subscribe: globalMessaging.subscribe
};

