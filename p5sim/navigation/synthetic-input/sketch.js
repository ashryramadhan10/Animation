const DEMO_ID = "synthetic-input";
const AISLE_YAW = 33.5 * Math.PI / 180;
const HALF_WIDTH = 1.55;

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

// Adds two 2D vectors.
function add(a, b) { return {x : a.x + b.x, y : a.y + b.y}; }

// Scales a 2D vector by a scalar.
function mul(a, s) { return {x : a.x * s, y : a.y * s}; }

// Returns the forward unit vector for a yaw angle.
function headingVector(yaw) { return {x : Math.cos(yaw), y : Math.sin(yaw)}; }

// Returns the perpendicular unit vector for a yaw angle.
function normalVector(yaw) { return {x : -Math.sin(yaw), y : Math.cos(yaw)}; }

// Generates one synthetic rack-beam track with face points and noisy interior
// points.
function makeTrack(rng, side, along) {
  const dir = headingVector(AISLE_YAW);
  const norm = normalVector(AISLE_YAW);
  const sideSign = side === "left" ? 1 : -1;
  const base = add(mul(dir, along), mul(norm, sideSign * HALF_WIDTH));
  const inward = mul(norm, -sideSign);
  const points = [];
  for (let i = 0; i < 180; i += 1) {
    points.push(add(add(base, mul(dir, -1.7 + 3.4 * rng())), {
      x : gaussianNoise(rng, 0.018),
      y : gaussianNoise(rng, 0.018),
      kind : "face"
    }));
  }
  for (let i = 0; i < 110; i += 1) {
    const p = add(add(add(base, mul(dir, -1.7 + 3.4 * rng())),
                      mul(inward, 0.06 + 0.25 * rng())),
                  {x : gaussianNoise(rng, 0.03), y : gaussianNoise(rng, 0.03)});
    p.kind = "interior";
    points.push(p);
  }
  return {side, trackId : side === "left" ? 10 : 11, points};
}

// Builds one synthetic frame containing FCU pose and rack tracks.
function makeFrame(frameIndex) {
  const rng = makeRng(100 + frameIndex);
  const dir = headingVector(AISLE_YAW);
  const norm = normalVector(AISLE_YAW);
  const along = frameIndex * 0.06;
  const lateral = 0.22 * Math.sin(frameIndex * 0.06);
  return {
    fcu : add(mul(dir, along), mul(norm, lateral)),
    yaw : AISLE_YAW + 0.2 * Math.sin(frameIndex * 0.05),
    tracks : [ makeTrack(rng, "left", along), makeTrack(rng, "right", along) ],
  };
}

// Computes drawing bounds around the current synthetic points.
function bounds(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return {
    minX : minX - 0.8,
    minY : minY - 0.8,
    maxX : maxX + 0.8,
    maxY : maxY + 0.8
  };
}

// Builds a tiny world-to-screen renderer for this sketch.
function world(p, points) {
  const rect = {x : 22, y : 70, w : p.width - 360, h : p.height - 95};
  const b = bounds(points);
  const scale =
      Math.min(rect.w / (b.maxX - b.minX), rect.h / (b.maxY - b.minY));
  return {
    toScreen(point) {
      const cx = (b.minX + b.maxX) * 0.5;
      const cy = (b.minY + b.maxY) * 0.5;
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
    pose(pose, yaw) {
      const s = this.toScreen(pose);
      p.push();
      p.noStroke();
      p.fill(255, 199, 87);
      p.circle(s.x, s.y, 12);
      p.stroke(255, 199, 87);
      p.strokeWeight(3);
      p.line(s.x, s.y, s.x + Math.cos(yaw) * 45, s.y - Math.sin(yaw) * 45);
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
  p.text("Synthetic input", x + 14, 96);
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

  const frame = makeFrame(Math.floor(simFrame / 3));
  const all =
      [ frame.fcu, ...frame.tracks[0].points, ...frame.tracks[1].points ];
  const w = world(p, all);
  p.background(8, 10, 16);
  p.noStroke();
  p.fill(232, 238, 248);
  p.textSize(18);
  p.text("Synthetic pointcloud input", 22, 30);
  p.fill(149, 163, 184);
  p.textSize(12);
  p.text(
      "One sketch: masks and depth are already converted into per-track 2D pointclouds",
      22, 50);
  w.grid();
  for (const track of frame.tracks) {
    w.points(track.points.filter(point => point.kind === "interior"),
             p.color(111, 126, 153, 95), 3);
    w.points(track.points.filter(point => point.kind === "face"),
             track.side === "left" ? p.color(83, 198, 255, 190)
                                   : p.color(255, 199, 87, 190),
             4);
  }
  w.pose(frame.fcu, frame.yaw);
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `left track id: ${frame.tracks[0].trackId}`,
    `right track id: ${frame.tracks[1].trackId}`,
    `points per track: ${frame.tracks[0].points.length}`,
    "",
    "This sketch deliberately starts after",
    "camera/depth projection. The C++ node",
    "receives track pointclouds, not pixels.",
    "",
    "Bright points are rack face points.",
    "Muted points are interior/noisy depth.",
  ]);
  if (!paused)
    simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28),
               Math.max(540, window.innerHeight - 118));
}
