/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var logger = require('oe-logger');
var log = logger('secrets-manager');

var cfenv = require('cfenv');
var fs = require('fs');
var path = require('path');

/**
 * Function provides functionality to populate secrets in env variables.
 *
 * @function populateSecrets
 */
function populateSecrets() {
  var appEnv = cfenv.getAppEnv();
  var orchestrator = process.env.ORCHESTRATOR;

  switch (orchestrator) {
    case 'PCF':
      try {
        var pcfServices = process.env.PCF_SERVICES ? JSON.parse(process.env.PCF_SERVICES) : [];
        if (pcfServices) {
          pcfServices.forEach(function (pcfService) {
            var service = appEnv.getServices()[pcfService];
            var serviceCredentials = service ? service.credentials : service;
            if (serviceCredentials) {
              Object.keys(serviceCredentials).forEach(function (property) {
                process.env[property] = serviceCredentials[property];
              });
            }
          });
        }
      } catch (e) {
        log.debug('No PCF secrets available ', e);
        log.info('No PCF secrets available ', e);
      }
      break;
    case 'DockerSwarm':
      try {
        var DOCKER_SECRETS_FOLDER = process.env.DOCKER_SECRETS_FOLDER || '/run/secrets/';
        var secretFiles = fs.readdirSync(DOCKER_SECRETS_FOLDER);
        secretFiles.forEach(secretFile => {
          process.env[secretFile] = fs.readFileSync(path.join(DOCKER_SECRETS_FOLDER, secretFile), 'utf8');
        });
      } catch (e) {
        log.debug('No Docker secrets available', e);
        log.info('No Docker secrets available', e);
      }
      break;
    case 'OpenShift':
      break;
    default:
      break;
  }
}

module.exports = { populateSecrets: populateSecrets };
