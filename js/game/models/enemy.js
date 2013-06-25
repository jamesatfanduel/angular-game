(function(root, exports) {


	var extend		= require('../../dep/stratum/extend'),
		Mobile		= require('../spatial/mobile').Mobile,
		Sync		= require('../network/sync').Sync,
		Reusable	= require('../reusable').Reusable,
		Shooter		= require('./shooter').Shooter,
		Bullet		= require('./bullet').Bullet,
		Powerup		= require('./powerup').Powerup;


	/* ---------------------------- ( Enemy ) ------------------------------- */

	var Enemy = extend(

		function Enemy() {}, Shooter, {

		getClass: function() {
			return this.colliding == 2 ? 'red' : (this.colliding ? 'blue': 'green');
		},

		construct: function(game, x, y, type, options) {
			this.bulletType = Bullet.EnemyBullet;
			this.type = type;
			this.ai = Enemy.AI.TYPES[type || 'default'];
			this.options = options || {};
			Shooter.prototype.construct.call(this, x, y,
					options.width || 64, options.height || 64, []);
			this.ai.init(game, this);
		},

		hit: function(game, collisions) {
			this.ai.hit(game, this, collisions);
		},

		update: function(game, delta) {
			this.colliding = false;
			if (this.y >= game.height) {
				game.destroy(this);
			}else{
				this.ai.tick(game, this, delta);
			}
			if (game.server !== false) {
				if (this.shootTime > 0) {
					this.shootTime -= delta;
					if (this.shootTime <= 0) {
						this.fire(game);
						this.ai.nextShot(this);
					}
				}
			}
		},

		destroyed: function(game, origin) {
			if (game.server !== false) {
				this.destroyedBy = origin;
				game.sync.add(SYNC.DESTROYED, this);
				this.kill(game, origin);
			}else{
				return;
			}
		},

		kill: function(game, origin) {
			if (origin) {
				game.audio.play(game.SOUNDS.EXPLOSION, 0.5);
				if (game.server !== false && Math.random() < this.ai.powerup) {
					Powerup.random(game, this.x, this.y);
				}
			}
			this.ai.destroyed(this, origin);
		}
	
	});

	Reusable.apply(Enemy);


	/* --------------------------- ( Enemy.AI ) ----------------------------- */

	Enemy.AI = function AI() {};

	Enemy.AI.prototype = {

		init: function(game, enemy) {},

		tick: function(game, enemy, millis) {},

		hit: function(game, enemy, bullet) {},

		powerup:	0.05
	};

	Enemy.AI.create = function(name, constructor, base, properties) {
		if (!properties) {
			properties = base;
			base = Enemy.AI;
		}
		var instance = new (extend(constructor, base, properties, {name: name}))();
		Enemy.AI.TYPES[name] = instance;
	};


	/* ------------------------- ( Enemy.AI.TYPES ) ------------------------- */

	Enemy.AI.TYPES = {

		'default':			new Enemy.AI(),

	};

	// **************************
	// *** SPACE INVADER AI 1 ***
	// **************************

	Enemy.AI.create('spaceinvader1', function SpaceInvader() {}, {

		SPEED:	200,

		init: function(game, enemy) {
			var increment	= this.difficulty(enemy),
				speed		= this.SPEED * increment;
			enemy.health = 150 * increment;
			enemy.velocity(speed, 0);
			enemy.angle = 90;
			enemy.bullets = Bullet.DROP;
			this.nextShot(enemy);
			enemy.shootTime -= 30 / increment;
			enemy.shootSound = game.SOUNDS.ENEMY_FIRE;
		},

		nextShot: function(enemy) {
			var increment	= this.difficulty(enemy),
				delay		= 30 / increment;

			enemy.shootTime = Math.random() * delay + delay;
		},

		difficulty: function(enemy) {
			var difficulty = enemy.options.difficulty || 1;
			return 0.1 * difficulty + 1;
		},

		tick: function(game, enemy, millis) {
			if (enemy.vx > 0) {
				if (enemy.x + enemy.width >= game.width) {
					var increment	= this.difficulty(enemy),
						speed		= this.SPEED * increment;
					enemy.moveTo(game.width - enemy.width, enemy.y);
					enemy.next = enemy.y + speed / 2;
					enemy.nextDir = -speed;
					enemy.velocity(0, speed);
					enemy.rotateTo(180);
				}
			}else if (enemy.vx < 0) {
				if (enemy.x <= 0) {
					var increment	= this.difficulty(enemy),
						speed		= this.SPEED * increment;
					enemy.moveTo(0, enemy.y);
					enemy.next = enemy.y + speed / 2;
					enemy.nextDir = speed;
					enemy.velocity(0, speed);
					enemy.rotateTo(180);
				}
			}else{
				if (enemy.y >= enemy.next) {
					enemy.y = enemy.next;
					enemy.velocity(enemy.nextDir, 0);
					if (enemy.nextDir < 0) {
						enemy.rotateTo(-90);
					}else{
						enemy.rotateTo(90);
					}
				}
			}
		},

		hit: function(game, enemy, collisions) {
			if (this.health <= 0) return;
			angular.forEach(collisions, function(mobile) {
				if (enemy.health <= 0) return;
				enemy.health -= mobile.type.damage;
				if (enemy.health <= 0) {
					game.destroy(enemy, mobile.origin);
				}
			});
			game.audio.play(game.SOUNDS.HIT, 0.2);
		},

		destroyed: function(enemy, origin) {
			if (origin) {
				origin.score += 50;
			}
		}

	});


	// **************************
	// ***   ASTEROID AI 1    ***
	// **************************

	Enemy.AI.create('asteroid1', function Asteroid1() {}, {

		powerup:	0.3,

		hit: function(game, enemy, collisions) {
			if (enemy.health <= 0) return;
			angular.forEach(collisions, function(mobile) {
				if (enemy.health <= 0) return;
				enemy.health -= mobile.type.damage;
				if (enemy.health <= 0) {
					enemy.ai.split(game, enemy);
					game.destroy(enemy, mobile.origin);
				}
			});
			game.audio.play(game.SOUNDS.HIT, 0.2);
		},

		split: function(game, enemy) {
			var count = Math.round(Math.random() * 2);
			while(count-- >= 0) {
				var sub = Enemy.create(game,
						enemy.cx + ((Math.random() * 50) - 25),
						enemy.cy + ((Math.random() * 50) - 25),
						(Math.random() >= 0.5 ? 'asteroid3' : 'asteroid4'),
						{width: 40, height: 40});

				sub.health = 100;
				sub.vy = enemy.vy;
				sub.vx = Math.random() * 300 - 150;
				game.add(sub);
				game.sync.add(SYNC.CREATE, sub);
			}
		},

		destroyed: function(enemy, origin) {
			if (origin) {
				origin.score += 200;
			}
		},


	});


	// **************************
	// ***    ASTEROID AI 2   ***
	// **************************

	Enemy.AI.create('asteroid2', function Asteroid2() {}, Enemy.AI.TYPES.asteroid1);


	// **************************
	// ***    ASTEROID AI 3   ***
	// **************************

	Enemy.AI.create('asteroid3', function Asteroid2() {}, Enemy.AI.TYPES.asteroid1, {

		powerup: 0.1,

		split: function() {},

		destroyed: function(enemy, origin) {
			if (origin) {
				origin.score += 100;
			}
		}

	});


	// **************************
	// ***    ASTEROID AI 4   ***
	// **************************

	Enemy.AI.create('asteroid4', function Asteroid2() {}, Enemy.AI.TYPES.asteroid3);


	/* -------------------- ( NETWORK SYNC METHODS ) ------------------------ */

	var SYNC = Enemy.SYNC = {
		DESTROYED:	'ed',
		CREATE:		'ec'
	};

	Sync.register(SYNC.DESTROYED,

		function encode(packet, enemy, args) {
			packet[1] = enemy.nid;
			packet[2] = enemy.destroyedBy ? enemy.destroyedBy.nid : undefined;
			return packet;
		},

		function decode(packet, args) {
			var game = args[0],
				enemy = game.client.lookup[packet[1]],
				origin = game.client.lookup[packet[2]];

			enemy.kill(game, origin);
		});


	Sync.register(SYNC.CREATE,

		function encode(packet, enemy, args) {
			var sync = Mobile.SYNC.STATE_FUNCTIONS;
			sync.encode(packet, enemy, args);
			packet[sync.next + 1] = enemy.type;
			console.log("Enemy", enemy, "packet", packet);
			return packet;
		},

		function decode(packet, args) {
			var sync = Mobile.SYNC.STATE_FUNCTIONS,
				game = args[0],
				type = packet[sync.next + 1],
				enemy = Enemy.create(game, 0, 0, type, {});

			enemy.nid = packet[sync.indices.nid];
			game.add(enemy);
			sync.decode(packet, args);
		});


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Enemy = Enemy;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.models = this.models || {}));
