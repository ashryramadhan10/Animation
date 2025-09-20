function setup() {
  createCanvas(500, 500);
  background(50);
  angleMode(RADIANS);

  let base = createVector(0, 0);
  let v1 = createVector(100, 200);
  let v2 = createVector(200, 100);
  let v3 = v2.copy().sub(v1);
  let vtest = createVector(100, 200);
  
  drawArrow(base, v1, 'red');
  drawArrow(base, v2, 'blue');
  drawArrow(v1, v3, 'green');
  drawArrow(v2, vtest, 'yellow');
}

function drawArrow(base, vec, myColor) {
  push();
  stroke(myColor);
  strokeWeight(3);
  fill(myColor);
  translate(base.x, base.y); // translate like changing frame
  line(0, 0, vec.x, vec.y);
  let angle = Math.atan(vec.y / vec.x); // soh cah toa, toa = tan(theta) = o/a, arctan(o/a) = theta
  rotate(angle); // rotate the frame (axis)
  let arrowSize = 7;
  let mag = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
  translate(mag - arrowSize, 0); // translate frame again to the tip of the vector mag
  triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0); // triangle use arrowSize, that's why need to substract by arrowSize
  pop();
}