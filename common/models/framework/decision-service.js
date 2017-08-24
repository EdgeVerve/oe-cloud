var XLSX = require('xlsx');
var DL = require('js-feel').decisionLogic;
var logger = require('oe-logger');
var log = logger('decision-service');

module.exports = function(DecisionService) {
  DecisionService.remoteMethod('invoke', {
    description: 'Invoke service with name and payload',
    accepts: [
      {
        arg: 'name',
        type: 'string',
        description: 'service name',
        http: {
          source: 'path'
        },
        required: true,
        description: 'name of the service'
      },
      {
        arg: 'payload',
        type: 'object',
        description: 'the payload for this decision service',
        http: {
          source: 'body'
        },
        required: true
      }
    ],
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    },
    http: {
      verb: 'POST',
      path: '/invoke/:name'
    }
  });

  DecisionService.invoke = function DecisionServiceInvoke(name, payload, options, cb) {
    setTimeout(function(){
      cb(null, { response: { name, payload }});
    })
  }
}