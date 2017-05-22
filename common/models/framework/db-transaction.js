/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
var logger = require('../../../lib/logger');
var log = logger('DbTransaction');
// var debug = require('debug')('DbTransaction');
var async = require('async');

/**
 * @classdesc This model is to hold intermediate transaction data in an ongoing two phased commit
 * This is a private model not exposed as REST API
 * No ACL for this model as whoever initiate a two phased commit will use this model programmatically
 * @kind class
 * @author Dipayan
 * @class db-transaction
 */

module.exports = function DBTransactionFn(DbTransaction) {
  /**
   * This reconcile event in db-transaction reconciles failed two phased commits
   * This is a event listner, should be configured and called using job scheduler.
   * accepts unique transaction object
   * rollback create as soft delete (set _isDeleted as true)
   * rollback update with oldData in transaction object for each transcation
   *
   * @param {object} transaction - a unique transaction data from db-transaction collection
   */
  DbTransaction.on('reconcile', function dbTransactionOnReconcileFn(obj) {
    log.debug(obj.options, 'Reconcile job started ');
    var dbTxn = loopback.getModel('DbTransaction');
    // dbTxn.find({ and: [{ status: { neq: "done" } }, { or: [{ opData: null }, { opData: undefined }] }] }, {}, function (err, res) {
    // async.each(transactions, function (txn, callback) {
    var transactionId = obj.transactionId;
    obj.options = obj.options || { ctx: {} };
    dbTxn.find({
      'where': {
        'and': [{
          'transactionId': transactionId
        }, {
          'opData': {
            'neq': null
          }
        }]
      }
    }, obj.options, function dbTransactionFindCb(err, txnEach) {
      if (err || (txnEach && txnEach.length === 0)) {
        return;
      }
      async.each(txnEach, function dbTransactionAsyncEachTxnFn(t, callback) {
        if (t.opData) {
          var model = loopback.getModel(t.opData.modelName);
          var conn = model.getDataSource().connector;
          // defaulting to idName as id in case of rest (as at this moment no way to find idName for rest)
          var idName = conn.dataSource.name === 'rest' ? 'id' : conn.idName(t.opData.modelName);
          switch (t.opData.op) {
            case 'create':
              var setIsDeletedTrue = (t.opData.data && t.opData.data._version) ? { '_version': t.opData.data._version, '_isDeleted': true } : { '_isDeleted': true };
              if (conn.updateAttributes.length === 5) {
                conn.updateAttributes(t.opData.modelName, t.opData.data[idName], setIsDeletedTrue, {}, function reconcileCreateVerForDb(err) {
                  if (err) {
                    log.error(obj.options, 'Error: Reconcile error - ', err.message);
                  }
                  callback();
                });
              } else {
                conn.updateAttributes(t.opData.modelName, t.opData.data[idName], setIsDeletedTrue, function reconcileCreateVerForRest(err) {
                  if (err) {
                    log.error(obj.options, 'Error: Reconcile error - ', err.message);
                  }
                  callback();
                });
              }
              break;
            case 'updateAll':
              // TO DO: check, by now the data is updated successfully by other means; if it is, do nothing; else revert
              delete t.opData.oldData[idName];
              if (t.opData.data && t.opData.data._version) {
                if (t.opData.oldData && !t.opData.oldData.__oldVersion) {
                  t.opData.oldData.__oldVersion = t.opData.data._version;
                }
                t.opData.oldData._version = t.opData.data._version;
              }
              conn.update(t.opData.modelName, { idName: t.opData.data[idName] }, t.opData.oldData, {}, function reconcileUpdateAll(err) {
                if (err) {
                  log.error(obj.options, 'Error: Reconcile error - ', err.message);
                }
                callback();
              });
              break;
            case 'updateOrCreate':
              break;
            case 'updateAttributes':
              // TO DO: check, by now the data is updated successfully by other means; if it is, do nothing; else revert
              delete t.opData.oldData[idName];
              if (t.opData.data && t.opData.data._version) {
                if (t.opData.oldData && !t.opData.oldData.__oldVersion) {
                  t.opData.oldData.__oldVersion = t.opData.data._version;
                }
                t.opData.oldData._version = t.opData.data._version;
              }
              if (conn.updateAttributes.length === 5) {
                conn.updateAttributes(t.opData.modelName, t.opData.where, t.opData.oldData, {}, function reconcileUpdateAttrForDb(err) {
                  if (err) {
                    log.error(obj.options, 'Error: Reconcile error - ', err.message);
                  }
                  callback();
                });
              } else {
                conn.updateAttributes(t.opData.modelName, t.opData.where, t.opData.oldData, function reconcileUpdateAttrForRest(err) {
                  if (err) {
                    log.error(obj.options, 'Error: Reconcile error - ', err.message);
                  }
                  callback();
                });
              }
              break;
            default:
          }
        }
      }, function dbTransactionAsyncEachTxnErrCb(err) {
        if (err) {
          log.error(obj.options, 'Rollback failed!!! TransactionId ', transactionId);
          return;
        }
        dbTxn.getDataSource().connector.update('DbTransaction', {
          transactionId: transactionId
        }, {
          'status': 'reconciled'
        }, {}, function dbTransactionAsyncEachTxnErrUpdateCb(err) {
          if (!err) {
            log.debug(obj.options, 'Transactions rollback successful with transaction id : ', transactionId);
          } else {
            log.debug(obj.options, 'Transactions rollback NOT successful with transaction id : ', transactionId);
          }
          return;
        });
      });
    });
  });
};
