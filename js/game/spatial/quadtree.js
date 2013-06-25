(function(root, exports) {


	var extend		= require('../../dep/stratum/extend'),
		Reusable	= require('../reusable').Reusable,
		Bounds		= require('./bounds').Bounds;

	Bounds.eclipseSucks;


	/* ------------------------ ( QuadTree.Node ) --------------------------- */

	function Node() {
		this.bounds		= new Bounds();
		this.children	= [];
	};

	Node.prototype = {

		construct: function(parent, level, x, y, width, height) {
			this.level				= level;
			this.children.length	= 0;
			this.horizontal			= (width / 2) + x;
			this.vertical			= (height / 2) + y;
			this.parent				= parent;

			this.nw = this.ne = this.sw = this.se = null;
			this.bounds.set(x, y, width, height);
		},

		clear: function() {
			function clear(node) {
				if (node) {
					node.clear();
					node.release();
				}
			}
			clear(this.ne);
			clear(this.se);
			clear(this.sw);
			clear(this.nw);

			this.children.length = 0;
			this.nw = this.ne = this.sw = this.se = null;
		},

		node: function(bounds) {
			if (!this.nw) return this;

			var x1 = bounds.x, x2 = bounds.x + bounds.width,
				y1 = bounds.y, y2 = bounds.y + bounds.height,
				h = this.horizontal, v = this.vertical;

			if (x1 < h && x2 < h) {
				if (y1 < v && y2 < v) {
					return this.nw ? this.nw.node(bounds) : this;
				}else if (y1 >= v && y2 >= v) {
					return this.sw ? this.sw.node(bounds) : this;
				}
			}else if (x1 >= h && x2 >= h) {
				if (y1 < v && y2 < v) {
					return this.ne ? this.ne.node(bounds) : this;
				}else if (y1 >= v && y2 >= v) {
					return this.se ? this.se.node(bounds) : this;
				}
			}
			return this;
		},

		get: function(bounds, result) {
			this.populate(bounds, result);
			if (!this.nw) return;

			var x1 = bounds.x, x2 = bounds.x + bounds.width,
				y1 = bounds.y, y2 = bounds.y + bounds.height,
				h = this.horizontal, v = this.vertical;

			if (x1 < h && x2 < h) {
				if (y1 < v && y2 < v) {
					this.nw.get(bounds, result);
				}else if (y1 >= v && y2 >= v) {
					this.sw.get(bounds, result);
				}else{
					this.nw.get(bounds, result);
					this.sw.get(bounds, result);
				}
				return;
			}else if (x1 >= h && x2 >= h) {
				if (y1 < v && y2 < v) {
					this.ne.get(bounds, result);
				}else if (y1 >= v && y2 >= v) {
					this.se.get(bounds, result);
				}else{
					this.ne.get(bounds, result);
					this.se.get(bounds, result);
				}
				return;
			}

			if (y1 < v && y2 < v) {
				this.nw.get(bounds, result);
				this.ne.get(bounds, result);
				return;
			}else if (y1 >= v && y2 >= v) {
				this.sw.get(bounds, result);
				this.se.get(bounds, result);
				return;
			}

			this.nw.get(bounds, result);
			this.ne.get(bounds, result);
			this.sw.get(bounds, result);
			this.se.get(bounds, result);
		},

		populate: function(bounds, result) {
			var children = this.children, len = children.length;
			for(var index = 0; index < len; index++) {
				// Avoid self-intersection.
				if (children[index] === bounds) continue;
				if (children[index].intersects(bounds)) {
					result.push(children[index]);
				}
			}
		},

		insert: function(bounds, maxChildren, maxLevel) {
			var children = this.children;
			children.push(bounds);
			if (children.length <= maxChildren || this.level >= maxLevel) {
				return;
			}

			if (!this.nw) {
				this.split();
			}

			for(var index = 0, len = children.length; index < len; index++) {
				var child	= children[index],
					sub		= this.node(child);

				if (sub !== this) {
					children.splice(index--, 1);
					len--;
					sub.insert(child, maxChildren, maxLevel);
				}
			}
		},

		split: function() {
			var l = this.level + 1, b = this.bounds, x = b.x, y = b.y,
				w = this.horizontal - x, h = this.vertical - y;

			this.nw = Node.create(this, l, x, y, w, h);
			this.ne = Node.create(this, l, x + w, y, w, h);
			this.sw = Node.create(this, l, x, y + h, w, h);
			this.se = Node.create(this, l, x + w, y + h, w, h);
		}


	};

	Reusable.apply(Node);

	Node.extend = extend;


	/* --------------------------- ( QuadTree ) ----------------------------- */

	var MAX				= 2251799813685248,
		MAX_CHILDREN	= 1,
		MAX_DEPTH		= 8;


	var QuadTree = Node.extend(

		function QuadTree(bounds, maxChildren, maxDepth) {
			var x, y, width, height;
			if (bounds) {
				x = bounds.x;
				y = bounds.y,
				width = bounds.width;
				height = bounds.height;
			}else{
				x = y = -MAX;
				width = height = 2 * MAX;
			}

			Node.apply(this);
			this.construct(null, 1, x, y, width, height);

			this.maxChildren	= maxChildren	|| MAX_CHILDREN;
			this.maxDepth		= maxDepth		|| MAX_DEPTH;
		},

		{

			release: function() {
				throw new Error('QuadTree should never be freed');
			},

			insert: function(bounds) {
				var node = this.node(bounds);
				if (node === this) {
					Node.prototype.insert.call(
							this, bounds, this.maxChildren, this.maxDepth);
				}else{
					node.insert(bounds, this.maxChildren, this.maxDepth);
				}
			},

			find: function(bounds, result) {
				result = result || [];
				this.get(bounds, result);
				return result;
			}

		});


	/* ---------------------------- ( EXPORTS ) ----------------------------- */

	exports.QuadTree	= QuadTree;

	QuadTree.Node		= Node;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.spatial = this.spatial || {}));
