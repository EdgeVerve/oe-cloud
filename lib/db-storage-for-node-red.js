/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */

/**
 * This file is customized version of originial node-red's localfilesystem.js in node-red/red/runtime/storage folder
 * localfilesystem.js file is responsible for storing node-red flows into file system and loading same from file system.
 * This file has modified saveFlows and loadFlows - in fact it does nothing in both the cases.
 * loadflow and saveflow is handled in api. Since this file is originally from node-red, we will ignore jshint errors
 * Author : Atul/Ori
 **/

var fs = require('fs-extra');
var when = require('when');
var nodeFn = require('when/node/function');
var fspath = require('path');
var mkdirp = fs.mkdirs;

var log = require('./logger')('db-storage-for-node-red');

var promiseDir = nodeFn.lift(mkdirp);

var settings;
var flowsFile;
var flowsFullPath;
var credentialsFile;
var credentialsFileBackup;
var oldCredentialsFile;
var sessionsFile;
var libDir;
var libFlowsDir;
var globalSettingsFile;

function getFileMeta(root, path) {
  var fn = fspath.join(root, path);
  var fd = fs.openSync(fn, 'r');
  var size = fs.fstatSync(fd).size;
  var meta = {};
  var read = 0;
  var length = 10;
  var remaining = '';
  var buffer = new Buffer(length);
  while (read < size) {
    read += fs.readSync(fd, buffer, 0, length);
    var data = remaining + buffer.toString();
    var parts = data.split('\n');
    remaining = parts.splice(-1);
    for (var i = 0; i < parts.length; i += 1) {
      var match = /^\/\/ (\w+): (.*)/.exec(parts[i]);
      if (match) {
        meta[match[1]] = match[2];
      } else {
        read = size;
        break;
      }
    }
  }
  fs.closeSync(fd);
  return meta;
}

function getFileBody(root, path) {
  var body = '';
  var fn = fspath.join(root, path);
  var fd = fs.openSync(fn, 'r');
  var size = fs.fstatSync(fd).size;
  var scanning = true;
  var read = 0;
  var length = 50;
  var remaining = '';
  var buffer = new Buffer(length);
  while (read < size) {
    var thisRead = fs.readSync(fd, buffer, 0, length);
    read += thisRead;
    if (scanning) {
      var data = remaining + buffer.slice(0, thisRead).toString();
      var parts = data.split('\n');
      remaining = parts.splice(-1)[0];
      for (var i = 0; i < parts.length; i += 1) {
        if (!/^\/\/ \w+: /.test(parts[i])) {
          scanning = false;
          body += parts[i] + '\n';
        }
      }
      if (!/^\/\/ \w+: /.test(remaining)) {
        scanning = false;
      }
      if (!scanning) {
        body += remaining;
      }
    } else {
      body += buffer.slice(0, thisRead).toString();
    }
  }
  fs.closeSync(fd);
  return body;
}

/**
 * Write content to a file using UTF8 encoding.
 * This forces a fsync before completing to ensure
 * the write hits disk.
 * @param  {string} path - path of file
 * @param  {string} content - content to be written to file
 * @returns {promise} - resolved promise
 */
function writeFile(path, content) {
  return when.promise(function writeFilePromiseFn(resolve, reject) {
    var stream = fs.createWriteStream(path);
    stream.on('open', function writeFileStreamOpenFn(fd) {
      stream.end(content, 'utf8', function writeFileStreamEndFn() {
        fs.fsync(fd, resolve);
      });
    });
    stream.on('error', function writeFileStreamErrorFn(err) {
      reject(err);
    });
  });
}

var dbstorageForNodeRed = {
  init: function init(_settings) {
    settings = _settings;

    var promises = [];

    if (!settings.userDir) {
      try {
        fs.statSync(fspath.join(process.env.NODE_RED_HOME, '.config.json'));
        settings.userDir = process.env.NODE_RED_HOME;
      } catch (err) {
        settings.userDir = fspath.join(process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE || process.env.NODE_RED_HOME, '.node-red');
        if (!settings.readOnly) {
          promises.push(promiseDir(fspath.join(settings.userDir, 'node_modules')));
        }
      }
    }

    if (settings.flowFile) {
      flowsFile = settings.flowFile;
      // handle Unix and Windows "C:\"
      if ((flowsFile[0] === '/') || (flowsFile[1] === ':')) {
        // Absolute path
        flowsFullPath = flowsFile;
      } else if (flowsFile.substring(0, 2) === './') {
        // Relative to cwd
        flowsFullPath = fspath.join(process.cwd(), flowsFile);
      } else {
        try {
          fs.statSync(fspath.join(process.cwd(), flowsFile));
          // Found in cwd
          flowsFullPath = fspath.join(process.cwd(), flowsFile);
        } catch (err) {
          // Use userDir
          flowsFullPath = fspath.join(settings.userDir, flowsFile);
        }
      }
    } else {
      flowsFile = 'flows_' + require('os').hostname() + '.json';
      flowsFullPath = fspath.join(settings.userDir, flowsFile);
    }
    var ffExt = fspath.extname(flowsFullPath);
    var ffBase = fspath.basename(flowsFullPath, ffExt);

    credentialsFile = fspath.join(settings.userDir, ffBase + '_cred' + ffExt);
    credentialsFileBackup = fspath.join(settings.userDir, '.' + ffBase + '_cred' + ffExt + '.backup');

    oldCredentialsFile = fspath.join(settings.userDir, 'credentials.json');

    sessionsFile = fspath.join(settings.userDir, '.sessions.json');

    libDir = fspath.join(settings.userDir, 'lib');
    libFlowsDir = fspath.join(libDir, 'flows');

    globalSettingsFile = fspath.join(settings.userDir, '.config.json');

    if (!settings.readOnly) {
      promises.push(promiseDir(libFlowsDir));
    }

    return when.all(promises);
  },


  // / Atul : Following two functions are modified to do nothing.
  // loading and saving of flows is done as part of API handling.
  getFlows: function getFlowsFn() {
    return when.promise(function getFlowsPromiseFn(resolve, reject) {
      return resolve([]);
    });
  },

  saveFlows: function saveFlowsFn(flows) {
    return;
  },

  getCredentials: function getCredentialsFn() {
    return when.promise(function getCredentialsPromiseFn(resolve) {
      fs.readFile(credentialsFile, 'utf8', function getCredentialsReadFileFn(err, data) {
        if (!err) {
          resolve(JSON.parse(data));
        } else {
          fs.readFile(oldCredentialsFile, 'utf8', function getCredentialsReadFileFn(err, data) {
            if (!err) {
              resolve(JSON.parse(data));
            } else {
              resolve({});
            }
          });
        }
      });
    });
  },

  saveCredentials: function saveCredentialsFn(credentials) {
    if (settings.readOnly) {
      return when.resolve();
    }

    try {
      fs.renameSync(credentialsFile, credentialsFileBackup);
    } catch (err) {
      log.error(log.defaultContext(), 'no credential file found');
    }
    var credentialData;
    if (settings.flowFilePretty) {
      credentialData = JSON.stringify(credentials, null, 4);
    } else {
      credentialData = JSON.stringify(credentials);
    }
    return writeFile(credentialsFile, credentialData);
  },

  getSettings: function getSettingsFn() {
    return when.promise(function getSettingsPromiseFn(resolve, reject) {
      fs.readFile(globalSettingsFile, 'utf8', function getSettingsReadFileFn(err, data) {
        if (!err) {
          try {
            return resolve(JSON.parse(data));
          } catch (err2) {
            // log.trace("Corrupted config detected - resetting");
          }
        }
        return resolve({});
      });
    });
  },
  saveSettings: function saveSettingsFn(settings) {
    if (settings.readOnly) {
      return when.resolve();
    }
    return writeFile(globalSettingsFile, JSON.stringify(settings, null, 1));
  },
  getSessions: function getSessionsFn() {
    return when.promise(function getSessionsPromiseFn(resolve, reject) {
      fs.readFile(sessionsFile, 'utf8', function readFileCbFn(err, data) {
        if (!err) {
          try {
            return resolve(JSON.parse(data));
          } catch (err2) {
            log.trace(log.defaultContext(), 'Corrupted sessions file - resetting');
          }
        }
        resolve({});
      });
    });
  },
  saveSessions: function saveSessionsFn(sessions) {
    if (settings.readOnly) {
      return when.resolve();
    }
    return writeFile(sessionsFile, JSON.stringify(sessions));
  },

  getLibraryEntry: function getLibraryEntryFn(type, path) {
    var root = fspath.join(libDir, type);
    var rootPath = fspath.join(libDir, type, path);
    return promiseDir(root).then(function promiseDirFn() {
      return nodeFn.call(fs.lstat, rootPath).then(function nodeFn(stats) {
        if (stats.isFile()) {
          return getFileBody(root, path);
        }
        if (path.substr(-1) === '/') {
          path = path.substr(0, path.length - 1);
        }
        return nodeFn.call(fs.readdir, rootPath).then(function nodeFn(fns) {
          var dirs = [];
          var files = [];
          fns.sort().filter(function FunctionsSortFn(fn) {
            var fullPath = fspath.join(path, fn);
            var absoluteFullPath = fspath.join(root, fullPath);
            if (fn[0] !== '.') {
              var stats = fs.lstatSync(absoluteFullPath);
              if (stats.isDirectory()) {
                dirs.push(fn);
              } else {
                var meta = getFileMeta(root, fullPath);
                meta.fn = fn;
                files.push(meta);
              }
            }
          });
          return dirs.concat(files);
        });
      }).otherwise(function nodeFn(err) {
        if (type === 'flows' && !/\.json$/.test(path)) {
          // eslint-disable-next-line
          return localfilesystem.getLibraryEntry(type, path + '.json')
            .otherwise(function localfilesystemFn(e) {
              throw err;
            });
        }
        throw err;
      });
    });
  },

  saveLibraryEntry: function saveLibraryEntryFn(type, path, meta, body) {
    if (settings.readOnly) {
      return when.resolve();
    }
    var fn = fspath.join(libDir, type, path);
    var headers = '';
    for (var i in meta) {
      if (meta.hasOwnProperty(i)) {
        headers += '// ' + i + ': ' + meta[i] + '\n';
      }
    }
    return promiseDir(fspath.dirname(fn)).then(function promiseDirFn() {
      writeFile(fn, headers + body);
    });
  }
};

module.exports = dbstorageForNodeRed;
