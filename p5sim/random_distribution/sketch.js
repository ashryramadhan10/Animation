let randomCount = []
let numberOfBins = 10;
let binWidth = 0;

function setup() {
    createCanvas(1600, 900);

    // set to 0 for all bins first 0 - 9
    for (let i = 0; i < numberOfBins; i++) {
        randomCount[i] = 0;
    }

    // calculate bin width
    binWidth = (width / numberOfBins);

    background(255);
}

function draw() {
    background(255);

    // random pick index add 1 for each iteration
    randomCount[floor(random(numberOfBins))]++;
    console.log(randomCount);

    stroke(100);
    fill(150);

    for (let i = 0; i < numberOfBins; i++) {
        x = i * binWidth;
        rect(x, height - randomCount[i], binWidth - 1, randomCount[i]);
    }
}