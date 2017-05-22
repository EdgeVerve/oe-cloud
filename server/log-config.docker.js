var graylogHostIP = process.env.GRAYLOG_HOST;

module.exports =
{
  'logStreams': [
    {
      'type': 'pretty'
    },
    {
      'type': 'udp',
      'host': graylogHostIP,
      'port': 12201
    }
  ],

  'levels': {
    'default': 'error'
  },

  'enableContextLogging': 1
};
