(function() {


	var module = require('stratum/module');


	module('stratum.test').dependencies('stratum.extend', 'stratum.event');
	module('stratum');


	/**
	 * Recursion safe deep comparison.
	 *
	 * @param a			The first object to compare.
	 * @param b			The second object to compare.
	 * @param marked	The list of objects marked as compared, to undo after
	 * 					the comparison is complete.
	 *
	 * @return boolean, true if the objects are equivalent, false otherwise.
	 */ 
	function compare(a, b, marked) {
		if (a === b) return true;
		if (a && a.equals) return a.equals(b);
		if (b && b.equals) return b.equals(a);
		var aType = typeof a, bType = typeof b;
		if (a instanceof Array) aType = 'array';
		if (b instanceof Array) bType = 'array';
		if (compare.type[aType]) return compare.type[aType](a, b, marked);
		if (compare.type[bType]) return compare.type[bType](a, b, marked);
		else return a === b;
	}


	/**
	 * Mark an array, or object, as visited during a comparison.  This method
	 * adds a 'stratumMarked' property on each item visited, and ensures that
	 * they conform to the same topology within each structure, allowing
	 * effective deep comparison of equivalent, but not identical
	 * self-referential structures.
	 *
	 * If this function fails to mark both items equivalently, it unmarks all
	 * previously marked items, and returns false.
	 *
	 * @param a			The first object to mark.
	 * @param b			The second object to mark.
	 * @param marked	The list of objects marked as compared, to undo after
	 * 					the comparison is complete.
	 *
	 * @return boolean, true if marked successfully, false if failed.
	 */
	function mark(a, b, marked) {
		var markIndex = (marked.index ? ++marked.index : (marked.index = 1));

		if (a && !a.stratumMarked) {
			a.stratumMarked = markIndex;
			marked.push(a);

			if (!b || (b.stratumMarked && b.stratumMarked != markIndex)) {
				// a is marked, b is not - so different structure.
				return false;
			}

			b.stratumMarked = markIndex;
			marked.push(b);

		}else if (b
				&& (!b.stratumMarked || b.stratumMarked != a.stratumMarked)) {
			// b is marked, a is not, or index differs - so different structure.
			return false;
		}else if (b && b.stratumMarked === a.stratumMarked) {
			// Both marked, and marked with the same index, so they are the same
			// self reference in each case.
			return true;
		}

		// Marked successfully, no previous marks found.
		return undefined;
	}


	/**
	 * Unmark a list of items, removing all trace of the deep comparison.
	 *
	 * @param marked	The array of items to unmark.
	 */
	function unmark(marked) {
		for(var index = 0, len = marked.length; index < len; index++) {
			delete marked[index].stratumMarked;
		}
		marked.length = 0;
	}


	/**
	 * Container for custom comparator implementations.
	 */
	compare.type = {


		/**
		 * Compare two strings.  Returns false if the second parameter is not
		 * a string, or does not equal the first.
		 *
		 * @param a	The first parameter to compare.
		 * @param b	The second parameter to compare.
		 *
		 * @return boolean, true if the parameters match, false otherwise.
		 */
		string: function(a, b) {
			if (typeof a != 'string' || typeof b != 'string') return false;
			return a.localeCompare(b) == 0;
		},


		/**
		 * Compare two arrays.  Returns false if the second parameter is not
		 * an array, or does not equal the first.
		 *
		 * @param a	The first parameter to compare.
		 * @param b	The second parameter to compare.
		 *
		 * @return boolean, true if the parameters match, false otherwise.
		 */
		array: function(a, b, marked) {
			var base = !marked;
			marked = marked || [];
			var success = mark(a, b, marked);
			if (success === false) return false;
			if (success === true) return true;

			if (!b || b.length != a.length) {
				if (base) unmark(marked);
				return false;
			}

			for(var index = 0, len = a.length; index < len; index++) {
				if (!compare(a[index], b[index], marked)) {
					if (base) unmark(marked);
					return false;
				}
			}

			if (base) unmark(marked);
			return true;
		},


		/**
		 * Compare two objects.  Returns false if the second parameter does not
		 * equal the first.
		 *
		 * @param a	The first parameter to compare.
		 * @param b	The second parameter to compare.
		 *
		 * @return boolean, true if the parameters match, false otherwise.
		 */
		object: function(a, b, marked) {
			var base = !marked;
			marked = marked || [];
			var success = mark(a, b, marked);
			if (success === false) return false;
			if (success === true) return true;

			if (!b) {
				if (base) unmark(marked);
				return false;
			}

			for(var name in a) {
				if (!compare(a[name], b[name], marked)) {
					if (base) unmark(marked);
					return false;
				}
			}

			for(var name in b) {
				if (!compare(a[name], b[name], marked)) {
					if (base) unmark(marked);
					return false;
				}
			}

			if (base) unmark(marked);
			return true;
		}

	};


	/**
	 * Loose matching interface, to assert equality between rough types.
	 *
	 * @param equals	The function to compare for this type.
	 * @param message	The type descriptor to display when a match fails.
	 */
	function Any(equals, message) {
		this.equals = equals;
		this.message = message;
	}


	/**
	 * Check whether any of the parameters passed are an Any instance.
	 *
	 * @returns boolean true if any of the paramters passed are an Any instance.
	 */
	Any.is = function() {
		for(var index = 0, len = arguments.length; index < len; index++) {
			if (arguments[index] instanceof Any || arguments[index] === Any) {
				return true;
			}
		}
		return false;
	};


	/**
	 * Return the display 'message' of an Any instance, if one is passed, or
	 * return the original object, if not.  This makes assertion/expectation
	 * errors more informative.
	 *
	 * @param object	The object to check.
	 * @returns	string describing the object, if its an Any instance, or
	 * 			The original object.
	 */
	Any.display = function(object) {
		if (object instanceof Any || object === Any) return object.message;
		else return object;
	};


	// Equivalent method and message for constructor, so that it mirrors the
	// functionality of instances, but for matching against literally anything.
	Any.equals = function Any(other) {
			return true;
	};

	Any.message = 'anything';


	/* -------------------------------------------------------------------------
	 * Type specific implementations.
	 * ---------------------------------------------------------------------- */

	Any.Array = new Any(function String(other) {
		if (other === this) return true;
		return other instanceof Array;
	}, 'any array');


	Any.String = new Any(function String(other) {
		if (other === this) return true;
		return typeof other == 'string';
	}, 'any string');


	Any.Number = new Any(function Number(other) {
		if (other === this) return true;
		return typeof other == 'number';
	}, 'any number');


	Any.Boolean = new Any(function Boolean(other) {
		if (other === this) return true;
		return typeof other == 'boolean';
	}, 'any boolean');


	Any.Object = new Any(function Object(other) {
		if (other === this) return true;
		return other !== null && typeof other == 'object'
			&& !(other instanceof Array);
	}, 'any object');


	Any.Function = new Any(function Function(other) {
		if (other === this) return true;
		return typeof(other) == 'function';
	}, 'any function');


	Any.True = new Any(function True(other) {
		if (other === this) return true;
		return other ? true : false;
	}, 'anything that resolves to true'),


	Any.False = new Any(function False(other) {
		if (other === this) return true;
		return other ? false : true;
	}, 'anything that resolves to false');


	// Make the Any class available externally.
	compare.Any = Any;


	// Export functionality.
	exports = compare;


})();