let pursuer;
let target;

function setup() {
    createCanvas(500, 500);
    background(0);
    angleMode(RADIANS);
    pursuer = new Vehicle(width / 2, height / 2);
    // target = new Target(width / 2, height / 2);
}

function draw() {
    background(0);

    fill(255, 0, 0);
    noStroke();

    // let seek = pursuer.seek(target.pos);
    // pursuer.applyForce(seek);

    // let pursue_force = pursuer.arrive(target);
    // pursuer.applyForce(pursue_force);

    pursuer.wander();
    pursuer.update();
    pursuer.edges();
    pursuer.show();

    // let flee = target.flee(pursuer.pos);
    // target.applyForce(flee);
    // let evade_force = target.evade(pursuer);
    // target.applyForce(evade_force);
    
    // target.edges();
    // target.pos.x = mouseX;
    // target.pos.y = mouseY;
    // target.update();
    // target.show();

    // noLoop();
}