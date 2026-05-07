const DEMO_ID = "pipeline";
const DEG = Math.PI / 180;
const AISLE_YAW = 33.5 * DEG;

// Creates deterministic pseudo-random values so this sketch is repeatable.
function makeRng(seed) {
  let state = seed >>> 0;
  return function rand() {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generates Gaussian sensor jitter for synthetic pointcloud data.
function gaussianNoise(rng, sigma) {
  const u1 = Math.max(rng(), 1e-9);
  const u2 = Math.max(rng(), 1e-9);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2) * sigma;
}

// Builds a small 2D vector object for readable geometry code.
function v(x, y) { return {x, y}; }
// Adds two 2D vectors.
function add(a, b) { return v(a.x + b.x, a.y + b.y); }
// Scales a 2D vector by a scalar.
function mul(a, s) { return v(a.x * s, a.y * s); }
// Returns the unit vector that points along the aisle heading.
function dir(yaw) { return v(Math.cos(yaw), Math.sin(yaw)); }
// Returns the unit vector perpendicular to the aisle heading.
function aisleNormal(yaw) { return v(-Math.sin(yaw), Math.cos(yaw)); }

// Generates one synthetic rack-beam track with face points and noisy interior
// points.
function makeTrack(frameIndex, side) {
  const rng = makeRng(1200 + frameIndex * 7 + (side === "left" ? 1 : 2));
  const along = frameIndex * 0.055;
  const halfWidth = 1.58;
  const sideSign = side === "left" ? 1 : -1;
  const base = add(mul(dir(AISLE_YAW), along),
                   mul(aisleNormal(AISLE_YAW), sideSign * halfWidth));
  const inward = mul(aisleNormal(AISLE_YAW), -sideSign);
  const points = [];
  for (let i = 0; i < 140; i += 1) {
    points.push(add(add(base, mul(dir(AISLE_YAW), -1.6 + 3.2 * rng())),
                    v(gaussianNoise(rng, 0.018), gaussianNoise(rng, 0.018))));
  }
  for (let i = 0; i < 70; i += 1) {
    points.push(add(add(add(base, mul(dir(AISLE_YAW), -1.6 + 3.2 * rng())),
                        mul(inward, 0.08 + 0.25 * rng())),
                    v(gaussianNoise(rng, 0.035), gaussianNoise(rng, 0.035))));
  }
  return {side, points};
}

// Fits a 2D line to points using a simple least-squares slope/intercept model.
function fitLine(points) {
  const avg = points.reduce((s, p) => v(s.x + p.x, s.y + p.y), v(0, 0));
  avg.x /= points.length;
  avg.y /= points.length;
  let varX = 0;
  let cov = 0;
  for (const point of points) {
    varX += (point.x - avg.x) ** 2;
    cov += (point.x - avg.x) * (point.y - avg.y);
  }
  const m = cov / Math.max(varX, 1e-9);
  return {m, b : avg.y - m * avg.x};
}

// Measures perpendicular distance from one point to a fitted line.
function distanceToLine(point, line) {
  return Math.abs(line.m * point.x - point.y + line.b) / Math.hypot(line.m, -1);
}

// Keeps points close to the fitted rack face line.
function filterFace(points) {
  const line = fitLine(points);
  return points.filter(point => distanceToLine(point, line) < 0.12);
}

// Averages two fitted rack lines into one centerline estimate.
function centerlineFromTwoFits(leftFit, rightFit) {
  return {
    m : (leftFit.m + rightFit.m) * 0.5,
    b : (leftFit.b + rightFit.b) * 0.5
  };
}

// Creates a moving FCU pose with lateral drift around the aisle centerline.
function makeFcu(frameIndex) {
  const along = frameIndex * 0.055;
  const lateral = 0.25 * Math.sin(frameIndex * 0.035) + 0.08;
  return add(mul(dir(AISLE_YAW), along), mul(aisleNormal(AISLE_YAW), lateral));
}

// Computes lateral error from FCU pose to the slope/intercept centerline.
function signedDistanceToSlopeLine(point, line) {
  return (line.m * point.x - point.y + line.b) / Math.hypot(line.m, -1);
}

// Moves the FCU pose laterally toward the centerline using smoothed error.
function correctedPose(fcu, center, smoothedDist) {
  const lineNormal = v(center.m, -1);
  const n = Math.hypot(lineNormal.x, lineNormal.y);
  const unit = v(lineNormal.x / n, lineNormal.y / n);
  return {
    x : fcu.x - unit.x * smoothedDist,
    y : fcu.y - unit.y * smoothedDist,
    yaw : AISLE_YAW
  };
}

// Builds a tiny world-to-screen renderer for this sketch.
function makeWorld(p, points) {
  const rect = {x : 22, y : 70, w : p.width - 360, h : p.height - 95};
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  points.forEach(point => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });
  minX -= 0.9;
  minY -= 0.9;
  maxX += 0.9;
  maxY += 0.9;
  const scale = Math.min(rect.w / (maxX - minX), rect.h / (maxY - minY));
  return {
    toScreen(point) {
      const cx = (minX + maxX) * 0.5;
      const cy = (minY + maxY) * 0.5;
      return {
        x : rect.x + rect.w * 0.5 + (point.x - cx) * scale,
        y : rect.y + rect.h * 0.5 - (point.y - cy) * scale
      };
    },
    grid() {
      p.push();
      p.stroke(42, 51, 72);
      p.noFill();
      p.rect(rect.x, rect.y, rect.w, rect.h);
      p.pop();
    },
    points(points, color, size) {
      p.push();
      p.noStroke();
      p.fill(color);
      points.forEach(point => {
        const s = this.toScreen(point);
        p.circle(s.x, s.y, size);
      });
      p.pop();
    },
    line(line, color, weight) {
      const a = this.toScreen({x : minX, y : line.m * minX + line.b});
      const b = this.toScreen({x : maxX, y : line.m * maxX + line.b});
      p.push();
      p.stroke(color);
      p.strokeWeight(weight);
      p.line(a.x, a.y, b.x, b.y);
      p.pop();
    },
    pose(pose, color, label) {
      const s = this.toScreen(pose);
      p.push();
      p.noStroke();
      p.fill(color);
      p.circle(s.x, s.y, 12);
      p.stroke(color);
      p.strokeWeight(3);
      p.line(s.x, s.y, s.x + Math.cos(pose.yaw || AISLE_YAW) * 42,
             s.y - Math.sin(pose.yaw || AISLE_YAW) * 42);
      p.noStroke();
      p.fill(230);
      p.text(label, s.x + 10, s.y - 10);
      p.pop();
    },
  };
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235);
  p.stroke(47, 58, 82);
  p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke();
  p.fill(230);
  p.textStyle(p.BOLD);
  p.text("Pipeline overview", x + 14, 96);
  p.textStyle(p.NORMAL);
  p.fill(210, 220, 235);
  p.textSize(12);
  lines.forEach((line, i) => p.text(line, x + 14, 128 + i * 18));
  p.pop();
}

let paused = false;
let simFrame = 0;
let smoothedDist = 0;
document.getElementById("pauseButton").addEventListener("click", (event) => {
  paused = !paused;
  event.currentTarget.textContent = paused ? "Resume" : "Pause";
});
document.getElementById("resetButton").addEventListener("click", () => {
  simFrame = 0;
  smoothedDist = 0;
});

// Creates the p5 canvas and fixes the animation update rate.
function setup() {
  createCanvas(Math.max(760, window.innerWidth - 28),
               Math.max(540, window.innerHeight - 118));
  frameRate(30);
}

// Runs one animation frame and redraws the current method state.
function draw() {
  const p = window;

  const frameIndex = Math.floor(simFrame / 3);
  const left = makeTrack(frameIndex, "left");
  const right = makeTrack(frameIndex, "right");
  const leftFace = filterFace(left.points);
  const rightFace = filterFace(right.points);
  const leftFit = fitLine(leftFace);
  const rightFit = fitLine(rightFace);
  const center = centerlineFromTwoFits(leftFit, rightFit);
  const fcu = makeFcu(frameIndex);
  const rawDist = signedDistanceToSlopeLine(fcu, center);
  smoothedDist = 0.07 * rawDist + 0.93 * smoothedDist;
  const corrected = correctedPose(fcu, center, smoothedDist);
  const allPoints = [...left.points, ...right.points, fcu, corrected ];
  const w = makeWorld(p, allPoints);
  p.background(8, 10, 16);
  p.noStroke();
  p.fill(232, 238, 248);
  p.textSize(18);
  p.text("Full pipeline sketch", 22, 30);
  p.fill(149, 163, 184);
  p.textSize(12);
  p.text(
      "One sketch: pointclouds -> face filter -> line fit -> centerline -> corrected pose",
      22, 50);
  w.grid();
  w.points(left.points, p.color(83, 198, 255, 70), 3);
  w.points(right.points, p.color(255, 199, 87, 70), 3);
  w.points(leftFace, p.color(83, 198, 255, 210), 4);
  w.points(rightFace, p.color(255, 199, 87, 210), 4);
  w.line(leftFit, p.color(83, 198, 255), 2);
  w.line(rightFit, p.color(255, 199, 87), 2);
  w.line(center, p.color(163, 230, 53), 5);
  w.pose({...fcu, yaw : AISLE_YAW + 0.18 * Math.sin(frameIndex * 0.04)},
         p.color(255, 199, 87), "FCU");
  w.pose(corrected, p.color(82, 255, 168), "corrected");
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `left face points: ${leftFace.length}/${left.points.length}`,
    `right face points: ${rightFace.length}/${right.points.length}`,
    `centerline slope: ${center.m.toFixed(3)}`,
    `raw lateral error: ${rawDist.toFixed(3)} m`,
    `smoothed error: ${smoothedDist.toFixed(3)} m`,
    "",
    "This file is intentionally standalone.",
    "No shared demo renderer is imported.",
    "",
    "Read from top to bottom like the",
    "C++ correction pipeline stages.",
  ]);
  if (!paused)
    simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28),
               Math.max(540, window.innerHeight - 118));
}
