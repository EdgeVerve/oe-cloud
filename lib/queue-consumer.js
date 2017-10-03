var logger = require('oe-logger');
var log = logger('queue-consumer');
var batchJobRunner = require('../lib/batchJob-runner.js');
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
  emitter.on('SERVER_LOAD_LOW', subscribe);
  emitter.on('SERVER_LOAD_MEDIUM', unsubscribe);
  emitter.on('SERVER_LOAD_HIGH', unsubscribe);
  subscribed = false;
  connectAmqp();
};

var connectAmqp = () => {
  amqp.connect(rabbitUrl, function (err, conn) {
    if (err) {
      log.debug(log.defaultContext(), 'Error in connecting to rabbit url: ' + rabbitUrl);
      log.debug(log.defaultContext(), err);
      return setTimeout(connectAmqp, 1000);
    }
    initChannel(conn);
  });
};

var initChannel = (connection) => {
  connection.createChannel(function (err, ch) {
    if (err) {
      log.error(log.defaultContext(), 'Error in initiating channel: ' + err.message);
      // log.error(log.defaultContext(), err);
      return setTimeout(initChannel, 1000, connection);
    }
    ch.assertQueue(queue, {durable: true});
    // ch.assertQueue(queue, {durable: true, maxPriority: 10});
    channel = ch;
    log.info(log.defaultContext, 'Initiated channel to Queue for BatchJob tasks.');
    subscribe();
  });
};

var subscribe = function () {
  if (subscribed) return;
  if (!channel) return;
  log.info(log.defaultContext, 'Subscribed to BatchJob tasks queue.');
  channel.consume(queue, (msg) => {
    // console.log('Recieved Message : ' + msg.content.toString() );
    batchJobRunner.processMsg(msg);
  }, {noAck: true}, function (err, ok) {
    if (err) log.error(log.defaultContext, err.message);
    subscribed = true;
    consumerTag = ok.consumerTag;
  });
};

var unsubscribe =  function () {
  if (!subscribed) return;
  if (!channel) return;
  log.info(log.defaultContext, 'Unsubscribed to BatchJob tasks queue.');
  channel.cancel(consumerTag, (err, ok) => {
    if (err) setTimeout(unsubscribe, 500);
    else {
      subscribed = false;
    }
  });
};
