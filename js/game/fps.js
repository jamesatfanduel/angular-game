(function(root, exports) {


	var extend		= require('../dep/stratum/extend'),
		Circular	= require('./circular').Circular;


	/* -------------------------- ( FPS ) ------------------------------ */

	var FPS = extend(
		function FPS() {
			this.total	= 0;
			this.length	= 0;
			Circular.apply(this);
			for(var index = 0; index < this.array.length; index++)
				this.array[index] = 0;
		},

		Circular,

		{
			add: function(element) {
				this.total += element;
				this.length++;
				Circular.prototype.add.call(this, element);
			},

			lost: function(element) {
				this.total -= element;
				this.length--;
			},

			fps: function() {
				return 1 / (this.total / (this.length || 1));
			}

		});


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.FPS = FPS;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.models = this.models || {}));
