(function(root, exports) {


	/* -------------------------- ( Circular ) ------------------------------ */

	function Circular(size) {
		this.array = new Array(size || 100);
		this.start = this.end = 0;
	}

	Circular.prototype = {

		next: function(index) {
			if (++index >= this.array.length) return 0;
			return index;
		},

		add: function(element) {
			this.end = this.next(this.end);
			if (this.end === this.start) {
				if (this.lost) this.lost(this.array[this.start]);
				this.start = this.next(this.start);
			}
			this.array[this.end] = element;
		},

		length: function(element) {
			if (this.end < this.start) {
				var len = this.array.length;
				return len - this.start + this.end;
			}else return this.end - this.start;
		}

	};


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Circular = Circular;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.models = this.models || {}));
