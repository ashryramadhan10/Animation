class Quaternion {
  constructor(w, x, y, z) {
    this.w = w;
    this.x = x;
    this.y = y;
    this.z = z;
  }

  multiply(q) {
    return new Quaternion(
      this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z,
      this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
      this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
      this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w
    );
  }

  conjugate() {
    return new Quaternion(this.w, -this.x, -this.y, -this.z);
  }

  rotateVector(v) {
    const qv = new Quaternion(0, v.x, v.y, v.z);
    const result = this.multiply(qv).multiply(this.conjugate());
    return createVector(result.x, result.y, result.z);
  }

  static lerp(q1, q2, t) {
    return new Quaternion(
      lerp(q1.w, q2.w, t),
      lerp(q1.x, q2.x, t),
      lerp(q1.y, q2.y, t),
      lerp(q1.z, q2.z, t)
    );
  }
}

let t = 0;
// Edit these values to change quaternions
let q1_w, q1_x, q1_y, q1_z;      // First quaternion 0 degree
// let q2_w = -0.92, q2_x = 0.38, q2_y = 0.0, q2_z = 0.0;      // Second quaternion
let q2_w, q2_x, q2_y, q2_z;      // Second quaternion

function setup() {
  createCanvas(800, 600, WEBGL);
  angleMode(RADIANS);

  angle = PI/4;
  q1_w = 1.0; q1_x = 0.0; q1_y = 0.0; q1_z = 0.0;
  q2_w = cos(angle*0.5); q2_x = sin(angle*0.5); q2_y = sin(angle*0.5); q2_z = sin(angle*0.5);

}

function draw() {
  background(20);
  orbitControl();
  
  t = (sin(frameCount * 0.02) + 1) / 2;
  
  const q1 = new Quaternion(q1_w, q1_x, q1_y, q1_z);
  const q2 = new Quaternion(q2_w, q2_x, q2_y, q2_z);
  const currentQ = Quaternion.lerp(q1, q2, t); // at t time, q1 will be rotate to q2, because the animation already divided by t in lerp
  
  drawAxes();
  
  push();
  applyQuaternionRotation(currentQ);
  drawCube();
  pop();
}

function applyQuaternionRotation(q) {
  // axis for doing the rotation
  const x = createVector(1, 0, 0);
  const y = createVector(0, 1, 0);
  const z = createVector(0, 0, 1);
  
  // do rotation
  const rx = q.rotateVector(x);
  const ry = q.rotateVector(y);
  const rz = q.rotateVector(z);
  
  // apply matrix
  applyMatrix(
    rx.x, ry.x, rz.x, 0,
    rx.y, ry.y, rz.y, 0,
    rx.z, ry.z, rz.z, 0,
    0, 0, 0, 1
  );
}

function drawCube() {
  stroke(255);
  strokeWeight(2);
  noFill();
  box(100);
  
  fill(255, 100, 100, 100);
  noStroke();
  push();
  translate(0, 0, 50);
  plane(100, 100);
  pop();
}

function drawAxes() {
  strokeWeight(3);
  stroke(255, 0, 0); line(0, 0, 0, 100, 0, 0);
  stroke(0, 255, 0); line(0, 0, 0, 0, 100, 0);
  stroke(0, 0, 255); line(0, 0, 0, 0, 0, 100);
}

