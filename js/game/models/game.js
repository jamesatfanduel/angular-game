(function(root, exports) {


	var extend	= require('../../dep/stratum/extend'),
		Bounds	= require('../spatial/bounds').Bounds,
		Bullet	= require('./bullet').Bullet,
		Player	= require('./player').Player,
		Enemy	= require('./enemy').Enemy,
		State	= require('./state').State;



	function LengthSet(constructor) {
		constructor.prototype = {
			length:		0,
		};
		constructor.prototype.setPrototype = constructor.prototype;
		return new constructor();
	};


	var Game = extend(
		function Game(controller, scope, delay, width, height) {
			var game = this;

			this.construct(0, 0, width, height);

			// Set up general game state.
			this.scope		= scope;
			this.pipe		= [];
			this.ticks		= 0;
			this.delay		= delay || 20;
			this.last		= new Date().getTime();
			this.controller	= controller;

			// Set up sets for display elements.
			this.mobiles = LengthSet(function MobileSet() {});
			this.bullets = LengthSet(function BulletSet() {});
			this.players = LengthSet(function PlayerSet() {});
			this.enemies = LengthSet(function EnemySet() {});

			// Use setTimeout rather then setInterval, to prevent stacking.
			setTimeout(function tick() {
				// Queue next tick immediately, to prevent tick processing time
				// from altering frame rate (well, as much as possible).
				setTimeout(tick, game.delay);
				// Execute a tick of the game engine.
				game.tick();
			}, game.delay);

			// Remap controller interface to current state.
			controller.bind(function(event, x, y) {
				game.state.event(game, event, x, y);
			});

			this.change(State.Title);

			this.createPlayer();

			// TODO: DEBUG STUFF, REMOVE!
//			setTimeout(function() {
//				var enemies = [];
//				for(var index = 0; index < 500; index++) {
//					enemies.push(Enemy.create(game, (index % 25) * 70, (Math.floor(index / 25) * 70), 'spaceinvader1'));
//				}
//				game.add(enemies);
//			}, 5);
		},

		Bounds,

		{

			tick: function(last) {
				var ticks	= this.ticks++,
					last	= this.last,
					current	= this.last = new Date().getTime(),
					delta	= (current - last) * 0.001,
					game	= this;

				this.scope.$apply(function() {

					game.controller.tick(game, delta);
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

			pipeline: function(callback) {
				this.pipe.push(callback);
			},

			entity: function(entity) {
				if (entity instanceof Player) return this.players;
				else if (entity instanceof Enemy) return this.enemies;
				else if (entity instanceof Bullet) return this.bullets;
				else{
					throw new Error('Unknown entity: ' + entity.toString());
				}
			},

			add: function(mobile) {
				var game = this;
				if (mobile instanceof Array) {
					angular.forEach(mobile, function(mobile) {
						game.mobiles[mobile.id] = mobile;
						var target = game.entity(mobile);
						if (target[mobile.id] === undefined) {
							target.setPrototype.length++;
							target[mobile.id] = mobile;
						}
					});
				}else{
					game.mobiles[mobile.id] = mobile;
					var target = game.entity(mobile);
					if (target[mobile.id] === undefined) {
						target.setPrototype.length++;
						target[mobile.id] = mobile;
					}
				}
			},

			destroy: function(mobile, origin) {
				delete this.mobiles[mobile.id];

				var target = this.entity(mobile);

				if (target[mobile.id] !== undefined) {
					target.setPrototype.length--;
					delete target[mobile.id];
					if (mobile.destroyed) mobile.destroyed(origin);
				}
			},

			change: function(state) {
				this.state = state;
				state.init(this);
			},

			createPlayer: function() {
				var player = Player.create();
				player.x = this.width / 2 - player.width / 2;
				player.y = this.height - player.height * 1.5;
				if (!this.local) this.local = player;
				this.add(player);
				return player;
			},

			viewLeft: function() {
				return Math.max(0, 0);
			},

			viewTop: function() {
				return Math.max(0, 0);
			}

		});



	Game.directive = function(controller, scope, element, attrs) {
		scope.game = new Game(
				controller,
				scope,
				Math.max(10, Math.floor(1000 / (attrs.fps || 50))),
				attrs.width || 1000,
				attrs.height || 1000);
	};


	exports.Game = Game;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.models = this.models || {}));
