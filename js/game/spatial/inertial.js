(function(root, exports) {


	/* -------------------------- ( Inertial ) ---------------------------- */


	var Inertial = {

		apply: function(Type) {
			var proto = Type.prototype;

			var original = proto.update;

			// Set up default values to be overridden.
			proto.friction = 0;
			proto.angularFriction = 0;
			proto.angularBase = 0;

			proto.update = function(game, delta) {
				var vx = this.vx, vy = this.vy, friction = this.friction;

				// Apply friction.			
				if ((vx !== 0 || vy !== 0) && friction) {
					var velocity = Math.max(0, Math.sqrt(vx * vx + vy * vy));
					if (velocity < friction * delta) {
						this.velocity(0, 0);
					}else{
						var factor = (velocity - (friction * delta)) / velocity;
						this.velocity(this.vx * factor, this.vy * factor);
					}
				}

				// Apply angular friction.
				var af = this.angularFriction, base = this.angularBase;
				if (af && this.angle !== base) {
					var direction = base < this.angle ? -af : af;
					if ((af * delta) > Math.abs(base - this.angle)) {
						this.rotateTo(base);
					}else{
						this.rotate(direction * delta);
					}
				}

				return original.call(this, game, delta);
			};

		}

	};


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Inertial = Inertial;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.models = this.models || {}));
