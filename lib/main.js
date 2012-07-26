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
	offset	: 5
};

var paperHelper = {
	//preapare node container and current Point
	nodes	: [],
	current	: null,
	
	//create main path
	path 	: null,
	tool	: null,

	initPaper: function() {
		paper.setup('canvas');

		this.path             = new Path();
		this.path.strokeColor = 'black';

		this.path.add(new Point(140, 200));
		this.path.arcTo(new Point(550, 200), false);

		this.tool = new Tool();
		
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
			//calculate tangens before move
			var offset         = this.path.getNearestLocation(this.current.position).offset;
			var tangent_before = this.path.getTangentAt(offset);

			//move node to new position
			var p                 = this.path.getNearestPoint(event.point);
			this.current.position = p;

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
		var point = event.point;

		//check if we have node below current point
		for (var i = this.nodes.length - 1; i >= 0; i--) {
			if (this.nodes[i].hitTest(point, this.nodes, app.offset)) {
				this.current = this.nodes[i];
			}
		};
 
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
	}
};