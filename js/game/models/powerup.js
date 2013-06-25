(function(root, exports) {


	var extend		= require('../../dep/stratum/extend'),
		Reusable	= require('../reusable').Reusable,
		Mobile		= require('../spatial/mobile').Mobile,
		Sync		= require('../network/sync').Sync,
		Bullet		= require('./bullet').Bullet;


	var WIDTH = 32, HEIGHT = 32;


	/* --------------------------- ( Powerup ) ------------------------------ */

	var Powerup = extend(function Powerup() {}, Mobile, {

		construct: function(type, x, y) {
			Mobile.prototype.construct.call(this, x, y, WIDTH, HEIGHT);
			this.type = type;
			this.velocity(0, 300);
		},

		apply: function(game, collisions) {
			var powerup = this;
			angular.forEach(collisions, function(object) {
				powerup.affect(object);
			});
			game.destroy(this);
		},

		update: function(game, delta) {
			if (this.y > game.height) {
				game.destroy(this);
			}
		},

	});

	Reusable.apply(Powerup);

	Powerup.TYPES = [];

	Powerup.make = function(name, affect) {
		var index = Powerup.TYPES.length;
		var Type = {

			name:	name,
			index:	index,
		};

		Type.create = function(x, y) {
			var powerup = Powerup.create(Type, x, y);
			powerup.affect	= affect;
			return powerup;
		};

		Powerup.TYPES.push(Type);

		return Type;
	};


	/* ---------------------------- ( Types ) ------------------------------- */

	Powerup.ExtraLife = Powerup.make('extralife', function affect(player) {
		player.lives++;
	});

	Powerup.GunFast = Powerup.make('gunfast', function affect(player) {
		player.bullets = Bullet.FAST;
	});

	Powerup.GunDouble = Powerup.make('gundouble', function affect(player) {
		player.bullets = Bullet.DOUBLE;
	});

	Powerup.GunTriple = Powerup.make('guntriple', function affect(player) {
		player.bullets = Bullet.TRIPLE;
	});

	Powerup.GunMulti = Powerup.make('gunmulti', function affect(player) {
		player.bullets = Bullet.MULTI;
	});

	Powerup.Shield = Powerup.make('shield', function affect(player) {
		player.grace = 10;
	});


	Powerup.random = function(game, x, y) {
		var index = Math.round(Math.random() * (Powerup.TYPES.length - 1));
		var powerup = Powerup.TYPES[index].create(x, y);
		game.add(powerup);
		if (game.client) {
			powerup.nid = game.client.nid();
		}
		game.sync.add(SYNC.CREATE, powerup);
		return powerup;
	};

	/* -------------------- ( NETWORK SYNC METHODS ) ------------------------ */

	var SYNC = Powerup.SYNC = {
		CREATE:	'pu'
	};


	Sync.register(SYNC.CREATE,

		function encode(packet, powerup, args) {
			var sync = Mobile.SYNC.STATE_FUNCTIONS;
			sync.encode(packet, powerup, args);
			packet[sync.next + 1] = powerup.type.index;
			return packet;
		},

		function decode(packet, args) {
			var game = args[0],
				sync = Mobile.SYNC.STATE_FUNCTIONS,
				Type	= Powerup.TYPES[packet[sync.next + 1]],
				powerup = Type.create();

			powerup.nid = packet[sync.indices.nid];

			game.add(powerup);
			sync.decode(packet, args);
		});


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Powerup = Powerup;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.models = this.models || {}));
