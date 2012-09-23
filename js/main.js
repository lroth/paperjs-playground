paper.install(window);

$(document).ready(function () {
    var options = {
        paperHelper:{
            offset         :5,
            dragMinimalDiff:3,
            borders        :{ l:140, r:550, t:200, b:0 }
        },

        creator:{
            draggableOptions:{
                revert        :true,
                revertDuration:1
            }
        }
    };

    // paperHelper.initPaper();
    var creator = new Creator(options.creator);
    var paperHelper = new PaperHelper(options.paperHelper);

    creator.addBehaviours();

    //Little DI
    creator.paperHelper = paperHelper;
    creator.paperHelper.initPaper();
});

var Creator = function (options) {
    this.current = null;
    this.paperHelper = null;

    this.options = options;

    this.addBehaviours = function () {
        //Inject stop listener first
        this.options.draggableOptions.stop = this.onDragStop;
        this.options.draggableOptions.start = this.onDragStart;
        this.addDraggable();
        this.addToCanvasBtn();
    };

    this.addToCanvasBtn = function () {
        $('#to-png-button').click(this.onExportToCanvas);
    };

    this.addDraggable = function () {
        $('#shapes-container img').draggable(
            this.options.draggableOptions
        );
    };

    this.onDragStart = function (event, ui) {
        this.current = $(ui.helper.context).attr('id');
    }.bind(this);

    this.onDragStop = function (event, ui) {
        var position = { left:ui.offset.left, top:ui.offset.top };

        //before put we have to calc item size and add some offset to center the item.
        this.paperHelper.putNode(this.current, position);
        view.draw();
    }.bind(this);

    this.onExportToCanvas = function () {
        var canvas = $('#canvas');
        var img = canvas[0].toDataURL('image/png');
        var token = Math.random();

        $.post('ajax.php', {'image':img, 'token':token}, function (response) {
        });
        window.open('ajax.php?token=' + token);
    };
};

var PaperHelper = function (options) {
    this.nodeCounter = 1;
    this.pathLength = 0;

    this.dragDirect = null;
    this.dragSize = {};

    this.nodes = [];
    this.current = null;

    //create main path
    this.path = null;
    this.tool = null;

    this.nearestLocations = [];

    //bottom value will be counted (and despite it is bottom, value will be higher!)
    this.pathStartPoint = new Point(options.borders.l, options.borders.t);
    this.pathEndPoint = new Point(options.borders.r, options.borders.t);

    this.initPaper = function () {
        paper.setup('canvas');

        this.path = new Path();
        this.path.strokeColor = 'black';

        this.path.add(this.pathStartPoint);
        this.path.arcTo(this.pathEndPoint, false);

        this.pathLength = parseInt(this.path.length);

        this.tool = new Tool();
        this.tool.onMouseDrag = this.onMouseDrag.bind(this);
        this.tool.onMouseUp = this.onMouseUp.bind(this);
        this.tool.onMouseDown = this.onMouseDown.bind(this);

        view.draw();
    },

        //on mouse drag - move node if we choose one
        this.onMouseDrag = function (event) {
            if (this.current !== null) {
                this.setDragDirection(event);

                //And try to move
                this.checkAndMove(this.getMoveParams(this.current, event.point));
            }
        };

    //clear current node on mouse release
    this.onMouseUp = function (event) {
        if (this.dragDirect == null) {
            this.removeNode();
        }

        this.dragDirect = null;
        this.current = null;
    };

    //on mouse down create new node or select node below event point
    this.onMouseDown = function (event) {
        this.dragStartPoint = event.point;

        //check if we have node below current point
        this.current = this.hitTestAll(event.point);

        if (this.current == null) {
            return false;
        }
    };

    this.getNodeMax = function (node) {
        var max             = { left : 0, right : this.pathLength};
        var nodeIndex       = this.findInNodes(node.number);

        if(typeof this.nodes[nodeIndex - 1] !== "undefined") {
            max.left  = this.nodes[nodeIndex - 1].nodeOffset + (parseInt(this.nodes[nodeIndex - 1].width * 0.5) + parseInt(node.width * 0.5));
        }

        if(typeof this.nodes[nodeIndex + 1] !== "undefined") {
            max.right = this.nodes[nodeIndex + 1].offset - (parseInt(this.nodes[nodeIndex + 1].width * 0.5) + parseInt(node.width * 0.5));
        }

        return max;
    };

    this.getMoveParams = function (node, point) {
        var p   = this.path.getNearestPoint(point);
        var max = this.getNodeMax(node);

        var paramsBefore = this.calcMoveParams(null, node.nodeOffset);
        var paramsAfter  = this.calcMoveParams(p);

        return {
            point:p,

            offset :paramsAfter.offset,
            tangent:paramsAfter.tangent.angle - paramsBefore.tangent.angle,
            node   :node,

            left  : max.left,
            right : max.right
        };
    };

    this.checkAndMove = function (params, isRecursiveCall) {
        console.log('I should move now node ' + params.node.number);

        if(typeof isRecursiveCall === "undefined") {
            isRecursiveCall = false;
        }

        if (params.offset > params.left && params.offset < params.right) {
            console.log('And I move ' + params.node.number + ' from x: ' + params.node.position.x + ' to ' );

            params.node.position   = params.point;
            params.node.nodeOffset = params.offset;

            //rotate node
            params.node.rotate(params.tangent);
        }
        else if(!isRecursiveCall || (this.current.number !== params.node.number)) {
            console.log(' but I will move next node...');
            var pos = this.findInNodes(params.node.number) +
                ((params.offset > params.left) ? 1 : -1);

            if(typeof this.nodes[pos] !== "undefined") {
                //Count depend of direction...
                var moveDiff = {
                    x : (params.point.x - this.dragStartPoint.x),
                    y : (params.point.y - this.dragStartPoint.y)
                }

                //Normalize
                moveDiff.x = (moveDiff.x < 0) ? (moveDiff.x * (-1)) : (moveDiff.x);
                moveDiff.y = (moveDiff.y < 0) ? (moveDiff.y * (-1)) : (moveDiff.y);

                var modifier = (this.dragDirect == 'left') ? (-1) : (1);

//                console.log(moveDiff.x, 'moveDiff.x');
//                console.log(modifier, 'modifier');
//                console.log(this.nodes[pos].position.x, 'this.nodes[pos].position.x');
//                console.log(this.nodes[pos].position.x + (moveDiff.x * modifier), 'all this bullshit');

                var point = new Point(
                    this.nodes[pos].position.x + (moveDiff.x * modifier),
                    this.nodes[pos].position.y + (moveDiff.y * modifier)
                );

                console.log('...from NOW, and it will be node ' + this.nodes[pos].number + ' from ' + this.nodes[pos].position.x + ' to ' + point.x);
                this.checkAndMove(this.getMoveParams(this.nodes[pos], point), true);
            }
        }
    };

    this.setDragDirection = function (event) {
        this.dragDirect =
            (event.delta.x < 0) ? 'left' :
                (event.delta.x > 0 ) ? 'right' :
                    (typeof this.dragDirect !== "undefined") ? this.dragDirect : "left";
    };

    this.calcMoveParams = function (position, offset) {
        var params = {};
        params.offset = (typeof offset === "undefined") ? this.path.getNearestLocation(position).offset : offset;
        params.tangent = this.path.getTangentAt(params.offset);

        return params;
    };

    this.removeNode = function () {
        if (this.current !== null) {
            this.nodes.splice(this.findInNodes(this.current.number), 1);
            this.current.remove();
        }
    };

    this.findInNodes = function (nodeNumber) {
        for (var i = this.nodes.length - 1; i >= 0; i--) {
            if (this.nodes[i].number == nodeNumber) {
                return i;
            }
        }
    };

    this.putNode = function (current, point) {
        var raster = new Raster(current);
        var point = new Point(point.left, point.top);

        var offset = this.path.getNearestLocation(point).offset;
        raster.position     = this.path.getNearestPoint(point);
        raster.nodeOffset   = offset;

        // Find the tangent vector at the given offset:
        raster.rotate(this.path.getTangentAt(offset).angle);

        raster.number = this.nodeCounter;
        this.nodeCounter += 1;

        this.nodes.splice(this.getPositionInPath(raster), 0, raster);
    };

    this.getPathOffset = function (node) {
        return this.path.getNearestLocation(node.getPosition()).offset;
    };

    this.getPositionInPath = function (node) {
        for (var i = 0; i < this.nodes.length; i++) {
            if (this.getPathOffset(this.nodes[i]) > this.getPathOffset(node)) {
                return i;
            }
        }
    };

    this.hitTestAll = function (point) {
        //check if we have node below current point
        for (var i = this.nodes.length - 1; i >= 0; i--) {
            if (this.rasterHitTest(point, this.nodes[i])) {
                return this.nodes[i];
            }
        }
        ;

        return null;
    };

    this.rasterHitTest = function (point, node) {
        var area = 0;

        //Affected points left, right, top, bottom
        var points = { l:0, r:0, t:0, b:0 };

        points.r = node.position.x + node.size.width;
        points.l = node.position.x - node.size.width;
        points.t = node.position.y + node.size.height;
        points.b = node.position.y - node.size.height;

        if ((point.x > points.l && point.x < points.r) && (point.y > points.b && point.y < points.t)) {
            return true;
        }

        return false;
    };
}