/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

const loopback = require('loopback');

const relationUtils = (relationDef, payload) => ({
  belongsTo: () => {
    const { keyFrom, modelTo } = relationDef;
    const fkValue = payload[keyFrom];
    const { options } = payload;
    return new Promise((resolve, reject) => {
      modelTo.findById(fkValue, options, (err, instance) => {
        if (err) {
          reject(err);
        } else if (!instance) {
          reject(
            `belongsTo relation access - ${modelTo.modelName} instance not found`
          );
        } else {
          const data = instance.__data;
          data.options = options;
          const relationInfo = getRelationInfo(modelTo, data);
          const modifiedData = addToPlugin(relationInfo, data);
          resolve(modifiedData);
        }
      });
    });
  },
  hasOne: () => {
    const { keyTo, modelTo } = relationDef;
    const fkValue = payload[keyTo];
    const { options } = payload;
    return new Promise((resolve, reject) => {
      modelTo.findById(fkValue, options, (err, instance) => {
        if (err) {
          reject(err);
        } else if (!instance) {
          reject(
            `hasOne relation access - ${modelTo.modelName} instance not found`
          );
        } else {
          const data = instance.__data;
          data.options = options;
          const relationInfo = getRelationInfo(modelTo, data);
          const modifiedData = addToPlugin(relationInfo, data);
          resolve(modifiedData);
        }
      });
    });
  },
  hasMany: () => {
    const { keyFrom, keyTo, modelTo } = relationDef;
    const fkValue = payload[keyFrom];
    const { options } = payload;
    return new Promise((resolve, reject) => {
      const where = {};
      where[keyTo] = fkValue;
      const query = { where };
      modelTo.find(query, options, (err, instances) => {
        if (err) {
          reject(err);
        } else {
          const modifiedData = instances.map(instance => {
            const data = instance.__data;
            data.options = options;
            const relationInfo = getRelationInfo(modelTo, data);
            return addToPlugin(relationInfo, data);
          });
          resolve(modifiedData);
        }
      });
    });
  }
});

function relationApisFactory(relations, payload) {
  const relationApis = Object.keys(relations).reduce((recur, relationName) => {
    const relationDef = relations[relationName];
    const obj = {};
    obj[relationName] = relationUtils(relationDef, payload)[relationDef.type];
    return Object.assign({}, recur, obj);
  }, {});
  return relationApis;
}

function getRelationInfo(model, payload) {
  const relations = model.relations;
  const relationApis = relationApisFactory(relations, payload);
  return relationApis;
}

function addToPlugin(plugin, payload) {
  if (payload.plugin) {
    const pluginNew = Object.assign({}, payload.plugin, plugin);
    return Object.assign({}, payload, { plugin: pluginNew });
  }
  return Object.assign({}, payload, { plugin });
}

const jsFeelRelationsPlugin = function () {
  const executeDecisionTable = this.decisionTable.execute_decision_table;
  this.decisionTable.execute_decision_table = (id, table, data, cb) => {
    const options = data.options;
    let modifiedData = data;
    if (options && options.modelName) {
      const { modelName } = options;
      const model = loopback.getModel(modelName);
      const relationInfo = getRelationInfo(model, data);
      modifiedData = addToPlugin(relationInfo, data);
    }
    executeDecisionTable(id, table, modifiedData, cb);
  };
};

module.exports = { jsFeelRelationsPlugin };
