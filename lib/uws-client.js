/**
*
* ©2016-2018 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
* Bangalore, India. All Rights Reserved.
*
*/

const EventEmitter = require('events');
const WebSocket = require('uws');
const log = require('oe-logger')('tx-router-client');
const uuid = require('uuid');

var msgNum = 1;
var callbackFns = {};

class WSClient extends EventEmitter {
  constructor(cfg) {
    super();
    this._cfg = cfg;
    this.connected = false;
    this.clientId = uuid.v4();
    var self = this;
    setInterval(function reconnect() {
      if (!self._ws.readyState) {
        self.connect( () => {

        });
      }
    }, 5000);
    this.on('processed', function (data) {
      data.type = 'processed';
      self._ws.send(JSON.stringify(data));
    });
    self.connect();
  }

  transieve(msg, cb) {
    var clientId = this.clientId;
    var msgToBeSent = {msgNum, clientId, msg, type: 'request'};
    callbackFns[msgNum++] = cb;
    this._ws.send(JSON.stringify(msgToBeSent));
  }

  connect() {
    var self = this;
    this._ws = new WebSocket(this._cfg.url);
    this._ws.on('open', function () {
      self.connected = true;
      log.info('Connected to tx-router');
      var data = {type: 'register', clientId: self.clientId};
      this.send(JSON.stringify(data), ()=>{
        self.emit('open');
      });
    });
    this._ws.on('error', () => log.error);
    this._ws.on('close', function (reason) {
      self.connected = false;
      log.info('connection to tx-router closed');
      self.emit('close');
    });
    this._ws.on('message', (strdata) => {
      var data = JSON.parse(strdata);
      switch (data.type) {
        case 'process': {
          this.emit('process', data);
          break;
        }
        case 'response': {
          if (data.msgNum  && callbackFns[data.msgNum]) {
            callbackFns[data.msgNum](data.msg);
            delete callbackFns[data.msgNum];
          }
          break;
        }
        default:
          log.error('Invalid data type received', data.type, 'is not valid');
          break;
      }
    });
  }
}

exports.WSClient = WSClient;
