(function() {


	var module = require('stratum/module'),
		Assert = require('stratum/test/core/assert');


	module('stratum.test').dependencies('stratum.extend', 'stratum.event');
	module('stratum');


	var root = this;


	/**
	 * Behaviour driven alternative syntax for assertions.
	 *
	 * @param args An array of arguments to provide expectations for.
	 */
	var Expect = Assert.extend(function Expect(args) {
		Assert.call(this, args);
	}, createPrototype());


	/**
	 * Create a prototype for expect, by remapping methods from Assert.
	 */
	function createPrototype() {

		// List of method name starts, and what they map to.
		var starts = {
			was:			'toBe',
			is:				'toBe',
			threw:			'toThrow',
			didNot:			'toNot',
			equals:			'toEqual',
			doesNotEqual:	'toNotEqual',
			exists: 		'toExist',
			returned:		'toReturn'
		};

		var proto = {};

		// Loop through all Assert methods.
		var source = Assert.prototype;
		for(var name in source) {
			if (!source.hasOwnProperty(name)) continue;
			var expectName = false;

			// Check for remapping matches.
			for(var start in starts) {
				if (!starts.hasOwnProperty(start)) continue;
				if (name.substring(0, start.length) == start) {
					expectName = starts[start] + name.substring(start.length);
				}
			}

			// Log if something is amiss - to help ensure equivalence between
			// Assert and Expect capabilities.
			if (!expectName) {
				if (root.console && console.log) {
					console.log('WARNING: No Expect remapping for Assert.' + name);
				}
			}else{
				proto[expectName] = source[name];
			}

		}

		return proto;
	};


	// Export the Expect class.
	exports = Expect;


})();