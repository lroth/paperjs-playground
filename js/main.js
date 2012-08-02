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
		var canvas = $('#canvas');
		var img    = canvas[0].toDataURL('image/png');
		var token  = Math.random();                                                 

		$.post('ajax.php', {'image' : img, 'token' : token}, function(response) {});
		window.open('ajax.php?token=' + token);
	};
};

var PaperHelper = function(options) {
	this.nodeCounter= 1;
	this.pathLength = 0;

	this.dragDirect = null;
	this.dragSize	= {};

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

		this.tool             = new Tool();
		this.tool.onMouseDrag = this.onMouseDrag.bind(this);
		this.tool.onMouseUp   = this.onMouseUp.bind(this);
		this.tool.onMouseDown = this.onMouseDown.bind(this);

		view.draw();
	},

	//on mouse drag - move node if we choose one
	this.onMouseDrag = function(event) {
		if (this.current !== null) {
			//Make direction and size of drag global for helper
			this.setDragSize(event);
			this.setDragDirection(event);
			
			//Prepare move params
			var p = this.path.getNearestPoint(event.middlePoint);

			var paramsBefore = this.calcMoveParams(null, this.current.nodeOffset);
			var paramsAfter  = this.calcMoveParams(p);
			
			//And try to move
			this.checkAndMove({
				position : p,
			
				offset  : paramsAfter.offset,  
				tangent : paramsAfter.tangent.angle - paramsBefore.tangent.angle,
				node 	: this.current
			});
		}
	};

	this.moveAnotherNode = function(node) {
		if(node !== null) {
			var positionPoint = { x : node.position.x, y : node.position.y };
			
			if(this.dragDirect == 'left') {
				positionPoint.x = positionPoint.x - this.dragSize.x;
			} else {
				positionPoint.y = positionPoint.y - this.dragSize.y;
			}

			var point 		 = new Point(positionPoint.x, positionPoint.y);
			var paramsBefore = this.calcMoveParams(null, node.nodeOffset);
			var paramsAfter  = this.calcMoveParams(point);

			var moveParams = {
				position : point,

				offset  : paramsAfter.offset,
				tangent : paramsAfter.tangent.angle - paramsBefore.tangent.angle,
				node 	: node,

				left 	: this.left_max,
				right 	: this.right_max
			};

			// this.checkAndMove(movePrams);
		}
	};

	this.findNearestNode = function(offset, currentNodeNumber) {
		var nearest = { nodeOffset : 0 , default : true };

	    for (var i = this.nodes.length - 1; i >= 0; i--) {
	    	if(this.nodes[i].number !== currentNodeNumber) {
	    		if(this.dragDirect == 'left') {
		    		if((this.nodes[i].nodeOffset < offset) && (nearest.nodeOffset > this.nodes[i].nodeOffset)) {
		    			nearest = this.nodes[i];
		    		}
		    	}
		    	else {
	    			if((this.nodes[i].nodeOffset > offset) && (nearest.nodeOffset < this.nodes[i].nodeOffset)) {
	    				nearest = this.nodes[i];
	    			}
		    	}	
	    	}
	    }

	    return (typeof nearest.default !== "undefined") ? null : nearest;
	};

	this.checkAndMove = function(params) {
		if (params.offset > params.left && params.offset < params.right) {
			params.node.position 	= params.position;
			params.node.nodeOffset 	= params.offset;

			//rotate node
			params.node.rotate(params.tangent);
		}
		else {
			this.moveAnotherNode(
				this.findNearestNode(params.offset, params.node.number)
			);
		}
	};

	this.setDragSize = function(event) {
		this.dragSize.x = event.tool._lastPoint.x - event.tool._point.x;
		if(this.dragSize.x < 0) { this.dragSize.x = this.dragSize.x * (-1); }

		this.dragSize.y = event.tool._lastPoint.y - event.tool._point.y;
		if(this.dragSize.y < 0) { this.dragSize.y = this.dragSize.y * (-1); }
	};

	this.setDragDirection = function(event) {
		//if last point x lower than point (start point), we are movin left
		this.dragDirect = ((event.tool._lastPoint.x - event.tool._point.x) < 0) ? 'left' : 'right';
	};

	this.calcMoveParams = function(position, offset) {
		var params = {};
		params.offset =  (typeof offset === "undefined")  ? this.path.getNearestLocation(position).offset : offset;
		params.tangent = this.path.getTangentAt(params.offset);

		return params;
	};


	//clear current node on mouse release
	this.onMouseUp = function(event) {
		if(this.dragDirect == null) {
			this.removeNode();
		}

		this.dragDirect 	= null;
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

			raster.number    = this.nodeCounter;
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