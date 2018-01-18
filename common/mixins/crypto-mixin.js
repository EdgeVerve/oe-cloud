/**
*
* ©2016-2018 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
* Bangalore, India. All Rights Reserved.
*
*/

var encryption = require('../../lib/encryption');
var logger = require('oe-logger');
var config = require('../../server/config.js');

var log = logger('crypto-mixin');

module.exports = function CryptoMixin(Model) {
  if (Model.modelName === 'BaseEntity') {
    return;
  }
  Model.settings.propsToEncrypt = [];

  var props = Model.definition.properties;
  for (var key in props) {
    if (props.hasOwnProperty(key)) {
      var propprops = Model.definition.properties[key];
      if (propprops.encrypt && propprops.type.name.toLowerCase() === 'string') {
        Model.settings.propsToEncrypt.push(key);
      }
    }
  }

  if ((Model.settings.overridingMixins && !Model.settings.overridingMixins.SoftDeleteMixin) || !Model.settings.mixins.CryptoMixin) {
    Model.evRemoveObserver('before save', cryptoMixinBeforeSaveHook);
    Model.evRemoveObserver('after accesss', cryptoMixinAfterAccessHook);
  } else {
    Model.evObserve('before save', cryptoMixinBeforeSaveHook);
    Model.evObserve('after accesss', cryptoMixinAfterAccessHook);
  }
};

/**
 * This 'before save' hook is used to intercept data being
 * POSTed using the Loopback API and encrypt properties
 * (which are marked with an "encrypt" : true ) before saving
 * the data to database. Thus the database will only contain
 * encrypted values for these properties. This feature is
 * applicable to Models that derive from BaseEntity only.
 * Ajith
 */

function cryptoMixinBeforeSaveHook(ctx, next) {
  if (ctx.Model.settings.propsToEncrypt && ctx.Model.settings.propsToEncrypt.length === 0) {
    return next();
  }
  var data = ctx.instance || ctx.data;
  log.debug(ctx.options, 'cryptoMixin before save called: ModelName =', ctx.Model.modelName);
  var props = ctx.Model.definition.properties;
  ctx.Model.settings.propsToEncrypt.forEach(function (key) {
    if (props.hasOwnProperty(key)) {
      log.debug(ctx.options, 'To be encrypted:', key, data[key]);
      data[key] = encrypt(data[key]);
      log.debug(ctx.options, 'After encryption:', key, data[key]);
    }
  });
  next();
}

/**
 * The function encrypts the specified string argument
 * using the algorithm and password specified in
 * config.json (priority given to application config)
 * and returns the resulting encrypted value as a string.
 * @param {string}str - string to encrypt
 * @returns {string} - encrypted string
 * Ajith
 */
function encrypt(str) {
  log.debug(log.defaultContext(), 'INFO: Encryption Algorithm defined in config.json is', '\'', config.encryptionAlgorithm, '\'');
  var module = config.encryptionAlgorithm.split('.')[0];
  var algo = config.encryptionAlgorithm.split('.')[1];
  var pwd = config.encryptionPassword;
  if (!encryption) {
    log.error(log.defaultContext(), 'ERROR: Encryption module is not available');
    var err = new Error('ERROR: Encryption module is not available');
    err.retriable = false;
    throw err;
  }
  if (!encryption[module]) {
    log.warn(log.defaultContext(), 'WARNING: Encryption algorithm module', module, 'defined in config.json (e.g., "encryptionAlgorithm": "', config.encryptionAlgorithm, '") is not implemented. Falling back to crypto');
    module = 'crypto';
  }
  var encrypter = new encryption[module]({
    'algorithm': algo,
    'password': pwd
  });
  return encrypter.encrypt(str);
}

/**
 * This 'after accesss' hook is used to intercept data
 * fetched from the database, before it is sent to the
 * client requesting for it. Here, the properties
 * (which are marked with an "encrypt" : true ) are
 * decrypted and the data is sent to the client.
 *
 * Ajith
 */

function cryptoMixinAfterAccessHook(ctx, next) {
  if (ctx.Model.settings.propsToEncrypt && ctx.Model.settings.propsToEncrypt.length === 0) {
    return next();
  }
  var data = ctx.instance || ctx.currentInstance || ctx.data || ctx.accdata;
  var props = ctx.Model.definition.properties;
  data.forEach(function (item) {
    ctx.Model.settings.propsToEncrypt.forEach(function (key) {
      if (props.hasOwnProperty(key)) {
        log.debug(ctx.options, 'To be decrypted:', key, item[key]);
        item[key] = decrypt(item[key]);
        log.debug(ctx.options, 'After decryption:', key, item[key]);
      }
    });
  });
  next();
}

/**
 * The function decrypts the specified string argument
 * using the algorithm and password specified in
 * config.json (priority given to application config)
 * and returns the resulting decrypted value as a string.
 * @param {string}str - string to decrypt
 * @returns {string} - decrypted string
 * Ajith
 */
function decrypt(str) {
  log.debug(log.defaultContext(), 'INFO: Encryption Algorithm defined in config.json is', '\'', config.encryptionAlgorithm, '\'');
  var module = config.encryptionAlgorithm.split('.')[0];
  var algo = config.encryptionAlgorithm.split('.')[1];
  var pwd = config.encryptionPassword;
  if (!encryption) {
    log.error(log.defaultContext(), 'ERROR: Decryption module is not available');
    var err = new Error('ERROR: Decryption module is not available');
    err.retriable = false;
    throw err;
  }
  if (!encryption[module]) {
    log.warn(log.defaultContext(), 'WARNING: Decryption algorithm module', module, 'defined in config.json (e.g., "encryptionAlgorithm": "', config.encryptionAlgorithm, '") is not implemented. Falling back to crypto');
    module = 'crypto';
  }
  var encrypter = new encryption[module]({
    'algorithm': algo,
    'password': pwd
  });
  var result = '**********';
  try {
    result = encrypter.decrypt(str);
  } catch (e) {
    log.error(log.defaultContext(), e);
  }
  return result;
}
