const DEMO_ID = "rotation-filter";
const DEG = Math.PI / 180;

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

// Creates the raw rack-face and interior points used by the filter demo.
function makePointCloud() {
  const rng = makeRng(14);
  const points = [];
  for (let i = 0; i < 170; i += 1) {
    const x = -2.2 + 4.4 * rng();
    points.push({x, y : 1.45 + gaussianNoise(rng, 0.025), kind : "face"});
  }
  for (let i = 0; i < 150; i += 1) {
    points.push({
      x : -2.2 + 4.4 * rng(),
      y : 1.0 + 0.36 * rng() + gaussianNoise(rng, 0.02),
      kind : "interior",
    });
  }
  return points;
}

// Computes the pointcloud centroid used as the rotation-filter pivot reference.
function meanPoint(points) {
  let sx = 0;
  let sy = 0;
  for (const point of points) {
    sx += point.x;
    sy += point.y;
  }
  return {x : sx / points.length, y : sy / points.length};
}

// Applies the candidate-angle face filter used before fitting a beam line.
function rotationFilter(points, estimatedAngle, candidateAngle) {
  const avg = meanPoint(points);
  const pivot = {
    x : avg.x - Math.sin(estimatedAngle) * 2.4,
    y : avg.y + Math.cos(estimatedAngle) * 2.4,
  };
  const values = points.map(point => {
    const rx = point.x - pivot.x;
    const ry = point.y - pivot.y;
    return Math.cos(candidateAngle) * ry - Math.sin(candidateAngle) * rx;
  });
  const boundary = Math.max(...values);
  const kept = [];
  const rejected = [];
  for (let i = 0; i < points.length; i += 1) {
    const keep = values[i] > boundary - 0.22;
    (keep ? kept : rejected).push(points[i]);
  }
  return {pivot, boundary, kept, rejected, values};
}

// Builds a tiny world-to-screen renderer for this sketch.
function makeWorld(p, bounds) {
  const rect = {x : 22, y : 70, w : p.width - 360, h : p.height - 95};
  const scale = Math.min(rect.w / (bounds.maxX - bounds.minX),
                         rect.h / (bounds.maxY - bounds.minY));
  return {
    toScreen(point) {
      const cx = (bounds.minX + bounds.maxX) * 0.5;
      const cy = (bounds.minY + bounds.maxY) * 0.5;
      return {
        x : rect.x + rect.w * 0.5 + (point.x - cx) * scale,
        y : rect.y + rect.h * 0.5 - (point.y - cy) * scale,
      };
    },
    drawGrid() {
      p.push();
      p.stroke(42, 51, 72);
      p.noFill();
      p.rect(rect.x, rect.y, rect.w, rect.h);
      for (let x = Math.ceil(bounds.minX); x <= bounds.maxX; x += 1) {
        const a = this.toScreen({x, y : bounds.minY});
        const b = this.toScreen({x, y : bounds.maxY});
        p.line(a.x, a.y, b.x, b.y);
      }
      for (let y = Math.ceil(bounds.minY); y <= bounds.maxY; y += 1) {
        const a = this.toScreen({x : bounds.minX, y});
        const b = this.toScreen({x : bounds.maxX, y});
        p.line(a.x, a.y, b.x, b.y);
      }
      p.pop();
    },
    drawPoints(points, color, size) {
      p.push();
      p.noStroke();
      p.fill(color);
      for (const point of points) {
        const s = this.toScreen(point);
        p.circle(s.x, s.y, size);
      }
      p.pop();
    },
    drawLineThroughPivot(pivot, angle, rotatedY, color) {
      const dir = {x : Math.cos(angle), y : Math.sin(angle)};
      const normal = {x : -Math.sin(angle), y : Math.cos(angle)};
      const center = {
        x : pivot.x + normal.x * rotatedY,
        y : pivot.y + normal.y * rotatedY
      };
      const a = {x : center.x - dir.x * 4, y : center.y - dir.y * 4};
      const b = {x : center.x + dir.x * 4, y : center.y + dir.y * 4};
      const sa = this.toScreen(a);
      const sb = this.toScreen(b);
      p.push();
      p.stroke(color);
      p.strokeWeight(3);
      p.line(sa.x, sa.y, sb.x, sb.y);
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
  p.text("Rotation filter", x + 14, 96);
  p.textStyle(p.NORMAL);
  p.fill(210, 220, 235);
  p.textSize(12);
  lines.forEach((line, i) => p.text(line, x + 14, 128 + i * 18));
  p.pop();
}

const points = makePointCloud();
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

  p.background(8, 10, 16);
  p.fill(232, 238, 248);
  p.noStroke();
  p.textSize(18);
  p.text("Rotation search filter", 22, 30);
  p.fill(149, 163, 184);
  p.textSize(12);
  p.text(
      "One sketch: sweep angle -> compute rotated_y boundary -> keep outer rack face band",
      22, 50);

  const candidateDeg = -20 + (Math.floor(simFrame / 5) % 81) * 0.5;
  const candidateAngle = candidateDeg * DEG;
  const filtered = rotationFilter(points, 0, candidateAngle);
  const world = makeWorld(p, {minX : -2.8, maxX : 2.8, minY : 0.6, maxY : 1.9});
  world.drawGrid();
  world.drawPoints(filtered.rejected, p.color(111, 126, 153, 95), 4);
  world.drawPoints(filtered.kept, p.color(248, 113, 113, 195), 5);
  world.drawPoints([ filtered.pivot ], p.color(82, 255, 168), 12);
  world.drawLineThroughPivot(filtered.pivot, candidateAngle, filtered.boundary,
                             p.color(248, 113, 113));
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `candidate angle: ${candidateDeg.toFixed(1)} deg`,
    `kept points: ${filtered.kept.length}/${points.length}`,
    "",
    "In the C++ logic, this removes",
    "interior/noisy points before line fit.",
    "",
    "The pivot creates a temporary local",
    "basis. For each candidate angle,",
    "rotated_y exposes the outer face edge.",
  ]);
  if (!paused)
    simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28),
               Math.max(540, window.innerHeight - 118));
}
