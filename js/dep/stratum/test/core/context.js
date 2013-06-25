(function() {


	var module = require('stratum/module'),
		printStackTrace = require('stratum/dep/stacktrace'),
		EventHandler = require('stratum/event');


	module('stratum.test').dependencies('stratum.extend', 'stratum.event');
	module('stratum');


	/**
	 * Context provides the common functionality between tests and groups, a
	 * test environment context, including success/failure indication, event
	 * propagation, storage for interceptors, output and failure reasons.
	 */
	var Context = EventHandler.extend(function Context() {
		EventHandler.apply(this);
		this.parent = Context.current;
		var context = this;

		this.intercepts		= [];
		this.output			= [];
		this.failures		= [];
		this.success		= undefined;

		this.bind('assert.fail', function() {
			context.success = false;
		});


	}, {


		/**
		 * Enter this `Context`, making it current, and storing the previous
		 * `Context` on the stack.
		 */
		enter: function() {
			Context.stack.push(Context.current);
			Context.current = this;
			this.failures.length = 0;
			this.output.length = 0;
			this.success = undefined;
		},


		/**
		 * Leave this `Context`, popping the previous from the stack and
		 * making that `Context` current.
		 */
		leave: function() {
			Context.current = Context.stack.pop();
			if (this.build) {
				this.build = false;
				return;
			}

			// Clear all intercepts that still exist, so that we're dealing only
			// with events occurring in this context.
			var parent = this.parent;
			while(parent) {
				var intercepts = parent.intercepts, len = intercepts.length;
				for(var index = 0; index < len; index++) {
					intercepts[index].reset();
				}
				parent = parent.parent;
			}

			this.success = this.success == undefined ? true : false;
		},


		/**
		 * Check for any uncaught exceptions that occurred while this `Context`
		 * was current, and raise assertion failures for them.
		 */
		checkExceptions: function() {
			var intercepts = this.intercepts, length = intercepts.length;
			for(var index = 0; index < length; index++) {
				var intercept = intercepts[index];
				if (intercept.exceptions.length) {
					var exceptions = intercept.exceptions,
						elength = exceptions.length;
					for(var index = 0; index < elength; index++) {
						var exception = exceptions[index],
							reason = ['Unhandled exception: ', exception];
						this.assertFail(reason, exception);
					}
					this.success = false;
				}
				intercept.dispose();
			}
			this.intercepts.length = 0;
		},


		/**
		 * Obtain a stack trace, if possible, for the current execution state,
		 * removing all initial test rig methods, so that the result only
		 * references the code being tested, and what occurred.
		 */
		trace: function(exception) {
			if (root.printStackTrace) {
				var lines = printStackTrace({e: exception || new Error()});
				for(var index = 1, len = lines.length; index < len; index++) {
					if (lines[index].match(/(Context|Assert|Expect|EventHandler)/)) {
						continue;
					}
					return lines.slice(index).join('\n');
				}
			}
			return false;
		},


		/**
		 * Make an assertion about some condition.
		 *
		 * @param assert	A function which returns whether the assertion
		 * 					succeeds.
		 * @param onfail	A function which returns an array describing why
		 * 					the assertion failed.
		 */
		assert: function(assert, onfail) {
			if (!assert(this)) {
				var reason = onfail(this);
				this.assertFail(reason);
				return false;
			}
			this.fireMulti('assert.success');
			return true;
		},


		/**
		 * Fire an event about an assertion failure.
		 *
		 * @param reason	An array describing the assertion failure.
		 * @param exception	An exception to provide a stack trace from, if
		 * 					possible.
		 */
		assertFail: function(reason, exception) {
			this.failures.push(reason);
			this.fireMulti('assert.fail', reason, this.trace(exception));
			this.success = false;
		}


	});

	// The stack of current contexts.
	Context.stack = [];


	// Export the Context class.
	exports = Context;


})();