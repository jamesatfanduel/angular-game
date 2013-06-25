(function(root, exports) {


	var Enemy		= require('./enemy').Enemy,
		Sync		= require('../network/sync').Sync,
		Rnd			= require('../rnd').Rnd;

	function Wave(name, type, options) {
		this.name		= name;
		this.type		= type;
		this.options	= options;
	}

	Wave.prototype = {

		generate: function(game) {
			return this.type(game, this.options);
		}

	};


	Wave.TYPES = [];

	Wave.register = function(name, callback) {
		Wave.TYPES[name] = callback;
	};

	Wave.generate = function(game, name, options) {
		if (game.server === false) {
			return;
		}
		var type = Wave.TYPES[name];
		if (!type) {
			throw new Error("Unknown wave type: " + name);
		}

		var wave = new Wave(name, type, options || {});
		var enemies = wave.generate(game);

		if (game.client) {
			var nids = game.client.nidRange(enemies.length);
			wave.nidBase = nids.base;
			wave.nidFirst = nids.first;
			nids.apply(enemies);
		}

		game.add(enemies);

		if (game.server === true) {
			game.sync.add(SYNC.GENERATE, wave);
		}
	};


	/* ----------------------- ( WAVE DEFINITIONS ) ------------------------- */

	Wave.register('spaceinvaders1', function SpaceInvaders1(game, options) {
		var enemies	= [],

			width	= options.width		|| 5,
			height	= options.height	|| 5,
			x		= options.x			|| 0,
			y		= options.y			|| 0;

		for(var h = 0; h < height; h++) {
			var yp = y + h * 70;
			for(var w = 0; w < width; w++) {
				enemies.push(Enemy.create(game, x + w * 70, yp,
						'spaceinvader1', options.enemy));
			}
		}
		return enemies;
	});

	
	Wave.register('asteroids', function Asteroids(game, options) {
		var enemies	= [],

			difficulty	= options.enemy.difficulty || 0,
			count		= options.count || 20,
			mod			= 0.1 * difficulty + 1;

		options.seed	= options.seed || new Date().getTime();
		options.width	= 60;
		options.height	= 60;

		var rnd = new Rnd(options.seed);

		while(count-- >= 0) {
			var enemy = Enemy.create(game, game.width * rnd.value(), rnd.value() * -500,
					rnd.value() > 0.5 ? 'asteroid1' : 'asteroid2', options.enemy);

			enemy.health = mod * 500;
			enemy.vx = (rnd.value() - 0.5) * 300 * mod;
			enemy.vy = rnd.value() * 200 * mod + 100;
			enemy.spin = rnd.value() * 25;

			enemies.push(enemy);
		}
		return enemies;
	});


	/* -------------------- ( NETWORK SYNC METHODS ) ------------------------ */

	var SYNC = Wave.SYNC = {
		GENERATE:	'wg',
	};


	Sync.register(SYNC.GENERATE,

		function encode(packet, wave, args) {
			var now		= args[1];

			packet[1] = now;
			packet[2] = wave.name;
			packet[3] = wave.options || undefined;
			packet[4] = wave.nidBase;
			packet[5] = wave.nidFirst;
			return packet;
		},

		function decode(packet, args) {
			var game	= args[0],
				now		= args[1],

				name	= packet[2],
				options	= packet[3] || {},
				nidBase	= packet[4],
				nid		= packet[5],

				type	= Wave.TYPES[name];

				var wave = new Wave(name, type, options);
				var enemies = wave.generate(game);

				var delta = (now - packet[1]) * 0.001;

				var nids = game.client.nidRange(enemies.length, nidBase, nid);
				nids.apply(enemies);
				for(var index = 0, len = enemies.length; index < len; index++) {
					enemies[index].spinup(delta);
				}
				game.add(enemies);
		});


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Wave = Wave;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.models = this.models || {}));
