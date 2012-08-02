/*
offset + pol szerokosci przy liczeniu granicznych punktow

przechowanie offsetu w strukturze node a nie liczenie jej
jesli konczysz przesuwanie to uaktualnij tenże offset
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
		this.addToCanvasBtn();
	};

	this.addToCanvasBtn = function() {
		$('#to-png-button').click(this.onExportToCanvas);
	};

	this.addDraggable = function() {
		$('#shapes-container img').draggable(
			this.options.draggableOptions
		);
	};

	this.onDragStart = function(event, ui) {
		this.current = $(ui.helper.context).attr('id');
	}.bind(this);

	this.onDragStop = function(event, ui) {
		var position = { left : ui.offset.left, top : ui.offset.top };
		
		//before put we have to calc item size and add some offset to center the item.
		this.paperHelper.putNode( this.current, position );
		view.draw();
	}.bind(this);

	this.onExportToCanvas = function() {
		var canvas 	= $('#canvas');
		var img 	= canvas[0].toDataURL('image/png');

		$('#preview').css('display', 'block');
		$('#preview').attr('src', img);

		var token = Math.random();

		$.post('ajax.php', {'image' : img, 'token' : token}, function(response) {});

		window.location.href = 'ajax.php?token=' + token;
	};
};

var PaperHelper = function(options) {
	this.nodeCounter= 1;
	this.pathLength = 0;
	this.isDraged 	= false;

	this.nodes		= [];
	this.current	= null;

	//create main path
	this.path = null;
	this.tool = null;

	this.nearestLocations = [];

	//bottom value will be counted (and despite it is bottom, value will be higher!)
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
			this.isDraged = true;

			var p = this.path.getNearestPoint(event.middlePoint);

			//calculate tangens before move
			var offset         = this.path.getNearestLocation(this.current.position).offset;
			var tangent_before = this.path.getTangentAt(offset);

			//calculate tangens after move
			var offset        = this.path.getNearestLocation(p).offset;
			var tangent_after = this.path.getTangentAt(offset);

			//move
			if (offset > this.left_max && offset < this.right_max) {
				this.current.position 	= p;
				this.current.nodeOffset = offset;

				//rotate node
				this.current.rotate(tangent_after.angle - tangent_before.angle);
			};

		}
	};

	//clear current node on mouse release
	this.onMouseUp = function(event) {
		if(!this.isDraged) {
			this.removeNode();
		}

		this.isDraged 	= false;
		this.current 	= null;
	};

	//on mouse down create new node or select node below event point
	this.onMouseDown = function(event) {
		var point = event.point;

	    //check if we have node below current point
	    this.current = this.hitTestAll(point);

	    if(this.current == null) {
	    	return false;
	    }
	    
	    var current_offset = this.current.nodeOffset;

	    //ok lets try to find two nearest points before drag to detect collision
	    this.left_max  = 0;   				//start arc path point
	    this.right_max = this.pathLength; 	//end arc path point

	    var node_offset;

	    //go with nodes
	    for (var i = this.nodes.length - 1; i >= 0; i--) {
	    	//if not current node
	    	if (this.nodes[i] != this.current) {
	    		//get node from loop position on path
	    		node_offset = this.nodes[i].nodeOffset;

	    		//if on left side of current node
	    		if (node_offset > this.left_max && node_offset < current_offset) {
	    			//set left move border
	    			this.left_max = node_offset + (parseInt(this.nodes[i].width * 0.5) + parseInt(this.current.width * 0.5));
	    		};

	    		//if on right side of current node
	    		if (node_offset < this.right_max && node_offset > current_offset) {
	    			//set right move border
	    			this.right_max = node_offset - (parseInt(this.nodes[i].width * 0.5) + parseInt(this.current.width * 0.5));
	    		};
	    	};
	    };
	};

	this.removeNode = function() {
		if(this.current !== null) {
			this.left_max  = 0;
			this.right_max = this.path.length;

			this.nodes.splice(this.findInNodes(this.current.number), 1);
			this.current.remove();	
		}
	};

	this.findInNodes = function(nodeNumber) {
		for (var i = this.nodes.length - 1; i >= 0; i--) {
			if(this.nodes[i].number == nodeNumber) {
				return i;
			}
		}
	};

	this.putNode = function(current, point) {
		var raster      = new Raster(current);
		var point 		= new Point(point.left, point.top);
		
		var offset        = this.path.getNearestLocation(point).offset;
		raster.position   = this.path.getNearestPoint(point);
		raster.nodeOffset = offset;

		// Find the tangent vector at the given offset:
 		var tangent = this.path.getTangentAt(offset);
 		raster.rotate(tangent.angle);

 		raster.number = this.nodeCounter;
 		this.nodeCounter += 1;

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