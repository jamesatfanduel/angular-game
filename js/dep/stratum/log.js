(function() {


	var module = require('stratum/module'),
		extend = require('stratum/extend');


	module('stratum.log', 'stratum');


	var root = this;


	/* -------------------------------------------------------------------------
	 *									LOG
	 * -------------------------------------------------------------------------
	 *
	 * The logging api provides a fairly simple mechanism for reporting, and
	 * filtering the output to various log /sinks/ to be
	 * displayed/stored/transmitted, etc.
	 *
	 * The logging system relies on log /levels/, each of which have a priority
	 * assigned.  The default levels are `DEBUG`, `INFO`, `WARN` and `ERROR`, in
	 * increasing order of severity.
	 *
	 * Additional custom logging levels can be defined using:
	 *
	 * ``` js
	 *		log.levels({
	 *			name: level,
	 *			name: level,
	 *			...
	 *		});
	 * ```
	 *
	 * Any defined level automatically assigns a logging method on the main
	 * log instance, so you can write to that particular log using log.name, ie.
	 *
	 * ``` js
	 *	 log.error("Test");
	 * ```
	 *
	 * The log functions are variadics, and all supplied parameters will be
	 * converted as required for the relevant sink, such as:
	 *
	 * ``` js
	 *   log.warn("Object: ", someObject, " failed to initialise");
	 * ```
	 *
	 * Configuration of the log sinks is achieved using `log.configure()`, and
	 * passing a string defining what to do with each logged message.
	 *
	 * The string is formatted as a list of space separated sink names, with
	 * braces used to encapsulate parameters passed to a sink.
	 *
	 * Some examples:
	 *
	 * ``` js
	 *   log.configure('above(WARN console)');
	 *   log.configure('console above(WARN alert)');
	 * ```
	 *
	 * The default sinks are:
	 *
	 * ```
	 * console([fallback])          Log using console.log (or fallback)
	 * alert                        Log using alert()
	 * above(LEVEL sink[ sink...])  Log messages above LEVEL to sinks
	 * below(LEVEL sink[ sink...])  Log messages below LEVEL to sinks
	 * ```
	 *
	 * New sinks can be defined by calling:
	 * 
	 * ``` js
	 *		log.addSink('name', sink);
	 * ```
	 *
	 * Where name is a the string used in a configuration to reference the sink.
	 *
	 * The actual sink passed should be a constructor, which takes two
	 * parameters, a log instance, and an array of parameters parsed from the
	 * configuration.
	 *
	 * Once constructed, instances of the sink should have a single method,
	 * `decompose` which takes a numerical level argument, and returns an array
	 * of functions, to be called in sequence, in order to perform the sinks
	 * work for the given logging level.  A typical sink definition:
	 *
	 * ``` js
	 *		function Sink(log, params) {}
	 *		Sink.prototype = {
	 *			decompose: function(level) {
	 *				return function(level, params) { ... write log ... }
	 *			}
	 *		};
	 * ```
	 *
	 * NOTE: The logging system decomposes its pipeline to minimise the amount
	 * of work done when performing a log call - this means log messages that
	 * are dropped (no sink attached) end up calling a single empty function,
	 * and most calls do no more work than absolutely necessary.  This is an
	 * efficient mechanism, but even empty calls require some cpu time in most
	 * JavaScript engines, so logging should be avoided in performance critical
	 * code, such as WebGL render loops.
	 *
	 */


	/**
	 * Main Log class, primary interface to all logging functionality.
	 * 
	 * @author James Andrews
	 */
	function Log() {
		this.levels = new Log.Levels(this);
		this.sinks = [];
	}

	Log.prototype = {

		/**
		 * Configure this Log instance.
		 *
		 * @param string	The string describing the configuration for this
		 * 					Log instance.
		 */
		configure: function(string) {
			var log = this,
				parser = new Log.Parser(string),
				token,
				sinks = Log.sinks;

			// Create a sink instance from the given name, and any parameters
			// in the token stream.
			function createSink(name) {
				if (!sinks[name]) {
					throw new Error('Invalid Log configuration: '
							+ 'not a valid sink - ' + name);
				}
				var token = parser.nextToken();
				if (token == '(') {
					var params = processParameters();
					return new sinks[name](log, params);
				}else{
					parser.pushToken(token);
					return new sinks[name](log, []);
				}
			}

			// Parse a sinnk parameter list.
			function processParameters() {
				var params = [];
				while(token = parser.nextToken()) {
					if (token == ')') return params;
					if (sinks[token]) params.push(createSink(token));
					else params.push(token);
				}
				throw new Error('Invalid Log configuration: '
						+ 'missing closing brace');
			}

			var top = [];

			while(token = parser.nextToken()) {
				if (token == '(' || token == ')') {
					throw new Error('Invalid Log configuration: '
							+ 'invalid brace location');
				}
				top.push(createSink(token));
			}

			this.sinks = top;
			this.buildLogFunctions();
		},

		/**
		 * Add a new sink type.
		 *
		 * @param name	The name of the sink, to be used in configuration.
		 * @param sink	A sink class definition, it should have a constructor
		 *				which takes (log, params), where log is a Log instance,
		 *				and params is an array of parameters (either other
		 *				sinks, or strings).  Instances of the sink should have
		 *				a single method 'decompose' which takes a single
		 *				numerical level as a parameter, and returns an array
		 *				containing functions that process a logged argument
		 *				list.
		 */
		addSink: function(name, sink) {
			Log.sinks[name.toLowerCase()] = sink;
		},

		/**
		 * Build a list of applicable sinks for a specified level.
		 *
		 * @param level	The numerical level to build the sink list for.
		 *
		 * @return	A list of sink instances that should be written to for log
		 * 			messages of the level specified.
		 */
		buildSinkList: function(level, sinks) {
			sinks = sinks || this.sinks;
			var pipeline = [];
			for(var index = 0, length = sinks.length; index < length; index++) {
				var segment = sinks[index].decompose(level);
				if (segment) pipeline = pipeline.concat(segment);
			}
			return pipeline;
		},

		decompose: function(level, sinks) {
			var pipeline = this.buildSinkList(level, sinks),
				length = pipeline.length;

			if (!length) return function() {};
			if (length == 1) {
				var func = pipeline[0];
				return function() { func(level, arguments); };
			}else{
				return function() {
					for(var index = 0; index < length; index++)
						pipeline[index](level, arguments);
				};
			}

		},

		/**
		 * Build actual log writing functions for each registered level.
		 */
		buildLogFunctions: function() {
			var levels = this.levels, length = levels.length;
			for(var index = 0; index < length; index++) {
				var levelName = levels[index],
					level = this.levels[levelName.toUpperCase()];

				this[levelName.toLowerCase()] = this.decompose(level);
			}
		},

		/**
		 * Get the name of a level from the numerical priority assigned.
		 *
		 * @param level	The numerical level.
		 *
		 * @return	The name of the level.
		 */
		getLevelName: function(level) {
			return this.levels.names[level];
		},

		/**
		 * Convert a list of arguments to a single string, for simple text sink.
		 *
		 * @param args	The array of arguments to process.
		 *
		 * @return A string representing the arguments.
		 */
		getDisplayArguments: function(args) {
			var result = [];
			for(var index = 0, len = args.length; index < len; index++)
				result.push(args[index] == null ? 'null'
					: new String(args[index]));
			return result.join('');
		},

		/**
		 * Get the fixed length display version of a given level.
		 *
		 * @param level	The numerical level to fetch for.
		 *
		 * @return	The display version of the level passed.
		 */
		getDisplayLevel: function(level) {
			return this.levels.displays[level];
		},

		/**
		 * Get the current time, formatted for fixed length display.
		 *
		 * @return A fixed length string representing the current time.
		 */
		getDisplayTime: function() {
			var date = new Date();
			function zeroPad(number) {
				if (number < 10) return '0' + number;
				else return number;
			}
			return date.getFullYear() + "-" + zeroPad(date.getMonth() + 1) + "-"
				+ zeroPad(date.getDate()) + " " + zeroPad(date.getHours()) + ":"
				+ zeroPad(date.getMinutes()) + ":" + zeroPad(date.getSeconds());
		},

	};


	/* -------------------------------------------------------------------------
	 * LOG LEVEL HANDLER
	 * ---------------------------------------------------------------------- */


	/**
	 * Level container, to prevent pollution of actual Log instances.
	 */
	Log.Levels = function(log) {
		this.log = log;
		this.names = {};
		this.displays = {};
	};

	Log.Levels.prototype = new Array();

	/**
	 * Internal mechanism to add new levels.
	 *
	 * @param An object associating level names with priorities.
	 */
	Log.Levels.prototype.add = function add(definition) {
		for(var level in definition) {
			if (!definition.hasOwnProperty(level)) continue;
			this[level.toUpperCase()] = definition[level];
			this.push(level);
			this.names[definition[level]] = level;

			var SPACES = '                                        ';
			if (level.length < 10) {
				this.displays[definition[level]] =
					level.toUpperCase() + SPACES.substring(0, 10 - level.length);
			}else this.displays[definition[level]] = level.substring(0, 10);
		}
		this.log.buildLogFunctions();
	};


	/* -------------------------------------------------------------------------
	 * CONFIGURATION PARSER
	 * ---------------------------------------------------------------------- */


	/**
	 * Parse implementation, for log configuration.
	 *
	 * @param string	The configuration string to parse.
	 */
	Log.Parser = function Parser(string) {
		this.string = string;
		this.index = 0;
		this.queue = [];
	};

	Log.Parser.prototype = {

		/**
		 * Fetch the next valid token from the configuration string.  Tokens are
		 * ( ) or any string of other characters without spaces.
		 *
		 * @return A string representing the next token.
		 */
		nextToken: function() {
			if (this.queue.length) return this.queue.pop();

			this.findTokenStart();
			if (this.index >= this.string.length) return undefined;
			switch(this.string[this.index]) {
			case '(': case ')':
				var index = this.index++;
				return this.string[index];
			}
			
			var index = this.index, string = this.string, length = string.length;
			while(index < length) {
				switch (string[index]) {
				case ' ': case '\t': case '\n': case '\r': case '(': case ')':
					var token = this.string.substring(this.index, index);
					break;
				default:
					index++;
					continue;
				}
				this.index = index;
				return token;
			}
			if (this.index != index) {
				var token = this.string.substring(this.index, index);
				this.index = index;
				return token;
			}
			return undefined;
		},

		/**
		 * Push a token back onto the parser.
		 *
		 * @param token	The token to push back.
		 */
		pushToken: function(token) {
			this.queue.push(token);
		},

		/**
		 * Skip over any whitespace, and find the start of the next valid token.
		 */
		findTokenStart: function() {
			var index = this.index, string = this.string, length = string.length;
			while(index < length) {
				switch (string[index]) {
				case ' ': case '\t': case '\n': case '\r':
					index++;
					break;
				default:
					this.index = index;
					return;
				}
			}
		}

	};



	// Container for log sink implementations.
	Log.sinks = {};


	/* -------------------------------------------------------------------------
	 * DEFAULT SINK DEFINITIONS
	 * ---------------------------------------------------------------------- */


	/**
	 * Sink implementation to drop messages unless they are above a certain
	 * level.
	 */
	Log.sinks.above = (function() {

		function Above(log, params) {
			this.log = log;
			this.level = log.levels[params[0]];
			var sinks = this.sinks = Array.prototype.slice.call(params, 1);

			if (!this.level) {
				throw Error("Invalid Log configuration: first parameter to "
						+ "'above' must be a valid level: " + params[0]);
			}
			for(var index = 0; index < sinks.length; index++) {
				if (!sinks[index].decompose)
					throw Error("Invalid Log configuration: "
						+ "above parameters after the level must be sinks");
			}


		};

		Above.prototype = {

			decompose: function(level) {
				if (level <= this.level) {
					return undefined;
				}
				return this.log.decompose(level, this.sinks);
			}

		};

		return Above;
	})();


	/**
	 * Sink implementation to drop messages unless they are below a certain
	 * level.
	 */
	Log.sinks.below = (function() {

		function Above(log, params) {
			this.log = log;
			this.level = log.levels[params[0]];
			var sinks = this.sinks = Array.prototype.slice.call(params, 1);

			if (!this.level) {
				throw Error("Invalid Log configuration: first parameter to "
						+ "'below' must be a valid level");
			}
			for(var index = 0; index < sinks.length; index++) {
				if (!sinks[index].decompose)
					throw Error("Invalid Log configuration: "
						+ "below parameters after the level must be sinks");
			}
		};

		Above.prototype = {

			decompose: function(level) {
				if (level >= this.level) {
					return undefined;
				}
				return this.log.decompose(level, this.sinks);
			}

		};

		return Above;
	})();


	/**
	 * Sink implementation to alert any log messages.
	 */
	Log.sinks.alert = (function() {
		function Alert(log) { this.log = log; }
		Alert.prototype = {

			decompose: function(level) {
				var log = this.log;
				return [function Alert(level, params) {
					alert(log.getDisplayTime() + ' ['
							+ log.getDisplayLevel(level) + ']: '
							+ log.getDisplayArguments(params));
				}];
			}

		};
		return Alert;
	})();


	/**
	 * Sink implementation to write logs to the console.
	 */
	Log.sinks.console = (function() {

		function Console(log, params) {
			this.log = log;
			if (params.length && params.length != 1) {
				throw new Error("Invalid Log configuration: console only "
					+ "accepts one parameter, a fallback sink for when "
					+ "console.log is missing");
			}
			if (params.length && !params[0].decompose) {
				throw new Error("Invalid Log configuration: fallback parameter "
					+ "for console must be a sink");
			}
			if (!root.console || !root.console.log) {
				return params[0];
			}
		};

		Console.prototype = {

			decompose: function(level) {
				var log = this.log;

				if (Function.prototype.bind && console && typeof console.log == "object") {
					console.log = this.bind(console.log, console);
				}

				return [function Console(level, params) {
					var source = ["%s [%s]: "],
						args = ['', log.getDisplayTime(),
								log.getDisplayLevel(level)];
					for(var index = 0; index < params.length; index++) {
						var param = params[index];
						if (typeof(param) == 'string') {
							source.push(param);
						}else{
							source.push('%o');
							args.push(param);
						}
					}
					args[0] = source.join('');
					console.log.apply(console, args);
				}];
			}

		};
		return Console;
	})();


	/* -------------------------------------------------------------------------
	 * INITIAL CONFIGURATION
	 * ---------------------------------------------------------------------- */


	// Make exported classes extendable.
	Log.extend = extend;
	Log.Levels.extend = extend;
	Log.Parser.extend = extend;


	// Initialise a single global logger, and add default levels to it.
	exports = new Log();
	exports.levels.add({
		error: 4000,
		warn:  3000,
		info:  2000,
		debug: 1000
	});

	// Export the class definition.
	exports.Log = Log;


})();
