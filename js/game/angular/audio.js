(function(root, exports) {


	/* ---------------------------- ( Audio ) ------------------------------- */

	function Audio(count) {
		count = count || 50;
		var container = this.container = document.createElement('div');
		container.className = 'audio';
		var available = this.available = new Array(count);
		for(var index = 0; index < count; index++) {
			var tag = document.createElement('audio');
			
			function event(tag) {
				angular.element(tag).bind('ended', function() {
					available.push(tag);
				});
			}

			event(tag);
			container.appendChild(tag);
			available.push(tag);
		}
		document.body.appendChild(container);
	}

	Audio.prototype = {

		precache: function(urls) {
			for(var name in urls) {
				if (!urls.hasOwnProperty(name)) continue;
				var url = urls[name],
					tag = document.createElement('audio');

				tag.preload	= true;
				tag.src		= url;
				this.container.appendChild(tag);
			} 
		},

		play: function(url, volume, rate) {
			var tag = this.available.pop();
			if (!tag) return false;
			tag.src				= url;
			tag.volume			= volume || 1;
			tag.playbackRate	= rate || 1;
			tag.play();
			return true;
		}

	};


	/* -------------------------- ( PROVIDER ) ------------------------------ */

	var audio = null;

	Audio.provider = function() {
		if (!audio) {
			audio = new Audio();
		}
		return audio;
	};


	/* --------------------------- ( EXPORTS ) ------------------------------ */

	exports.Audio = Audio;


})(this, typeof exports !== 'undefined' ? exports
		: (typeof module !== 'undefined' ? module.exports
				: this.models = this.models || {}));
