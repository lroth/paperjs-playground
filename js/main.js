/*
dlugos patha dynamiczna
offset + pol szerokosci przy liczeniu granicznych punktow
przechowanie offsetu w strukturze node a nie liczenie jej
jesli konczysz przesuwanie to uaktualnij to
to raster
*/

paper.install(window);

$(document).ready(function() {
	var options = {
		paperHelper : {
			offset 			: 5,
			dragMinimalDiff : 3,
			borders 		: { l : 140, r : 550, t : 200, b : 0 }
		},

		creator : {
			classPrefix : 'c_',

			draggableOptions : {
				revert 			: true,
				revertDuration  : 1
			}
		}
	};

	// paperHelper.initPaper();
	var creator 	= new Creator( options.creator );
	var paperHelper = new PaperHelper( options.paperHelper );

	creator.addBehaviours();
	creator.paperHelper = paperHelper;
	creator.paperHelper.initPaper();
});

var Creator = function(options) {
	this.current	 = null;
	this.paperHelper = null;

	this.options = options;

	this.addBehaviours = function() {
		//Inject stop listener first
		this.options.draggableOptions.stop 	= this.onDragStop;
		this.options.draggableOptions.start = this.onDragStart;
		this.addDraggable();
	};

	this.addDraggable = function() {
		$('#shapes-container div').draggable(
			this.options.draggableOptions
		);
	};

	this.onDragStart = function(event, ui) {
		this.current = this.options.classPrefix + $(ui.helper.context).attr('attr-size');
	}.bind(this);

	this.onDragStop = function(event, ui) {
		var position = { left : ui.offset.left, top : ui.offset.top };

		//before put we have to calc item size and add some offset to center the item.

		this.paperHelper.putNode( this.current, position );
		view.draw();
	}.bind(this);
};

var PaperHelper = function(options) {
	this.pathLength = 0;

	this.nodes		= [];
	this.current	= null;

	//create main path
	this.path = null;
	this.tool = null;

	this.nearestLocations = [];

	//bottom value will be counted (and despit it is bottom, value will be higher!)
	this.pathStartPoint = new Point(options.borders.l, options.borders.t);
	this.pathEndPoint	= new Point(options.borders.r, options.borders.t);

	this.initPaper = function() {
		paper.setup('canvas');

		this.path             = new Path();
		this.path.strokeColor = 'black';

		this.path.add(this.pathStartPoint);
		this.path.arcTo(this.pathEndPoint, false);

		this.pathLength 	  = parseInt(this.path.length);

		this.tool = new Tool();

		//EXPERIMENTAL - MAKE TEST FOR GOOD EFFECT
		this.tool.minDistance = 4;
		this.tool.maxDistance = 35;
		//this.tool.fixedDistance = 20;

		//EXTRA DRAG EVENTS
		//event.delta (distance beetwee)
		//event.middlePoint ( middle between event.lastPoint and event.point)
		//event.count

		this.tool.onMouseDrag = this.onMouseDrag.bind(this);
		this.tool.onMouseUp   = this.onMouseUp.bind(this);
		this.tool.onMouseDown = this.onMouseDown.bind(this);

		view.draw();
	},

	// var path = new Path.RegularPolygon(new Point(300, 170), 10, 150);
	// path.strokeColor = 'black';
	//on mouse drag - move node if we choose one
	this.onMouseDrag = function(event) {
		if (this.current !== null) {
			var p = this.path.getNearestPoint(event.middlePoint);

			//calculate tangens before move
			var offset         = this.path.getNearestLocation(this.current.position).offset;
			var tangent_before = this.path.getTangentAt(offset);

			//calculate tangens after move
			var offset        = this.path.getNearestLocation(p).offset;
			var tangent_after = this.path.getTangentAt(offset);

			//move
			if (offset > this.left_max && offset < this.right_max) {
				this.current.position = p;

				//rotate node
				this.current.rotate(tangent_after.angle - tangent_before.angle);
			};

		}
	};

	//clear current node on mouse release
	this.onMouseUp = function(event) {
		this.current = null;
	};

	//on mouse down create new node or select node below event point
	this.onMouseDown = function(event) {
		var point = event.point;

	    //check if we have node below current point
	    this.current = this.hitTestAll(point);

	    var current_offset = this.path.getNearestLocation(this.current.position).offset;

	    //ok lets try to find two nearest points before drag to detect collision
	    this.left_max  = 0;   //start arc path point
	    this.right_max = this.pathLength; //end arc path point - TODO: move this to options or better calc lenght on init!

	    var node_offset;

	    //go with nodes
	    for (var i = this.nodes.length - 1; i >= 0; i--) {
	    	//if not current node
	    	if (this.nodes[i] != this.current) {
	    		//get node from loop position on path
	    		node_offset = this.path.getNearestLocation(this.nodes[i].position).offset;

	    		//if on left side of current node
	    		if (node_offset > this.left_max && node_offset < current_offset) {
	    			//set left move border
	    			this.left_max = node_offset;
	    		};

	    		//if on right side of current node
	    		if (node_offset < this.right_max && node_offset > current_offset) {
	    			//set right move border
	    			this.right_max = node_offset;
	    		};
	    	};
	    };
	};

	this.putNode = function(current, point) {
		var raster      = new Raster(current);
		raster.position = this.path.getNearestPoint(new Point(point.left, point.top));

		this.nodes.push(raster);
	};

	this.hitTestAll = function(point) {
		//check if we have node below current point
		for (var i = this.nodes.length - 1; i >= 0; i--) {
			if (this.rasterHitTest(point, this.nodes[i])) {
				return this.nodes[i];
			}
		};

		return null;
	};

	this.rasterHitTest = function(point, node) {
		var area   = 0;

		//Affected points left, right, top, bottom
		var points = { l:0, r:0, t:0, b:0 };

		points.r = node.position.x + node.size.width;
		points.l = node.position.x - node.size.width;
		points.t = node.position.y + node.size.height;
		points.b = node.position.y - node.size.height;

		if((point.x > points.l && point.x < points.r) && (point.y > points.b && point.y < points.t)) {
			return true;
		}

		return false;
	};
}