/**
 *
 * �2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
var loopback = require('loopback');
var boot = require('loopback-boot');
var wrapper = require('./loopback-datasource-juggler-wrapper');
var path = require('path');
var mergeUtil = require('./merge-util');
var debug = require('debug')('oe-cloud:oe-cloud');
var async = require('async');
var jutil = require('loopback-datasource-juggler/lib/jutil');
var observerMixin = require('loopback-datasource-juggler/lib/observer');

wrapper.initWrapper();

var app = loopback();
jutil.mixin(app, observerMixin);

var mixinUtil = require('./mixin-util')(app);


function getRootFolder() {
  var rootFolder;

  try {
    rootFolder = path.dirname(module.parent.parent.filename);
  } catch (e) {
    console.error('**** ERROR : Not able to get root folder from parent module. ****', e);
  }

  if (!rootFolder || process.env.FIXEDSERVER) {
    try {
      rootFolder = process.cwd() + '/server';
    } catch (e) {
      console.error('**** ERROR : Not able to get current working directory. ****', e);
    }
  }

  if ( !rootFolder) {
    try {
      rootFolder = require.main.filename;
      rootFolder = path.dirname(rootFolder);
    } catch (e) {
      throw new Error(e);
    }
  }
  return rootFolder;
}

function createMergedOptions() {
  var options = {};
  var rootFolder = getRootFolder();
  var applist = require(rootFolder + '/app-list.json');
  options = mergeUtil.loadAppList(applist, rootFolder, options);
  options.bootDirs.push(path.join(rootFolder, 'boot'));
  options.clientAppRootDir = rootFolder;
  app.applist = applist;
  app.appHome = rootFolder;
  return options;
}


app.createServer = function () {
  if ( app.server ) {
    return app.server;
  }
  var server = require('http').createServer(app);
  app.server = server;
  return server;
};

app.setServer = function (server) {
  app.server = server;
  return server;
};

// Atul : Overriding listen() - problem is loopbackapp.listen() would create server internally and there is no function/api available to seperate out. also ignore jshint
// For node-red to work with same port.
app.listen = function appinstanceListen(cb) {
  var self = this;
  var server = this.server;
  server.on('listening', function serverListning() {
    self.set('port', this.address().port);

    var listeningOnAll = false;
    var host = self.get('host');
    if (!host) {
      listeningOnAll = true;
      host = this.address().address;
      self.set('host', host);
    } else if (host === '0.0.0.0' || host === '::') {
      listeningOnAll = true;
    }

    if (!self.get('url')) {
      if (process.platform === 'win32' && listeningOnAll) {
        // Windows browsers don't support `0.0.0.0` host in the URL
        // We are replacing it with localhost to build a URL
        // that can be copied and pasted into the browser.
        host = 'localhost';
      }
      var url = 'http://' + host + ':' + self.get('port') + '/';
      self.set('url', url);
    }
  });
  var useAppConfig = arguments.length === 0 ||
            (arguments.length === 1 && typeof arguments[0] === 'function');

  if (useAppConfig) {
    server.listen(this.get('port'), this.get('host'), cb);
  } else {
    server.listen.apply(server, arguments);
  }

  return server;
};


app.boot = function (options, cb) {
  loadOeModules(app, (err) => {
    if (err) {
      return cb(new Error('Error in loadingOeModules ' + err));
    }
    var cookieSecret = app.get('cookieSecret');
    if (!cookieSecret) {
      app.set('cookieSecret', 'oe-cloud-secret');
      cookieSecret = app.get('cookieSecret');
    }
    boot(app, app.options, (err) => {
      if (err) {
        return cb(new Error('Error while running boot scripts ' + err));
      }
      return cb();
    });
  });

  return 'boot';
};


app.start = function () {
  return app.listen( () => {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

app.createServer();
app.options = createMergedOptions();


function loadOeModules(app, cb) {
  mixinUtil.loadMixins();
  // addModuleMixinsToBaseEntity('oe-module');
  app.notifyObserversOf('before load', {ctx: app }, (err, ctx) => {
    if (err) {
      return cb(err);
    }
    innerLoadOeModules(app, (err) => {
      if (err) {
        return cb(err);
      }
      app.notifyObserversOf('loaded', ctx, (err, ctx) => {
        return cb(err);
      });
    });
  });
}

function innerLoadOeModules(app, cb) {
  var applist = app.applist;
  if (app.oeModulesLoaded) {
    return process.nextTick(function () {
      return cb();
    });
  }

  var initFunctions = [];

  if (applist && Array.isArray(applist) && applist.length > 0) {
    applist.forEach(app => {
      if (!app.enabled) {return;}
      if ((app.path === './' && !app.forceLoad) || app.path === 'oe-cloud') {return;}
      if ( app.forceLoad ) {
        app.path = path.resolve(process.cwd(), app.path);
      }
      var module = require(app.path);
      if (!module) {return;}
      if ( typeof module === 'function' && typeof module.init !== 'function') {
        initFunctions.push(module);
      } else if (typeof module.init === 'function') {
        initFunctions.push(module.init);
      }
    });
  } else {
    process.nextTick( () => {
      app.oeModulesLoaded = true;
      debug('No modules to init');
      return cb();
    });
    return;
  }

  async.eachSeries(initFunctions, (f, done) => {
    debug('Running inits of module %s', f.name);
    if (f.length >= 2) {
      f(app, function (err) {
        debug('Async function finished %s', f.name);
        done(err);
      });
    } else {
      var r = f(app);
      if (r && r instanceof Error) {
        return done(r);
      }
      done();
    }
  }, function (err) {
    app.oeModulesLoaded = true;
    return cb(err);
  });
}

app.addContextField = function (name, p) {
  var accessToken = loopback.findModel('AccessToken');
  accessToken.defineProperty(name, p);
};

app.addContextField('roles', {
  type: ['String']
});


app.removeForceId = function (modelName) {
  var model = loopback.getModelByType(modelName);
  model.settings.forceId = false;
  var validations = model.validations;
  var ary = [];
  if (validations && validations.id) {
    for (var i = 0; i < validations.id.length; ++i) {
      if (validations.id[i].validation === 'absence' && validations.id[i].if === 'isNewRecord') {
        continue;
      }
      ary.push(validations.id[i]);
    }
    validations.id = ary;
  }
};

app.registry.modelBuilder.registerCustomType('timestamp', 'date');
var emailPattern = '^(([^<>()[\\]\\\\.,;:\\s@\\"]+(\\.[^<>()[\\]\\\\.,;:\\s@\\"]+)*)|(\\".+\\"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$';
app.registry.modelBuilder.registerCustomType('email', 'string', { pattern: emailPattern });

module.exports = app;
module.exports.loadOeModules = loadOeModules;
module.exports.addModuleMixinsToBaseEntity = mixinUtil.addModuleMixinsToBaseEntity;
module.exports.attachSourceToBaseEntity = mixinUtil.attachSourceToBaseEntity;

