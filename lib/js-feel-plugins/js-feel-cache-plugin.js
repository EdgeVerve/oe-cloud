/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

const jsFeelCachePlugin = function () {
  const graphAstCache = {};
  const {
    createDecisionGraphAST,
    executeDecisionService
  } = this.decisionService;
  this.executeDecisionGraph = (graph, decisions, payload) => {
    const { name } = graph;
    let ast = graphAstCache[name];
    if (!ast) {
      ast = createDecisionGraphAST(graph.data);
      graphAstCache[name] = ast;
    }
    const decisionPromises = decisions.map(decision =>
      executeDecisionService(ast, decision, payload, name)
    );
    return Promise.all(decisionPromises);
  };
};

module.exports = { jsFeelCachePlugin };
