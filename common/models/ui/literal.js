/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
* @classdesc This model stores the literal translations generally (but not limited to) scoped for `locale`.
* The model has following properties
* Property |              Description
* ---------|-------------------------------
* `key`    | literal key
* `value`  | translation value
*
* A custom remote route Literals/render/* returns all the scope applicable records as hash-map (as opposed to array of records) where `key` becomes the hash-map key as well.
* Following two records :
* [
*	{key: "total", "value": "Total"},
*	{key: "username", "value": "User Name"}
* ]
*
* are returned as
* {
*	"total": {
*        "message": "Total"
*    },
*    "username": {
*        "message": "User Name"
*    }
* }
*
* @kind class
* @class Literal
* @author Rohit Khode
*/

module.exports = function Literal(Literal) {
  var placeholderRegex = /\$\w+\$/g;
  var prepareAndSendData = function prepareAndSendData(data, cb) {
    var response = {};
    for (var i = 0; data && i < data.length; i++) {
      var item = data[i];
      response[item.key] = {
        message: item.value
      };

      var phNames = item.placeholders;
      var placeholders = {};
      var idx = 0;
      if (phNames) {
        for (idx = 0; idx < phNames.length; idx++) {
          var ph = phNames[idx];
          placeholders[ph] = { content: '$' + (idx + 1) };
        }
        response[item.key].placeholders = placeholders;
      } else {
        var matches = item.value.match(placeholderRegex);
        if (matches) {
          for (idx = 0; idx < matches.length; idx++) {
            var match = matches[idx];
            placeholders[match.substr(1, match.length - 2)] = { content: '$' + (idx + 1) };
          }
          response[item.key].placeholders = placeholders;
        }
      }
    }
    cb(null, response);
  };

  /**
  * Custom remote method to fetch set of Literals as hash-map.
   * @param  {string} locale - file name for locale
   * @param  {object} req - request
   * @param  {object} options - callcontext options
   * @param  {function} cb - callback function
   */
  Literal.getLocaleData = function getLocaleData(locale, req, options, cb) {
    if (!cb && typeof options === 'function') {
      cb = options;
      options = {};
    }

    if (locale && locale.endsWith('.json')) {
      locale = locale.substring(0, locale.length - 5);
    }

    // ignoring the locale passed.
    // this is being picked up from request-header in the scope.
    var filter = {};

    Literal.find(filter, options, function literalFindCb(err, data) {
      if (err) {
        cb(err);
      }
      if (!data) {
        data = [];
      }
      prepareAndSendData(data, cb);
    });
  };

  Literal.remoteMethod(
    'getLocaleData', {
      returns: [{
        type: 'object',
        root: true,
        description: 'return value'
      }],
      accepts: [{
        arg: 'locale',
        type: 'string',
        http: {
          source: 'path'
        }
      },
      {
        arg: 'req',
        type: 'object',
        http: {
          source: 'req'
        }
      }],
      http: {
        path: '/render/:locale',
        verb: 'get'
      }
    }
  );
};
