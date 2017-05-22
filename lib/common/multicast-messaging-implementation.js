/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var os = require('os');
var logger = require('../logger');
var log = logger('ev-multicast-handler');
var dgram = require('dgram');
var config = require('../../server/config.json');
var EventEmitter = require('events');

var MY_IP = process.env.UDP_SERVER_IP || findIp();
var MULTICAST_IP = config.multicastIP;
var SERVER_PORT = config.multicastServerPort;
var CLIENT_PORT = config.multicastClientPort;
var TIMESLICE = config.mutlicastTimeslice;
// var MAX_ALONE_COUNTER = 10;
var lastEvents = {};
var client;
var server;
var timers = {};
// var aloneCounter = 0;
var emitter = new EventEmitter();

function findIp() {
  var interfaces = os.networkInterfaces();
  var address;
  for (var key in interfaces) {
    if (interfaces.hasOwnProperty(key)) {
      interfaces[key].forEach(chooseInterface);
    }
  }
  function chooseInterface(myInterface) {
    if (myInterface.family === 'IPv4') {
      if (myInterface.address !== '127.0.0.1') {
        address = myInterface.address;
      }
    }
  }
  if (typeof address === 'undefined') {
    address = '127.0.0.1';
  }
  log.debug(log.defaultContext(), 'STARTUP: i choose address: ', address);
  return address;
}

function initServer(cb) {
  server = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  server.bind({ port: SERVER_PORT, address: MY_IP }, function serverBindCbFn() {
    server.setMulticastTTL(128);
    server.addMembership(MULTICAST_IP, MY_IP);
    log.debug(log.defaultContext(), 'STARTUP: UDP server is broadcasting on: ', server.address().address + ':' + server.address().port);
    cb();
  });
  server.on('error', function serverErrorListnerFn(error) {
    log.error(log.defaultContext(), error);
    server.close();
  });
}

function sendEvent(name) {
  var event = {
    name: name,
    version: lastEvents[name]
  };
  var message = new Buffer(JSON.stringify(event));
  log.debug(log.defaultContext(), 'UDP: sending event: ', message.toString());
  try {
    server.send(message, 0, message.length, CLIENT_PORT, MULTICAST_IP);
  } catch (e) {
    log.error(log.defaultContext(), 'sending multicast error', e);
  }
}

function initClient(cb) {
  client = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  client.on('listening', function clientListeningListnerFn() {
    var address = client.address();
    client.setMulticastLoopback(true);
    client.setMulticastTTL(128);
    client.addMembership(MULTICAST_IP, MY_IP);
    log.debug(log.defaultContext(), 'STARTUP: UDP Client listening on ' + address.address + ':' + address.port);
    cb();
  });

  client.on('message', function clientMessageListnerFn(message, remote) {
    message = JSON.parse(message);
    log.debug(log.defaultContext(), 'UDP: Received udp message: ', message, ' from remote: ', JSON.stringify(remote));
    setTimeslice(false, message.name);
    if (message.version !== lastEvents[message.name]) {
      log.debug(log.defaultContext(), 'got a new event for: ', message.name, ' with version: ', message.version);
      lastEvents[message.name] = message.version;
      emitter.emit(message.name, message.version);
    }
    // TODO if we only hear ourselves a set amount of times we need to trigger all events(?) and log error(?)
    // if (remote.address === MY_IP) {
    //   aloneCounter++;
    //   // if (aloneCounter > MAX_ALONE_COUNTER) {
    //   //     log.error('This node has no connectivity to other nodes in the cluster');
    //   // }
    // } else {
    //   aloneCounter = 0;
    // }
  });

  client.on('error', function clientErrorListnerFn(e) {
    log.error(log.defaultContext(), e);
    client.close();
  });
  client.bind({ port: CLIENT_PORT });
}

// clear previous timeout and set a new one
function setTimeslice(forNewEvent, name) {
  log.debug(log.defaultContext(), 'TIMEOUT: setting timeout for: ' + (forNewEvent ? 'new event' : 'regular interval'), ' name: ', name);
  if (timers[name]) {
    clearTimeout(timers[name]);
  }
  timers[name] = setTimeout(sendEvent, getTimeslice(forNewEvent), name);
}

function getTimeslice(forNewEvent) {
  // we want to ensure new events get sent before the scheduled multicast
  if (forNewEvent) {
    return TIMESLICE / 2;
  }
  // this way we get a random delay between TIMESLICE-0.1*TIMESLICE to TIMESLICE+0.1*TIMESLICE
  return TIMESLICE * (1 + Math.random() * 0.2 - 0.1);
}

function init(cb) {
  initServer(function initServerFn() {
    initClient(function initClientFn() {
      log.debug(log.defaultContext(), 'STARTUP: finished ev-multicast-handler init');
      if (typeof cb === 'function') {
        cb();
      }
    });
  });
}

function emit(name, version) {
  log.debug(log.defaultContext(), 'Emitting event: ', name, 'with version: ', version);
  lastEvents[name] = version;
  setTimeslice(true, name);
}

function on(name, cb) {
  if (typeof cb !== 'function') {
    return Error('cb has to be a function');
  }
  log.debug(log.defaultContext(), 'Event: ', name, ' handler registered');
  emitter.on(name, function eventEmmiterHandlerFn(version) {
    log.debug(log.defaultContext(), 'Event: Calling handler for event: ', name);
    cb(version);
  });
}

module.exports = {
  init: init,
  subscribe: on,
  publish: emit
};
