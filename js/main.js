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
				revertDuration  : 200
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
		this.paperHelper.putNode( this.current, position );
	}.bind(this);
};

var PaperHelper = function(options) {
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

		this.tool = new Tool();

		//EXPERIMENTAL - MAKE TEST FOR GOOD EFFECT
		this.tool.minDistance = 2;
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

			this.current.position = p;

			//calculate tangens before move
			var offset         = this.path.getNearestLocation(this.current.position).offset;
			var tangent_before = this.path.getTangentAt(offset);

			//calculate tangens after move
			var offset        = this.path.getNearestLocation(p).offset;
			var tangent_after = this.path.getTangentAt(offset);

			//rotate node
			this.current.rotate(tangent_after.angle - tangent_before.angle);
		}
	};

	//clear current node on mouse release
	this.onMouseUp = function(event) {
		this.current = null;
	};

	//on mouse down create new node or select node below event point
	this.onMouseDown = function(event) {
		var raster      = new Raster('c_35');
		raster.position = this.path.getNearestPoint(event.point);
	
		this.nodes.push(raster);

		// Find the tangent vector at the given offset:
		// var offset  = this.path.getNearestLocation(p).offset;
		// var tangent = this.path.getTangentAt(offset);
		// raster.rotate(tangent.angle);
	};

	this.putNode = function(current, point) {
		this.path.visible = false;
		var raster      = new Raster(current);
		raster.position = this.path.getNearestPoint(new Point(point));
		
		console.log(project.activeLayer.lastChild);
		
		this.nodes.push(raster);
	};

	this.getDragDiff = function(event) {
		this.dragDiff.x = event.x - this.current.position.x;
		if( this.dragDiff.x < 0 ) { this.dragDiff.x = this.dragDiff.x * (-1); }

		this.dragDiff.y = event.y - this.current.position.y;
		if( this.dragDiff.y < 0 ) { this.dragDiff.y = this.dragDiff.y * (-1); }
	};

	this.getDragDirection = function(toolObj) {
		//0 - left, 1 - right - more efficient
		return toolObj._lastPoint.x > toolObj._point.x ? 0 : 1;
	};

	this.hitTestAll = function(point, maxPoint) {
		//check if we have node below current point
		for (var i = this.nodes.length - 1; i >= 0; i--) {
			if (this.rasterHitTest(point, this.nodes[i], app.offset)) {
				return this.nodes[i];
			}
		};

		return null;
	};

	this.rasterHitTest = function(point, node, offset) {
		var area   = 0;

		//Affected points left, right, top, bottom
		var points = { l:0, r:0, t:0, b:0 };
		
		points.r = node.position.x + node.size.width - offset;
		points.l = node.position.x - node.size.width + offset;
		points.t = node.position.y + node.size.height - offset;
		points.b = node.position.y - node.size.height + offset;

		if((point.x > points.l && point.x < points.r) && (point.y > points.b && point.y < points.t)) {
			return true;
		}

		return false;
	};
}