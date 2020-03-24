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
var fs = require('fs');

wrapper.initWrapper();

var app = loopback();
jutil.mixin(app, observerMixin);

var mixinUtil = require('./mixin-util')(app);


function getRootFolder() {
  var rootFolder;

  try {
    rootFolder = path.dirname(module.parent.parent.filename);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('**** ERROR : Not able to get root folder from parent module. ****', e);
  }

  if (!rootFolder || process.env.FIXEDSERVER) {
    try {
      rootFolder = process.cwd() + '/server';
    } catch (e) {
      // eslint-disable-next-line no-console
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

function initAppList() {
  // var options = {};
  var rootFolder = getRootFolder();
  var a1; var a2; var a3;
  if (fs.existsSync(rootFolder + '/app-list.json')) {
    a1 = require(rootFolder + '/app-list.json');
  }
  if (fs.existsSync(rootFolder + '/app-list.js')) {
    a2 = require(rootFolder + '/app-list.js');
  }
  if (process.env.NODE_ENV) {
    if (fs.existsSync(rootFolder + '/app-list.' + process.env.NODE_ENV + '.js')) {
      a3 = require(rootFolder + '/app-list.' + process.env.NODE_ENV + '.js');
    }
  }


  var applist = Object.assign({}, a1, a2, a3);
  applist = Object.values(applist);

  // var applist = require(rootFolder + '/app-list.json');
  // options = mergeUtil.loadAppList(applist, rootFolder, options);
  // options.bootDirs.push(path.join(rootFolder, 'boot'));
  // options.clientAppRootDir = rootFolder;
  app.applist = applist;
  app.appHome = rootFolder;
  // return options;
}

function createMergedOptions() {
  var options = {};
  var rootFolder = app.appHome;
  var applist = app.applist;
  options = mergeUtil.loadAppList(applist, rootFolder, options);
  options.bootDirs.push(path.join(rootFolder, 'boot'));
  options.clientAppRootDir = rootFolder;
  // app.applist = applist;
  // app.appHome = rootFolder;
  return options;
}


app.createServer = function () {
  if ( app.server ) {
    return app.server;
  }

  var server;
  if (process.env.REQUIRE_HTTPS === true || process.env.REQUIRE_HTTPS === 'true') {
    var keyPath = process.env.SSL_KEY_PATH || '';
    var certPath = process.env.SSL_CERT_PATH || '';
    if (!(keyPath && certPath)) {
      throw new Error('HTTPS Enabled but SSL_KEY_PATH or SSL_CERT_PATH are not defined');
    }
    /**
     * SSL_KEY_PATH & SSL_CERT_PATH should be absolute paths
     */
    let configOptions = {
      key: fs.readFileSync(keyPath).toString(),
      cert: fs.readFileSync(certPath).toString()
    };
    server = require('https').createServer(configOptions, app);
  } else {
    server = require('http').createServer(app);
  }

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

// Atul : This is copy of boot() of loopback-boot. Excpet it will notify observers and allow any observer to
// change instruction sets - that includes models, mixins, middleware and so on..
function appboot(app, options, callback) {
  options.env = options.env || app.get('env');
  var instructions = boot.compile(options);
  app.notifyObserversOf('boot-instructions-prepared', {options, instructions}, (err) => {
    if (err) {
      return callback(err);
    }
    boot.execute(app, instructions, callback);
  });
}


// Atul : rearrange creation of server and notifying programmer before creating merge options
// programmer can manipulate app-list
app.boot = function (options, cb) {
  app.createServer();
  app.notifyObserversOf('before-boot-options-prepared', {}, (err) => {
    if (err) {
      return cb(err);
    }
    app.options = createMergedOptions();
    loadOeModules(app, (err) => {
      if (err) {
        return cb(new Error('Error in loadingOeModules ' + err));
      }
      var cookieSecret = app.get('cookieSecret');
      if (!cookieSecret) {
        app.set('cookieSecret', 'oe-cloud-secret');
        cookieSecret = app.get('cookieSecret');
      }
      appboot(app, app.options, (err) => {
        return cb(err);
      });
    });
  });

  return 'boot';
};


app.start = function () {
  return app.listen( () => {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    // eslint-disable-next-line no-console
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      // eslint-disable-next-line no-console
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

// app.createServer();
// app.options = createMergedOptions();
initAppList();

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


// Atul : This utility function is used to remove forceId settings from model
// This is important for User/Role etc models from loopback
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


// Atul : By Default unauthenticated users can do WRITE operations on BaseEntity. To keep backward compatibility, application can call this function to set ACL on BaseEntity
// Remember that, if programmer wants to call this function to set ACL, it has to be done before boot.
// "acls":
//   {
//     "accessType": "WRITE",
//     "principalType": "ROLE",
//     "principalId": "$unauthenticated",
//     "permission": "DENY"
//   }
app.setACLToBaseEntity = function (acl) {
  if (!Array.isArray(acl)) {
    app.addSettingsToBaseEntity({acls: [acl]});
  } else {
    app.addSettingsToBaseEntity({acls: acl});
  }
};


app.registry.modelBuilder.registerCustomType('timestamp', 'date');
var emailPattern = '^(([^<>()[\\]\\\\.,;:\\s@\\"]+(\\.[^<>()[\\]\\\\.,;:\\s@\\"]+)*)|(\\".+\\"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$';
app.registry.modelBuilder.registerCustomType('email', 'string', { pattern: emailPattern });

// Initialize wrapper functions
require('./wrapper.js')(app);

module.exports = app;
module.exports.loadOeModules = loadOeModules;
module.exports.addModuleMixinsToBaseEntity = mixinUtil.addModuleMixinsToBaseEntity;
module.exports.attachSourceToBaseEntity = mixinUtil.attachSourceToBaseEntity;

