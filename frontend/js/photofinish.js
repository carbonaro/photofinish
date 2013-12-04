angular.module('photofinish', ['ngResource', 'ngAnimate']).
factory('Photo', ['$resource', function($resource){
  return $resource('api/photos/:name', {name: '@name'});
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
controller('PhotofinishCtrl', ['$scope', 'socket', 'Photo', function($scope, socket, Photo) {
  $scope.photos = [];
  $scope.$watch('photos.length', function(newLength, oldLength) {
    //
  });

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

  socket.on('init', function(data) {
    $scope.photos = Photo.query();
  });

  socket.on('photo.added', function(newPhoto) {
    $scope.photos.unshift(new Photo({name: newPhoto.name}));
  });
}]);
