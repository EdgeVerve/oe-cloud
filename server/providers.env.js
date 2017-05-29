var providers = {};
if (process.env.PROVIDERS) {
  providers = process.env.PROVIDERS;
  providers = JSON.parse(providers);
}
module.exports = providers;
