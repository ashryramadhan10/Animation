class FlowField {
    constructor(rows, cols, resolution) {
        this.rows = rows;
        this.cols = cols;
        this.resolution = resolution;
        this.field = [];
        this.inc = 0.1;
    }

    init() {
        noiseSeed(floor(random(10000)));
        let xoff = 0;
        for (let x = 0; x < this.cols; x++) {
            let yoff = 50;
            for (let y = 0; y < this.rows; y++) {
                let theta = map(noise(xoff, yoff), 0, 1, 0, TAU);
                let index = y * this.cols + x;
                this.field[index] = createVector(cos(theta), sin(theta));
                yoff += this.inc;
            }
            xoff += this.inc;
        }
    }

    display() {
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                let index = y * this.cols + x;
                this.drawVector(this.field[index], x * this.resolution, y * this.resolution, this.resolution-2);
            }
        }
    }

    drawVector(vec, x, y, scale) {
        stroke(200, 200, 50, 100);
        strokeWeight(2);
        push();
        translate(x, y);
        vec.normalize();
        vec.mult(scale);
        line(0, 0, vec.x, vec.y);
        let angle = Math.atan2(vec.y, vec.x);
        rotate(angle);
        let arrowSize = 3;
        translate(vec.mag() - arrowSize, 0);
        triangle(-arrowSize, arrowSize/2, -arrowSize, -arrowSize/2, arrowSize, 0);
        pop();
    }

    lookup(vehiclePos) {
        let col = int(constrain(vehiclePos.x/this.resolution, 0, this.cols-1));
        let row = int(constrain(vehiclePos.y/this.resolution, 0, this.rows-1));
        let index = row * this.cols + col;

        return this.field[index].copy();
    }
}