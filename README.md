# oe-cloud

- [Introduction](#introduction)
- [oe-cloud overall modules](#oe-cloud-overall-modules)
- [oe-cloud Features and functionalities](#oe-cloud-features-and-functionalities)
  * [oe-cloud - What it will do](#oe-cloud---what-it-will-do)
  * [Usage](#usage)
  * [oe-cloud-models](#oe-cloud-models)
    + [BaseEntity](#baseentity)
    + [ModelDefinition](#modeldefinition)
  * [oe-cloud - Initialization](#oe-cloud---initialization)
  * [oe-cloud - Loading Models](#oe-cloud---loading-models)
  * [oe-cloud - Attaching mixins](#oe-cloud---attaching-mixins)
  * [oe-cloud - Boot scripts](#oe-cloud---boot-scripts)
  * [oe-cloud - Middlewares](#oe-cloud---middlewares)
- [oeCloud API Documentation](#oecloud-api-documentation)
  * [Common Utility API](#common-utility-api)
    + [IsBaseEntity(Model)](#isbaseentity-model-)
    + [mergeObjects(obj1, obj2)](#mergeobjects-obj1--obj2-)
    + [checkDependency(app, modules)](#checkdependency-app--modules-)
    + [isInstanceQuery(Model, where)](#isinstancequery-model--where-)
    + [getIdValue(Model, data)](#getidvalue-model--data-)
    + [idName(Model)](#idname-model-)
  * [Application API](#application-api)
    + [setServer(server)](#setserver-server-)
    + [boot(__dirname, cb)](#boot---dirname--cb-)
    + [start()](#start--)
    + [addContextField(name, property)](#addcontextfield-name--property-)
    + [removeForceId](#removeforceid)
    + [setACLToBaseEntity](#setACLToBaseEntity)
    + [observers](#observers)
  * [Configurations](#configurations)
  * [Remote End point (RestAPI)](#remote-end-point--restapi-)
    + [aboutMe](#aboutme)
  * [Add fields to BaseEntity or ModelDefinition](#add-fields-to-baseentity-or-modeldefinition)
- [oe-cloud - Difference between old and new](#oe-cloud---difference-between-old-and-new)

# Introduction

oeCloud framework has been in development for almost two years and several developers for the first time worked on framework development. It has been adopted by many application developers so far and is being popular within Infosys and EdgeVerve.
It has been demonstrated that application development using oeCloud is fast and developer get many levers to play with when he/she developing with oeCloud - due to framework offering and also JavaScript inherent power.


However, there is scope of improvement.
* oeCloud itself has got several features and all of these features are bundled into single monolith node module. This causes trouble for application developer as many of features are included even though they are not needed by application developer.
* Maintainability of oeCloud framework is getting difficult because features cannot be developed/enhanced in isolation.
* Development cycle time is increased due to several CI/CD issues.
* some of the node modules of loopback is forked and maintained by oeCloud team. Example is **loopback-datasource-juggler**. This node module is extensively modified and hence there is no way oeCloud can use latest loopback framework. This is tightly coupled with oeCloud.


To address above concerns, oeCloud is being modularized
* oeCloud application will install oeCloud modules based on requirements. For example if data personalization is really required, he/she will install and use *oe-data-personalization* node module.
* node modules will be created based on feature of oeCloud and each feature thus  will have its own development life cycle.
* This way, each feature will live independently of each other and will have separate CI / CD.
* As each feature is separately developed - there will be decoupling with loopback, oeCloud can keep pace with loopback development.

*oe-cloud* is base node module for all oeCloud base application development.

# oe-cloud overall modules
![Modularization](https://github.com/EdgeVerve/oe-cloud/raw/master/oe-modularization.png)


# oe-cloud Features and functionalities

This is most important project of oeCloud. This module needs to be required in application's server.js.
Below are responsibilities of oe-cloud

## oe-cloud - What it will do

* Define BaseEntity Model
* load modules described in app-list.json in sequence.
* call init method of each module described in app-list.json
* provide API for other modules to defined observer hook - and this module will call those hooks when application is loaded
* ensure execution of loading and attaching mixin/middleware/boot script in each module of app-list.json while maintaining sequence
* by default, oe-cloud will attach all the mixins defined in node module to BaseEntity unless it is specified otherwise.
* ensure of loading of models defined in app-list module
* expose *loopback like* APIs for application developer (eg app.boot(), app.start() etc)


## Usage

Typically, following code can be written in oeCloud application's server/server.js file

```
var oecloud = require('oe-cloud');

oecloud.boot(__dirname, function(err){
  oecloud.start();
})

```

Above code should able to start application. you don't have to do require of loopback or any of it's component.
Typical app-list.json, which would be part of application would look like

```
[
  {
    "path": "oe-cloud",
    "enabled": true
  },
  {
    "path": "oe-module",
    "enabled": true
  },
  {
    "path": "oe-common-mixins",
    "enabled": true
  },
  {
    "path": "oe-cache",
    "enabled": true
  },
  {
    "path": "oe-personalization",
    "enabled": true
  },
  {
    "path": "oe-validation",
    "enabled": true
  },
  {
    "path": "oe-service-personalization",
    "enabled": true
  },
  {
      "path": "./",
      "enabled": true
  }
]
```

## oe-cloud-models

### BaseEntity

BaseEntity model is part of this module. Mixins in app-list.json modules will be attached to BaseEntity model - as described below. Most of the times, application models will be directly or indirectly derived from BaseEntity.
Therefore, all functionalities of BaseEntity model is available to derived model.

### ModelDefinition

ModelDefinition model stores metadata of all models in database. It will further opens up REST end point for client to get metadata of models and also can be used for runtime creation of new model.


## oe-cloud - Initialization

**Note : There is possibility of loading **oe Modules** automatically. But having explicitly specified in app-list.json can be better idea and there is no ambiguity.**

oe-cloud interacts with node modules defined in app-list.json in very specific, predefined way. Below are specifications

* if your node module needs to be loaded, you MUST include that in app-list.json file. For example above oe-data-personsalization module will be loaded from <app folder>/node_modules/oe-data-personalization folder
* oe-cloud will call .init() method - IF DEFINED - after loading the module. Typically, you can create index.js file which will be loaded and init() will be called.
* If init() is not defined, and you are exporting function as below, that function will be called

```
module.exports = function(app){
    // oe-cloud will call this function when it loads the module and when init() is not defined.
    // app object will be passed which has got much of information to manipulate
    // you can set observer hook as below

    app.observe('loaded', function(ctx, next){
        //ctx.app will have app handle
        return next();
    });
}
```

## oe-cloud - Loading Models

oe-cloud can load models defined in app-list.json's node_module.

* you need to define model-config.json in your modules server and have path specified for models as below.
* If you don't specifiy model-config.json, application needs to specify path to models folder in app's model-config.json.
* You don't have to define Models in model-config.json. Only path is enough. However, in that case, application's model-config.json must have model entry otherwise, model will not be attached to datasrouce.
* If in node_module's model-config.json, if you have defined dataSource (as shown below), it must exists otherwise error will be thrown.
* If in node_module's model-config.json, you have defined dataSource or public property, these properties can be overriden in application's model-config.json. So in below example, application can change datasource of **MyModel** by having entry in it's own model-confg.json.

```
{
  "_meta": {
    "sources": [
      "../common/models"
    ],
    "mixins": [
      "../common/mixins"
    ]
  },
  "MyModel" :{
     "public" : true,
     "dataSource": "db",
  }
}

```

In above model-config, MyModel will be created as public model. However, definition of the model (.json) should be located in common/models folder of module. so in case of data personalization node module, my-model.json file should be present in <approot>/node_modules/oe-data-personalization/commmon/models folder

## oe-cloud - Attaching mixins


* oeCloud will load mixins of node_modules defined in app-list.json
* as in above case, mixins can be defined in node_modules's common/mixins folder. mixin's .js file will be loaded and attached to BaseEntity model by default.
* thus, when this node module is loaded, all mixins defined in this module will be attached to BaseEntity and all models derived from BaseEntity will have same behavior.
* Application developer can switch off/on mixins selectively by having entry such as following in app-list.json

```javaScript
  "OeSomeModule" : {
      "enable" : true,
      "mixins" : {
          "MixinA" : false,
          "MixinB" : true
      }
  }
```
* Above example will change default behavior.
* you can also selectively ON/OFF the mixin attachments by calling **addModuleMixinsToBaseEntity** API as below. This can be important if you have to have some mixins from other dependent module.

```
var oecloud = require('oe-cloud');
oecloud.addModuleMixinsToBaseEntity('oe-data-personalization', false);
oecloud.boot(__dirname, function(err){
  oecloud.start();
})

```
As shownn above, data personalization mixins will not be attached to BaseEntity by default. In this scenario, you will have to explicitly attach mixin with another API **attachMixinsToBaseEntity**

```
var oecloud = require('oe-cloud');
oecloud.addModuleMixinsToBaseEntity('oe-data-personalization', false);
// adding mixin with name of mixin explicitly. Thus not all mixins in data personalization modules are attached.
oecloud.attachMixinsToBaseEntity('DataPersonalizationMixin');

oecloud.boot(__dirname, function(err){
  oecloud.start();
})

```

* you can also set mixin value in app-list.json to set default behavior of mixin
```
  ,
  {
    "path": "oe-validation",
    "ModelValidationMixin" : false,
    "enabled": true
  },
```

## oe-cloud - Boot scripts

* app-list.json's node module can have boot scripts defined in server/boot folder
* oeCloud executes boot scripts in order same as modules are defined in app-list.json.
* Thererfore, boot scripts in first module of app-list.json will be executed first.
* However in each module, boot scripts are executed in alphabetical sequence. Therefore, if in module, there are two boot scripts, a.js and b.js, a.js will be executed first.
* You will not interfere the order of boot scripts in other modules.
* Each boot script will take two parameters, app and callback. if you don't use callback, then boot script will be executed in sync way.


```javaScript
// boot script with callback
module.exports = function(app, cb){

    // must call cb() otherwise next boot script will not be executed
    // should throw error if needed like
    // return cb(new Error("something went wrong");
}

// boot script without callback
module.exports = function(app){

    // next boot script will be executed when function returns
}

```


## oe-cloud - Middlewares

oeCloud would merge all middlewares in all modules defined in app-list.json and ensure execution of middleware. Each middleware should have entry in respective module's middleware.json file.

Middleware should have entry such as below in middleware.json of module's server folder.

```javaScript
session:before": {
        "./middleware/populate-context-from-scope": {},
        "./middleware/populate-context-from-headers": {}
        }
```

and middleware should have code such as below. This file should reside in server/middleware folder of your node_module.

```javaScript
module.exports = function (options) {
  return function(req, res, next) {

      return next(); // must call next() otherwise next middlware will not be executed and system will hang.
  }

}
```


# oeCloud API Documentation

## Common Utility API

There are simple utility functions which can be used in your module

### IsBaseEntity(Model)


This utility function checks if given Model is derived from BaseEntity. This will be useful many times in programming. Below is code snippet.

```javaScript
const oecloudUtil = require('oecloud/lib/util');
const loopback = require('loopback');
var customerModel = loopback.findModel('Customer')
console.log("Customer Model is derived from BaseEntity ", oecloudUtil.isBaseEntity(customerModel));
```

### mergeObjects(obj1, obj2)

This function merge two objects. Below is usage and examples. Developer can use lodash libray for that also.

```javaScript
const util = require('oecloud/lib/util');

var o1 = { a : "a" };
var o2 = { b : "b" };
var o = util.mergeObjects(o1, o2);
// { a: "a", b : "b" }

var o1 = { a : "a" , c : { d : { e : "e" } } };
var o2 = { b : "b" };
util.mergeObjects(o1, o2);
//  { a : "a" , b: "b", c : { d : { e : "e" } } };


var o1 = { a : "a" , c : { d : { e : "e" } } };
var o2 = { a : "b" };
util.mergeObjects(o1, o2);
//  { a : "b" , c : { d : { e : "e" } } };

var o1 = { a : [1,2,3] , c : { d : { e : "e" } } };
var o2 = { a : [2,4,5] };
util.mergeObjects(o1, o2);
//  { a : [1,2,3,4,5] , c : { d : { e : "e" } } };

```

### checkDependency(app, modules)

This function checks if all modules in app-list satisfies depenency.


### isInstanceQuery(Model, where)

This function checks if this is instance based query where primary key of Model is part of where clause. For nesting, it looks only and clause.

```javaScript
const utils = require('oecloud/lib/util');
utils.isInstanceQuery(newCustomerModel, { where: { name: 'x' } }); // false
utils.isInstanceQuery(newCustomerModel, { where: { and: [{ name: 'x' }, { id: 1 }] } }); // true
utils.isInstanceQuery(newCustomerModel, { where: { and: [{ name: 'x' }, { age: 1 }, { and: [{ id: 1 }, {age : 10}]}] } }); // true
utils.isInstanceQuery(newCustomerModel, { where: { and: [{ name: 'x' }, { age: 1 }, { or: [{ id: 1 }, {age : 10}]}] } }); // false
```


### getIdValue(Model, data)

This function gives you id value in your data.

```javaScript
const utils = require('oecloud/lib/util');
var id = utils.getIdValue(CustomerModel, { id: 10, name: "A" }); // id = 10
var id = utils.getIdValue(CustomerModel, { name: "A" }); // id = undefined
```

### idName(Model)

Returns id field name of the model. By default "id"

```javaScript
const utils = require('oecloud/lib/util');
var idName = idName(CustomerModel); // returns  "id"
```

## Application API

These are the APIs are made available on application object of oeCloud. These APIs mostly should be called before boot.

### setServer(server)

This function will allow application to set http or https server. This way, creating of server can be controlled by application. By default oeCloud will create http server.


```javaScript
const oecloud = require('oe-cloud');

var server = require('http').createServer(oecloud);
oecloud.setServer(server);
```

### boot(__dirname, cb)

This function will boot the application. It will do following typical things, but not limited to that.

* Load all models, mixins, middleware, boot scripts etc from modules in app-list.json
* Merge configuratino like model-config.json.
* Create ModelDefinition entries for all the models of system. Also loads and creates model based on ModelDefinition.
* executes boot scripts in sequence on app-list. Scripts in given module are executed by order of name alphabatically. Therefore, a.js will be executed before b.js.


```javaScript
const oecloud = require('oe-cloud');
oecloud.boot(__dirname, function(err){
  orcloud.start();
})
```


### start()

This function will start web server and starts listening on PORT. Default port is 3000, or it can be set by PORT environment variable. This function will emit application start event 'started' that application can listen on.


```javaScript
const oecloud = require('oe-cloud');
oecloud.start()
oecloud.once('started', function(){
   // do something.
});
```


### addContextField(name, property)

This function adds context parameter to AccessToken. That way, if this field is set during creation of access token, it will be made avaialble throughout the application context.

```javaScript
const oecloud = require('oe-cloud');
oecloud.addContextField('tenantId', {
  type: "string"
});

accessToken.evObserve("before save", function (ctx, next) {
  ctx.instance.tenantId = findTenantIdForUser(ctx.instance.userId);
  return next();
});


// after above code is done during start up of application, "tenantId" is available throughout context

customerModel.evObserve("access", function(ctx, next){
    var context = ctx.options.ctx;

    assert (context.tenantId)
})

customerModel.beforeRemote("*", function(req, res.next){
    var context = req.callContext;

    assert (context.tenantId)
})

```

### removeForceId

This function on app object can be used to remove ForceId of models which are not derived from BaseEntity. **User, Role and RoleMapping** are typical models, which are not derived from **BaseEntity** and you want to remove ForceId setting.

```javascript
var app = require('oe-cloud');
    app.removeForceId('User');
    app.removeForceId('Role');
    app.removeForceId('RoleMapping');
```
However, please note that, **by default** above code is executed as part of boot script. Meaning, by default, ForceId is deisabled for User, Role and RoleMapping models. Therefore, you can create User/Role/Rolemapping data by passing id field explicitly.
If you want to disable this, you can use **disableForceIdForUserModels** setting to true in config.json.

**About ForceId** : In loopback 3, ForceId setting is done on model which is **true** by default. In this case, user/programmer cannot create a record on model by passing his/her own id. Id is always generated by loopback. To disable this setting, you can use removeForceId call.


### setACLToBaseEntity
This function should be called to set default ACL on BaseEntity Model. in oeCloud 2.x, BaseEntity doesn't have any ACL applied. Therefore, all operations on all models which are derived from BaseEntity are possible. To prevent that, programmer can call this method.

```javaScript
var oecloud = require('oe-cloud');
oecloud.setACLToBaseEntity({
  "accessType": "WRITE",
  "principalType": "ROLE",
  "principalId": "$unauthenticated",
  "permission": "DENY"
  });
// oecloud.boot() and other code
```
Remember that this has to be done before other models are loaded - meaning it should be done before you call boot().


### observers

As a programmer, you can implement oeCloud observer hooks. The most important hook is 'loaded'. you can use code similar to following to create the observer hook. 'loaded' observer is executed when all modules in app-list.json is loaded. you can change some configuration, add or remove mixins before boot gets executed.

```javaScript
    app.observe('loaded', function(ctx, next){
        //ctx.app will have app handle
        return next();
    });
```

## Configurations

| Name | Default | comment |
| ------ | ------ | ------- |
| disableAboutMe | false | AboutMe API is exposed and any authenticated user can call /api/users/aboutme to know about logged in user |
| disableDefaultAuth | false | Authentication mechanism is enabled by default. you can set this value to true to disable it |
| enableAuthCookie | false | You can enable Auth cookie to be sent when user login using /api/users/login API. By default it is disabled |
| enableForceIdForUserModels | false | ForceId is disabled for Users/Role/RoleMapping models. You can enable it to keep default loopback behavior |


## Remote End point (RestAPI)

### aboutMe

Logged in user can know about him/herself by calling this API. API signature is shown below. If auth cookie is enabled, you don't have to pass access_token if you are using browser.

```
GET
http://localhost:3000/api/users/aboutme?access_token=<youraccesstoken>
```


## Add fields to BaseEntity or ModelDefinition
* If you want to add (change) schema of BaseEntity or ModelDefinition, you can do so by provided API as shown below.
* Typically, you will write observer hook and call method provided by app. For example, below, **_version** property is added to ModelDefinition model.
* Also you can see BaseEntity will start having autoscope field with 'tenantId' as value.

```
var app = require('oe-cloud');
app.observe('loaded', function(ctx, next){
  app.addSettingsToModelDefinition({properties : {_versioning : {type : "boolean", default : false}}});
  app.addSettingsToModelDefinition({properties : {HistoryMixin : {type : "boolean", default: false}}});

  app.addSettingsToBaseEntity({autoscope:["tenantId"]});

  return next();
})
```

# oe-cloud - Difference between old and new

| Feature | Exisiting | Proposed |
| ------ | ------ | ------- |
| Custom Types Register-Email & timestamp | Data Source juggler Change | Model Builder Wrapper [oe-cloud](https://github.com/EdgeVerve/oe-cloud) |
| **after access** observer notification | DAO Change | Data Source juggler Wrapper [oe-cloud](https://github.com/EdgeVerve/oe-cloud) |
| app-list.json handling | server.js | [oe-cloud](https://github.com/EdgeVerve/oe-cloud) |
| EvObserver | Mixin in file | [oe-cloud](https://github.com/EdgeVerve/oe-cloud) |
| Audit Field  | Mixin in file | [oe-common-mixins](https://github.com/EdgeVerve/oe-common-mixins) |
| Versioning | Mixin in file | [oe-common-mixins](https://github.com/EdgeVerve/oe-common-mixins) |
| History | Mixin | [oe-common-mixins](https://github.com/EdgeVerve/oe-common-mixins)|
| Idempotency | Mixin+DAO | Not done |
| Soft Delete  | Mixin + DAO | [oe-common-mixins](https://github.com/EdgeVerve/oe-common-mixins) |
| Validations | Mixin | [oe-validation](https://github.com/EdgeVerve/oe-validation) |
| Expression Support | Mixin | [oe-expression](https://github.com/EdgeVerve/oe-expression) |
| Model Composite - Implicit and Explicit | DAO Change | DAO Wrapper [oe-model-composite](https://github.com/EdgeVerve/oe-model-composite) |
| Data Personalization | Mixin | [oe-personalization](https://github.com/EdgeVerve/oe-personalization) |
| Service Personalization | Mixin+Boot | Boot [oe-service=personalization](https://github.com/EdgeVerve/oe-service-personalization) |
| Cachinge | Mixin+DAO | DAO Wrapper [oe-cache](https://github.com/EdgeVerve/oe-cache) |

