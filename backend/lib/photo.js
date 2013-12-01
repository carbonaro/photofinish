module.exports = (function() {
  var fs = require('fs');
  var path = require('path');
  var im = require('imagemagick');
  var Sync = require('sync');

  var _workingDir;

  _isValidFile = function(f) {
    var re = /.*(jpeg|jpg|png)$/;
    return re.test(path.basename(f));
  }

  _getStat = function(name, fn) {
    var filePath = name;
    if (path.basename(name) == name) filePath = _workingDir + '/' + name;
    return fs.statSync(filePath);
  }

  _listAll = function() {
    var files = fs.readdirSync(_workingDir);
    files = files.filter(function(f) { return _isValidFile(f); });
    files = files.map(function(f) { return {name: f,
                                            stat: fs.statSync(_workingDir + '/' + f)}; });
    files = files.sort(function(b, a) { return a.stat.ctime.getTime() - b.stat.ctime.getTime(); });
    return files;
  }

  return {
    'setWorkingFolder': function(folder) {
      return _workingDir = folder;
    },

    'getWorkingFolder': function() {
      return _workingDir;
    },

    'isValid': function(f) {
      return _isValidFile(f);
    },

    'info': function(name, fn) {
      var photo = {name: name, stat: _getStat(name)};
      return im.identify(['-format', '%wx%h', _workingDir + '/' + photo.name], function(err,format) {
        if (err) return fn(err);
        photo.format = format;
        return fn(null, photo);
      });
    },

    // Valid options {limit: 10}
    'all': function(options, fn) {
      if ('function' == typeof(options)) {
        fn = options;
        options = {limit: 10};
      }
      var photos = _listAll().splice(0,options.limit);
      var results = [];
      var format;
      Sync(function() {
        for (var i = 0 ; i < photos.length ; i++) {
          format = im.identify.sync(null, ['-format', '%wx%h', _workingDir + '/' + photos[i].name]);
          photos[i].format = format;
          results.push(photos[i]);
        }
        return results;
      }, fn);
      return results;
    },

    'destroy': function(name) {
      var filePath = name;
      if (path.basename(name) == name) filePath = _workingDir + '/' + name;
      try {
        fs.unlinkSync(filePath);
        return true;
      } catch (e) {
        return false;
      }
    }
  }
})();