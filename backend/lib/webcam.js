module.exports = (function() {
  var exec = require('child_process').exec;
  var _workingDir, _armed = false, _logger;

  return {
    'setLogger': function(l) {
      _logger = l;
    },

    'setWorkingFolder': function(folder) {
      return _workingDir = folder;
    },

    'takeSnapshot': function() {
      var cmd = "fswebcam -d /dev/video0 -r 960x720 " + _workingDir + "/" + new Date().getTime() + ".jpg";
      exec(cmd, function (error, stdout, stderr) {
        _logger.debug('webcam stdout: ' + stdout);
        _logger.error('webcam stderr: ' + stderr);
        if (error !== null) {
          _logger.error('webcam exec error: ' + error);
        }
      });
    },

    'status': function() {
      return (_armed) ? "armed" : "disarmed";
    },

    'isArmed': function() {
      return _armed;
    },

    'arm': function() {
      _armed = true;
    },

    'disarm': function() {
      _armed = false;
    }
  }
})();