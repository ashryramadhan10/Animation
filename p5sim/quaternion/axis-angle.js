// --- Simulation Settings ---
// The point we want to rotate, defining the sphere's initial position
let pointToRotate; 
// The axis we will rotate around (must be a unit vector)
let rotationAxis;
// The angle of rotation, which will increase over time
let angle = 0;
// The radius of the sphere's orbit
let radius;

function setup() {
  createCanvas(600, 600, WEBGL);
  
  // Define the sphere's starting point in 3D space
  pointToRotate = createVector(200, 50, 0);
  
  // The radius is the distance from the center to our point
  radius = pointToRotate.mag();
  
  // Define the axis of rotation
  rotationAxis = createVector(1, 0, 0).normalize(); // Y-axis
}

function draw() {
  background(20);
  orbitControl(); // Allows you to drag the mouse to move the camera
  
  // --- New: Add lighting to the scene ---
  // Ambient light provides a soft, general illumination
  ambientLight(60, 60, 60);
  // Directional light adds highlights and shadows from a specific angle
  directionalLight(255, 255, 255, -1, -1, -1);
  
  // Draw the X, Y, and Z axes for a clear frame of reference
  drawAxes();

  // Draw the containing wireframe sphere
  push();
  noFill();
  stroke(100);
  strokeWeight(0.5);
  sphere(radius);
  pop();

  // --- Core Logic: Axis-Angle to Quaternion (Unchanged) ---
  const halfAngle = angle / 2.0;
  const sinHalfAngle = sin(halfAngle);
  
  const q = {
    w: cos(halfAngle),
    x: rotationAxis.x * sinHalfAngle,
    y: rotationAxis.y * sinHalfAngle,
    z: rotationAxis.z * sinHalfAngle
  };
  
  // Apply the Quaternion Rotation
  const rotatedPoint = rotatePointByQuaternion(pointToRotate, q);
  
  // --- Draw the Rotated Sphere ---
  push();
  translate(rotatedPoint.x, rotatedPoint.y, rotatedPoint.z);
  noStroke();
  // New: Use a shiny material to catch the light
  specularMaterial(255, 50, 50); 
  shininess(50);
  sphere(25); // This command has always drawn a sphere
  pop();
  
  // Increase the angle for the next frame to create animation
  angle += 0.02;
}

// --- Helper Functions (Unchanged) ---

function drawAxes() {
  strokeWeight(2);
  stroke(255, 0, 0);
  line(0, 0, 0, radius * 1.2, 0, 0);
  stroke(0, 255, 0);
  line(0, 0, 0, 0, radius * 1.2, 0);
  stroke(0, 0, 255);
  line(0, 0, 0, 0, 0, radius * 1.2);
}

function rotatePointByQuaternion(pointVec, q) {
  const p = { w: 0, x: pointVec.x, y: pointVec.y, z: pointVec.z };
  const q_inv = { w: q.w, x: -q.x, y: -q.y, z: -q.z };
  const temp = multiplyQuaternions(q, p);
  const final = multiplyQuaternions(temp, q_inv);
  return createVector(final.x, final.y, final.z);
}

function multiplyQuaternions(a, b) {
  let q = {};
  q.w = a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z;
  q.x = a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y;
  q.y = a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x;
  q.z = a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w;
  return q;
}