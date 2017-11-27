/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

module.exports = (externalFns) => function () {
  const executeDecisionTable = this.decisionTable.execute_decision_table;
  this.decisionTable.execute_decision_table = (id, table, data, cb) => {
    const { options } = data;
    const extFns = externalFns(options);
    const modifiedData = Object.assign({}, data, extFns);
    executeDecisionTable(id, table, modifiedData, cb);
  };
};
