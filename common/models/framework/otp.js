/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @classdesc This model provides methods related to OTP. All the methods are disable on this model except resend Otp method.
 *
 * @kind class
 * @class OTP
 * @author Gourav Gupta
 */

var loopback = require('loopback');
var logger = require('oe-logger');
var log = logger('otp');

module.exports = function OTP(otpModel) {
  otpModel.disableRemoteMethod('create', true);
  otpModel.disableRemoteMethod('upsert', true);
  otpModel.disableRemoteMethod('updateAll', true);
  otpModel.disableRemoteMethod('updateAttributes', false);
  otpModel.disableRemoteMethod('find', true);
  otpModel.disableRemoteMethod('findById', true);
  otpModel.disableRemoteMethod('findOne', true);
  otpModel.disableRemoteMethod('deleteById', true);
  otpModel.disableRemoteMethod('deleteById', true);
  otpModel.disableRemoteMethod('count', true);
  otpModel.disableRemoteMethod('createChangeStream', true);
  otpModel.disableRemoteMethod('exists', true);
  otpModel.disableRemoteMethod('__get__user', false);

  /**
   * This function is to resend otp.This function requires otpid and sends otp to user for which otp
   * was generated.
   *
   * @param {object} data - input data contains otpId
   * @param {object} options - callcontext options
   * @param {object} include - options
   * @param {function} cb - next middleware function
   */
  otpModel.resendOtp = function userResendOtp(data, options, include, cb) {
    if (typeof include === 'function') {
      cb = include;
      include = null;
    }

    var otpId = data.otpId;
    var userId = options.ctx.userId;
    var query = {};
    query.userId = userId;
    query.id = otpId;
    if (otpId && userId) {
      otpModel.findOne({ where: query }, options, function findOtpForBaseUser(err, otp) {
        if (err) {
          throw err;
        } else if (otp) {
          var response = {};
          response.status = 'Otp Required';
          response.otpId = otp.id;
          var BaseUser = loopback.getModel('BaseUser');
          var findUser = { id: otp.userId };
          BaseUser.findOne({ where: findUser }, options, function findBaseUser(err, user) {
            if (err) {
              cb(err);
            } else if (user) {
              sendOtp(user, otp);
              cb(null, response);
            } else {
              var err1 = new Error('User Not Found');
              err1.retriable = false;
              cb(err1);
            }
          });
        } else {
          var err2 = new Error('Otp not found. Id incorrect');
          err2.retriable = false;
          cb(err2);
        }
      });
    } else {
      var err3 = new Error('not authorized');
      err3.retriable = false;
      cb(err3);
    }
  };

  // It sends mail to user email with otp
  function sendOtp(user, otp) {
    // html code that will be sent to mail
    var html = 'OTP generated is ' + otp.token;

    var mailTo = user.email;
    var MAIL_FROM = 'youremail@gmail.com';
    var Email = loopback.findModel('Email');
    Email.send({
      to: mailTo,
      from: MAIL_FROM,
      subject: 'OTP for login',
      html: html
    }, function emailSend(err) {
      if (err) {
        log.error(log.defaultContext(), err);
      } else {
        log.info(log.defaultContext(), 'otp mail sent to ', mailTo);
      }
    });
    log.debug(log.defaultContext(), html);
  }

  otpModel.remoteMethod(
    'resendOtp',
    {
      description: 'Resending OTP',
      accepts: [
        { arg: 'otpId', type: 'object', required: true, http: { source: 'body' } }
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
