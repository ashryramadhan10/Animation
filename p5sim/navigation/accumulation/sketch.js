const DEMO_ID = "accumulation";
const AISLE_YAW = 33 * Math.PI / 180;
const TRACK_ID = 4;

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

// Returns the unit vector that points along the aisle heading.
function dir() { return {x : Math.cos(AISLE_YAW), y : Math.sin(AISLE_YAW)}; }

// Returns the unit vector perpendicular to the aisle heading.
function aisleNormal() {
  return {x : -Math.sin(AISLE_YAW), y : Math.cos(AISLE_YAW)};
}

// Adds two 2D vectors.
function add(a, b) { return {x : a.x + b.x, y : a.y + b.y}; }

// Scales a 2D vector by a scalar.
function mul(a, s) { return {x : a.x * s, y : a.y * s}; }

// Builds one synthetic frame containing FCU pose and rack tracks.
function makeFrame(index) {
  const rng = makeRng(70 + index);
  const along = index * 0.08;
  const base = add(mul(dir(), along), mul(aisleNormal(), 1.55));
  const points = [];
  for (let i = 0; i < 95; i += 1) {
    points.push(
        add(add(base, mul(dir(), -1.6 + rng() * 3.2)),
            {x : gaussianNoise(rng, 0.025), y : gaussianNoise(rng, 0.025)}));
  }
  return {stamp : index * 0.1, trackId : TRACK_ID, points};
}

// Fits a 2D line to points using a simple least-squares slope/intercept model.
function fitLine(points) {
  const avg =
      points.reduce((s, p) => ({x : s.x + p.x, y : s.y + p.y}), {x : 0, y : 0});
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

// Collects the rolling history window for one stable track id.
function accumulatedFrames(frameIndex) {
  const frames = [];
  const cutoff = Math.max(0, frameIndex - 18);
  for (let i = cutoff; i <= frameIndex; i += 1)
    frames.push(makeFrame(i));
  return frames;
}

// Builds a tiny world-to-screen renderer for this sketch.
function makeWorld(p, points) {
  const rect = {x : 22, y : 70, w : p.width - 360, h : p.height - 95};
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  minX -= 0.8;
  minY -= 0.8;
  maxX += 0.8;
  maxY += 0.8;
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
      for (const point of points) {
        const s = this.toScreen(point);
        p.circle(s.x, s.y, size);
      }
      p.pop();
    },
    line(line) {
      const a = this.toScreen({x : minX, y : line.m * minX + line.b});
      const b = this.toScreen({x : maxX, y : line.m * maxX + line.b});
      p.push();
      p.stroke(255);
      p.strokeWeight(3);
      p.line(a.x, a.y, b.x, b.y);
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
  p.text("Accumulation", x + 14, 96);
  p.textStyle(p.NORMAL);
  p.fill(210, 220, 235);
  p.textSize(12);
  lines.forEach((line, i) => p.text(line, x + 14, 128 + i * 18));
  p.pop();
}

let paused = false;
let simFrame = 0;
document.getElementById("pauseButton").addEventListener("click", (event) => {
  paused = !paused;
  event.currentTarget.textContent = paused ? "Resume" : "Pause";
});
document.getElementById("resetButton")
    .addEventListener("click", () => { simFrame = 0; });

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
  const frames = accumulatedFrames(frameIndex);
  const current = frames[frames.length - 1];
  const accumulated = frames.flatMap(frame => frame.points);
  const w = makeWorld(p, accumulated);
  p.background(8, 10, 16);
  p.noStroke();
  p.fill(232, 238, 248);
  p.textSize(18);
  p.text("Track accumulation", 22, 30);
  p.fill(149, 163, 184);
  p.textSize(12);
  p.text("One sketch: same track_id accumulates over a rolling time window", 22,
         50);
  w.grid();
  w.points(accumulated, p.color(92, 235, 181, 70), 3);
  w.points(current.points, p.color(255, 199, 87, 210), 5);
  w.line(fitLine(accumulated));
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `track id: ${TRACK_ID}`,
    `current frame points: ${current.points.length}`,
    `accumulated points: ${accumulated.length}`,
    `window frames: ${frames.length}`,
    "",
    "Bright points are the current frame.",
    "Dim green points are history.",
    "",
    "This only works when track_id",
    "continues to represent the same",
    "physical horizontal beam.",
  ]);
  if (!paused)
    simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28),
               Math.max(540, window.innerHeight - 118));
}
