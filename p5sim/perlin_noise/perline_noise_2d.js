let inc = 0.005;
let start = 0;

function setup() {
    createCanvas(500, 500);
    pixelDensity(1);
    noiseDetail(8, 0.5);
    background(255);
}

function draw() {
    background(255);

    let yoff = start;
    
    loadPixels();
    for (let y = 0; y < height; y++) {
        let xoff = 0;
        for (let x = 0; x < width; x++) {
            let index = (x + y * width) * 4;
            let r = noise(xoff, yoff) * 255;
            pixels[index+0] = r;
            pixels[index+1] = r;
            pixels[index+2] = r;
            pixels[index+3] = 255;

            xoff += inc;
        }
        yoff += inc;
    }
    start += inc;
    updatePixels();
}