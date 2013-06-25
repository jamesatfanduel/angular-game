(function(root, exports) {


	var extend		= require('../../dep/stratum/extend'),
		Wave		= require('./wave').Wave;


	/* ---------------------------- ( Stage ) ------------------------------- */

	var Stage = extend(

	function Stage(name, index) {
		this.name		= name;
		this.batches	= [];
		this.index		= index;

	}, {

		init: function(game, options) {
			this.batch		= 0;
			this.options	= options;
		},

		batch: function() {
			var batch = [];
			for(var index = 0, len = arguments.length; index < len; index++) {
				batch.push(arguments[index]);
			}
			this.batches.push(batch);
			return this;
		},

		tick: function(game, last, current) {
			if (game.enemies.length === 0) {
				if (this.batch >= this.batches.length) {
					return false;
				}
				var batch = this.batches[this.batch++];
				for(var index = 0, len = batch.length; index < len; index++) {
					var wave = batch[index];
					Wave.generate(game, wave.name, extend.augment({},
							wave.options || {}, this.options || {}));
				}
			}
			return true;
		},

		next: function() {
			return STAGES[this.index + 1];
		}

	});

	var STAGES = Stage.STAGES = [];

	Stage.register = function(name) {
		var stage = new Stage(name);
		stage.index = STAGES.length;
		STAGES.push(stage);
		return stage;
	};

	Stage.first = function() {
		return STAGES[0];
	};


	/* ----------------------- ( STAGE DEFINITIONS ) ------------------------ */


	Stage.register('Level 1')

	.batch(
	{
		name: 		'spaceinvaders1',
		options:	{width: 5, height: 4, x: 0, y: 0}
	}, {
		name: 		'spaceinvaders1',
		options:	{width: 5, height: 4, x: 900, y: 0}
		
	});


	Stage.register('Level 2')

		.batch({
			name: 		'asteroids',
			options:	{width: 5, height: 4, x: 0, y: 0}
		});


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Stage = Stage;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.models = this.models || {}));
