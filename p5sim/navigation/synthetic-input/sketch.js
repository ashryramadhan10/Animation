const DEMO_ID = "synthetic-input";
// Mirrors nothing in C++: this is the input side of the sim (scripts/synthetic_world.js).
// The node (src/pose_corrector_node.cpp, SegDepthCallback) receives per-track
// horizontal beam pointclouds, vertical upright detections and the FCU pose, all
// expressed in ODOM. The world is generated in MAP and expressed in odom by
// subtracting a constant offset (map = odom + offset), so the node never sees
// the map frame and must estimate the gap: the centerline intercept c (across)
// and the x offset from the mission uprights (along).
const DEG = Math.PI / 180;
const WORLD = {
  headingDeg: 33.5, halfWidth: 1.6,             // expected_rack_distance
  uprightSpacing: 2.8, frameCount: 150, dt: 0.1,
  odomAlongOffsetM: 0.6, odomLateralOffsetM: 0.2,
  faceCount: 800, interiorCount: 200, seed: 73,
};

// ── vectors and seeded random (from scripts/geometry.js) ────────────────────
function v(x, y) { return { x, y }; }
function add(a, b) { return v(a.x + b.x, a.y + b.y); }
function sub(a, b) { return v(a.x - b.x, a.y - b.y); }
function mul(a, s) { return v(a.x * s, a.y * s); }
// Unit vector along an aisle heading.
function headingVector(yaw) { return v(Math.cos(yaw), Math.sin(yaw)); }
// Left normal of an aisle heading: the (a, b) of a rack line ax+by+c=0 aligned to it.
function normalVector(yaw) { return v(-Math.sin(yaw), Math.cos(yaw)); }
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
function randRange(rng, min, max) { return min + (max - min) * rng(); }
function randNormal(rng, mean = 0, std = 1) {
  const u1 = Math.max(1e-9, rng());
  const u2 = Math.max(1e-9, rng());
  return mean + Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * std;
}

// ── the world in MAP, then its odom image ───────────────────────────────────
const HEADING = WORLD.headingDeg * DEG;
const DIR = headingVector(HEADING), NORMAL = normalVector(HEADING);
// map = odom + OFFSET: odom lags the map by 0.6 m along the aisle and 0.2 m across.
const OFFSET = add(mul(DIR, WORLD.odomAlongOffsetM), mul(NORMAL, WORLD.odomLateralOffsetM));
function mapToOdom(p) { return Object.assign({}, p, sub(p, OFFSET)); }

// Mission uprights every 2.8 m along both rack faces (map frame), as the beam upright map holds them.
function buildMissionUprights() {
  const out = [];
  const sMin = -WORLD.uprightSpacing, sMax = 0.16 * WORLD.frameCount + 6;
  let k = 0;
  for (let s = sMin; s <= sMax; s += WORLD.uprightSpacing, k += 1) {
    for (const [sideSign, idBase] of [[1, 100], [-1, 200]]) {
      out.push({ id: idBase + k, s, side: sideSign > 0 ? "left" : "right", pos: add(mul(DIR, s), mul(NORMAL, sideSign * WORLD.halfWidth)) });
    }
  }
  return out;
}
const UPRIGHTS = buildMissionUprights();

// One rack per side: face points along +/-halfExtent with normal noise, plus
// interior points 0.06-0.25 m behind the face (away from the aisle).
function rackPoints(rng, along, sideSign, halfExtent) {
  const base = add(mul(DIR, along), mul(NORMAL, sideSign * WORLD.halfWidth));
  const outward = mul(NORMAL, sideSign);
  const pts = [];
  for (let i = 0; i < WORLD.faceCount; i += 1) {
    const t = randRange(rng, -halfExtent, halfExtent), n = randNormal(rng, 0, 0.018);
    pts.push({ x: base.x + DIR.x * t + outward.x * n, y: base.y + DIR.y * t + outward.y * n, kind: "face" });
  }
  for (let i = 0; i < WORLD.interiorCount; i += 1) {
    const t = randRange(rng, -halfExtent, halfExtent), depth = randRange(rng, 0.06, 0.25) + randNormal(rng, 0, 0.025);
    pts.push({ x: base.x + DIR.x * t + outward.x * depth, y: base.y + DIR.y * t + outward.y * depth, kind: "interior" });
  }
  return pts;
}

// Builds one frame: true (map) pose, reported (odom) pose, tracks and vertical detections in both frames.
function makeFrame(i) {
  const rng = makeRng(WORLD.seed * 1000 + i);
  const along = 0.16 * i, lateral = 0.08 * Math.sin(0.025 * i) + 0.05, yaw = HEADING + 4 * DEG * Math.sin(0.21 * i);
  const mapPose = { x: DIR.x * along + NORMAL.x * lateral, y: DIR.y * along + NORMAL.y * lateral, yaw };
  const tracks = [];
  for (const [side, sideSign, trackId] of [["left", 1, 1], ["right", -1, 2]]) {
    const mapPoints = rackPoints(rng, along, sideSign, 1.6);
    tracks.push({ trackId, side, mapPoints, points: mapPoints.map(mapToOdom) });
  }
  // Vertical detections: uprights within [-2.5, +4] m of the drone along the aisle, sigma 0.05 m,
  // plus one spurious detection 0.9 m past the nearest upright every 17th frame.
  const verticalMap = [];
  let nearest = null;
  for (const u of UPRIGHTS) {
    if (u.s < along - 2.5 || u.s > along + 4) continue;
    if (!nearest || Math.abs(u.s - along) < Math.abs(nearest.s - along)) nearest = u;
    verticalMap.push({ x: u.pos.x + randNormal(rng, 0, 0.05), y: u.pos.y + randNormal(rng, 0, 0.05), spurious: false });
  }
  if (i % 17 === 0 && nearest) verticalMap.push({ x: nearest.pos.x + DIR.x * 0.9, y: nearest.pos.y + DIR.y * 0.9, spurious: true });
  return {
    frameIndex: i, stamp: i * WORLD.dt, along, lateral, mapPose, fcuPose: mapToOdom(mapPose),
    tracks, verticalMap, verticalDetections: verticalMap.map(mapToOdom),
  };
}
const FRAMES = [];
function frameAt(i) { if (!FRAMES[i]) FRAMES[i] = makeFrame(i); return FRAMES[i]; }

// Builds a tiny world-to-screen renderer (map frame) that follows the drone.
function makeWorld(p, center) {
  const rect = { x: 22, y: 70, w: p.width - 360, h: p.height - 95 };
  const halfSpan = 4.2;
  const scale = Math.min(rect.w, rect.h) / (2 * halfSpan);
  return {
    toScreen(pt) { return { x: rect.x + rect.w * 0.5 + (pt.x - center.x) * scale, y: rect.y + rect.h * 0.5 - (pt.y - center.y) * scale }; },
    inside(s) { return s.x >= rect.x && s.x <= rect.x + rect.w && s.y >= rect.y && s.y <= rect.y + rect.h; },
    grid() { p.push(); p.stroke(42, 51, 72); p.noFill(); p.rect(rect.x, rect.y, rect.w, rect.h); p.pop(); },
    points(pts, color, size) {
      p.push(); p.noStroke(); p.fill(color);
      for (const pt of pts) { const s = this.toScreen(pt); if (this.inside(s)) p.circle(s.x, s.y, size); }
      p.pop();
    },
    // Rack face lines and the map centerline, as long segments along the heading.
    aisleLine(offsetAcross, color, weight, dashed) {
      const c = add(mul(DIR, DIR.x * center.x + DIR.y * center.y), mul(NORMAL, offsetAcross));
      const a = this.toScreen(sub(c, mul(DIR, 8))), b = this.toScreen(add(c, mul(DIR, 8)));
      p.push(); p.stroke(color); p.strokeWeight(weight);
      if (dashed) { p.drawingContext.setLineDash([6, 6]); }
      p.line(a.x, a.y, b.x, b.y); p.pop();
    },
    upright(pt, color, size) {
      const s = this.toScreen(pt);
      if (!this.inside(s)) return;
      p.push(); p.stroke(color); p.strokeWeight(2); p.noFill(); p.circle(s.x, s.y, size); p.line(s.x - size * 0.5, s.y, s.x + size * 0.5, s.y); p.pop();
    },
    cross(pt, color, size) {
      const s = this.toScreen(pt);
      if (!this.inside(s)) return;
      p.push(); p.stroke(color); p.strokeWeight(2); p.line(s.x - size, s.y - size, s.x + size, s.y + size); p.line(s.x - size, s.y + size, s.x + size, s.y - size); p.pop();
    },
    axes(origin, label, color) {
      const o = this.toScreen(origin);
      if (!this.inside(o)) return;
      p.push(); p.stroke(color); p.strokeWeight(2);
      p.line(o.x, o.y, o.x + 34, o.y); p.line(o.x, o.y, o.x, o.y - 34);
      p.noStroke(); p.fill(color); p.text(label, o.x + 6, o.y + 14); p.pop();
    },
    pose(pose, color, label, alpha) {
      const s = this.toScreen(pose);
      if (!this.inside(s)) return;
      p.push(); p.noStroke(); p.fill(color[0], color[1], color[2], alpha); p.circle(s.x, s.y, 12);
      p.stroke(color[0], color[1], color[2], alpha); p.strokeWeight(3); p.line(s.x, s.y, s.x + Math.cos(pose.yaw) * 40, s.y - Math.sin(pose.yaw) * 40);
      p.noStroke(); p.fill(230, 230, 230, alpha); p.text(label, s.x + 10, s.y - 10); p.pop();
    },
  };
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235); p.stroke(47, 58, 82); p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke(); p.fill(230); p.textStyle(p.BOLD); p.text("Synthetic input", x + 14, 96);
  p.textStyle(p.NORMAL); p.fill(210, 220, 235); p.textSize(12);
  lines.forEach((line, i) => p.text(line, x + 14, 124 + i * 17));
  p.pop();
}

let paused = false;
let simFrame = 0;
document.getElementById("pauseButton").addEventListener("click", (event) => {
  paused = !paused;
  event.currentTarget.textContent = paused ? "Resume" : "Pause";
});
document.getElementById("resetButton").addEventListener("click", () => { simFrame = 0; });

// Creates the p5 canvas and fixes the animation update rate.
function setup() {
  createCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
  frameRate(30);
}

// Runs one animation frame and redraws the current method state.
function draw() {
  const p = window;
  const i = Math.floor(simFrame / 3) % WORLD.frameCount;
  const f = frameAt(i);
  const w = makeWorld(p, mul(DIR, f.along));
  p.background(8, 10, 16);
  p.noStroke(); p.fill(232, 238, 248); p.textSize(18);
  p.text("Synthetic input, drawn in the map frame", 22, 30);
  p.fill(149, 163, 184); p.textSize(12);
  p.text("Racks, uprights and the FCU pose are generated in map; the node receives their odom images (map = odom + offset)", 22, 50);
  w.grid();
  w.aisleLine(0, p.color(163, 230, 53, 110), 1, true);                 // map centerline, c = 0 in map
  w.aisleLine(WORLD.halfWidth, p.color(83, 198, 255, 70), 1, false);   // left face
  w.aisleLine(-WORLD.halfWidth, p.color(255, 199, 87, 70), 1, false);  // right face
  for (const t of f.tracks) {
    const c = t.side === "left" ? [83, 198, 255] : [255, 199, 87];
    w.points(t.points, p.color(111, 126, 153, 60), 2.5);                                          // odom image (what the node sees)
    w.points(t.mapPoints.filter(q => q.kind === "interior"), p.color(c[0], c[1], c[2], 90), 2.5);
    w.points(t.mapPoints.filter(q => q.kind === "face"), p.color(c[0], c[1], c[2], 200), 3);
  }
  for (const u of UPRIGHTS) { w.upright(mapToOdom(u.pos), p.color(79, 215, 232, 80), 12); w.upright(u.pos, p.color(79, 215, 232), 14); }
  for (const d of f.verticalDetections) w.cross(d, d.spurious ? p.color(248, 113, 113) : p.color(255, 120, 120, 190), 5);
  w.axes(v(0, 0), "map origin", p.color(232, 238, 248));
  w.axes(OFFSET, "odom origin", p.color(149, 163, 184));
  w.pose(f.fcuPose, [255, 199, 87], "reported (odom)", 120);
  w.pose(f.mapPose, [255, 199, 87], "true (map)", 255);
  const left = f.tracks[0], right = f.tracks[1];
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `frame: ${i}   stamp: ${f.stamp.toFixed(1)} s`,
    `aisle heading: ${WORLD.headingDeg} deg   half width: ${WORLD.halfWidth} m`,
    `upright spacing: ${WORLD.uprightSpacing} m   mission uprights: ${UPRIGHTS.length}`,
    `odomAlongOffsetM: ${WORLD.odomAlongOffsetM}   odomLateralOffsetM: ${WORLD.odomLateralOffsetM}`,
    `offset vec: (${OFFSET.x.toFixed(3)}, ${OFFSET.y.toFixed(3)})   map = odom + offset`,
    "",
    `true pose (map): (${f.mapPose.x.toFixed(2)}, ${f.mapPose.y.toFixed(2)}) yaw ${(f.mapPose.yaw / DEG).toFixed(1)} deg`,
    `reported (odom): (${f.fcuPose.x.toFixed(2)}, ${f.fcuPose.y.toFixed(2)})`,
    `along ${f.along.toFixed(2)} m   lateral ${f.lateral.toFixed(3)} m`,
    `track ${left.trackId} (${left.side}): ${left.points.length} pts (${WORLD.faceCount} face + ${WORLD.interiorCount} interior)`,
    `track ${right.trackId} (${right.side}): ${right.points.length} pts (${WORLD.faceCount} face + ${WORLD.interiorCount} interior)`,
    `vertical detections: ${f.verticalDetections.length}${i % 17 === 0 ? " (1 spurious, +0.9 m)" : ""}`,
    `true centerline c: map 0.000 / odom +${WORLD.odomLateralOffsetM.toFixed(3)}`,
    "",
    "Cyan rings: mission uprights (map).",
    "Dim rings: their odom images. Red x:",
    "vertical detections the node receives.",
    "Bright points: racks in map. Grey: the",
    "same points in odom, as the node sees them.",
    "",
    "The node sees everything in odom: rack",
    "points, uprights and the FCU pose all carry",
    "the same offset, so relative geometry is",
    "unchanged. It estimates the map<->odom gap:",
    "the intercept c (+0.2 across, output of the",
    "centerline) and the x offset (+0.6 along,",
    "recovered by matching uprights to the map).",
  ]);
  if (!paused) simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
}
