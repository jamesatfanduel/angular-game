(function(root, exports) {


	var extend		= require('../../dep/stratum/extend');


	var MOVE_RATE = 200;


	/* -------------------------- ( Input ) ---------------------------- */

	function Input($window, $document) {
		if (Input.Keyboard && $window && $document) {
			this.keyboard		= new Input.Keyboard($document, this);
			this.orientation	= new Input.Orientation($window, this);
			this.mouse			= new Input.Mouse($document, this);
			this.listeners		= [];
		}
	}

	Input.prototype = {

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

	var VELOCITY	= Input.VELOCITY	= 0,
		ACCELERATE	= Input.ACCELERATE	= 1,
		FIRE		= Input.FIRE		= 2,

		ANY			= Input.ANY		= 3;

	Input.EVENTS = ['VELOCITY', 'ACCELERATE', 'FIRE', 'ANY'];


	/* ---------------------- ( Input.Keyboard ) ----------------------- */

	Input.Keyboard = extend(
		function Keyboard($document, target) {
			var input = this;

			this.target		= target;
			this.x			= this.y = 0;
			this.delay		= 0;

			$document.bind('keydown', function(event) {
				switch(event.which) {
					case 32: input.fire = true; break;
					case 37: input.x = -MOVE_RATE; break;
					case 38: input.y = -MOVE_RATE; break;
					case 39: input.x = MOVE_RATE; break;
					case 40: input.y = MOVE_RATE; break;
				}
			});

			$document.bind('keyup', function(event) {
				switch(event.which) {
					case 32:
						input.fire = false;
						input.delay = 0;
						break;
					case 37:
						if (input.x < 0) {
							input.x = 0;
						}
						break;
					case 39:
						if (input.x > 0) {
							input.x = 0;
						}
						break;
					case 38:
						if (input.y < 0) {
							input.y = 0;
						}
						break;
					case 40:
						if (input.y > 0) {
							input.y = 0;
						}
						break;
				}
				if (event.keyCode >= 32) {
					return target.event(ANY);
				}
			});
		},

		Input,

		{

			tick: function(delta) {
				if (this.x !== 0 || this.y !== 0) {
					this.target.event(ACCELERATE, this.x * delta,
							this.y * delta);
					this.target.event(ANY);
				}
				if (this.fire) {
					this.target.event(FIRE);
					this.target.event(ANY);
				}
			}

		});


	/* --------------------- ( Input.Orientation ) --------------------- */

	Input.Orientation = extend(
		function Orientation($window, target) {
			this.beta		= 0;
			this.gamma		= 0;
			this.TOLERANCE	= 0.05;
			this.target		= target;
			this.balance	= -40;

			var Input = this;
			angular.element($window).bind('deviceorientation', function(event) {
				Input.beta		= event.beta;
				Input.gamma		= event.gamma;
			});
		},

		Input,

		{

			rebalance: function() {
				this.balance = this.beta;
			},

			tick: function(delta) {
				var TOLERANCE	= this.TOLERANCE,
					beta		= this.beta,
					gamma		= this.gamma;

				if (Math.abs(beta) > TOLERANCE || Math.abs(gamma) > TOLERANCE) {
					this.target.event(VELOCITY, gamma * MOVE_RATE * delta * 0.04,
							(beta - this.balance) * MOVE_RATE * delta * 0.04);
				}
			}

		});


	/* --------------------- ( Input.Mouse ) --------------------- */

	Input.Mouse = extend(
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

		Input);


	/* --------------------------- ( PROVIDER ) ----------------------------- */

	var input = null;

	Input.provider = function($window, $document) {
		if (input === null) {
			input = new Input($window, $document);
		}
		return input;
	};


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Input = Input;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.models = this.models || {}));
