(function() {


	var root = this, slice = Array.prototype.slice,
		splice = Array.prototype.splice;


	/* -------------------------------------------------------------------------
	 *									EXTEND
	 * -------------------------------------------------------------------------
	 *
	 * This module provides a simple extension mechanism to augment a
	 * constructor's prototype with methods and properties from one or more
	 * source objects.
	 *
	 * It can be invoked in two ways, directly:
	 *
	 * ``` js
	 *		Stratum.extend(function SomeObject() {}, { ... });
	 * ```
	 *
	 * to augment `SomeObject` with any methods or properties supplied, or
	 * indirectly, by first assigning the method to a constructor, in which case
	 * the first extension will be all of the prototype methods and properties
	 * of the parent constructor, so:
	 *
	 * ``` js
	 *		function BaseClass() {}
	 *		BaseClass.prototype = { ... };
	 *
	 *		BaseClass.extend = Stratum.extend;
	 *
	 *		var SubClass = BaseClass.extend(
	 *				function SubClass() {}, { ... });
	 * ```
	 *
	 * Any classes extended by this function automatically have the extend
	 * method added to their constructor, so that they can, in turn, be
	 * extended.
	 *
	 * Objects passed to extend can be either instances, or constructors for
	 * additional classes.  Functions are assumed to be class constructors, and
	 * the extension uses their prototype methods/properties, rather than those
	 * of the function itself.
	 *
	 * If included, all of the core `Stratum` classes automatically have extend
	 * applied to them, so it is possible to extend them directly without all
	 * of the above steps, like so:
	 *
	 * ``` js
	 *		Stratum.EventHandler.extend(
	 *			function SubClass() { .. constructor ...},
	 *			{
	 *				method: function() { ... }
	 *			}
	 *		);
	 * ```
	 *
	 * Unlike other implementations, this extend function insists on the first
	 * parameter representing the constructor function of the returned class.
	 * This is to ensure that produced classes are not uniformly named, as
	 * that makes debugging, and type differentiation difficult.
	 *
	 * This function also ensures that the first class passed, after the
	 * constructor (or the base class, if extend is added to an existing class)
	 * is actually placed in the prototype list, so that instances of the new
	 * class do actually inherit from the parent - so the instanceof operator
	 * is usable to distinguish subclass as instances of their parents as well,
	 * for example:
	 *
	 * ``` js
	 *		var SubClass = Stratum.EventHandler.extend(
	 *				function SubClass() {});
	 *
	 *		var instance = new SubClass();
	 *		instance instanceof EventHandler; // Resolves to true
	 * ```
	 *
	 * To avoid the automatic behaviour regarding function prototypes, an
	 * additional function, augment, is available which does not attempt to
	 * use prototypes from functions, but just copies all of the properties
	 * and methods from the objects passed to the first object supplied, so:
	 *
	 * ``` js
	 *		var source = function Source() {};
	 *		source.foo = function() {};
	 *
	 *		var bar = Stratum.augment(function Bar() {}, source);
	 * ```
	 *
	 * would mean that `Bar.foo === source.foo`, whereas using extend would mean
	 * foo would not be defined, in either the constructor function (`bar`) or
	 * any instance of it (since it is not an instance method of `Source`).
	 */


	/**
	 * Extend a constructor, or instance with the content of the objects
	 * specified.  If this method is added to a constructor, when invoked it
	 * extends the new constructor specified with the functionality of the
	 * class to which it is attached.
	 *
	 * @param dest	The base constructor or object to extend.
	 *
	 * @return The extended constructor.
	 */
	function extend(dest) {
		var object = dest.prototype ? dest.prototype : dest, args = arguments;

		// Discover parent class, if possible
		if (dest.prototype && this !== root && this.prototype) {
			object = dest.prototype = new this();
			args = [null, this.prototype ? this.prototype : this].concat(
					slice.call(arguments, 1));

		}else if (dest.prototype) {
			for(var index = 1, length = args.length; index < length; index++) {
				var source = args[index];
				if (source.prototype) {
					object = dest.prototype = new args[index]();
					splice.call(args, index, 1);
					break;
				}
			}
		}

		// Augment the object or constructor with each object passed.
		for(var index = 1, length = arguments.length; index < length; index++) {
			var source = arguments[index];
			if (source.prototype) source = source.prototype;
			for(var name in source) {
				object[name] = source[name];
			}
		}

		// Add 'extend' function to the constructor.
		dest.extend = extend;

		return dest;
	};


	/**
	 * Augment an object with the methods/properties of the objects specified.
	 * This performs a similar function to extend, only it does not attempt to
	 * detect whether objects are constructor functions, and does not adjust the
	 * prototype chain to ensure inheritence.
	 *
	 * @param dest	The object to augment.
	 *
	 * @return The augmented object.
	 */
	function augment(dest) {
		for(var index = 1, length = arguments.length; index < length; index++) {
			var source = arguments[index];
			for(var name in source) {
				dest[name] = source[name];
			}
		}

		return dest;
	}


	// Export extend function
	exports			= extend;
	extend.augment	= augment;


	// Do module work at the end, since there is a cyclical dependency between
	// module and extend.
	var module = require('stratum/module');

	module('stratum.extend', 'stratum');


})();