/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This module defines and exports a function called 'autofields'
 * which takes two parameters - a string pattern and a callback function.
 * The function retrieves the a value based on the specified pattern
 * and returns this via the callback.
 *
 *   This function is used in base-entity.js to automatically
 *   populate model fields declared to be auto-populated.
 *  @module EV Auto Fields
 *  @author Ajith Vasudevan
 */

// var debug = require('debug')('auto-fields');
var tfs = require('./tenant-util').tenantfns;
var logger = require('./logger');
var log = logger('auto-fields');

var autofields = function AutoFields(p, options, cb) {
  log.debug('Entered autofields', p);
  if (p && p.pattern) {
    var source;
    var key;
    var dotIndex = p.pattern.indexOf('.');
    if (dotIndex > -1) {
      source = p.pattern.substring(0, dotIndex);
      key = p.pattern.substring(dotIndex + 1);
    } else {
      source = p.pattern;
      key = '';
    }
    log.debug(options, 'source, key', source, key);
    if (source && typeof key !== 'undefined' && key !== null) {
      // We are not storing options.req any more as it may be costly
      // so if you need anything from req
      // probably best is to put in callContext
      // and then use from callContext
      // May be we can have a generic middleware to set CallContext
      // from req
      tfs[source](source, key, options, options.req, cb);
    }
  }
};

module.exports = autofields;
