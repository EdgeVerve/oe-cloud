/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

var XLSX = require('xlsx');
var jsFeel = require('js-feel').decisionTable;
var request = require('request');
var utils = require('../../../lib/common/util');
var assert = require('assert');
var loopback = require('loopback');
const delimiter = '&SP';

module.exports = function decisionTableFn(decisionTable) {
  function droolsUrl() {
    var droolsHost = process.env.DROOLS_HOST || 'localhost';
    var droolsPort = process.env.DROOLS_PORT || '8080';
    return 'http://' + droolsHost + ':' + droolsPort + '/evdrools';
  }
  decisionTable.observe('before save', function decisionTableBeforeSave(ctx, next) {
    var businessRuleEngine = 'evBusinessRule';
    var document = ctx.options.document;
    if (document) {
      var SystemModel = loopback.getModel('SystemConfig');
      SystemModel.find({
        'where': {
          'key': 'businessRuleEngine'
        }
      }, ctx.options, function decisionTableBeforeSaveCb(err, configData) {
        if (err) {
          next(err);
        }
        if (configData.length) {
          businessRuleEngine = configData[0].value.engine;
        }
        if (businessRuleEngine === 'DROOLS') {
          var url = droolsUrl();
          var path = 'validate';
          var reqOptions = {
            method: 'POST',
            url: url + '/' + path,
            headers: {
              'content-type': 'application/json'
            },
            body: document,
            json: true
          };
          request(reqOptions, function requestFn(error, response, body) {
            if (error) {
              return next(error);
            }
            if (body.message === 'valid') {
              next();
            } else {
              var err = new Error(JSON.stringify(body.info));
              err.retriable = false;
              return next(err);
            }
          });
        } else {
          try {
            // Code to handle files for jsFEEL
            var base64String = document.documentData.split(',')[1];
            // var base64String = ctx.instance.documentData.replace('data:' + ctx.instance.fileType + ';base64,', '');
            // The following usage of new Buffer() is deprecated from node v6.0
            var binaryData = new Buffer(base64String, 'base64').toString('binary');
            var workbook = XLSX.read(binaryData, {
              type: 'binary'
            });
            var sheet = workbook.Sheets[workbook.SheetNames[0]];
            var csv = XLSX.utils.sheet_to_csv(sheet, { 'FS': delimiter });
            var decisionRules = jsFeel.csv_to_decision_table(csv);

            var data = ctx.instance || ctx.data;
            data.decisionRules = JSON.stringify(decisionRules);
            next();
          } catch (err) {
            return next(err);
          }
        }
      });
    } else {
      next();
    }
  });

  decisionTable.remoteMethod('exec', {
    description: 'execute a business rule',
    accessType: 'WRITE',
    accepts: [{
      arg: 'documentName',
      type: 'string',
      required: true,
      http: {
        source: 'path'
      },
      description: 'Name of the Document to be fetched from db for rule engine'
    }, {
      arg: 'data',
      type: 'object',
      required: true,
      http: {
        source: 'body'
      },
      description: 'An object on which business rules should be applied'
    }],
    http: {
      verb: 'post',
      path: '/exec/:documentName'
    },
    returns: {
      arg: 'data',
      type: 'object',
      root: true
    }
  });

  decisionTable.exec = function decisionTableExec(documentName, data, options, callback) {
    var businessRuleEngine = 'evBusinessRule';
    if (typeof callback === 'undefined') {
      if (typeof options === 'function') {
        // execrule (documentName, data, callback)
        callback = options;
        options = {};
      }
    }

    data = data || {};
    options = options || {};
    callback = callback || utils.createPromiseCallback();

    assert(typeof documentName === 'string', 'The documentName argument must be string');
    assert(typeof data === 'object', 'The data argument must be an object or array');
    assert(typeof options === 'object', 'The options argument must be an object');
    assert(typeof callback === 'function', 'The callback argument must be a function');

    decisionTable.find({
      'where': {
        'name': documentName
      }
    }, options, function decisionTableFind(err, decisionTableData) {
      if (err) {
        callback(err);
      } else if (decisionTableData.length) {
        var SystemModel = loopback.getModel('SystemConfig');
        SystemModel.find({
          'where': {
            'key': 'businessRuleEngine'
          }
        }, options, function systemModelFind(err, configData) {
          if (err) {
            callback(err);
          } else if (configData.length) {
            businessRuleEngine = configData[0].value.engine;
          }
          var docId = decisionTableData[0].documentId;
          if (businessRuleEngine === 'DROOLS') {
            var path = 'execrule';
            var url = droolsUrl();
            // Request module
            var reqOptions = {
              method: 'POST',
              url: url + '/' + path + '/' + docId,
              headers: {
                'content-type': 'application/json'
              },
              body: data,
              json: true
            };
            request(reqOptions, function requestCallback(error, response, body) {
              if (error) {
                callback(error, null);
              } else {
                callback(null, body);
              }
            });
          } else {
            jsFeel.execute_decision_table(docId, JSON.parse(decisionTableData[0].decisionRules), data, function ExecuteDecisionTable(results) {
              data = processPayload(results, data);
              callback(null, data);
            });
          }
        });
      } else {
        var err1 = new Error('No Document found for DocumentName ' + documentName);
        err1.retriable = false;
        callback(err1);
      }
    });
  };
};

function processPayload(results, payload) {
  var deltaPayload = {};
  if (Array.isArray(results)) {
    results.forEach(function resultsForEach(rowObj) {
      Object.keys(rowObj).forEach(function rowObjectsForEachKey(key) {
        if (results.length > 1) {
          deltaPayload[key] = deltaPayload[key] || [];
          deltaPayload[key].push(rowObj[key]);
        } else {
          deltaPayload[key] = deltaPayload[key] || {};
          deltaPayload[key] = rowObj[key];
        }
      });
    });
  } else {
    deltaPayload = results || {};
  }

  Object.keys(deltaPayload).forEach(function deltaPayloadForEachKey(k) {
    payload[k] = deltaPayload[k];
  });
  return payload;
}
