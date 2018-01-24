/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries.
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/
/**
 * This boot script is used to initialize js-feel.
 *
 * @memberof Boot Scripts
 * @author Pragyan Das
 * @name js-feel init
 */

const logger = require('oe-logger');
const log = logger('jsfeel-init');
const jsFeel = require('js-feel')();
const {
  jsFeelRelationsPlugin,
  jsFeelExtFnPlugin,
  jsFeelCachePlugin
} = require('../../lib/js-feel-plugins');

const settings = { logger };

module.exports = function JsFeelInit(app, cb) {
  log.info('initializing js-feel');
  jsFeel.init(settings);
  jsFeel.use(jsFeelCachePlugin);
  const jsFeelRelation = app.get('jsFeelRelation');
  const jsFeelExternalFunction = app.get('jsFeelExternalFunction');
  if (jsFeelRelation && !jsFeelRelation.disabled) {
    jsFeel.use(jsFeelRelationsPlugin);
  }
  if (jsFeelExternalFunction && !jsFeelExternalFunction.disabled) {
    const path = jsFeelExternalFunction.path;
    const externalFns = path && require(`../../${path}`);
    externalFns && jsFeel.use(jsFeelExtFnPlugin(externalFns));
  }
  cb();
};
