/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * This boot script brings ability to add custom Trusted CA Certs to https globalAgent.
 *
 * @memberof Boot Scripts
 * @author Pradeep Kumar Tippa
 * @name Trusted CA Certs
 */
var fs = require('fs');
var path = require('path');
var https = require('https');
var log = require('oe-logger')('trusted-ca-certs');

var caAll = https.globalAgent.options.ca || [];

module.exports = function TrustedCACerts(app, cb) {
  var certsPath = process.env.TRUSTED_CA_CERTS_DIR;
  var caCertsFile = process.env.SYSTEM_CA_CERT_FILE_PATH || '/etc/ssl/certs/ca-certificates.crt';
  if (certsPath && fs.existsSync(certsPath)) {
    log.debug(log.defaultContext(), 'Trusted CA Certs directory exists, reading certificates in it.');
    fs.readdir(certsPath, function (err, certFiles) {
      if (err) {
        log.error(log.defaultContext(), 'Error while reading certs directory ', err);
        cb();
      } else {
        certFiles.forEach(function (certFile) {
          var certPath = path.join(certsPath, certFile);
          log.debug(log.defaultContext(), 'Adding certificate ', certPath, ' to ca-certs');
          addTocaAll(certPath);
        });
        // only replace ca certs if we found certs and add system ca cert.
        if (caAll && caAll.length) {
          log.debug(log.defaultContext(), 'Adding system ca-cert ', caCertsFile);
          addTocaAll(caCertsFile);
          https.globalAgent.options.ca = caAll;
        }
        cb();
      }
    });
  } else {
    cb();
  }
};

function addTocaAll(certPath) {
  try {
    var caInfo = fs.readFileSync(certPath, { encoding: 'utf8'} );
    var caList = splitCa(caInfo);
    for (var j = 0; j < caList.length; j++) {
      caAll.push(caList[j]);
    }
  } catch (error) {
    log.error(log.defaultContext(), 'Error while reading file ', certPath, '. Error: ', error);
  }
}

function splitCa(chain, split) {
  split = typeof split !== 'undefined' ? split : '\n';

  var ca = [];
  if (chain.indexOf('-END CERTIFICATE-') < 0 || chain.indexOf('-BEGIN CERTIFICATE-') < 0) {
    log.error(log.defaultContext(), "File does not contain 'BEGIN CERTIFICATE' or 'END CERTIFICATE'");
    return ca;
  }
  chain = chain.split(split);
  var cert = [];
  var _i;
  var _len;
  for (_i = 0, _len = chain.length; _i < _len; _i++) {
    var line = chain[_i];
    if (!(line.length !== 0)) {
      continue;
    }
    cert.push(line);
    if (line.match(/-END CERTIFICATE-/)) {
      ca.push(cert.join(split));
      cert = [];
    }
  }
  return ca;
}
