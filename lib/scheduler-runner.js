// var loopback = require('loopback');
// var async = require('async');

// run docker wrapped rabbitmq locally
// docker pull rabbitmq:3.6.10-management
// docker run -d  --name rabbitmq -p 8080:15672 -p 5762:5672 rabbitmq:3-management

const rabbitUrl = 'amqp://' + (process.env.RABBITMQ_HOSTNAME || 'localhost');
const amqp = require('amqplib/callback_api');
const queue = 'scheduler';


module.exports.init = function init() {
  console.log("schedual-runner - init");
  amqp.connect(rabbitUrl, function (err, conn) {
    if (err) {
      console.log('Error in connecting to rabbit url: ' + rabbitUrl);
      console.log(err);
      return setTimeout(init, 1000);
    }
    initChannel(conn);
  });
};

var initChannel = (connection) => {
  console.log("schedual-runner - init channel");
  connection.createChannel(function (err, ch) {
    if (err) {
      console.log('Error in initiating channel');
      console.log(err);
      return setTimeout(initChannel, 1000, connection);
    }
    ch.assertQueue(queue, {durable: true});
    subscribe(ch);
  });
};

var subscribe = (channel) => {
  console.log("schedual-runner - subscribe");
  channel.consume(queue, (msg) => {
    //console.log(' [x] Received %s', msg.content.toString());
    console.log("scheduler runner recived : " + msg.content.toString());
  }, {noAck: true});
};
