module.exports = (function () {
  var serial = require('serialport')
    , child = require('child_process');

  return {
    'connect': function connectToArduino(callback) {
        // Seems to work on a mac and on a Raspberry Pi
        child.exec('ls /dev | grep -E "tty\.usb|ttyACM0"', function(err, stdout, stderr){
          var possible = stdout.slice(0, -1).split('\n'),
              found = false;
          for (var i in possible) {
            var tempSerial, err;
            try {
              tempSerial = new serial.SerialPort('/dev/' + possible[i], {
                baudrate: 9600,
                parser: serial.parsers.readline("\n")
              });
            } catch (e) {
              console.log(e);
              err = e;
            }
            if (!err) {
              found = tempSerial;
              console.log('found board at /dev/' + possible[i]);
              break;
            }
          }
          if (found) callback(null, tempSerial);
          else callback(new Error('Could not find Arduino'));
        });
      },
    'motionDetected': function(serialData) {
      return (/Motion Detected/.test(serialData));
    }
  }
})();