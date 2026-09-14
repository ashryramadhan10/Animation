const DEMO_ID = "rotation-filter";
// Mirrors include/warehouse_pose_corrector_vision_based/beam_pointcloud/rotation_search_filter.hpp
// (RotationSearchFilter, RotationFilterConfig, ApplyTwoStageRotationFilter), called from
// PoseCorrectorNode::ProcessBeamClouds (node 746-756) with last_published_heading_ as the
// estimated angle, only when use_rotation_filter is true and a heading has been published.
const DEG = Math.PI / 180;
const YAML = {
  use_rotation_filter: true,
  rot_coarse_pivot_distance: 3.0,
  rot_coarse_search_range_deg: 30.0,    // C++ default 20.0
  rot_coarse_search_step_deg: 5.0,
  rot_coarse_filter_threshold: 0.8,     // C++ default 0.5
  rot_fine_pivot_distance: 3.0,
  rot_fine_search_range_deg: 10.0,
  rot_fine_search_step_deg: 0.5,
  rot_fine_filter_threshold: 0.5,       // C++ default 0.3
};
const TIGHT_THRESHOLD = 0.1;            // second pass, sim-only: what the band filter is designed to do

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
function meanPoint(points) {
  if (!points.length) return { x: 0, y: 0 };
  let sx = 0, sy = 0;
  for (const p of points) { sx += p.x; sy += p.y; }
  return { x: sx / points.length, y: sy / points.length };
}

// ── RotationSearchFilter — sweep angles about a pivot offset from the centroid and
// keep the thin wall-face layer. `debug` is a sim addition for the demo page.
function rotationSearchFilter(points, estimatedAngle, pivotDistance, searchRangeDeg, searchStepDeg, filterThreshold, isLeftSide) {
  if (!points || !points.length) return { points: [], bestAngle: estimatedAngle, debug: null };
  const n = points.length;
  const avg = meanPoint(points);
  // Pivot: left wall -> (+sin, -cos) side; right wall -> (-sin, +cos) side.
  const pivotSign = isLeftSide ? 1 : -1;
  const pivot = { x: avg.x + pivotSign * pivotDistance * Math.sin(estimatedAngle), y: avg.y - pivotSign * pivotDistance * Math.cos(estimatedAngle) };
  const dx = new Array(n), dy = new Array(n);
  for (let i = 0; i < n; i += 1) { dx[i] = points[i].x - pivot.x; dy[i] = points[i].y - pivot.y; }
  const angleStart = estimatedAngle - searchRangeDeg * Math.PI / 180;
  const stepRad = searchStepDeg * Math.PI / 180;
  const numAngles = Math.floor(2 * searchRangeDeg / searchStepDeg) + 1;
  const angles = [], metrics = [], rotatedValues = [];
  let bestK = 0;
  let bestMetric = isLeftSide ? -1e10 : 1e10;
  for (let k = 0; k < numAngles; k += 1) {
    const angle = angleStart + k * stepRad;
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    const values = new Array(n);
    let metric = isLeftSide ? 1e10 : -1e10;
    for (let i = 0; i < n; i += 1) {
      const ry = cosA * dy[i] - sinA * dx[i];
      values[i] = ry;
      if (isLeftSide) { if (ry < metric) metric = ry; } else if (ry > metric) metric = ry;
    }
    angles.push(angle); metrics.push(metric); rotatedValues.push(values);
    const better = isLeftSide ? metric > bestMetric : metric < bestMetric;
    if (better) { bestMetric = metric; bestK = k; }
  }
  const bestValues = rotatedValues[bestK];
  const kept = [];
  for (let i = 0; i < n; i += 1) {
    const keep = isLeftSide ? bestValues[i] < bestMetric + filterThreshold : bestValues[i] > bestMetric - filterThreshold;
    if (keep) kept.push(points[i]);
  }
  return { points: kept, bestAngle: angles[bestK], debug: { pivot, angles, metrics, rotatedValues, bestIndex: bestK, bestMetric } };
}

// Maps beam_pointcloud.rot_* YAML keys onto RotationFilterConfig (node ctor 192-210).
function rotationFilterConfigFromYaml(bp) {
  return {
    coarse_pivot_distance: bp.rot_coarse_pivot_distance,
    coarse_search_range_deg: bp.rot_coarse_search_range_deg,
    coarse_search_step_deg: bp.rot_coarse_search_step_deg,
    coarse_filter_threshold: bp.rot_coarse_filter_threshold,
    fine_pivot_distance: bp.rot_fine_pivot_distance,
    fine_search_range_deg: bp.rot_fine_search_range_deg,
    fine_search_step_deg: bp.rot_fine_search_step_deg,
    fine_filter_threshold: bp.rot_fine_filter_threshold,
  };
}

// ApplyTwoStageRotationFilter — coarse sweep, then a fine sweep around the coarse best.
function applyTwoStageRotationFilter(points, estimatedAngle, isLeftSide, cfg) {
  if (!points || !points.length) return { points: points || [], coarse: null, fine: null };
  const coarse = rotationSearchFilter(points, estimatedAngle, cfg.coarse_pivot_distance, cfg.coarse_search_range_deg, cfg.coarse_search_step_deg, cfg.coarse_filter_threshold, isLeftSide);
  if (!coarse.points.length) return { points: coarse.points, coarse, fine: null };
  const fine = rotationSearchFilter(coarse.points, coarse.bestAngle, cfg.fine_pivot_distance, cfg.fine_search_range_deg, cfg.fine_search_step_deg, cfg.fine_filter_threshold, isLeftSide);
  return { points: fine.points, coarse, fine };
}

// ── the cloud: one left rack as the world builds it, seen with a 4 deg stale heading ─
const HEADING = 33.5 * DEG;
const ESTIMATED_ANGLE = HEADING + 4 * DEG;   // last_published_heading_, deliberately off by 4 deg
const IS_LEFT = true;
function makePointCloud() {
  const rng = makeRng(14);
  const dir = { x: Math.cos(HEADING), y: Math.sin(HEADING) }, normal = { x: -Math.sin(HEADING), y: Math.cos(HEADING) };
  const base = { x: normal.x * 1.6, y: normal.y * 1.6 };
  const points = [];
  for (let i = 0; i < 400; i += 1) {
    const t = randRange(rng, -1.6, 1.6), n = randNormal(rng, 0, 0.018);
    points.push({ x: base.x + dir.x * t + normal.x * n, y: base.y + dir.y * t + normal.y * n, kind: "face" });
  }
  for (let i = 0; i < 120; i += 1) {
    const t = randRange(rng, -1.6, 1.6), depth = randRange(rng, 0.06, 0.25) + randNormal(rng, 0, 0.025);
    points.push({ x: base.x + dir.x * t + normal.x * depth, y: base.y + dir.y * t + normal.y * depth, kind: "interior" });
  }
  return points;
}
const POINTS = makePointCloud();
const CFG = rotationFilterConfigFromYaml(YAML);
const YAML_RUN = applyTwoStageRotationFilter(POINTS, ESTIMATED_ANGLE, IS_LEFT, CFG);
const TIGHT_RUN = applyTwoStageRotationFilter(POINTS, ESTIMATED_ANGLE, IS_LEFT, Object.assign({}, CFG, { coarse_filter_threshold: TIGHT_THRESHOLD, fine_filter_threshold: TIGHT_THRESHOLD }));

// Kept / rejected split for one candidate of a sweep, using that candidate's own boundary.
function candidateSplit(points, debug, k, threshold) {
  const values = debug.rotatedValues[k], metric = debug.metrics[k];
  const kept = [], rejected = [];
  for (let i = 0; i < points.length; i += 1) {
    const keep = IS_LEFT ? values[i] < metric + threshold : values[i] > metric - threshold;
    (keep ? kept : rejected).push(points[i]);
  }
  return { kept, rejected };
}

// Animation phases: coarse sweep, coarse result, fine sweep, fine result, tight second pass.
const PHASES = [
  { id: "coarse-sweep", ticks: YAML_RUN.coarse.debug.angles.length * 6 },
  { id: "coarse-result", ticks: 60 },
  { id: "fine-sweep", ticks: YAML_RUN.fine.debug.angles.length * 2 },
  { id: "fine-result", ticks: 75 },
  { id: "tight-pass", ticks: 120 },
];
const CYCLE = PHASES.reduce((n, ph) => n + ph.ticks, 0);
function phaseAt(tick) {
  let t = tick % CYCLE;
  for (const ph of PHASES) { if (t < ph.ticks) return { id: ph.id, t, ticks: ph.ticks }; t -= ph.ticks; }
  return { id: PHASES[0].id, t: 0, ticks: PHASES[0].ticks };
}

// Builds a tiny world-to-screen renderer with fixed bounds around the rack.
function makeWorld(p, points, extra) {
  const rect = { x: 22, y: 70, w: p.width - 360, h: p.height - 95 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of points.concat(extra)) { minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y); maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y); }
  minX -= 0.4; minY -= 0.4; maxX += 0.4; maxY += 0.4;
  const scale = Math.min(rect.w / (maxX - minX), rect.h / (maxY - minY));
  const cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5;
  return {
    toScreen(pt) { return { x: rect.x + rect.w * 0.5 + (pt.x - cx) * scale, y: rect.y + rect.h * 0.5 - (pt.y - cy) * scale }; },
    grid() { p.push(); p.stroke(42, 51, 72); p.noFill(); p.rect(rect.x, rect.y, rect.w, rect.h); p.pop(); },
    points(pts, color, size) {
      p.push(); p.noStroke(); p.fill(color);
      for (const pt of pts) { const s = this.toScreen(pt); p.circle(s.x, s.y, size); }
      p.pop();
    },
    // The boundary ry = metric in the candidate frame about the pivot, plus the band edge at metric + threshold.
    boundary(pivot, angle, metric, threshold, color) {
      const dir = { x: Math.cos(angle), y: Math.sin(angle) }, normal = { x: -Math.sin(angle), y: Math.cos(angle) };
      for (const [offset, weight, alpha] of [[metric, 3, 255], [metric + (IS_LEFT ? threshold : -threshold), 1, 140]]) {
        const c = { x: pivot.x + normal.x * offset, y: pivot.y + normal.y * offset };
        const a = this.toScreen({ x: c.x - dir.x * 3, y: c.y - dir.y * 3 }), b = this.toScreen({ x: c.x + dir.x * 3, y: c.y + dir.y * 3 });
        p.push(); p.stroke(p.red(color), p.green(color), p.blue(color), alpha); p.strokeWeight(weight); p.line(a.x, a.y, b.x, b.y); p.pop();
      }
    },
    pivot(pt, label) {
      const s = this.toScreen(pt);
      p.push(); p.noStroke(); p.fill(82, 255, 168); p.circle(s.x, s.y, 12); p.fill(230); p.text(label, s.x + 10, s.y + 4); p.pop();
    },
  };
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235); p.stroke(47, 58, 82); p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke(); p.fill(230); p.textStyle(p.BOLD); p.text("Two-stage rotation filter", x + 14, 96);
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
  const ph = phaseAt(simFrame);
  const coarse = YAML_RUN.coarse, fine = YAML_RUN.fine;
  const w = makeWorld(p, POINTS, [coarse.debug.pivot]);
  p.background(8, 10, 16);
  p.noStroke(); p.fill(232, 238, 248); p.textSize(18);
  p.text("Rotation search filter", 22, 30);
  p.fill(149, 163, 184); p.textSize(12);
  p.text("Coarse sweep 30 / 5 / 0.8 -> fine sweep 10 / 0.5 / 0.5 about a pivot 3 m from the centroid; keep the band nearest the pivot", 22, 50);
  w.grid();
  const red = p.color(248, 113, 113), grey = p.color(111, 126, 153, 110), blue = p.color(83, 198, 255), orange = p.color(255, 142, 88);
  const status = [];
  if (ph.id === "coarse-sweep") {
    const k = Math.min(coarse.debug.angles.length - 1, Math.floor(ph.t / 6));
    const split = candidateSplit(POINTS, coarse.debug, k, CFG.coarse_filter_threshold);
    w.points(split.rejected, grey, 4); w.points(split.kept, red, 4);
    w.boundary(coarse.debug.pivot, coarse.debug.angles[k], coarse.debug.metrics[k], CFG.coarse_filter_threshold, red);
    w.pivot(coarse.debug.pivot, "coarse pivot");
    status.push("phase: coarse sweep", `candidate ${k + 1}/${coarse.debug.angles.length}: ${(coarse.debug.angles[k] / DEG).toFixed(1)} deg`, `min(rotated_y): ${coarse.debug.metrics[k].toFixed(3)}  (best so far: ${(coarse.debug.angles[coarse.debug.metrics.slice(0, k + 1).reduce((b, m, i, a) => (m > a[b] ? i : b), 0)] / DEG).toFixed(1)} deg)`, `would keep ${split.kept.length}/${POINTS.length} at threshold ${CFG.coarse_filter_threshold}`);
  } else if (ph.id === "coarse-result") {
    const split = candidateSplit(POINTS, coarse.debug, coarse.debug.bestIndex, CFG.coarse_filter_threshold);
    w.points(split.rejected, grey, 4); w.points(split.kept, red, 4);
    w.boundary(coarse.debug.pivot, coarse.bestAngle, coarse.debug.bestMetric, CFG.coarse_filter_threshold, red);
    w.pivot(coarse.debug.pivot, "coarse pivot");
    status.push("phase: coarse result", `best angle: ${(coarse.bestAngle / DEG).toFixed(1)} deg (true face 33.5)`, `kept ${coarse.points.length}/${POINTS.length} at threshold ${CFG.coarse_filter_threshold}`, "the fine sweep starts from this angle");
  } else if (ph.id === "fine-sweep") {
    const k = Math.min(fine.debug.angles.length - 1, Math.floor(ph.t / 2));
    const split = candidateSplit(coarse.points, fine.debug, k, CFG.fine_filter_threshold);
    w.points(split.rejected, grey, 4); w.points(split.kept, blue, 4);
    w.boundary(fine.debug.pivot, fine.debug.angles[k], fine.debug.metrics[k], CFG.fine_filter_threshold, blue);
    w.pivot(fine.debug.pivot, "fine pivot");
    status.push("phase: fine sweep (input: coarse output)", `candidate ${k + 1}/${fine.debug.angles.length}: ${(fine.debug.angles[k] / DEG).toFixed(1)} deg`, `min(rotated_y): ${fine.debug.metrics[k].toFixed(3)}`, `would keep ${split.kept.length}/${coarse.points.length} at threshold ${CFG.fine_filter_threshold}`);
  } else if (ph.id === "fine-result") {
    const split = candidateSplit(coarse.points, fine.debug, fine.debug.bestIndex, CFG.fine_filter_threshold);
    w.points(split.rejected, grey, 4); w.points(split.kept, blue, 4);
    w.boundary(fine.debug.pivot, fine.bestAngle, fine.debug.bestMetric, CFG.fine_filter_threshold, blue);
    w.pivot(fine.debug.pivot, "fine pivot");
    status.push("phase: fine result (deployed YAML)", `best angle: ${(fine.bestAngle / DEG).toFixed(1)} deg`, `kept ${YAML_RUN.points.length}/${POINTS.length} (${POINTS.filter(q => q.kind === "interior").length} interior points included)`, "0.5 m > 0.25 m interior band: nothing dropped");
  } else {
    const tf = TIGHT_RUN.fine, keptSet = new Set(TIGHT_RUN.points);
    w.points(POINTS.filter(q => !keptSet.has(q)), grey, 4); w.points(TIGHT_RUN.points, orange, 4);
    w.boundary(tf.debug.pivot, TIGHT_RUN.fine.bestAngle, tf.debug.bestMetric, TIGHT_THRESHOLD, orange);
    w.pivot(tf.debug.pivot, "fine pivot");
    const keptInterior = TIGHT_RUN.points.filter(q => q.kind === "interior").length, keptFace = TIGHT_RUN.points.length - keptInterior;
    status.push(`phase: second pass, thresholds ${TIGHT_THRESHOLD} (sim-only)`, `best angle: ${(TIGHT_RUN.fine.bestAngle / DEG).toFixed(1)} deg`, `kept ${TIGHT_RUN.points.length}/${POINTS.length}: ${keptFace} face, ${keptInterior} interior`, "this is what the band filter is designed to do");
  }
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `estimated angle (last_published_heading): ${(ESTIMATED_ANGLE / DEG).toFixed(1)} deg`,
    `is_left_side: ${IS_LEFT}   points: ${POINTS.length} (400 face, 120 interior)`,
    "",
    ...status,
    "",
    `use_rotation_filter: ${YAML.use_rotation_filter}`,
    `rot_coarse_pivot_distance: ${YAML.rot_coarse_pivot_distance}`,
    `rot_coarse_search_range_deg: ${YAML.rot_coarse_search_range_deg}`,
    `rot_coarse_search_step_deg: ${YAML.rot_coarse_search_step_deg}`,
    `rot_coarse_filter_threshold: ${YAML.rot_coarse_filter_threshold}`,
    `rot_fine_pivot_distance: ${YAML.rot_fine_pivot_distance}`,
    `rot_fine_search_range_deg: ${YAML.rot_fine_search_range_deg}`,
    `rot_fine_search_step_deg: ${YAML.rot_fine_search_step_deg}`,
    `rot_fine_filter_threshold: ${YAML.rot_fine_filter_threshold}`,
    "",
    "Thick line: boundary ry = min(rotated_y) for",
    "the candidate. Thin line: band edge at the",
    "threshold. Kept points lie between them.",
    "The YAML thresholds (0.8, 0.5) are wider than",
    "a typical 0.25 m interior band, so the deployed",
    "filter keeps everything for a typical rack; the",
    "last phase reruns it at 0.1 to show the band.",
  ]);
  if (!paused) simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
}
