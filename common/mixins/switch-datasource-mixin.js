/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
/**
    * This Module provides Methods to get Personalized Models.
    *
    * @mixin Switch Data Source Mixin
    * @Author Atul
    */

var loopback = require('loopback');
var logger = require('../../lib/logger');
var log = logger('switch-datasource-mixin');
var appinstance = require('../../server/server.js').app;

function getScopeMatchedDS(model, list, scope) {
  var matchedds;
  var priority = -1;

  for (var i = 0; i < list.length; i++) {
    var ds = list[i];
    var dsScope = {};
    var match = true;
    var count = 0;

    for (var scopevar in ds.settings.scope) {
      if (ds.settings.scope.hasOwnProperty(scopevar)) {
        dsScope[scopevar] = ds.settings.scope[scopevar];
      }
    }

    for (var autoScopeVar in ds.settings._autoScope) {
      if (ds.settings._autoScope.hasOwnProperty(autoScopeVar)) {
        dsScope[autoScopeVar] = ds.settings._autoScope[autoScopeVar];
      }
    }

    dsScope.modelName = model.modelName;

    for (var dsScopeVar in dsScope) {
      if (!dsScope.hasOwnProperty(dsScopeVar)) {
        continue;
      }
      if (dsScope[dsScopeVar] === 'default') {
        match = true;
        break;
      }

      count = count + 1;
      if (!scope[dsScopeVar]) {
        match = false;
        break;
      } else if (dsScope[dsScopeVar] instanceof Array) {
        if (dsScope[dsScopeVar].indexOf(scope[dsScopeVar]) === -1) {
          match = false;
          break;
        }
      } else if (scope[dsScopeVar] && scope[dsScopeVar] !== dsScope[dsScopeVar]) {
        match = false;
        break;
      }
    }

    if (match) {
      var temp = (ds.priority && ds.priority > 0) ? ds.priority : count;

      if (temp > priority) {
        matchedds = ds;
        priority = temp;
      }
    }
  }

  return matchedds;
}

function getScopeMatchedMapping(model, list, scope) {
  var matchedMapping;
  var priority = -1;

  for (var i = 0; i < list.length; i++) {
    var mapping = list[i];
    var mappingScope = {};
    var match = true;
    var count = 0;

    for (var scopevar in mapping.scope) {
      if (mapping.scope.hasOwnProperty(scopevar)) {
        mappingScope[scopevar] = mapping.scope[scopevar];
      }
    }

    for (var autoScopeVar in mapping._autoScope) {
      if (mapping._autoScope.hasOwnProperty(autoScopeVar)) {
        mappingScope[autoScopeVar] = mapping._autoScope[autoScopeVar];
      }
    }

    for (var mappingScopeVar in mappingScope) {
      if (!mappingScope.hasOwnProperty(mappingScopeVar)) {
        continue;
      }
      if (mappingScope[mappingScopeVar] === 'default') {
        match = true;
        break;
      }
      count = count + 1;
      if (!scope[mappingScopeVar]) {
        match = false;
        break;
      } else if (mappingScope[mappingScopeVar] instanceof Array) {
        if (mappingScope[mappingScopeVar].indexOf(scope[mappingScopeVar]) === -1) {
          match = false;
          break;
        }
      } else if (scope[mappingScopeVar] && scope[mappingScopeVar] !== mappingScope[mappingScopeVar]) {
        match = false;
        break;
      }
    }

    if (match) {
      var temp = (mapping.priority && mapping.priority > 0) ? mapping.priority : count;

      if (temp > priority) {
        matchedMapping = mapping;
        priority = temp;
      }
    }
  }
  return matchedMapping;
}

function getDataSourceForName(app, model, dsname, scope) {
  var dslist = app.locals.dataSources[dsname];
  if (!dslist) {
    app.locals.dataSources[dsname] = [];
    dslist = app.locals.dataSources[dsname];
    Object.keys(app.datasources).forEach(function iter(id) {
      var dataSource = app.dataSources[id];
      // currently two dbs will get same entry
      if (dataSource.settings.name === dsname) {
        dslist.push(dataSource);
      }
    });
  }

  if (dslist.length === 1) {
    return dslist[0];
  }

  var ds = getScopeMatchedDS(model, dslist, scope);
  if (!ds) {
    ds = app.dataSources[dsname];
  }
  return ds;
}

module.exports = function SwitchDatasourceMixin(model) {
  /**
  *
  *
  * This function returns overriden model or in other words personalized model
  * As of now this function is written in switch-datasource-mixin.js file because logic to find overriden model can be easily reused.
  * As of now this function is async and requires callback. When logic of data source personalization is reused, it can be made with sync call
  * this will be changed in future till all scenarios are tested. there could be some overhead as of now.
  * @param {object} options - options
  * @param {callback} cb - callback to be called
  * @return {void} it returns none. however upon finding overriden model- callback is called along with overriden model
  * @function
  */
  model.getOverridenModel = function getOverridenModelFn(options, cb) {
    if (typeof cb === 'undefined') {
      if (typeof options === 'function') {
        cb = options;
        options = {};
      }
    }
    var modelDefinition = loopback.findModel('ModelDefinition');
    var savethis = this;
    modelDefinition.findOne({
      where: {
        variantOf: this.modelName
      }
    }, options, function modelDiscoveryFilterModelDefinitionFindOneCb(err, instance) {
      if (err || !instance) {
        return cb(null, savethis);
      }
      var overridenModel = loopback.findModel(instance.name);
      return cb(null, overridenModel);
    });
  };

  var originalDataSource = {};

  model.getDataSource = function switchDatasource(options) {
    var app = model.app;
    if (!app) {
      // history model is not attached to app
      app = appinstance;
    }

    var frameworkmodelnames = ['PersonalizationRule', 'ModelDefinition', 'DataSourceMapping', 'DataSourceDefinition', 'Tenant'];

    if (frameworkmodelnames.indexOf(model.modelName) !== -1) {
      var ret = app.dataSources.db;
      if (ret) {
        model.attachTo(ret);
      }
      return ret;
    }

    //    if (options) {
    //        if (typeof options === 'function') {
    //            console.log('switch ds ', model.modelName, 'no options');
    //            console.trace('no options');
    //            process.exit(1);
    //        } else {
    //            console.log('switch ds options ok ', model.modelName);
    //            //console.log(options);
    //        }
    //    }

    var modelName = model.settings.variantOf || model.modelName;

    originalDataSource[modelName] = originalDataSource[modelName] || model.dataSource;

    app.locals.dataSourceMappings = app.locals.dataSourceMappings || {};
    app.locals.dataSources = app.locals.dataSources || {};

    var maplist = app.locals.dataSourceMappings[modelName];
    var scope = {};
    if (options.ctx) {
      var callContext = options;
      callContext = callContext || {};
      callContext.ctx = callContext.ctx || {};

      Object.keys(callContext.ctx).forEach(function iter(key) {
        if (callContext.ctx[key] instanceof Array) {
          scope[key] = [];
          callContext.ctx[key].forEach(function funclowercase(item) {
            scope[key].push(item);
          });
        } else if (typeof callContext.ctx[key] === 'string') {
          scope[key] = callContext.ctx[key];
        } else {
          scope[key] = callContext.ctx[key];
        }
      });
    }

    scope.modelName = modelName;
    if (maplist) {
      var mapping = getScopeMatchedMapping(model, maplist, scope);
      if (mapping) {
        var ds = getDataSourceForName(app, model, mapping.dataSourceName, scope);
        if (ds) {
          // console.log('switch datasource ', modelName, ds.settings.name);
          model.attachTo(ds);
          return ds;
        }
      }
    } else if (originalDataSource[model.modelName]) {
      var dsName = originalDataSource[model.modelName].settings.name;
      var ds2 = getDataSourceForName(app, model, dsName, scope);
      if (ds2) {
        model.attachTo(ds2);
        return ds2;
      }
    }

    if (originalDataSource[model.modelName]) {
      model.attachTo(originalDataSource[modelName]);
      return originalDataSource[model.modelName];
    }

    var dsname = model.dataSource.settings.name ? model.dataSource.settings.name : 'db';
    var defaultds = app.dataSources[dsname];
    if (defaultds) {
      model.attachTo(defaultds);
      log.debug(options, 'switch datasource ', modelName, defaultds.settings.name);
    }
    return defaultds;
  };
};

// removing data source personalisation for now, only model to ds mapping we will support
// function getScopeMatchedDS(model, dslist, scope) {
//
//    var matchedds;
//    var priority = -1;
//
//    for (var i = 0; i < dslist.length; i++) {
//        var ds = dslist[i];
//        var dsscope = ds.settings.scope;
//        var match = true;
//        var count = 0;
//
//        for (var scopevar in dsscope) {
//            count = count + 1;
//            if (!scope[scopevar]) {
//                match = false;
//                break;
//            } else if (dsscope[scopevar] instanceof Array) {
//                if (dsscope[scopevar].indexOf(scope[scopevar]) === -1) {
//                    match = false;
//                    break;
//                }
//            } else if (scope[scopevar] && scope[scopevar] !== dsscope[scopevar]) {
//                match = false;
//                break;
//            }
//        }
//
//
//        if (match) {
//            var temp = (ds.settings.priority && ds.settings.priority > 0) ? ds.settings.priority : count;
//
//            if (temp > priority) {
//                matchedds = ds;
//                priority = temp;
//            }
//        }
//    }
//    return matchedds;
//
// }
