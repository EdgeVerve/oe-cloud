var logger = require('oe-logger');
var log = logger('queue-consumer');
// var batchJobRunner = require('../lib/batchJob-runner.js');
var emitter;
var consumerTag = null;
var subscribed;


// run docker wrapped rabbitmq locally
// docker pull rabbitmq:3.6.10-management
// docker run -d  --name rabbitmq -p 8080:15672 -p 5672:5672 rabbitmq:3-management

const rabbitUrl = 'amqp://' + (process.env.RABBITMQ_HOSTNAME || 'localhost');
const amqp = require('amqplib/callback_api');
const queue = 'scheduler';
var channel;

module.exports.init = function init(eventEmitter) {
  emitter = eventEmitter;
  emitter.on('server_load_60%', subscribe);
  emitter.on('server_load_40%', unsubscribe);
  subscribed = false;

  amqp.connect(rabbitUrl, function (err, conn) {
    if (err) {
      log.debug(log.defaultContext(), 'Error in connecting to rabbit url: ' + rabbitUrl);
      log.debug(log.defaultContext(), err);
      return setTimeout(init, 1000);
    }
    initChannel(conn);
  });
};


var initChannel = (connection) => {
  connection.createChannel(function (err, ch) {
    if (err) {
      log.debug(log.defaultContext(), 'Error in initiating channel');
      log.debug(log.defaultContext(), err);
      return setTimeout(initChannel, 1000, connection);
    }
    ch.assertQueue(queue, {durable: true});
    // ch.assertQueue(queue, {durable: true, maxPriority: 10});
    channel = ch;
    subscribe();
  });
};

var subscribe = function () {
  if (subscribed) return;
  console.log('subscribed');
  channel.consume(queue, (msg) => {
    console.log('Recieved Message : ' + msg.content.toString() );
    // batchJobRunner.processMsg(msg);
  }, {noAck: true}, function (err, ok) {
    if (err) console.log(err.message);
    subscribed = true;
    consumerTag = ok.consumerTag;
    console.log(consumerTag);
  });
};

var unsubscribe =  function () {
  console.log('unsubscribe');
  console.log(consumerTag);
  channel.cancel(consumerTag, (err, ok) => {
    console.log(ok);
    subscribed = false;
    // if (res !== 'cancel_ok') setTimeout(unsubscribe, 500);
  });
};
