(function() {


	// ---------------------------------------------------------------------
	// # Tracing utility functions
	// ---------------------------------------------------------------------

	// Local references to require classes.
	var classes	= stratum,
		Script	= classes.Script,
		Loader	= classes.Loader;

	/**
	 * Trace function calls - can intercept before or after the call.
	 */
	Trace = {


		// Hook in before a call occurs, and invoke the callback specified with
		// the call's arguments.
		before: function(object, method, callback) {
			var original = object[method];
			object[method] = function() {
				try{
					callback.apply(this, arguments);
				}catch(e) {
					console.warn('WARNING: %o threw %s', callback, e.stack);
				}
				return original.apply(this, arguments);
			};
			return function() {
				object[method] = original;
			};
		},


		// Hook in after a call occurs, and invoke the callback specified with
		// the return value, followed by the call's arguments.
		after: function(object, method, callback) {
			var original = object[method];
			object[method] = function() {
				var result = original.apply(this, arguments);
				try{
					callback.apply(this, [result].concat(
							Array.prototype.slice.call(arguments, 0)));
				}catch(e) {
					console.warn('WARNING: %o threw %s', callback, e.stack);
				}
				return result;
			};
			return function() {
				object[method] = original;
			};
		}


	};

	// Create a trace on a specific method.
	function create(object, method, colour, msg, after, func) {
		msg = msg || (method.toUpperCase() + ': [%s]');
		colour = colour || 'black';

		// Callback function to render information to console.log about what
		// the require functions get up to.
		var callback = function() {
			var result = func ? func.apply(this, arguments) : [this.toString()];
			if (result === false) return;
			console.log.apply(console, ['%c--- ' + msg, 'color: '
				+ colour + ';'].concat(result));
		};

		// Function to actually apply the trace.
		return function(config, removes) {
			if (config.debug === true
					|| (config.debug && config.debug[method])) {
				removes.push(after
					? Trace.after(object, method, callback)
					: Trace.before(object, method, callback)
				);
			}
		};
	}

	// Create the traces, to monitor require activity.
	var updates = [

		create(Script, 'current', '#aaa', null, true,
			function(result) { return [result.toString()]; }),

		create(Loader.prototype, 'require', 'purple', 'FROM REQUIRE IN [%s]', false,
			function() { return [Script.current(this).toString()]; }),

		create(Script.prototype, 'create', 'green'),

		create(Script.prototype, 'destroy', 'red'),

		create(Script.prototype, 'load'),

		create(Script.prototype, 'depend', 'blue', 'DEPENDENCY [%s] -> [%s]',
			true, function(result, script) { return result === false ? false
				: [this.toString(), script.toString()]; }),

		create(Script.prototype, 'cycle', 'orange', 'CYCLE:\n%s', true,
			function(result, script, path) {
				if (path === undefined && result) {
					var array = [];
					for(var index = 0; index < result.length; index++) {
						array.push('      ' + result[index].join(','));
					}
					return array.join('\n');
				}
				return false;
			}),

		create(Script.prototype, 'allow', 'cyan', 'ALLOW [%s] -> [%s]', true,
			function(result, script) { return result
				? [this.toString(), script.toString()] : false; }),

		create(Loader, 'ready', null, 'ONLOAD [%s]', true,
				function(result, script) { return [Script.last().toString()] })

	];


	// Function to apply the configuration.
	function apply(config) {
		var removes = [];
		for(var index = 0; index < updates.length; index++) {
			updates[index](config, removes);
		}
	}


	// Apply the default configuration
	apply(require.stratum.loader.config);

})();


