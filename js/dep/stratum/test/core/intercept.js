(function() {


	var module = require('stratum/module'),
		Context = require('stratum/test/core/context');


	module('stratum.test').dependencies('stratum.extend', 'stratum.event');
	module('stratum');


	/**
	 * Create an interceptor to modify the behaviour, and/or record usage
	 * statistics for a given function/method.  If an instance and method name
	 * are supplied, creating an Intercept will automatically replace the
	 * existing function with the intercepted version, and clean up when the
	 * leaving the current context.
	 *
	 * If just a method is provided (as a direct reference to the function),
	 * then the Intercept will create the replacement, but cannot directly
	 * replace it - so the application programmer must do it manually.
	 *
	 * This constructor should not be used directly - instead use the
	 * `Intercept.create` factory method.
	 *
	 * @param instance	The (optional) instance on which to intercept a method.
	 * @param method	The method name (if an instance is supplied), or actual
	 * 					function to intercept.
	 */
	function Intercept(instance, method) {
		this.instance		= instance;
		this.method			= method;
		this.callThrough	= true;
		this.callWith		= false;
		this.original		= instance ? instance[method] : method;
		var intercept		= this;

		this.reset();

		Context.current.intercepts.push(this);

		// Actual replacement function/method - that stores statistics and
		// details about usage, and can be stubbed, or tooled to modify the
		// parameters or return value of the chained call.
		function replacement() {
			var result = undefined;
			if (intercept.callThrough && intercept.original) {
				var args = intercept.callWith ? intercept.callWith : arguments;
				try{
					result = intercept.original.apply(instance, args);
				}catch(exception) {
					intercept.exceptions.push(exception);
				}
			}
			intercept.count++;
			intercept.args.push(arguments);
			intercept.returns.push(result);
			if (intercept.hasReturnValue) result = intercept.returnValue;
			return result;
		}

		replacement.stratumInterceptor
			= this.original.stratumInterceptor = this;

		if (instance) instance[method] = replacement;
		this.replacement = replacement;
	};


	Intercept.prototype = {

		/**
		 * Force the intercepted method to return the value specified.
		 *
		 * @param value The value to return.
		 *
		 * @returns Intercept, this instance, for chaining.
		 */
		andReturn: function(value) {
			this.returnValue = value;
			this.hasReturnValue = true;
			return this;
		},


		/**
		 * Prevent execution of the intercepted method.
		 *
		 * @returns Intercept, this instance, for chaining.
		 */
		andStub: function() {
			this.callThrough = false;
			return this;
		},


		/**
		 * Ensure execution of the intercepted method calls through to the
		 * original method.
		 *
		 * @param passthrough	Whether to pass parameters and results from the
		 * 						call (resetting any 'andReturn' or 'andCallWith'
		 * 						settings previously associated).
		 *
		 * @returns Intercept, this instance, for chaining.
		 */
		andCallThrough: function(passthrough) {
			this.callThrough = true;
			if (passthrough) {
				this.hasReturnValue = false;
				this.callWith = undefined;
			}
			return this;
		},


		/**
		 * Modify the arguments passed to the intercepted method when invoked.
		 * The parameters passed to this method will replace any invocations of
		 * the intercepted function/method whenever it is invoked and this
		 * interceptor is active.
		 *
		 * @returns Intercept, this instance, for chaining.
		 */
		andCallWith: function() {
			this.callWith = arguments;
			return this;
		},


		/**
		 * Dispose of this Intercept, used to automatically tidy up after
		 * an interceptor is out of scope.
		 *
		 * @returns Intercept, this instance, for chaining.
		 */
		dispose: function() {
			var instance = this.instance, original = this.original,
				method = this.method;
			if (instance) {
				instance[method] = original;
			}
			delete this.replacement.stratumInterceptor;
			return this;
		},


		/**
		 * Clear the exception list held by this Intercept.
		 *
		 * @returns Intercept, this instance, for chaining.
		 */
		clearExceptions: function() {
			this.exceptions.length = 0;
			return this;
		},


		/**
		 * Get the replacement function created by this Intercept.
		 *
		 * @returns The replacement function.
		 */
		getFunction: function() {
			return this.replacement;
		},


		/**
		 * Reset this Intercept, clearing all stored information about
		 * method/function usage back to its initial state.
		 *
		 * @returns Intercept, this instance, for chaining.
		 */
		reset: function() {
			this.count		= 0;
			this.args		= [];
			this.returns	= [];
			this.exceptions	= [];
			return this;
		}


	};


	/**
	 * Create a new Intercept, or find an existing one for a given
	 * method/instance combination.  There are three ways to use this method:
	 * 
	 * With instance, and method name:
	 *
	 * ``` js
	 *		var intercept = Intercept.create(someObject, 'methodname');
	 * ```
	 *
	 * which automatically replaces the method on the given instance with its
	 * intercepted alternative, or:
	 *
	 * ``` js
	 *		var intercept = Intercept.create(someFunction);
	 *		var intercept = Intercept.create();
	 * ```
	 *
	 * Which either wrap an existing function, or create an empty stub function
	 * respectively.  Since there is no instance supplied, neither of these
	 * methods can automatically replace a function, they must instead be used
	 * with:
	 *
	 * ``` js
	 *		someFunction = intercept.getFunction();
	 * ```
	 *
	 * to fetch the replacement.
	 * 
	 * @returns Intercept
	 */
	Intercept.create = function(instance, method) {
		if (method) {
			if (instance[method].stratumInterceptor) {
				return instance[method].stratumInterceptor;
			}else{
				return new Intercept(instance, method);
			}
		}else if (instance) {
			if (instance.stratumInterceptor) return instance.stratumInterceptor;
			return new Intercept(null, instance);
		}else{
			return new Intercept(null, function stub() {});
		}
	};


	/**
	 * Return the Intercept associated with the given function, or null if none
	 * exists.
	 *
	 * @param func	The function to fetch for.
	 * @returns		Intercept or null.
	 */
	Intercept.fetch = function(func) {
		if (!func) return null;
		return func.stratumInterceptor;
	};


	/**
	 * Perform a check on each of the intercepted functions specified.  If
	 * the function returns false at any point, then processing stops and the
	 * check function returns false.
	 *
	 * If any of the parameters are not intercepted functions, an exception will
	 * be thrown.
	 *
	 * @param funcs	The functions to run the tests on.
	 * @param check	A function to run on each Intercept found in turn.
	 *
	 * @returns Boolean, true if all where successful.
	 */
	Intercept.check = function(funcs, check) {
		for(var index = 0, length = funcs.length; index < length; index++) {
			var intercept = Intercept.fetch(funcs[index]);
			if (!intercept) {
				throw new Error('Function or method must either be '
						+ 'created by intercept([func]), or have '
						+ 'intercept(object, methodName) called on test '
						+ 'prior to usage');
			}
			if (!check(intercept)) return false;
		}
		return true;
	};


	/**
	 * Reset all intercepts in the current, and parent contexts.  This mechanism
	 * is a shortcut, to quickly nullify the effects of previous
	 * assertions/expectations, when testing.
	 */
	Intercept.reset = function() {
		var context = Context.current;
		while(context) {
			var intercepts = context.intercepts, length = intercepts.length;
			for(var index = 0; index < length; index++) {
				intercepts[index].reset();
			}
			context = context.parent;
		}
	};


	// Export the Intercept class.
	exports = Intercept;


})();