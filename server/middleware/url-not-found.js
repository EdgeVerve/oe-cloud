/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
module.exports = function urlNotFound() {
  return function raiseUrlNotFoundError(req, res, next) {
    var msg = 'Not Found';
    res.status(404).end(msg);
    next();
  };
};

