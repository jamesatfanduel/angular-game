(function(root, exports) {


	var extend		= require('../../dep/stratum/extend'),
		Reusable	= require('../reusable').Reusable;


	/* ------------------------- ( Sync ) ----------------------------- */

	function Sync() {
		this.queue	= [];
		this.lookup	= {};
		this.packet	= [];
	}

	var EVENT_ID = 0;

	Sync.prototype = {

		get: function(code) {
			return Sync.TYPES[code];
		},

		add: function(code, instance) {
			var key = code + (instance.id !== undefined ? instance.id : EVENT_ID++);
			if (this.lookup[key]) return;
			this.queue.push(Event.create(instance, code));
			this.lookup[key] = true;
		},

		flush: function(args) {
			if (!this.queue.length) {
				return false;
			}

			var packet = this.packet;
			packet.length = 0;

			var queue = this.queue, len = queue.length;
			for(var index = 0; index < len; index++) {
				var event	= queue[index],
					code	= event.code,
					sync	= Sync.TYPES[code],
					sub		= [code];

				if (!sync) {
					console.error("Cannot encode packet, with code: ", code);
					continue;
				}

				sub = sync.encode(sub, event.instance, args);
				if (sub) {
					packet.push(sub);
				}
			}

			this.queue.length = 0;
			this.lookup = {};

			return packet;
		},

		process: function(packets, args) {
			for(var index = 0, len = packets.length; index < len; index++) {
				var packet	= packets[index],
					code	= packet[0],
					sync	= Sync.TYPES[code];
				if (!sync) {
					console.error("Cannot decode packet: ", packet);
					continue;
				}
				sync.decode(packet, args);
			}
		}

	};

	Sync.register = function(code, encode, decode) {
		if (Sync.TYPES[code]) {
			throw new Error('Conflicting sync code: ' + code + ' previously defined in\n' + Sync.TYPES[code].defined);
		}
		Sync.TYPES[code] = {
			encode: encode,
			decode: decode,
			defined: new Error().stack
		};
	};

	Sync.properties = function properties(definition) {
		var props = [], len, source = definition.properties;
		for(var name in source) {
			if (!source.hasOwnProperty(name)) continue;
			var prop = {name: name}, item = source[name];
			if (item.extract) prop.extract = extract;
			if (item.inject) prop.inject = inject;
			props.push(prop);
		}
		props.sort(function(a, b) { return a.name.localeCompare(b); });

		len = props.length;

		var indices = {};
		for(var index = 0; index < len; index++) {
			indices[props[index].name] = index + 1;
		}

		function encode(packet, instance, args) {
			if (definition.pre) {
				var result = definition.pre(packet, instance, args);
				if (result === false) return false;
			}

			for(var index = 0; index < len; index++) {
				var prop = props[index];
				if (prop.extract) packet[index + 1] = prop.extract(instance);
				else packet[index + 1] = instance[prop.name];
			}
			return packet;
		}

		function decode(packet, args) {
			var instance = definition.instance(packet, args, indices);
			for(var index = 0; index < len; index++) {
				var prop = props[index];
				if (prop.inject) prop.inject(instance, packet[index + 1]);
				else instance[prop.name] = packet[index + 1];
			}
			if (definition.post) definition.post(packet, instance, args);
		}


		return {
			encode:		encode,
			decode:		decode,
			next:		props.length,
			indices:	indices
		};

	};


	Sync.TYPES = Sync.TYPES || {};


	/* -------------------------- ( Sync.Event ) ---------------------------- */


	var Event = extend(function Event() {}, {

		construct: function(instance, code) {
			this.instance = instance;
			this.code = code;
		}

	});

	Reusable.apply(Event);

	Sync.Event = Event;



	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Sync = Sync;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.network = this.network || {}));

