(function(root, exports) {


	var extend		= require('../../dep/stratum/extend'),
		Mobile		= require('../spatial/mobile').Mobile,
		Bullet		= require('./bullet').Bullet;


	var RATIO = Math.PI / 180;


	/* ---------------------------- ( Mobile ) ------------------------------ */

	var Shooter = extend( 

		function Shooter() {},

		Mobile,

		{

			bullets: [],

			construct: function(x, y, width, height, bullets) {
				Mobile.prototype.construct.call(this, x, y, width, height);
				this.bullets	= bullets || [];
				this.lastShot	= [];
			},

			fire: function(game) {
				var shooter = this,
					now		= new Date().getTime(),
					fired	= false;

				angular.forEach(this.bullets, function(type, index) {
					var delay 		= type.delay,
						last		= shooter.lastShot[index];

					if (last + delay > now) return;

					var angle		= shooter.angle,
						rad			= angle * RATIO,
						sn			= Math.sin(rad),
						cs			= Math.cos(rad),
						velocity	= type.velocity,
						ox			= type.x * cs - type.y * sn,
						oy			= type.x * sn + type.y * cs;

					var bullet = shooter.bulletType.create(type, shooter,
								shooter.cx + ox,
								shooter.cy + oy,
								type.width || 2, type.height || 2);

					bullet.angle = type.fixed !== undefined
							? type.fixed : type.angle + angle;
					bullet.vx = Math.sin(bullet.angle * RATIO)
							* velocity + shooter.vx;
					bullet.vy = -Math.cos(bullet.angle * RATIO)
							* velocity + shooter.vy;

					if (game.client) bullet.nid = game.client.nid();

					shooter.lastShot[index] = now;

					game.add(bullet);
					if (game.sync) {
						game.sync.add(Bullet.SYNC.FIRE, bullet);
					}
					fired = true;
				});
				if (this.bullets.length && fired) {
					shooter.playSound(game);
				}
			},

			playSound: function(game) {
				if (this.shootSound) {
					game.audio.play(this.shootSound, 0.2,
							Math.random() * 0.35 + 0.6);
				}
			}

		});


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Shooter = Shooter;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.spatial = this.spatial || {}));
