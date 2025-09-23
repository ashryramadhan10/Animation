class Vehicle {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.vel = createVector(1, 0);
        this.acc = createVector(0, 0);
        this.maxspeed = 3;
        this.maxforce = 0.1; // this is really important property to make it looks more life-like movement
        this.r = 20;
        this.angle = 0;
        this.wanderTheta = PI / 2;
    }

    wander() {
       let wanderPoint = this.vel.copy();
       wanderPoint.setMag(100);
       wanderPoint.add(this.pos); // this.pos as the base for wanderPoint
       fill(255, 0, 0);
       circle(wanderPoint.x, wanderPoint.y, 16);

       let wanderRadius = 50;
       noFill();
       stroke(255);
       circle(wanderPoint.x, wanderPoint.y, wanderRadius*2);
       line(this.pos.x, this.pos.y, wanderPoint.x, wanderPoint.y);

       let theta = this.wanderTheta + this.vel.heading();
       let x = wanderRadius * cos(theta);
       let y = wanderRadius * sin(theta);
       wanderPoint.add(x, y);

       fill(0, 255, 0);
       circle(wanderPoint.x, wanderPoint.y, 16);
       line(this.pos.x, this.pos.y, wanderPoint.x, wanderPoint.y);

       let steer = wanderPoint.sub(this.pos);
       steer.setMag(this.maxforce);
       this.applyForce(steer);

       let displaceRange = 0.3;
       this.wanderTheta += random(-displaceRange, displaceRange);
    }

    evade(vehicle) {
        let pursuit = this.pursue(vehicle);
        pursuit.mult(-1);
        return pursuit;
    }

    pursue(vehicle) {
        let estimation = vehicle.pos.copy();
        let velocity = vehicle.vel.copy(); // prediction
        velocity.mult(10);

        estimation.add(velocity);
        // fill(0, 255, 0);
        // ellipse(estimation.x, estimation.y, 16);
        return this.seek(estimation);
    }

    flee(target) {
        return this.seek(target).mult(-1);
    }

    arrive(target) {
        // how fast the vehicle should move to the target
        let desired_force = p5.Vector.sub(target.pos, this.pos);
        let slowRadius = 100;
        let distance = desired_force.mag();

        if (distance < slowRadius) {
            let m = map(distance, 0, slowRadius, 0, this.maxspeed);
            desired_force.setMag(m);
        } else {
            desired_force.setMag(this.maxspeed);
        }

        let steering = p5.Vector.sub(desired_force, this.vel);
        steering.limit(this.maxforce);
        return steering;
    }

    seek(target) {
        // how fast the vehicle should move to the target
        let desired = p5.Vector.sub(target.pos, this.pos);
        desired.setMag(this.maxspeed);

        let steering = p5.Vector.sub(desired, this.vel);
        steering.limit(this.maxforce);
        // flee
        // steering.mult(-1);
        
        // this.applyForce(steering);
        return steering;
    }

    applyForce(force) {
        this.acc.add(force);
    }

    update() {
        this.vel.add(this.acc);
        this.vel.limit(this.maxspeed);
        this.pos.add(this.vel);
        this.acc.set(0, 0);
    }

    edges() {
        if (this.pos.x > width + this.r) {
            this.pos.x = -this.r;
        } else if (this.pos.x < -this.r) {
            this.pos.x = width + this.r;
        }
        if (this.pos.y > height + this.r) {
            this.pos.y = -this.r;
        } else if (this.pos.y < -this.r) {
            this.pos.y = height + this.r;
        }
    }

    show() {
        stroke(255);
        strokeWeight(2);
        fill(255, 100);
        push();
        translate(this.pos.x, this.pos.y);
        this.angle = this.vel.heading();
        rotate(this.angle);
        triangle(-this.r, -this.r/2, -this.r, this.r/2, this.r, 0);
        // this.drawArrow(createVector(0, 0), this.vel, 'blue');
        pop();
    }

    drawArrow(base, vec, myColor) {
        // push();
        stroke(myColor);
        strokeWeight(3);
        fill(myColor);
        // translate(base.x, base.y); // translate like changing frame

        let mag = Math.sqrt(vec.x * vec.x + vec.y * vec.y) + this.r*2;
        line(base.x, base.y, vec.x + mag, vec.y);

        // let arrowSize = 7;
        // translate(mag - arrowSize, 0); // translate frame again to the tip of the vector mag
        // triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0); // triangle use arrowSize, that's why need to substract by arrowSize
        // pop();
    }
}

class Target extends Vehicle {
    constructor(x, y) {
        super(x, y);
        this.vel = createVector(0, 0);
    }

    show() {
        stroke(255);
        strokeWeight(2);
        fill(255, 100);
        push();
        translate(this.pos.x, this.pos.y);
        circle(0, 0, this.r*2);
        pop();
    }
}