(function(root, exports) {


	/* ------------------------- ( Connection ) ----------------------------- */

	function Relay(host, port) {
		var connection = new WebSocket('ws://'
				+ (host || location.hostname) + ':' + (port || 3000) + '/');

		this.connection = connection;

		var local = this;

		connection.onmessage = function(message) {
			var msg = null;
			try{
				msg = JSON.parse(message.data);
			}catch(e) {
				console.log("Failed to interpret: " + message.data + "\n" + e.stack);
				return;
			}
			switch(msg.type) {
			case 'assign':
				if (msg.role === 'master') {
					local.master = true;
					local.id = 'master';
				}else{
					local.master = false;
					local.id = msg.role;
				}
				local.onrole(local.master, local.id);
				return;
			case 'connect':
				local.onconnect(msg.id);
				return;
			case 'disconnect':
				local.ondisconnect(msg.id);
				return;
			case 'promote':
				local.onpromote();
				return;
			case 'message':
				local.onmessage(msg.id, msg.message);
				return;
			}
		};

		connection.onclose = function(event) {
			local.onclose(event);
		};
		
	}


	Relay.prototype = {

		send: function(message) {
//			console.log("SEND: ", JSON.stringify(message));
			this.connection.send(JSON.stringify({type: 'message', message: message}));
		},

		sendTo: function(id, message) {
//			console.log("SEND TO: ", id, " - ", JSON.stringify(message));
			this.connection.send(JSON.stringify({type: 'to', target: id, message: message}));
		},

		sendBut: function(id, message) {
//			console.log("SEND TO: ", id, " - ", JSON.stringify(message));
			this.connection.send(JSON.stringify({type: 'but', target: id, message: message}));
		},

		kick: function(id, reason) {
			this.connection.send(JSON.stringify(
					{type: 'kick', target: id, reason: reason}));
		},

		close: function() {
			this.connection.close();
		},

		onmessage:		function(id, message) {},
		onclose:		function() {},
		onconnect:		function(id) {},
		ondisconnect:	function(id) {},
		onrole:			function(master, role) {},
		onpromote:		function() {}

	};


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Relay = Relay;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.network = this.network || {}));
