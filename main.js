;(function(exports) {
  // creates lines and circles and starts the animation
  function start(canvas) {
    // make new circle every so often
    var circles = [];
    setInterval(function() {
      circles.push(makeCircle(canvas));
    }, 400);

    // make grid of lines
    var lines = [];
    for (var i = 1; i < 6; i++) {
      for (var j = 1; j < 6; j++) {
        lines.push(makeLine(i * 80, j * 80, i * j));
      }
    }
    lines.splice(10, 2); // throw away top center lines

    // start update/draw loop
    function tick() {
      update(circles, lines, canvas);
      draw(circles, lines, canvas);
      requestAnimationFrame(tick);
    };

    tick();
  };
  exports.start = start; // make start function available to HTML page

  // rotates the lines, moves and bounces the circles
  function update(circles, lines, canvas) {
    for (var i = circles.length - 1; i >= 0; i--) {
      for (var j = 0; j < lines.length; j++) {
        bounceCircle(circles[i], lines[j]);
      }

      moveCircle(circles[i]);
      if (!isCircleOnCanvas(circles[i], canvas)) {
        circles.splice(i, 1); // remove circles that have left screen
      }
    }

    for (var i = 0; i < lines.length; i++) {
      lines[i].angle += lines[i].rotateSpeed;
    }
  };

  function draw(circles, lines, canvas) {
    var ctx = canvas.getContext('2d');

    // fill screen with white
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw circles
    for (var i = 0; i < circles.length; i++) {
      drawCircle(circles[i], ctx);
    }

    // draw lines
    for (var i = 0; i < lines.length; i++) {
      drawLine(lines[i], ctx);
    }
  };

  function makeCircle(canvas) {
    var radius = 7;
    return {
      center: {
        x: canvas.width / 2, // center x coordinate
        y: -radius + 1, // center y coordinate
      },
      velocity: { x: 0, y: 0 },
      radius: radius
    };
  };

  function makeLine(x, y) {
    return {
      center: { x: x, y: y },
      span: 40,
      angle: Math.random() * 360,
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

  // returns the points at the two ends of the passed line
  function lineEnds(line) {
    var angleRadians = line.angle * 0.01745;
    var lineVector = unitVector({
      x: Math.cos(angleRadians) * 0 - Math.sin(angleRadians) * -1,
      y: Math.sin(angleRadians) * 0 + Math.cos(angleRadians) * -1
    });

    return [{
      x: line.center.x + lineVector.x * line.span / 2,
      y: line.center.y + lineVector.y * line.span / 2
    }, {
      x: line.center.x - lineVector.x * line.span / 2,
      y: line.center.y - lineVector.y * line.span / 2
    }];
  };

  function drawLine(line, ctx) {
    var end1 = lineEnds(line)[0];
    var end2 = lineEnds(line)[1];

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
    var lineEnd1 = lineEnds(line)[0];
    var lineEnd2 = lineEnds(line)[1];

    // vector representing line surface
    var lineVector = {
      x: lineEnd2.x - lineEnd1.x,
      y: lineEnd2.y - lineEnd1.y
    };
    var lineUnitVector = unitVector(lineVector);

    var lineEnd1ToCircle = {
      x: circle.center.x - lineEnd1.x,
      y: circle.center.y - lineEnd1.y
    };

    // project vector between line end and circle along
    // line to get distance between end and point
    // on line closest to circle
    var projection = dotProduct(lineEnd1ToCircle, lineUnitVector);

    if (projection <= 0) {
      return lineEnd1; // off end of line - end is closest point
    } else if (projection >= magnitude(lineVector)) {
      return lineEnd2; // ditto
    } else {
      // part way along line - return that point
      return {
        x: lineEnd1.x + lineUnitVector.x * projection,
        y: lineEnd1.y + lineUnitVector.y * projection
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
    var normal = unitVector({
      x: circle.center.x - closest.x,
      y: circle.center.y - closest.y
    });

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

  function isCircleOnCanvas(circle, canvas) {
    return circle.center.x > -circle.radius &&
      circle.center.x < canvas.width + circle.radius &&
      circle.center.y > -circle.radius &&
      circle.center.y < canvas.height + circle.radius;
  };
})(this);


// concepts will learn:
// - detecting line circle collisions
// - line normals
// - bouncing off arbitrarily angled surfaces
