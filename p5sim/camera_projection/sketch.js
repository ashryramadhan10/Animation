let points3D = [];
let focalLength = 100;
let cameraAngle = 0;
let cameraDistance = 300;
let autoRotate = false;
let viewMode = 'orbit'; // 'orbit', 'top'

function setup() {
    createCanvas(800, 600, WEBGL);
    
    // Create 3D points
    for (let i = 0; i < 6; i++) {
        points3D.push({
            x: random(-80, 80),
            y: random(-60, 60),
            z: random(50, 150)
        });
    }
}

function draw() {
    background(20);
    
    // Auto rotate if enabled
    if (autoRotate && viewMode === 'orbit') {
        cameraAngle += 0.01;
    }
    
    // Set camera based on view mode
    if (viewMode === 'top') {
        camera(0, -300, 0, 0, 0, 0, 0, 0, 1);
    } else {
        let camX = cos(cameraAngle) * cameraDistance;
        let camZ = sin(cameraAngle) * cameraDistance;
        camera(camX, 0, camZ, 0, 0, 0, 0, 1, 0);
    }
    
    // Draw coordinate axes
    strokeWeight(2);
    stroke(255, 0, 0); line(0, 0, 0, 100, 0, 0); // X-axis
    stroke(0, 255, 0); line(0, 0, 0, 0, 100, 0); // Y-axis
    stroke(0, 0, 255); line(0, 0, 0, 0, 0, 100); // Z-axis
    
    // Draw camera at origin
    push();
    fill(255, 255, 0);
    noStroke();
    sphere(5);
    pop();
    
    // Draw projection plane at focal length
    push();
    translate(0, 0, focalLength);
    fill(100, 100, 255, 100);
    stroke(255);
    strokeWeight(1);
    plane(200, 150);
    pop();
    
    // Draw 3D points and their projections
    for (let point of points3D) {
        // Draw 3D point
        push();
        translate(point.x, point.y, point.z);
        fill(255, 100, 100);
        noStroke();
        sphere(4);
        pop();
        
        // Calculate projection
        let projX = (focalLength * point.x) / point.z;
        let projY = (focalLength * point.y) / point.z;
        
        // Draw projected point on plane
        push();
        translate(projX, projY, focalLength);
        fill(100, 255, 100);
        noStroke();
        sphere(3);
        pop();
        
        // Draw projection line
        stroke(255, 255, 0, 150);
        strokeWeight(1);
        line(0, 0, 0, point.x, point.y, point.z);
        line(point.x, point.y, point.z, projX, projY, focalLength);
    }
    
    // UI
    push();
    camera(0, 0, 300, 0, 0, 0, 0, 1, 0);
    fill(255);
    textSize(12);
    text('Yellow: Camera\nRed: 3D Points\nGreen: Projections\nBlue: Image Plane', -width/2 + 10, -height/2 + 20);
    text('Controls:\n1: Front  2: Side  3: Top\nSPACE: Auto-rotate\nA/D: Focal length', -width/2 + 10, height/2 - 80);
    text('Auto-rotate: ' + (autoRotate ? 'ON' : 'OFF'), -width/2 + 10, height/2 - 20);
    pop();
}

function keyPressed() {
    if (key === 'a') focalLength += 10;
    if (key === 'd') focalLength -= 10;
    if (key === '1') {
        viewMode = 'orbit';
        cameraAngle = 0; // Front view
    }
    if (key === '2') {
        viewMode = 'orbit';
        cameraAngle = PI/2; // Side view
    }
    if (key === '3') {
        viewMode = 'top'; // Top view
    }
    if (key === ' ') autoRotate = !autoRotate;
    focalLength = constrain(focalLength, 30, 200);
}

// http://127.0.0.1:5500/p5sim/
// Press +/- to adjust focal length