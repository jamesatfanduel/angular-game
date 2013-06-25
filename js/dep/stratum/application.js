(function() {


	var root = this;


	root.stratum = root.stratum || {};


	if (!stratum.Application) {


		// ---------------------------------------------------------------------
		// # Application handling
		// ---------------------------------------------------------------------


		function Application(name) {
			this.name		= name;
			this.components = {};
		};

		Application.prototype = {

			enter: function(nostack) {
				var active = Application.active;
				if (active.ondeactivate) active.ondeactivate();
				if (!nostack) Application.stack.push(active);
				Application.active = this;
				if (this.onactivate) this.onactivate();
			},

			leave: function() {
				if (!Application.stack.length)
					throw new Error('Mismatched Application.leave()');
				var active = Application.active;
				if (active.ondeactivate) active.ondeactivate();
				active = Application.active = Application.stack.pop();
				if (active.onactivate) active.onactivate();
			}

		};

		Application.create = function(name, callback) {
			if (Application.cache[name]) return Application.cache[name];
			var app = new Application(name);
			if (callback) {
				app.enter();
				callback(app);
				app.leave();
			}
			Application.cache[name] = app;
			Application.cache.push(app);
			return app;
		};

		Application.component = function(component) {
			var active = Application.active, components = active.components;
			if (components[component]) return components[component];
			if (Application.components[component]) {
				return components[component]
						= Application.components[component](this, arguments);
			}
		};

		Application.register = function(component, constructor) {
			Application.components[component] = constructor;
		};

		Application.use = function(name, create) {
			var app = (name instanceof Application)
					? name : Application.create(name, create);
			app.enter(true);
			return app;
		};

		Application.context = function(name, callback, create) {
			var app = Application.create(name, create);
			app.enter();
			callback();
			app.leave();
		};

		Application.mark = function() {
			return {
				active:	Application.active,
				stack:	Application.stack.slice(0)
			};
		};

		Application.restore = function(mark) {
			var active = Application.active;
			if (active.ondeactivate) active.ondeactivate();
			Application.active = mark.active;
			Application.stack = mark.stack;
			if (Application.active.onactivate) Application.active.onactivate();
		};


		Application.cache		= [];
		Application.components	= [];
		Application.stack		= [];
		Application.active		= Application.base
									= Application.create('default');


		// Apply to the default loader in a stratum environment.  This allows the
		// Application mechanism to be used independently of stratum (for example,
		// in NodeJS).
		if (root.stratum) {
			var Loader = root.stratum.Loader;
			Loader.base.application					= Application.active;
			Application.active.components['loader']	= Loader.base;
	
			Application.components['loader']		= function() {
				return new Loader();
			};
		}


		root.stratum.Application = Application;


		exports = Application;


	}


})();
