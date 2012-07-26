
		//preapare node container and current Point
		var nodes   = [];
		var current = null;

		//create main path
		var path = new Path();
		path.strokeColor = 'black';
		path.add(new Point(140, 200));
		path.arcTo(new Point(550, 200), false);

		// var path = new Path.RegularPolygon(new Point(300, 170), 10, 150);
		// path.strokeColor = 'black';

		//on mouse drag - move node if we choose one
		function onMouseDrag(event) {
		    if (current !== null) {
		    	//calculate tangens before move
		    	var offset = path.getNearestLocation(current.position).offset;
				var tangent_before = path.getTangentAt(offset);

				//move node to new position
		    	var p = path.getNearestPoint(event.point);
		    	current.position = p;

				//calculate tangens after move
		    	var offset = path.getNearestLocation(p).offset;
				var tangent_after = path.getTangentAt(offset);

				//rotate node
				current.rotate(tangent_after.angle - tangent_before.angle);
		    }
		}

		//clear current node on mouse release
		function onMouseUp(event) {
			current = null;
		}

		//on mouse down create new node or select node below event point
		function onMouseDown(event) {
			//get current point
		    var point = event.point;

		    //check if we have node below current point
		    for (var i = nodes.length - 1; i >= 0; i--) {
				if (nodes[i].hitTest(point)) {
					current = nodes[i];
			    }
		    };

		    //if we select nothing - create new node
		    if (current === null) {
			  	//get nearest point
			  	var p = path.getNearestPoint(event.point);
	    		// var circle = new Path.Circle(p, 20);
				// circle.fillColor = new HsbColor(Math.random() * 360, 1, 1);
				// nodes.push(circle);
console.log(p);
				var node = new Path.RegularPolygon(p, 4, 20);
				node.fillColor = new HsbColor(Math.random() * 360, 1, 1);
				nodes.push(node);

				var offset = path.getNearestLocation(p).offset;
				// Find the tangent vector at the given offset:
				var tangent = path.getTangentAt(offset);
				node.rotate(tangent.angle);
				console.log(tangent.angle);
				// Make the tangent vector 60pt long:
				// tangent.length = 60;
		    };

		}