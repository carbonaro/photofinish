var restify = require('restify')
  , chokidar = require('chokidar')
  , socketio = require('socket.io')
  , path = require('path')
  , http = require('http');

// App constants
var API_PORT = 8000;
var SOCKETIO_PORT = 8001;
var WATCH_FOLDER = './data';

// API Server
var apiServer = restify.createServer({
  name: 'PhotoFinish',
});

apiServer.get('/photos', function getPhotos(req, res, next) {
  res.send(201, Math.random().toString(36).substr(3, 8));
  return next();
});

console.log('Photofinish starting...');
console.log('API Server listening on port', API_PORT);
apiServer.listen(API_PORT);

// Websocket Server
console.log('Websocket Server listening on port', SOCKETIO_PORT);
var io = socketio.listen(SOCKETIO_PORT);

// Directory Watcher
var watcher = chokidar.watch(WATCH_FOLDER, {persistent: true});

watcher
  .on('add', function(filePath) {
    var testRe = /.*(jpeg|jpg|png)$/;
    if (!testRe.test(filePath)) return; // not a valid file format? skip this one
    io.sockets.emit('call.added', {name: path.basename(filePath)});
  });
