/**
 *
 * �2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
function initWrapper() {
  require('./model-builder-wrapper');
  require('./dao-wrapper');
  require('./relation-definition');
  return true;
}

module.exports.initWrapper = initWrapper;


