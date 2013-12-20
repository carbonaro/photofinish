var restify = require('restify')
  , chokidar = require('chokidar')
  , socketio = require('socket.io')
  , path = require('path')
  , http = require('http');

var logger = require('./lib/logger');

// Run with -d switch for development mode
//
// in development mode, sockets are bound to apiServer (restify) so we can
// use http://localhost:API_PORT to run the tests (as of Dec 1st 2013, pow.cx does not handle ws)
// in development mode, we use node >= 0.8 with a high enough version of restify so as to
// support serveStatic
//
// this is not possible in production (e.g. on a Raspberry Pi) where the packaged node engine version
// is 0.6.19
//
// don't forget to link / copy package.json.dev
var development = (process.argv.indexOf("-d") == -1) ? false : true;

// App constants
var API_PORT = 8000;
var SOCKETIO_PORT = 8001;
var WATCH_FOLDER = '../shared';

var webcam = require('./lib/webcam');
webcam.setWorkingFolder(WATCH_FOLDER);
webcam.setLogger(logger);

var Photo = require('./lib/photo');
Photo.setWorkingFolder(WATCH_FOLDER);

if (!development) {
  var arduino = require('./lib/arduino');
  arduino.setLogger(logger);
}

logger.info('Photofinish starting...');

// API Server
var apiServer = restify.createServer({
  name: 'PhotoFinish',
});
apiServer.use(restify.queryParser());

apiServer.get('/api/photos', function getPhotos(req, res, next) {
  Photo.all(function(error, results) {
    if (error) return next(error);
    res.send(results);
    return next();
  });
});

apiServer.get('/api/photos/:name', function getPhoto(req, res, next) {
  Photo.info(req.params.name, function(error, result) {
    if (error) return next(error);
    res.send(result);
    return next();
  });
});

apiServer.del('/api/photos/:name', function deletePhoto(req, res, next) {
  if (Photo.destroy(req.params.name)) {
    res.send(204);
    return next();
  } else {
    return next(new Error("could not destroy file " + req.params.name));
  }
});

apiServer.get('/api/webcam', function getWebcamStatus(req, res, next) {
  var result = (req.params.get_info) ? {status: webcam.status()} : [];
  res.send(result);
  return next();
});

apiServer.post('/api/webcam', function getWebcamStatus(req, res, next) {
  if (req.params.arm) {
    webcam.arm();
  } else if (req.params.disarm) {
    webcam.disarm();
  }
  io.sockets.emit('webcam.status_change', {status: webcam.status()});
  res.send(200);
  return next();
});

// Used for development, needs node >= 0.8
if (development) {
  apiServer.get(/.*/, restify.serveStatic({
    directory: '../frontend',
    default: 'index.html'
  }));
}

logger.info('API Server listening on port', API_PORT);
apiServer.listen(API_PORT);

// Websocket Server
logger.info('Websocket Server listening on port', API_PORT);

var socketBind;
if (!development)
  socketBind = SOCKETIO_PORT;
else
  socketBind = apiServer;

var io = socketio.listen(socketBind, {
  'log level': 0,
  'log': false
});

io.sockets.on('connection', function (socket) {
  socket.emit('init', { hello: 'world' });
});

// Directory Watcher
var watcher = chokidar.watch(WATCH_FOLDER, {persistent: true, usePolling: true});

watcher
  .on('add', function(filePath) {
    if (!Photo.isValid(filePath)) return; // not a valid file format? skip this one
    io.sockets.emit('photo.added', {name: path.basename(filePath)});
  });

// Arduino plumbing
if (!development) {
  arduino.connect(function(err, serialPort) {
    if (err) {
      console.log(err);
    } else {
      serialPort.on('data', function(data) {
        if (arduino.motionDetected(data)) {
          logger.debug('[socket.io] sending motion.detected event');
          io.sockets.emit('motion.detected', {});
          if (webcam.isArmed()) {
            webcam.takeSnapshot();
            webcam.disarm();
            io.sockets.emit('webcam.status_change', {status: webcam.status()});
          }
        }
      });
    }
  });
}