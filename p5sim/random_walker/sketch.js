let walker;

function setup() {
    createCanvas(500, 500);
    walker = new Walker();
    background(255);
}

function draw() {
    walker.step();
    walker.show();  
}