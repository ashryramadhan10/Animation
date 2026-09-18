const DEMO_ID = "coefficient-smoothing";
// Mirrors the plane-coefficient EMA at the top of PoseCorrectorNode::BuildBeamResultFromFit
// (src/pose_corrector_node.cpp 2272-2300) and ComputeHeadingFromLineCoefficients.
// Lines are {a, b, c} with a x + b y + c = 0; the EMA runs per track id in smoothed_plane_coeffs_.
const YAML = {
  plane_coefficients_ema_alpha: 0.08,   // C++ default 0.3
};
const DEG = Math.PI / 180;
const AISLE_YAW = 33.5 * DEG;
const TRACK_ID = 1;

// ComputeHeadingFromLineCoefficients — direction (-b, a) forced into the +x half-plane.
function computeHeadingFromLineCoefficients(line) {
  let dx = -line.b;
  let dy = line.a;
  const norm = Math.hypot(dx, dy);
  if (norm < 1e-6) return 0;
  dx /= norm; dy /= norm;
  if (dx < 0) { dx = -dx; dy = -dy; }
  return Math.atan2(dy, dx);
}

// BuildBeamResultFromFit — the per-track coefficient EMA exactly as the node runs it
// (sim: the inlier chord extent and the heading gate that follow live on the heading-gates page).
function buildBeamResultFromFit(state, trackId, planeModel) {
  const bp = state.cfg.beam_pointcloud;
  let abc = { a: planeModel.coefficients.a, b: planeModel.coefficients.b, c: planeModel.coefficients.c };
  const rawNorm = Math.hypot(abc.a, abc.b);
  if (rawNorm > 1e-6) abc = { a: abc.a / rawNorm, b: abc.b / rawNorm, c: abc.c / rawNorm };

  const prev = state.smoothedPlaneCoeffs.get(trackId);
  const smoothingRestarted = !prev;
  if (prev) {
    if (prev.a * abc.a + prev.b * abc.b < 0) abc = { a: -abc.a, b: -abc.b, c: -abc.c };
    const alpha = bp.plane_coefficients_ema_alpha;
    let blended = { a: alpha * abc.a + (1 - alpha) * prev.a, b: alpha * abc.b + (1 - alpha) * prev.b, c: alpha * abc.c + (1 - alpha) * prev.c };
    const bn = Math.hypot(blended.a, blended.b);
    if (bn > 1e-6) blended = { a: blended.a / bn, b: blended.b / bn, c: blended.c / bn };
    state.smoothedPlaneCoeffs.set(trackId, blended);
    abc = blended;
  } else {
    state.smoothedPlaneCoeffs.set(trackId, abc);
  }

  return {
    trackId,
    heading: computeHeadingFromLineCoefficients(abc),
    valid: true,
    planeCoefficients: abc,
    smoothingRestarted,
  };
}

// ── simulation ─────────────────────────────────────────────────────────────
const COUNT = 480;
const FLIP_PERIOD = 120;

// The raw fit: a jittering, not-yet-unit line near the aisle. Every 120 frames the fitter's sign
// convention toggles, so (a, b, c) comes back negated: the same line, the opposite normal.
function rawFitAt(i) {
  const yaw = AISLE_YAW + (1.5 * Math.sin(0.33 * i) + 0.6 * Math.sin(1.2 * i)) * DEG;
  const c = 0.2 + 0.05 * Math.sin(0.21 * i) + 0.02 * Math.cos(0.77 * i);
  const scale = 1 + 0.4 * Math.sin(0.5 * i);
  const sign = Math.floor(i / FLIP_PERIOD) % 2 === 0 ? 1 : -1;
  return { sign, coefficients: { a: sign * scale * -Math.sin(yaw), b: sign * scale * Math.cos(yaw), c: sign * scale * c } };
}

// sim-only comparison: the same normalize -> blend -> renormalize without the sign check.
function naiveBlend(prev, raw, alpha) {
  const n = Math.hypot(raw.a, raw.b);
  const r = { a: raw.a / n, b: raw.b / n, c: raw.c / n };
  if (!prev) return r;
  const bl = { a: alpha * r.a + (1 - alpha) * prev.a, b: alpha * r.b + (1 - alpha) * prev.b, c: alpha * r.c + (1 - alpha) * prev.c };
  const bn = Math.hypot(bl.a, bl.b);
  return bn > 1e-6 ? { a: bl.a / bn, b: bl.b / bn, c: bl.c / bn } : bl;
}

// Runs the EMA over the whole series with one node state, keeping every frame for the animation.
function runSmoothing(count) {
  const state = { cfg: { beam_pointcloud: YAML }, smoothedPlaneCoeffs: new Map() };
  const out = [];
  let naive = null, flips = 0, lastSign = 1;
  for (let i = 0; i < count; i += 1) {
    const fit = rawFitAt(i);
    const prev = state.smoothedPlaneCoeffs.get(TRACK_ID);
    const flipBranch = !!prev && (prev.a * fit.coefficients.a + prev.b * fit.coefficients.b < 0);
    if (fit.sign !== lastSign) { flips += 1; lastSign = fit.sign; }
    const result = buildBeamResultFromFit(state, TRACK_ID, fit);
    naive = naiveBlend(naive, fit.coefficients, YAML.plane_coefficients_ema_alpha);
    out.push({ fit, result, naive, flipBranch, flips, rawHeading: computeHeadingFromLineCoefficients(fit.coefficients), naiveHeading: computeHeadingFromLineCoefficients(naive) });
  }
  return out;
}
const HISTORY = runSmoothing(COUNT);

// Builds a tiny world-to-screen renderer for this sketch.
function makeWorld(p) {
  const rect = { x: 22, y: 70, w: p.width - 360, h: p.height - 95 };
  const scale = Math.min(rect.w / 8, rect.h / 5.4);
  return {
    toScreen(pt) { return { x: rect.x + rect.w * 0.5 + pt.x * scale, y: rect.y + rect.h * 0.5 - pt.y * scale }; },
    grid() {
      p.push(); p.stroke(42, 51, 72); p.noFill(); p.rect(rect.x, rect.y, rect.w, rect.h);
      for (let x = -3; x <= 3; x += 1) { const a = this.toScreen({ x, y: -2.5 }), b = this.toScreen({ x, y: 2.5 }); p.line(a.x, a.y, b.x, b.y); }
      for (let y = -2; y <= 2; y += 1) { const a = this.toScreen({ x: -3.8, y }), b = this.toScreen({ x: 3.8, y }); p.line(a.x, a.y, b.x, b.y); }
      p.pop();
    },
    // A point on a line a x + b y + c = 0 at t metres along its direction (-b, a).
    linePoint(line, t) {
      const n = Math.hypot(line.a, line.b) || 1;
      const a = line.a / n, b = line.b / n, c = line.c / n;
      return { x: -a * c - b * t, y: -b * c + a * t };
    },
    line(line, color, weight, dashed) {
      const s0 = this.toScreen(this.linePoint(line, -3.6)), s1 = this.toScreen(this.linePoint(line, 3.6));
      p.push(); p.stroke(...color); p.strokeWeight(weight);
      if (dashed) p.drawingContext.setLineDash([6, 6]);
      p.line(s0.x, s0.y, s1.x, s1.y); p.pop();
    },
    // The (a, b) normal drawn at t metres along the line; its direction shows the sign convention.
    normalArrow(line, t, color, label) {
      const n = Math.hypot(line.a, line.b) || 1;
      const base = this.linePoint(line, t);
      const tip = { x: base.x + line.a / n * 0.7, y: base.y + line.b / n * 0.7 };
      const s0 = this.toScreen(base), s1 = this.toScreen(tip);
      p.push(); p.stroke(...color); p.strokeWeight(3); p.line(s0.x, s0.y, s1.x, s1.y);
      p.noStroke(); p.fill(...color); p.circle(s1.x, s1.y, 8); p.text(label, s1.x + 8, s1.y + 4); p.pop();
    },
    pointsOnLine(line) {
      p.push(); p.noStroke(); p.fill(111, 126, 153, 110);
      for (let k = 0; k < 120; k += 1) {
        const t = -2.8 + k / 119 * 5.6;
        const base = this.linePoint(line, t);
        const n = Math.hypot(line.a, line.b) || 1;
        const off = 0.04 * Math.sin(k * 0.9);
        const s = this.toScreen({ x: base.x + line.a / n * off, y: base.y + line.b / n * off });
        p.circle(s.x, s.y, 3);
      }
      p.pop();
    },
  };
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235); p.stroke(47, 58, 82); p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke(); p.fill(230); p.textStyle(p.BOLD); p.text("Coefficient EMA", x + 14, 96);
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
  const i = Math.floor(simFrame / 2) % COUNT;
  const item = HISTORY[i];
  const raw = item.fit.coefficients, smooth = item.result.planeCoefficients;
  const fmt = (l) => `(${l.a.toFixed(3)}, ${l.b.toFixed(3)}, ${l.c.toFixed(3)})`;
  const w = makeWorld(p);
  p.background(8, 10, 16);
  p.noStroke(); p.fill(232, 238, 248); p.textSize(18);
  p.text("Coefficient smoothing", 22, 30);
  p.fill(149, 163, 184); p.textSize(12);
  p.text("One sketch: per-track EMA on (a, b, c) — normalize, flip the sign if the normal reversed, blend, renormalize", 22, 50);
  w.grid();
  w.pointsOnLine(raw);
  w.line(item.naive, [248, 113, 113], 2, true);
  w.line(raw, [255, 142, 88], 2, false);
  w.line(smooth, [87, 220, 255], 4, false);
  w.normalArrow(raw, 1.4, [255, 142, 88], "raw (a, b)");
  w.normalArrow(smooth, 0.6, [87, 220, 255], "smoothed (a, b)");
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `frame: ${i}   track id: ${TRACK_ID}`,
    `plane_coefficients_ema_alpha: ${YAML.plane_coefficients_ema_alpha}`,
    `smoothingRestarted: ${item.result.smoothingRestarted}`,
    `raw sign convention: ${item.fit.sign > 0 ? "+1" : "-1"}`,
    `raw (a, b, c): ${fmt(raw)}`,
    `smoothed (a, b, c): ${fmt(smooth)}`,
    `raw heading: ${(item.rawHeading / DEG).toFixed(2)} deg`,
    `smoothed heading: ${(item.result.heading / DEG).toFixed(2)} deg`,
    `naive EMA (no flip) heading: ${(item.naiveHeading / DEG).toFixed(2)} deg`,
    `flip branch fired (dot < 0): ${item.flipBranch}`,
    `sign-flip events: ${item.flips}`,
    "",
    "Orange: raw fit; its normal arrow",
    "reverses every 120 frames while the",
    "line itself stays put.",
    "Cyan: the node's EMA. The flip keeps",
    "the normal consistent, so the line",
    "does not jump on a sign change.",
    "Red dotted: the same blend without",
    "the flip; it collapses and swings.",
  ]);
  if (!paused) simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
}
