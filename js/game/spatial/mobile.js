(function(root, exports) {


	var extend		= require('../../dep/stratum/extend'),
		Bounds		= require('./bounds').Bounds,
		Sync		= require('../network/sync').Sync;


	var MOBILE_ID = 0;


	/* ---------------------------- ( Mobile ) ------------------------------ */

	var Mobile = extend( 

		function Mobile(x, y, width, height) {
			this.construct(x, y, width, height);
		},

		Bounds,

		{

			construct: function(x, y, width, height) {
				this.set(x || 0, y || 0, width || 0, height || 0);
				this.vx			= this.vy = 0;
				this.angle		= 0;
				this.spin		= 0;
				this.nid		= MOBILE_ID++;
				this.id			= 'm' + this.nid;
			},

			// *** IMMEDIATE MOVEMENT

			move: function(x, y) {
				this.x += x;
				this.y += y;
				this.cx += x;
				this.cy += y;
			},

			moveTo: function(x, y) {
				this.x = x;
				this.y = y;
				this.cx = x + this.width * 0.5;
				this.cy = y + this.height * 0.5;
			},

			friction: function(friction) {
				this.friction = friction;
			},


			// *** VELOCITY BASED

			accelerate: function(x, y) {
				this.vx += x;
				this.vy += y;
			},

			velocity: function(vx, vy) {
				this.vx = vx;
				this.vy = vy;
			},

			limit: function(min, max) {
				var vx		= this.vx,
					vy		= this.vy;
					min2	= min * min,
					max2	= max * max,
					factor	= 1;

				var v2 = vx * vx + vy * vy;
				if (v2 < min) {
					if (min === 0) {
						factor = 0;
					}else{
						factor = Math.sqrt(v2) / min;
					}
				}else if (v2 > max2) {
					factor = max / Math.sqrt(v2);
				}else{
					return;
				}
				this.vx *= factor;
				this.vy *= factor;
			},

			rotate: function(degrees) {
				this.angle += degrees;
			},

			rotateTo: function(degrees) {
				this.angle = degrees;
			},

			relative: function(velocity, angle) {
				this.accelerate(
					Math.cos((this.angle + (angle || 0)) * this.PI2) * velocity,
					Math.sin((this.angle + (angle || 0)) * this.PI2) * velocity
				);
			},

			forward: function(velocity) {
				this.relative(velocity);
			},

			backwards: function(velocity) {
				this.relative(velocity, 180);
			},

			left: function(velocity) {
				this.relative(velocity, 90);
			},

			right: function(velocity) {
				this.relative(velocity, -90);
			},


			tick: function(game, delta) {
				var count = 5;

				// Loop up to 5 iterations
				while(count-- > 0) {

					this.angle += this.spin;

					// Cache state, and apply velocity.
					var ox = this.x, oy = this.y;
					this.move(this.vx * delta, this.vy * delta);

					var sx = this.x, sy = this.y;

					// If this instance has a post tick update, call it
					if (!this.update) return;
					if (this.update(game, delta) === false) return;

					// Check for modifications to the location in the update.
					if ((sx === this.x && sy === this.y )
							|| (this.vx === 0 && this.vy === 0)) return;

					// If the position is modified, work out how much 'inertia'
					// was used in the new motion.
					var ndx = this.x - ox, ndy = this.y - oy,
						nd = Math.sqrt(ndx * ndx + ndy * ndy),
						odx = sx - ox, ody = sy - oy,
						od = Math.sqrt(odx * odx + ody * ody),
						ratio = nd / od;

					// Reduce the delta, and repeat the tick.
					if (ratio <= 0 || ratio >= 1) return;
					delta -= delta * ratio;

				}

			},

			spinup: function(delta) {
				if (delta <= 0) return;
				while(delta > 0.25) {
					this.tick(game, 0.25);
					delta -= 0.25;
				}
				if (delta >= 0) {
					this.tick(game, 0.25);
				}

			}

		});


	/* -------------------- ( NETWORK SYNC METHODS ) ------------------------ */

	Mobile.SYNC = {
		STATE:	'ms',

		STATE_FUNCTIONS: Sync.properties({
			properties: {
				nid:	1,
				x:		1,
				y:		1,
				vx:		1,
				vy:		1,
				angle:	1
			},

			pre: function(packet, instance, args) {
				var now		= args[1],
					props	= Mobile.SYNC.STATE_FUNCTIONS;

				packet[props.next] = now;
			},

			post: function(packet, mobile, args) {
				var now		= args[1],
					props	= Mobile.SYNC.STATE_FUNCTIONS;

				mobile.cx = mobile.x + mobile.width * 0.5;
				mobile.cy = mobile.y + mobile.height * 0.5;

				// Catch up any required motion.
				mobile.spinup((now - packet[props.next]) * 0.001);
			},

			instance: function(packet, args, indices) {
				return args[0].client.lookup[packet[indices.nid]];
			}
		})

	};


	Sync.register(Mobile.SYNC.STATE,
			Mobile.SYNC.STATE_FUNCTIONS.encode,
			Mobile.SYNC.STATE_FUNCTIONS.decode);


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Mobile = Mobile;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.spatial = this.spatial || {}));
