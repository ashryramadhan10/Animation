let movers = [];
let attractor;

function setup() {
    createCanvas(500, 500);

    for (let i = 0; i < 5; i++) {
        movers[i] = new Mover(random(width), 50, floor(random(30, 50)));
    }

    attractor = new Attractor(width / 2, height / 2, 100);
}

function draw() {
    background(0);

    attractor.show();

    for (let mover of movers) {

        // if (mouseIsPressed) {
        //     let wind = createVector(0.1, 0);
        //     mover.applyForce(wind);
        // }
    
        // let gravity = createVector(0, 0.2);
        // let weight = p5.Vector.mult(gravity, mover.mass);

        // mover.applyForce(weight);
        // mover.drag();
        // mover.friction();
        mover.update();
        // mover.edges();
        mover.show();

        attractor.attract(mover);
    }

}