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
        } else {
          const data = instance.__data;
          data.options = options;
          const relationInfo = getRelationInfo(modelTo, data);
          resolve(Object.assign({}, data, relationInfo));
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
        } else {
          const data = instance.__data;
          data.options = options;
          const relationInfo = getRelationInfo(modelTo, data);
          resolve(Object.assign({}, data, relationInfo));
        }
      });
    });
  }

  // TODO: hasMany implementation doesn't work as expected

  // ,

  // hasMany: () => {}
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

module.exports = function () {
  const executeDecisionTable = this.decisionTable.execute_decision_table;
  this.decisionTable.execute_decision_table = (id, table, payload, cb) => {
    const options = payload.options;
    const { modelName } = options;
    const model = loopback.getModel(modelName);
    const relationInfo = getRelationInfo(model, payload);
    const modifiedPayload = Object.assign({}, payload, relationInfo);
    executeDecisionTable(id, table, modifiedPayload, cb);
  };
};
