// Atul : This file contains code for coerce() function. This is called by loopback whenever find() is called, directly
// or indirectly. This function is overriden from loopback's version because oe-cloud added new operator - 'contains'
// this new operator is not recognized by loopback. And also oe-cloud directly uses mongo commands with special mongo specific
// operator. This overriden function handles that.
// TODO: there is a way not to override this and configure it. latest loopback supports custom operators
// Need to look at 'allowExtendedOperators'
var loopback = require('loopback');
var DataSource = loopback.DataSource;
var DataAccessObject = DataSource.DataAccessObject;
var geo = require('loopback-datasource-juggler/lib/geo');
var BaseModel = require('loopback-datasource-juggler/lib/model');
var utils = require('loopback-datasource-juggler/lib/utils');
var g = require('strong-globalize')();

var operators = {
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  between: 'BETWEEN',
  inq: 'IN',
  nin: 'NOT IN',
  neq: '!=',
  like: 'LIKE',
  nlike: 'NOT LIKE',
  regexp: 'REGEXP',
  contains: 'contains'
};
function DateType(arg) {
  var d = new Date(arg);
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date: ' + arg);
  }
  return d;
}

function BooleanType(arg) {
  if (typeof arg === 'string') {
    switch (arg) {
      case 'true':
      case '1':
        return true;
      case 'false':
      case '0':
        return false;
      default:
        return false;
    }
  }
  if (arg === null) {
    return null;
  }
  return Boolean(arg);
}

function NumberType(val) {
  var num = Number(val);
  return !isNaN(num) ? num : val;
}

function coerceArray(val) {
  if (Array.isArray(val)) {
    return val;
  }

  if (!utils.isPlainObject(val)) {
    throw new Error(g.f('Value is not an {{array}} or {{object}} with sequential numeric indices'));
  }

  var arrayVal = new Array(Object.keys(val).length);
  for (var i = 0; i < arrayVal.length; ++i) {
    if (!val.hasOwnProperty(i)) {
      throw new Error(g.f('Value is not an {{array}} or {{object}} with sequential numeric indices'));
    }

    arrayVal[i] = val[i];
  }

  return arrayVal;
}
/* eslint-disable new-cap */
/* eslint-disable no-eq-null */
/* eslint-disable eqeqeq */
/* eslint-disable default-case */
/* eslint-disable guard-for-in */
DataAccessObject._coerce = function (where, options) {
  var self = this;
  if (!where) {
    return where;
  }

  options = options || {};
  var props = self.definition.properties;

  var err;
  if (typeof where !== 'object' || Array.isArray(where)) {
    err = new Error(g.f('The where clause %j is not an {{object}}', where));
    err.statusCode = 400;
    throw err;
  }

  for (var p in where) {
    // Handle logical operators
    if (p === 'and' || p === 'or' || p === 'nor') {
      var clauses = where[p];
      try {
        clauses = coerceArray(clauses);
      } catch (e) {
        err = new Error(g.f('The %s operator has invalid clauses %j: %s', p, clauses, e.message));
        err.statusCode = 400;
        throw err;
      }

      for (var k = 0; k < clauses.length; k++) {
        self._coerce(clauses[k], options);
      }

      continue;
    }

    if (p.match(/\./)) {
      var model = p.split('.')[0];
      var prop = p.split('.').slice(1);

      if (props[model]) {
        var clause = {};
        clause[prop] = where[p];
        var type = Array.isArray(props[model].type) ? props[model].type[0] : props[model].type;
        if (type && type.definition && type.definition.properties) {
          where[p] = self._coerce(clause, type.definition.properties)[prop];
          continue;
        }
        // else fall-back to old/default coercion

        continue;
      }
    }

    var DataType = props[p] && props[p].type;
    if (!DataType) {
      continue;
    }
    if (Array.isArray(DataType) || DataType === Array) {
      DataType = DataType[0];
    }
    if (DataType === Date) {
      DataType = DateType;
    } else if (DataType === Boolean) {
      DataType = BooleanType;
    } else if (DataType === Number) {
      // This fixes a regression in mongodb connector
      // For numbers, only convert it produces a valid number
      // LoopBack by default injects a number id. We should fix it based
      // on the connector's input, for example, MongoDB should use string
      // while RDBs typically use number
      DataType = NumberType;
    }

    if (!DataType) {
      continue;
    }

    if (DataType.prototype instanceof BaseModel) {
      continue;
    }

    if (DataType === geo.GeoPoint) {
      // Skip the GeoPoint as the near operator breaks the assumption that
      // an operation has only one property
      // We should probably fix it based on
      // http://docs.mongodb.org/manual/reference/operator/query/near/
      // The other option is to make operators start with $
      continue;
    }

    var val = where[p];
    if (val === null || val === undefined) {
      continue;
    }
    // Check there is an operator
    var operator = null;
    var exp = val;
    if (val.constructor === Object) {
      for (var op in operators) {
        if (op in val) {
          val = val[op];
          operator = op;
          switch (operator) {
            case 'inq':
            case 'nin':
            case 'between':
              try {
                val = coerceArray(val);
              } catch (e) {
                err = new Error(g.f('The %s property has invalid clause %j: %s', p, where[p], e));
                err.statusCode = 400;
                throw err;
              }

              if (operator === 'between' && val.length !== 2) {
                err = new Error(g.f(
                  'The %s property has invalid clause %j: Expected precisely 2 values, received %d',
                  p,
                  where[p],
                  val.length));
                err.statusCode = 400;
                throw err;
              }
              break;
            case 'like':
            case 'nlike':
            case 'ilike':
            case 'nilike':
              if (!(typeof val === 'string' || val instanceof RegExp)) {
                err = new Error(g.f(
                  'The %s property has invalid clause %j: Expected a string or RegExp',
                  p,
                  where[p]));
                err.statusCode = 400;
                throw err;
              }
              break;
            case 'regexp':
              val = utils.toRegExp(val);
              if (val instanceof Error) {
                val.statusCode = 400;
                throw err;
              }
              break;
          }
          break;
        }
      }
    }

    try {
      // Coerce val into an array if it resembles an array-like object
      val = coerceArray(val);
    } catch (e) {
      // NOOP when not coercable into an array.
    }

    // Coerce the array items
    if (Array.isArray(val)) {
      for (var i = 0; i < val.length; i++) {
        if (val[i] !== null && val[i] !== undefined) {
          val[i] = DataType(val[i]);
        }
      }
    } else if (val != null) {
      var allowExtendedOperators = self._allowExtendedOperators(options);
      if (operator === null && val instanceof RegExp) {
        // Normalize {name: /A/} to {name: {regexp: /A/}}
        operator = 'regexp';
      } else if (operator === 'regexp' && val instanceof RegExp) {
        // Do not coerce regex literals/objects
      } else if (val && val.not && val.not.$elemMatch && val.not.$elemMatch.$nin) {
        // do nothing
      } else if (allowExtendedOperators && typeof val === 'object') {
        // Do not coerce object values when extended operators are allowed
      } else if (!((operator === 'like' || operator === 'nlike' ||
          operator === 'ilike' || operator === 'nilike') && val instanceof RegExp)) {
        val = DataType(val);
      }
    }
    // Rebuild {property: {operator: value}}
    if (operator) {
      var value = {};
      value[operator] = val;
      if (exp.options) {
        // Keep options for operators
        value.options = exp.options;
      }
      val = value;
    }
    where[p] = val;
  }
  return where;
};


/* eslint-enable new-cap */
/* eslint-enable no-eq-null */
/* eslint-enable eqeqeq */
/* eslint-enable default-case */
/* eslint-enable guard-for-in */
