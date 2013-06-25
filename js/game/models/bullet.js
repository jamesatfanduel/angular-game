(function(root, exports) {


	var extend		= require('../../dep/stratum/extend'),
		Mobile		= require('../spatial/mobile').Mobile,
		Sync		= require('../network/sync').Sync,
		Reusable	= require('../reusable').Reusable,
		Explosion	= require('./effect').Effect.Explosion;


	/* ---------------------------- ( Player ) ------------------------------ */

	var Bullet = extend(function Bullet() {}, Mobile, {

		construct: function(type, origin, x, y, width, height) {
			Mobile.prototype.construct.call(this, x, y, width || 2, height || 2);

			this.type	= type;
			this.origin	= origin;
		},

		hit: function(game, collisions) {
			game.add(Explosion.create(this.x, this.y));
			game.destroy(this);
		},

		hitPlayer: function(game, collisions) {
			var alive = false;
			angular.forEach(collisions, function(player) {
				if (player.alive) alive = true;
			});
			if (alive) this.hit(game, collisions);
		},

		update: function(game, delta) {
			if (!game.intersects(this)) {
				game.destroy(this);
			}
			var drag = this.type.drag;
			if (drag) {
				var vx = this.vx,
					vy = this.vy;

				if (drag.x && this.vx) {
					if (this.vx > 0) {
						this.velocity(Math.max(0, vx - drag.x * delta), vy);
					}else{
						this.velocity(Math.min(0, vx + drag.y * delta), vy);
					}
					
				}
				if (drag.y && this.vy) {
					if (this.vy > 0) {
						this.velocity(vx, Math.max(0, vy - drag.y * delta));
					}else{
						this.velocity(vx, Math.min(0, vy + drag.y * delta));
					}
				}
			}
		}

	});


	Bullet.PlayerBullet = extend(function PlayerBullet() {}, Bullet, {player: true});
	Bullet.EnemyBullet = extend(function EnemyBullet() {}, Bullet, {player: false});

	Reusable.apply(Bullet.PlayerBullet);
	Reusable.apply(Bullet.EnemyBullet);


	/* ------------------------ ( Bullet types ) ---------------------------- */


	Bullet.type = function(base, properties) {
		if (!properties) {
			properties = base;
			base = Bullet.type.DEFAULT;
		}
		properties.index = Bullet.TYPES.length;
		var type = extend.augment({},
					base, properties);
		Bullet.TYPES.push(type);
		return type;
	};

	Bullet.TYPES = [{
		name:		'default',
		damage:		100,
		angle:		0,
		velocity:	500,
		x:			0,
		y:			-40,
		delay:		200,
		index:		0
	}];
	Bullet.type.DEFAULT = Bullet.TYPES[0];


	/* ----------------------- ( Player Bullets ) --------------------------- */

	Bullet.DEFAULT = [
		Bullet.type.DEFAULT
	];

	Bullet.FAST = [
	    Bullet.type({delay: 75})
	];

	Bullet.DOUBLE = [
		Bullet.type({x: -15, y: -20}),
		Bullet.type({x: 15, y: -20})
	];

	Bullet.TRIPLE = [
		Bullet.type({angle: -10, x: -5}),
		Bullet.type.DEFAULT,
		Bullet.type({angle: 10, x: 5})
	];

	Bullet.MULTI = [
		Bullet.type({angle: -90, x: -40, y: 0}),
		Bullet.type({x: -15, y: -35}),
		Bullet.type.DEFAULT,
		Bullet.type({x: 15, y: -35}),
		Bullet.type({angle: 90, x: 40, y: 0})
	];


	/* ------------------------ ( Enemy Bullets ) --------------------------- */

	Bullet.DROP = [
		Bullet.type({fixed: 180, velocity: 200, drag: {x: 100}})
	];


	/* -------------------- ( NETWORK SYNC METHODS ) ------------------------ */

	var SYNC = Bullet.SYNC = {
		FIRE:	'bf'
	};

	Sync.register(SYNC.FIRE,

		function encode(packet, bullet, args) {
			var sync = Mobile.SYNC.STATE_FUNCTIONS;
			sync.encode(packet, bullet, args);
			packet[sync.next + 1] = bullet.player ? 1 : 0;
			packet[sync.next + 2] = bullet.type.index;
			if (bullet.origin) {
				packet[sync.next + 3] = bullet.origin.nid;
			}
			return packet;
		},

		function decode(packet, args) {
			var sync = Mobile.SYNC.STATE_FUNCTIONS,
				game = args[0],
				Type	= packet[sync.next + 1]
						? Bullet.PlayerBullet : Bullet.EnemyBullet;
				bullet = Type.create();

			bullet.nid		= packet[sync.indices.nid];
			bullet.type		= Bullet.TYPES[packet[sync.next + 2]];
			if (packet[sync.next + 3] !== undefined) {
				bullet.origin = game.client.lookup[packet[sync.next + 3]];
			}
			game.add(bullet);
			if (bullet.origin && bullet.origin.playSound) {
				bullet.origin.playSound(game);
			}

			sync.decode(packet, args);
			
		});


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Bullet = Bullet;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.models = this.models || {}));
