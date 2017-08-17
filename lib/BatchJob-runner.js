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
const QUERY_OPTIONS = {ignoreAutoScope: true, fetchAllScopes: true};

module.exports.init = function init() {
  console.log('schedual-runner - init');
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
  console.log('schedual-runner - init channel');
  connection.createChannel(function (err, ch) {
    if (err) {
      log.debug(log.defaultContext(), 'Error in initiating channel');
      log.debug(log.defaultContext(), err);
      return setTimeout(initChannel, 1000, connection);
    }
    ch.assertQueue(queue, {durable: true});
    subscribe(ch);
  });
};

var subscribe = (channel) => {
  console.log('schedual-runner - subscribe');
  channel.consume(queue, (msg) => {
    console.log('scheduler runner recived : ' + msg.content.toString());
    processMsg(msg);
  }, {noAck: true});
};

var processMsg = (msg) => {
  var type = msg.type.toLowerCase();

  switch (type) {
    case 'model':
      var Model = loopback.getModel(msg.fetchingModel.name);
      var query = msg.fetchingModel.query;
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

var handleModel = (msg, Model, query) => {
  Model.find(query, QUERY_OPTIONS, (err, results) => {
    if (err) {
      log.debug(log.defaultContext(), 'error in fetching model ' + Model.name + '. BatchJob is canceld');
      return;
    }
    processRecords(handleModel, results);
    if (results.length === QUERY_LIMIT) {
      // update lowwer bond 
      handleModel(msg, Model, query);
    } else if (results.length < QUERY_LIMIT) {
      console.log('finished fetching records');
      processResults(msg);
    }
  });
};

var processFile = (msg) => {

};

var processRecords = (msg, records) => {
  var processModel = msg.processingModel;
  var Model = loopback.getModel(processModel.name);

  async.each(records, (record, callback) => {
    Model[processModel.function](record);
    callback();
  }, (err) => {
    if (err) {
      log.debug(log.defaultContext, 'Error During Batch Job');
    }
    processResults(msg);
  });
};

var processResults = (msg) => {
  var resultsModel = msg.resultsModel;
  var Model = loopback.getModel(resultsModel.name);
  Model[resultsModel.function]();
};
