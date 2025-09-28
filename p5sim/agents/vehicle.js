class Vehicle {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.maxspeed = 3;
        this.maxforce = 0.1; // this is really important property to make it looks more life-like movement
        this.r = 10;
        this.angle = 0;
        this.wanderTheta = PI / 2;
        this.noiseXoff = 0;

        this.currentPath = [];
        this.paths = [this.currentPath];
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
        let desiredSeparation = this.r*3;
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

       let theta = noise(this.noiseXoff);
       let thetaMap = map(theta, 0, 1, 0, PI*2);
       let x = wanderRadius * cos(thetaMap) + wanderPoint.x;
       let y = wanderRadius * sin(thetaMap) + wanderPoint.y;
       
       let secondPoint = createVector(x, y);
       // wanderPoint.add(x, y);

       fill(0, 255, 0);
       circle(secondPoint.x, secondPoint.y, 16);
       line(this.pos.x, this.pos.y, secondPoint.x, secondPoint.y);

       let steer = secondPoint.sub(this.pos);
       steer.setMag(this.maxforce);
       this.applyForce(steer);

       let displaceRange = 0.3;
       this.wanderTheta += random(-displaceRange, displaceRange);

       this.noiseXoff += 0.01;
    }

    evade(vehicle) {
        let pursuit = this.pursue(vehicle);
        pursuit.mult(-1);
        return pursuit;
    }

    pursue(vehicle) {
        let target = vehicle.pos.copy();
        let prediction = vehicle.vel.copy();
        prediction.mult(10); // this is the prediction, current speed * 10

        target.add(prediction);
        fill(0, 255, 0);
        ellipse(target.x, target.y, 16);
        return this.seek(target);
    }

    flee(target) {
        return this.seek(target).mult(-1);
    }

    arrive(target) {
        // how fast the vehicle should move to the target
        let desired_force = p5.Vector.sub(target.pos, this.pos); // visualize this vector
        stroke(255);
        let vis_force = desired_force.copy();
        vis_force.setMag(50);
        line(this.pos.x, this.pos.y, vis_force.x + this.pos.x, vis_force.y + this.pos.y);

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

    follow(field) {
        let desired = field.lookup(this.pos);
        desired.setMag(this.maxspeed);

        let steering = p5.Vector.sub(desired, this.vel);
        steering.limit(this.maxforce);

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

        this.currentPath.push(this.pos.copy());
    }

    edges() {
        let hitEdge = false;
        if (this.pos.x > width + this.r) {
            this.pos.x = -this.r;
            hitEdge = true;
        } else if (this.pos.x < -this.r) {
            this.pos.x = width + this.r;
            hitEdge = true;
        }
        if (this.pos.y > height + this.r) {
            this.pos.y = -this.r;
            hitEdge = true;
        } else if (this.pos.y < -this.r) {
            this.pos.y = height + this.r;
            hitEdge = true;
        }

        if (hitEdge) {
            this.currentPath = [];
            this.paths.push(this.currentPath);
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
        
        // stroke(255, 0, 0, 100);
        // for (let path of this.paths) {
        //     beginShape();
        //     for (let v of path) {
        //         noFill();
        //         vertex(v.x, v.y);
        //     }
        //     endShape();
        // }
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

    run() {
        this.edges();
        this.update();
        this.show();
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