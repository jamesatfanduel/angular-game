(function(root, exports) {


	var	Relay	= require('./relay').Relay,
		Player	= require('../models/player').Player,
		Mobile	= require('../spatial/mobile').Mobile;


	Relay; // Eclipse foolishness

	var RATE		= 20; // Max updated per second.
		DELAY		= 1000 / RATE;

	// Synchronised unique network id.
	var	NID			= 0;

	// Commands.
	var IDENTIFY	= 0,
		ASSIGN		= 1,
		JOIN		= 2,
		LEAVE		= 3;
		SYNC		= 4;

	var METHOD = ['identify', 'assign', 'join', 'leave', 'sync'];


	/* ------------------------- ( Client ) ----------------------------- */

	function Client(game, host, port) {
		this.relay = new Relay(host, port);
		this.game = game;

		this.lookup = {};
		this.players = {};

		this.init();
	}

	Client.prototype = {

		init: function() {
			var client	= this,
				game	= this.game,
				relay	= this.relay;

			relay.onmessage = function(id, message) {
//				console.log("RECV: ", JSON.stringify(message));
				var method = METHOD[message.cmd];
				if (!method) {
					throw new Error("Unknown command: ", message.cmd);
				}
				client.type[method](game, client, id, message);
			};

			relay.onconnect = function(id) {
				client.type.connect(game, client, id);
			};

			relay.ondisconnect = function(id) {
				client.type.leave(game, client, id, {id: id});
			};

			relay.onrole = function(master, role) {
				game.client = client;
				game.server = master;
				client.type = master ? Client.Master : Client.Slave;
				client.nidBase = (role === 'master' ? 'm' : role.substring(1)) + '/';

				if (master) {
					game.local.nid = client.nid();
					game.local.pid = 'master';

					client.lookup[game.local.nid]	= game.local;
					client.players.master			= game.local;
				}

				game.pipeline(function(ticks, last, current) {
					if (client.next > current) return;
					client.next = current + DELAY;
					var now = game.time();
					var packets = game.sync.flush([game, now]);
					if (packets !== false && packets.length) {
						client.send({cmd: SYNC, p: packets});
					}
				});

			};

			relay.onpromote = function() {
				game.server = true;
				client.type = Client.Master;
				client.type.promote(game, client);
			};

		},

		send: function(message) {
			this.relay.send(message);
		},

		sendTo: function(id, message) {
			this.relay.sendTo(id, message);
		},

		sendBut: function(id, message) {
			this.relay.sendBut(id, message);
		},

		kick: function(id, reason) {
			this.relay.kick(id, reason);
		},

		nid: function() {
			return this.nidBase + (NID++);
		},

		nidRange: function(size, base, start) {
			var nids = {
				base: (base || this.nidBase),
				first: start || NID,
				apply: function(mobiles) {
					var len = mobiles.length,
						base = this.base,
						first = this.first;

					if (len !== size) {
						throw new Error('Mismatched nid range size');
					}
					for(var index = 0; index < len; index++) {
						mobiles[index].nid = base + (first++);
					}
				}
			};
			NID += size;
			return nids;
		}

	};


	/* ------------------------ ( Client.Master ) --------------------------- */

	Client.Master = {

		connect: function(game, client, id) {
			// Ignore connect messages from players we know about.
			if (client.players[id]) return;
			client.sendTo(id, {cmd: IDENTIFY});
		},

		identify: function(game, client, id, message) {
			if (message.version !== Client.VERSION) {
				client.kick(message.id, 'Wrong game version');
				return;
			}

			// Create new player instance
			var player = game.createPlayer(message.name);
			player.pid = id;
			player.nid = client.nid();

			client.players[id] = player;

			client.sendTo(id, {
				cmd:	ASSIGN,
				nid:	player.nid,
				pid:	id,
				ix:		player.initial.x,
				iy:		player.initial.y
			});

			// Inform player of all others
			var players = game.players;
			for(var lid in players) {
				if (!players.hasOwnProperty(lid)) continue;
				var pl = players[lid];
				if (pl.nid === player.nid) continue;
				client.sendTo(id, {
					cmd:	JOIN,
					name:	pl.name,
					nid:	pl.nid,
					pid:	pl.pid,
					ix:		pl.initial.x,
					iy:		pl.initial.y,
				});

				game.sync.add(Player.SYNC.READY, pl);
				game.sync.add(Mobile.SYNC.STATE, pl);
			}

			// Announce the new player to everyone else.
			client.sendBut(player.nid, {
				cmd:	JOIN,
				name:	player.name,
				nid:	player.nid,
				pid:	player.pid,
				ix:		player.initial.x,
				iy:		player.initial.y
			});

			game.add(player);
		},

		assign: function(game, client, id, message) {
			throw new Error("Master should not receive assign messages");
		},

		join: function(game, client, id, message) {},

		leave: function(game, client, id) {
			var players	= client.players,
				player	= players[id];

			if (!player) return;

			delete players[id];

			game.destroy(player);

			client.send({cmd: LEAVE, id: id});
		},

		promote: function(game, client) {
			var player	= game.local,
				lookup	= client.lookup,
				players	= client.players,
				master	= players.master;

			client.send({cmd: LEAVE, id: 'master'});
			client.send({cmd: LEAVE, id: player.pid});

			if (!master) {
				debugger;
			}

			delete lookup.master;
			delete players[master.pid];
			delete lookup[master.nid];
			delete game.players[master.id];

			delete players[player.pid];

			player.pid = 'master';
			client.send({
				cmd:	JOIN,
				name:	player.name,
				nid:	player.nid,
				pid:	'master',
				ix:		player.initial.x,
				iy:		player.initial.y
			});

			players[player.pid] = player;
		},

		sync: function(game, client, id, message) {
			game.sync.process(message.p, [game]);
			client.sendBut(id, message);
		},

	};


	/* ------------------------- ( Client.Slave ) --------------------------- */

	Client.Slave = {

		connect: function(game, client, id) {
			throw new Error("Slave should not receive connect messages");
		},

		identify: function(game, client, id, message) {
			client.send({cmd: IDENTIFY, name: game.local.name,
				version: Client.VERSION});
		},

		assign: function(game, client, id, message) {
			game.destroy(game.local);
			game.local.nid = message.nid;
			game.local.pid = message.pid;
			game.add(game.local);

			client.players[message.pid] = game.local;

			game.local.initial.x = game.local.x = message.ix;
			game.local.initial.y = game.local.y = message.iy;

			game.sync.add(Player.SYNC.READY, game.local);
		},

		join: function(game, client, id, message) {
			// Ignore join messages we know about.
			var lookup = client.lookup,
				players = client.players;

			if (lookup[message.nid] || players[message.pid]) {
				return;
			}

			var player = game.createPlayer(message.name);
			player.nid = message.nid;
			player.pid = message.pid;

			player.x = player.initial.x = message.ix;
			player.y = player.initial.y = message.iy;

			players[player.pid] = player;
			game.add(player);
		},

		leave: function(game, client, id, message) {
			var lookup	= client.lookup,
				players	= client.players,
				player	= players[message.id];

			if (!player) {
				console.log("No such pid: ", message.id);
				return;
			}

			delete players[player.pid];
			delete lookup[player.nid];
			delete game.players[player.id];

		},

		sync: function(game, client, id, message) {
			game.sync.process(message.p, [game]);
		},

	};


	/* ---------------------------- ( INIT ) -------------------------------- */

	Client.attach = function(game, host, port) {
		return new Client(game, host, port);
	};

	Client.VERSION	= 2;


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Client = Client;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.network = this.network || {}));

