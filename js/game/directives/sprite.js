(function(root, exports) {


	var Sprite = {

		directive: function(scope, element, attrs) {
			var element = scope.$eval(attrs.sprite);
			
			if (!element) {
				debugger;
			}
			element.scope = scope;

			element.move = function(x, y) {
				var mobile = this;
				this.scope.$apply(function() {
					mobile.x += x;
					mobile.y += y;
				});
			};

			element.moveTo = function(x, y) {
				var mobile = this;
				this.scope.$apply(function() {
					mobile.x = x;
					mobile.y = y;
				});
			};

			element.accelerate = function(x, y) {
				var mobile = this;
				this.scope.$apply(function() {
					mobile.vx += x;
					mobile.vy += y;
				});
			};

			element.velocity = function(x, y) {
				var mobile = this;
				this.scope.$apply(function() {
					mobile.vx = x;
					mobile.vy = y;
				});
			};


			element.rotate = function(radians) {
				var mobile = this;
				this.scope.$apply(function() {
					mobile.angle += radians;
				});
			};

			element.rotateTo = function(radians) {
				var mobile = this;
				this.scope.$apply(function() {
					mobile.angle = radians;
				});
			};

		}

	};


	
	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Sprite	= Sprite;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.spatial = this.spatial || {}));
