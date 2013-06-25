(function(root, exports) {


	var extend		= require('../../dep/stratum/extend'),
		Input		= require('../angular/input').Input,
		Mobile		= require('../spatial/mobile').Mobile,
		Bullet		= require('./bullet').Bullet,
		Enemy		= require('./enemy').Enemy,
		Player		= require('./player').Player,
		Stage		= require('./stage').Stage;

	Enemy;

	/* ---------------------------- ( State ) ------------------------------- */

	function State() {}

	State.prototype = {

		init: function(game) {},

		tick: function(game, tick, delta) {},

		event: function(type, value) {}

	};


	/* ----------------------- ( State.ObtainName ) ------------------------- */

	State.ObtainName = new (extend(function ObtainName() {}, State, {

		name: 'obtainname',

		next: function(game, name) {
			if (!name || name.length < 4) return false;

			game.connect();

			game.change(State.Title);
		}

	}))();


	/* ------------------------- ( State.Title ) ---------------------------- */

	State.Title = new (extend(function Title() {}, State, {

		name: 'title',

		init: function(game) {
			this.grace = 2;
		},

		tick: function(game, ticks, delta) {
			if (this.grace) {
				this.grace -= delta;
				if (this.grace < 0) {
					delete this.grace;
				}
			}

			var ready = true,
				players	= game.players;

			for(var id in players) {
				if (!players.hasOwnProperty(id)) continue;
				var player = players[id];
				if (!player.ready) {
					ready = false;
					break;
				}
			}

			if (ready) {
				game.change(State.Playing);
			}
		},

		event: function(game, type, x, y) {
			// Grace period, to prevent end of game, or name input from starting
			// the game immediately.
			if (this.grace) return;

			if (type === Input.ANY) {
				game.local.ready = !game.local.ready;
				if (game.client) {
					game.sync.add(Player.SYNC.READY, game.local);
				}
				this.grace = 0.5;
			}
		}

	}))();


	/* ------------------------ ( State.Playing ) --------------------------- */

	State.Playing = new (extend(function Playing() {}, State, {

		name: 'playing',

		init: function(game) {

			game.startTime = new Date().getTime();

			game.input.orientation.rebalance();

			angular.forEach(game.players, function(player) {
				player.score	= 0;
				player.lives	= 3;
				player.bullet	= Bullet.DEFAULT_PLAYER;
				player.moveTo(player.initial.x, player.initial.y);
			});

			this.difficulty = 0;
			this.stage = Stage.first();
			this.stage.init(game, {enemy: {difficulty: this.difficulty}});
		},

		tick: function(game, ticks, delta) {

			if (!this.stage.tick(game, ticks, delta)) {
				this.stage = this.stage.next();
				if (!this.stage) {
					this.difficulty += 1;
					this.stage = Stage.first();
				}
				this.stage.init(game, {enemy: {difficulty: this.difficulty}});
			}

			var alive = false;
			angular.forEach(game.players, function(player) {
				if (player.alive || player.lives >= 0) {
					alive = true;
					return;
				}
			});

			if (!alive) {
				game.change(State.GameOver);
			}
		},

		event: function(game, type, x, y) {
			var player = game.local;
			if (!player.alive) return;

			switch(type) {
				case Input.ANY:
					return;
				case Input.ACCELERATE:
					player.accelerate(x * 20, y * 20);
					player.rotate(x);
					break;
				case Input.VELOCITY:
					player.velocity(x * 30, y * 30);
					player.rotateTo(x * 1.5);
					break;
				case Input.FIRE:
					player.fire(game);
					return;
			}
			player.limit(0, 250);
			if (x != 0) {
				player.angle = Math.min(25, Math.max(-25, player.angle));
			}
			if (game.sync) {
				game.sync.add(Mobile.SYNC.STATE, game.local);
			}
		}

	}))();


	/* ----------------------- ( State.GameOver ) --------------------------- */

	State.GameOver = new (extend(function GameOver() {}, State, {

		name: 'gameover',

		init: function(game) {
			delete game.startTime;

			this.grace = 2;
			this.titleIn = 6;

			game.enemies.clear();
			game.playerBullets.clear();
			game.enemyBullets.clear();
			game.effects.clear();
			game.mobiles.clear();

			angular.forEach(game.players, function(player) {
				player.ready = false;
				game.mobiles.add(player);
			});
		},

		tick: function(game, ticks, delta) {
			this.titleIn -= delta;
			if (this.titleIn <= 0) {
				game.change(State.Title);
			}
			if (this.grace) {
				this.grace -= delta;
				if (this.grace < 0) {
					delete this.grace;
				}
			}
		},

		event: function(game, type, x, y) {
			if (this.grace) {
				return;
			}
			if (type === Input.ANY) {
				game.change(State.Title);
			}
		}

	}))();


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.State = State;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.models = this.models || {}));
