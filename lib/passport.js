/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * EV Passport
 *
 * @module EV Passport
 *
 */
/* eslint-disable no-console , no-process-exit*/
var loopback = require('loopback');
var bodyParser = require('body-parser');
var path = require('path');

module.exports.initPassport = function initPassport(app) {
  // Passport configurators..
  var loopbackPassport = require('loopback-component-passport');
  var PassportConfigurator = loopbackPassport.PassportConfigurator;
  var passportConfigurator = new PassportConfigurator(app);

  return passportConfigurator;
};

module.exports.configurePassport = function configurePassport(app, passportConfigurator, providerConfigParameter) {
  // configure body parser
  app.use(bodyParser.urlencoded({
    extended: true
  }));

  var AuthSession = loopback.getModelByType('AuthSession');
  app.middleware('auth', app.loopback.token({
    model: AuthSession,
    currentUserLiteral: 'me'
  }));

  // If loopback token expires, app remoting errorHandler method does not get invoked
  app.middleware('auth', function middlewareAuthRouterFn(err, req, res, next) {
    if (err) {
      delete err.stack;
    }
    next(err);
  });

  // Providers.json will now be looked only from app if app is using framework, if framework is directly run as app, then it will be picked up from framework (so app will not fallback on framework to avoid by chance picking unintentional configuration)
  var config = {};
  // Atul : if providerConfiParameter is passed, application will used this parameter. else providers.json will be used from server folder in file system.
  // Merge util will merge providers.json from each dependent module and pass configurePassport() with this parameter
  try {
    config = providerConfigParameter ? providerConfigParameter : require(path.join(app.locals.apphome, 'providers.json'));
  } catch (err) {
    console.error('could not load login configuration ', path.join(app.locals.apphome, 'providers.json'), ' https://docs.strongloop.com/display/public/LB/Configuring,providers.json ', err);
    process.exit(1);
  }

  var flash = require('express-flash');

  // boot(app, __dirname);
  // app.emit('ready');
  // to support JSON-encoded bodies
  var jsonremoting = {
    limit: '1mb'
  };
  var urlencoded = {
    limit: '1mb'
  };
  if (app.get('remoting') && app.get('remoting').json) {
    jsonremoting = app.get('remoting').json;
  }
  if (app.get('remoting') && app.get('remoting').urlencoded) {
    urlencoded = app.get('remoting').urlencoded;
  }
  app.middleware('parse', bodyParser.json(jsonremoting));
  // to support URL-encoded bodies
  app.middleware('parse', bodyParser.urlencoded(
    urlencoded));

  app.middleware('session:before', loopback.cookieParser(app.get('cookieSecret')));

  passportConfigurator.init();

  // We need flash messages to see passport errors
  app.use(flash());
  var BaseUser = loopback.getModelByType('BaseUser');
  var userIdentity = loopback.getModelByType('BaseUserIdentity');

  passportConfigurator.setupModels({
    userModel: BaseUser,
    userIdentityModel: userIdentity,
    userCredentialModel: app.models.userCredential
  });
  for (var s in config) {
    if (config.hasOwnProperty(s)) {
      var c = config[s];
      c.session = c.session !== false;
      passportConfigurator.configureProvider(s, c);
    }
  }
};
