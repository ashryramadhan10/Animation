class Boid {
    constructor(x, y, r) {
        this.position = createVector(x, y);
        this.velocity = createVector(random(-2, 2), random(-2, 2));
        this.acceleration = createVector(0, 0);
        this.r = r;
        this.maxspeed = 3;
        this.maxforce = 0.01;
    }

    run(boids) {
        this.flock(boids);
        this.update();
        this.borders();
        this.render();  
    }

    applyForce(force) {
        this.acceleration.add(force);
    }

    flock(boids) {
        let sep = this.separate(boids);
        let ali = this.align(boids);
        let coh = this.cohesion(boids);

        sep.mult(3.5);
        ali.mult(1.5);
        coh.mult(1.5);

        this.applyForce(sep);
        this.applyForce(ali);
        this.applyForce(coh);
    }

    update() {
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxspeed);
        this.position.add(this.velocity);
        
        this.acceleration.mult(0);
    }

    borders() {
        if (this.position.x < -this.r) { this.position.x = width + this.r; }
        if (this.position.x > width + this.r) { this.position.x = -this.r; }
        if (this.position.y < -this.r) { this.position.y = height + this.r; }
        if (this.position.y > height + this.r) { this.position.y = -this.r; }
    }

    render() {
        let theta = Math.atan2(this.velocity.y, this.velocity.x);
        fill(175);
        stroke(0);
        push();
        translate(this.position.x, this.position.y);
        rotate(theta);
        triangle(-this.r, -this.r / 2, -this.r, this.r / 2, this.r, 0);
        pop();
    }

    separate(boids) {
        let separateDistance = this.r*5;
        let steer = createVector(0, 0);
        let count = 0;

        for (let otherBoid of boids) {
            let distance = p5.Vector.dist(this.position, otherBoid.position);

            if (distance > 0 && distance < separateDistance) {
                let force = p5.Vector.sub(this.position, otherBoid.position);
                force.normalize();
                force.div(distance);
                steer.add(force);
                count++;
            }
        }

        if (count > 0) {
            steer.div(count);

            if (steer.mag() > 0) {
                steer.normalize();
                steer.mult(this.maxspeed);
                steer.sub(this.velocity);
                steer.limit(this.maxforce);
            }
        }

        return steer;
    }

    align(boids) {
        let alignRadius = this.r*10;
        let steer = createVector(0, 0);
        let count = 0;

        for (let otherBoid of boids) {
            let distance = p5.Vector.dist(this.position, otherBoid.position);

            if (distance > 0 && distance < alignRadius) {
                let force = otherBoid.velocity.copy();
                force.normalize();
                force.div(distance);
                force.mult(this.maxspeed);
                steer.add(force);
                count++;
            }
        }

        if (count > 0) {

            if (steer.mag() > 0) {
                steer.div(count);
                steer.normalize();
                steer.mult(this.maxspeed);
                steer.sub(this.velocity);
                steer.limit(this.maxforce);
            }
        }

        return steer;
    }

    cohesion(boids) {
        let neighbourDist = this.r*10;
        let steer = createVector(0, 0);
        let count = 0;

        for (let otherBoid of boids) {
            let distance = p5.Vector.dist(this.position, otherBoid.position);

            if (distance > 0 && distance < neighbourDist) {
                steer.add(otherBoid.position);
                count++;
            }
        }

        if (count > 0) {
            
            if (steer.mag() > 0) {
                // implement seek here
                steer.div(count);
                
                let desired_vector = p5.Vector.sub(steer, this.position);
                desired_vector.normalize();
                desired_vector.mult(this.maxspeed);

                let final_steer = p5.Vector.sub(desired_vector, this.velocity);
                final_steer.limit(this.maxforce);

                steer = final_steer;
            }
        }

        return steer;
    }
}