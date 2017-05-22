/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
var async = require('async');
var path = require('path');
var fs = require('fs');
var Admzip = require('adm-zip');
var logger = require('../../../lib/logger');
var log = logger('admin');

module.exports = function AppUser(admin) {
  admin.findAllModels = function adminFindAllModels(options, cb) {
    var models = admin.app.get('metadataModelList');
    if (!models) {
      var err = new Error('Model List not configured, parameter name is metadataModelList');
      err.retriable = false;
      return cb(err, []);
    }

    async.concat(Object.keys(models), function modelsForEachKeys(name, done) {
      if (!models[name]) {
        return done();
      }

      var m = loopback.findModel(name);
      if (!m) {
        return done();
      }

      if (!m.find) {
        return done();
      }

      var query = {};
      query.order = ['_createdOn ASC', 'id ASC'];
      if (name === 'ModelDefinition') {
        query.where = {
          filebased: false
        };
      }

      m.find(query, options, function modelFind(err2, records) {
        var obj = {
          name: name,
          records: records
        };
        done(err2, obj);
      });
    }, function modelFindCb(err, results) {
      if (err) {
        return cb(err);
      }
      return cb(null, results);
    });
  };

  // as of now only do insert / update in db
  // not delete
  var uploadModel = function uploadModel(modelName, options, cb) {
    var fpath = path.join(admin.app.locals.apphome, '..', 'metadata', modelName + '.json');

    var response = {};
    fs.readFile(fpath, 'utf8', function readFileFn(err, data) {
      if (err) {
        return cb(err, response);
      }
      var obj = JSON.parse(data);
      var amodel = loopback.getModel(modelName);

      amodel.find({}, options, function modelFindFn(err2, dbrecords) {
        if (err2) {
          log.error(options, 'Error while uploading', modelName, ' model');
          return cb(null, {});
        }
        async.each(obj, function objEachKey(record, done) {
          amodel.findById(record.id, options, function modelFindById(err, dbrec) {
            if (err) {
              return done(err);
            }
            if (dbrec) {
              record._version = dbrec._version;
              record.id = dbrec.id;
              amodel.upsert(record, options, function modelFind(err, updatedRecord) {
                if (err) {
                  done(err);
                }
                done();
              });
            } else {
              amodel.create(record, options, function modelCreate(err, dbrec) {
                if (err) {
                  done(err);
                }
                done();
              });
            }
          });
        }, function asyncFinalCallback(err) {
          if (err) {
            throw err;
          }
          cb(err, {});
        });
      });
    });
  };

  admin.upload = function adminUpload(options, cb) {
    var models = admin.app.get('metadataModelList');
    if (!models) {
      log.error(options, 'metadataModelList not found');
      return cb(null, {});
    }

    async.each(Object.keys(models), function modelEachKey(name, done) {
      if (!models[name]) {
        return done();
      }

      var m = loopback.findModel(name);
      if (!m) {
        return done();
      }

      if (!m.find) {
        return done();
      }

      uploadModel(name, options, function uploadModel(err, data) {
        done(err, data);
      });
    }, function finalCallback(err) {
      if (err) {
        return cb(err);
      }
      return cb(null, {});
    });
  };

  admin.remoteMethod('upload', {
    description: 'upload metadata models',
    accessType: 'READ',
    accepts: [
    ],
    http: {
      verb: 'POST',
      path: '/upload'
    },
    returns: {
      type: 'object',
      root: true
    }
  });

  admin.download = function adminDownload(options, cb) {
    var zip = new Admzip('');
    admin.findAllModels(options, function adminFindAllModels(err, data) {
      if (err) {
        return cb(err, '');
      }
      data.forEach(function dataForEach(rec) {
        zip.addFile(rec.name + '.json', JSON.stringify(rec.records, 0, 2));
      });
      var buf = zip.toBuffer();
      cb(null, buf, 'application/octet-stream', 'attachment; filename=metdata.zip');
    });
  };

  admin.remoteMethod('download', {
    description: 'download metadata models from file to db',
    accessType: 'READ',
    accepts: [
    ],
    http: {
      verb: 'GET',
      path: '/download'
    },
    returns: [
      {
        arg: 'body',
        type: 'file',
        root: true
      },
      {
        arg: 'Content-Type',
        type: 'string',
        http: {
          target: 'header'
        }
      },
      {
        arg: 'content-disposition',
        type: 'string',
        http: {
          target: 'header'
        }
      }
    ]
  });
};
