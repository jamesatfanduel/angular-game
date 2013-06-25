(function() {


	var root = this;


	/* -------------------------------------------------------------------------
	 *								MODULE
	 * -------------------------------------------------------------------------
	 *
	 * The module api is **NOT** intended for production use.  Its primary
	 * purpose is to allow the collective efforts of a number of files to be
	 * replicated, allowing instanciation of a 'module' in a separate
	 * namespace - independent of the original version.
	 *
	 * Within `Stratum` itself, this is used to test functionality in isolation,
	 * without the possibility of the testing process interfering with the
	 * results; so that, for instance, changing the application wide logging
	 * mechanism, and logging output of a unit test will not cause additional
	 * invocations of logging methods that may be the subject of the test.
	 *
	 * Usage is simple, each file should declare which module it belongs to.
	 * 
	 * The call should occur within an anti-collision wrapper:
	 *
	 * ``` js
	 *		(function() {
	 *			module('somemodule');
	 *			... module code ...
	 *		}();
	 * ```
	 *
	 * The module code will deduce the wrapper function, and store it, in order
	 * to replay when a new instance of the module is requested.
	 *
	 * A wrapper can declare itself to be part of more than one module, by
	 * listing all of the modules one after another as parameters to the call:
	 *
	 * ``` js
	 *		module('module1', 'module2');
	 * ```
	 *
	 * It may also declare a dependency on another module, by chaining a call
	 * to `dependencies()`, like so:
	 *
	 * ``` js
	 *		module('somemodule').dependencies('othermodule');
	 * ```
	 *
	 * And the required module will also be instantiated on the same
	 * /root namespace/ object prior to the modules.
	 *
	 * Creating an instance of a module, once declared, is also trivial:
	 *
	 * ``` js
	 *		var namespace = module.instance('somemodule');
	 * ```
	 *
	 * will create a new empty namespace, and replay the module's declaration
	 * functions, providing it as the `this` item.
	 *
	 * An optional second parameter to the `instance()` method supplies a root
	 * namespace, for manually combining modules within one instance, like so:
	 *
	 * ``` js
	 *		module.instance('somemodule', existingRootObject);
	 * ```
	 */


	/**
	 * Modularisation mechanism, to allow static API features to be cloned
	 * into alternative name spaces.
	 * 
	 * @param name	The name of this `Module`.
	 */
	function Module(name) {
		this.name			= name;
		this.queue			= [];
		this.dependencies	= [];
		this.valid			= true;
	}

	Module.prototype = {

		/**
		 * Add a new function to the queue of functions to invoke when
		 * instantiating this `Module`.
		 *
		 * @param func A function to add to the queue.
		 */
		add: function(func) {
			this.queue.push(func);
		},

		/**
		 * Create a new instance of this Module, optionally populating the root
		 * object specified.
		 *
		 * @param root An optional root object to instantiate into.
		 */
		instance: function(root, done) {
			var queue = this.queue, deps = this.dependencies;
			root = root || {};
			done = done || {};
			for(var index = 0, len = deps.length; index < len; index++) {
				if (done[deps[index].name]) continue;
				done[deps[index].name] = true;
				deps[index].instance(root, done);
			}
			for(var index = 0, len = queue.length; index < len; index++) {
				queue[index].apply(root);
			}
			return root;
		}

	};


	// Associative array of current modules.
	Module.modules = {};


	/**
	 * Get or create a `Module` object for the given name.
	 *
	 * @param name	The name of the `Module` to get, or create.
	 * @return A `Module` instance.
	 */
	Module.get = function(name) {
		if (!Module.modules[name]) Module.modules[name] = new Module(name);
		return Module.modules[name];
	};


	/**
	 * Add the currently scope function to the list of initialisation functions
	 * for the named `Module`s.
	 */
	function module() {
		var modules = [];
		for(var index = 0, len = arguments.length; index < len; index++) {
			var module = Module.get(arguments[index]);
			if (!arguments.callee) {
				module.valid = false;
			}else{
				// Prevent invocation from within a module create.
				if (arguments.callee.caller.caller === module.instance) {
					return {dependencies: function() {}};
				}

				module.add(arguments.callee.caller);
			}
			modules.push(module);
		}

		// Add dependencies to these modules (only need declared once per
		// module).
		function dependencies() {
			var args = arguments;
			for(var mindex = 0, mlen = modules.length;
					mindex < mlen; mindex++) {
				var deps = modules[mindex].dependencies;
				for(var index = 0, len = args.length; index < len; index++) {
					var dep = args[index];
					if (!deps[dep]) {
						deps[dep] = true;
						deps.push(Module.get(dep));
					}
				}
			}
		}

		return {
			dependencies: dependencies
		};

	};

	/**
	 * Create a `Module` instance, for the named module, optionally within the
	 * root object specified.
	 *
	 * @param name	The name of the module to instantiate.
	 * @param root	An optional root object to instantiate into.
	 *
	 * @return	A root object, containing the newly instantiated `Module`.
	 */
	module.instance = function(name, root) {
		var module = Module.get(name);
		if (!module.valid) throw new Error("Module " + name + " could not be "
				+ " instanciated - arguments.callee is not supported");
		return module.instance(root);
	};


	// Export the actual class as well.
	module.Module = Module;


	// Export the `module` function.
	exports = module;


	// Make the `Module` class extensible
	Module.extend = require('stratum/extend');


})();