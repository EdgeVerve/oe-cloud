/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @classdesc This model provides methods related to OTP.
 *
 * @kind class
 * @class OTP
 * @author Gourav Gupta
 */

var loopback = require('loopback');
var logger = require('oe-logger');
var log = logger('OTP');
var crypto = require('crypto');
var request = require('request');
var async = require('async');

module.exports = function OTP(otpModel) {
  otpModel.disableRemoteMethod('create', true);
  otpModel.disableRemoteMethod('upsert', true);
  otpModel.disableRemoteMethod('updateAll', true);
  otpModel.disableRemoteMethod('updateAttributes', false);
  otpModel.disableRemoteMethod('find', true);
  otpModel.disableRemoteMethod('findById', true);
  otpModel.disableRemoteMethod('findOne', true);
  otpModel.disableRemoteMethod('deleteById', true);
  otpModel.disableRemoteMethod('count', true);
  otpModel.disableRemoteMethod('createChangeStream', true);
  otpModel.disableRemoteMethod('exists', true);
  otpModel.disableRemoteMethod('__get__user', false);

  otpModel.send = function (data, req, res, options, cb) {
    // validate for default wait resend time
    if (typeof options === 'function') {
      cb = options;
      options = {};
    }

    var app = otpModel.app;
    var otpConfig = app.get('otp');

    var defaultConfig = {
      ttl: otpConfig.DEFAULT_TTL || 180000,
      resend: otpConfig.MAX_FAILED_ATTEMPTS || 3,
      failed: otpConfig.MAX_RESEND_ATTEMPTS || 3,
      enableFailedTTL: otpConfig.ENABLE_FAILED_TTL || true,
      mail: otpConfig.ENABLE_MAIL || true,
      sms: otpConfig.ENABLE_SMS || true
    };

    if (defaultConfig.enableFailedTTL) {
      defaultConfig.failedTTL = 900000;
    }

    var smsConfig;

    data.otp = otpModel.generateOTP();
    // data.status = 'generated';
    data.resend = 0;
    data.failed = 0;

    if (data.config && typeof data.config === 'object') {
      data.config.ttl = data.config.ttl ? data.config.ttl : defaultConfig.ttl;
      data.config.enableFailedTTL = (data.config.enableFailedTTL !== undefined) ? data.config.enableFailedTTL : defaultConfig.enableFailedTTL;
      if (data.config.enableFailedTTL) {
        data.config.failedTTL = data.config.failedTTL ? data.config.failedTTL : defaultConfig.failedTTL;
      }
      data.config.failed = data.config.failed ? data.config.failed : defaultConfig.failed;
      data.config.resend = data.config.resend ? data.config.resend : defaultConfig.resend;
      data.config.mail = (data.config.mail !== undefined) ? data.config.mail : defaultConfig.mail;
      data.config.sms = (data.config.sms !== undefined) ? data.config.sms : defaultConfig.sms;
    } else {
      data.config = defaultConfig;
    }

    if (otpConfig.MAIL_FROM) {
      data.config.mailFrom = otpConfig.MAIL_FROM;
    }
    if (otpConfig.SMS) {
      smsConfig = otpConfig.SMS;
    }

    data.expire = Date.now() + data.config.ttl;

    otpModel.findOne({'where': {'or': [{'phone': data.phone}, {'mail': data.mail}]}}, options, function (findErr, findRes) {
      if (findErr) {
        return cb(findErr);
      }
      if (findRes && findRes.config.enableFailedTTL && (findRes.failed >= findRes.config.failed) && ((Date.now() - findRes._modifiedOn.getTime()) <= findRes.config.failedTTL)) {
        return cb(new Error('OTP failed wait time not exceeded'));
      }

      // Failing, creating new column called id with same ObjectID
      if (findRes && findRes.id) {
        data.id = findRes.id;
      }

      otpModel.upsert(data, options, function (err, result) {
        if (err) {
          return cb(err);
        }
        otpModel.sendOTP(data, smsConfig, function (err, status) {
          if (err) {
            return cb(err);
          }
          var secure = true;
          if (!req.secure) {
            secure = false;
          }
          res.cookie('otp_id', result.id, {
            signed: false,
            secure: secure,
            httpOnly: true
          });
          return cb(null, status);
        });
      });
    });
  };

  otpModel.generateOTP = function generateOTP() {
    var randomNumberSet = '123456789';
    var rnd = crypto.randomBytes(4);
    var value = new Array(4);
    var len = randomNumberSet.length;

    for (var i = 0; i < 4; i++) {
      value[i] = randomNumberSet[rnd[i] % len];
    }
    return parseInt(value.join(''), 10);
  };

  otpModel.verify = function (data, req, res, options, cb) {
    var otpInstanceID = req.cookies.otp_id;
    if (!otpInstanceID) {
      return cb(new Error('Unknown OTP request or Exceeded maximum retries'));
    }

    otpModel.findOne({'id': otpInstanceID}, options, function (err, result) {
      if (err) {
        return cb(err);
      }

      if (typeof result !== 'object') {
        return cb(new Error('No record found'));
      }

      if (result.failed >= result.config.failed) {
        res.clearCookie('otp_id');
        return cb(new Error('Exceeded maximum retries'));
      }

      if (Date.now() >= result.expire) {
        res.clearCookie('otp_id');
        return cb(new Error('OTP timed out'));
      }

      if (data.otp === result.otp) {
        // delete record when otp verified, didnt delete record
        otpModel.deleteById(otpInstanceID, options, function (err, deleteResp) {
          if (err) {
            log.error(req.callContext, 'Error when deleting record after OTP verified', err);
          }
          res.clearCookie('otp_id');
          return cb(null, {'status': 'verified'});
        });
      } else {
        result.updateAttribute('failed', result.failed + 1, options, function (err, updateResp) {
          if (err) {
            return cb(err);
          }
          return cb(new Error('Verification failed'));
        });
      }
    });
  };

  otpModel.resend = function (req, res, options, cb) {
    var otpInstanceID = req.cookies.otp_id;
    if (!otpInstanceID) {
      return cb(new Error('Unknown OTP request'));
    }

    otpModel.findOne({'id': otpInstanceID}, options, function (err, result) {
      if (err) {
        return cb(err);
      }

      if (typeof result !== 'object') {
        return cb(new Error('No record found'));
      }

      if (result.resend >= result.config.resend) {
        res.clearCookie('otp_id');
        return cb(new Error('Exceeded maximum resend'));
      }

      if (Date.now() >= result.expire) {
        res.clearCookie('otp_id');
        return cb(new Error('OTP timed out'));
      }

      otpModel.sendOTP(result, function (err, status) {
        if (err) {
          return cb(err);
        }
        result.updateAttribute('resend', result.resend + 1, options, function (err, updateResp) {
          if (err) {
            return cb(err);
          }
          return cb(null, status);
        });
      });
    });
  };

  otpModel.sendOTP = function sendOTP(data, smsConfig, cb) {
    var asyncFn = {};
    if (data.config.sms) {
      asyncFn.sms = function (cb) { otpModel.sendSMS(data, smsConfig, cb); };
    }

    if (data.config.mail) {
      asyncFn.mail = function (cb) { otpModel.sendMail(data, cb); };
    }

    async.parallel(asyncFn, function (err, results) {
      if (err) {
        return cb(err);
      }
      var resp = {};
      if (results.sms instanceof Error) {
        resp.sms = {'status': 'failed', 'error': results.sms.message};
      } else {
        resp.sms = {'status': 'success'};
      }
      if (results.mail instanceof Error) {
        resp.mail = {'status': 'failed', 'error': results.mail.message};
      } else {
        resp.mail = {'status': 'success'};
      }
      cb(null, resp);
    });
  };

  otpModel.sendSMS = function sendSMS(data, smsConfig, cb) {
    var numbers = data.phone;
    var message = encodeURIComponent('OTP generated is ' + data.otp);
    var smsAPI = smsConfig.API;
    var apiKey = smsConfig.API_KEY;
    // ignoring sender name as its not there for promotional account
    // var sender = smsConfig.FROM;
    // var getURL = smsAPI + '?apikey=' + apiKey + '&numbers=' + numbers + '&message=' + message + '&sender=' + sender;
    var getURL = smsAPI + '?apikey=' + apiKey + '&numbers=' + numbers + '&message=' + message;

    var options = {
      method: 'POST',
      url: getURL,
      headers: {'content-type': 'application/x-www-form-urlencoded' }
    };

    request(options, function (error, response, body) {
      if (error) {
        return cb(null, error);
      }

      if (typeof body === 'object' && body.status && body.status === 'success') {
        cb(null, 'success');
      } else {
        var errorMessage = '';
        if (typeof body.errors === 'object' && body.errors.length > 0) {
          body.errors.forEach(function (err) {
            errorMessage = errorMessage + err.message + ' ; ';
          });
        }
        if (typeof body.warnings === 'object' && body.warnings.length > 0) {
          body.warnings.forEach(function (warn) {
            errorMessage = errorMessage + warn.message + ' ; ';
          });
        }
        cb(null, new Error(errorMessage));
      }
    });
  };

  otpModel.sendMail = function sendMail(data, cb) {
    var html = 'OTP generated is ' + data.otp;
    var mailTo = data.mail;
    var mailFrom = data.mailFrom;
    var Email = loopback.findModel('Email');
    Email.send({
      to: mailTo,
      from: mailFrom,
      subject: 'OTP for login',
      html: html
    }, function emailSend(err) {
      if (err) {
        log.error(log.defaultContext(), err);
        cb(null, err);
      } else {
        log.info(log.defaultContext(), 'otp mail sent to ', mailTo);
        cb(null, 'success');
      }
    });
  };

  otpModel.remoteMethod(
    'send',
    {
      description: 'Send OTP',
      accepts: [
        {arg: 'data', type: 'object', required: true, http: {source: 'body'}},
        {arg: 'req', type: 'object', 'http': {source: 'req'}},
        {arg: 'res', type: 'object', 'http': {source: 'res'}}
      ],
      returns: {
        arg: 'id',
        type: 'object',
        root: true,
        description: 'The response body contains otp instance ID'
      },
      http: { verb: 'post' }
    }
  );

  otpModel.remoteMethod(
    'verify',
    {
      description: 'Verify OTP',
      accepts: [
        {arg: 'data', type: 'object', required: true, http: {source: 'body'}},
        {arg: 'req', type: 'object', 'http': {source: 'req'}},
        {arg: 'res', type: 'object', 'http': {source: 'res'}}
      ],
      returns: {
        arg: 'accessToken', type: 'object', root: true,
        description:
        'The response body contains status'
      },
      http: { verb: 'post' }
    }
  );

  otpModel.remoteMethod(
    'resend',
    {
      description: 'Resend OTP',
      accepts: [
        {arg: 'req', type: 'object', 'http': {source: 'req'}},
        {arg: 'res', type: 'object', 'http': {source: 'res'}}
      ],
      returns: {
        arg: 'accessToken', type: 'object', root: true,
        description:
        'The response body contains status'
      },
      http: { verb: 'post' }
    }
  );
};
