(function() {


	var module = require('stratum/module'),
		Context = require('stratum/test/core/context');


	module('stratum.test').dependencies('stratum.extend', 'stratum.event');
	module('stratum');


	/**
	 * Container and context for a single test.
	 *
	 * @param name	The name of this test.
	 * @param func	The function to execute to actually run this test.
	 */
	var Test = Context.extend(function Test(name, func) {
		Context.apply(this);
		this.name = name;
		this.func = func;
	}, {


		/**
		 * Run this test and return the result.
		 *
		 * @returns	Boolean, true if successful, false otherwise.
		 */
		run: function() {
			this.fireMulti('test.start', this);
			this.enter();
			try{
				this.func();
			}catch(exception) {
				this.fireMulti('test.exception', this, exception);
				throw exception;
			}
			// Check for any unhandles exceptions in intercepts
			this.checkExceptions();

			this.leave();
			this.fireMulti('test.end', this);
			return this.success;
		}


	});


	// Export the Test class.
	exports = Test;


})();