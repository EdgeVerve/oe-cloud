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

module.exports = function (DecisionGraph) {
  DecisionGraph.observe('before save', function DecisionGraphBeforeSaveFn(
    ctx,
    next
  ) {
    var dataObj = ctx.instance || ctx.data;
    var document = ctx.options.graphDocument;
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
