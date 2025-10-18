let cam1;
let cam2;
let target;
let xShift = -70;
let yShift = -90;

function setup() {
    createCanvas(800, 800);
    background(0);
    cam1 = createVector(20, height / 2 + height / 4);
    cam2 = createVector(width - 20, height / 2 + height / 4);
    target = createVector(width / 2 + xShift, height / 2 - height / 4 + yShift);
    angleMode(RADIANS);
}

function draw() {
    background(0);
    stroke(255);
    line(0, height / 2 + height / 4, width, height / 2 + height / 4);

    fill(255, 0, 0);
    stroke(255, 0, 0);
    circle(cam1.x, cam1.y, 16);
    noFill();
    circle(cam1.x, cam1.y, 64);

    fill(0, 255, 0);
    stroke(0, 255, 0);
    circle(cam2.x, cam2.y, 16);
    noFill();
    circle(cam2.x, cam2.y, 64);
    line(cam2.x, cam2.y, target.x, target.y);

    fill(0, 0, 255);
    stroke(255);
    circle(target.x, target.y, 16);
    stroke(255, 100);
    line(target.x, target.y, width / 2 + xShift, height / 2 + height / 4);

    stroke(255, 0, 0);
    let cam1_to_target_vec = p5.Vector.sub(target, cam1);
    line(cam1.x, cam1.y, cam1.x + cam1_to_target_vec.x, cam1.y + cam1_to_target_vec.y);
    stroke(255);
    fill(255);
    let cam2_to_target_vec = p5.Vector.sub(target, cam2);

    // --- Correct Angle and Distance Calculation ---
    let baseline_vec_L_to_R = p5.Vector.sub(cam2, cam1);
    let angleA = baseline_vec_L_to_R.angleBetween(cam1_to_target_vec);

    // For display, we can convert the correct radian angles to degrees.
    text("Angle A (deg): " + degrees(angleA).toFixed(2), cam1.x, cam1.y + 20);

    // We don't need angleB for the simplified formula, but we can show it for completeness
    let baseline_vec_R_to_L = p5.Vector.sub(cam1, cam2);
    let angleB = baseline_vec_R_to_L.angleBetween(cam2_to_target_vec);
    text("Angle B (deg): " + degrees(angleB).toFixed(2), cam2.x - 100, cam2.y + 20);

    let cam1_cam2_dist = p5.Vector.dist(cam1, cam2);
    text("L = " + cam1_cam2_dist, width / 2, height / 2 + height / 4 + 20);

    // With a symmetrical setup, the calculation is simple right-triangle trigonometry.
    // tan(angleA) = opposite / adjacent = d / (L/2)
    // This avoids the unstable formula entirely.
    // let d = (cam1_cam2_dist / 2) * tan(angleA);
    
    angleA = abs(angleA);
    angleB = abs(angleB);

    let d = cam1_cam2_dist * ((tan(angleA) * tan(angleB)) / (tan(angleA) + tan(angleB))); 
    text("d = " + d.toFixed(2), width / 2, height / 2 + height / 4 + 50);

    let real_d = p5.Vector.dist(target, createVector(width / 2, height / 2 + height / 4));
    text("real d = " + real_d, width / 2, height / 2 + height / 4 + 70);

    let cam1_cam2_mag = Math.sqrt(((cam1_cam2_dist / 2) * (cam1_cam2_dist / 2)) + (d * d))
    text("cam1 cam2 mag = " + cam1_cam2_mag, width / 2, height / 2 + height / 4 + 90);

}