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
var log = logger('base-otp');
var crypto = require('crypto');
var request = require('request');
var async = require('async');

module.exports = function BaseOTP(otpModel) {
  otpModel.disableRemoteMethod('create', true);
  otpModel.disableRemoteMethod('upsert', true);
  otpModel.disableRemoteMethod('updateAll', true);
  otpModel.disableRemoteMethod('updateAttributes', false);

  otpModel.disableRemoteMethod('find', true);
  otpModel.disableRemoteMethod('findById', true);
  otpModel.disableRemoteMethod('findOne', true);

  otpModel.disableRemoteMethod('deleteById', true);

  otpModel.disableRemoteMethod('count', true);
  otpModel.disableRemoteMethod('exists', true);

  otpModel.send = function send(data, req, res, options, cb) {
    var self = this;
    // validate for default wait resend time
    if (typeof options === 'function') {
      cb = options;
      options = {};
    }

    var app = self.app;
    var otpConfig = app.get('otp');

    var defaultConfig = {
      ttl: otpConfig.DEFAULT_TTL || 180000,
      resend: otpConfig.MAX_FAILED_ATTEMPTS || 3,
      failed: otpConfig.MAX_RESEND_ATTEMPTS || 3,
      enableFailedTTL: (otpConfig.ENABLE_FAILED_TTL ? true : false) || false,
      mail: (otpConfig.ENABLE_MAIL ? true : false) || false,
      sms: (otpConfig.ENABLE_SMS ? true : false) || false
    };

    if (defaultConfig.enableFailedTTL) {
      defaultConfig.failedTTL = 900000;
    }

    var smsConfig;

    data.otp = self.generateOTP();
    // data.status = 'generated';
    data.resend = 0;
    data.failed = 0;

    if (data.config && typeof data.config === 'object') {
      data.config.ttl = data.config.ttl ? data.config.ttl : defaultConfig.ttl;
      data.config.enableFailedTTL = (data.config.hasOwnProperty('enableFailedTTL')) ? data.config.enableFailedTTL : defaultConfig.enableFailedTTL;
      if (data.config.enableFailedTTL) {
        data.config.failedTTL = data.config.failedTTL ? data.config.failedTTL : defaultConfig.failedTTL;
      }
      data.config.failed = data.config.failed ? data.config.failed : defaultConfig.failed;
      data.config.resend = data.config.resend ? data.config.resend : defaultConfig.resend;
      data.config.mail = (data.config.hasOwnProperty('mail')) ? data.config.mail : defaultConfig.mail;
      data.config.sms = (data.config.hasOwnProperty('sms')) ? data.config.sms : defaultConfig.sms;
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

    var orQuery = [];
    if (data.phone) {
      orQuery.push({ 'phone': data.phone });
    }
    if (data.mail) {
      orQuery.push({ 'mail': data.mail });
    }

    if (orQuery.length === 0) {
      return cb(new Error('Require phone or mail to send OTP'));
    }

    self.find({ 'where': { 'or': orQuery } }, options, function (findErr, findRes) {
      if (findErr) {
        log.error(options, findErr.message);
        return cb(findErr);
      }

      if (findRes.length !== 0) {
        log.trace(options, 'send: updating existing instance');
        findRes = findRes[0];

        if (findRes.config.enableFailedTTL && (findRes.failed >= findRes.config.failed) && ((Date.now() - findRes._modifiedOn.getTime()) <= findRes.config.failedTTL)) {
          log.error(options, 'OTP failed wait time not exceeded');
          return cb(new Error('OTP failed wait time not exceeded'));
        }

        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          if (data.hasOwnProperty(key)) {
            findRes[key] = data[key];
          }
        }
        data = JSON.parse(JSON.stringify(findRes));
      }

      self.upsert(data, options, function (err, result) {
        if (err) {
          log.error(options, err.message);
          return cb(err);
        }
        self.sendOTP(data, smsConfig, function (err, status) {
          if (err) {
            log.error(options, err.message);
            return cb(err);
          }
          log.info(options, 'Inserted record and OTP sent');
          status.otpId = result.id;
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

  otpModel.verify = function verify(data, req, res, options, cb) {
    var self = this;
    // var otpInstanceID = req.cookies.otp_id;
    var otpInstanceID = data.otpId;
    if (!otpInstanceID) {
      log.error(options, 'Unknown OTP request or Exceeded maximum retries');
      return cb(new Error('Unknown OTP request or Exceeded maximum retries'));
    }

    self.findById(otpInstanceID, options, function (err, result) {
      if (err) {
        log.error(options, err.message);
        return cb(err);
      }

      if (!result) {
        log.error(options, 'No record found');
        return cb(new Error('No record found'));
      }

      if (result.failed >= result.config.failed) {
        // res.clearCookie('otp_id');
        log.error(options, 'Exceeded maximum retries');
        return cb(new Error('Exceeded maximum retries'));
      }

      if (Date.now() >= result.expire) {
        // res.clearCookie('otp_id');
        log.error(options, 'OTP timed out');
        return cb(new Error('OTP timed out'));
      }

      if (data.otp === result.otp) {
        self.deleteById(otpInstanceID, options, function (err, deleteResp) {
          if (err) {
            log.error(options, 'Error when deleting record after OTP verified', err);
          }
          // res.clearCookie('otp_id');
          log.info(options, 'OTP verified');
          return cb(null, { 'status': 'verified' });
        });
      } else {
        result.updateAttribute('failed', result.failed + 1, options, function (err, updateResp) {
          if (err) {
            log.error(options, 'Error when updating record after OTP verification failed', err);
            return cb(err);
          }
          log.info(options, 'Verification failed');
          return cb(new Error('Verification failed'));
        });
      }
    });
  };

  otpModel.resend = function resend(data, req, res, options, cb) {
    var self = this;
    // var otpInstanceID = req.cookies.otp_id;
    var otpInstanceID = data.otpId;

    var app = self.app;
    var otpConfig = app.get('otp');
    var smsConfig;

    if (otpConfig.SMS) {
      smsConfig = otpConfig.SMS;
    }

    if (!otpInstanceID) {
      log.error(options, 'Unknown OTP request');
      return cb(new Error('Unknown OTP request'));
    }

    self.findById(otpInstanceID, options, function (err, result) {
      if (err) {
        log.error(options, err.message, err);
        return cb(err);
      }

      if (!result) {
        log.error(options, 'No record found');
        return cb(new Error('No record found'));
      }

      if (result.resend >= result.config.resend) {
        // res.clearCookie('otp_id');
        log.error(options, 'Exceeded maximum resend');
        return cb(new Error('Exceeded maximum resend'));
      }

      if (Date.now() >= result.expire) {
        // res.clearCookie('otp_id');
        log.error(options, 'OTP timed out');
        return cb(new Error('OTP timed out'));
      }

      self.sendOTP(result, smsConfig, function (err, status) {
        if (err) {
          log.error(options, err.message, err);
          return cb(err);
        }
        result.updateAttribute('resend', result.resend + 1, options, function (err, updateResp) {
          if (err) {
            log.error(options, err.message, err);
            return cb(err);
          }
          log.info(options, 'Resend the OTP', status);
          return cb(null, status);
        });
      });
    });
  };

  otpModel.sendOTP = function sendOTP(data, smsConfig, cb) {
    var self = this;
    var asyncFn = {};
    if (data.config.sms) {
      asyncFn.sms = function (cb) { self.sendSMS(data, smsConfig, cb); };
    }

    if (data.config.mail) {
      asyncFn.mail = function (cb) { self.sendMail(data, cb); };
    }

    async.parallel(asyncFn, function (err, results) {
      if (err) {
        return cb(err);
      }
      var resp = {};

      if (data.config.sms) {
        if (results.sms instanceof Error) {
          resp.sms = { 'status': 'failed', 'error': results.sms.message };
        } else {
          resp.sms = { 'status': 'success' };
        }
      }

      if (data.config.mail) {
        if (results.mail instanceof Error) {
          resp.mail = { 'status': 'failed', 'error': results.mail.message };
        } else {
          resp.mail = { 'status': 'success' };
        }
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
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    };

    request(options, function (error, response, body) {
      if (error) {
        log.error(log.defaultContext(), error.message, error);
        return cb(null, error);
      }

      if (body) {
        if (body.status && body.status === 'success') {
          log.info(log.defaultContext(), 'OTP sent successfully');
          cb(null, 'success');
        } else {
          var errorMessage = '';
          if (body.errors && body.errors.length > 0) {
            body.errors.forEach(function (err) {
              errorMessage = errorMessage + err.message + ' ; ';
            });
          }
          if (body.warnings && body.warnings.length > 0) {
            body.warnings.forEach(function (warn) {
              errorMessage = errorMessage + warn.message + ' ; ';
            });
          }
          log.error(log.defaultContext(), errorMessage);
          cb(null, new Error(errorMessage));
        }
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
        { arg: 'data', type: 'object', required: true, 'http': { source: 'body' } },
        { arg: 'req', type: 'object', 'http': { source: 'req' } },
        { arg: 'res', type: 'object', 'http': { source: 'res' } }
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
        { arg: 'data', type: 'object', required: true, 'http': { source: 'body' } },
        { arg: 'req', type: 'object', 'http': { source: 'req' } },
        { arg: 'res', type: 'object', 'http': { source: 'res' } }
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
        { arg: 'data', type: 'object', 'http': { source: 'body' } },
        { arg: 'req', type: 'object', 'http': { source: 'req' } },
        { arg: 'res', type: 'object', 'http': { source: 'res' } }
      ],
      returns: {
        arg: 'accessToken', type: 'object', root: true,
        description:
          'The response body contains status'
      },
      http: { verb: 'post' }
    }
  );

  var originalSetup = otpModel.setup;
  // this will be called everytime a
  // model is extended from this model.
  otpModel.setup = function () {
    // This is necessary if your
    // AnotherModel is based of another model, like PersistedModel.
    originalSetup.apply(this, arguments);

    this.disableRemoteMethod('create', true);
    this.disableRemoteMethod('upsert', true);
    this.disableRemoteMethod('updateAll', true);
    this.disableRemoteMethod('updateAttributes', false);

    this.disableRemoteMethod('find', true);
    this.disableRemoteMethod('findById', true);
    this.disableRemoteMethod('findOne', true);

    this.disableRemoteMethod('deleteById', true);

    this.disableRemoteMethod('count', true);
    this.disableRemoteMethod('exists', true);

    this.remoteMethod(
      'send',
      {
        description: 'Send OTP',
        accepts: [
          { arg: 'data', type: 'object', required: true, http: { source: 'body' } },
          { arg: 'req', type: 'object', 'http': { source: 'req' } },
          { arg: 'res', type: 'object', 'http': { source: 'res' } }
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

    this.remoteMethod(
      'verify',
      {
        description: 'Verify OTP',
        accepts: [
          { arg: 'data', type: 'object', required: true, http: { source: 'body' } },
          { arg: 'req', type: 'object', 'http': { source: 'req' } },
          { arg: 'res', type: 'object', 'http': { source: 'res' } }
        ],
        returns: {
          arg: 'accessToken', type: 'object', root: true,
          description:
            'The response body contains status'
        },
        http: { verb: 'post' }
      }
    );

    this.remoteMethod(
      'resend',
      {
        description: 'Resend OTP',
        accepts: [
          { arg: 'data', type: 'object', 'http': { source: 'body' } },
          { arg: 'req', type: 'object', 'http': { source: 'req' } },
          { arg: 'res', type: 'object', 'http': { source: 'res' } }
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
};
