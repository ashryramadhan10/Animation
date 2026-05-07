const DEMO_ID = "line-fit";

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

// Creates noisy inlier and outlier points for the line-fit demo.
function makePoints() {
  const rng = makeRng(8);
  const points = [];
  for (let i = 0; i < 180; i += 1) {
    const x = -2.5 + 5 * rng();
    points.push(
        {x, y : 0.55 * x + 0.8 + gaussianNoise(rng, 0.035), label : "beam"});
  }
  for (let i = 0; i < 70; i += 1) {
    points.push(
        {x : -2.5 + 5 * rng(), y : -1.0 + 3.8 * rng(), label : "outlier"});
  }
  return points;
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
  const b = avg.y - m * avg.x;
  return {m, b};
}

// Measures perpendicular distance from one point to a fitted line.
function distanceToLine(point, line) {
  return Math.abs(line.m * point.x - point.y + line.b) / Math.hypot(line.m, -1);
}

// Repeats fit-and-inlier-selection to remove outliers from a beam line.
function recursiveFit(points) {
  let active = points.map((_, i) => i);
  const steps = [];
  for (let iter = 0; iter < 8; iter += 1) {
    const line = fitLine(active.map(i => points[i]));
    const inliers =
        points.map((point, i) => ({point, i}))
            .filter(item => distanceToLine(item.point, line) <= 0.08)
            .map(item => item.i);
    steps.push({line, inliers});
    if (inliers.length === active.length || inliers.length < 12)
      break;
    active = inliers;
  }
  return steps;
}

// Builds a tiny world-to-screen renderer for this sketch.
function makeWorld(p) {
  const rect = {x : 22, y : 70, w : p.width - 360, h : p.height - 95};
  const bounds = {minX : -3.0, maxX : 3.0, minY : -1.2, maxY : 2.7};
  const scale = Math.min(rect.w / 6, rect.h / 3.9);
  return {
    toScreen(point) {
      return {
        x : rect.x + rect.w * 0.5 + point.x * scale,
        y : rect.y + rect.h * 0.5 - (point.y - 0.75) * scale,
      };
    },
    grid() {
      p.push();
      p.stroke(42, 51, 72);
      p.noFill();
      p.rect(rect.x, rect.y, rect.w, rect.h);
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        const a = this.toScreen({x, y : bounds.minY});
        const b = this.toScreen({x, y : bounds.maxY});
        p.line(a.x, a.y, b.x, b.y);
      }
      for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
        const a = this.toScreen({x : bounds.minX, y});
        const b = this.toScreen({x : bounds.maxX, y});
        p.line(a.x, a.y, b.x, b.y);
      }
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
    line(line, color) {
      const a =
          this.toScreen({x : bounds.minX, y : line.m * bounds.minX + line.b});
      const b =
          this.toScreen({x : bounds.maxX, y : line.m * bounds.maxX + line.b});
      p.push();
      p.stroke(color);
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
  p.text("Recursive line fit", x + 14, 96);
  p.textStyle(p.NORMAL);
  p.fill(210, 220, 235);
  p.textSize(12);
  lines.forEach((line, i) => p.text(line, x + 14, 128 + i * 18));
  p.pop();
}

const points = makePoints();
const steps = recursiveFit(points);
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

  const stepIndex = Math.floor(simFrame / 25) % steps.length;
  const step = steps[stepIndex];
  const inlierSet = new Set(step.inliers);
  const inliers = points.filter((_, i) => inlierSet.has(i));
  const outliers = points.filter((_, i) => !inlierSet.has(i));
  const world = makeWorld(p);
  p.background(8, 10, 16);
  p.noStroke();
  p.fill(232, 238, 248);
  p.textSize(18);
  p.text("Line fit", 22, 30);
  p.fill(149, 163, 184);
  p.textSize(12);
  p.text("One sketch: fit line -> classify close points -> repeat on inliers",
         22, 50);
  world.grid();
  world.points(outliers, p.color(248, 113, 113, 100), 4);
  world.points(inliers, p.color(82, 255, 168, 180), 5);
  world.line(step.line, p.color(255, 255, 255));
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `iteration: ${stepIndex + 1}/${steps.length}`,
    `inliers: ${inliers.length}/${points.length}`,
    `slope: ${step.line.m.toFixed(3)}`,
    "",
    "This mirrors the C++ recursive",
    "linear-regression fitter: fit,",
    "measure distance, keep inliers,",
    "then refit with cleaner geometry.",
  ]);
  if (!paused)
    simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28),
               Math.max(540, window.innerHeight - 118));
}
