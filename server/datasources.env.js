var datasources = {};
if (process.env.DATASOURCES) {
  datasources = process.env.DATASOURCES;
  datasources = JSON.parse(datasources);
}
module.exports = datasources;
