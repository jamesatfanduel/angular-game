(function() {


	var root = this;
	if (!root.stratum) root.stratum = {};


	/* -------------------------------------------------------------------------
	 * #							REQUIRE
	 * -------------------------------------------------------------------------
	 *
	 * WARNING: This code uses a very nasty hack, and as such is not advised for
	 * production use - its primary purpose is to facilitate rapid development,
	 * without constant build steps when iterating.
	 * 
	 * Production deployment is FAR better served by a dedicated build step,
	 * involving some pre-processor variant of inclusion, such as browserify.
	 *
	 * -------------------------------------------------------------------------
	 *
	 * General require/include/define functions for dependency management in
	 * JavaScript - use all the modules!
	 *
	 * Usage:
	 *
	 * CommonJS style:
	 * ``` js
	 *		var exported = require('somemodule');
	 *		var exported = require('../path/to/somemodule');
	 * ```
	 *
	 * AMD require style:
	 *
	 * ``` js
	 * 	require('somemodule', function(somemodule) { ... });
	 * ```
	 *
	 * AMD define style:
	 *
	 * ``` js
	 *	define('somemodule', ['dependency'],
	 *			function(dependency) { ... });
	 *
	 *	define(['dependency'], function(dependency) { ... });
	 * ```
	 *
	 * Typical (other language) inclusion style:
	 *
	 * ``` js
	 *	include('somefile.js');
	 * ```
	 *
	 * This mechanism allows projects to be split into components, as is
	 * typically available in other languages, and ensures that dependent
	 * scripts are executed after their dependencies.
	 *
	 * To configure this functionality, add a script tag, with the type
	 * `config/stratum/require`, and the config contained as a JSON object,
	 * as below:
	 *
	 * ``` html
	 *	<script type='config/stratum/require'>
	 *		{
	 *			development: true,
	 *			throwCyclic: false
	 *		}
	 *	</script>
	 * ```
	 *
	 * Configuration options are:
	 *
	 * development: boolean
	 * >> Will force all subsequent requirements to have the current time in
	 * >> millis appended as a page parameter, to force reloading in browsers
	 * >> that refuse to reload scripts referenced by dynamically created script
	 * >> nodes.
	 *
	 * throwCyclic: boolean
	 * >> Cause the library to throw an exception when cyclic dependencies are
	 * >> detected, making it easier to remove them.  Lets face it, they are
	 * >> allowed in the CommonJS and AMD specs, but they are rarely needed in
	 * >> practise, almost always a design flaw, just a terrible idea, and a one
	 * >> way trip to insanity.
	 */


	// ---------------------------------------------------------------------
	// # Loader class
	// ---------------------------------------------------------------------

	/**
	 * Loader implementation, manages caching and the dependency graph for
	 * the requirement mechanism.
	 *
	 * @param {Array} paths	Optional list of base paths to load modules from.
	 */
	function Loader(paths) {
		this.queue		= [];
		this.cache		= {};
		this.defined	= {};
		this.loading	= {};
		this.paths		= paths || [];

		this.config = {
			development:	false,
			throwCycle:		false
		};

		if (stratum.Application) this.application = stratum.Application.active;
	}

	Loader.prototype = {


		/* -------------------( State transition events )-------------------- */


		/**
		 * Add a requirement for the module at the url specified.
		 *
		 * @param {string} url		The url of the module to load.
		 * @param {boolean} include	Mark this as an include, rather than module.
		 *
		 * @return {any} The exports object defined by the script.
		 */
		require: function(url, noexport) {
			var current	= Script.current(this),
				script	= Script.url(url, this, noexport);

			if (!this.first) this.first = current;

			// Ensure dependency is recorded.
			current.depend(script);

			// Load the script if needed.
			if (!script.loaded) {

				// Allow returning of exports from a cyclic dependency, even when
				// not fully loaded.
				if (current.allowed[script.sid]) {
					current.loaded = undefined;
					return script.exports;
				}

				this.enqueueAll([script, current], false, current);
			}

			// If successful, return the exported module.
			return script.exports;
		},


		/**
		 * Define a module with a callback to be invoked when its dependencies
		 * have been satisfied.
		 *
		 * @param {function} callback	The callback to invoke.
		 * @param {string} module		The module name.
		 * @param {Array} dependencies	An array of dependencies.
		 */
		define: function(module, dependencies, callback) {
			var script = Script.callback(callback, module, this);
			if (module) this.defined[module + '.js'] = script;

			if (!dependencies || dependencies.length == 0) {
				this.load(script);
			}else{
				for(var index = 0; index < dependencies.length; index++) {
					var dependency	= Script.url(dependencies[index] + '.js', this);
					script.depend(dependency);
					this.enqueue(dependency, true, script);
				}
				this.enqueue(script, true, script);
				this.next();
			}
		},


		/**
		 * Event handler for notification that a `Script` loaded successfully.
		 *
		 * @param {Script} script		The `Script` that loaded.
		 */
		loaded: function(script) {
			script.after();
			delete this.loading[script.sid];
			if (script.loaded === undefined) {
				script.loaded = true;
			}
			this.next();
		},


		/**
		 * Event handler for notification that a `Script` failed to load.
		 *
		 * @param {Script} script		The `Script` that failed to load.
		 * @param {Script} dependent	The dependent `Script` that made the
		 *								request.
		 */
		failed: function(script, dependent) {
			delete this.loading[script.sid];
			script.after(true);
			if (!script.next()) {
				this.clear();
				throw new Error('Failed to load script "' + script + '" (from "'
						+ dependent + '"), file not found');
			}

			script.loaded = undefined;

			this.queue.unshift(script);
			this.next(script);
		},


		/* -------------( Pre/post processing for load state )--------------- */


		/**
		 * Load the `Script` specified immediately.
		 *
		 * @param {Script} script		The `Script` object to load.
		 * @param {Script} requester	The `Script` requesting this load.
		 */
		load: function(script, requester, suppressEvents) {
			var loader	= this;

			// Ensure this script is not being loaded twice
			if (this.loading[script.sid]) return;

			this.loading[script.sid] = true;

			var app = script.application;
			if (!app && stratum.Application) app = stratum.Application.base;
			if (app) stratum.Application.use(app);
			
			script.before();
			script.load(
				suppressEvents ? null : function load() {
					loader.loaded(script, requester);
				},
				suppressEvents ? null : function fail() {
					loader.failed(script, requester);
				}
			);
		},


		stop: function(callback) {
			var current = Script.current();
			if (this.loading[current.sid]) {
				delete this.loading[current.sid];
			}
			Script.stop(callback);
		},


		/* ----------------------( Queue processing )------------------------ */


		/**
		 * Add the `Script` specified to the load queue for this `Loader`.
		 *
		 * @param {Script} script		The `Script` to add to the queue.
		 * @param {boolean} preventLoad	Do not initiate loading automatically.
		 */
		enqueue: function(script, preventLoad, current) {
			var queue	= this.queue,
				loader	= this;

			if (script.loaded) return;

			if (current) {
				current.loaded = false;
			}

			if (!queue[script.sid]) {

				queue[script.sid] = script;
				queue.push(script);

				if (!preventLoad && current && !current.callback) {
					this.stop(function onstop() {
						loader.next(preventLoad);
					});
				}else if (!preventLoad) {
					this.next();
				}
			}
		},


		/**
		 * Add the `Script`s specified to the load queue for this `Loader`.
		 *
		 * @param {Array} scripts		An array of `Script`s to enqueue.
		 * @param {boolean} preventLoad	Do not initiate loading automatically.
		 */
		enqueueAll: function(scripts, preventLoad, current) {
			var length = scripts.length;
			for(var index = 0; index < length - 1; index++) {
				this.enqueue(scripts[index], true, current);
			}
			this.enqueue(scripts[length - 1], preventLoad, current);
		},


		/**
		 * Clear the queue.
		 */
		clear: function() {
			this.queue = [];
			this.loading = {};
		},


		/**
		 * Begin loading the next script in the load queue.
		 *
		 * @return {boolean} True if a load was initiated, false if not.
		 */
		next: function() {
			var queue	= this.queue,
				length	= queue.length,
				loader	= this, requester = null;

			// Loop through the current load queue.
			for(var index = 0; index < length; index++) {
				var script = queue[index];

				// Strip any excess loaded files (or missing files: IE bug).
				if (!script || script.loaded) {
					queue.splice(index, 1);
					if (script) delete queue[script.sid];
					index--;
					continue;
				}

				// If a script has its dependencies satisfied, load it
				if (script.ready()) {
					queue.splice(index, 1);
					delete queue[script.sid];
					loader.load(script, script.requester[0]);
					return true;
				}

				// Cache the requester if available, in case we hit a cyclic.
				if (script.url && script.requester.last && !requester) {
					requester = script.requester.last;
				}
			}

			// If there are items on the queue, but we cannot load, then we have
			// a cyclic dependency to resolve.
			if (queue.length != 0) {
				// If there is no requester, then we are doing a parallel load,
				// so this isn't actually an indication of a cycle.
				if (!requester) return;
				this.cycle(requester);
				return true;
			}

			return false;
		},


		/**
		 * Resolve a cyclic dependency, by choosing a point in the cycle, and
		 * allowing the dependent to continue, even though its requirement is
		 * not yet satisfied.
		 *
		 * @param {Script} script	A Script that is in the dependency loop.
		 */
		cycle: function(script) {

			var cycle	= script.cycle(),
				length	= cycle.length,
				loader	= this;

			if (this.config.throwCycle) throw new
					Error('Cyclic dependency: ' + cycle[0].join(','));

			for(var index = 0; index < length; index++) {
				var sub		= cycle[index],
					sublen	= sub.length,
					first	= sub[0],
					last	= sub[sublen - 1];

				last.allow(first);

				this.enqueueAll(sub, true, false);
			}

			loader.next(true);
		}


	};


	/** Find the last wrapped `Script` and shift it to the end of the page, to
	 * prevent `current` from being corrupted by additional script tags that
	 * may have been processed.
	 */
	Loader.ready = function() {
		var last = Script.last();
		if (last) {
			document.getElementsByTagName('head')[0].appendChild(last.node);
		}

	};


	// ---------------------------------------------------------------------
	// # Script class
	// ---------------------------------------------------------------------


	/**
	 * A single script on a page, either as a DOM script node, or url, or both.
	 * `Script` objects should not be instanciated directly, but created via the
	 * factory methods:
	 *
	 * ``` js
	 *		Script.node(domNode);
	 *		Script.url(url);
	 *		Script.current();
	 * ```
	 *
	 * To ensure that multiple instances are not created referencing the same
	 * script, or node.
	 *
	 * @param {DOMNode} node	The DOM script node this Script represents.
	 * @param {string} url		The url of this script, if available.
	 * @param {Loader} loader	The `Loader` instance managing this `Script`.
	 * @param {Array} paths		An optional set of paths instead of the
	 * 							`Loader`s.
	 */
	function Script(node, url, loader, paths) {

		this.application	= loader.application;
		this.loader			= loader;
		this.node			= node;
		this.url			= url || (node && node.src ? node.src : undefined);
		this.absolute		= (node && node.src) ? node.src : null;
		this.dependencies	= [];
		this.loaded			= undefined;
		this.remaining		= (paths ? paths : loader.paths).slice(0);
		this.requester		= [];
		this.allowed		= {};
		this.id				= Script.id++;
		this.sid			= 'S' + this.id;

		Script.all[this.sid]	= this;

		if (node) {
			node[Script.MARKER] = this;
			this.content = node.innerHTML;
		}

	}


	Script.prototype = {


		/**
		 * Load the script represented by this node, and execute it.  If it
		 * already exists on the page, this method destroys the original first.
		 *
		 * @param {function} loaded	The function to call back if successful.
		 * @param {function} failed	The function to call back if failed.
		 */
		load: function(loaded, failed, current) {

			if (this.callback) {
				this.call(loaded);
				return;
			}

			var node = this.create();
			if (this.node) this.destroy();

			this.node = node;
			if (!this.loaded) {
				this.loaded = undefined;
			}

			this.bind();

			if (loaded) this.onload = loaded;
			if (failed) this.onfail = failed;

			current = current | Script.current(this.loader);

			var existing = current.node, parent = node.parentNode;
			if (parent) {
				parent.insertBefore(existing, node);
			}else{
				document.getElementsByTagName('head')[0].appendChild(node);
			}
		},

		/**
		 * Pre-processing to apply before loading a `Script`.
		 */
		before: function() {

			this.cached = {
				exports:	root.exports,
				module:		root.module,
				global:		root.global
			};

			if (this.noexport) {
				// If this is marked as noexport, its either a direct page
				// script, or an 'include', so it doesn't need export state.
				delete root.exports;
				delete root.module;
				delete root.global;
				return;
			}

			root.exports	= this.cached.original = {};
			root.module		= { id: this.absolute.substring(0,
										this.absolute.length - 3),
								exports: root.exports };
			root.global		= root;

		},


		/**
		 * Post-processing to apply after loading has succeeded/failed.
		 */
		after: function(noexport) {
			if (!this.url || !this.cached) return;

			// Store the module state on the new `Script`, and restore the
			// globals.
			if (!this.noexport && !noexport) {
				this.exports = root.module.exports !== this.cached.original
						? root.module.exports : root.exports;

				this.module = root.module;
			}

			if (root.exports) {
				root.exports = this.cached.exports;
				root.module = this.cached.module;
				root.global = this.cached.global;
			}else{
				delete root.exports;
				delete root.module;
				delete root.global;
			}

			delete this.cached;
		},


		/**
		 * Invoke a 'callback' variant `Script`.
		 */
		call: function(loaded) {
			if (!this.callback) throw new Error('Not a callback Script');

			var exports			= [],
				dependencies	= this.dependencies,
				length			= dependencies.length;

			for(var index = 0; index < length; index++) {
				exports[index] = dependencies[index].exports;
			}

			this.callback.apply(root, exports);

			this.loaded = true;
			if (loaded) loaded(this, this.requester.last);
		},


		/**
		 * Try the next path associated with this Script.
		 *
		 * @return {boolean}	True if there are any additional paths to try,
		 * 						false otherwise.
		 */
		next: function() {
			var remain	= this.remaining,
				cache	= this.loader.cache;

			if (!remain || !remain.length) return false;

			if (this.absolute) {
				delete cache[this.absolute];
			}

			this.absolute = URL.absolute(this.url, remain.shift());

			cache[this.absolute] = this;
			return true;
		},


		/**
		 * Add a dependency to this `Script`.
		 *
		 * @param {Script} script	The `Script` instance to depend upon.
		 *
		 * @return {boolean}	True if this is a new dependency, else false.
		 */
		depend: function(script) {
			var dependencies = this.dependencies;

			if (script === this) throw new Error(
					'Module cannot depend upon itself, in: "' + script.url + '"');

			if (!dependencies[script.sid]) {
				dependencies[script.sid] = script;
				dependencies.push(script);
				script.requester.push(this);
				if (this.url) script.requester.last = this;
				return true;
			}
			return false;
		},


		/**
		 * Check whether all of the scripts that this Script is dependent upon
		 * have been loaded.
		 *
		 * @return	{boolean}	True if this Script has no outstanding
		 *						dependencies, otherwise false.
		 */
		ready: function() {
			var dependencies = this.dependencies, length = dependencies.length;
			for(var index = 0; index < length; index++) {
				var dependency = dependencies[index];
				if (!dependency.loaded
						&& !this.allowed[dependency.sid]) {
					return false;
				}
			}
			return true;
		},


		/**
		 * Search for a cyclic dependency path on this `Script` or any of its
		 * dependencies. 
		 *
		 * This method is potentially expensive, but it is only used when a
		 * cycle has already been identified.
		 *
		 * @param {string} url	The url to search for.
		 * @param {string} path	The (optional) existing path that has been
		 * 						searched.
		 *
		 * @return	{Array} An array cycles, each cycle being represented by an
		 * 					array of `Script` instances.
		 */
		cycle: function(script, path, result) {
			var first = !path;

			script	= script || this,
			path	= path || [];
			result	= result || [];

			// Spot dependency loop if this `Script` is already on the path.
			if (path[this.absolute]) {
				result.push(path.slice(path[this.absolute]));
				return result;
			}

			// Add this script to the path.
			path[this.absolute] = path.length;
			path.push(this);

			// Check all dependencies
			var dependencies	= this.dependencies,
				length			= dependencies.length;

			for(var index = 0; index < length; index++) {
				dependencies[index].cycle(script, path, result);
			}

			// Remove this from the path, once complete.
			delete path[this.absolute];
			path.length--;

			// If we've returned to the root call, remove duplicates
			if (first) {
				var lookup = {}, uniques = [];
				for(var index = 0; index < result.length; index++) {
					var fingerprint = Script.fingerprint(result[index]);
					if (lookup[fingerprint]) continue;
					lookup[fingerprint] = result[index];
					uniques.push(result[index]);
				}
				return uniques;
			}
		},


		/**
		 * Allow partial loading of the `Script` specified, when required by
		 * this `Script`.  This mechanism is used to resolve cyclic
		 * dependencies between `Script`s.
		 *
		 * @param {Script} script	The `Script` to allow partial loading of.
		 */
		allow: function(script) {
			if (script.absolute) {
				this.allowed[script.sid] = true;
				return true;
			}
			return false;
		},


		/**
		 * Create a DOM script node representing this `Script` file, and return
		 * it.
		 *
		 * @return {DOMNode}	A DOM script node, capable of executing this
		 * 						`Script`.
		 */
		create: function() {
			var node = document.createElement('script');
			node.type = 'text/javascript';
			node.defer = false;
			if (this.content) {
				try{
					node.innerHTML = this.content;
				}catch(e) {
					// IE < 9 doesn't like setting the content of script tags
					// using innerHTML...
					node.text = this.content;
				}
			}
			if (this.url) {
				var suffix = this.suffix
						? this.suffix
						: (this.loader.config.development
								? (this.suffix = ('?' + new Date().getTime()))
								: '');
				node.src = this.absolute + suffix;
			}
			node[Script.MARKER] = this;
			return node;
		},


		/**
		 * Destroy the DOM script node associated with this `Script`, if it
		 * exists.
		 */
		destroy: function() {
			var node = this.node;
			if (!node) return;
			if (node.parentNode) node.parentNode.removeChild(node);
			this.unbind(node);
			delete this.node;
		},


		/**
		 * Add required event handlers to the node associated with this script,
		 * to capture the script completion and failure events.
		 */
		bind: function() {
			var node	= this.node,
				script	= this,
				prefix	= '',
				method	= 'addEventListener';

			if (!node.addEventListener) {
				prefix = 'on';
				method = 'attachEvent';
			}

			function loaded(e) {
				if (script.onload) script.onload(script, script.requester.last);
				return Event.cancel(e);
			}

			function failed(e) {
				if (script.onfail) script.onfail(script, script.requester.last);
				return Event.cancel(e);
			}

			node[Script.MARKER_EVENT] = {
				load: loaded,
				fail: failed
			};

			node[method](prefix + 'error', failed, false);

			node[method](prefix + 'load', loaded, false);

			node[method](prefix + 'readystatechange',
					node[Script.MARKER_EVENT].state = function(e) {
				if (node.readyState == 'complete') {
					return loaded(e);
				}else if (node.readyState == 'error') {
					return failed(e);
				}
			}, false);
		},


		/**
		 * Remove the completion / failure event handlers associated with
		 * this `Script`'s DOM node.
		 */
		unbind: function() {
			var node = this.node;

			if (!node[Script.MARKER_EVENT]) return;
			var prefix = '', method = 'removeEventListener';
			if (!node.removeEventListener) {
				prefix = 'on';
				method = 'detachEvent';
			}

			node[method](prefix + 'fail',
					node[Script.MARKER_EVENT].fail, false);
			node[method](prefix + 'load',
					node[Script.MARKER_EVENT].load, false);
			node[method](prefix + 'readystatechange',
					node[Script.MARKER_EVENT].state, false);

			try{
				delete node[Script.MARKER_EVENT];
			}catch(e) {
				node[Script.MARKER_EVENT] = undefined;
			}
		},


		/**
		 * Return a string representation of this `Script`, either the `url`,
		 * or `{inline}`.
		 *
		 * @return {string}	A brief description of this `Script`.
		 */
		toString: function() {
			return this.url ? this.url : '{inline ' + this.id + '}';
		}


	};


	/* ------------------------( Script static API )------------------------- */


	// Marker item used to associate a `Script` instance with a DOM node.
	Script.MARKER		= 'stratumScriptInstance';
	Script.MARKER_EVENT	= 'stratumEvents';


	Script.id			= 1;
	Script.all			= {};


	/**
	 * Stop the currently executing Script from continuing.  This is used when
	 * a requirement identifies unsatisfied dependencies for the currently
	 * executing script, and needs to delay execution until those dependencies
	 * have been satisfied.
	 * 
	 * This is a dirty, dirty hack - though it appears to work on every browser.
	 * Unfortunately some browsers (IE) insist on displaying the error thrown,
	 * even though it is captured and handled.
	 *
	 * @param {function} before	A callback to be executed after the `Script`
	 *							cleanup has been completed, but before the
	 *							`Script` is actually halted - the prime place to
	 *							start loading the next dependency.
	 */
	Script.stop = function(before) {
		var script = Script.current();
		script.loaded = false;

		script.destroy();
		if (script.cached) {
			script.after(true);
		}

		if (before) {
			var value = before();
			if (value) return value;
		}

		function handler(e) {

			// Remove the event listener once we've been called.
			if (root.removeEventListener) {
				root.removeEventListener('error', handler, true);
			}else root.detachEvent('onerror', handler);

			return Event.cancel(e);
		}

		// Add an event listener to capture the 'uncaught' exception.
		if (root.addEventListener) {
			root.addEventListener('error', handler, true);
		}else root.attachEvent('onerror', handler);

		// Throw an exception (and hope it is not caught - NEVER wrap your
		// requires in try{} blocks, or this won't work.
		throw new Error('Require aborting script, pending dependencies');
	};


	/**
	 * Create a unique fingerprint for an array of `Script` instances.  This is
	 * used to remove duplicates when discovering cyclic dependencies.
	 *
	 * @param {Array}	array	The array of `Script` instances to fingerprint.
	 *
	 * @return {string}	A unique fingerprint for this array.
	 */
	Script.fingerprint = function(array) {
		var low = array[0].id, pos = 0;
		for(var index = 1, length = array.length; index < length; index++) {
			if (array[index].id < low) {
				low = array[index].id;
				pos = index;
			}
		}
		return array.slice(pos).concat(array.slice(0, pos)).join('¬');
	};


	/**
	 * Create a `Script` instance from a url.
	 *
	 * @param {string} url		The url of the `Script` to create.
	 * @param {Loader} loader	The `Loader` to use for this.
	 * @param {boolean} include	Mark this `Script` as an *include*, i.e. doesn't
	 *							need module state.
	 *
	 * @return {Script} A Script instance for this url.
	 */
	Script.url = function(url, loader, noexport) {
		var cache	= loader.cache,
			defined	= loader.defined,
			paths	= loader.paths;

		// Adjust process for relative urls.
		if (url[0] == '.') {
			var current = Script.current(loader);
			paths = [current.url ? current.absolute : URL.clean(location.href)];
		}

		var script = defined[url];
		if (script) return script;

		if (paths) {
			if (!paths.length) {
				return null;
			}

			// Check if we already have it cached first.
			for(var index = 0, length = paths.length; index < length; index++) {
				var absolute = URL.absolute(URL.clean(url), paths[index]);
				var script = cache[absolute];
				if (script) {
					return script;
				}
			}

		}

		// Otherwise create a cache entry, and attempt to load.
		var script = new Script(null, url, loader, paths);
		if (noexport) script.noexport = noexport;
		script.next();

		return script;
	};


	/**
	 * Create, or get a `Script` node from an existing DOM script node.
	 *
	 * @param {DOMNode} node	The existing DOM script node to use.
	 * @param {Loader} loader	The `Loader` to use for this.
	 *
	 * @return {Script} A Script instance for the DOM node.
	 */
	Script.node = function(node, loader) {
		if (node[Script.MARKER]) return node[Script.MARKER];
		var script = new Script(node, null, loader);
		script.noexport = true;
		return script;
	};


	/**
	 * Create a pseudo `Script` object, to invoke a callback once its
	 * depdencies have been satisfied.
	 *
	 * @param {function} callback	The callback function to invoke.
	 * @param {string} module		The module name for this function.
	 * @param {Loader} loader		The `Loader` to use for this.
	 */
	Script.callback = function(callback, module, loader) {
		var script = null;
		if (module) {
			script = loader.defined[module + '.js'];
		}

		if (!script) {
			script = new Script(null,
					module ? (module + '.js') : null, loader, ['']);
			script.absolute = script.url;
		}

		if (module === 'export') {
			script.noexport = true;
		}

		script.callback = callback;
		return script;
	};


	/**
	 * Get an instance for the currently executing Script.
	 *
	 * @param {Loader}	The `Loader` instance currently in use.
	 *
	 * @return {Script} A `Script` instance representing the currently running
	 *					script.
	 */
	Script.current = function(loader) {
		var scripts = document.getElementsByTagName('script');
		if (!scripts.length) return null;
		var current = Script.node(scripts[scripts.length - 1], loader);
		return current;
	};


	/**
	 * Find the last `Script` wrapped node in the page.  This is used to move
	 * that node, so that page loading does not break the *current* script
	 * detection.
	 *
	 * @return {Script} The last `Script` associated instance on the page.
	 */
	Script.last = function() {
		var scripts = document.getElementsByTagName('script');
		for(var index = scripts.length - 1; index >= 0; index--) {
			if (scripts[index][Script.MARKER]) {
				return scripts[index][Script.MARKER];
			}
		}
		return null;
	};



	// ---------------------------------------------------------------------
	// # URL utility functions
	// ---------------------------------------------------------------------


	/**
	 * Convenience URL manipulation functionality.
	 */
	var URL = {


		/**
		 * Strip any page parameters from the end of the url specified.  In
		 * development mode a time based page parameter is appended to override
		 * some (I'm looking at you Chrome) browsers refusal to reload script
		 * content from dynamically added DOM script nodes.
		 *
		 * @param {string} url	The url to strip.
		 *
		 * @return {string} The stripped url.
		 */
		clean: function(url) {
			if (!url) return undefined;
			var index = url.indexOf('?');
			if (index != -1) return url.substring(0, index);
			return url;
		},
	
	
		/**
		 * Calculate the absolute url from the relative one passed.
		 *
		 * @param {string} url	The relative url to process.
		 * @param {string} base	The absolute url (either of the currently
		 *						executing `Script` or the page) to work from.
		 *
		 * @return {string}	An absolute url to the resource.
		 */
		absolute: function(url, base) {
			var protocol = url.indexOf('://');
			if (protocol != -1) return url;

			base = base.split('/');
			base.length--;
			var parts = url.split('/');
			for(var index = 0, length = parts.length; index < length; index++) {
				switch(parts[index]) {
					case '..':
						if (!base.length) throw new Error(
							'Invalid relative url, cannot discover parent of "'
							+ base.join('/') + '" for url ' + url);
						base.length--;
						// Deliberate fallthrough
					case '.': break;
					default:
						base.push(parts[index]);
				}
			}
	
			return base.join('/');
		},


		/**
		 * Move up to the parent directory of the url specified.
		 *
		 * @param {string} url	The url to move up for.
		 *
		 * @return {string} The url of the parent path.
		 */
		parent: function(url) {
			var index = url.lastIndexOf('/');
			if (index == -1) return false;
			if (index == url.length - 1) {
				return url.substring(0, index);
			}
	
			index = url.lastIndexOf('/', index - 1);
			if (index == -1) return false;
			return url.substring(0, index);
		}
	
	};


	// ---------------------------------------------------------------------
	// # Event utility functions
	// ---------------------------------------------------------------------


	/**
	 * Namespace for Event handling utility functions.
	 */
	Event = {

		/**
		 * Try everything we can to cancel the `Event` specified.
		 *
		 * @param {DOMEvent} event	The `Event` object to cancel.
		 */
		cancel: function(event) {
			if (!event) event = window.event;

			// Try everything in our power to stop those bloody error messages!
			event.returnValue = true;
			event.cancelBubble = true;
			if (event.preventDefault) event.preventDefault();
			if (event.stop) event.stop();
			if (event.stopPropagation) event.stopPropagation();

			return false;
		}

	};


	// ---------------------------------------------------------------------
	// # Configuration helper
	// ---------------------------------------------------------------------


	/**
	 * Search for an embedded configuration, and call the function with it,
	 * if found.  The single parameter to the callback will be the config
	 * object found, with a single additional methods on it: `combine()`.
	 *
	 * See `config.combine()` for a description of usage.
	 *
	 * @param {string} name		The name of the configuration to find.
	 * @param {function} func	A callback function, to be invoked with the
	 *							config, if found.
	 */
	function configure(name, func) {
		var scripts	= document.getElementsByTagName('script');

		name = 'config/' + name;

		for(var index = 0, length = scripts.length; index < length; index++) {
			if (scripts[index].type == name) {
				// Call with actual config, if found.
				var content = scripts[index].text;
				content = content.replace(
						/([^\s",\{\}]+)\w*:/g, '"\$1":').replace(/'/g, '"').replace(/\/\/.*?^/g, '');

				var result = JSON.parse(content);
				result.combine = configure.combine;
				func(result);
				return;
			}
		}

		// Call with empty config if none found.
		var result = {
			combine: configure.combine
		};
		func(result);
	};

	/**
	 * Combine this config result with an object, to override all supplied
	 * config.  A second optional parameter can be used to supply an array
	 * of exceptions, properties that may be supplied, but should not be
	 * written into the destination object (such as config parameters that
	 * will be programatically parsed later).
	 *
	 * @param {Object} destination	The destination object to write to.
	 * @param {Array} except		Optional array of exceptions.
	 */
	configure.combine = function(destination, except) {
		var lookup = {}, length = except ? except.length : 0;
		for(var index = 0; index < length; index++) {
			lookup[except[index]] = true;
		}
		for(var name in this) {
			if (name == 'combine') continue;
			if (!this.hasOwnProperty(name)) continue;
			if (lookup[name]) continue;
			destination[name] = this[name];
		}
	};


	// ---------------------------------------------------------------------
	// # Initialisation
	// ---------------------------------------------------------------------


	// Create the base `Loader` instance.
	var loader = Loader.base = new Loader();

	// Configure the base `Loader` from any configuration script found.
	configure('stratum/require', function(config) {
		config.combine(loader.config, ['paths']);

		if (config.paths) {
			var paths = [],
				cpaths = config.paths,
				length = cpaths.length,
				base = URL.clean(location.href);

			for(var index = 0; index < length; index++) {
				paths.push(URL.absolute(URL.clean(cpaths[index]), base));
			}
			loader.paths = paths;
		}else{
			// Initialise the paths with the current page url, and stratum's
			// parent url as the module search path.
			loader.paths.push(
				URL.parent(URL.clean(Script.current(loader).url)) + '/',
				URL.clean(location.href)
			);
		}

		// Load the debugging traces, if required.
		if (configure.debug) {
			loader.load(Script.url('./require-debug.js', loader, true),
					null, true);
		}
	});


	/**
	 * 
	 * @param module
	 * @param callback
	 * @param name
	 * @returns
	 */
	root.require = function(module, callback, name) {
		var local = root.stratum.Application
				? root.stratum.Application.component('loader') : loader;
		if (callback) local.define(callback, name, module);
		else return local.require(module + '.js');
	};

	root.define = function(name, dependencies, callback) {
		var local = root.stratum.Application
				? root.stratum.Application.component('loader') : loader;
		if (!callback) {
			local.define(name, null, dependencies);
		}else{
			local.define(name, dependencies, callback);
		}
	};
		
	root.include = function(url) {
		var local = root.stratum.Application
				? root.stratum.Application.component('loader') : loader;
		local.require(url, true);
	};


	root.define('require', function() { exports = root.require; });
	root.define('define', function() { exports = root.define; });
	root.define('exports', function() {});


	/**
	 * Multi-browser onload handler.
	 */
	function onload(callback) {
		var called = false;
		// Wrap the callback to ensure one call at most.
		function call() {
        	if (called) return;
        	called = true;
        	callback();
		}
	    /* Internet Explorer */
	    /*@cc_on
	    @if (@_win32 || @_win64)
	        document.write('<script id="ieScriptLoad" defer src="//:"><\/script>');
	        document.getElementById('ieScriptLoad').onreadystatechange = function() {
	            if (this.readyState == 'complete') {
	                call();
	            }
	        };
	    @end @*/
	    /* Mozilla, Chrome, Opera */
	    if (document.addEventListener) {
	        document.addEventListener('DOMContentLoaded', call, false);
	    }
	    /* Safari, iCab, Konqueror */
	    if (/KHTML|WebKit|iCab/i.test(navigator.userAgent)) {
	        var loadTimer = null;
	        loadTimer = setInterval(function () {
	            if (/loaded|complete/i.test(document.readyState)) {
	            	call();
	                clearInterval(loadTimer);
	            }
	        }, 10);
	    }
	    /* Other web browsers */
	    window.onload = call;
	};

	onload(function ready() {
		Loader.ready();
	});


	// Seed the require.paths variable with the loaders paths.
	require.paths		= loader.paths;


	// Add some stratum specific details to the require function, for
	// extending, debugging, etc.
	require.stratum = {

		VERSION:	1,

		// export internal `Loader` and configuration
		loader:		loader

	};


	// Export core stratum classes and functions.
	root.stratum = {
		Loader:			Loader,
		Script:			Script,
		URL:			URL,
		Event:			Event,
		configure:		configure,
	};

})();