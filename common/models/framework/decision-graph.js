/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var XLSX = require('xlsx');
var jsFeel = require('js-feel')();
var DL = jsFeel.decisionLogic;
var logger = require('oe-logger');
var log = logger('decision-graph');
var serialize = require('serialize-error');

var { createDecisionGraphAST, executeDecisionService } = jsFeel.decisionService;


module.exports = function (DecisionGraph) {
// Remote method to execute a Decision Service with data POSTed from the Rule Designer
  DecisionGraph.remoteMethod('execute', {
    description: 'Executes a Decision Service Payload Posted from the Rule Designer',
    accessType: 'WRITE',
    isStatic: true,
    accepts: [{ arg: 'inputData', type: 'object', http: { source: 'body' },
      required: true, description: 'The JSON containing the graph data and payload to execute' }
    ],
    http: {
      verb: 'POST',
      path: '/execute'
    },
    returns: {
      type: 'object',
      root: true
    }
  });

  // Executes a Decision Service with data POSTed from the Rule Designer
  DecisionGraph.execute = function (inputData, options, cb) {
    var decisionMap = inputData.jsonFeel;
    var decisions = inputData.decisions;
    var payload = inputData.payload;

    var ast = createDecisionGraphAST(decisionMap);

    var promises = decisions.map(d => executeDecisionService(ast, d, payload));

    Promise.all(promises).then(answers => {
      cb(null, answers);
    }).catch(err => {
      log.error(err);
      cb(serialize(err), null);
    });
  };

  DecisionGraph.observe('before save', function DecisionGraphBeforeSaveFn(
    ctx,
    next
  ) {
    var dataObj = ctx.instance || ctx.data;
    var document = ctx.options.graphDocument;
    if (!document) return next();
    var base64String = document.documentData.split(',')[1];
    // var binaryData = Buffer.from(base64String, 'base64').toString('binary');
    var binaryData = new Buffer(base64String, 'base64').toString('binary');
    var workbook = XLSX.read(binaryData, { type: 'binary' });
    try {
      var jsonFeel = DL.parseWorkbook(workbook);
      dataObj.data = jsonFeel;
      next();
    } catch (e) {
      log.error(ctx.options, 'Unable to process workbook data -', e);
      next(
        new Error(
          'Decision Graph workbook data could not be parsed. Please correct errors in the workbook.'
        )
      );
    }
  });
};
