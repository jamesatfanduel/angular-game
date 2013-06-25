(function() {


	var module = require('stratum/module'),
		TDD = require('stratum/test/tdd'),
		Expect = require('stratum/test/core/expect');
		extend = require('stratum/extend'),
		augment = extend.augment;


	module('stratum.test', 'stratum');


	// Export the actual TDD interface.

	/**
	 * A behaviour driven alternative syntax for testing.  Basically remaps:
	 *
	 * ```
	 *      group   -> describe
	 *      test    -> it
	 *      assert  -> expect (with alternative syntax)
	 * ```
	 * 
	 * while retaining all other functionality.
	 *
	 */
	exports = augment({}, TDD, {
		describe: TDD.group,
		it: TDD.test,
		expect: function() {
			if (!(Context.current instanceof Test)) {
				throw new Error("Expectations must only occur within tests");
			}

			return new Expect(arguments);
		}
	});


})();