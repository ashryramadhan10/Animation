// meanShift use addition to shift the mean into x value
// spreadCoef is a spreadness, how much we want to spread the distribution of our Gaussian Distribution

let meanShift = 800;
let spreadCoef = 1;

function setup() {
  createCanvas(1600, 900);

  background(0);
}

function draw() {
  noFill();
  stroke(255, 50);
  strokeWeight(1);
  let xloc = randomGaussian(0 + meanShift, 1 * spreadCoef);
  ellipse(xloc, height / 2, 50, 50);
}
