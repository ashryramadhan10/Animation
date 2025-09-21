class Attractor {
    constructor(x, y, m) {
        this.pos = createVector(x, y);
        this.mass = m;
        this.r = sqrt(this.mass) * 2;
    }

    attract(mover) {
        let force_direction = p5.Vector.sub(this.pos, mover.pos);
        let distanceSq = constrain(force_direction.magSq(), 100, 1000);

        let G = 5;
        let strength = G * (this.mass * mover.mass) / distanceSq;
        force_direction.setMag(strength);
        mover.applyForce(force_direction);
    }

    show() {
        fill(255, 0, 0);
        stroke(127);
        strokeWeight(5);
        ellipse(this.pos.x, this.pos.y, this.r*2);
    }
}