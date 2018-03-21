const config = require('../config')
const rateLimiterConfig = config.rateLimiter || { isEnable: false }
const { redisHost, redisPort, rateLimitTLLSeconds, rateLimitThreshold, isEnable } = rateLimiterConfig

const redis = require("redis"),
  client = redis.createClient({ host: redisHost, port: redisPort })

module.exports = function rateLimiterMiddleware(options) {
  return isEnable ? function rateLimiter(req, res, next) {
    const ip = req.connection.remoteAddress;
    client.get(ip, function (err, rateCount) {
      if (!rateCount) {
        client.set(ip, '1', 'EX', rateLimitTLLSeconds);
      }
      if (Number(rateCount) >= rateLimitThreshold) {
        res.status(500).send('Unauthorized. \n rate exceeded.');
      }
      else {
        client.incr(ip);
        next();
      }
    })
  } : function rateLimiterDisabled(req, res, next) { next(); };
};


