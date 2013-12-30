module.exports = (function() {
  var http = require('http');
  var exec = require('child_process').exec;
  var cheerio = require('cheerio');
  var fs = require('fs');

  var _workingDir = '.', _logger;

  var _startCaptureApiCall = {
    host: '10.5.5.9',
    path: '/camera/SH?t=Krempp2013&p=%01'
  };
  var _stopCaptureApiCall = {
    host: '10.5.5.9',
    path: '/camera/SH?t=Krempp2013&p=%00'
  };
  var _lsApiCall = {
    host: '10.5.5.9',
    port: 8080,
    path: '/videos/DCIM/100GOPRO/'
  }

  _getSnapshot = function(shutterSpeed, fn) {
    http.request(_startCaptureApiCall, function(response) {
      response.on('end', function() {
        _logger.info("[gopro] catpure started");
        setTimeout(function() {
          _endCapture(fn);
        }, shutterSpeed);
      });
    }).end();
  }

  _endCapture = function(fn) {
    http.request(_stopCaptureApiCall, function(res) {
      res.on('end', function () {
        _logger.info('[gopro] capture stopped');
        return fn(null);
      });
    }).end();
  }

  _listFiles = function(fn) {
    http.request(_lsApiCall, function(response) {
      var body = ''
      response.on('data', function (chunk) {
        body += chunk;
      });
      var files = [];
      response.on('end', function () {
        var $ = cheerio.load(body);
      	$('table tbody tr').each(function() {
    			var name = $(this).find('a.link').attr('href')
      		var date = $(this).find('span.date').text()
      		var size = $(this).find('span.size').text()
      	  files.push({
      			name: name,
      			isFolder: name[name.length-1] === '/',
      			time: new Date(date),
      			size: size !== '-' ? size : null
      		});
      	});
        return fn(null, files);
      });
    }).end();
  }

  _getLatestImage = function(fn) {
    _listFiles(function(err, files) {
      files.filter(function(e) { return /(JPG|jpg)/.test(e.name); });
      return fn(null, files[files.length -1]);
    });
  }

  return {
    'setLogger': function(l) {
      _logger = l;
    },

    'setWorkingFolder': function(folder) {
      return _workingDir = folder;
    },

    'getSnapshot': _getSnapshot,

    'listFiles': _listFiles,

    'getLatestImage': _getLatestImage,

    'downloadLatestImage': function(fn) {
      _getLatestImage(function(err, image) {
        var imageRemotePath = '/videos/DCIM/100GOPRO/' + image.name;
        var options = {
          host: '10.5.5.9',
          port: 8080,
          path: imageRemotePath
        };
        _logger.info("[gopro] downloading " + imageRemotePath);
        http.request(options, function(res){
          var imagedata = '';
          res.setEncoding('binary');

          res.on('data', function(chunk){
            imagedata += chunk;
          });

          res.on('end', function(){
            var imgName = image.name.toLowerCase();
            fs.writeFile(_workingDir + '/tmp/' + imgName, imagedata, 'binary', function(err){
              if (err) throw err;
              _logger.info('[gopro] saved ' + imgName);
              var cmd = "convert " + _workingDir + '/tmp/' + imgName;
              cmd += " -fill white -undercolor '#00000080' -pointsize 72 -gravity SouthEast -annotate +5+5 '";
              var now = new Date();
              var d = now.getDate();
              var m = now.getMonth();
              var months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
              var y = now.getFullYear();
              cmd += "le " + d + " " + months[m] + " " + y + " à " + now.getHours() + ':' + now.getMinutes();
              cmd += "' " + _workingDir + '/' + imgName;
              _logger.debug("[gopro] adding timestamp with cmd: " + cmd);
              exec(cmd, function (error, stdout, stderr) {
                 _logger.debug('gopro convert stdout: ' + stdout);
                 _logger.error('gopro convert stderr: ' + stderr);
                 if (error !== null) {
                   _logger.error('gopro convert exec error: ' + error);
                 }
                 _logger.debug("[gopro] deleting tmp image " + _workingDir + '/tmp/' + imgName);
                 fs.unlinkSync(_workingDir + '/tmp/' + imgName);
                 return fn(null, imgName);
              });
            });
          });
        }).end();
      });
    }
  }

})();

