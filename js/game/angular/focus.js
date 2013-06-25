(function(root, exports) {


	/* -------------------------- ( Focus ) ---------------------------- */

	var Focus = {

		directive: function(element, $timeout) {
			$timeout(function() {
				element[0].focus();
			}, 1);
		}

	};



	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Focus = Focus;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.angular = this.angular || {}));
