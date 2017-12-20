var {WSClient} = require('../../lib/uws-client.js');
module.exports = function (app, cb) {
  var sockethost = process.env.TX_ROUTER_HOST || 'localhost';
  var socketurl = 'ws://' + sockethost + ':3183';
  // var cfg = {url: 'ws://127.0.0.1:8086'};
  var cfg = {url: socketurl};

  var c = new WSClient(cfg);

  c.open(()=>{
    app.set('oe-tx-router', c);
  });
  var remotes = app.remotes();
  var ProxyContext = require('../../lib/proxy-context');
  var methods = {};
  var socket = c;
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
        var str = new Buffer(data.callContextHeader, 'base64').toString('ascii');
        request.callContext = JSON.parse(str);
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
      var err = 'unknown method';
      callback(err, 'ok');
    }
  });

  cb();
};


