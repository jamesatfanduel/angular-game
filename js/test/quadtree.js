(function(root) {

	var QuadTree	= require('../game/spatial/quadtree').QuadTree,
		Bounds		= require('../game/spatial/bounds').Bounds;

	window.onload = function() {

	var time = {
		sets: {}
	};

	time.start = function(name) {
		if (console.time) console.time(name);
		else{
			time.sets[name] = new Date().getTime();
		}
	};

	time.end = function(name) {
		if (console.timeEnd) {
			console.timeEnd(name);
		}else{
			if (!time.sets[name]) throw new Error("No such timer: " + name);
			var elapsed = new Date().getTime() - time.sets[name];
			var textNode = document.createTextNode(name + ': ' + elapsed + ' ms');
			var pre = document.createElement('pre');
			pre.appendChild(textNode);
			document.body.appendChild(pre);
		}
	};

	/* ------------------------------ ( INIT ) ------------------------------ */

	var ITEMS = 1000,
		bounds = [];

	function create() {
		function rnd(max) { return Math.round(Math.random() * max); }

		var x = rnd(1000), y = rnd(800), width = rnd(50) + 1, height =  rnd(50) + 1;
		return new Bounds(x, y, width, height);
	}

	var tree = new QuadTree(new Bounds(0, 0, 1050, 850));



	/* ---------------------------- ( POPULATE ) ---------------------------- */

	function populate() {
		time.start('Create QuadTree with ' + ITEMS + ' items');
		tree.clear();
		for(var index = 0; index < ITEMS; index++) {
			bounds[index] = create();
			tree.insert(bounds[index]);
		}
		time.end('Create QuadTree with ' + ITEMS + ' items');
	}

	root.populate = populate;

	populate();



	/* ----------------------------- ( SEARCH ) ----------------------------- */

	var result	= new Array(100),
		total	= 0,
		max		= -Infinity,
		min		= Infinity;

	time.start('Search QuadTree with ' + ITEMS + ' items');

	for(var index = 0; index < ITEMS; index++) {
		result.length = 0;
		tree.find(bounds[index], result);
		total += result.length;
		min = Math.min(min, result.length);
		max = Math.max(max, result.length);
	}

	time.end('Search QuadTree with ' + ITEMS + ' items');

	console.log("Average collision set size: %0.2f - %0.2f - %0.2f (%d items in %d tests)", min, total / ITEMS, max, total, ITEMS);
	window.testTree = tree;
	window.render = render;



	/* ----------------------------- ( RENDER ) ----------------------------- */

	var SVG = 'http://www.w3.org/2000/svg';

	function render(tree) {
		var root = document.createElementNS(SVG, 'svg');
		root.version = "1.1";
		root.style.width = "1050px";
		root.style.height = "850px";

		renderNode(tree);

		document.body.appendChild(root);

		function renderBounds(bounds) {
			var rect = document.createElementNS(SVG, 'rect');
			rect.setAttribute('x', bounds.x);
			rect.setAttribute('y', bounds.y);
			rect.setAttribute('width', bounds.width);
			rect.setAttribute('height', bounds.height);
			rect.style.fill = 'green';
			rect.style.opacity = '0.5';
			root.appendChild(rect);
			bounds.element = rect;
		}

		function renderNode(node) {
			if (!node) return;

			if (node.nw) {
				var h = document.createElementNS(SVG, 'line');
				h.setAttribute('x1', node.horizontal);
				h.setAttribute('x2', node.horizontal);
				h.setAttribute('y1', node.bounds.y);
				h.setAttribute('y2', node.bounds.y + node.bounds.height);
				h.style.stroke = 'red';
				h.style.strokeWidth = 8 / node.level;
				root.appendChild(h);

				var v = document.createElementNS(SVG, 'line');
				v.setAttribute('x1', node.bounds.x);
				v.setAttribute('x2', node.bounds.x + node.bounds.width);
				v.setAttribute('y1', node.vertical);
				v.setAttribute('y2', node.vertical);
				v.style.stroke = 'red';
				v.style.strokeWidth = 8 / node.level;
				root.appendChild(v);
			}

			renderNode(node.nw);
			renderNode(node.ne);
			renderNode(node.sw);
			renderNode(node.se);

			var children = node.children, len = children.length;
			for(var index = 0; index < len; index++) {
				renderBounds(children[index]);
			}
		}

	}

		render(tree);
	};

})(this);