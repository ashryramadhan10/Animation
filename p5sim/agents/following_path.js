class Agent {
    constructor(x, y, m) {
        this.pos = createVector(x, y);
        this.vel = createVector(5, 0);
        this.acc = createVector(0, 0);
        this.mass = m;
        this.maxspeed = 5;
        this.maxforce = 0.1;
    }

    applyForce(force) {
        this.acc.add(force);
    }

    scalarProjection(vecA, vecB) {
        let a = vecA.copy();
        let b = vecB.copy();
        b.normalize();
        let sp = a.dot(b);
        b.setMag(sp);
        return b;
    }

    getNormalVectorOfLineSegment(currentPos, lineStartPos, lineEndPos) {
        let p = currentPos.copy();
        let a = lineStartPos.copy();
        let b = lineEndPos.copy();

        let ap = p5.Vector.sub(p, a);
        let ab = p5.Vector.sub(b, a);
        ab.normalize();
        ab.mult(ap.dot(ab));

        let normalPos = p5.Vector.add(a, ab);
        return normalPos;
    }

    pursue(path) {
        // pursue a vehicle based on future estimation
        let currentSpeed = this.vel.copy();
        let futurePos = this.pos.copy();
        let time = 50;
        currentSpeed.normalize();
        currentSpeed.mult(time); // just a prediction for 10 times in the future V * T = S
        futurePos.add(currentSpeed);
        
        // based on this future position of the vehicle itself it needs to project it to path
        let normalPos = createVector(0, 0);
        let target = createVector(0, 0);
        let closestDistance = 100000;
        for (let i = 0; i < path.points.length-1; i++) {
            let a = path.points[i];
            let b = path.points[i+1];

            let normalVec = this.getNormalVectorOfLineSegment(futurePos, a, b);

            // if the normalVec outside line a-b
            if (normalVec.x < a.x || normalVec.x > b.x) {
                normalVec = b.copy();
            }

            let distance = p5.Vector.dist(futurePos, normalVec);
            if (distance < closestDistance) {
                closestDistance = distance;
                normalPos = normalVec;

                // move a bit further along projected normal point on line segment
                let dir = p5.Vector.sub(b, a);
                dir.normalize();
                dir.mult(20);

                target = normalPos;
                target.add(dir);
            }
        }

        if (closestDistance > path.radius) {
            this.seek(target);
        }

        // Draw the debugging stuff
        if (true) {
            // Draw predicted future position
            stroke(255);
            fill(0);
            line(this.pos.x, this.pos.y, futurePos.x, futurePos.y);
            ellipse(futurePos.x, futurePos.y, 5, 5);

            // Draw normal position
            stroke(255);
            fill(0);
            ellipse(normalPos.x, normalPos.y, 5, 5);
            // Draw actual target (red if steering towards it)
            line(futurePos.x, futurePos.y, normalPos.x, normalPos.y);
            if (closestDistance > path.radius) fill(255, 0, 0);
            noStroke();
            ellipse(target.x, target.y, 8, 8);
        }
    }

    seek(vec) {
        // seek to desired vector
        let distance = p5.Vector.sub(vec, this.pos);
        distance.setMag(this.maxspeed);

        let steering = p5.Vector.sub(distance, this.vel);
        steering.limit(this.maxforce);

        this.applyForce(steering);
    }

    edges() {

        if (this.pos.x > width + this.mass) {
            this.pos.x = -this.mass;
        } else if(this.pos.x < -this.mass) {
            this.pos.x = width + this.mass;
        }
        
        if (this.pos.y > height + this.mass) {
            this.pos.y = -this.mass;
        } else if(this.pos.y < -this.mass) {
            this.pos.y = height + this.mass;
        }
    }

    update() {
        this.vel.add(this.acc);
        this.vel.limit(this.maxspeed);
        this.pos.add(this.vel);
        this.acc.mult(0, 0);
    }

    display() {
        fill(255, 0, 0);
        stroke(255, 0, 0);
        strokeWeight(2);
        push();
        translate(this.pos.x, this.pos.y);
        let angle = Math.atan2(this.vel.y, this.vel.x);
        rotate(angle);
        triangle(-this.mass, -this.mass / 2, -this.mass, this.mass / 2, this.mass, 0);
        pop();
    }

    run() {
        this.update();
        this.edges();
        this.display();
    }
}

class Path {
    constructor() {
        this.points = [];
        this.radius = 20;
    }

    addPoint(x, y) {
        let point = createVector(x, y);
        this.points.push(point);
    }

    getStart() {
        return this.points[0];
    }

    getEnd() {
        return this.points[this.points.length-1];
    }

    display() {
        stroke(255, 100);
        strokeWeight(this.radius * 2);
        noFill();
        beginShape();
        for (let point of this.points) {
            vertex(point.x, point.y);
        }
        endShape();

        stroke(255);
        strokeWeight(1);
        noFill();
        beginShape();
        for (let point of this.points) {
            vertex(point.x, point.y);
        }
        endShape();
    }

    run() {
        this.display();
    }
}

let agent;
let path;

function setup() {
    createCanvas(1600, 720);
    agent = new Agent(width / 2, height / 2, 15);
    newPath();
    background(0);
}

function draw() {
    background(0);

    path.run();

    agent.pursue(path);
    agent.run();

    // noLoop();
}

function newPath() {
  // A path is a series of connected points
  // A more sophisticated path might be a curve
  path = new Path();
  path.addPoint(-20, height/2);
  path.addPoint(random(0, width/2), random(0, height));
  path.addPoint(random(width/2, width), random(0, height));
  path.addPoint(width+20, height/2);
}