class Agent {
    constructor(x, y, m) {
        this.pos = createVector(x, y);
        this.vel = createVector(random(-1, 1), random(-1, 1));
        this.acc = createVector(0, 0);
        this.mass = m;
        this.maxspeed = 3;
        this.maxforce = 0.2;
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

    align(vehicles) {
        let neighbourDist = 50;
        let sum = createVector(0, 0);
        let count = 0;

        for (let other of vehicles) {
            let d = p5.Vector.dist(this.pos, other.pos);
            if(d > 0 && d < neighbourDist) {
                sum.add(other.vel);
                count++;
            }
        }

        if (count > 0) {
            sum.div(float(count)); // means
            sum.normalize();
            sum.mult(this.maxspeed);
            
            let steer = p5.Vector.sub(sum, this.vel);
            steer.limit(this.maxforce);
            this.applyForce(steer);
        }
    }

    separation(vehicles) {
        let desiredSeparation = this.mass*3;
        let sum = createVector(0, 0);
        let count = 0;

        for (let other of vehicles) {
            let d = p5.Vector.dist(this.pos, other.pos);

            if (d > 0 && d < desiredSeparation) {
                // calculate vector pointing away from neighbour
                let diff = p5.Vector.sub(this.pos, other.pos);
                diff.normalize();
                diff.div(d); // proportion by distance, if the distance close enough the bigger the force
                sum.add(diff);
                count++;
            }
        }

        if (count > 0) {
            sum.div(count);
            sum.normalize();
            sum.mult(this.maxspeed);

            let steer = p5.Vector.sub(sum, this.vel);
            steer.limit(this.maxforce);
            this.applyForce(steer);
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
        fill(255, 100);
        stroke(255, 100);
        strokeWeight(2);
        push();
        translate(this.pos.x, this.pos.y);
        let angle = Math.atan2(this.vel.y, this.vel.x);
        rotate(angle);
        triangle(-this.mass, -this.mass / 2, -this.mass, this.mass / 2, this.mass, 0);
        pop();
    }

    run(vehicles) {
        this.separation(vehicles);
        this.align(vehicles);
        this.update();
        this.edges();
        this.display();
    }
}


let vehicles = [];

function setup() {
    createCanvas(500, 500);
    background(0);

    for (let i = 0; i < 20; i++) {
        vehicles[i] = new Agent(random(width), random(height), random(5, 10));
    }
}

function draw() {
    background(0);

    for (let vehicle of vehicles) {
        vehicle.run(vehicles);
    }
}

function mouseDragged(event) {
    let agent = new Agent(mouseX, mouseY, random(5, 10));
    vehicles.push(agent);
}