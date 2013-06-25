(function(root, exports) {


	var QuadTree		= require('../spatial/quadtree').QuadTree;

	QuadTree.eclipseSucks;


	var SET_PREFIX		= 'cid',
		SET_ID			= 0,
		EVENT_ID		= 0;


	/* ------------------------ ( Collidable.Set ) -------------------------- */

	function Set(name) {
		this.name	= name;
		this.bounds	= {};
		this.tree	= new QuadTree();
		this.dirty	= false;
	}

	Set.prototype = {

		add: function(bounds) {
			if (!bounds.intersects) {
				debugger;
			}
			var id = bounds[SET_PREFIX];
			if (!id) {
				id = bounds[SET_PREFIX] = SET_ID++;
			}
			this.bounds[id]	= bounds;
			this.dirty		= true;
		},

		remove: function(bounds) {
			var id = bounds[SET_PREFIX];
			if (!id) {
				return;
			}
			delete this.bounds[id];
			this.dirty = true;
		},

		init: function() {
			this.dirty = true;
		},

		collisions: function(width, height, bounds) {
			var tree = this.tree;
			if (this.dirty) {
				var possibles = this.bounds;
				tree.clear(width, height);
				for(var id in possibles) {
					if (!possibles.hasOwnProperty(id)) continue;
					tree.insert(possibles[id]);
				}
				this.dirty = false;
			}
			return tree.find(bounds);
		}

	};


	/* -------------------------- ( Collidable ) ---------------------------- */

	var Collidable = null;

	Collidable = {

		sets:	{},

		events:	{},

		get: function(name) {
			var sets = this.sets;
			if (!sets[name]) {
				sets[name] = new Set(name);
			}
			return sets[name];
		},

		directive: function(scope, element, attrs, $parse) {

			this.init(scope);

			var names	= attrs.set ? attrs.set.split(',') : [],
				len		= names.length,
				sets	= this.sets,
				eventId = EVENT_ID++,
				events	= [];

			var object = scope.$eval(attrs.collidable);

			// Add to appropriate collision sets.
			for(var index = 0; index < len; index++) {
				names[index] = names[index].toLowerCase();
				this.get(names[index]).add(object);
			}

			// Add all collision event handlers.
			for(var attr in attrs) {
				if (!attrs.hasOwnProperty(attr)
					|| attr.substring(0, 7) !== 'collide') {
					continue;
				}
				var set = this.get(attr.substring(7).toLowerCase());

				events.push({
					object:	object,
					set:	set,
					func:	$parse(attrs[attr]),
					scope:	scope
				});

				Collidable.events[eventId] = events;
			}

			// Remove element from sets
			element.bind('$destroy', function() {
				for(var index = 0; index < len; index++) {
					sets[names[index]].remove(object);
				}
				delete(Collidable.events[eventId]);
			});

		},

		test: function(scope, width, height) {
			var root = this.events,
				sets = this.sets;

			// Initialise all collision sets.
			for(var name in sets) {
				if (!sets.hasOwnProperty(name)) {
					continue;
				}
				sets[name].init();
			}

			// Loop through top level events.
			for(var id in root) {
				if (!root.hasOwnProperty(id)) {
					continue;
				}

				var events = root[id], len = events.length;
				// Check each 'event' object for collisions.
				for(var index = 0; index < len; index++) {
					var event		= events[index],
						collisions	= event.set.collisions(
								width, height, event.object);

					// If there is a collision, execute the angular expression.
					if (collisions.length) {
						event.func(event.scope, {$collisions: collisions});
					}
				}
			}
		},

		init: function(scope) {

			if (scope.game) {
				var game = scope.game;
				game.pipeline(function() {
					Collidable.test(game.scope, game.width, game.height);
				});
				this.init = function() {};
			}

		}


	};


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Collidable	= Collidable;
	Collidable.Set		= Set;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.spatial = this.spatial || {}));
