(function(root, exports) {


	/* ---------------------------- ( Bounds ) ------------------------------ */

	function Bounds(x, y, width, height) {
		this.construct(x, y, width, height);
	}

	Bounds.prototype = {

		construct: function(x, y, width, height) {
			this.set(x || 0, y || 0, width || 0, height || 0);
		},

		setBounds: function(other) {
			this.x = other.x;
			this.y = other.y;
			this.width = other.width;
			this.height = other.height;
			this.cx = this.x + this.width * 0.5;
			this.cy = this.y + this.height * 0.5;
		},

		set: function(x, y, width, height) {
			this.x = x;
			this.y = y;
			this.width = width;
			this.height = height;
			this.cx = this.x + width * 0.5;
			this.cy = this.y + height * 0.5;
		},

		resize: function(width, height) {
			this.width = width;
			this.height = height;
			this.cx = this.x + width * 0.5;
			this.cy = this.y + height * 0.5;
		},

		intersects: function(other) {
			var x2 = this.x + this.width,
				y2 = this.y + this.height,
				ox2 = other.x + other.width,
				oy2 = other.y + other.height;
			return ox2 >= this.x && other.x <= x2 && oy2 >= this.y && other.y <= y2;
		},

		contains: function(x, y) {
			return x >= this.x && x <= (this.x + this.width)
					&& y >= this.y && y <= (this.y + this.height);
		}

	};

	exports.Bounds = Bounds;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.bounds = this.spatial || {}));
