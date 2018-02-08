/**
*
* ©2016-2018 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
* Bangalore, India. All Rights Reserved.
*
*/

var {WSClient} = require('../../lib/uws-client.js');
var config = require('../config.js');
var DB_LOCK_MODE = config.dbLockMode;
module.exports = function (app, cb) {
  var sockethost = process.env.TX_ROUTER_HOST || 'localhost';
  var socketurl = 'ws://' + sockethost + ':3183';
  // var cfg = {url: 'ws://127.0.0.1:8086'};
  var cfg = {url: socketurl};

  var socket = new WSClient(cfg);

  socket.on('open', ()=>{
    app.set('oe-tx-router', socket);
  });
  socket.on('close', ()=>{
    app.set('oe-tx-router', null);
  });
  var remotes = app.remotes();
  var ProxyContext = require('../../lib/proxy-context');
  var methods = {};
  socket.on('process', function (adata) {
    // var data = adata.data;
    var data = adata.msg;
    var err = adata.err;
    var callback = function (err, result) {
      adata.msg = {error: err, result: result};
      socket.emit('processed', adata);
    };
    if (err) {
      return callback(err);
    }
    var method = methods[data.fullMethodName];
    if (!method) {
      method = remotes.findMethod(data.fullMethodName);
      if (method) {
        methods[data.fullMethodName] = method;
      }
    }
    if (method) {
      var request = {
        callContext: {
          tenantId: 'default',
          ctx: { tenantId: 'default'}
        },
        method: 'GET'
      };
      if (data.callContextHeader) {
        request.callContext = data.callContextHeader;
      }
      if (data.lock) {
        request.callContext.lockMode = DB_LOCK_MODE;
        global.setDBLockMode();
      }
      request.callContext.evproxyModelPlural = data.modelPlural;
      request.callContext.evproxyModelId = data.id;
      var ctx = new ProxyContext(request, data.ctorArgs, data.args);
      ctx.method = method;
      if (method.isStatic) {
        ctx.invoke(method.ctor, method, function (err, result) {
          if (err) return callback(err);
          ctx.result = result;
          callback(err, ctx.result);
        });
      } else {
        ctx.invoke(method.ctor, method.sharedCtor, function (err, inst) {
          if (err) return callback(err);
          ctx.invoke(inst, method, function (err, result) {
            if (err) return callback(err);
            ctx.result = result;
            callback(err, ctx.result);
          });
        });
      }
    } else {
      err = 'unknown method';
      callback(err, 'ok');
    }
  });

  cb();
};


