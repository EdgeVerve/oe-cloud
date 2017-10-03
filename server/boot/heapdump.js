/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * Does heap dump of nodejs process for every HEAPDUMP_INTERVAL env variable.
 * Able to download the last two heapdump snapshot files with /heapdump GET api
 *
 * @heapdump Boot Scripts
 * @author Pradeep Kumar Tippa
 * @name Heap Dump
 */
var AdmZip = require('adm-zip');
var async = require('async');
var fs = require('fs');
var log = require('oe-logger')('heapdump');
// @ms node_module is internal dependency of @debug and @node-red/send
var ms =  require('ms');
var path = require('path');

module.exports = function HeapDumpFn(app, cb) {
  if (process.env.HEAPDUMP_INTERVAL && ms) {
    var heapdumpInterval = ms(process.env.HEAPDUMP_INTERVAL);
    if (heapdumpInterval) {
      app.once('started', function appStartedEventCb(appinstance) {
        var heapdump;
        try {
          heapdump = require('heapdump');
        } catch (ex) {
          log.error(log.defaultContext(), 'Got error while requiring "heapdump" node_module. Error: ', ex);
          heapdump = null;
        }
        // Checking if 'heapdump' node_module was successfully required.
        if (heapdump) {
          var dirToStoreDump = path.join(appinstance.locals.apphome, '..');
          var heapdumpName = 'heapdump_1.heapsnapshot';
          var heapdumpName1 = 'heapdump_1.heapsnapshot';
          var heapdumpName2 = 'heapdump_2.heapsnapshot';
          var heapdumpZip = 'heapdump.zip';
          var writeHeapdump = function writeHeapdumpFn() {
            heapdump.writeSnapshot(path.join(dirToStoreDump, heapdumpName), function heapdumpSnapShotFnCb(err, filename) {
              if (err) {
                log.error(log.defaultContext(), 'Encountered error while create heapdump snapshot. Error: ', err);
                return;
              }
              log.debug(log.defaultContext(), 'Created heapdump snapshot file', filename);
              // Switching name from heapdumpName1 to heapdumpName2 and vice versa.
              heapdumpName = (heapdumpName === heapdumpName1) ? heapdumpName2 : heapdumpName1;
            });
          };
          // Writing initial dump.
          writeHeapdump();
          // Calling writeHeapDump for given HEAPDUMP_INTERVAL
          setInterval(writeHeapdump, heapdumpInterval);

          // Adding /heapdump route to application.
          app.get('/heapdump', function (req, res, next) {
            // Checking accessToken in request.
            if (!req.accessToken || !req.accessToken.roles || req.accessToken.roles.length === 0) {
              return res.status(401).json({ error: 'unauthorized' });
            }

            // Checking that atleast one role must be admin from accessToken roles.
            var isAdminRole = req.accessToken.roles.some((role) => {
              return role === 'admin';
            });

            if (!isAdminRole) {
              return res.status(401).json({ error: 'unauthorized' });
            }

            // Checking heapdump files are available or not.
            if (!fs.existsSync(path.join(dirToStoreDump, heapdumpName1)) ||
                !fs.existsSync(path.join(dirToStoreDump, heapdumpName2))) {
              return res.status(500).json({ error: 'One or more heapdump files are not present to send.' });
            }
            var zip = new AdmZip('');
            // Reading buffer of heapdump files in parallel and adding to adm-zip.
            async.each([heapdumpName1, heapdumpName2], (file, callback) => {
              fs.readFile(path.join(dirToStoreDump, file), (err, data) => {
                if (err) {
                  return callback(err);
                }
                zip.addFile(file, data);
                callback();
              });
            }, (err) => {
              if (err) {
                log.error(log.defaultContext(), 'Encountered error while zipping heapdump snapshots. Error: ', err);
                return res.status(500).json({ err: err, msg: 'Encountered error while zipping heapdump snapshots.' });
              }
              res.writeHead(200, {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': 'attachment; filename=' + heapdumpZip
              });
              // Getting the Buffer from zip and sending it in response.
              res.write(zip.toBuffer(), 'binary');
              res.end(null, 'binary');
            });
          });
        }
      });
    } else {
      log.error(log.defaultContext(), 'HEAPDUMP_INTERVAL env variable is not in proper format. Check @ms node_module for supported format.');
    }
    return cb();
  }
  cb();
};
