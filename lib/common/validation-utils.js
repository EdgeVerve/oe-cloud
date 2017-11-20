/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * This class provides methods that add validation cababilities to models.
 * Each of the validations runs when the obj.isValid() method is called.
 *
 * @module Validation Utils
 * @author Pragyan Das
 */

var logger = require('oe-logger');
var log = logger('validation-utils');
var async = require('async');
var loopback = require('loopback');
var Mustache = require('mustache');
var getValidationError = require('./error-utils').getValidationError;
// var debug = require('debug')('validation-util');
var app = require('../../server/server.js').app;
var exprLang = require('../expression-language/expression-language.js');
var _ = require('lodash');

/*
 * mapper used to check the functions applicable for the properties of a model depending on its type
 */
var applicableValidations = {
  'boolean': ['required', 'absence'],
  'number': ['min', 'max', 'is', 'required', 'absence', 'in', 'notin', 'pattern', 'numericality', 'unique'],
  'string': ['min', 'max', 'is', 'required', 'absence', 'in', 'notin', 'pattern', 'unique', 'enumtype', 'absencechar', 'refcodetype', 'xmodelvalidate', 'script'],
  'object': ['required', 'absence'],
  'array': ['min', 'max', 'is', 'required', 'absence'],
  'default': ['min', 'max', 'is', 'required', 'absence', 'in', 'notin', 'numericality', 'pattern', 'unique']
};

/*
 * mapper used to map the validation rules with proper validation functions to be executed when isValid method is called
 */
var validationExpressionMapper = {
  'min': validateMin,
  'max': validateMax,
  'is': validateIs,
  'required': {
    'true': validatePresence
  },
  'absence': {
    'true': validateAbsence
  },
  'absencechar': {
    'true': absenceChar
  },
  'in': validateIn,
  'notin': validateNotIn,
  'numericality': {
    'number': validateNumber,
    'integer': validateInteger
  },
  'pattern': validatePattern,
  'unique': validateUniqueness,
  'relation': validateRelations,
  'oeValidation': validateOeValidation,
  'enumtype': validateEnumtype,
  'refcodetype': validateRefCode,
  'xmodelvalidate': validateXModel,
  'script': validateScriptInjection
};

/**
 *
 * Length validator to check the minimum length
 * @param {Object} obj - object containing validation rule details
 * @param {function} cb - callback function
 */
function validateMin(obj, cb) {
  log.debug(obj.options, 'validateMin invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  var err = null;
  if (blank(obj.data[obj.name])) {
    // value of the attribute/property which is undefined
    cb(null, err);
  } else {
    var attrValue = getLength.call(obj, obj.type, obj.name);
    if ((obj.value !== null || typeof obj.value !== 'undefined') && attrValue < obj.value) {
      log.warn(obj.options, 'validateMin rule violated for ', obj.inst.constructor.modelName, '->', obj.name);
      getValidationError(getErrorCode('min'), obj, function validateMinGetErrCb(error) {
        log.debug(obj.options, 'validateMin error :', error);
        err = error;
        cb(null, err);
      });
    } else {
      log.debug(obj.options, 'validateMin rule passed for ', obj.inst.constructor.modelName, '->', obj.name);
      cb(null, err);
    }
  }
}

/**
 *
 * Length validator to check the maximum length
 * @param {Object} obj - object containing validation rule details
 * @param {function} cb - callback function
 */
function validateMax(obj, cb) {
  log.debug(obj.options, 'validateMax invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  var err = null;
  if (blank(obj.data[obj.name])) {
    // value of the attribute/property which is undefined
    cb(null, err);
  } else {
    var attrValue = getLength.call(obj, obj.type, obj.name);
    if ((obj.value !== null || typeof obj.value !== 'undefined') && attrValue > obj.value) {
      log.warn(obj.options, 'validateMax rule violated for ', obj.inst.constructor.modelName, '->', obj.name);
      getValidationError(getErrorCode('max'), obj, function validateMaxGetErrCb(error) {
        log.debug(obj.options, 'validateMax error :', error);
        err = error;
        cb(null, err);
      });
    } else {
      log.debug(obj.options, 'validateMax rule passed for ', obj.inst.constructor.modelName, '->', obj.name);
      cb(null, err);
    }
  }
}

/**
 *
 * Length validator to check the exact length
 * @param {Object} obj - object containing validation rule details
 * @param {function} cb - callback function
 */
function validateIs(obj, cb) {
  log.debug(obj.options, 'validateIs invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  var err = null;
  if (blank(obj.data[obj.name])) {
    // value of the attribute/property which is undefined
    cb(null, err);
  } else {
    var attrValue = getLength.call(obj, obj.type, obj.name);
    if ((obj.value !== null || typeof obj.value !== 'undefined') && attrValue !== obj.value) {
      log.warn(obj.options, 'validateIs rule violated for ', obj.inst.constructor.modelName, '->', obj.name);
      getValidationError(getErrorCode('is'), obj, function validateIsGetErrCb(error) {
        log.debug(obj.options, 'validateIs error :', error);
        err = error;
        cb(null, err);
      });
    } else {
      log.debug(obj.options, 'validateIs rule passed for ', obj.inst.constructor.modelName, '->', obj.name);
      cb(null, err);
    }
  }
}

/**
 *
 * Get the proper length validator depending upon the type
 * @param {String} type - variable type
 * @param {String} name - property name
 * @returns {number} length of the property
 */
function getLength(type, name) {
  var len = null;
  switch (type) {
    case 'string':
    case 'array':
      len = this.data[name].length;
      break;
    case 'number':
      len = this.data[name];
      break;
    default:
      len = this.data[name];
  }

  return len;
}

/**
 *
 * Presence validator
 * @param {Object} obj - object containing validation rule details
 * @param {function} cb - callback function
 */
function validatePresence(obj, cb) {
  log.debug(obj.options, 'validatePresence invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  var err = null;

  if (blank(obj.data[obj.name])) {
    log.warn(obj.options, 'validatePresence rule violated for ', obj.inst.constructor.modelName, '->', obj.name);
    getValidationError(getErrorCode('presence'), obj, function validatePresenceGetErrCb(error) {
      log.debug(obj.options, 'validatePresence error :', error);
      err = error;
      cb(null, err);
    });
  } else {
    log.debug(obj.options, 'validatePresence rule passed for ', obj.inst.constructor.modelName, '->', obj.name);
    cb(null, err);
  }
}

/**
 *
 * Absence validator
 * @param {Object} obj - object containing validation rule details
 * @param {function} cb - callback function
 */
function validateAbsence(obj, cb) {
  log.debug(obj.options, 'validateAbsence invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  var err = null;

  if (!blank(obj.data[obj.name])) {
    log.warn(obj.options, 'validateAbsence rule violated for ', obj.inst.constructor.modelName, '->', obj.name);
    getValidationError(getErrorCode('absence'), obj, function validateAbsenceGetErrCb(error) {
      log.debug(obj.options, 'validateAbsence error :', error);
      err = error;
      cb(null, err);
    });
  } else {
    log.debug(obj.options, 'validateAbsence rule passed for ', obj.inst.constructor.modelName, '->', obj.name);
    cb(null, err);
  }
}

/**
 *
 * Absence Char validator
 * @param {Object} obj - object containing validation rule details
 * @param {function} cb - callback function
 *
 */
function absenceChar(obj, cb) {
  log.debug(obj.options, 'absenceChar invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  log.debug(obj.options, 'absenceChar', obj.data[obj.name]);
  var err = null;

  if (!blank(obj.data[obj.name])) {
    if (hasInvalidChars(obj.data[obj.name])) {
      log.warn(obj.options, 'absenceChar rule violated for ', obj.inst.constructor.modelName, '->', obj.name);
      getValidationError(getErrorCode('absencechar'), obj, function absenceCharGetErrCb(error) {
        log.debug(obj.options, 'absenceChar error :', error);
        err = error;
        cb(null, err);
      });
    } else {
      log.debug(obj.options, 'absenceChar rule passed for ', obj.inst.constructor.modelName, '->', obj.name);
      cb(null, err);
    }
  } else {
    log.debug(obj.options, 'absenceChar rule passed for ', obj.inst.constructor.modelName, '->', obj.name);
    cb(null, err);
  }
}

/**
 *
 * Inclusion validator
 * @param {Object} obj - object containing validation rule details
 * @param {function} cb - callback function
 */
function validateIn(obj, cb) {
  log.debug(obj.options, 'validateIn invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  var err = null;
  if (blank(obj.data[obj.name])) {
    // value of the attribute/property which is undefined
    cb(null, err);
  } else {
    var attrValue = obj.data[obj.name];
    if (obj.value.indexOf(attrValue) < 0) {
      log.warn(obj.options, 'validateIn rule violated for ', obj.inst.constructor.modelName, '->', obj.name);
      getValidationError(getErrorCode('in'), obj, function validateInGetErrCb(error) {
        log.debug(obj.options, 'validateIn error :', error);
        err = error;
        cb(null, err);
      });
    } else {
      log.debug(obj.options, 'validateIn rule passed for ', obj.inst.constructor.modelName, '->', obj.name);
      cb(null, err);
    }
  }
}

/**
 *
 * Exclusion validator
 * @param {Object} obj - object containing validation rule details
 * @param {function} cb - callback function
 */
function validateNotIn(obj, cb) {
  log.debug(obj.options, 'validateNotIn invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  var err = null;
  if (blank(obj.data[obj.name])) {
    // value of the attribute/property which is undefined
    cb(null, err);
  } else {
    var attrValue = obj.data[obj.name];
    if (obj.value.indexOf(attrValue) > -1) {
      log.warn(obj.options, 'validateNotIn rule violated for ', obj.inst.constructor.modelName, '->', obj.name);
      getValidationError(getErrorCode('notin'), obj, function validateNotInGetErrCb(error) {
        log.debug(obj.options, 'validateNotIn error :', error);
        err = error;
        cb(null, err);
      });
    } else {
      log.debug(obj.options, 'validateNotIn rule passed for ', obj.inst.constructor.modelName, '->', obj.name);
      cb(null, err);
    }
  }
}

/**
 *
 * Numericality validator checking if it is a number
 * @param {Object} obj - object containing validation rule details
 * @param {function} cb - callback function
 */
function validateNumber(obj, cb) {
  log.debug(obj.options, 'validateNumber invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  var err = null;
  if (blank(obj.data[obj.name])) {
    // value of the attribute/property which is undefined
    cb(null, err);
  } else {
    var value = obj.data[obj.name];
    if (typeof value !== 'number' || (typeof value === 'number' && isNaN(value))) {
      log.warn(obj.options, 'validateNumber rule violated for ', obj.inst.constructor.modelName, '->', obj.name);
      getValidationError(getErrorCode('number'), obj, function validateNumberGetErrCb(error) {
        log.debug(obj.options, 'validateNumber error :', error);
        err = error;
        cb(null, err);
      });
    } else {
      log.debug(obj.options, 'validateNumber rule passed for ', obj.inst.constructor.modelName, '->', obj.name);
      cb(null, err);
    }
  }
}

/**
 *
 * Numericality validator checking if it is an integer
 * @param {Object} obj - object containing validation rule details
 * @param {function} cb - callback function
 */
function validateInteger(obj, cb) {
  log.debug(obj.options, 'validateInteger invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  var err = null;
  if (blank(obj.data[obj.name])) {
    // value of the attribute/property which is undefined
    cb(null, err);
  } else {
    var value = obj.data[obj.name];
    if ((typeof value === 'number' && isNaN(value)) || value !== Math.round(value)) {
      log.warn(obj.options, 'validateInteger rule violated for ', obj.inst.constructor.modelName, '->', obj.name);
      getValidationError(getErrorCode('integer'), obj, function validateIntegerGetErrCb(error) {
        log.debug(obj.options, 'validateInteger error :', error);
        err = error;
        cb(null, err);
      });
    } else {
      log.debug(obj.options, 'validateInteger rule passed for ', obj.inst.constructor.modelName, '->', obj.name);
      cb(null, err);
    }
  }
}

/**
 *
 * Pattern validator
 * @param {Object} obj - object containing validation rule details
 * @param {function} cb - callback function
 */
function validatePattern(obj, cb) {
  log.debug(obj.options, 'validatePattern invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  var err = null;
  var code = getErrorCode('pattern');
  if (blank(obj.data[obj.name])) {
    // value of the attribute/property which is undefined
    cb(null, err);
  } else {
    var value = typeof obj.data[obj.name] === 'string' ? obj.data[obj.name] :
      typeof obj.data[obj.name] === 'number' ? obj.data[obj.name].toString() : null;
    if (value) {
      if (!value.match(obj.value)) {
        log.warn(obj.options, 'validatePattern rule violated for ', obj.inst.constructor.modelName, '->', obj.name);
        getValidationError(code, obj, function validatePatternGetErrCb(error) {
          log.debug(obj.options, 'validatePattern error :', error);
          err = error;
          cb(null, err);
        });
      } else {
        log.debug(obj.options, 'validatePattern rule passed for ', obj.inst.constructor.modelName, '->', obj.name);
        cb(null, err);
      }
    } else {
      log.warn(obj.options, 'validatePattern rule violated for ', obj.inst.constructor.modelName, '->', obj.name);
      getValidationError(code, obj, function validatePatternGetErr2Cb(error) {
        log.debug(obj.options, 'validatePattern error :', error);
        err = error;
        cb(null, err);
      });
    }
  }
}

/**
 *
 * Uniqueness validator
 * @param {Object} obj - object containing validation rule details
 * @param {function} cb - callback function
 * @returns {function} cb - callback function
 */
function validateUniqueness(obj, cb) {
  log.debug(obj.options, 'validateUniqueness invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  var err = null;
  var code = getErrorCode('unique');

  if (blank(obj.data[obj.name]) || !obj.value) {
    return process.nextTick(function validateUniquenessCb() {
      // value of the attribute/property which is undefined
      cb(null, err);
    });
  }
  var cond = {
    where: {}
  };
  var conf = obj.value;
  // Checking if the 'unique' property value is given as 'ignoreCase'
  if (conf && conf === 'ignoreCase') {
    code = getErrorCode('uniquecaseinsensitive');
    // Adding a where clause with regular expression with ignore case.
    cond.where[obj.name] = { regexp: new RegExp(['^', obj.data[obj.name], '$'].join(''), 'i') };
  } else {
    cond.where[obj.name] = obj.data[obj.name];
  }

  var orgctx = obj.options.ctx;
  // add the manual scope to the where clause for data personalisation, property should be unique w.r.t a scope
  var newCtx = _.cloneDeep(obj.options.ctx);
  // Update the context for this call.
  var contextModified = false;
  if (obj.data.scope) {
    Object.keys(obj.data.scope).forEach(function validateUniquenessScopeForEachFn(k) {
      newCtx[k] = this[k];
    }, obj.data.scope);
    obj.options.ctx = newCtx;
    contextModified = true;
  }

  // append scope to the scopedTo array to make a property or composite property unique w.r.t certain scope
  if (conf && conf.scopedTo) {
    conf.scopedTo.forEach(function validateUniquenessForEachCb(k) {
      var val = this[k];
      if (typeof val !== 'undefined') {
        cond.where[k] = this[k];
      }
    }, obj.inst);
  }
  // check only if _isDeleted false in condition
  if (obj.inst.constructor.settings.mixins && obj.inst.constructor.settings.mixins.SoftDeleteMixin) {
    cond.where._isDeleted = false;
  }
  obj.options.exactMatch = false;
  var idName = obj.inst.constructor.definition.idName();
  var isNewRecord = obj.inst.isNewRecord();
  obj.inst.constructor.find(cond, obj.options, function validateUniquenessFindCb(error, found) {
    if (contextModified) {
      obj.options.ctx = orgctx;
    }
    obj.options.exactMatch = false;
    var isScopeMatch = found && found.length > 0 ? _.isEqual(obj.data._scope, found[0]._scope) : false;
    if (error) {
      getValidationError(code, obj, function validateUniquenessFindGetErrCb(error) {
        log.debug(obj.options, 'validateUniqueness error :', error);
        err = error;
        cb(null, err);
      });
    } else if (found.length > 1 && isScopeMatch) {
      getValidationError(code, obj, function validateUniquenessFindGetErr2Cb(error) {
        log.debug(obj.options, 'validateUniqueness error :', error);
        err = error;
        cb(null, err);
      });
    } else if (found.length === 1 && idName === obj.name && isNewRecord && isScopeMatch) {
      getValidationError(code, obj, function validateUniquenessFindGetErr3Cb(error) {
        log.debug(obj.options, 'validateUniqueness error :', error);
        err = error;
        cb(null, err);
      });
    } else if (found.length === 1 && (!this.id || !found[0].id || found[0].id.toString() !== this.id.toString()) && isScopeMatch) {
      getValidationError(code, obj, function validateUniquenessFindGetErr4Cb(error) {
        log.debug(obj.options, 'validateUniqueness error :', error);
        err = error;
        cb(null, err);
      });
    } else {
      log.debug(obj.options, 'validateUniqueness rule passed for ', obj.inst.constructor.modelName, '->', obj.name);
      cb(null, err);
    }
  }.bind(obj.inst));
}

/**
 *
 * Return true when v is undefined, blank array, null or empty string
 * otherwise returns false
 * Returns true if `v` is blank.
 * @param {Object} v - data posted for any corresponding property
 * @returns {Boolean} returns if the object is blank
 */
function blank(v) {
  if (typeof v === 'undefined') {
    return true;
  }
  if (v instanceof Array && v.length === 0) {
    return true;
  }
  if (v === null) {
    return true;
  }
  // if (typeof v === 'number' && isNaN(v)) {
  //    return true;
  // }
  if (typeof v === 'string' && v.trim() === '') {
    return true;
  }
  return false;
}

/**
 *
 * Return true when v has invalid chars (characters other than uppercase and lowercase alphabets)
 * otherwise returns false
 * @param {Object} v - data posted for any corresponding property
 * @returns {Boolean} returns if the data is blank or if it matches the regular expression
 */
function hasInvalidChars(v) {
  log.debug(log.defaultContext(), 'hasInvalidChars', v);
  if (typeof v === 'undefined') {
    return false;
  }
  if (v instanceof Array && v.length === 0) {
    return false;
  }
  if (v === null) {
    return false;
  }
  if (typeof v === 'number' && isNaN(v)) {
    return false;
  }
  if (typeof v === 'string' && v === '') {
    return false;
  }
  return !(/^[a-zA-Z]*$/.test(v));
}

/**
 *
 * get the appropriate function for oeValidation depending on the type(type can be string, reference, function, etc.)
 * @param {String} type - type of oeValidation
 * @returns {function} The matching oeValidation function
 */
function validateOeValidation(type) {
  var f;
  switch (type) {
    case 'reference':
      f = validateReferenceData;
      break;
    case 'custom':
      f = validateExpression;
      break;
    default:
      f = null;
  }
  return f;
}

/**
 *
 * get the appropriate function for relation depending on the relation type(type can be 'belongsTo', 'polymorphic', etc.)
 * @param {String} type - type of relation
 * @returns {function} The matching relation validation function
 */
function validateRelations(type) {
  var relationFunc = null;
  switch (type) {
    case 'belongsTo':
      relationFunc = validateBelongsTo;
      break;
    case 'referencesMany':
      relationFunc = validateReferencesMany;
      break;
    default:
    // TODO other supported relations
  }
  return relationFunc;
}

/**
 *
 *   validate oeValidation rules written using expression language, it is used for custom type validations
 * @param {Object} obj - object containing validation rule details
 * @param {function} cb - callback function
 */
function validateExpression(obj, cb) {
  log.debug(obj.options, 'validateExpression invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  var rule = obj.value;
  var ast = obj.inst.constructor._ast;
  exprLang.traverseAST(ast[rule.expression], obj.inst, obj.options).then(function validateExpressionCb(result) {
    result = typeof result === 'boolean' ? result : result.value;
    if (result) {
      log.debug(obj.options, 'validateExpression rule passed for ', obj.inst.constructor.modelName, '->', obj.name);
      cb(null, null);
    } else {
      log.warn(obj.options, 'validateExpression rule violated');
      getValidationError(getErrorCode('oeValidation'), obj, function validateExpressionGetErrCb(error) {
        log.debug(obj.options, 'validateExpression error :', error);
        cb(null, error);
      });
    }
  });
}

/**
 *
 * validate oeValidation rule if it is of type reference
 * @param {Object} obj - object containing validation rule details
 * @param {function} cb - callback function
 */
function validateReferenceData(obj, cb) {
  log.debug(obj.options, 'validateReferenceData invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  var rule = obj.value;
  var refModel = rule.refModel;
  var ref = rule.refWhere;

  // FIXME: temporary change to make keyValue toLowerCase for comparison

  var mustacheView = obj.inst.toObject(true);
  mustacheView.lowerCase = function templateLowerCaseConversion() {
    return function caseConversionCallback(text, render) {
      var renderedValue = render(text);
      log.debug(obj.options, 'pre-render value : ', renderedValue);
      return renderedValue.toLowerCase();
    };
  };
  var refWhere = Mustache.render(ref, mustacheView);
  // FIXME: end of toLowerCase change
  // var refWhere = Mustache.render(ref, obj.inst.toObject(true));
  var refArray = refWhere.split(';');

  if (refArray[refArray.length - 1] === '') {
    refArray = refArray.slice(0, -1);
    var prop = getProperty(ref);
  }

  refArray = refArray.map(function addIndexToRefArray(d, i) {
    return {
      value: d,
      index: i
    };
  });

  try {
    var Model = loopback.getModel(refModel, obj.options);
    async.map(refArray, function validateReferenceDataAsyncCb(reference, callback) {
      applyReferenceRule(Model, reference, obj, callback);
    }, function validateReferenceDataAsyncEndCb(res, errors) {
      if (!errors || errors.length === 0) {
        log.debug(obj.options, 'validateReferenceData rule passed for ', obj.inst.constructor.modelName, '->', obj.name);
        cb(null, null);
      } else {
        errors = errors.filter(function getProperErrorObjects(d) {
          if (d) {
            return d;
          }
        });
        errors.forEach(function addProperPathToError(d) {
          if (prop) {
            d.path = d.path + '->' + prop + '[' + d.index + ']';
          }
          delete d.index;
        });
        log.debug(obj.options, 'validateReferenceData error :', errors);
        cb(null, errors);
      }
    });
  } catch (e) {
    var errorCode = obj.value.errorCode;
    obj.value.errorCode = e.message === 'Model not found: ' + refModel ? getErrorCode('noModelExists') : getErrorCode('invalidMustache');
    getValidationError(obj.value.errorCode, obj, function applyReferenceRuleGetErrCb(error) {
      obj.value.errorCode = errorCode;
      cb(null, error);
    });
  }
}

/**
 *
 * Returns the property from the mustache template
 * @param {String} query - mustache query
 * @returns {String} property name
 */
function getProperty(query) {
  // var re = /{{\#(.*)}}({.*});({{.*}})/;
  var re = /{{#([^}]*)}}.*/;
  var prop = re.exec(query);
  if ((prop) !== null) {
    if (prop.index === re.lastIndex) {
      re.lastIndex++;
    }
  }
  prop = prop[1];
  return prop;
}

/**
 *
 * inter model validation, query the refModel provided in the oeValidation rule
 * @param {function} Model - model constructor
 * @param {Object} ref - mustache query
 * @param {Object} obj - object containing validation rule details
 * @param {function} callback - callback function
 */

function applyReferenceRule(Model, ref, obj, callback) {
  var reference = JSON.parse(ref.value);
  var keys = Object.keys(reference);
  var where = {};
  var callContext = {};
  keys.forEach(function prepareQueryFilter(key) {
    if (key === 'callContext') {
      callContext = reference[key];
    } else if (key === 'where') {
      Object.keys(reference[key]).forEach(function getWhereClause(k) {
        where[k] = reference[key][k];
      });
    } else {
      where[key] = reference[key];
    }
  });
  if (Object.keys(where).length < 1) {
    return callback(null, null);
  }
  var filter = {
    'where': where
  };

  // Update the context for this call.
  var contextModified = false;
  var contextKeys = Object.keys(callContext);
  var scopekeys = Object.keys(obj.data.scope || {});
  if (contextKeys.length > 0 || scopekeys.length > 0) {
    var orgctx = obj.options.ctx;
    var newCtx = _.cloneDeep(orgctx);

    contextKeys.forEach(function addToContext(contextKey) {
      newCtx[contextKey] = this[contextKey];
    }, callContext);

    scopekeys.forEach(function validateRefDataScopeForEachFn(scopekey) {
      newCtx[scopekey] = this[scopekey];
    }, obj.data.scope);

    contextModified = true;
    obj.options.ctx = newCtx;
  }

  findRecord(Model, filter, obj, ref.index, function findRecordCallbackFn(res, error) {
    // Reset original context if it was modified.
    if (contextModified) {
      obj.options.ctx = orgctx;
    }
    callback(null, error);
  });
}

function findRecord(Model, filter, obj, index, callback) {
  Model.find(filter, obj.options, function applyReferenceRuleFindCb(err, result) {
    if (err) {
      callback(err);
    }
    if (!result || result.length === 0) {
      getValidationError(getErrorCode('oeValidation'), obj, function applyReferenceRuleGetErrCb(error) {
        error.index = index;
        callback(null, error);
      });
    } else {
      callback(null, null);
    }
  });
}

/**
 *
 * validate relations' based validation where relation type is 'belongsTo'
 * @param {Object} obj - object containing validation rule details
 * @param {function} cb - callback function
 */
function validateBelongsTo(obj, cb) {
  log.debug(obj.options, 'validateBelongsTo invoked  for : ', obj.inst.constructor.modelName);
  modelCheck(obj, function validateBelongsToCb(err, result) {
    if (err) {
      log.debug(obj.options, 'validateBelongsTo error :', err);
      cb(null, err);
    } else {
      var relation = result.value;
      if (obj.options && obj.options.transaction && obj.options.transaction.connection && obj.options.transaction.connection.opData) {
        var parent = obj.options.transaction.connection.opData.filter(function fnCheckParentInTransaction(txn) {
          return txn.model === relation.modelTo.modelName;
        });
        if (parent.length > 0) {
          return cb(null, null);
        }
      }
      // var Model = relation.modelTo;
      var polyMorphicModelToName = relation.polymorphic ? obj.data[relation.polymorphic.discriminator] : null;
      var modelTo = relation.modelTo ? relation.modelTo : polyMorphicModelToName;
      if (!modelTo) {
        return cb(null, null);
      }
      var Model = loopback.getModelByType(modelTo, obj.options);
      var pk = relation.keyTo;
      var fk = relation.keyFrom;
      var filter = {};
      var where = {};
      switch (relation.type) {
        case 'belongsTo':
          // FIXME: Temporary fix to support case insensitive relation check.
          var tranformFunc = obj.transformationFn;
          var objValueFk = obj.data[fk];
          if (objValueFk && tranformFunc) {
            if (tranformFunc === 'toLowerCase()') {
              objValueFk = objValueFk.toLowerCase();
            } else if (tranformFunc === 'toUpperCase()') {
              objValueFk = objValueFk.toUpperCase();
            }
          }
          if (objValueFk) {
            where[pk] = objValueFk;
            filter.where = where;
          } else {
            return cb(null, null);
          }
          // END FIXME
          var contextModified = false;
          if (obj.data.scope) {
            var orgctx = obj.options.ctx;
            var newCtx = _.cloneDeep(orgctx);
            Object.keys(obj.data.scope).forEach(function validateBelongsToScopeForEachFn(k) {
              newCtx[k] = this[k];
            }, obj.data.scope);
            contextModified = true;
            obj.options.ctx = newCtx;
          }

          Model.find(filter, obj.options, function validateBelongsToFindCb(error, result) {
            if (contextModified) {
              obj.options.ctx = orgctx;
            }
            if (obj.data[fk] && (!result || result.length === 0)) {
              log.warn(obj.options, 'validateBelongsTo rule violated');
              obj.name = fk;
              getValidationError(getErrorCode('relation'), obj, function validateBelongsToGetErrCb(error) {
                log.debug(obj.options, 'validateBelongsTo error :', error);
                cb(null, error);
              });
            } else {
              log.debug(obj.options, 'validateBelongsTo rule passed for ', obj.inst.constructor.modelName);
              cb(null, null);
            }
          });
          break;
        // TO-DO rest types of relation(has-one, has-many, etc.)
        default:
          log.debug(obj.options, 'validateBelongsTo rule passed for ', obj.inst.constructor.modelName);
          cb(null, null);
          break;
      }
    }
  });
}

/**
 *
 * validate relations' based validation where relation type is 'referencesMany'
 * @param {Object} obj - object containing validation rule details
 * @param {function} cb - callback function
 */
function validateReferencesMany(obj, cb) {
  modelCheck(obj, function validateReferencesManyCb(err, result) {
    if (err) {
      return cb(null, err);
    }

    var relation = result.value;
    var modelTo = relation.modelTo;
    if (!modelTo || relation.type !== 'referencesMany') {
      return cb(null, null);
    }
    var Model = loopback.getModelByType(modelTo, obj.options);
    var pk = relation.keyTo;
    var fk = relation.keyFrom;
    var filter = {fields: [pk], where: {}};
    var objValueFk = obj.data[fk];

    if (objValueFk) {
      filter.where[pk] = { inq: objValueFk};
    } else {
      return cb(null, null);
    }
    Model.find(filter, obj.options, function validateReferencesManyFindCb(error, result) {
      if (error) {
        return cb(null, error);
      }
      var userInput = JSON.parse(JSON.stringify(objValueFk));
      var fromDb = result.map(x=>JSON.parse(JSON.stringify(x[pk])));
      var diff = userInput.filter(x=>!fromDb.includes(x));
      if (diff.length) {
        getValidationError(getErrorCode('relation'), obj, function validateReferencesManyErrCb(error) {
          cb(null, error);
        });
      } else {
        cb(null, null);
      }
    });
  });
}


/**
 *
 * check if the model target model exists, whenever we declare a belongsTo relation
 * @param {Object} obj - object containing validation rule details
 * @param {function} callback - callback function
 */
function modelCheck(obj, callback) {
  // FIXME: Temporary fix to support case insensitive relation check
  // check whether any custom attribute passed
  var relationParams = obj.inst.constructor.settings.relations[obj.relationName];
  if ('transformationFn' in relationParams) {
    obj.transformationFn = relationParams.transformationFn;
  }
  // END FIXME

  var relation = obj.value;
  if (!(relation.modelTo instanceof Function) && !relation.keyTo && !relation.keyFrom) {
    relation = obj.inst.constructor.relations[obj.relationName];
    if (!relation) {
      getValidationError(getErrorCode('noModelExists'), obj, function modelCheckGetErrCb(error) {
        callback(error, null);
      });
    } else {
      obj.value = relation;
      // if foreign key is mandatory then only check for its presence
      if (obj.inst.constructor.settings.relations[obj.relationName].foreignKeyRequired) {
        fkCheck(obj, callback);
      } else {
        callback(null, obj);
      }
    }
  } else if (obj.inst.constructor.settings.relations[obj.relationName].foreignKeyRequired) {
    fkCheck(obj, callback);
  } else {
    callback(null, obj);
  }
}
/**
 *
 * check if the foreign key value is posted alongwith the model data
 * @param {Object} obj - object containing validation rule details
 * @param {function} callback - callback function
 */
function fkCheck(obj, callback) {
  var fk = obj.value.keyFrom;
  if (!obj.data[fk]) {
    getValidationError(getErrorCode('foreignKeyBlank'), obj, function fkCheckGetErrCb(error) {
      callback(error, null);
    });
  } else {
    callback(null, obj);
  }
}

function validateEnumtype(obj, cb) {
  log.debug(obj.options, 'validateEnumtype invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  var err = null;
  var code = getErrorCode('invalidEnumValue');
  if (blank(obj.data[obj.name])) {
    // value of the attribute/property which is undefined
    cb(null, err);
  } else if (typeof obj.data[obj.name] === 'string') {
    var enumModel = loopback.findModel(obj.value, obj.options);
    if (enumModel) {
      if (!enumModel.isValidEnum(obj.data[obj.name])) {
        log.warn(obj.options, 'validateEnumtype rule violated');
        getValidationError(code, obj, function validateEnumtypeGetErrCb(error) {
          log.debug(obj.options, 'validateEnumtype error :', error);
          err = error;
          cb(null, err);
        });
      } else {
        log.debug(obj.options, 'validateEnumtype rule passed for ', obj.inst.constructor.modelName);
        cb(null, null);
      }
    } else {
      log.warn(obj.options, 'validateEnumtype rule violated');
      code = getErrorCode('invalidEnumType');
      getValidationError(code, obj, function validateEnumtypeGetErr2Cb(error) {
        log.debug(obj.options, 'validateEnumtype error :', error);
        err = error;
        cb(null, err);
      });
    }
  } else {
    log.warn(obj.options, 'validateEnumtype rule violated');
    getValidationError(code, obj, function validateEnumtypeGetErr3Cb(error) {
      log.debug(obj.options, 'validateEnumtype error :', error);
      err = error;
      cb(null, err);
    });
  }
  return;
}

function validateXModel(obj, cb) {
  log.debug(obj.options, 'validateXModel invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  var err = null;
  var code = getErrorCode('invalidxmodelvalue');
  if (blank(obj.data[obj.name])) {
    // value of the attribute/property which is undefined
    cb(null, err);
  } else if (typeof obj.data[obj.name] === 'string') {
    log.debug(obj.options, 'To be validated: ', obj.data[obj.name], ' against ', obj.data[obj.name].xmodelvalidate);
    var Model = loopback.findModel(obj.value.model, obj.options);
    if (!Model) {
      cb(null, new Error('Invalid ' + obj.value.model + '-->' + obj.name + '. Should exist in ' + obj.value.xmodelvalidate.model));
    }
    var filter = {};
    filter[obj.value.field] = obj.data[obj.name];
    Model.findOne({
      where: filter
    }, obj.options, function xModelValidateFindCb(err, data) {
      if (err) {
        return cb(null, err);
      }
      if (!(data)) {
        getValidationError(code, obj, function xModelValidateErrCb(error) {
          err = error;
          err.retriable = false;
          cb(null, err);
        });
      } else {
        cb(null, null);
      }
    });
  } else {
    getValidationError(code, obj, function xModelValidateErr2Cb(error) {
      log.debug(obj.options, 'validateXModel error :', error);
      err = error;
      cb(null, err);
    });
  }
  return;
}

function validateRefCode(obj, cb) {
  log.debug(obj.options, 'validateRefCode invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  var err = null;
  var code = getErrorCode('invalidRefCodeValue');
  if (blank(obj.data[obj.name])) {
    // value of the attribute/property which is undefined
    cb(null, err);
  } else if (typeof obj.data[obj.name] === 'string') {
    var refCodeModel = loopback.findModel(obj.value, obj.options);
    if (refCodeModel) {
      refCodeModel.count({
        code: obj.data[obj.name]
      }, obj.options, function validateRefCodeCb(err, count) {
        if (count > 0) {
          log.debug(obj.options, 'validateRefCode rule passed for ', obj.inst.constructor.modelName);
          cb(null, null);
        } else {
          log.warn(obj.options, 'validateRefCode rule violated');
          getValidationError(code, obj, function validateRefCodeGetErrCb(error) {
            log.debug(obj.options, 'validateRefCode error :', error);
            err = error;
            cb(null, err);
          });
        }
      });
    } else {
      code = getErrorCode('invalidRefCodeType');
      log.warn(obj.options, 'validateRefCode rule violated');
      getValidationError(code, obj, function validateRefCodeGetErr2Cb(error) {
        log.debug(obj.options, 'validateRefCode error :', error);
        err = error;
        cb(null, err);
      });
    }
  } else {
    log.warn(obj.options, 'validateRefCode rule violated');
    getValidationError(code, obj, function validateRefCodeGetErr3Cb(error) {
      log.debug(obj.options, 'validateRefCode error :', error);
      err = error;
      cb(null, err);
    });
  }
  return;
}


function validateScriptInjection(obj, cb) {
  // log.debug(obj.options, 'validateScriptInjection invoked  for : ', obj.inst.constructor.modelName, '->', obj.name);
  var fieldValue = obj.data[obj.name];

  var tags = (app.get('scriptTag') || []).concat(['<script']);
  var invalidTag = false;
  tags.forEach(function (tag) {
    if (fieldValue && fieldValue.toString().toLowerCase().indexOf(tag) !== -1) {
      invalidTag = true;
    }
  });
  if (invalidTag) {
    getValidationError(getErrorCode('scriptInjection'), obj, function getValidationErrorCbFn(error) {
      cb(null, error);
    });
  } else {
    cb(null, null);
  }

  return;
}


/**
 *
 * get the error code depending on the type of validation/rule
 * @param {String} type - type of validation rule
 * @returns {String} error code
 */
function getErrorCode(type) {
  // default error details
  var errDetails = app.errorDetails;
  var err = errDetails.filter(function getErrorCodeCb(d) {
    return d.type === type;
  });
  return err[0].code;
}

module.exports = {
  applicableValidations: applicableValidations,
  validationExpressionMapper: validationExpressionMapper
};
