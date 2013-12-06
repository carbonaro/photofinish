angular.module('photofinish', ['ngResource', 'ngAnimate']).
factory('Photo', ['$resource', function($resource){
  return $resource('api/photos/:name', {name: '@name'});
}]).
factory('Webcam', ['$resource', function($resource){
  return $resource('api/webcam', {},
    {info: {method: 'GET', isArray: false, params:{get_info: true}},
     arm: {method: 'POST', params: {arm: true}},
     disarm: {method: 'POST', params:{disarm: true}}}
  );
}]).
factory('socket', function ($rootScope) {
  var socket = io.connect();
  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      });
    }
  };
}).
controller('PhotofinishCtrl', ['$scope', '$timeout', 'socket', 'Photo', 'Webcam',
                              function($scope, $timeout, socket, Photo, Webcam) {
  $scope.photos = [];
  $scope.webcam = Webcam;
  $scope.motionDetected = false;

  $scope.askDelete = function(photo) {
    var message = "Etes-vous sûr(e) de vouloir supprimer la photo?";
    if (confirm(message)) $scope.delete(photo);
  }

  $scope.delete = function(photo) {
    photo.$delete(function() {
      var idx = $scope.photos.map(function(e) { return e.name;}).indexOf(photo.name);
      $scope.photos.splice(idx, 1);
    });
  };

  $scope.armWebcam = function() {
    Webcam.arm();
  }

  $scope.disarmWebcam = function() {
    Webcam.disarm();
  }

  socket.on('init', function(data) {
    $scope.photos = Photo.query();
    $scope.webcamInfo = Webcam.info();
  });

  socket.on('photo.added', function(newPhoto) {
    $timeout(function() {
      $scope.photos.unshift(new Photo({name: newPhoto.name}));
    }, 2000);
  });

  socket.on('webcam.status_change', function(info) {
    $scope.webcamInfo.status = info.status;
  });

  socket.on('motion.detected', function(data) {
    $scope.motionDetected = true;
    $timeout(function() {
      $scope.motionDetected = false;
    }, 3500);
  });
}]);
