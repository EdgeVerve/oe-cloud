module.exports = function (Model) {
  Model.prototype.remote2 = function (cb) {
    cb(null, {message: 'remote 2 ok'});
  };

  Model.remoteMethod('remote2', {
    isStatic: false,
    description: 'remote2',
    accessType: 'READ',
    accepts: [
    ],
    http: {
      verb: 'GET',
      path: '/remote2'
    },
    returns: {
      type: 'object',
      root: true
    }});

  Model.observe('after save', function (ctx, next) {
    var err = new Error('Note after save fail');
    console.log('failing on after save Note');
    return next(err);
  });
};
