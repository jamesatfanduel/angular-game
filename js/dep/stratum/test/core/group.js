(function() {


	var module = require('stratum/module'),
		extend = require('stratum/extend'),
		Context = require('stratum/test/core/context');


	module('stratum.test').dependencies('stratum.extend', 'stratum.event');
	module('stratum');


	/**
	 * Container for test group information, and results.
	 *
	 * @param name	The name of this group.
	 */
	var Group = Context.extend(function Group(name) {
		Context.apply(this);
		this.name = name;
		this.children = [];
		this.before = [];
		this.after = [];
		this.beforeEach = [];
		this.afterEach = [];

		var group = this;

		this.bind('assert.fail', function() {
			group.success = false;
		});


	}, {


		/**
		 * Add one or more child contexts to this group.
		 */
		add: function() {
			var args = Array.prototype.splice.call(arguments, 0), group = this;
			this.children = this.children.concat(args);
			for(var index = 0, length = args.length; index < length; index++) {
				args[index].parent = this;
				args[index].bind('all', function() {
					group.fire.apply(group, arguments);
				});
			}
		},


		/**
		 * Add functions to be executed before any child contexts in this group.
		 */
		addBefore: function() {
			var args = Array.prototype.splice.call(arguments, 0);
			this.before = this.before.concat(args);
		},


		/**
		 * Add functions to be executed after any child contexts in this group.
		 */
		addAfter: function() {
			var args = Array.prototype.splice.call(arguments, 0);
			this.after = this.after.concat(args);
		},


		/**
		 * Add functions to be executed before each child context in this group.
		 */
		addBeforeEach: function() {
			var args = Array.prototype.splice.call(arguments, 0);
			this.before = this.before.concat(args);
		},


		/**
		 * Add functions to be executed after each child context in this group.
		 */
		addAfterEach: function() {
			var args = Array.prototype.splice.call(arguments, 0);
			this.after = this.after.concat(args);
		},


		/**
		 * Run each function specified.
		 */
		runArray: function(array) {
			var length = array.length;
			for(var index = 0; index < length; index++) {
				array[index]();
			}
		},


		/**
		 * Execute each child context in this group.
		 */
		run: function() {
			this.fireMulti('group.start', this);
			this.enter();
			var children = this.children, length = children.length;
			this.runArray(this.before);
			for(var index = 0; index < length; index++) {
				this.runArray(this.beforeEach);
				children[index].run();
				this.runArray(this.afterEach);
			}
			this.runArray(this.after);
			this.leave();
			this.fireMulti('group.end', this);
			return this.success;
		}


	});


	// Create the default top level group.
	Group.current = Group.TOP = new Group('TOP');


	// Export the Group class.
	exports = Group;


})();