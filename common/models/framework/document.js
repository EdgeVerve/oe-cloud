/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
* @classdesc This Model provides the functionality to upload any file.
* Additionally User can also Delete and View the uploaded files.
*
* @kind class
* @class Document
* @author Sambit Kumar Patra
*/

var config = require('../../../server/config.js');

module.exports = function DocumentFn(Document) {
  /**
* This 'before remote' hook is used to intercept data
* POSTed to Document model, validate the file extension
* and pass the maximum allowed file size in limits object
* @param {object} ctx - context object
* @param {object }modelInstance - data posted
* @param {function} next - next middleware function
* @function fileUploadBeforeRemoteFn
*/
  Document.beforeRemote('upload', function fileUploadBeforeRemoteFn(ctx, modelInstance, next) {
    var limits = { fileSize: config.maxFileSize ? config.maxFileSize * 1024 : null };
    ctx.req.limits = limits;
    ctx.req.supportedFileExtns = config.supportedFileExtns && config.supportedFileExtns.length > 0 ? config.supportedFileExtns : null;
    ctx.req.fileNamePattern = config.fileNamePattern ? config.fileNamePattern : null;
    next();
  });
};
