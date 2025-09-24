class Mover {
    constructor(x, y, m) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.mass = m;
        this.r = Math.sqrt(this.mass) * 2;
        this.w = this.mass;
    }

    applyForce(force) { // force should be a vector
        let f = p5.Vector.div(force, this.mass);
        this.acc.add(f);
    }

    friction() {
        let diff = height - (this.pos.y + this.r);

        if (diff < 1) {
            // get current vel as the input force for friction
            // normalize it to 1
            // then multiple it by -1 to inverse the force direction
            let friction_force = this.vel.copy();
            friction_force.normalize();
            friction_force.mult(-1);
            
            // use these variable for scale the friction friction_force again
            let mu = 0.1;
            let normal = this.mass;
            friction_force.setMag(mu * normal);

            // apply the friction_force
            this.applyForce(friction_force);
        }
    }

    drag() {
        // get current vel as the input force for drag
        // normalize it to 1
        // then multiple it by -1 to inverse the force direction
        let drag_force = this.vel.copy();
        drag_force.normalize();
        drag_force.mult(-1);

        let c = 0.3;
        let speed = this.vel.mag();
        let surfaceArea = this.w * 0.05;
        drag_force.setMag(c * speed * speed * 1);

        this.applyForce(drag_force);
    }

    // edges() {
    //     if (this.pos.y >= height - this.r) {
    //         this.pos.y = height - this.r;
    //         this.vel.y *= -1;
    //     } else if (this.pos.y <= this.r) {
    //         this.pos.y = this.r;
    //         this.vel.y *= -1;
    //     }

    //     if (this.pos.x >= width - this.r) {
    //         this.pos.x = width - this.r;
    //         this.vel.x *= -1;
    //     } else if (this.pos.x <= this.r) {
    //         this.pos.x = this.r;
    //         this.vel.x *= -1;
    //     }
    // }

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

    update() {
        // let mouse = createVector(mouseX, mouseY);
        // this.acc = p5.Vector.sub(mouse, this.pos); // get acceleration vector
        // this.acc.setMag(0.1);

        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.set(0, 0);
    }

    show() {
        stroke(255);
        strokeWeight(2);
        fill(255, 100);
        ellipse(this.pos.x, this.pos.y, this.r * 2);

        let vel_dir = this.vel.copy();
        let vel_mag = vel_dir.mag();
        vel_dir.mult(5);

        push();
        translate(this.pos.x, this.pos.y);
        strokeWeight(3);
        line(0, 0, vel_dir.x, vel_dir.y);
        fill(0, 255, 0);
        translate(vel_dir.x, vel_dir.y);
        rotate(vel_dir.heading());
        triangle(-vel_mag, -vel_mag/2, -vel_mag, vel_mag/2, vel_mag, 0);
        pop();
    }
}