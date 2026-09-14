const DEMO_ID = "line-fit";
// Mirrors src/beam_pointcloud/recursive_linreg_fitter.cpp (RecursiveLinRegFitter::FitPlane,
// FitLine2D) and the inlier-chord extent computed inline in
// PoseCorrectorNode::BuildBeamResultFromFit (src/pose_corrector_node.cpp 2315-2327).
const YAML = {                       // beam_pointcloud.* (deployed values)
  use_linreg_fitter: true,           // C++ default false
  linreg_distance_threshold: 0.05,
  linreg_min_inlier_ratio: 0.25,     // C++ default 0.5
  linreg_max_iterations: 10,
  linreg_max_allowed_gap: 3.0,
  linreg_min_line_length: 0.5,
  min_points_for_fitting: 10,
};
const DEG = Math.PI / 180;

// ── seeded random (sim-only, deterministic inputs) ────────────────────────────
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

// ── copied from scripts/line_fitter.js ────────────────────────────────────────
// FitLine2D — ordinary least squares, regressing on the better-conditioned axis.
// Returns {A, B, C, isValid} normalised so A^2 + B^2 = 1.
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
    // Regress y on x: y = slope*x + intercept
    let num = 0;
    for (const p of pts) num += (p.x - mx) * (p.y - my);
    if (Math.abs(varX) < 1e-9) { A = 1; B = 0; C = -mx; }
    else {
      const slope = num / varX, intercept = my - slope * mx;
      const norm = Math.hypot(slope, 1);
      A = slope / norm; B = -1 / norm; C = intercept / norm;
    }
  } else {
    // Regress x on y (near-vertical walls)
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
    distance_threshold: bp.linreg_distance_threshold,
    min_inlier_ratio: bp.linreg_min_inlier_ratio,
    min_points_for_fitting: bp.min_points_for_fitting,
    max_iterations: bp.linreg_max_iterations,
    max_allowed_gap: bp.linreg_max_allowed_gap,
    min_line_length: bp.linreg_min_line_length,
  };
}

class RecursiveLinRegFitter {
  constructor(config) {
    this.config = Object.assign({
      distance_threshold: 0.05, min_inlier_ratio: 0.5, min_points_for_fitting: 10,
      max_iterations: 10, max_allowed_gap: 3.0, min_line_length: 0.5,
    }, config);
  }
  getConfig() { return this.config; }

  // FitPlane — iterative inlier refinement, then ratio / gap / length validation.
  // `iterations` and `reason` are sim additions (the line-fit page animates the
  // refinement; the node logs the failure on its side).
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

  // ExtractInliers — the inlier subset in the original order.
  extractInliers(points, inlierIndices) {
    const out = [];
    for (const idx of inlierIndices) if (idx >= 0 && idx < points.length) out.push(points[idx]);
    return out;
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

// ── the three inputs (sim-only) ───────────────────────────────────────────────
// Points along a face line: origin (0, 0.75), heading 25 deg, parameter t along
// the line, `off` metres across it (positive = behind the face).
const FACE = { origin: { x: 0, y: 0.75 }, dir: { x: Math.cos(25 * DEG), y: Math.sin(25 * DEG) }, normal: { x: -Math.sin(25 * DEG), y: Math.cos(25 * DEG) } };
function facePoint(t, off) { return { x: FACE.origin.x + FACE.dir.x * t + FACE.normal.x * off, y: FACE.origin.y + FACE.dir.y * t + FACE.normal.y * off }; }
function segment(rng, count, tMin, tMax, offMin, offMax, sigma) {
  const out = [];
  for (let i = 0; i < count; i += 1) out.push(facePoint(randRange(rng, tMin, tMax), randRange(rng, offMin, offMax) + randNormal(rng, 0, sigma)));
  return out;
}
function makeInputs() {
  const rng = makeRng(8);
  return [
    { name: "clean beam + interior + outliers", expect: "valid",
      points: segment(rng, 180, -2.6, 2.6, 0, 0, 0.018).concat(segment(rng, 60, -2.6, 2.6, 0.06, 0.25, 0.02), segment(rng, 30, -2.8, 2.8, -0.9, 0.9, 0.05)) },
    { name: "two collinear clusters 4 m apart", expect: "rejected: gap",
      points: segment(rng, 60, -3.0, -2.0, 0, 0, 0.015).concat(segment(rng, 60, 2.0, 3.0, 0, 0, 0.015), segment(rng, 12, -1.5, 1.5, -0.6, 0.6, 0.05)) },
    { name: "0.3 m stub", expect: "rejected: line length",
      points: segment(rng, 40, -0.15, 0.15, 0, 0, 0.008) },
  ];
}

// sim: the inlier set the fitter validated. fitPlane only returns it when valid,
// so replay its rule: the last iteration that kept min_points_for_fitting points.
function finalIteration(fit) {
  let last = null;
  for (const it of fit.iterations) { if (it.inlierIndices.length < YAML.min_points_for_fitting) break; last = it; }
  return last;
}
// sim: the gap and span checks of FitPlane, with the points bounding the widest gap so it can be drawn.
function gapAndSpan(points, it) {
  const dirX = -it.line.b, dirY = it.line.a;
  const proj = it.inlierIndices.map(i => ({ t: dirX * points[i].x + dirY * points[i].y, p: points[i] })).sort((u, w) => u.t - w.t);
  let maxGap = 0, gapA = null, gapB = null;
  for (let k = 1; k < proj.length; k += 1) {
    const g = proj[k].t - proj[k - 1].t;
    if (g > maxGap) { maxGap = g; gapA = proj[k - 1].p; gapB = proj[k].p; }
  }
  return { maxGap, gapA, gapB, span: proj[proj.length - 1].t - proj[0].t, chordA: proj[0].p, chordB: proj[proj.length - 1].p };
}

const INPUTS = makeInputs();
const FITTER = new RecursiveLinRegFitter(fitterConfigFromYaml(YAML));
const RUNS = INPUTS.map(input => {
  const fit = FITTER.fitPlane(input.points);
  const last = finalIteration(fit);
  return { input, fit, last, checks: last ? gapAndSpan(input.points, last) : null, extent: last ? lineExtent(input.points, last.inlierIndices, last.line) : 0 };
});
const CYCLE = 120;   // frames per input (~4 s at 30 fps)

// ── world renderer ────────────────────────────────────────────────────────────
function makeWorld(p) {
  const rect = { x: 22, y: 70, w: p.width - 360, h: p.height - 95 };
  const bounds = { minX: -3.4, maxX: 3.4, minY: -1.0, maxY: 2.5 };
  const scale = Math.min(rect.w / (bounds.maxX - bounds.minX), rect.h / (bounds.maxY - bounds.minY));
  return {
    toScreen(pt) { return { x: rect.x + rect.w * 0.5 + pt.x * scale, y: rect.y + rect.h * 0.5 - (pt.y - 0.75) * scale }; },
    grid() {
      p.push(); p.stroke(42, 51, 72); p.noFill(); p.rect(rect.x, rect.y, rect.w, rect.h);
      for (let x = Math.ceil(bounds.minX); x <= bounds.maxX; x += 1) { const a = this.toScreen({ x, y: bounds.minY }), b = this.toScreen({ x, y: bounds.maxY }); p.line(a.x, a.y, b.x, b.y); }
      for (let y = Math.ceil(bounds.minY); y <= bounds.maxY; y += 1) { const a = this.toScreen({ x: bounds.minX, y }), b = this.toScreen({ x: bounds.maxX, y }); p.line(a.x, a.y, b.x, b.y); }
      p.pop();
    },
    points(pts, color, size) {
      p.push(); p.noStroke(); p.fill(color);
      for (const pt of pts) { const s = this.toScreen(pt); p.circle(s.x, s.y, size); }
      p.pop();
    },
    // Draws a*x + b*y + c = 0 across the view.
    line(line, color, weight) {
      const dirX = -line.b, dirY = line.a;
      const t0 = -(line.a * 0 + line.b * 0.75 + line.c);   // foot of the perpendicular from the view centre
      const base = { x: 0 + line.a * t0, y: 0.75 + line.b * t0 };
      const a = this.toScreen({ x: base.x - dirX * 5, y: base.y - dirY * 5 }), b = this.toScreen({ x: base.x + dirX * 5, y: base.y + dirY * 5 });
      p.push(); p.stroke(color); p.strokeWeight(weight); p.line(a.x, a.y, b.x, b.y); p.pop();
    },
    segment(pa, pb, color, weight, label) {
      const a = this.toScreen(pa), b = this.toScreen(pb);
      p.push(); p.stroke(color); p.strokeWeight(weight); p.line(a.x, a.y, b.x, b.y);
      p.noStroke(); p.fill(color); p.textSize(12); p.text(label, (a.x + b.x) / 2 + 8, (a.y + b.y) / 2 - 8); p.pop();
    },
    tag(text, color) {
      p.push(); p.noStroke(); p.fill(color); p.textSize(15); p.textStyle(p.BOLD); p.text(text, rect.x + 14, rect.y + 24); p.pop();
    },
  };
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235); p.stroke(47, 58, 82); p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke(); p.fill(230); p.textStyle(p.BOLD); p.text("RecursiveLinRegFitter::FitPlane", x + 14, 96);
  p.textStyle(p.NORMAL); p.fill(210, 220, 235); p.textSize(12);
  lines.forEach((line, i) => p.text(line, x + 14, 128 + i * 18));
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
  const runIndex = Math.floor(simFrame / CYCLE) % RUNS.length;
  const run = RUNS[runIndex];
  const { input, fit } = run;
  const phases = fit.iterations.length + 1;                      // each iteration, then the validation frame
  const phase = Math.min(phases - 1, Math.floor((simFrame % CYCLE) / (CYCLE / phases)));
  const finalPhase = phase === phases - 1;
  const it = finalPhase ? run.last : fit.iterations[phase];
  const inlierSet = new Set(it ? it.inlierIndices : []);
  const world = makeWorld(p);
  p.background(8, 10, 16);
  p.noStroke(); p.fill(232, 238, 248); p.textSize(18);
  p.text("Line fit", 22, 30);
  p.fill(149, 163, 184); p.textSize(12);
  p.text("One sketch: fit -> keep points within linreg_distance_threshold -> refit on the survivors -> gap and span checks", 22, 50);
  world.grid();
  world.points(input.points.filter((_, i) => !inlierSet.has(i)), p.color(248, 113, 113, 110), 4);
  world.points(input.points.filter((_, i) => inlierSet.has(i)), p.color(82, 255, 168, 190), 5);
  if (phase > 0 && fit.iterations[phase - 1]) world.line(fit.iterations[phase - 1].line, p.color(255, 255, 255, 60), 2);
  if (it) world.line(it.line, p.color(255, 255, 255), 3);
  let status = "";
  if (finalPhase && run.checks) {
    const c = run.checks;
    world.segment(c.chordA, c.chordB, p.color(82, 255, 168), 5, `span ${c.span.toFixed(2)} m`);
    if (c.gapA) world.segment(c.gapA, c.gapB, p.color(255, 199, 87), 7, `max gap ${c.maxGap.toFixed(2)} m`);
    status = fit.valid ? "VALID" : `REJECTED: reason "${fit.reason}"`;
    world.tag(status, fit.valid ? p.color(82, 255, 168) : p.color(248, 113, 113));
  } else if (finalPhase) {
    status = `REJECTED: reason "${fit.reason}"`;
    world.tag(status, p.color(248, 113, 113));
  } else {
    world.tag(`iteration ${phase + 1}/${fit.iterations.length}`, p.color(230));
  }
  const c = run.checks;
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `input ${runIndex + 1}/${RUNS.length}: ${input.name}`,
    `iteration: ${finalPhase ? "final" : phase + 1}/${fit.iterations.length}`,
    `inliers: ${it ? it.inlierIndices.length : 0}/${input.points.length}`,
    `ratio: ${it ? (it.inlierIndices.length / input.points.length).toFixed(3) : "-"}`,
    `span: ${c ? c.span.toFixed(2) : "-"} m   max gap: ${c ? c.maxGap.toFixed(2) : "-"} m`,
    `lineExtent (chord): ${run.extent.toFixed(2)} m`,
    `reason: ${fit.valid ? '"" (valid)' : `"${fit.reason}"`}`,
    "",
    `use_linreg_fitter: ${YAML.use_linreg_fitter}`,
    `linreg_distance_threshold: ${YAML.linreg_distance_threshold}`,
    `linreg_min_inlier_ratio: ${YAML.linreg_min_inlier_ratio}`,
    `linreg_max_iterations: ${YAML.linreg_max_iterations}`,
    `linreg_max_allowed_gap: ${YAML.linreg_max_allowed_gap}`,
    `linreg_min_line_length: ${YAML.linreg_min_line_length}`,
    `min_points_for_fitting: ${YAML.min_points_for_fitting}`,
    "",
    "Green: inliers of this iteration.",
    "Red: dropped. Refinement only ever",
    "SHRINKS the inlier set: a point dropped",
    "in iteration 1 is never recovered.",
  ]);
  if (!paused) simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
}
