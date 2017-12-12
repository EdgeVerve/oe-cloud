const EventEmitter = require('events');
const WebSocket = require('uws');

var msgNum = 1;
var callbackFns = {};

class WSClient extends EventEmitter {
  constructor(cfg) {
    super();
    this._cfg = cfg;
  }

  open(cb) {
    this._ws = new WebSocket(this._cfg.url);
    this._ws.on('open', function () {
      cb();
    });
    this.on('processed', function (data) {
      var ws = data.ws;
      delete data.ws;
      data.type = 'processed';
      ws.send(JSON.stringify(data));
    });
    this._ws.on('message', (strdata) => {
      var data = JSON.parse(strdata);
      switch (data.type) {
        case 'process': {
          data.ws = this._ws;
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
	  console.error('Invalid data type received', data.type, 'is not valid');
          break;
      }
    });
  }
  transieve(msg, cb) {
    var msgToBeSent = {msgNum, msg, type: 'request'};
    callbackFns[msgNum++] = cb;
    this._ws.send(JSON.stringify(msgToBeSent));
  }
}

exports.WSClient = WSClient;
