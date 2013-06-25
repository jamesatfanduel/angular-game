(function() {


	var module = require('stratum/module'),
		Group = require('stratum/test/core/group'),
		Test = require('stratum/test/core/test'),
		Assert = require('stratum/test/core/assert'),
		Intercept = require('stratum/test/core/intercept'),
		Context = require('stratum/test/core/context'),
		compare = require('stratum/test/core/compare'),
		Any = compare.Any;


	module('stratum.test', 'stratum');


	/**
	 * Main interface for test driven development / unit testing style.
	 */
	exports = {

		/**
		 * Define a new test group.
		 *
		 * @param name	The name of the group.
		 * @param func	The function containing the groups members.
		 * @returns {Group}
		 */
		group: function(name, func) {
			var group = new Group(name);

			Group.current.add(group);
			var lastGroup = Group.current;

			group.enter();
			Group.current = group;

			func();

			Group.current = lastGroup;
			group.leave();
			return group;
		},

		/**
		 * Define a new test.
		 *
		 * @param name	The name of the test.
		 * @param func	The function containing the test body.
		 */
		test: function(name, func) {
			var test = new Test(name, func);
			Group.current.add(test);
			return test;
		},

		/**
		 * Add a function to be executed at the start of the current group,
		 * before any tests have been run.
		 *
		 * @param func	The function to run.
		 */
		before: function(func) {
			Group.current.addBefore(func);
		},

		/**
		 * Add a function to be executed at the end of the current group, after
		 * all tests have completed.
		 *
		 * @param func	The function to run.
		 */
		after: function(func) {
			Group.current.addAfter(func);
		},

		/**
		 * Intercept a function or method, to allow assertions/expectations
		 * about the functions invocation, or to change its behaviour during
		 * the current test.  Intercepts only last for the duration of the scope
		 * they belong to.
		 *
		 * @returns	Intercept
		 */
		intercept: function() {
			if (arguments.length > 2) throw new Error('intercept can only take '
				+ 'the following parameters, intercept(), intercept(func), '
				+ 'intercept(instance, methodName)');
			return Intercept.create(arguments[0], arguments[1]);
		},

		/**
		 * Create a stub function for testing purposes.  This method can either
		 * create an intercept for a specific function, or create a new empty
		 * function, to allow assertions/expectations about the behaviour
		 * of the test code with regards that function.
		 *
		 * @param func	An optional function to create a stub for.
		 *
		 * @returns function, a new stub, or replacement function.
		 */
		stub: function(func) {
			return this.intercept(func).getFunction();
		},

		/**
		 * Make an assertion about one or more parameters, returns an Assert
		 * instance, from which various conditions can be tested.
		 *
		 * @returns {Assert}
		 */
		assert: function() {
			if (!(Context.current instanceof Test)) {
				throw new Error("Assertions must only occur within tests");
			}

			return new Assert(arguments);
		},

		/**
		 * Run all defined tests and return the result.
		 *
		 * @returns {Boolean} The test result.
		 */
		run: function() {
			return Group.current.run();
		},

		/**
		 * Reference to Any types, for loose type matching in tests.
		 */
		any: Any

	};


	/**
	 * Add a function to be executed before each test in the current group.
	 *
	 * @param func	The function to execute.
	 */
	exports.before.each = function(func) {
		Group.current.addBeforeEach(func);
	};

	/**
	 * Add a function to be executed after each test in the current group.
	 *
	 * @param func	The function to execute.
	 */
	exports.after.each = function(func) {
		Group.current.addAfterEach(func);
	};

	/**
	 * Convenience mechanism to clear all statistics and usage data from all
	 * intercepts currently in scope - resetting their state to an initial,
	 * known quantity.
	 */
	exports.intercept.reset = function() {
		Intercept.reset();
	};


	// Export classes
	exports.classes = {
		Group: Group,
		Test: Test,
		Assert: Assert,
		Context: Context,
		Any: compare.Any,
		Intercept: Intercept
	};


	// Export functions
	exports.functions = {
		compare: compare
	};



})();