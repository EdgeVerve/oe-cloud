/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This file defines encryption-decryption routines for
 * various algorithms and exports the same with the name
 * of the crypto-module. This exported object is used in
 * BaseEntity.js (and hence by all Models deriving from it)
 * to encrypt and decrypt model properties that are marked
 * for encryption by "encrypt" : true
 *
 * To add a new module/algorithm, one has to add a function to
 * this file and assign it to a variable, preferably named
 * after the crypto-module. Within this crypto-function, define two
 * functions, one to encrypt and one to decrypt, and assign them
 * to "this.encrypt" and "this.decrypt". Next, add an entry
 * to the exported object, with key as the name of the crypto-module
 * and value as the variable used to assign the crypto-function.
 *
 * @module EV Encryption
 * @author Ajith Vasudevan
 */

// var debug = require('debug')('ev-encryption');
var logger = require('./logger');
var log = logger('ev-encryption');

/**
 * This function encapsulates the encryption-decryption  routines
 * within the NodeJS 'crypto' module. It supports various OpenSSL-supported
 * algorithms like 'aes-256-ctr'. This function takes an object parameter
 * which has 'algorithm' and 'password' members.
 * If the algorithm is not supplied, it defaults to 'aes-256-ctr'.
 * If the password is not supplied, it defaults to 'yufyrh3489j4389d'.
 * @param {object} o - options like algorithm, password etc
 */
var moduleCrypto = function EvEncryption(o) {
  log.debug(log.defaultContext(), 'Entered crypto');
  var crypto = require('crypto');

  var algorithm = 'aes-256-ctr';
  if (o && o.algorithm) {
    algorithm = o.algorithm;
    log.debug(log.defaultContext(), 'Algorithm was supplied');
  } else {
    log.debug(log.defaultContext(), 'Algorithm was not supplied. Using default.');
  }
  log.debug(log.defaultContext(), 'Algorithm used:', algorithm);
  var password = 'yufyrh3489j4389d';
  if (o && o.password) {
    password = o.password;
    log.debug(log.defaultContext(), 'Password was supplied');
  } else {
    log.debug(log.defaultContext(), 'Password was not supplied. Using default.');
  }

  this.encrypt = function encrypt(text) {
    log.debug(log.defaultContext(), 'Entered encrypt');
    var cipher = crypto.createCipher(algorithm, password);

    var crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
  };

  this.decrypt = function decrypt(text) {
    log.debug(log.defaultContext(), 'Entered decrypt');
    var decipher = crypto.createDecipher(algorithm, password);

    var dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  };
};

module.exports = {
  'crypto': moduleCrypto
};
