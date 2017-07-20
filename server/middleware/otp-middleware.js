/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var util = require('../../lib/common/util');
var exprLang = require('../../lib/expression-language/expression-language.js');
var config = require('../config');
var DEFAULT_TTL_OTP = 180000;
var logger = require('oe-logger');
var log = logger('otp-middleware');
var crypto = require('crypto');
var loopback = require('loopback');
/**
 * This middleware is used to check and apply otp authentication if enabled on model.
 * If enabled then send otp and store posted data, and on next request validate otp.
 * if validated then post data on model or send error message.
 *
 * @name OTP Middleware
 * @author Gourav Gupta
 * @memberof Middleware
 */

module.exports = function otpMiddleware(options) {
  /**
   * This function check if otp is enabled for model on which http method.
   * if config is present then enable otp or follow normal flow.
   * if otp is present in http request then calls validates otp.
   * @param {Object} req - HttpRequest
   * @param {Object} res - HttpResponse
   * @param {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
   * @function
   * @name enableOtp
   */

  return function enableOtp(req, res, next) {
    var app = req.app;

    var invokedPlural = req.callContext.modelName;
    var baseModel = util.checkModelWithPlural(app, invokedPlural);
    var model = loopback.findModel(baseModel, req.callContext);

    if (!model) {
      return next();
    }
    var enableOTP = model.definition.settings.enableOTP;
    var httpMethod = req.method;
    var accessToken = req.accessToken ? req.accessToken.id : null;

    // Checking if otp authentication config is available for model.
    if (enableOTP) {
      // Get config if available for http method that is requested.
      var config = enableOTP.filter(function getAuthConfig(configObj) {
        if (configObj.method === httpMethod) {
          return configObj;
        }
      })[0];

      if (config) {
        if (accessToken) {
          // If request contains otp in posted data then verify
          // and send response
          if (req.body.otp) {
            validateOtp(req, res, next);
          } else {
            // if otp is not there in request than validate auth
            // condition and send otp if auth condition satisfies
            var authCondition = config.authWhen;
            if (authCondition) {
              var ast = model._ast;
              exprLang.traverseAST(ast[authCondition], req.body)
                .then(function enableOtpMethods(result) {
                  if (result) {
                    enableOtpMethod(req, res, next);
                  } else {
                    next();
                  }
                });
            } else {
              enableOtpMethod(req, res, next);
            }
          }
        } else {
          res.status(401).send('Unauthorized');
        }
      } else {
        next();
      }
    } else {
      next();
    }
  };

  /**
   * This function validates the otp provided by user.
   * If matches then continue the request otherwise sends back response with
   * appropriate error.
   * @param {Object} req - HttpRequest
   * @param {Object} res - HttpResponse
   * @param {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
   * @function
   * @name validateOtp
   */
  function validateOtp(req, res, next) {
    var otpSubmitTime = Date.now();
    var otpId = req.body.otpId;
    var ttl = config.DEFAULT_TTL_OTP ? config.DEFAULT_TTL_OTP : DEFAULT_TTL_OTP;

    var query = {
      state: 'UNUSED',
      id: otpId,
      userId: req.accessToken.userId
    };
    var otpModel = req.app.models.OTP;

    otpModel.findOne({
      where: query
    }, req.callContext, function otpSecurityMixinOtpFind(err, otp) {
      if (err) {
        next(err);
      } else if (otp) {
        if (otp.token === req.body.otp) {
          if (otpSubmitTime - otp.timestamp <= ttl) {
            otp.updateAttribute('state', 'USED', req.callContext, function otpSecurityMixinOtpUpdateState(err) {
              if (err) {
                next(err);
              } else {
                req.body = otp.data;
                next();
              }
            });
          } else {
            otp.updateAttribute('state', 'EXPIRED', req.callContext, function otpSecurityMixinOtpUpdateState(err) {
              if (err) {
                next(err);
              } else {
                next(new Error('Otp EXPIRED'));
              }
            });
          }
        } else {
          otp.updateAttribute('failedAttemps', otp.failedAttemps + 1, req.callContext, function otpSecurityMixinOtpUpdateFailedAttemp(err, result) {
            if (err) {
              next(err);
            } else if (result.failedAttemps <= 5) {
              res.status(422).send('{"message" :"otp auth failed"}');
            } else {
              res.status(422).send('{"message" :"Max try limit reached"}');
            }
          });
        }
      } else {
        res.status(401).send('{"message" :"otp auth failed"}');
      }
    });
  }

  /**
   * This function creates Otp model instance and calls method to send email or sms.
   * @param {Object} req - HttpRequest
   * @param {Object} res - HttpResponse
   * @param {function} next - The function to be called for letting Loopback know that it can proceed with the next hook.
   * @function
   * @name enableOtpMethod
   */
  function enableOtpMethod(req, res, next) {
    var otpToken = generateOTP();
    var userId = req.accessToken.userId;
    // var accessToken = req.accessToken ? req.accessToken.id : undefined;
    var BaseUser = req.app.models.BaseUser;
    // req.app.getModelByType[BaseUser]
    var query = {
      id: userId
    };

    BaseUser.findOne({
      where: query
    }, req.callContext, function otpSecurityMixinBaseUserFindOne(err, user) {
      if (err) {
        next(err);
      } else if (user) {
        // encrypt this data
        var modelData = req.body;
        var otpModel = req.app.models.OTP;

        // otp data to be stored in OTP model
        var data = {
          'token': otpToken,
          'timestamp': Date.now(),
          'state': 'UNUSED',
          'userId': userId,
          'data': modelData
        };

        var deleteQuery = {
          'userId': userId,
          'state': 'UNUSED'
        };
        otpModel.destroyAll(deleteQuery, req.callContext, function destroyAllOtp(err) {
          if (err) {
            next(err);
          } else {
            otpModel.create(data, req.callContext, function otpSecurityMixinOtpCreate(err, otp) {
              if (err) {
                next(err);
              } else {
                var response = {
                  'status': 'otpRequired',
                  'otpId': otp.id
                };
                res.send(response);
                sendOtp(user, otp, req.app);
              }
            });
          }
        });
      } else {
        next(new Error('User Not Found'));
      }
    });
  }

  /**
   * This function sends otp to user email.
   * @param {Object} user - BaseUser
   * @param {Object} otp - OTP
   * @param {Object} app - loopback app
   * @function
   * @name sendOtp
   */
  function sendOtp(user, otp, app) {
    // html code that will be sent to mail
    var html = 'OTP generated is ' + otp.token;
    var mailTo = user.email;
    var MAIL_FROM = 'yourmail@mycompany.com';

    app.models.Email.send({
      to: mailTo,
      from: MAIL_FROM,
      subject: 'OTP for login',
      html: html
    }, function emailSendFn(err) {
      if (err) {
        log.error(log.defaultContext(), err);
      } else {
        log.info(log.defaultContext(), 'otp mail sent to ', mailTo);
      }
    });

    /**
     * Sms gateway Api call
     */
  }

  // generate a 4 digit integer
  function generateOTP() {
    var randomNumberSet = '123456789';
    var rnd = crypto.randomBytes(4);
    var value = new Array(4);
    var len = randomNumberSet.length;

    for (var i = 0; i < 4; i++) {
      value[i] = randomNumberSet[rnd[i] % len];
    }
    return parseInt(value.join(''), 10);
  }
};
