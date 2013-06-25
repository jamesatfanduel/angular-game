(function(root, exports) {


	var extend		= require('../dep/stratum/extend');


	var RATE = 200;


	/* -------------------------- ( Controller ) ---------------------------- */

	function Controller($window, $document) {
		if (Controller.Keyboard && $window && $document) {
			this.keyboard		= new Controller.Keyboard($document, this);
			this.orientation	= new Controller.Orientation($window, this);
			this.mouse			= new Controller.Mouse($document, this);
			this.listeners		= [];
		}
	}

	Controller.prototype = {

		tick: function(game, delta) {
			this.keyboard.tick(delta);
			this.orientation.tick(delta);
		},

		bind: function(listener) {
			this.listeners.push(listener);
		},

		unbind: function(listener) {
			var index = this.listeners.indexOf(listener);
			if (index !== -1) {
				this.listeners.splice(index, 1);
				return true;
			}
			return false;
		},

		event: function(type, x, y) {
			angular.forEach(this.listeners, function(listener) {
				listener(type, x, y);
			});
		}

	};


	/* ---------------------------- ( EVENTS ) ------------------------------ */

	var VELOCITY	= Controller.VELOCITY	= 0,
		ACCELERATE	= Controller.ACCELERATE	= 1,
		FIRE		= Controller.FIRE		= 2,

		ANY			= Controller.ANY		= 3;

	Controller.EVENTS = ['VELOCITY', 'ACCELERATE', 'FIRE', 'ANY'];


	/* ---------------------- ( Controller.Keyboard ) ----------------------- */

	Controller.Keyboard = extend(
		function Keyboard($document, target) {
			var controller = this;
			this.target = target;
			this.x = this.y = 0;

			$document.bind('keydown', function(event) {
				switch(event.which) {
					case 32: target.event(FIRE, 1); break;
					case 37: controller.x = -RATE; break;
					case 38: controller.y = -RATE; break;
					case 39: controller.x = RATE; break;
					case 40: controller.y = RATE; break;
				}
				return target.event(ANY);
			});
			$document.bind('keyup', function(event) {
				switch(event.which) {
					case 37:
					case 39: 
						controller.x = 0;
						break;
					case 38:
					case 40:
						controller.y = 0;
						break;
				}
				return target.event(ANY);
			});
		},

		Controller,

		{

			tick: function(delta) {
				if (this.x !== 0 || this.y !== 0) {
					this.target.event(ACCELERATE, this.x * delta,
							this.y * delta);
				}
			}
		});


	/* --------------------- ( Controller.Orientation ) --------------------- */

	Controller.Orientation = extend(
		function Orientation($window, target) {
			this.beta		= 0;
			this.gamma		= 0;
			this.TOLERANCE	= 0.05;
			this.target		= target;

			var controller = this;
			angular.element($window).bind('deviceorientation', function(event) {
				controller.beta		= event.beta;
				controller.gamma	= event.gamma;
			});
		},

		Controller,

		{
			tick: function(delta) {
				var TOLERANCE	= this.TOLERANCE,
					beta		= this.beta,
					gamma		= this.gamma;

				if (Math.abs(beta) > TOLERANCE || Math.abs(gamma) > TOLERANCE) {
					this.target.event(VELOCITY, gamma * RATE * delta,
							(beta + 20) * RATE * delta);
				}
			}

		});


	/* --------------------- ( Controller.Mouse ) --------------------- */

	Controller.Mouse = extend(
		function Mouse($document, target) {

			$document.bind('click', function(event) {
				target.event(FIRE);
				target.event(ANY);
			});

			$document.bind('touchstart', function(event) {
				target.event(FIRE);
				target.event(ANY);
			});
		},

		Controller);


	/* --------------------------- ( PROVIDER ) ----------------------------- */

	var controller = null;

	Controller.provider = function($window, $document) {
		if (controller === null) {
			controller = new Controller($window, $document);
		}
		return controller;
	};


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Controller = Controller;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.models = this.models || {}));
