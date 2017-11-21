/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries.
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/

var WebSocket = require('ws');
var process = require('process');
var dns = require('dns');

var logger = require('oe-logger');
var log = logger('broadcaster-client');
var EventEmitter = require('events');

// var clientId = os.hostname() + '.' + process.pid;
var emitter = new EventEmitter();

module.exports = {
  init: init,
  publish: publish,
  recoveryFail: recoveryFail,
  recoverySuccess: recoverySuccess,
  subscribe: subscribe,
  eventEmitter: emitter,
  getUseBroadcaster: getUseBroadcaster
};

var readyState = {};
readyState.CONNECTING = 0;
readyState.OPEN = 1;
readyState.CLOSING = 2;
readyState.CLOSED = 3;

const REGISTER_NODE = 'A';
const PUBLISH = 'B';
const RECOVERY_SUCCESS = 'D';
const RECOVERY_FAIL = 'E';
// const ROUTER_SERVICE_REGISTER = 'C';  used in router Service

const HEART_BEAT_INTERVAL = process.env.HEART_BEAT_INTERVAL || 6000;
var timer;

var pendingData = [];
var ws;

var broadcasterHost = process.env.BROADCASTER_HOST || 'localhost';
var portNumber = process.env.BROADCASTER_PORT || 2345;

var useBroadcaster = null;
var orchestrator = process.env.ORCHESTRATOR;

function getUseBroadcaster() {
  if (useBroadcaster !== null) return useBroadcaster;

  useBroadcaster = false;
  var str = process.env.USE_BROADCASTER;
  if (orchestrator || str) {
    useBroadcaster = true;
  }

  if (str === 'false') {
    useBroadcaster = false;
  }

  if (useBroadcaster) {
    log.info(log.defaultContext(), 'Using broadcaster host ', broadcasterHost, ' port ', portNumber);
  }
  return useBroadcaster;
}


function trySend() {
  if (ws && ws.readyState === readyState.OPEN) {
    if (pendingData.length > 0) {
      var data = pendingData.shift();
      try {
        ws.send(data, function () {
          if (pendingData.length > 0) {
            process.nextTick(function () {
              trySend();
            });
          }
        });
      } catch (ex) {
        pendingData.unshft(data);
        setTimeout(trySend, 3000);
      }
    }
  } else if (!ws) {
    if (getUseBroadcaster()) {
      init();
    }
  }
}

function setPingTimer() {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(function () {
    if (ws) {
      ws.terminate();
    } else {
      log.info(log.defaultContext(), ' No  WebSocket to terminate');
    }
    ws = null;
    log.info(log.defaultContext(), 'heart beat not recieved, trying to reconnect!');
  }, HEART_BEAT_INTERVAL);
}

function init() {
  if (ws || !getUseBroadcaster()) {
    return;
  }
  if (timer) {
    clearTimeout(timer);
  }
  ws = new WebSocket('ws://' + broadcasterHost + ':' + portNumber, {
    perMessageDeflate: false
  });

  ws.on('open', function open() {
    log.info(log.defaultContext(), 'connection opened to broadcaster call register node');
    registerNode();
    setPingTimer();
  });

  ws.on('close', function () {
    log.info(log.defaultContext(), 'connection closed to broadcaster');
    // if broadcaster itself goes down, no need to check ping
    if (timer) {
      clearTimeout(timer);
    }
    ws = null;
    if (getUseBroadcaster()) {
      setTimeout(init, 3000);
    }
  });

  ws.on('message', function (buf) {
    var data = JSON.parse(buf);
    process.nextTick(function () {
      emitter.emit(data.topic, data.msg, data.context);
    });
  });

  ws.on('error', function (e) {
    if (e.code === 'ECONNREFUSED') {
      log.error(log.defaultContext(), 'could not connect to broadcaster service');
    } else {
      log.error(log.defaultContext(), 'broadcaster client error ', e);
    }
    if (timer) {
      clearTimeout(timer);
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    if (getUseBroadcaster()) {
      setTimeout(init, 3000);
    }
  });

  ws.on('ping', function () {
    log.debug(log.defaultContext(), 'ping recieved from server');
    setPingTimer();
  });
}

function publish(topic, msg, context) {
  if (!ws) {
    init();
  }
  var data = {
    topic: topic,
    msg: msg,
    context: context
  };
  var bufferString = PUBLISH + JSON.stringify(data);
  var buf = Buffer.from(bufferString);
  pendingData.push(buf);
  trySend();
}

function recoverySuccess(hostName) {
  var bufferString = RECOVERY_SUCCESS + JSON.stringify(hostName);
  var buf = Buffer.from(bufferString);
  pendingData.push(buf);
  trySend();
}

function recoveryFail(hostName) {
  var bufferString = RECOVERY_FAIL + JSON.stringify(hostName);
  var buf = Buffer.from(bufferString);
  pendingData.push(buf);
  trySend();
}

function subscribe(topic, cb) {
  emitter.on(topic, function (message, context) {
    cb(message, context);
  });
}

function registerNode() {
  var nodeDetails = {};

  switch (orchestrator) {
    case 'PCF': break;
    case 'OpenShift': break;
    case 'dockerSwarm':
      // docker swarm
      nodeDetails.port = process.env.SERVICE_PORT || process.env.PORT;
      nodeDetails.hostname = process.env.HOSTNAME;
      nodeDetails.serviceName = process.env.SERVICE_NAME;
      log.info(log.defaultContext(), 'trying to get IP');
      getIP(function (err, ip) {
        if (err) {
          log.error(log.defaultContext(), 'error in broadcast client getIP ', err);
          trySend();
        }
        nodeDetails.ip = ip;
        var bufferString = REGISTER_NODE + JSON.stringify(nodeDetails);
        var buf = Buffer.from(bufferString);
        log.info(log.defaultContext(), 'broadcaster register details: ', nodeDetails);
        pendingData.push(buf);
        trySend();
      });
      break;
    default :
      // for dev testing use 127.0.0.1
      nodeDetails.port = process.env.SERVICE_PORT || process.env.PORT;
      nodeDetails.hostname = process.env.HOSTNAME;
      nodeDetails.serviceName = process.env.SERVICE_NAME;
      nodeDetails.ip = '127.0.0.1';
      var bufferString = REGISTER_NODE + JSON.stringify(nodeDetails);
      var buf = Buffer.from(bufferString);
      log.info(log.defaultContext(), 'broadcaster register details: ', nodeDetails);
      pendingData.push(buf);
      trySend();
      break;
  }
}

function getIP(cb) {
  var os = require('os');
  var routerHost = process.env.ROUTER_HOST || 'router';
  var error;
  dns.lookup(routerHost, {}, function (err, routerIP, family) {
    if (err) {
      cb(err);
    }
    if (family === 6) {
      error = new Error('router service discovery does not support IPV6 yet');
      return cb(error);
    }
    var ipArray = routerIP.split('.');
    ipArray.splice(ipArray.length - 1, 1, '[0-9]{1,3}');
    var matchIP = new RegExp(ipArray.join('\\.'));
    var interfaces = os.networkInterfaces();
    for (var key in interfaces) {
      if (interfaces.hasOwnProperty(key)) {
        var networkInterface = interfaces[key];
        for (var i = 0; i < networkInterface.length; i++) {
          var networkAddress = networkInterface[i];
          var ip = networkAddress.address;
          if (networkAddress.family === 'IPv4' && networkAddress.netmask !== '255.255.255.255' && matchIP.exec(ip) ) {
            return cb(null, ip);
          }
        }
      }
    }
    error = new Error('Router network interface not found');
    cb(error);
  });
}

