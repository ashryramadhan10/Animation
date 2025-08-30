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
}