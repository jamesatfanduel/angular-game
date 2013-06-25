(function() {


	var module = require('stratum/module'),
		extend = require('stratum/extend');


	module('stratum.event', 'stratum');


	/* -------------------------------------------------------------------------
	 *									EVENTHANDLER
	 * -------------------------------------------------------------------------
	 *
	 * This module provides a simple event handling system.  Functions are bound
	 * to events on an `EventHandler` instance, using:
	 *
	 * ```js
	 *		handler.bind('event', func);
	 * ```
	 *
	 * and unbound similarly, using:
	 *
	 * ```js
	 *		handler.unbind('event', func);
	 * ```
	 *
	 * Finally, events are triggered by the event source, by calling either:
	 *
	 * ```js
	 *		fire('event', params...);
	 * ```
	 *
	 * to fire a specific event, with the given parameters, or:
	 *
	 * ```js
	 *		fireMulti('event:sub', params...);
	 * ```
	 *
	 * To fire a multi stage event, in this case `event.sub`, and then `event`
	 * to any interested listeners.
	 *
	 */


	/**
	 * Implementation of a simple eventing system.
	 * 
	 * @author James Andrews
	 */
	function EventHandler() {
		this.listeners = [];
	};

	EventHandler.prototype = {

		/**
		 * bind a new callback function to the specified event.
		 *
		 * @param event		The event to bind to.
		 * @param callback	The callback to be invoked if the event occurs.
		 */
		bind: function(event, callback) {
			var listeners = this.listeners, array = listeners[event];
			if (!array) array = listeners[event] = [];
			array.push(callback);
		},

		/**
		 * Unbind a callback from the event specified.
		 *
		 * @param event		The event to unbind from.
		 * @param callback	The callback to remove.
		 */
		unbind: function(event, callback) {
			var listeners = this.listeners, array = listeners[event];
			if (!array) return;
			var index = array.indexOf(callback);
			if (index === -1) return;
			if (array.length === 1) delete listeners[event];
			else array.splice(index, 1);
		},

		fireArray: function(event, array, args) {
			if (!array) return;
			for(var index = 0, length = array.length; index < length; index++) {
				try{
					array[index].apply(this, args);
				}catch(e) {
					this.exception(e);
				}
			}
		},

		/**
		 * Fire a single specific event, passing the event type, and any
		 * additional parameters.
		 *
		 * Callbacks will be invoked with exactly the same argument as this
		 * method.
		 *
		 * @param event The name of the event to fire.
		 */
		fire: function(event) {
			var listeners = this.listeners;
			this.fireArray(event, listeners[event], arguments);
			this.fireArray(event, listeners['all'], arguments);
		},

		/**
		 * Fire an event, and any *parent* events associated.  The hierarchy is
		 * defined using dot notation, so `event.sub` will fire `event.sub` and
		 * then `event`, and `a.b.c` will fire `a.b.c`, `a.b` and `a`.
		 *
		 * Callbacks will be invoked with exactly the same argument as this
		 * method.
		 *
		 * @param event The name of the event to fire.
		 */
		fireMulti: function(event) {
			var listeners = this.listeners, index;
			this.fireArray(event, listeners[event], arguments);
			this.fireArray(event, listeners['all'], arguments);
			while((index = event.lastIndexOf('.')) !== -1) {
				event = event.substring(0, index);
				this.fireArray(event, listeners[event], arguments);
				this.fireArray(event, listeners['all'], arguments);
			}
		},

		/**
		 * Handle any exceptions thrown during an event being fired, by default
		 * this just rethrows the exception, but can be replaced if required.
		 *
		 * @param exception The exception thrown.
		 */
		exception: function(exception) {
			throw exception;
		}

	};


	// Make this class extendable.
	EventHandler.extend = extend;


	// Export the EventHandler class.
	exports = EventHandler;


})();