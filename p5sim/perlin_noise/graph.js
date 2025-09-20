let inc = 0.01;
let start = 0;

function setup() {
    createCanvas(500, 500);
    background(0);
}

function draw() {
    background(0);

    noFill();
    beginShape();
    let t = start;
    for (let x = 0; x < width; x++) {
        stroke(255);
        // let y = noise(t) * height;
        let y = noise(t) * height * sin(t) + (height / 2);
        vertex(x, y);

        t += inc;
    }
    endShape();

    start += inc;
}