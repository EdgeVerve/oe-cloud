/**
 *
 * �2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * This class acts as an error wrapper which customises the loopback error by adding customised messages to it.
 * It prepares an customised error object which is finally attached to the response object.
 * @module ErrorUtils
 * @author Pragyan Das and Dipayan Aich
 */

var logger = require('oe-logger');
var log = logger('error-utils');
var loopback = require('loopback');
var Mustache = require('mustache');
var fs = require('fs');
var path = require('path');

/**
 * property level validation error codes and default messages
 * @param {string} code error code.
 * @param {object} obj error message object.
 * @param {object} args error message object.
 * @param {function} cb callback function.
 * @function ErrorUtils
 */
function getValidationError(code, obj, args, cb) {
  if (args && typeof args !== 'function') {
    obj.inst = args.inst;
    obj.data = args.data;
    obj.path = args.path;
    obj.options = args.options;
  } else {
    cb = args;
  }
  // default error details
  var errDetails = getErrorDetails();
  var path = obj.path;
  var fieldName = obj.name;
  // obj.inputValue = obj.inst[obj.name];
  // fetch the error code
  var errorCode = obj.value ? obj.value.errorCode ? obj.value.errorCode : code : code;
  var Model = loopback.getModel('Error');
  var where = {
    'errCode': errorCode
  };
  var filter = {};
  filter.where = where;
  // Query the 'Error' model to get the customised error message
  // and any more information redarding the error
  // Prepare the customised error object
  Model.findOne(filter, obj.options, function errorUtilsModelFindCb(err, result) {
    if (err) {
      return cb(err);
    }
    var errorObj = {};
    var moreInfoUrl = {};
    errorObj.errCode = errorCode;
    if (result && result.errMessage) {
      // Sample Mustache query: 'The value entered is less than {{value}}'
      log.trace(obj.options, 'Picking up the customise error details');
      errorObj.errMessage = Mustache.render(result.errMessage, obj);
    } else {
      // if no customised error message found then make errCode as errMessage
      log.trace(obj.options, 'Picking up the default error details');
      errorObj.errMessage = getDefaultMessage(errDetails, errorCode);
    }

    if (result && result.errCategory) {
      // if category is mentioned, fill the value
      errorObj.errCategory = result.errCategory;
    }
    // prepare the moreInformation URL, which will show details of the error
    // if no entry is present for the corresponding err code in Error model then moreInformation will have nothing
    if (obj.options && obj.options.origin && result && result.id) {
      log.trace(obj.options, 'Preparing moreInformation URL');
      moreInfoUrl = obj.options.origin + '/api/' + Model.pluralModelName + '/' + result.id;
      errorObj.moreInformation = moreInfoUrl;
    }
    errorObj.fieldName = fieldName;
    errorObj.path = path;
    errorObj.retriable = false;

    cb(errorObj);
  });
}

/**
 *
 * Get the default error message from db.
 *
 * @param {Object} errDetails - default error messages and codes
 * @param {String} code - error code
 * @returns {String} error message
 */
function getDefaultMessage(errDetails, code) {
  var err = errDetails.filter(function errorUtilsErrorDetailsFilterCb(d) {
    return d.code === code;
  });
  return err[0] ? err[0].message : code;
}

/**
 *
 * ValidationError is raised when the application attempts to save an invalid model instance.
 * This function read the error array and create error object and pass it to the response object.
 * @memberof Model Validations
 * @param {Object} instance - instance of the data  posted
 * @param {Object[]} errArr - array containing all the violated validation rules' error object
 * @function attachValidationError
 */
function attachValidationError(instance, errArr) {
  if (errArr && errArr.length === 0) {
    return;
  }
  if (!instance.errors) {
    Object.defineProperty(instance, 'errors', {
      enumerable: false,
      configurable: true,
      value: new Errors()
    });
  }
  errArr.forEach(function modelValidationsGetErrorForEachFn(err) {
    instance.errors.add(err.fieldName, err.errMessage, err.errCode, err.errCategory ? err.errCategory : null, err.path);
  });
}

function Errors() {
  Object.defineProperty(this, 'codes', {
    enumerable: false,
    configurable: true,
    value: {}
  });
  Object.defineProperty(this, 'category', {
    enumerable: false,
    configurable: true,
    value: {}
  });
}

Errors.prototype.add = function (field, message, code, category, path) {
  code = code || 'invalid';
  if (!this[field]) {
    this[field] = [];
    this.codes[field] = [];
    this.category[field] = [];
  }
  this[field].push(message);
  this.codes[field].push(code);
  if (category) {
    this.category[field].push(category);
  }

  if (!this.fieldPaths) {
	  this.fieldPaths = {};
  }
  if (!this.fieldPaths[field]) {
	this.fieldPaths[field] = [];
  }
  this.fieldPaths[field].push(path);
};

var getErrorDetails = function getErrorDetails() {
  try {
    var datatext = fs.readFileSync(path.join(__dirname, '../seed/ErrorDetail.json'), 'utf-8');
    return JSON.parse(datatext);
  } catch (e) {
    return {};
  }
};

module.exports = {
  getValidationError: getValidationError,
  attachValidationError: attachValidationError,
  getErrorDetails: getErrorDetails
};
