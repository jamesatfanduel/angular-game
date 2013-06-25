(function(root, exports) {


	/* --------------------------- ( Reusable ) ----------------------------- */

	var Reusable = {

		apply: function(Type) {
			Type.chain = null;

			if (Type.length > 0) {
				throw new Error(
						'Reusable types must have a no argument constructor: '
						+ Type.name);
			}

			if (!Type.prototype.construct) {
				throw new Error(
						'Reusable types must have a construct() method: '
						+ Type.name);
			}

			Type.create = function() {
				var instance;
				if (Type.reusable) {
					instance = Type.reusable;
					Type.reusable = instance.reusable;
				}else{
					instance = new Type();
				}
				instance.construct.apply(instance, arguments);
				return instance;
			};

			Type.prototype.release = function() {
				this.reusable = Type.reusable;
				Type.reusable = this;
			};

		}
	};

	exports.Reusable = Reusable;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports : this.reusable = {}));
