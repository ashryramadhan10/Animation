const DEMO_ID = "accumulation";
// Mirrors src/beam_pointcloud/pointcloud_accumulator.cpp (PointCloudAccumulator::
// AddCloud, CleanupOldEntries, GetAccumulatedCloud) as the sim keeps it in
// scripts/pose_corrector.js (updateAccumulator, cleanupOldEntries; no voxel
// downsampling), called from PoseCorrectorNode::ProcessBeamClouds (node 691-693
// and 738-744) only when enable_accumulation is true. The fit on both sides is
// RecursiveLinRegFitter::FitPlane (src/beam_pointcloud/recursive_linreg_fitter.cpp).
const DEG = Math.PI / 180;
const YAML = {
  enable_accumulation: false,          // deployed default: the pipeline fits single frames
  accumulation_window_sec: 4.0,
  accumulation_max_points: 50000,
  linreg_distance_threshold: 0.05, linreg_min_inlier_ratio: 0.25, min_points_for_fitting: 10,
  linreg_max_iterations: 10, linreg_max_allowed_gap: 3.0, linreg_min_line_length: 0.5,
};
const TRACK_ID = 1;

// ── seeded random and vectors (sim-only) ────────────────────────────────────
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
function headingVector(yaw) { return { x: Math.cos(yaw), y: Math.sin(yaw) }; }
function normalVector(yaw) { return { x: -Math.sin(yaw), y: Math.cos(yaw) }; }

// ── accumulation (PointCloudAccumulator, sim-simplified) ────────────────────
// CleanupOldEntries — drop entries older than accumulation_window_sec per track.
function cleanupOldEntries(state, nowSec) {
  const window = state.cfg.beam_pointcloud.accumulation_window_sec;
  for (const [trackId, entries] of state.accumulator) {
    const kept = entries.filter(e => nowSec - e.stamp <= window);
    if (kept.length) state.accumulator.set(trackId, kept); else state.accumulator.delete(trackId);
  }
}
// AddCloud + EnforceTrackPointCap + GetAccumulatedCloud — append, cap at accumulation_max_points, combine.
function updateAccumulator(state, trackId, stamp, points) {
  const bp = state.cfg.beam_pointcloud;
  const entries = state.accumulator.get(trackId) || [];
  entries.push({ stamp, points: points.slice() });
  let total = entries.reduce((n, e) => n + e.points.length, 0);
  while (bp.accumulation_max_points > 0 && total > bp.accumulation_max_points && entries.length > 1) {
    total -= entries.shift().points.length;
  }
  state.accumulator.set(trackId, entries);
  const combined = [];
  for (const e of entries) combined.push(...e.points);
  return combined;
}

// ── line fit (recursive_linreg_fitter.cpp) ──────────────────────────────────
// FitLine2D — ordinary least squares, regressing on the better-conditioned axis.
function fitLine2D(pts, minPointsForFitting) {
  const r = { A: 0, B: 0, C: 0, isValid: false };
  if (pts.length < minPointsForFitting) return r;
  let sx = 0, sy = 0;
  for (const p of pts) { sx += p.x; sy += p.y; }
  const mx = sx / pts.length, my = sy / pts.length;
  let varX = 0, varY = 0;
  for (const p of pts) { varX += (p.x - mx) * (p.x - mx); varY += (p.y - my) * (p.y - my); }
  let A, B, C;
  if (varX >= varY) {
    let num = 0;
    for (const p of pts) num += (p.x - mx) * (p.y - my);
    if (Math.abs(varX) < 1e-9) { A = 1; B = 0; C = -mx; }
    else {
      const slope = num / varX, intercept = my - slope * mx;
      const norm = Math.hypot(slope, 1);
      A = slope / norm; B = -1 / norm; C = intercept / norm;
    }
  } else {
    let num = 0;
    for (const p of pts) num += (p.y - my) * (p.x - mx);
    if (Math.abs(varY) < 1e-9) { A = 0; B = 1; C = -my; }
    else {
      const slope = num / varY, intercept = mx - slope * my;
      const norm = Math.hypot(1, slope);
      A = 1 / norm; B = -slope / norm; C = -intercept / norm;
    }
  }
  r.A = A; r.B = B; r.C = C; r.isValid = true;
  return r;
}
// Maps beam_pointcloud.linreg_* YAML keys onto the fitter config (node ctor lines 169-183).
function fitterConfigFromYaml(bp) {
  return {
    distance_threshold: bp.linreg_distance_threshold, min_inlier_ratio: bp.linreg_min_inlier_ratio,
    min_points_for_fitting: bp.min_points_for_fitting, max_iterations: bp.linreg_max_iterations,
    max_allowed_gap: bp.linreg_max_allowed_gap, min_line_length: bp.linreg_min_line_length,
  };
}
class RecursiveLinRegFitter {
  constructor(config) {
    this.config = Object.assign({
      distance_threshold: 0.05, min_inlier_ratio: 0.5, min_points_for_fitting: 10,
      max_iterations: 10, max_allowed_gap: 3.0, min_line_length: 0.5,
    }, config);
  }
  // FitPlane — iterative inlier refinement, then ratio / gap / length validation.
  fitPlane(points) {
    const cfg = this.config;
    const result = { valid: false, coefficients: { a: 0, b: 0, c: 0 }, inlierIndices: [], inlierRatio: 0, reason: "", iterations: [] };
    if (!points || points.length < cfg.min_points_for_fitting) { result.reason = "too few points"; return result; }
    const n = points.length;
    let active = points.map((_, i) => i);
    let line = { A: 0, B: 0, C: 0, isValid: false };
    for (let iter = 0; iter < cfg.max_iterations; iter += 1) {
      const candidate = fitLine2D(active.map(i => points[i]), cfg.min_points_for_fitting);
      if (!candidate.isValid) break;
      const nextActive = [];
      for (const i of active) {
        const dist = Math.abs(candidate.A * points[i].x + candidate.B * points[i].y + candidate.C);
        if (dist <= cfg.distance_threshold) nextActive.push(i);
      }
      result.iterations.push({ line: { a: candidate.A, b: candidate.B, c: candidate.C }, inlierIndices: nextActive.slice() });
      if (nextActive.length === active.length) { line = candidate; active = nextActive; break; }   // converged
      if (nextActive.length < cfg.min_points_for_fitting) break;                                   // keep previous line/active
      line = candidate; active = nextActive;
    }
    if (!line.isValid || active.length === 0) { result.reason = "no valid line"; return result; }
    const inlierRatio = active.length / n;
    result.inlierRatio = inlierRatio;
    if (inlierRatio < cfg.min_inlier_ratio) { result.reason = "inlier ratio"; return result; }
    if (cfg.max_allowed_gap > 0 || cfg.min_line_length > 0) {
      const dirX = -line.B, dirY = line.A;
      const proj = active.map(i => dirX * points[i].x + dirY * points[i].y).sort((p, q) => p - q);
      if (cfg.max_allowed_gap > 0) {
        let maxGap = 0;
        for (let k = 1; k < proj.length; k += 1) maxGap = Math.max(maxGap, proj[k] - proj[k - 1]);
        if (maxGap > cfg.max_allowed_gap) { result.reason = "gap"; return result; }
      }
      if (cfg.min_line_length > 0 && proj[proj.length - 1] - proj[0] < cfg.min_line_length) { result.reason = "line length"; return result; }
    }
    result.coefficients = { a: line.A, b: line.B, c: line.C };
    result.inlierIndices = active;
    result.valid = true;
    return result;
  }
}
// Inlier chord length along the fitted line (BuildBeamResultFromFit, node 2315-2327).
function lineExtent(points, inlierIndices, coefficients) {
  if (!points || !inlierIndices || !inlierIndices.length) return 0;
  const dirX = -coefficients.b, dirY = coefficients.a;
  let tMin = Infinity, tMax = -Infinity;
  for (const idx of inlierIndices) {
    const t = dirX * points[idx].x + dirY * points[idx].y;
    tMin = Math.min(tMin, t); tMax = Math.max(tMax, t);
  }
  return tMax > tMin ? tMax - tMin : 0;
}

// ── synthetic frames: one left rack, the drone advancing 0.16 m per 0.1 s frame ─
const WORLD = { headingRad: 33.5 * DEG, halfWidth: 1.6, frameCount: 150, dt: 0.1, faceCount: 160, interiorCount: 40 };
function makeFrame(i) {
  const rng = makeRng(4100 + i);
  const dir = headingVector(WORLD.headingRad), normal = normalVector(WORLD.headingRad);
  const along = 0.16 * i;
  const base = { x: dir.x * along + normal.x * WORLD.halfWidth, y: dir.y * along + normal.y * WORLD.halfWidth };
  const points = [];
  for (let k = 0; k < WORLD.faceCount; k += 1) {
    const t = randRange(rng, -1.6, 1.6), n = randNormal(rng, 0, 0.018);
    points.push({ x: base.x + dir.x * t + normal.x * n, y: base.y + dir.y * t + normal.y * n, kind: "face" });
  }
  for (let k = 0; k < WORLD.interiorCount; k += 1) {
    const t = randRange(rng, -1.6, 1.6), depth = randRange(rng, 0.06, 0.25) + randNormal(rng, 0, 0.025);
    points.push({ x: base.x + dir.x * t + normal.x * depth, y: base.y + dir.y * t + normal.y * depth, kind: "interior" });
  }
  return { frameIndex: i, stamp: i * WORLD.dt, fcuPose: { x: dir.x * along, y: dir.y * along, yaw: WORLD.headingRad }, points };
}

// The accumulator is stateful, so frames are processed in order once and cached by index.
const STATE = { cfg: { beam_pointcloud: { accumulation_window_sec: YAML.accumulation_window_sec, accumulation_max_points: YAML.accumulation_max_points } }, accumulator: new Map() };
const FITTER = new RecursiveLinRegFitter(fitterConfigFromYaml(YAML));
const RESULTS = [];
function resultAt(i) {
  while (RESULTS.length <= i) {
    const frame = makeFrame(RESULTS.length);
    const now = frame.stamp;
    cleanupOldEntries(STATE, now);                                          // ProcessBeamClouds, node 691-693
    const accumulated = updateAccumulator(STATE, TRACK_ID, now, frame.points);   // AddCloud + GetAccumulatedCloud, node 738-744
    const entries = STATE.accumulator.get(TRACK_ID).length;
    const single = FITTER.fitPlane(frame.points);
    const accum = FITTER.fitPlane(accumulated);
    RESULTS.push({ frame, accumulated, entries, single, accum });
  }
  return RESULTS[i];
}

// Builds a tiny world-to-screen renderer for one half of the canvas.
function makeWorld(p, rect, points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of points) { minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y); maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y); }
  minX -= 0.6; minY -= 0.6; maxX += 0.6; maxY += 0.6;
  const scale = Math.min(rect.w / (maxX - minX), rect.h / (maxY - minY));
  const cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5;
  return {
    toScreen(pt) { return { x: rect.x + rect.w * 0.5 + (pt.x - cx) * scale, y: rect.y + rect.h * 0.5 - (pt.y - cy) * scale }; },
    grid(label) {
      p.push(); p.stroke(42, 51, 72); p.noFill(); p.rect(rect.x, rect.y, rect.w, rect.h);
      p.noStroke(); p.fill(200, 210, 225); p.textSize(12); p.text(label, rect.x + 8, rect.y + 16); p.pop();
    },
    points(pts, color, size) {
      p.push(); p.stroke(color); p.strokeWeight(size);
      for (const pt of pts) { const s = this.toScreen(pt); p.point(s.x, s.y); }
      p.pop();
    },
    // Draws a*x + b*y + c = 0 as the inlier chord (plus a margin) around `through`.
    line(fit, pts, color, weight) {
      if (!fit.valid) return;
      const l = fit.coefficients, d = { x: -l.b, y: l.a };
      let tMin = Infinity, tMax = -Infinity;
      for (const k of fit.inlierIndices) { const t = d.x * pts[k].x + d.y * pts[k].y; tMin = Math.min(tMin, t); tMax = Math.max(tMax, t); }
      const foot = t => ({ x: d.x * t - l.a * l.c, y: d.y * t - l.b * l.c });
      const a = this.toScreen(foot(tMin - 0.2)), b = this.toScreen(foot(tMax + 0.2));
      p.push(); p.stroke(color); p.strokeWeight(weight); p.line(a.x, a.y, b.x, b.y); p.pop();
    },
    pose(pose, color) {
      const s = this.toScreen(pose);
      p.push(); p.noStroke(); p.fill(color); p.circle(s.x, s.y, 10);
      p.stroke(color); p.strokeWeight(3); p.line(s.x, s.y, s.x + Math.cos(pose.yaw) * 30, s.y - Math.sin(pose.yaw) * 30); p.pop();
    },
  };
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235); p.stroke(47, 58, 82); p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke(); p.fill(230); p.textStyle(p.BOLD); p.text("Accumulation (off by default)", x + 14, 96);
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
  const r = resultAt(i);
  const full = { x: 22, y: 70, w: p.width - 360, h: p.height - 95 };
  const half = Math.floor((full.w - 10) / 2);
  const leftRect = { x: full.x, y: full.y, w: half, h: full.h }, rightRect = { x: full.x + half + 10, y: full.y, w: half, h: full.h };
  const bounds = [r.frame.fcuPose, ...r.accumulated];
  const wSingle = makeWorld(p, leftRect, bounds), wAccum = makeWorld(p, rightRect, bounds);
  p.background(8, 10, 16);
  p.noStroke(); p.fill(232, 238, 248); p.textSize(18);
  p.text("Track accumulation", 22, 30);
  p.fill(149, 163, 184); p.textSize(12);
  p.text("Left: the single-frame fit the deployed node runs. Right: the same track accumulated over accumulation_window_sec, then fitted", 22, 50);
  wSingle.grid("single frame (enable_accumulation: false, deployed)");
  wSingle.points(r.frame.points, p.color(255, 199, 87, 90), 3);
  wSingle.points(r.single.inlierIndices.map(k => r.frame.points[k]), p.color(255, 199, 87, 230), 3.5);
  wSingle.line(r.single, r.frame.points, p.color(255, 255, 255), 2);
  wSingle.pose(r.frame.fcuPose, p.color(255, 199, 87));
  wAccum.grid("accumulated (enable_accumulation: true)");
  wAccum.points(r.accumulated, p.color(92, 235, 181, 60), 2.5);
  wAccum.points(r.accum.inlierIndices.map(k => r.accumulated[k]), p.color(92, 235, 181, 150), 2.5);
  wAccum.points(r.frame.points, p.color(255, 199, 87, 200), 3.5);
  wAccum.line(r.accum, r.accumulated, p.color(255, 255, 255), 2);
  wAccum.pose(r.frame.fcuPose, p.color(255, 199, 87));
  const fmt = (fit, pts) => (fit.valid ? `${fit.inlierIndices.length}/${pts.length} inliers, extent ${lineExtent(pts, fit.inlierIndices, fit.coefficients).toFixed(2)} m` : `invalid (${fit.reason})`);
  const heading = fit => (fit.valid ? (Math.atan2(fit.coefficients.a, -fit.coefficients.b) / DEG).toFixed(2) + " deg" : "-");
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `frame: ${i}   now: ${r.frame.stamp.toFixed(1)} s   track id: ${TRACK_ID}`,
    "",
    `enable_accumulation: ${YAML.enable_accumulation}   (deployed default)`,
    `accumulation_window_sec: ${YAML.accumulation_window_sec.toFixed(1)}`,
    `accumulation_max_points: ${YAML.accumulation_max_points}`,
    "",
    `entries in window: ${r.entries}   (oldest kept: ${(r.frame.stamp - STATE.accumulator.get(TRACK_ID)[0].stamp).toFixed(1)} s old)`,
    `accumulated points: ${r.accumulated.length}${r.accumulated.length >= YAML.accumulation_max_points ? " (cap reached)" : " (cap not reached)"}`,
    "",
    `single-frame fit: ${fmt(r.single, r.frame.points)}`,
    `   heading ${heading(r.single)}`,
    `accumulated fit: ${fmt(r.accum, r.accumulated)}`,
    `   heading ${heading(r.accum)}`,
    "",
    "enable_accumulation is false in the deployed",
    "YAML, so ProcessBeamClouds fits each frame's",
    "own points. With it on, CleanupOldEntries",
    "drops entries older than the window, AddCloud",
    "appends the new cloud (capped per track), and",
    "the combined cloud is what gets fitted.",
    "",
    "Yellow: current frame. Green: history in the",
    "window. Bright: inliers of each fit.",
    "The accumulated chord is longer, but it only",
    "helps while track_id stays on the same beam",
    "and odom does not drift within the window.",
  ]);
  if (!paused) simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
}
