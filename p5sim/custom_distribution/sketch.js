let randomCount = [];
let numberOfBins = 10;
let binWidth = 0;

let formula = [];

function setup() {
    createCanvas(1600, 900);

    // set to 0 for all bins first 0 - 9
    for (let i = 0; i < numberOfBins; i++) {
        randomCount[i] = 0;
    }

    // set formula
    for (let i = 0; i <= numberOfBins; i++) {
        formula[i] = pow(i, 2);
    }

    // calculate bin width
    binWidth = (width / numberOfBins);

    background(255);
}

function draw() {
    background(255);

    // pick first random from formula
    let index = floor(random(formula.length));
    let r1 = formula[index];
    let r2 = random(formula);

    console.log("r1: " + r1 + ", r2: " + r2);

    if (r2 < r1) {
        randomCount[index]++;
    }

    stroke(100);
    fill(150);

    for (let i = 0; i < numberOfBins; i++) {
        x = i * binWidth;
        rect(x, height - randomCount[i], binWidth - 1, randomCount[i]);
    }
}