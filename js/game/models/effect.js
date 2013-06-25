(function(root, exports) {


	var extend		= require('../../dep/stratum/extend'),
		Reusable	= require('../reusable').Reusable,
		Mobile		= require('../spatial/mobile').Mobile;


	/* ---------------------------- ( Effect ) ------------------------------ */

	var Effect = extend(function Effect() {}, Mobile, {

		construct: function(type, x, y, width, height, lifetime) {
			this.type		= type;
			this.lifetime	= lifetime;
			this.frame		= 0;
			Mobile.prototype.construct.call(this, x, y, width, height);
		},

		getFrameClass: function() {
			return 'frame' + this.frame;
		},

		update: function(game, delta) {
			if (this.updateFrame) {
				this.updateFrame(game, delta);
			}else{
				this.frame = 1;
			}
			if ((this.lifetime -= delta) < 0) {
				game.destroy(this);
			}
		}
	});

	Reusable.apply(Effect);

	Effect.Explosion = {

		create: function(x, y) {
			return Effect.create('explosion', x, y, 20, 20, 5);
		},

	};

	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Effect = Effect;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.models = this.models || {}));
