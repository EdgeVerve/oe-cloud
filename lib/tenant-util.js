/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
 *
 * Introduction:<br>
 * This utility script exports a function called 'getTenantId'.
 * This function returns the tenantId for a given application
 * configuration and context. It returns the result via a callback
 * function.<br><br>
 *
 * Configuration:<br>
 * The application configuration is in the form of two config.json
 * parameters 'tenantsource' and 'tenantkey'. These parameters determine,
 * at an application instance level, the source from which the tenantId
 * has to be obtained. Sources (tenantsource) can be any of -
 * <pre>
 * BODY		    - the http request body, taken as a JSON
 * QUERY		- the http request query parameters, taken as a JSON
 * HEADER		- the http request headers
 * COOKIE		- the http request cookies
 * REQUEST		- the http request, taken as a JSON (as in Express)
 * CTX			- the Loopback Context
 * CALLCONTEXT	- the 'callContext' object from CTX
 * ACCESSTOKEN	- the access_token from the http request
 * USER		    - the User instance associated with the currently logged in user
 * USERPROFILE	- the UserProfile instance associated with the currently logged in user
 * </pre>
 * The 'tenantkey' determines the key under which the tenantId has to be
 * searched for, within the tenantsource.<br>
 * The 'tenantkey' can be specified as a string comprising of a series of
 * sub-strings separated by dots ('.').<br>
 * For e.g., if the tenantsource is ACCESSTOKEN and we know that the tenantId is
 * available in the AccessToken as <br>
 * accessToken =  { ttl: 1209600,<br>
 * created: Sat Feb 27 2016 15:18:19 GMT+0530 (India Standard Time),<br>
 * userId: 1001, id: 'd9LhkrI8W3weMEuS7lF76WOZcWTIGHrdfuujBBcxmx5oIeHsbZRsLc2aS5FLhtRn',<br>
 * user: { name: 'Ajith', tenant_id: 'EV'} }, <br>
 * then 'tenantkey' could be specified as "user.tenant_id" <br><br>
 *
 * Context:<br>
 * The context for tenantId determination is supplied to this function via two parameters -
 * <pre>
 * ctx - the loopback context
 * req - the current http request
 * </pre>
 *
 * Need for this function:<br>
 * The datasource is switched based on tenantId in common/mixins/switch-datasource-mixin.js
 * This function is used in this mixin to retrieve the tenantId for switching datasource.
 *
 * @module EV Tenant Util
 * @author:  Ajith Vasudevan
 *
 */

var loopback = require('loopback');
var _ = require('lodash');
var config = require('../server/config');
var logger = require('./logger');
var log = logger('tenant-util');

// Get tenantsource and tenantkey from config.json.
// Application config is preferred first. If 'tenantsource'
// is not defined there, it is fetched from foundation config.
// Default these to HEADER and 'tenant_id' respectively
var tenantsource = null;
var tenantkey = null;

if (config && config.tenantsource) {
  tenantsource = config.tenantsource;
  tenantkey = config.tenantkey || 'tenant_id';
  log.debug(log.defaultContext(), 'getTenantId():', 'config loaded from:', config.app);
} else {
  tenantsource = 'HEADER';
  tenantkey = 'tenant_id';
  log.debug(log.defaultContext(), 'getTenantId():', 'config not available in all or foundation. loading defaults (tenantsource=HEADER, tenantkey=tenant_id)');
}
log.debug(log.defaultContext(), 'getTenantId():', 'tenantsource = ', tenantsource);
log.debug(log.defaultContext(), 'getTenantId():', 'tenantkey    = ', tenantkey);

/** This function returns the tenantId for a given application
 * configuration and context.
 *
 * @param {object} ctx - The Loopback Context.
 * @param {object} req - The request object
 * @param {function} cb - The callback function. It has the following params -<br>tenantId, tenantsource, tenantkey
 * @returns {function}cb - The callback function. It has the following params -<br>tenantId, tenantsource, tenantkey
 */
var getTenantId = function getTenantId(ctx, req, cb) {
  log.debug(ctx.options, 'getTenantId(): Called');
  if (tenantkey === '') { return cb(tenantsource, tenantsource, tenantkey); }
  // Get the applicable tenant id determining function or
  // 'tenant function' based on 'tenantsource'
  var tenantfn = tenantfns[tenantsource];
  log.debug(ctx.options, 'tenantfn: ', (tenantfn ? '' : 'NOT'), ' available for tenantsource = ', tenantsource);

  // Call 'tenant function' if available
  if (tenantfn) {
    tenantfn(tenantsource, tenantkey, ctx, req, cb);
  } else {
    log.warn(ctx.options, 'WARNING:', 'tenant-util:', 'tenantfn is not defined for tenantsource', tenantsource, '. Returning tenantId = null');
    cb(null, tenantsource, tenantkey);
  }
};

// 'tenantfns' is an object holding all the available 'tenant id determining functions'
// See module documentation at teh top of this file for details.
var tenantfns = {
  BODY: function tenantUtilBodyFn(tenantsource, tenantkey, ctx, req, cb) {
    log.debug(ctx.options, 'BODY', 'tenantsource=', tenantsource, ', tenantkey=', tenantkey, ', ctx=', ctx, ', req=', (req ? ' its there!' : 'it\'s not there!'));
    log.debug(ctx.options, 'BODY', (req && !req.body ? 'No body in the req' : (req ? 'Got body map in the req' : 'No req received!')));
    log.debug(ctx.options, 'BODY', (req && req.body && !req.body[tenantkey] ? 'No data for this tenantkey' : (req && req.body ? 'Got data for this tenantkey' : 'req or req.body is undefined or null')));
    log.debug(ctx.options, 'BODY', 'body = ', (req && req.body));
    var tenantId = req && req.body && req.body[tenantkey];
    log.debug(ctx.options, 'BODY', 'tenant_id = ', tenantId);
    if (tenantkey === '') { cb(req.body, tenantsource, tenantkey); } else { cb(tenantId, tenantsource, tenantkey); }
  },
  QUERY: function tenantUtilQueryFn(tenantsource, tenantkey, ctx, req, cb) {
    log.debug(ctx.options, 'QUERY', 'tenantsource=', tenantsource, ', tenantkey=', tenantkey, ', ctx=', ctx, ', req=', (req ? ' its there!' : 'it\'s not there!'));
    log.debug(ctx.options, 'QUERY', (req && !req.query ? 'No query in the req' : (req ? 'Got query map in the req' : 'No req received!')));
    log.debug(ctx.options, 'QUERY', (req && req.query && !req.query[tenantkey] ? 'No data for this tenantkey' : (req && req.query ? 'Got data for this tenantkey' : 'req or req.query is undefined or null')));
    log.debug(ctx.options, 'QUERY', 'query = ', (req && req.query));
    var tenantId = req && req.query && req.query[tenantkey];
    log.debug(ctx.options, 'QUERY', 'tenant_id = ', tenantId);
    if (tenantkey === '') { cb(req.query, tenantsource, tenantkey); } else { cb(tenantId, tenantsource, tenantkey); }
  },
  HEADER: function tenantUtilHeaderFn(tenantsource, tenantkey, ctx, req, cb) {
    log.debug(ctx.options, 'HEADER', 'tenantsource=', tenantsource, ', tenantkey=', tenantkey, ', ctx=', ctx, ', req=', (req ? ' its there!' : 'it\'s not there!'));
    log.debug(ctx.options, 'HEADER', (req && !req.headers ? 'No headers in the req' : (req ? 'Got headers map in the req' : 'No req received!')));
    log.debug(ctx.options, 'HEADER', (req && req.headers && !req.headers[tenantkey] ? 'No data for this tenantkey' : (req && req.headers ? 'Got data for this tenantkey' : 'req or req.headers is undefined or null')));
    log.debug(ctx.options, 'HEADER', 'headers = ', (req && req.headers));
    var tenantId = req && req.headers && req.headers[tenantkey];
    log.debug(ctx.options, 'HEADER', 'tenant_id = ', tenantId);
    if (tenantkey === '') { cb(req.headers, tenantsource, tenantkey); } else { cb(tenantId, tenantsource, tenantkey); }
  },
  COOKIE: function tenantUtilCookieFn(tenantsource, tenantkey, ctx, req, cb) {
    log.debug(ctx.options, 'COOKIE', 'tenantsource=', tenantsource, ', tenantkey=', tenantkey, ', ctx=', ctx, ', req=', (req ? ' its there!' : 'it\'s not there!'));
    log.debug(ctx.options, 'COOKIE', (req && !req.signedCookies ? 'No cookies in the req' : (req ? 'Got cookies map in the req' : 'No req received!')));
    log.debug(ctx.options, 'COOKIE', (req && req.signedCookies && !req.signedCookies[tenantkey] ? 'No data for this tenantkey' : (req && req.signedCookies ? 'Got data for this tenantkey' : 'req or req.signedCookies is undefined or null')));
    log.debug(ctx.options, 'COOKIE', 'cookies = ', (req && req.signedCookies));
    var tenantId = (req && req.signedCookies && req.signedCookies[tenantkey]);
    log.debug(ctx.options, 'COOKIE', 'tenant_id = ', tenantId);
    if (tenantkey === '') { cb(req.signedCookies, tenantsource, tenantkey); } else { cb(tenantId, tenantsource, tenantkey); }
  },
  REQUEST: function tenantUtilRequestFn(tenantsource, tenantkey, ctx, req, cb) {
    log.debug(ctx.options, 'REQUEST', 'tenantsource=', tenantsource, ', tenantkey=', tenantkey, ', ctx=', ctx, ', req=', (req ? ' its there!' : 'it\'s not there!'));
    var tenantId = null;
    if (req) {
      tenantId = _.get(req, tenantkey);
    }
    log.debug(ctx.options, 'REQUEST', 'tenant_id = ', tenantId);
    if (tenantkey === '') { cb(req, tenantsource, tenantkey); } else { cb(tenantId, tenantsource, tenantkey); }
  },
  CTX: function tenantUtilCtxFn(tenantsource, tenantkey, ctx, req, cb) {
    log.debug(ctx.options, 'CTX', 'tenantsource=', tenantsource, ', tenantkey=', tenantkey, ', ctx=', ctx, ', req=', (req ? ' its there!' : 'it\'s not there!'));
    var tenantId;
    if (ctx && ctx.ctx) {
      tenantId = _.get(ctx.ctx, tenantkey);
    }
    if (tenantkey === '') { cb(ctx, tenantsource, tenantkey); } else { cb(tenantId, tenantsource, tenantkey); }
  },
  CALLCONTEXT: function tenantUtilCallContextFn(tenantsource, tenantkey, ctx, req, cb) {
    var tenantId = null;
    if (ctx) {
      tenantId = _.get(ctx, tenantkey);
    }
    if (tenantkey === '') { cb(ctx, tenantsource, tenantkey); } else { cb(tenantId, tenantsource, tenantkey); }
  },
  ACCESSTOKEN: function tenantUtilAccessTokenFn(tenantsource, tenantkey, ctx, req, cb) {
    log.debug(ctx.options, 'ACCESSTOKEN', 'tenantsource=', tenantsource, ', tenantkey=', tenantkey, ', ctx=', ctx, ', req=', (req ? ' its there!' : 'it\'s not there!'));
    log.debug(ctx.options, 'ACCESSTOKEN', (req && !req.accessToken ? 'No accessToken in the req' : (req ? 'Got accessToken in the req' : 'No req received!')));
    log.debug(ctx.options, 'ACCESSTOKEN', 'accessToken = ', (req && req.accessToken));
    var tenantId = null;
    if (req && req.accessToken) {
      tenantId = _.get(req.accessToken, tenantkey);
    }
    log.debug(ctx.options, 'ACCESSTOKEN', 'tenant_id = ', tenantId);
    if (tenantkey === '') { cb(req.accessToken, tenantsource, tenantkey); } else { cb(tenantId, tenantsource, tenantkey); }
  },
  USER: function tenantUtilUserFn(tenantsource, tenantkey, ctx, req, cb) {
    log.debug(ctx.options, 'USER', 'tenantsource=', tenantsource, ', tenantkey=', tenantkey, ', ctx=', ctx, ', req=', (req ? ' its there!' : 'it\'s not there!'));
    var userId = req && req.accessToken && req.accessToken.userId;
    log.debug(ctx.options, 'USER', 'userId = ', userId);
    if (!userId) {
      return cb(null, tenantsource, tenantkey);
    }
    var User = loopback.getModelByType('BaseUser');
    log.debug(ctx.options, 'USER', 'BaseUser model = ', (User ? 'got the model!' : 'No BaseUser model!'));
    if (!User) {
      return cb(null, tenantsource, tenantkey);
    }
    User.findById(userId, function TenantUtilUserFindCb(err, data) {
      if (err) {
        log.debug(ctx.options, 'USER', 'Error while getting User of this userId', err);
        return cb(null, tenantsource, tenantkey);
      }
      log.debug(ctx.options, 'USER', !data ? 'No' : 'Got', 'user with userId', userId);
      log.debug(ctx.options, 'USER', 'user = ', data);
      var tenantId = null;

      if (data) {
        tenantId = _.get(data, tenantkey);
      }
      log.debug(ctx.options, 'USER', 'tenant_id = ', tenantId);
      if (tenantkey === '') { cb(data, tenantsource, tenantkey); } else { cb(tenantId, tenantsource, tenantkey); }
    });
  },
  USERPROFILE: function tenantUtilUserProfileFn(tenantsource, tenantkey, ctx, req, cb) {
    log.debug(ctx.options, 'USERPROFILE', 'tenantsource=', tenantsource, ', tenantkey=', tenantkey, ', ctx=', ctx, ', req=', (req ? ' its there!' : 'it\'s not there!'));
    var userId = req && req.accessToken && req.accessToken.userId;
    log.debug(ctx.options, 'USERPROFILE', 'accessToken = ', req.accessToken);
    log.debug(ctx.options, 'USERPROFILE', 'userId = ', userId);
    if (!userId) {
      return cb(null, tenantsource, tenantkey);
    }
    var UserProfile = loopback.findModel('UserProfile');
    log.debug(ctx.options, 'USERPROFILE', 'UserProfile model = ', (UserProfile ? 'got the model!' : 'No UserProfile model!'));
    if (!UserProfile) {
      return cb(null, tenantsource, tenantkey);
    }
    UserProfile.findOne({
      where: {
        'userId': userId
      }
    }, function tenantUtilUserProfileFindCb(err, data) {
      if (err) {
        log.debug(ctx.options, 'USERPROFILE', 'Error while getting UserProfile of this User', err);
        return cb(null, tenantsource, tenantkey);
      }
      log.debug(ctx.options, 'USERPROFILE', (!(data) ? 'No' : 'Got'), 'userProfile for userId', userId);
      log.debug(ctx.options, 'USERPROFILE', 'userProfile = ', data);
      var tenantId = null;

      if (data) {
        tenantId = _.get(data, tenantkey);
      }
      log.debug(ctx.options, 'USERPROFILE', 'tenant_id = ', tenantId);
      if (tenantkey === '') { cb(data, tenantsource, tenantkey); } else { cb(tenantId, tenantsource, tenantkey); }
    });
  }
};

// Export the getTenantId function so that it can be called from
// switch-datasource-mixin.js
module.exports = {
  getTenantId: getTenantId,
  tenantfns: tenantfns
};
