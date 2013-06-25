(function(root) {

	var RelayServer = require('../lib/websocket-relay'),
		port = process.argv[2] || 3000;

	RelayServer.create({port: port});

	console.log("Relay server started on port: ", port);

})(this);
