(function(root) {


	var Game		= require('./game').Game,
		Collidable	= require('./angular/collidable').Collidable,
		Input		= require('./angular/input').Input,
		Audio		= require('./angular/audio').Audio;
		Viewport	= require('./angular/viewport').Viewport,
		Focus		= require('./angular/focus').Focus;


//	include('https://ajax.googleapis.com/ajax/libs/angularjs/1.0.7/angular.min.js');
	include('../dep/angular.js');

	angular.module('AngularGame', [])


	.factory('input', Input.provider)


	.factory('audio', Audio.provider)


	.factory('viewport', Viewport.provider)


	.directive('focus', function($document, $timeout) {
		return {
			restrict:	'A',

			link: function(scope, element, attrs) {
				Focus.directive(element, $timeout);
			}

		};
	})


	.directive('game', function($document, input, viewport) {

		return {
			restrict:	'A',

			link: function(scope, element, attrs) {
				Game.directive(scope, element, attrs, input, viewport);
			}

		};

	})


	.directive('collidable', function($document, $parse) {

		return {
			restrict:	'A',

			link: function(scope, element, attrs) {
				Collidable.directive(scope, element, attrs, $parse);
			}

		};

	});


})(this);