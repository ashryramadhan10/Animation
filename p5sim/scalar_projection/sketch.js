let a;
let b;
let start_point;

function setup() {
    createCanvas(500, 500);
    background(0);
    angleMode(DEGREES);

    a = createVector(100, -50);
    b = createVector(200, 100);
    start_point = createVector(width / 2, height / 2);

}

function draw() {
    background(0);

    a.x = mouseX;

    fill(0, 255, 0);
    noStroke();
    circle(start_point.x, start_point.y, 16);

    stroke(255);
    strokeWeight(3);
    line(start_point.x, start_point.y, a.x + start_point.x, a.y + start_point.y);
    line(start_point.x, start_point.y, b.x + start_point.x, b.y + start_point.y);

    let angle = getAngleBetween(a, b);
    textSize(16);
    text(angle, start_point.x, start_point.y + 30);

    let vec = scalarProjection(a, b);
    stroke(255, 0, 0);
    strokeWeight(5);
    line(start_point.x, start_point.y, vec.x + start_point.x, vec.y + start_point.y);
    circle(vec.x + start_point.x, vec.y + start_point.y, 16);

    stroke(255);
    strokeWeight(1);
    line(a.x + start_point.x, a.y + start_point.y, vec.x + start_point.x, vec.y + start_point.y);

}

function getAngleBetween(vecA, vecB) {
    let d = vecA.dot(vecB);
    return acos(d / (vecA.mag() * vecB.mag()));
}

function scalarProjection(vecA, vecB) {
    let b = vecB.copy();
    b.normalize();
    let sp = vecA.dot(b);
    b.setMag(sp);
    return b;
}