(function(root, exports) {


	var extend		= require('../dep/stratum/extend'),
		Bounds		= require('./spatial/bounds').Bounds,
		Bullet		= require('./models/bullet').Bullet,
		Player		= require('./models/player').Player,
		Enemy		= require('./models/enemy').Enemy,
		Powerup		= require('./models/powerup').Powerup,
		State		= require('./models/state').State,
		Effect		= require('./models/effect').Effect,
		Audio		= require('./angular/audio').Audio,
		FPS			= require('./fps').FPS,
		Client		= require('./network/client').Client,
		Sync		= require('./network/sync').Sync;



	function LengthSet(constructor) {

		constructor.prototype = {
			length:		0,
		};
		var proto = constructor.prototype;

		proto.clear = function() {
			for(var key in this) {
				if (!this.hasOwnProperty(key)) continue;
				delete this[key];
			}
			proto.length = 0;
		};

		proto.add = function(element) {
			if (this[element.id] !== undefined) return;
			this[element.id] = element;
			proto.length++;
		};

		proto.remove = function(element) {
			if (this[element.id] === undefined) return;
			delete this[element.id];
			proto.length--;
		};

		return new constructor();
	};


	var Game = extend(
		function Game(input, viewport, scope, delay, width, height) {
			var game = this;

			this.construct(0, 0, width, height);

			// Set up general game state.
			this.scope			= scope;
			this.pipe			= [];
			this.ticks			= 0;
			this.delay			= delay || 20;
			this.start			= new Date().getTime();
			this.last			= new Date().getTime();
			this.input			= input;
			this.viewport		= viewport;
			this.delta			= 1;
			this.smoothedFps	= new FPS();

			this.audio = new Audio();
			this.audio.precache(this.SOUNDS);

			// Set up sets for display elements.
			this.mobiles = LengthSet(function MobileSet() {});
			this.players = LengthSet(function PlayerSet() {});
			this.enemies = LengthSet(function EnemySet() {});
			this.powerups = LengthSet(function PowerupSet() {});

			this.playerBullets = LengthSet(function PlayerBulletSet() {});
			this.enemyBullets = LengthSet(function EnemyBulletSet() {});

			this.effects = LengthSet(function EffectSet() {});

			// Use setTimeout rather then setInterval, to prevent stacking.
			setTimeout(function tick() {
				// Queue next tick immediately, to prevent tick processing time
				// from altering frame rate (well, as much as possible).
				setTimeout(tick, game.delay);
				// Execute a tick of the game engine.
				game.tick();
			}, game.delay);

			// Remap input interface to current state.
			input.bind(function(event, x, y) {
				game.state.event(game, event, x, y);
			});

			this.change(State.ObtainName);

			this.add(this.createPlayer());
		},

		Bounds,

		{

			tick: function(last) {
				var ticks	= this.ticks++,
					last	= this.last,
					current	= this.last = new Date().getTime(),
					delta	= (current - last) * 0.001,
					game	= this;

				this.smoothedFps.add(delta);

				this.scope.$apply(function() {

					game.input.tick(game, delta);
					game.state.tick(game, ticks, delta);

					// Perform all mobile updates.
					angular.forEach(game.mobiles, function(mobile) {
						mobile.tick(game, delta);
					});

					// Perform all pipelined tick actions.
					var pipe = game.pipe, len = pipe.length;
					for(var index = 0; index < len; index++) {
						pipe[index](ticks, last, current);
					}

				});
			},

			time: function(now) {
				if (this.gameStart === undefined) return 0;
				return (now ? now : new Date().getTime()) - this.gameStart;
			},

			pipeline: function(callback) {
				this.pipe.push(callback);
			},

			entity: function(entity) {
				if (entity instanceof Player) return this.players;
				else if (entity instanceof Enemy) return this.enemies;
				else if (entity instanceof Effect) return this.effects;
				else if (entity instanceof Powerup) return this.powerups;
				else if (entity instanceof Bullet.PlayerBullet) {
					return this.playerBullets;
				}else if (entity instanceof Bullet.EnemyBullet) {
					return this.enemyBullets;
				}else{
					throw new Error('Unknown entity: ' + entity.toString());
				}
			},

			add: function(mobile) {
				var game = this;
				if (mobile instanceof Array) {
					angular.forEach(mobile, function(mobile) {
						game.mobiles.add(mobile);
						var target = game.entity(mobile);
						target.add(mobile);
						if (mobile.nid && game.client) {
							game.client.lookup[mobile.nid] = mobile;
						}
					});
				}else{
					game.mobiles.add(mobile);
					var target = game.entity(mobile);
					target.add(mobile);
					if (mobile.nid && game.client) {
						game.client.lookup[mobile.nid] = mobile;
					}
				}
			},

			destroy: function(mobile, origin) {
				this.mobiles.remove(mobile);
				var target = this.entity(mobile);
				target.remove(mobile);
				if (mobile.destroyed) {
					mobile.destroyed(this, origin);
				}
				if (mobile.nid && game.client) {
					delete game.client.lookup[mobile.nid];
				}
			},

			change: function(state) {
				this.state = state;
				state.init(this);
			},

			createPlayer: function(name) {
				var players	= this.players;
					player	= Player.create(this),
					cx		= this.width * 0.5 - player.width * 0.5,
					cy		= this.height - player.height * 1.5,
					index	= players.length;

				var lookup = {};
				for(var id in players) {
					if (!players.hasOwnProperty(id)) continue;
					lookup['s' + players[id].initial.x] = true;
				}

				var offset = 0;
				for(var index = 0; index < 9; index++) {
					offset = index * 100;
					if (!lookup['s' + (cx + offset)]) {
						cx += offset;
						break;
					}else if (!lookup['s' + (cx - offset)]) {
						cx -= offset;
						break;
					}
				}

				player.initial.x = cx;
				player.initial.y = cy;

				if (!this.local) {
					this.local = this.viewing = player;
					player.local = true;
				}else{
					player.local = false;
				}
				player.name = name || '';

				return player;
			},

			fpsAvg: function() {
				return 1000 / ((this.last - this.start) / this.ticks);
			},

			fps: function() {
				return this.smoothedFps.fps();
			},

			viewLeft: function() {
				var viewport = this.viewport;
				return Math.max(0, Math.min(this.width - viewport.width,
						this.viewing.x - viewport.width / 2));
			},

			viewTop: function() {
				var viewport = this.viewport;
				return Math.max(0, Math.min(this.height - viewport.height,
						this.viewing.y - viewport.height * 0.75));
			},

			connect: function() {
				this.sync = new Sync();
				Client.attach(this);
			},

			SOUNDS: {
				PLAYER_FIRE:	'sound/player_fire.wav',
				ENEMY_FIRE:		'sound/enemy_fire.wav',
				HIT:			'sound/hit.wav',
				EXPLOSION:		'sound/explosion.wav'
			}

		});


	Game.directive = function(scope, element, attrs, input, viewport) {
		scope.game = new Game(
				input,
				viewport,
				scope,
				Math.max(10, Math.floor(1000 / (attrs.fps || 50))),
				attrs.width || 1000,
				attrs.height || 1000);
	};


	exports.Game = Game;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.game = this.game || {}));
