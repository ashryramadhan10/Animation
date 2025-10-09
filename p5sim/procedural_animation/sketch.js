let jetBrainsMono;

class Anchor {
    constructor(x, y, size, hasRadius, isAnchor) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.maxspeed = 5;
        this.maxforce = 0.1;
        this.r = size;
        this.ringRadius = size * 8;
        this.hasRadius = hasRadius;
        this.isAnchor = isAnchor;
    }

    wander() {
        let currentVel = this.vel.copy();
        let futurePos = this.pos.copy();

        currentVel.mult(10);
        futurePos.add(currentVel);

        fill(0, 255, 0);
        circle(futurePos.x, futurePos.y, 16);
    }

    update() {
        if (this.isAnchor) {
            this.vel.x = 5;
        }
        this.vel.add(this.acc);
        this.vel.limit(this.maxspeed);
        this.pos.add(this.vel);

        this.acc.mult(0);
    }

    borders() {
        if (this.pos.x < -this.r) { this.pos.x = width + this.r; }
        if (this.pos.x > width + this.r) { this.pos.x = -this.r; }
        if (this.pos.y < -this.r) { this.pos.y = height + this.r; }
        if (this.pos.y > height + this.r) { this.pos.y = -this.r; }
    }

    render() {
        noFill();
        stroke(255);
        strokeWeight(3);
        drawingContext.setLineDash([1, 1]);

        // if (this.isAnchor) {
        //     this.pos.x = mouseX;
        //     this.pos.y = mouseY;
        // }

        circle(this.pos.x, this.pos.y, this.r);

        if (this.hasRadius) {
            stroke(255, 100);
            drawingContext.setLineDash([10, 10]);
            circle(this.pos.x, this.pos.y, this.ringRadius);
        }
    }

    arrowTo(otherAnchor) {
        let posVec = p5.Vector.sub(otherAnchor.pos, this.pos);
        let angle = posVec.heading();
        posVec.setMag(this.ringRadius / 2);

        otherAnchor.pos.x = this.pos.x + posVec.x;
        otherAnchor.pos.y = this.pos.y + posVec.y;

        push();
        translate(this.pos.x, this.pos.y);
        stroke(255, 100, 100);
        strokeWeight(3);
        drawingContext.setLineDash([1, 1]);
        line(0, 0, posVec.x, posVec.y);

        rotate(angle);
        let arrowSize = 5;
        translate(posVec.mag() - arrowSize, 0);
        triangle(-arrowSize, -arrowSize / 2, -arrowSize, arrowSize / 2, arrowSize, 0);
        pop();
    }

    run() {
        this.borders();
        this.update();
        this.render();
    }
}

let anchor;
let otherPoints = [];

function preload() {
    jetBrainsMono = loadFont('../../fonts/JetBrainsMono-Regular.ttf');
}

function setup() {
    createCanvas(1530, 710);
    background(0);
    textFont(jetBrainsMono);

    angleMode(RADIANS);

    anchor = new Anchor(width / 2, height / 2, 16, true, true);

    let sizes = [16, 16, 8, 8, 8, 6, 6, 4, 4];
    for (let i = 0; i < 9; i++) {
        otherPoints[i] = new Anchor(random(width), random(height), sizes[i], true, false);
    }
}

function draw() {
    background(0);
    
    anchor.run();
    anchor.arrowTo(otherPoints[0]);

    for (let i = 0; i < 9 - 1; i++) {
        otherPoints[i].run();
        otherPoints[i].arrowTo(otherPoints[i+1]);
    }
}