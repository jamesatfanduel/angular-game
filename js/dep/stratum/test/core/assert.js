(function() {


	var extend = require('stratum/extend'),
		module = require('stratum/module'),
		Intercept = require('stratum/test/core/intercept'),
		Context = require('stratum/test/core/context'),
		compare = require('stratum/test/core/compare'),
		Any = compare.Any;


	module('stratum.test').dependencies('stratum.extend', 'stratum.event');
	module('stratum');


	/**
	 * Get a display variant of the argument specified.  This method converts
	 * Any instances to the equivalent description, intercepted functions to
	 * their original function, and strings to inverted comma delimited strings
	 * suitable for display.
	 *
	 * @param	arg	The argument to convert.
	 * @return	The display variant of the argument passed.
	 */
	function getDisplayArg(arg) {
		if (typeof arg == 'string') return '"' + arg + '"';
		var intercept = Intercept.fetch(arg);
		if (intercept) return intercept.original;
		return Any.display(arg);
	}


	/**
	 * Convert an array of arguments to an array of the display variants.  If
	 * the array only contains a single argument, the display variant of that
	 * argument is returned directly, rather than as a 1-length array.
	 *
	 * @param args	An array of arguments.
	 * @return	Either an array of display arguments, or a single display arg.
	 */
	function getDisplayArgs(args) {
		if (args.length == 1) {
			return getDisplayArg(args[0]);
		}
		var array = [];
		for(var index = 0, len = args.length; index < len; index++) {
			array.push(getDisplayArg(args[index]));
		}
		return array;
	}


	/**
	 * Helper function to get the number of times an intercepted function, or
	 * array of functions were called - used to ensure feedback from assertion
	 * failures regarding call counts are informative.
	 *
	 * @param args	An array of functions to check against.
	 *
	 * @return An array of output components describing the actual call counts.
	 */
	function getCallCounts(args) {
		var counts = [];
		Intercept.check(args, function(intercept) {
			counts.push(intercept.count);
			return true;
		});
		return [' (' + (args.length > 1 ? 'were' : 'was') + ' called '
		        + (counts.length == 1 ? counts[0] : counts.join(',')) + ' time'
				+ ((counts.length == 1 && counts[0] == 1) ? ')' : 's)')];
	}


	/**
	 * Encapsulation of assertions.  The 'assert' function within the
	 * TDD interface creates and returns an instance of this class, which
	 * provides the actual assertion API, relative to the array of arguments.
	 *
	 * @param args	The arguments this assertion will test.
	 */
	var Assert = extend(function Assert(args) {
		this.args = args;
		Assert.current = this;
	}, {


		/**
		 * Base mechanism for asserting on an intercepted or stubbed function.
		 * Any additional parameters after the actual check callback, and
		 * override response are treated as additional message arrays in the
		 * case of failure, or functions to call with the assertion arguments
		 * that return additional message arrays (in case context sensitive
		 * messages are required).
		 *
		 * @param check	A callback to perform on each intercept instance.
		 * @param override	An array of response information to return on fail.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		wasCalledBase: function(check, override) {
			var args = this.args, length = args.length, params = arguments;
			Context.current.assert(
			function assert(context) {
				return Intercept.check(args,
					function(intercept) { return check(intercept); });
			}, function onfail(context) {
				var message = ['Expected function' + (length == 1 ? ' ' : 's '),
				        getDisplayArgs(args)].concat(override);

				// Process any additions, or additional functions.
				for(var index = 2; index < params.length; index++) {
					message = message.concat(
						typeof params[index] == 'function'
							? params[index](args) : params[index]);
				}
				return message;
			});
			return this;
		},


		/**
		 * Assert that an interceptor was called exactly 'times' times.
		 *
		 * @param times	The number of times to check for.
		 * @param override	Explanation override, for currying.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		wasCalledTimes: function(times, override) {
			return this.wasCalledBase(function(intercept) {
				return intercept.count === times; },
				override || [' to have been called ', times, ' times'],
				getCallCounts);
		},


		/**
		 * Assert that an interceptor was called more than 'times' times.
		 *
		 * @param times	The number of times to check for.
		 * @param override	Explanation override, for currying.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		wasCalledMoreThan: function(times, override) {
			return this.wasCalledBase(function(intercept) {
				return intercept.count > times; }, override
					|| [' to have been called more than ', times, ' times'],
					getCallCounts);
		},


		/**
		 * Assert that an interceptor was called less than 'times' times.
		 *
		 * @param times	The number of times to check for.
		 * @param override	Explanation override, for currying.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		wasCalledLessThan: function(times, override) {
			return this.wasCalledBase(function(intercept) {
				return intercept.count < times; }, override
					|| [' to have been called less than ', times, ' times'],
					getCallCounts);
		},


		/**
		 * Assert that an interceptor was called at all.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		wasCalled: function() {
			return this.wasCalledMoreThan(0, [' to have been called']);
		},


		/**
		 * Assert that an interceptor was called once, and only once.
		 *
		 * @returns Assert - a reference to this for chaining.
		 */
		wasCalledOnce: function() {
			return this.wasCalledTimes(1, [' to have been called once']);
		},


		/**
		 * Assert that an interceptor was called exactly twice.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		wasCalledTwice: function() {
			return this.wasCalledTimes(2, [' to have been called twice']);
		},


		/**
		 * Assert that an interceptor was not called.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		wasNotCalled: function() {
			return this.wasCalledTimes(0, [' to have not been called']);
		},


		/**
		 * Assert that an interceptor was called with a specified argument
		 * list.  At least one invocation of the intercepted function must have
		 * been called with a matching argument list for success.  Loose type
		 * checking is allowed, so objects and arrays will be deep compared, and
		 * any types can be used.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		wasCalledWith: function() {
			var args = Array.prototype.slice.apply(arguments);
			return this.wasCalledBase(function(intercept) {
				var argList = intercept.args;
				for(var index = 0, len = argList.length; index < len; index++) {
					if (compare(argList[index], args)) return true;
				}
				return false;
			}, [' to have been called with ', getDisplayArgs(args)]);
			return this;
		},


		/**
		 * Assert that some invocation of an intercepted function returned the
		 * value specified, at some point during this test.
		 *
		 * @param value	The expected return value.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		returned: function(value) {
			var args = Array.prototype.slice.apply(arguments);
			return this.wasCalledBase(function(intercept) {
				var returns = intercept.returns;
				for(var index = 0, len = returns.length; index < len; index++) {
					if (compare(returns[index], value)) return true;
				}
				return false;
			}, [' to have returned ', getDisplayArgs(args)]);
			return this;
		},


		/**
		 * Assert that an intercepted function threw an exception.  The message
		 * parameter is optional - if specified, it may contain a string, or a
		 * regex.  If a string is contained, exception messages containing that
		 * string validate the assertion, if a regex, exception messages
		 * matching that regex validate the assertion.  If any exceptions are
		 * thrown that are not expected, the test will fail.
		 *
		 * @param message An optional string, or regex describing the message.
		 * @param override	Explanation override, for currying.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		threw: function(message, override) {
			var args = this.args, length = args.length;

			function matchAndRemove(exceptions) {
				var length = exceptions.length;
				if (!message && length) {
					exceptions.length = 0;
					return true;
				}
				var match = message instanceof RegExp
					? function(msg) { return msg.match(message); }
					: function(msg) { return msg.indexOf(message) !== -1; };

				var matched = false;
				for(var index = 0; index < length; index++) {
					var msg = exceptions[index].message
							? exceptions[index].message : exceptions[index];
					if (match(msg)) {
						exceptions.splice(index, 1);
						index--;
						length--;
						matched = true;
					}
				}
				return matched;
			}

			Context.current.assert(
			function assert(context) {
				return Intercept.check(args, function(intercept) {
					return matchAndRemove(intercept.exceptions);
				});
			}, function onfail(context) {
				return ['Expected function' + (length == 1 ? ' ' : 's '),
						getDisplayArgs(args)].concat(
							override || [' to throw an exception'
							+ (message
								? ' with message "' + message + '"' : '')]);
			});
			return this;
		},


		/**
		 * Assert that the intercept(s) specified did not throw exceptions.
		 *
		 * @param override	Explanation override, for currying.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		didNotThrow: function(override) {
			var args = this.args, exceptions = null, length = args.length;
			Context.current.assert(
			function assert(context) {
				return Intercept.check(args,
					function(intercept) {
						exceptions = intercept.exceptions.slice(0);
						intercept.clearExceptions();
						return intercept.exceptions.count === 0;
					}
				);
			}, function onfail(context) {
				return ['Expected function' + (length == 1 ? ' ' : 's '),
						getDisplayArgs(args)].concat(override ||
							[' to not throw an exception (but it threw: ',
							 exceptions, ')']);
			});
			return this;
		},


		/**
		 * Assert that the arguments contained are equal to the value given.
		 * This method uses the loose comparison mechanism, so objects and
		 * arrays are deep compared, native values are compared exactly, and
		 * any types can be used for loose type checking.
		 *
		 * @param value		The value to compare against.
		 * @param override	Explanation override, for currying.
		 * @param invert	True if this is actually a notEquals.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		equals: function(value, override, invert) {
			var args = this.args, length = args.length;
			Context.current.assert(
			function assert(context) {
				for(var index = 0; index < length; index++) {
					if (!compare(args[index], value)) {
						if (Any.is(args[index], value)) {
							override = [' to equal ', Any.display(value)];
						}
						return invert;
					}
				}
				return true;
			}, function onfail(context) {
				var result = ['Expected value' + (length == 1 ? ' ' : 's '),
						getDisplayArgs(args)];
				result = result.concat(override || [' to '
						+ (invert ? 'not ' : '') + 'exactly equal ', value]);
				return result;
			});
			return this;
		},


		/**
		 * Assert that the arguments contained are less than the value given.
		 *
		 * @param value		The value the arguments must be less than.
		 * @param override	Explanation override, for currying.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		isLessThan: function(value, override) {
			var args = this.args, length = args.length;
			Context.current.assert(
			function assert(context) {
				for(var index = 0; index < length; index++) {
					if (args[index] >= value) return false;
				}
				return true;
			}, function onfail(context) {
				var result = ['Expected value' + (length == 1 ? ' ' : 's '),
						getDisplayArgs(args)];
				result = result.concat(override || [' to '
						+ 'be less than ', value]);
				return result;

			});
			return this;
		},


		/**
		 * Assert that the arguments contained are more than the value given.
		 *
		 * @param value		The value the arguments must be more than.
		 * @param override	Explanation override, for currying.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		isMoreThan: function(value, override) {
			var args = this.args, length = args.length;
			Context.current.assert(
			function assert(context) {
				for(var index = 0; index < length; index++) {
					if (args[index] <= value) return false;
				}
				return true;
			}, function onfail(context) {
				var result = ['Expected value' + (length == 1 ? ' ' : 's '),
						getDisplayArgs(args)];
				result = result.concat(override || [' to '
						+ 'be more than ', value]);
				return result;

			});
			return this;
		},


		/**
		 * Assert that the arguments contained are NOT equal to the value given.
		 * This method uses the loose comparison mechanism, so objects and
		 * arrays are deep compared, native values are compared exactly, and
		 * any types can be used for loose type checking.
		 *
		 * @param value	The value to compare against.
		 * @param override	Explanation override, for currying.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		doesNotEqual: function(value, override) {
			return this.equals(value, override, true);
		},


		/**
		 * Assert that the arguments contained are in fact the boolean value,
		 * true.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		isTrue: function() {
			return this.equals(true, ' to be true');
		},


		/**
		 * Assert that the arguments contained are in fact the boolean value,
		 * false.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		isFalse: function() {
			return this.equals(false, ' to be false');
		},


		/**
		 * Assert that the arguments contained are not null.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		isNotNull: function() {
			return this.equals(null, [' to not be null'], true);
		},


		/**
		 * Assert that the arguments contained are defined.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		isDefined: function() {
			return this.equals(undefined, [' to be defined'], true);
		},


		/**
		 * Assert that the arguments contained are in fact null.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		isNull: function() {
			return this.equals(null, [' to be null']);
		},


		/**
		 * Assert that the arguments contained are undefined.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		isUndefined: function() {
			return this.equals(undefined, [' to be undefined']);
		},


		/**
		 * Assert that the arguments contained are instances of the class
		 * specified.
		 *
		 * @param clazz	The class constructor to check against.
		 * @param override	Explanation override, for currying.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		isAnInstanceOf: function(clazz, override) {
			var args = this.args, len = args.length;
			Context.current.assert(
				function assert(context) {
					for(var index = 0; index < len; index++) {
						if (!(args[index] instanceof clazz)) return false;
					}
					return true;
				}, function onfail(context) {
					var result = ['Expected value' + (length == 1 ? ' ' : 's '),
							getDisplayArgs(args)];
					result = result.concat(override
							|| [' to be an instance of ', clazz]);
					return result;
				});
			return this;
		},


		/**
		 * Assert that the arguments contained are NOT instances of the class
		 * specified.
		 *
		 * @param clazz	The class constructor to check against.
		 * @param override	Explanation override, for currying.
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		isNotAnInstanceOf: function(clazz, override) {
			var args = this.args, len = args.length;
			Context.current.assert(
				function assert(context) {
					for(var index = 0; index < len; index++) {
						if (args[index] instanceof clazz) return false;
					}
					return true;
				}, function onfail(context) {
					var result = ['Expected value' + (length == 1 ? ' ' : 's '),
							getDisplayArgs(args)];
					result = result.concat(override
							|| [' to not be an instance of ', clazz]);
					return result;
				});
			return this;
		},


		/**
		 * Assert that the arguments contained exist (i.e. are not undefined,
		 * or null).
		 *
		 * @return Assert - a reference to this for chaining.
		 */
		exists: function() {
			var args = this.args, length = args.length;
			Context.current.assert(
			function assert(context) {
				for(var index = 0; index < length; index++) {
					if (args[index] === undefined
							|| args[index] === null) return false;
				}
				return true;
			}, function onfail(context) {
				var result = ['Expected value' + (length == 1 ? ' ' : 's '),
						getDisplayArgs(args)];
				result = result.concat([' to exist']);
				return result;
			});
			return this;
		}

	});


	// Export the resultant class.
	exports = Assert;


})();