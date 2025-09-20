let t1 = 0;
let t2 = 150;

function setup() {
    createCanvas(500, 500);
    background(0);
}

function draw() {
    background(0);

    stroke(127);
    strokeWeight(5);
    fill(200);
    let x = map(noise(t1), 0, 1, 0, width);
    let y = map(noise(t2), 0, 1, 0, height);
    ellipse(x, y, 64, 64);
    t1 += 0.02;
    t2 += 0.02;
}