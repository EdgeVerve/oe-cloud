/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var XLSX = require('xlsx');
var jsFeel = require('js-feel')();
var request = require('request');
var utils = require('../../../lib/common/util');
var assert = require('assert');
var loopback = require('loopback');
var logger = require('oe-logger');
var log = logger('decision-table');
var getError = require('../../../lib/common/error-utils').getValidationError;
var delimiter = '&SP';

const dTable = jsFeel.decisionTable;

module.exports = function decisionTableFn(decisionTable) {
  function droolsUrl() {
    var droolsHost = process.env.DROOLS_HOST || 'localhost';
    var droolsPort = process.env.DROOLS_PORT || '8080';
    return 'http://' + droolsHost + ':' + droolsPort + '/evdrools';
  }
  decisionTable.observe('before save', function decisionTableBeforeSave(
    ctx,
    next
  ) {
    var businessRuleEngine = 'evBusinessRule';
    var document = ctx.options.document;
    if (document) {
      var SystemModel = loopback.getModel('SystemConfig');
      SystemModel.find(
        {
          where: {
            key: 'businessRuleEngine'
          }
        },
        ctx.options,
        function decisionTableBeforeSaveCb(err, configData) {
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
              if (
                typeof document.documentData !== 'string' ||
                document.documentData.indexOf('base64') < 0
              ) {
                return next(
                  new Error(
                    'Decision table data provided is not a base64 encoded string'
                  )
                );
              }
              var base64String = document.documentData.split(',')[1];
              // var base64String = ctx.instance.documentData.replace('data:' + ctx.instance.fileType + ';base64,', '');
              // The following usage of new Buffer() is deprecated from node v6.0
              var binaryData = new Buffer(base64String, 'base64').toString(
                'binary'
              );
              var workbook = XLSX.read(binaryData, {
                type: 'binary'
              });
              var sheet = workbook.Sheets[workbook.SheetNames[0]];
              var csv = XLSX.utils.sheet_to_csv(sheet, { FS: delimiter });
              var decisionRules = dTable.csv_to_decision_table(csv);

              var data = ctx.instance || ctx.data;
              data.decisionRules = JSON.stringify(decisionRules);
              next();
            } catch (err) {
              log.error(
                ctx.options,
                'Error - Unable to process decision table data -',
                err
              );
              var error = new Error(
                'Decision table data provided could not be parsed, please provide proper data'
              );
              return next(error);
            }
          }
        }
      );
    } else {
      next();
    }
  });

  decisionTable.remoteMethod('exec', {
    description: 'execute a business rule',
    accessType: 'WRITE',
    accepts: [
      {
        arg: 'documentName',
        type: 'string',
        required: true,
        http: {
          source: 'path'
        },
        description: 'Name of the Document to be fetched from db for rule engine'
      },
      {
        arg: 'data',
        type: 'object',
        required: true,
        http: {
          source: 'body'
        },
        description: 'An object on which business rules should be applied'
      }
    ],
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

  decisionTable.exec = function decisionTableExec(
    documentName,
    data,
    options,
    callback
  ) {
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

    assert(
      typeof documentName === 'string',
      'The documentName argument must be string'
    );
    assert(
      typeof data === 'object',
      'The data argument must be an object or array'
    );
    assert(
      typeof options === 'object',
      'The options argument must be an object'
    );
    assert(
      typeof callback === 'function',
      'The callback argument must be a function'
    );

    decisionTable.find(
      {
        where: {
          name: documentName
        }
      },
      options,
      function decisionTableFind(err, decisionTableData) {
        if (err) {
          callback(err);
        } else if (decisionTableData.length) {
          var SystemModel = loopback.getModel('SystemConfig');
          SystemModel.find(
            {
              where: {
                key: 'businessRuleEngine'
              }
            },
            options,
            function systemModelFind(err, configData) {
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
                request(reqOptions, function requestCallback(
                  error,
                  response,
                  body
                ) {
                  if (error) {
                    callback(error, null);
                  } else {
                    callback(null, body);
                  }
                });
              } else {
                var rules = JSON.parse(decisionTableData[0].decisionRules);
                dTable.execute_decision_table(docId, rules, data, function (
                  err,
                  results
                ) {
                  results = results || [];
                  if (rules.hitPolicy === 'V') {
                    if (err) {
                      getError('JS_FEEL_ERR', {options: options, name: 'JS_FEEL'}, function validateMaxGetErrCb(error) {
                        error.errMessage = err;
                        results.push(error);
                        callback(null, results);
                      });
                    } else {
                      callback(null, results);
                    }
                  } else if (err) {
                    callback(err, null);
                  } else {
                    data = processPayload(results, data);
                    callback(null, data);
                  }
                });
              }
            }
          );
        } else {
          var err1 = new Error(
            'No Document found for DocumentName ' + documentName
          );
          err1.retriable = false;
          callback(err1);
        }
      }
    );
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
