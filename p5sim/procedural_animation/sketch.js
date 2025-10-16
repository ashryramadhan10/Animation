let jetBrainsMono;

class Anchor {
    constructor(x, y, size, hasRadius, isAnchor) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.maxspeed = 10;
        this.maxforce = 0.1;
        this.r = size;
        this.ringRadius = size * 8;
        this.hasRadius = hasRadius;
        this.isAnchor = isAnchor;
        this.noiseXoff = 0;
        this.wanderTheta = 0;
    }

    applyForce(force) {
        return this.acc.add(force);
    }

    wander() {
        let currentVel = this.vel.copy();
        let futurePos = this.pos.copy();

        currentVel.mult(20);
        futurePos.add(currentVel);

        // fill(0, 255, 0);
        // circle(futurePos.x, futurePos.y, 16);

        let radius = 100;
        let theta = noise(this.noiseXoff);
        this.wanderTheta = map(theta, 0, 1, 0, PI * 2);
        let x = radius * cos(this.wanderTheta) + futurePos.x;
        let y = radius * sin(this.wanderTheta) + futurePos.y;
        let seekVector = createVector(x, y);
        // fill(255, 0, 0);
        // circle(seekVector.x, seekVector.y, 16);
        // line(this.pos.x, this.pos.y, seekVector.x, seekVector.y);
        this.seek(seekVector);

        this.noiseXoff += 0.01;
    }

    seek(vec) {
        let desired = p5.Vector.sub(vec, this.pos);
        desired.setMag(this.maxspeed);

        let force = p5.Vector.sub(desired, this.vel);
        force.limit(this.maxforce);

        this.applyForce(force);
    }

    update() {
        this.vel.add(this.acc);
        this.vel.limit(this.maxspeed);
        this.pos.add(this.vel);

        this.acc.mult(0);
    }

    borders(otherAnchors) {
        let wrapOffset = createVector(0, 0);

        if (this.isAnchor) {
            let sum = 0;
            for (let i = 0; i < otherAnchors.length; i++) {
                if (otherAnchors[i] !== this) { // exclude self
                    sum += otherAnchors[i].ringRadius / 2;
                }
            }

            // Wrap Y-axis
            if (this.pos.y > height + sum) {
                wrapOffset.y = -(height + 2 * sum);
                this.pos.y = -sum;
            } else if (this.pos.y < -sum) {
                wrapOffset.y = height + 2 * sum;
                this.pos.y = height + sum;
            }

            // Wrap X-axis
            if (this.pos.x > width + sum) {
                wrapOffset.x = -(width + 2 * sum);
                this.pos.x = -sum;
            } else if (this.pos.x < -sum) {
                wrapOffset.x = width + 2 * sum;
                this.pos.x = width + sum;
            }
        }

        return wrapOffset;
    }

    render() {
        noFill();
        stroke(255);
        strokeWeight(3);
        // drawingContext.setLineDash([1, 1]);

        // if (this.isAnchor) {
        //     this.pos.x = mouseX;
        //     this.pos.y = mouseY;
        // }

        circle(this.pos.x, this.pos.y, this.r);

        if (this.hasRadius) {
            stroke(255, 100);
            // drawingContext.setLineDash([10, 10]);
            circle(this.pos.x, this.pos.y, this.ringRadius);
        }
    }

    arrowTo(otherAnchor, prevAngle) {
        let posVec = p5.Vector.sub(otherAnchor.pos, this.pos);
        let angle = posVec.heading(); // angle = arctan2 = opposite / adjacent

        if (prevAngle !== null) {
            angle = this.constraintAngle(angle, prevAngle, PI / 4); // re-calculate angle
        }

        posVec = p5.Vector.fromAngle(angle); // polar coordinate angle and radius, default 1
        posVec.setMag(this.ringRadius / 2); // set new magnitude from 1 to this.ringRadius / 2

        otherAnchor.pos.x = this.pos.x + posVec.x; // current Anchor position as anchor + projection point of posVec
        otherAnchor.pos.y = this.pos.y + posVec.y; // current Anchor position as anchor + projection point of posVec

        push();
        translate(this.pos.x, this.pos.y);
        stroke(255, 100, 100);
        strokeWeight(3);
        // drawingContext.setLineDash([1, 1]);
        line(0, 0, posVec.x, posVec.y);

        rotate(angle);
        let arrowSize = 5;
        translate(posVec.mag() - arrowSize, 0);
        triangle(-arrowSize, -arrowSize / 2, -arrowSize, arrowSize / 2, arrowSize, 0);
        pop();

        return angle;
    }

    run(otherAnchor) {
        this.borders(otherAnchor);
        this.update();
        this.render();
    }

    constraintAngle(angle, anchor, constraint) {
        if (abs(this.relativeAngleDiff(angle, anchor)) <= constraint) {
            return this.simplifyAngle(angle);
        }

        if (this.relativeAngleDiff(angle, anchor) > constraint) {
            return this.simplifyAngle(anchor - constraint);
        }

        return this.simplifyAngle(anchor + constraint);
    }

    relativeAngleDiff(angle, anchor) {
        angle = this.simplifyAngle(angle + PI - anchor);
        anchor = PI;

        return anchor - angle;
    }

    simplifyAngle(angle) {
        while (angle >= TWO_PI) {
            angle -= TWO_PI;
        }

        while (angle < 0) {
            angle += TWO_PI;
        }

        return angle;
    }
}

let anchor;
let otherAnchors = [];
let n = 35;
let cam;

let btn, chunks = [];
const fr = 60;

function preload() {
    jetBrainsMono = loadFont('../../fonts/JetBrainsMono-Regular.ttf');
}

function setup() {
    createCanvas(1850, 950, WEBGL);
    frameRate(fr);
    background(0);
    textFont(jetBrainsMono);
    
    btn = document.querySelector('button');
    btn.onclick = record;

    angleMode(RADIANS);

    cam = createCamera();

    anchor = new Anchor(width / 2, height / 2, 16, true, true);

    let sizeReducer = 0;
    for (let i = 0; i < n; i++) {
        otherAnchors[i] = new Anchor(random(width), random(height), noise(sizeReducer) * 20, true, false);
        sizeReducer += 0.01;
    }
}

function draw() {
    background(0);

    let wrapOffset = anchor.borders(otherAnchors);
    anchor.wander();
    anchor.update();
    anchor.render();

    cam.setPosition(anchor.pos.x + 0, anchor.pos.y - 200, 700);
    cam.lookAt(anchor.pos.x, anchor.pos.y, anchor.pos.z);

    // Apply wrap offset to all connected points
    // Thus, otherAnchors[i] will automatically hit the borders with addition from wrapOffset
    if (wrapOffset.x !== 0 || wrapOffset.y !== 0) {
        for (let i = 0; i < n; i++) {
            otherAnchors[i].pos.add(wrapOffset);
        }
    }

    let angle = anchor.arrowTo(otherAnchors[0], null);

    for (let i = 0; i < n - 1; i++) {
        otherAnchors[i].run(otherAnchors);
        angle = otherAnchors[i].arrowTo(otherAnchors[i+1], angle);
    }
}

/*
Imagine a simple horizontal line for our canvas, so we only care about the x-axis.

   * Let width = 800 pixels.
   * Let the sum margin = 50 pixels.

  This means our "world" extends from -50 on the left to 850 on the right. The total size of this world is 800 + 2 * 50 = 900 pixels.

  Scenario: Anchor moves off the right side

   1. Anchor Position: Our main anchor is moving right. Its position (pos.x) eventually passes the boundary, reaching 851.

   2. Wrapping: The code detects pos.x > width + sum (since 851 > 800 + 50). It then instantly "wraps" the anchor to the far left side by setting its new
      position to pos.x = -sum, which is -50.

   3. Calculating the Jump Distance: The anchor's position just changed from 851 to -50. How far did it "jump"?
       * Jump Distance = new_position - old_position
       * Jump Distance = -50 - 851 = -901

      This -901 is the distance the main anchor moved during the wrap. The code uses the idealized value, -(width + 2 * sum), which is -(800 + 100) = -900.
  This is the wrapOffset.

  Why is this offset applied to the other anchors?

  Let's say a "follower" anchor was trailing 10 pixels behind the main anchor.

   * When the main anchor was at 851, the follower was at 841.
   * After the main anchor jumps to -50, the follower must also jump to maintain that 10-pixel distance. Its new position should be -60 (-50 - 10).

  How do we get the follower from 841 to -60? We apply the wrapOffset:

   * follower_new_position = follower_old_position + wrapOffset.x
   * follower_new_position = 841 + (-900) = -59

  This -59 is the correct new position for the follower (the 1-pixel difference is due to the anchor moving slightly past the boundary before wrapping).

  So, the wrapOffset of -(width + 2 * sum) is the exact distance needed to move all the other anchors along with the main one, making the entire group appear
  seamlessly on the other side of the screen. Using just 2 * sum wouldn't be nearly enough to cross the entire 800-pixel canvas.
*/
