class Walker {
    constructor() {
        this.x = width / 2;
        this.y = height / 2;
    }

    show() {
        stroke(0);
        point(this.x, this.y);
    }

    step() {
        let xstep = floor(random(3)) - 1;
        let ystep = floor(random(3)) - 1;
        this.x += xstep;
        this.y += ystep;
    }

    step2() {
        let x_dist = mouseX - this.x;
        let y_dist = mouseY - this.y;
        let total_dist = x_dist + y_dist;
        let x_prob = x_dist / total_dist;
        let y_prob = y_dist / total_dist;

        // left prob larger than 50 %
        if (x_dist < 0) {
            let r1 = random(1);
            if (r1 <= 0.5) {
                this.x--;
            } else {
                this.x += 0;
            }
        }

        if (x_dist > 0) {
            let r1 = random(1);
            if (r1 <= 0.5) {
                this.x++;
            } else {
                this.x += 0;
            }
        }

        if (y_dist < 0) {
            let r1 = random(1);
            if (r1 <= 0.5) {
                this.y--;
            } else {
                this.y += 0;
            }
        }

        if (y_dist > 0) {
            let r1 = random(1);
            if (r1 <= 0.5) {
                this.y++;
            } else {
                this.y += 0;
            }
        }
    }
}