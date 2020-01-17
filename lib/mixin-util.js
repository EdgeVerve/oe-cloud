/**
 *
 * �2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
// This file adds utility functions to oecloud application object
// These functions are like adding properties, mixins, settings etc to BaseEntity, ModelDefinition models
const path = require('path');
const fs = require('fs');
const bootUtil = require('./loopback-boot-utility');
const util = require('../lib/common/util');
module.exports = (app) => {
  var mixinModules = [];

  app.attachMixinsToBaseEntity = function (mixin, v = true) {
    var basemodel = require('../common/models/base-entity.json');
    basemodel.mixins = basemodel.mixins || {};
    if (v && typeof v === 'object' && v.enabled === false) {
      basemodel.mixins[mixin] = false;
    } else {
      basemodel.mixins[mixin] = v;
    }
  };

  app.addModuleMixinsToBaseEntity = function (module, enabled) {
    mixinModules.push({module, enabled});
  };

  app.addSettingsToBaseEntity = function (s) {
    var basemodel = require('../common/models/base-entity.json');
    util.mergeObjects(basemodel, s);
  };

  app.addSettingsToModelDefinition = function (s) {
    var basemodel = require('../common/models/model-definition.json');
    util.mergeObjects(basemodel, s);
  };

  app.attachMixinsToModelDefinition = function (mixin, v = true) {
    var basemodel = require('../common/models/model-definition.json');
    basemodel.mixins = basemodel.mixins || {};
    basemodel.mixins[mixin] = v;
  };


  app.attachModuleMixinsToBaseEntity = function (moduleName) {
    var self = this;
    var opt = self.options;

    var module;
    var attachMixinsByDefault=false;
    if(typeof moduleName === 'string'){
      module = moduleName;
    }
    else if (typeof moduleName === 'object'){
      module = moduleName.path;
      attachMixinsByDefault = moduleName.attachMixinsByDefault;
    }

    var temp = opt.models._meta.mixins.find( item =>  item.indexOf( module + '/') === 0 || item.indexOf( module + '\\') === 0 );
    if ( temp ) {
      var mixinPath = path.resolve(self.options.appRootDir, '../node_modules/' + temp );
      var mixins = bootUtil.getMixins(mixinPath, opt.normalization);
      mixins.forEach(function (mixin) {
        var applistModule = self.applist.find((e) => {
          if (e.path === module) {
            return e;
          }
        });
        var v = true;
        var mixinProperty = opt.models._meta.mixinProperties && opt.models._meta.mixinProperties.find((e) => {
          if (e && e.hasOwnProperty(mixin)) {
            return e;
          }
        });
        if (mixinProperty && mixinProperty.hasOwnProperty(mixin)) {
          v = mixinProperty[mixin];
        }
        if (applistModule && applistModule.hasOwnProperty(mixin)) {
          v = applistModule[mixin];
        }
        if (applistModule && applistModule.mixins && applistModule.mixins.hasOwnProperty(mixin)) {
          v = applistModule.mixins[mixin];
        }
        // Atul : By default mixin will not be attached to BaseEntity
        if(!attachMixinsByDefault){
          v = false;
        }
        app.attachMixinsToBaseEntity(mixin, v);
      });
    }
  };


  app.attachSourceToBaseEntity = function (module) {
    var self = this;
    var opt = self.options;
    var temp = opt.models._meta.sources.find( item =>  item.indexOf( module + '/') === 0 || item.indexOf( module + '\\') === 0 );
    if ( temp ) {
      var modelPath = path.resolve(self.options.appRootDir, '../node_modules/' + temp );
      var source = modelPath + '/base-entity.js';
      if ( fs.existsSync(source)) {
        opt.baseEntitySources = opt.baseEntitySources || [];
        opt.baseEntitySources.push(source);
      }
    }
  };


  app.loadMixins = function () {
    var self = this;
    const applist = self.applist;
    applist.forEach((appItem, appIndex) => {
      if (!appItem.enabled) {return;}
      if (appItem.path === './' || appItem.path === 'oe-cloud') {return;}
      app.attachSourceToBaseEntity(appItem.path);
    });
    mixinModules.forEach((mixin) => {
      if (mixin.enabled) {app.attachModuleMixinsToBaseEntity(mixin.module);}
    });
    if (mixinModules.length === 0) {
      applist.forEach((appItem, appIndex) => {
        if (!appItem.enabled) {return;}
        if (appItem.path === './' || appItem.path === 'oe-cloud') {return;}
        app.attachModuleMixinsToBaseEntity(appItem);
      });
    }
  };

  return app;
};


// module.exports.attachModuleMixinsToBaseEntity = attachModuleMixinsToBaseEntity;
// module.exports.loadModuleMixins = loadMixins;
// module.exports.attachMixinsToBaseEntity = attachMixinsToBaseEntity;
// module.exports.addModuleMixinsToBaseEntity = addModuleMixinsToBaseEntity;

