module.exports = (function() {
  var http = require('http');
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
            fs.writeFile(_workingDir + '/' + imgName, imagedata, 'binary', function(err){
              if (err) throw err;
              _logger.info('[gopro] saved ' + imgName);
              return fn(null, imgName);
            });
          });
        }).end();
      });
    }
  }

})();

