;(function(exports) {
  // creates lines and circles and starts the animation
  function start(canvas) {
    var screen = canvas.getContext('2d');

    var world = {
      circles: [],
      lines: [],
      dimensions: { x: canvas.width, y: canvas.height },
      lastCircleMade: 0
    };

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
      draw(world, screen);
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

    // occasionally make a circle
    var now = new Date().getTime();
    if (now - world.lastCircleMade > 400) {
      world.circles.push(makeCircle(world.dimensions.x / 2));
      world.lastCircleMade = now;
    }
  };

  function draw(world, screen) {
    // fill screen with white
    screen.fillStyle = "white";
    screen.fillRect(0, 0, world.dimensions.x, world.dimensions.y);

    var bodies = world.circles.concat(world.lines);
    for (var i = 0; i < bodies.length; i++) {
      bodies[i].draw(screen);
    }
  };

  function makeCircle(x) {
    return {
      center: { x: x, y: -7 },
      velocity: { x: 0, y: 0 },
      radius: 7,
      draw: function(screen) {
        screen.beginPath();
        screen.arc(this.center.x, this.center.y, this.radius, 0, Math.PI * 2, true);
        screen.closePath();
        screen.fillStyle = "black";
        screen.fill();
      }
    };
  };

  function makeLine(x, y) {
    return {
      center: { x: x, y: y },
      span: 80,
      angle: 0,
      rotateSpeed: 0.5,
      draw: function(screen) {
        var end1 = lineEndPoints(this)[0];
        var end2 = lineEndPoints(this)[1];

        screen.beginPath();
        screen.lineWidth = 2;
        screen.moveTo(end1.x, end1.y);
        screen.lineTo(end2.x, end2.y);
        screen.closePath();

        screen.strokeStyle = "black";
        screen.stroke();
      }
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
    var lineNormal = bounceNormal(circle, line);
    if (lineNormal === undefined) return; // line not touching circle - no bounce

    // set new circle velocity by reflecting old velocity in
    // the normal to the surface the circle is bouncing off
    var dot = dotProduct(circle.velocity, lineNormal);
    circle.velocity.x = circle.velocity.x - 2 * dot * lineNormal.x;
    circle.velocity.y = circle.velocity.y - 2 * dot * lineNormal.y;

    // move circle until outside line
    while (isCircleIntersectingLine(circle, line)) {
      moveCircle(circle);
    }
  };

  // if line intersecting circle, returns normal to use to bounce circle
  function bounceNormal(circle, line) {
    if (isCircleIntersectingLine(circle, line)) {
      return unitVector(vectorBetween(pointOnLineClosestToCircle(circle, line),
                                      circle.center));
    }
  };

  // move passed circle based on its current speed
  function moveCircle(circle) {
    // simulate gravity
    circle.velocity.y = circle.velocity.y + 2;

    // move according to current velocity
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
