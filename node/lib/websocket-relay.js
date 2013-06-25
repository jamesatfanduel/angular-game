(function(root) {

	var WSServer = require('websocket.io');

	WSServer; // Eclipse foolishness workaround.

	function RelayServer(options) {
		var relay = this,
			server;

		if (options.server) {
			server = this.server = WSServer.attach(options.server);
		}else{
			server = this.server = WSServer.listen(options.port || 3000);
		}

		this.slaves = {};

		server.on('connection', function(connection) {
			if (!relay.master) {
				new Master(relay, connection);
			}else{
				new Slave(relay, connection);
			}
		});
	}

	RelayServer.prototype = {

		broadcast: function(message, but) {
			var slaves = this.slaves;
			for(var id in slaves) {
				if (!slaves.hasOwnProperty(id)) continue;
				try{
					if (but === id) continue;
					slaves[id].connection.send(message);
				}catch(e) {
					console.log(e.stack);
				}
			}
		}

	};


	RelayServer.create = function(options) {
		return new RelayServer(options);
	};


	function Master(relay, connection, suppressRole) {
		this.relay = relay;
		this.connection = connection;

		relay.master = this;

		connection.on('message', function(message) {
			try{
				var msg = JSON.parse(message);

				switch(msg.type) {
				case 'kick':
					var id = msg.target;
					if (relay.slaves[id] !== undefined) {
						var slave = relay.slaves[id];
						slave.connection.send(JSON.stringify({type: 'kicked', reason: msg.reason}));
						slave.connection.close();
						delete relay.slaves[id];
						return;
					}
				case 'whoami':
					connection.send(JSON.stringify({type: 'assign', role: 'master'}));
					return;
				case 'to':
					var target = msg.target,
						slaves = relay.slaves;
					if (slaves[target]) {
						slaves[target].connection.send(JSON.stringify(
							{type: 'message', id: 'm', message: msg.message}));
					}
					return;
				case 'but':
					relay.broadcast(JSON.stringify({type: 'message', id: 'm', message: msg.message}), msg.target);
					return;
				case 'message':
					relay.broadcast(JSON.stringify({type: 'message', id: 'm', message: msg.message}));
					return;
				}
			}catch(e) {
				console.log("Master: Unable to interpret message: ", message, "\n\n", e.stack);
			}
		});

		connection.on('close', function() {
			var slaves = relay.slaves,
				slave = false;
			for(var id in slaves) {
				if (!slaves.hasOwnProperty(id)) continue;
				slave = slaves[id];
				break;
			}

			if (slave !== false) {
				slave.promote();
			}else{
				relay.master = null;
				SLAVE_ID = 0;
			}
		});

		if (!suppressRole) {
			connection.send(JSON.stringify({type: 'assign', role: 'master'}));
		}
	};

	var SLAVE_ID = 0;

	SLAVE_ID; // Eclipse foolishness workaround.

	function Slave(relay, connection) {
		var slave = this;

		this.id = 'S' + SLAVE_ID++;
		this.connection = connection;
		this.relay = relay;

		relay.master.connection.send(JSON.stringify({type: 'connect', id: slave.id}));

		connection.on('message', this.onmessage = function(message) {
			if (slave.retired) return;
			try{
				var msg = JSON.parse(message);
				relay.master.connection.send(JSON.stringify({type: 'message', id: slave.id, message: msg.message}));
			}catch(e) {
				console.log("Slave: Unable to interpret message: ", message, "\n\n", e.stack);
			}

		});

		connection.on('close', this.onclose = function() {
			if (slave.retired) return;
			relay.master.connection.send(JSON.stringify({type: 'disconnect', id: slave.id}));
			delete relay.slaves[slave.id];
		});

		connection.send(JSON.stringify({type: 'assign', role: this.id}));

		relay.slaves[this.id] = this;
	};

	Slave.prototype = {

		promote: function() {
			var relay = this.relay,
				slaves  = relay.slaves;

			this.retired = true;
			this.connection.send(JSON.stringify({type: 'promote'}));
			delete slaves[this.id];

			relay.master = new Master(relay, this.connection, true);

			for(var id in slaves) {
				if (!slaves.hasOwnProperty(id)) continue;
				this.connection.send(JSON.stringify({type: 'connect', id: id}));
			}

		}

	};


	module.exports = RelayServer;


})(this);
