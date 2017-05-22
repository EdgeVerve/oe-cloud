/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var mqtt = require('mqtt');
var app = require('../../server/server.js').app;
var process = require('process');
var os = require('os');
var mqttOptions = app.get('mqttOptions');

var logger = require('../logger');
var log = logger('util');

var client = mqtt.connect(mqttOptions);
var clientId = os.hostname() + '.' + process.pid;

module.exports = {
  init: init,
  publish: publish,
  subscribe: subscribe
};

client.on('connect', function clientConnectListnerFn() {
  log.info(log.defaultContext(), 'Connected to MQTT broker');
});

client.on('error', function clientErrorListnerFn(error) {
  log.info(log.defaultContext(), 'Error connecting to MQTT broker ', error);
});

client.on('offline', function clientOfflineListnerFn() {
  log.info(log.defaultContext(), 'MQTT broker is offline');
});

client.on('reconnect', function clientReconnectListnerFn() {
  log.debug(log.defaultContext(), 'Reconnecting to MQTT broker');
});

function init() {
  // TODO implement this
  Function.prototype();
}

function publish(topic, msg) {
  if (client) {
    msg.clientId = clientId;
    client.publish(topic, JSON.stringify(msg));
  }
}

function subscribe(topicToSubscribe, listenToSelf, cb) {
  if (client) {
    client.subscribe(topicToSubscribe);
    client.on('message', function clientMessageListnerFn(topicOfMsg, message) {
      var msgObj = JSON.parse(message);
      if (topicToSubscribe === topicOfMsg && (listenToSelf || msgObj.clientId !== clientId)) {
        cb(msgObj);
      }
    });
  }
}
