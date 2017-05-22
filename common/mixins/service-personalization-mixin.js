/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

/**
 * This mixin is to execute Service Personalization Rules before access and after access
 * as well as before save and after save on model.
 *
 * @mixin Service Personalization Mixin
 * @author Sachin, Pradeep, Gourav
 */

var logger = require('../../lib/logger');
var log = logger('service-personalization-mixin');
var servicePersonalizer = require('../../lib/service-personalizer');

module.exports = function ServicePersonalizationMixin(Model) {
  Model.evObserve('after save', servicePersonalizationMixinAfterSaveObserverFn);
  Model.evObserve('before save', servicePersonalizationMixinBeforeSaveObserverFn);
  Model.evObserve('access', servicePersonalizationAccessHook);
  Model.evObserve('after accesss', servicePersonalizationAfterAccessHook);

  // Listening on beforeRemote find event and adding fieldList to filter query param.
  Model.beforeRemote('find', function servicePersonalizationMixinBeforeFindFn(ctx, modelInstance, next) {
    if (ctx.args.filter) {
      // changed to resolved the error need to be checked.
      ctx.args.filter = (typeof ctx.args.filter !== 'object') ? JSON.parse(ctx.args.filter) : ctx.args.filter;
      ctx.args.filter.fieldList = ctx.args.filter.fieldList ||
        generateFieldList(Model.definition.properties);
    }
    next();
  });

  // Loops through all the properties of Model and generate array of fields.
  function generateFieldList(properties, modelProp, baseModelName, propsArray) {
    var fieldList = [];
    for (var prop in properties) {
      if (properties.hasOwnProperty(prop) && prop !== 'id') {
        if (typeof properties[prop].type instanceof Function && properties[prop].type.sharedClass !== 'undefined') {
          var props = properties[prop].type.definition.properties;
          var newModelProp = !modelProp ? prop : (modelProp + '.' + prop);
          var modelName = properties[prop].type.definition.name;
          propsArray = propsArray || [];
          if ((typeof baseModelName === 'undefined' || baseModelName !== modelName) &&
            propsArray.indexOf(props) === -1) {
            propsArray.push(props);
            fieldList = fieldList.concat(generateFieldList(props, newModelProp, modelName, propsArray));
          } else {
            propsArray = propsArray || [];
            fieldList.push(newModelProp);
          }
        } else {
          fieldList.push(!modelProp ? prop : (modelProp + '.' + prop));
        }
      }
    }
    return fieldList;
  }
};

/**
 * This function is attached to observer hook after save.
 * This function will execute personalization rule and changes the response according
 * to personalization rule.
 *
 * @param {Object} ctx - Context Object
 * @param {function} next - next middleware function
 * @returns {function} next - next middleware function
 * @memberof Service Personalization Mixin
 */
function servicePersonalizationMixinAfterSaveObserverFn(ctx, next) {
  if (ctx.Model.definition.settings.mixins && ctx.Model.definition.settings.mixins.ServicePersonalizationMixin === false) {
    return next();
  }
  log.debug(ctx.options, 'ServicePersonalizationMixin after save called');
  if (ctx.Model.modelName !== 'PersonalizationRule') {
    servicePersonalizer.getPersonalizationRuleForModel(ctx.Model.modelName, ctx, function servicePersonalizationMixinGetRule(rule) {
      if (rule) {
        servicePersonalizer.applyPersonalizationRule(ctx, rule.personalizationRule, function servicePersonalizationMixinApplyRule() {
          var callContext = ctx.options;
          log.debug(ctx.options, 'after save called. PostProcessingFunction = ',
            JSON.stringify(callContext.postProcessingFns));

          // var postProcessingFns = callContext.postProcessingFns[ctx.Model.modelName];
          var postProcessingFns = callContext.postProcessingFns ? callContext.postProcessingFns[ctx.Model.modelName] : null;
          if (postProcessingFns) {
            for (var i in postProcessingFns) {
              if (postProcessingFns.hasOwnProperty(i)) {
                var processingFn = postProcessingFns[i];
                processingFn.execute(ctx);
              }
            }
            delete callContext.postProcessingFns[ctx.Model.modelName];
            next();
          } else {
            next();
          }
        });
      } else {
        next();
      }
    });
  } else {
    next();
  }
}

/**
 * This function is attached to observer hook before save.
 * This function will reverse execute personalization rule
 * and change the data to be posted on database if personalized values are posted.
 *
 * @param {Object} ctx - Context Object
 * @param {function} next - next middleware function
 * @returns {function} next - next middleware function
 * @memberof Service Personalization Mixin
 */
function servicePersonalizationMixinBeforeSaveObserverFn(ctx, next) {
  if (ctx.Model.definition.settings.mixins && ctx.Model.definition.settings.mixins.ServicePersonalizationMixin === false) {
    return next();
  }
  log.debug(ctx.options, 'ServicePersonalizationMixin before save called');
  if (ctx.Model.modelName !== 'PersonalizationRule') {
    servicePersonalizer.getPersonalizationRuleForModel(ctx.Model.modelName, ctx, function servicePersonalizationMixinBeforeCreateGetReverse(rule) {
      if (rule) {
        servicePersonalizer.applyReversePersonalizationRule(ctx, rule.personalizationRule, function servicePersonalizationMixinBeforeCreateApplyReverse() {
          var callContext = ctx.options;
          log.debug(ctx.options, 'before save called. PreProcessingFunctions = ',
            JSON.stringify(callContext.preProcessingFns));
          var preProcessingFns = callContext.preProcessingFns ? callContext.preProcessingFns[ctx.Model.modelName] : null;
          // var preProcessingFns = callContext.preProcessingFns[ctx.Model.modelName];

          if (preProcessingFns) {
            for (var i in preProcessingFns) {
              if (preProcessingFns.hasOwnProperty(i)) {
                var processingFn = preProcessingFns[i];
                processingFn.execute(ctx);
              }
            }
            delete callContext.preProcessingFns[ctx.Model.modelName];
            next();
          } else {
            next();
          }
        });
      } else {
        next();
      }
    });
  } else {
    next();
  }
}

/**
 * This function is attached to observer hook after access.
 * This function will execute personalization rule functions.
 *
 * @param {Object} ctx - Context Object
 * @param {function} next - next middleware function
 * @returns {function} next - next middleware function
 * @memberof Service Personalization Mixin
 */
function servicePersonalizationAfterAccessHook(ctx, next) {
  if (ctx.Model.definition.settings.mixins && ctx.Model.definition.settings.mixins.ServicePersonalizationMixin === false) {
    return next();
  }

  if (ctx.Model.modelName !== 'PersonalizationRule') {
    var callContext = ctx.options;
    var postProcessingFns;
    if (callContext) {
      postProcessingFns = callContext.postProcessingFns ? callContext.postProcessingFns[ctx.Model.modelName] : null;
    }
    if (postProcessingFns) {
      log.debug(ctx.options, ' servicePersonalizationAfterAccessHook postProcessingFns ', JSON.stringify(postProcessingFns));

      for (var i in postProcessingFns) {
        if (postProcessingFns.hasOwnProperty(i)) {
          var processingFn = postProcessingFns[i];
          processingFn.execute(ctx);
        }
      }
      delete callContext.postProcessingFns[ctx.Model.modelName];
      next();
    } else {
      next();
    }
  } else {
    next();
  }
}

/**
 * This function is attached to observer hook access.
 * This function will add personalization rule functions in context.
 * if supported by db then adds in db query.
 *
 * @param {Object} ctx - Context Object
 * @param {function} next - next middleware function
 * @returns {function} next - next middleware function
 * @memberof Service Personalization Mixin
 */
function servicePersonalizationAccessHook(ctx, next) {
  if (ctx.Model.definition.settings.mixins && ctx.Model.definition.settings.mixins.ServicePersonalizationMixin === false) {
    return next();
  }
  log.debug(ctx.options, 'access hook is called. model  -', ctx.Model.modelName);

  if (!ctx.Model.definition.settings.mixins.HistoryMixin) {
    return next();
  }

  var proceed = function servicePersonalizationAccessHookProceedFn() {
    next();
  };

  // For models other than PersonalizationRule, get PersonalizationRules
  if (ctx.Model.modelName !== 'PersonalizationRule') {
    servicePersonalizer.getPersonalizationRuleForModel(ctx.Model.modelName, ctx, function servicePersonalizationAccessHookGetRuleCb(rule) {
      if (rule) {
        servicePersonalizer.applyPersonalizationRule(ctx, rule.personalizationRule, function servicePersonalizationAccessHookApplyRuleCb() {
          proceed();
        });
      } else {
        proceed();
      }
    });
  } else {
    proceed();
  }
}
