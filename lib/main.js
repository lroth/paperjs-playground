paper.install(window);

$(document).ready(function() {
	paperHelper.initPaper();

	$('#shapes-container').delegate('div', 'click', function() {
		$('.shape').removeClass('selected');

		$(this).addClass('selected');
		app.current = $(this).attr('attr-size');
	});
});

var app = {
	current : null,
	offset	: 5,

	borders : { l : 140, r : 550, t : 200, b : 0 },
	dragMinimalDiff : 3
};

var paperHelper = {
	//preapare node container and current Point
	nodes	: [],
	current	: null,
	
	//create main path
	path 	: null,
	tool	: null,

	//bottom value will be counted (and despit it is bottom, value will be higher!)
	


	pathStartPoint  : new Point(app.borders.l, app.borders.t),
	pathEndPoint	: new Point(app.borders.r, app.borders.t),

	//dragDiff : { x : 0, y : 0},

	nearestLocations : [],

	initPaper: function() {
		paper.setup('canvas');

		this.path             = new Path();
		this.path.strokeColor = 'black';

		this.path.add(this.pathStartPoint);
		this.path.arcTo(this.pathEndPoint, false);

		this.tool = new Tool();

		//EXPERIMENTAL - MAKE TEST FOR GOOD EFFECT
		//this.tool.minDistance = 1;
		//this.tool.maxDistance = 50;
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
	onMouseDrag: function(event) {
		if (this.current !== null) {
			var p = this.path.getNearestPoint(event.middlePoint);

			//Oops, something already here
			 if(this.hitTestAll(p) !== null) {
				return false;
			 }

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
	},

	//clear current node on mouse release
	onMouseUp: function(event) {
		this.current = null;
	},

	//on mouse down create new node or select node below event point
	onMouseDown: function(event) {
		//No shape selected - stop event
		if(app.current === null) {
			return;
		}

		//get current point
		var point    = event.point;
		this.current = this.hitTestAll(point);
 
		//if we select nothing - create new node
		if (this.current === null) {
			//get nearest point
			var p = this.path.getNearestPoint(event.point);

			var raster      = new Raster('c_' + app.current);
			raster.position = p;

			this.nodes.push(raster);

			// Find the tangent vector at the given offset:
			var offset  = this.path.getNearestLocation(p).offset;
			var tangent = this.path.getTangentAt(offset);
			raster.rotate(tangent.angle);
			// Make the tangent vector 60pt long:
			// tangent.length = 60;
		};
	},

	getDragDiff : function(event) {
		this.dragDiff.x = event.x - this.current.position.x;
		if( this.dragDiff.x < 0 ) { this.dragDiff.x = this.dragDiff.x * (-1); }

		this.dragDiff.y = event.y - this.current.position.y;
		if( this.dragDiff.y < 0 ) { this.dragDiff.y = this.dragDiff.y * (-1); }
	},

	getDragDirection : function(toolObj) {
		//0 - left, 1 - right - more efficient
		return toolObj._lastPoint.x > toolObj._point.x ? 0 : 1;
	},


	hitTestAll : function(point, maxPoint) {
		//check if we have node below current point
		for (var i = this.nodes.length - 1; i >= 0; i--) {
			if (this.rasterHitTest(point, this.nodes[i], app.offset)) {
				return this.nodes[i];
			}
		};

		return null;
	},

	rasterHitTest : function(point, node, offset) {
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
	}
};