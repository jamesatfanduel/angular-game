include('../../module.js');


(function() {


	module('stratum.test').dependencies('stratum.extend', 'stratum.event');
	module('stratum');


	// Create the root Stratum namespace, if required.
	var root = this, Stratum = root.Stratum;	
	if (!Stratum) Stratum = root.Stratum = {};


	// Create the test sub namespace, to hold references to all of the component
	// classes.
	Stratum.test = {};


})();
