var restify = require('restify')
  , chokidar = require('chokidar')
  , socketio = require('socket.io')
  , path = require('path')
  , http = require('http');

var logger = require('./lib/logger');

// App constants
var API_PORT = 8000;
var SOCKETIO_PORT = 8001;
var WATCH_FOLDER = '../shared';

var Photo = require('./lib/photo');
Photo.setWorkingFolder(WATCH_FOLDER);

logger.info('Photofinish starting...');

// API Server
var apiServer = restify.createServer({
  name: 'PhotoFinish',
});

apiServer.get('/photos', function getPhotos(req, res, next) {
  Photo.all(function(error, results) {
    res.send(200, results);
    return next();
  });
});

logger.info('API Server listening on port', API_PORT);
apiServer.listen(API_PORT);

// Websocket Server
logger.info('Websocket Server listening on port', SOCKETIO_PORT);

var io = socketio.listen(SOCKETIO_PORT, {
  'log level': 1,
  'logger': logger
});

// Directory Watcher
var watcher = chokidar.watch(WATCH_FOLDER, {persistent: true});

watcher
  .on('add', function(filePath) {
    if (!Photo.isValid(filePath)) return; // not a valid file format? skip this one
    io.sockets.emit('call.added', {name: path.basename(filePath)});
  });
