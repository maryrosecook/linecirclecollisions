;(function(exports) {
  // creates lines and circles and starts the animation
  function start(canvas) {
    var world = {
      circles: [],
      lines: [],
      dimensions: { x: canvas.width, y: canvas.height }
    };

    // make new circle every so often
    setInterval(function() {
      world.circles.push(makeCircle(world.dimensions.x / 2));
    }, 400);

    // make grid of lines
    for (var i = 1; i < 6; i++) {
      for (var j = 1; j < 6; j++) {
        world.lines.push(makeLine(i * 80, j * 80));
      }
    }
    world.lines.splice(10, 2); // throw away top center lines

    // move shapes, draw shapes
    function tick() {
      update(world);
      draw(world, canvas);
      requestAnimationFrame(tick); // queues next tick with browser
    };

    tick(); // start update/draw loop
  };
  exports.start = start; // make start function available to HTML page

  // rotates the lines, moves and bounces the circles
  function update(world) {
    for (var i = world.circles.length - 1; i >= 0; i--) {
      for (var j = 0; j < world.lines.length; j++) {
        bounceCircle(world.circles[i], world.lines[j]);
      }

      moveCircle(world.circles[i]);
      if (!isCircleInWorld(world.circles[i], world.dimensions)) {
        world.circles.splice(i, 1); // remove circles that have left screen
      }
    }

    for (var i = 0; i < world.lines.length; i++) {
      world.lines[i].angle += world.lines[i].rotateSpeed;
    }
  };

  function draw(world, canvas) {
    var ctx = canvas.getContext('2d');

    // fill screen with white
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, world.dimensions.x, world.dimensions.y);

    // draw circles
    for (var i = 0; i < world.circles.length; i++) {
      drawCircle(world.circles[i], ctx);
    }

    // draw lines
    for (var i = 0; i < world.lines.length; i++) {
      drawLine(world.lines[i], ctx);
    }
  };

  function makeCircle(x) {
    return {
      center: { x: x, y: -7 },
      velocity: { x: 0, y: 0 },
      radius: 7
    };
  };

  function makeLine(x, y) {
    return {
      center: { x: x, y: y },
      span: 80,
      angle: 0,
      rotateSpeed: 0.5
    };
  };

  function distance(point1, point2) {
    var x = Math.abs(point1.x - point2.x);
    var y = Math.abs(point1.y - point2.y);
    return Math.sqrt((x * x) + (y * y));
  };

  function magnitude(vector) {
    return Math.sqrt(vector.x * vector.x + vector.y* vector.y);
  };

  function unitVector(vector) {
    return {
      x: vector.x / magnitude(vector),
      y: vector.y / magnitude(vector)
    };
  };

  function dotProduct(vector1, vector2) {
    return vector1.x * vector2.x + vector1.y * vector2.y;
  };

  function vectorBetween(startPoint, endPoint) {
    return {
      x: endPoint.x - startPoint.x,
      y: endPoint.y - startPoint.y
    };
  };

  // returns the points at the two ends of the passed line
  function lineEndPoints(line) {
    var angleRadians = line.angle * 0.01745;
    var lineUnitVector = unitVector({
      x: Math.cos(angleRadians) * 0 - Math.sin(angleRadians) * -1,
      y: Math.sin(angleRadians) * 0 + Math.cos(angleRadians) * -1
    });

    return [{
      x: line.center.x + lineUnitVector.x * line.span / 2,
      y: line.center.y + lineUnitVector.y * line.span / 2
    }, {
      x: line.center.x - lineUnitVector.x * line.span / 2,
      y: line.center.y - lineUnitVector.y * line.span / 2
    }];
  };

  function drawLine(line, ctx) {
    var end1 = lineEndPoints(line)[0];
    var end2 = lineEndPoints(line)[1];

    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.moveTo(end1.x, end1.y);
    ctx.lineTo(end2.x, end2.y);
    ctx.closePath();

    ctx.strokeStyle = "black";
    ctx.stroke();
  };

  function drawCircle(circle, ctx) {
    ctx.beginPath();
    ctx.arc(circle.center.x, circle.center.y, circle.radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = "black";
    ctx.fill();
  };

  // returns point on passed line closest to passed circle
  function pointOnLineClosestToCircle(circle, line) {
    var lineEndPoint1 = lineEndPoints(line)[0];
    var lineEndPoint2 = lineEndPoints(line)[1];

    // vector representing line surface
    var lineUnitVector = unitVector(vectorBetween(lineEndPoint1, lineEndPoint2));

    // project vector between line end and circle along line to get
    // distance between end and point on line closest to circle
    var projection = dotProduct(vectorBetween(lineEndPoint1, circle.center),
                                lineUnitVector);

    if (projection <= 0) {
      return lineEndPoint1; // off end of line - end is closest point
    } else if (projection >= line.span) {
      return lineEndPoint2; // ditto
    } else {
      // part way along line - return that point
      return {
        x: lineEndPoint1.x + lineUnitVector.x * projection,
        y: lineEndPoint1.y + lineUnitVector.y * projection
      };
    }
  };

  function isCircleIntersectingLine(circle, line) {
    var closest = pointOnLineClosestToCircle(circle, line);
    var circleToLineDistance = distance(circle.center, closest);
    return circleToLineDistance < circle.radius;
  };

  // bounces circle off line
  function bounceCircle(circle, line) {
    if (!isCircleIntersectingLine(circle, line)) {
      return; // line not touching circle - no bounce
    }

    // get normal of surface to bounce circle off
    var closest = pointOnLineClosestToCircle(circle, line);
    var normal = unitVector(vectorBetween(closest, circle.center));

    // set new circle velocity by reflecting old velocity in
    // the normal to the surface the circle is bouncing off
    var dot = dotProduct(circle.velocity, normal);
    circle.velocity.x = circle.velocity.x - 2 * dot * normal.x;
    circle.velocity.y = circle.velocity.y - 2 * dot * normal.y;

    // move circle until outside line
    while (isCircleIntersectingLine(circle, line)) {
      moveCircle(circle);
    }
  };

  // move passed circle based on its current speed
  function moveCircle(circle) {
    circle.velocity.y = circle.velocity.y + 2;
    circle.center.x = circle.center.x + circle.velocity.x / 30;
    circle.center.y = circle.center.y + circle.velocity.y / 30;
  };

  function isCircleInWorld(circle, worldDimensions) {
    return circle.center.x > -circle.radius &&
      circle.center.x < worldDimensions.x + circle.radius &&
      circle.center.y > -circle.radius &&
      circle.center.y < worldDimensions.y + circle.radius;
  };
})(this);


// concepts will learn:
// - detecting line circle collisions
// - line normals
// - bouncing off arbitrarily angled surfaces
