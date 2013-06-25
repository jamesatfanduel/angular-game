(function(root, exports) {


	/* -------------------------- ( Viewport ) ------------------------------ */

	function Viewport($window) {
		var viewport = this;

		function update() {
			var size = viewport.size();
			viewport.width	= size.width;
			viewport.height	= size.height;
		}
		angular.element($window).bind('resize', function() {
			update();
		});
		update();
	}

	Viewport.prototype = {

		// From the comp.lang.javascript FAQ
		size: (function() {
			var docEl = document.documentElement,
				IS_BODY_ACTING_ROOT = docEl && docEl.clientHeight === 0;

			// Used to feature test Opera returning wrong values 
			// for documentElement.clientHeight. 
			function isDocumentElementHeightOff () { 
				var d = document,
					div = d.createElement('div');
					div.style.height = "2500px";
				d.body.insertBefore(div, d.body.firstChild);
				var r = d.documentElement.clientHeight > 2400;
				d.body.removeChild(div);
				return r;
			}

			if (typeof document.clientWidth == "number") {
				return function () {
					return { width: document.clientWidth, height: document.clientHeight };
				};
			}else if (IS_BODY_ACTING_ROOT || isDocumentElementHeightOff()) {
				var b = document.body;
				return function () {
					return { width: b.clientWidth, height: b.clientHeight };
				};
			}else{
				return function () {
					return { width: docEl.clientWidth, height: docEl.clientHeight };
				};
			}

		})(),

	};


	/* --------------------------- ( Provider ) ------------------------------ */

	var viewport = null;

	Viewport.provider = function($window) {
		if (viewport === null) {
			viewport = new Viewport($window);
		}
		return viewport;
	};


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Viewport = Viewport;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.models = this.models || {}));
