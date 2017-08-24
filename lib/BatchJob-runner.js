var loopback = require('loopback');
var logger = require('oe-logger');
var log = logger('scheduler-runner');
var async = require('async');

// run docker wrapped rabbitmq locally
// docker pull rabbitmq:3.6.10-management
// docker run -d  --name rabbitmq -p 8080:15672 -p 5762:5672 rabbitmq:3-management

const rabbitUrl = 'amqp://' + (process.env.RABBITMQ_HOSTNAME || 'localhost');
const amqp = require('amqplib/callback_api');
const queue = 'scheduler';
const QUERY_LIMIT = 500;

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
    console.log('scheduler runner recived : ' + msg.content.toString());
    processMsg(msg);
  }, {noAck: true});
};

var processMsg = (msg) => {
  var type = msg.jobType.toLowerCase();

  switch (type) {
    case 'model':
      var Model = loopback.getModel(msg.fetchModelName, msg.options);
      var query = msg.fetchQuery;
      // set lower bond
      /* if (query.limit === 'undefined' || query.limit === null) query.limit = QUERY_LIMIT;
      if (query.order === 'undefined' || query.order === null ) {
        query.order = [Model.definition.idName() + ' ASC'];
        query.where[Model.definition.idName()] = '';
      } */
      handleModel(msg, Model, query);
      break;

    case 'file':
      processFile(msg);
      break;
    default:
      break;
  }
};
module.exports.processMsg = processMsg;

var handleModel = (msg, Model, query) => {
  Model.find(query, msg.options, (err, results) => {
    if (err) {
      log.error(log.defaultContext(), 'error in fetching model ' + Model.name + '. BatchJob is canceld');
      return;
    }
    processRecords(msg, results);
    // if (results.length === QUERY_LIMIT) {
    //   // update lowwer bond 
    //   handleModel(msg, Model, query);
    // } else if (results.length < QUERY_LIMIT) {
    //   console.log('finished fetching records');
    //   processResults(msg);
    // }
  });
};

var processFile = (msg) => {

};

var processRecords = (msg, records) => {
  var processModel = msg.processEachModelName;
  var Model = loopback.getModel(processModel, msg.options);

  async.each(records, (record, callback) => {
    Model.prototype[msg.processEachFunction](record, msg.options, function (err) {
      if (err) {
        // TODO: monitoring here
        log.error(log.defaultContext(), err);
      }
      callback();
    });
  }, (err) => {
    if (err) {
      log.error(log.defaultContext(), 'Error During Batch Job: ', err);
    }
    processResults(msg);
  });
};

var processResults = (msg) => {
  var resultsModel = msg.generateResultsModelName;
  var Model = loopback.getModel(resultsModel, msg.options);
  Model.prototype[msg.generateResultsFunctionName](msg.options, batchFinish);
};

var batchFinish = (err) => {
  if (err) log.error(log.defaultContext, err);
  log.info(log.defaultContext, 'Bath job finished.');
};
