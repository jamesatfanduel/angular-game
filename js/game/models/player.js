(function(root, exports) {


	var extend		= require('../../dep/stratum/extend'),
		Inertial	= require('../spatial/inertial').Inertial,
		Mobile		= require('../spatial/mobile').Mobile,
		Reusable	= require('../reusable').Reusable,
		Shooter		= require('./shooter').Shooter,
		Bullet		= require('./bullet').Bullet,
		Explosion	= require('./effect').Effect.Explosion,
		Sync		= require('../network/sync').Sync;


	var WIDTH = 64, HEIGHT = 64;


	/* ---------------------------- ( Player ) ------------------------------ */

	var Player = extend(function Player() {}, Shooter, {

		construct: function(game, x, y) {
			this.bulletType = Bullet.PlayerBullet;
			Shooter.prototype.construct.call(this,
					x || 0, y || 0, WIDTH, HEIGHT, Bullet.DEFAULT);

			this.initial			= {x: this.x, y: this.y};
			this.score				= 0;
			this.alive				= true;
			this.lives				= 3;
			this.livesArray			= [];
			this.friction			= 150;
			this.angularFriction	= 40;
			this.shootSound			= game.SOUNDS.PLAYER_FIRE;
		},

		readyClass: function() {
			return this.ready ? 'ready' : 'not';
		},

		engineScale: function() {
			return Math.min(1, Math.max(0.33, this.vy / -200));
		},

		shielded: function() {
			return this.grace > 0;
		},

		getLivesArray: function() {
			this.livesArray.length = Math.max(0, this.lives);
			return this.livesArray;
		},

		hit: function(game, collisions) {
			if (!this.alive || this.grace) return;
			if (game.server === false) return;

			this.die(game);

			if (game.server === true) {
				game.sync.add(SYNC.DIED, this);
			}
		},

		die: function(game) {
			this.explosions = 20;
			this.alive = false;
			this.lives--;
			game.audio.play(game.SOUNDS.EXPLOSION);
			if (this.lives >= 0) {
				this.aliveIn = 4;
			}
		},

		hitPlayer: function(game, collisions) {
			if (!this.alive) return;

			var player = this,
				m = Math.max(player.width, player.height) * 1.1,
				m2 = m * m;

			if (game.server !== true) return;
			angular.forEach(collisions, function(other) {
				if (!other.alive) return;

				var dx = player.x - other.x,
					dy = player.y - other.y,
					d2 = dx * dx + dy * dy;

				if (d2 >= m2) return;

				var d = (Math.sqrt(d2) || 1),
					f = ((m - d) + 2) / d,
					pvx = player.vx,
					pvy = player.vy,
					ovx = other.vx,
					ovy = other.vy;

				player.move(dx * f, dy * f);
				other.move(-dx * f, -dy * f);

				player.velocity(ovx * 0.6 + pvx * 0.2, ovy * 0.6 + pvy * 0.2);
				other.velocity(pvx * 0.6 + ovx * 0.2, pvy * 0.6 + ovy * 0.2);

				game.sync.add(Mobile.SYNC.STATE, player);
				game.sync.add(Mobile.SYNC.STATE, other);

			});
		},

		update: function(game, delta) {

			if (this.grace) {
				this.grace -= delta;
				if (this.grace < 0) {
					delete this.grace;
				}
			}

			var x = this.x, y = this.y;
			if (x < 0) {
				this.moveTo(0, this.y);
				this.velocity(Math.max(this.vx, -this.vx), this.vy);
			}

			if (x > game.width - this.width) {
				this.moveTo(game.width - this.width, this.y);
				this.velocity(Math.min(this.vx, -this.vx), this.vy);
			}

			if (y < 0) {
				this.moveTo(this.x, 0);
				this.velocity(this.vx, Math.max(this.vy, -this.vy));
			}

			if (y > game.height - this.height) {
				this.moveTo(this.x, game.height - this.height);
				this.velocity(this.vx, Math.min(this.vy, -this.vy));
			}

			if (this.explosions) {
				this.explosions--;
				var x = this.x + (Math.random() * 50),
					y = this.y + (Math.random() * 50);
				game.add(Explosion.create(x, y));
			}

			if (!this.alive && this.lives >= 0) {
				this.aliveIn -= delta;
				if (this.aliveIn <= 0) {
					this.moveTo(this.initial.x, this.initial.y);
					this.bullets = Bullet.DEFAULT;
					this.alive = true;
					this.grace = 4;
				}
			}
		}

	});

	Reusable.apply(Player);
	Inertial.apply(Player);


	/* -------------------- ( NETWORK SYNC METHODS ) ------------------------ */

	var SYNC = Player.SYNC = {
		READY:	'pr',
		DIED:	'pd'
	};


	Sync.register(SYNC.READY,

		function encode(packet, player, args) {
			packet[1] = player.nid;
			packet[2] = player.ready ? 1 : 0;
			return packet;
		},

		function decode(packet, args) {
			var game = args[0],
				player = game.client.lookup[packet[1]];
			player.ready = packet[2] ? true : false;
		});


	Sync.register(SYNC.DIED,

		function encode(packet, player, args) {
			packet[1] = player.nid;
			return packet;
		},

		function decode(packet, args) {
			var game = args[0],
				player = game.client.lookup[packet[1]];
			player.die(game);
		});


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Player = Player;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.models = this.models || {}));
