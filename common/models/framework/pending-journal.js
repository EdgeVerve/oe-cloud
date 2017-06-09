var loopback = require('loopback');
var logger = require('oe-logger');
var log = logger('pening-journal');

module.exports = function (PendingJournal) {
  var updatePending = function (ctx, instance, status, cb) {
    var pendingModel = loopback.findModel('PendingJournal');

    pendingModel.findById(instance.id, ctx.options, function (err, inst) {
      if (err) {
        cb(err);
      } else {
        inst.status = status;
        inst.updateAttribute('status', status, ctx.options, function (err, res) {
          if (err) {
            log.error(log.defaultContext(), err);
            return cb(err);
          }
          return cb();
        });
      }
    });
  };

  PendingJournal.observe('after save', function (ctx, next) {
    var instance = ctx.instance;

    if (ctx.isNewInstance === true && instance.isFirstPending === true) {
      ctx.instance.isFirstPending = false;
      return next(new Error('journal pending saved'));
    }

    if (instance.status !== 'pending') {
      return next();
    }

    var journalModel = loopback.findModel(instance.journalName);
    var journalData = JSON.parse(instance.savedData);
    journalData.fromPending = true;

    var ctxRetry = JSON.parse(instance.savedCtx);

    journalModel.create(journalData, ctxRetry, function (err, res) {
      if (err) {
        if (err.retriable === false) {
          next();
          updatePending(ctx, instance, 'failed', function (err, res) {
            if (err) {
              return next(err);
            }
            return;
          });
        } else {
          return next(err);
        }
      } else {
        next();
        updatePending(ctx, instance, 'success', function (err, res) {
          if (err) {
            return next(err);
          }
          return;
        });
      }
    });
  });
};
