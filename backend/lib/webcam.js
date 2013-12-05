module.exports = (function() {
  var exec = require('child_process').exec;
  var _workingDir, _armed = false;

  return {
    'setWorkingFolder': function(folder) {
      return _workingDir = folder;
    },

    'takeSnapshot': function() {
      var cmd = "fswebcam -d /dev/video0 -r 960x720 " + _workingDir + "/" + new Date().getTime() + ".jpg";
      exec(cmd);
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