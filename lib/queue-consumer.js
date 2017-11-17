/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var logger = require('oe-logger');
var log = logger('queue-consumer');
var batchJobRunner = require('../lib/batchJob-runner.js');
var emitter;
var consumerTag = null;
var subscribed = false;

// run docker wrapped rabbitmq locally
// docker pull rabbitmq:3.6.10-management
// docker run -d  --name rabbitmq -p 8080:15672 -p 5672:5672 rabbitmq:3-management
// docker rm rabbitmq

const rabbitUrl = 'amqp://' + (process.env.RABBITMQ_HOSTNAME || 'localhost');
const amqp = require('amqplib/callback_api');
const queue = 'scheduler';
var channel;

module.exports.init = function init(eventEmitter) {
  emitter = eventEmitter;
  emitter.on('SERVER_LOAD_LOW', subscribe);
  emitter.on('SERVER_LOAD_MEDIUM', unsubscribe);
  emitter.on('SERVER_LOAD_HIGH', unsubscribe);
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
      return setTimeout(initChannel, 1000, connection);
    }
    ch.assertQueue(queue, {durable: true, maxPriority: 10, noAck: false});

    // Limit number of unacknowlaged_messages => process one msg at a time
    ch.prefetch(1);

    channel = ch;
    log.info(log.defaultContext, 'Initiated channel to Queue for BatchJob tasks.');
    subscribe();
  });
};

var subscribe = function () {
  if (subscribed === true) return;
  if (!channel) return;
  subscribed = true;
  log.info(log.defaultContext, 'Subscribed to BatchJob tasks queue.');
  channel.consume(queue, (msgBuffer) => {
    var msgStr = msgBuffer.content.toString();
    var msg = JSON.parse(msgStr);
    batchJobRunner.processMsg(msg, () => {if (channel && subscribed === true) channel.ack(msgBuffer);});
  }, {noAck: false}, function (err, ok) {
    if (err) {
      log.error(log.defaultContext, 'Error when trying to subscribe to schduler queue: ' + err.message);
      subscribed = false;
      return setTimeout(subscribe, 50);
    }
    consumerTag = ok.consumerTag;
  });
};

var unsubscribe =  function () {
  if (subscribed === false) return;
  if (!channel) return;
  if (consumerTag ===  null) return setTimeout(unsubscribe, 50);
  log.info(log.defaultContext, 'Unsubscribed to BatchJob tasks queue. consumerTag: ' + consumerTag);
  channel.cancel(consumerTag, (err, ok) => {
    if (err) {
      log.error(log.defaultContext, 'Error in Unsubscribeing to scheduler queue: ' + err.message);
      return setTimeout(unsubscribe, 50);
    }
    subscribed = false;
  });
};
