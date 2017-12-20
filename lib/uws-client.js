const EventEmitter = require('events');
const WebSocket = require('uws');
const log = require('oe-logger')('tx-router-client');

var msgNum = 1;
var callbackFns = {};

class WSClient extends EventEmitter {
  constructor(cfg) {
    super();
    this._cfg = cfg;
  }

  open(cb) {
    var self = this;
    setInterval(function reconnect() {
      if (!self._ws.readyState) {
        self.connect( () => {

        });
      }
    }, 5000);
    self.connect(cb);
  }

  transieve(msg, cb) {
    var msgToBeSent = {msgNum, msg, type: 'request'};
    callbackFns[msgNum++] = cb;
    this._ws.send(JSON.stringify(msgToBeSent));
  }

  connect(cb) {
    var self = this;
    this._ws = new WebSocket(this._cfg.url);
    this._ws.on('open', function () {
      log.info('Connected to tx-router');
      cb();
    });
    this._ws.on('error', () => log.error);
    this._ws.on('close', function (reason) {
      log.info('connection to tx-router closed');
    });
    this.on('processed', function (data) {
      data.type = 'processed';
      self._ws.send(JSON.stringify(data));
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
