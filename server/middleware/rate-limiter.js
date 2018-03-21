var config = require('../config').rateLimiter

var redis = require("redis"),
  client = redis.createClient({ host: config.redisHost, port: config.redisPort })

module.exports = function rateLimiterMiddleware(options) {
  return function rateLimiter(req, res, next) {
    var ip = req.connection.remoteAddress
    client.get(ip, function (err, reply) {

      if (!reply) {
        client.set(ip, '1', 'EX', config.rateLimitTLLSeconds)
      }
      if (Number(reply) >= config.rateLimitThreshold) {
        res.status(500).send('Unauthorized. \n rate exceeded.');
      }
      else {
        client.incr(ip);
        next();
      }
    })
  };
};


