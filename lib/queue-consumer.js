/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var logger = require('oe-logger');
var log = logger('queue-consumer');
var batchJobRunner = require('../lib/batchJob-runner.js');

// run docker wrapped rabbitmq locally
// docker pull rabbitmq:3.6.10-management
// docker run -d  --name rabbitmq -p 8080:15672 -p 5762:5672 rabbitmq:3-management

const rabbitUrl = 'amqp://' + (process.env.RABBITMQ_HOSTNAME || 'localhost');
const amqp = require('amqplib/callback_api');
const queue = 'scheduler';


module.exports.init = function init() {
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
    ch.assertQueue(queue, {durable: true, maxPriority: 10 });
    subscribe(ch);
  });
};

var subscribe = (channel) => {
  channel.consume(queue, (msg) => {
    msg = JSON.parse(msg.content.toString());
    batchJobRunner.processMsg(msg);
  }, {noAck: true});
};
