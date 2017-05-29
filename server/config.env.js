var config = {};
if (process.env.CONFIG) {
  config = process.env.CONFIG;
  config = JSON.parse(config);
}

module.exports = config;
