/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 * This script is used to load data into the database.
 * It iterates through entries in a starting file (meta.json) and loads
 * the data corresponding to each entry synchronously.
 *
 * meta.json includes the context data as well that needs to be applied for each file entry.
 *
 * @memberof Boot Scripts
 * @author Sambit Kumar Patra
 * @name ErrorResponse
 */

var fs = require('fs');
var path = require('path');
// Base directory from where data needs to be loaded
// This folder needs to contain meta.json. See meta.json for format.
// The actual data (records in the form of JSON array) can be present
// either directly in this base directory, or in sub-dirs. The "files.file"
// property in meta.json needs to correspond to the relative path
// inside this base directory.
var dir = path.join(__dirname, '/../../seed/');

module.exports = function ErrorResponse(app, cb) {
  // Read the ErrorDetail.json file
  try {
    var datatext = fs.readFileSync(dir + '/ErrorDetail.json', 'utf-8');
    app.errorDetails = JSON.parse(datatext);
    cb();
  } catch (e) {
    cb();
    return;
  }
};
