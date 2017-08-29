var XLSX = require('xlsx');
var DL = require('js-feel').decisionLogic;
var logger = require('oe-logger');
var log = logger('decision-graph');

module.exports = function(DecisionGraph) {
  DecisionGraph.observe('before save', function DecisionGraphBeforeSaveFn(ctx, next) {
    var dataObj = ctx.instance || ctx.data;
    var base64String = dataObj.file.split(',')[1];
    // var binaryData = Buffer.from(base64String, 'base64').toString('binary');
    var binaryData = new Buffer(base64String, 'base64').toString('binary');
    var workbook = XLSX.read(binaryData, { type: 'binary'});
    try {
      var jsonFeel = DL.parseWorkbook(workbook);
      dataObj.data = jsonFeel;
      next();
    }
    catch(e){
      log.error(ctx.options, 'Unable to process workbook data -', e);
      next(new Error('Decision Graph workbook data could not be parsed. Please correct errors in the workbook.'));
    }
  });
}