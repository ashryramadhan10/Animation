const DEMO_ID = "centerline";
// Mirrors PoseCorrectorNode::BuildCenterlineMeasurement (src/pose_corrector_node.cpp 2763-2865),
// PoseCorrectorNode::ComputeDualCenterline (2949-2984) and AlignLineToHeading (3034-3059).
// Dual: midpoint of the two aligned rack lines, validated (normals dot >= 0.7, half width in
// [0.3, 6.0]). Single: the best-inlier line offset by the calibrated half width (else
// expected_rack_distance) toward the drone. Dual failed while initialised: freeze c.
const YAML = {                       // beam_pointcloud.* (deployed values)
  expected_rack_distance: 1.6,
};
const DEG = Math.PI / 180;
const HEADING = 33.4 * DEG;
const CALIBRATED_HALF_WIDTH = 1.55;  // what TryInitialCalibration stored on the first dual frame
const FCU = { x: 1.2, y: 0.9 };      // drone position in odom (single mode needs it for side_sign)

// Returns the unit vector that points along the aisle heading.
function headingVector(yaw) { return { x: Math.cos(yaw), y: Math.sin(yaw) }; }
// Left normal of an aisle heading: the (a, b) of a rack line ax+by+c=0 aligned to it.
function normalVector(yaw) { return { x: -Math.sin(yaw), y: Math.cos(yaw) }; }

// AlignLineToHeading — normalize and flip the sign so the normal points along (-sin, cos).
function alignLineToHeading(line, aisleYawRad) {
  let a = line.a, b = line.b, c = line.c;
  const norm = Math.hypot(a, b);
  if (norm < 1e-6) return { a: 0, b: 1, c: 0 };
  a /= norm; b /= norm; c /= norm;
  const refA = -Math.sin(aisleYawRad);
  const refB = Math.cos(aisleYawRad);
  if (a * refA + b * refB < 0) { a = -a; b = -b; c = -c; }
  return { a, b, c };
}

// ComputeDualCenterline — midpoint of the aligned left/right lines with the two validations.
// Returns null and a reason in `check` when dual mode is rejected.
function computeDualCenterline(leftCoeffs, rightCoeffs, aisleYawRad, check) {
  const aL = alignLineToHeading(leftCoeffs, aisleYawRad);
  const aR = alignLineToHeading(rightCoeffs, aisleYawRad);
  const dot = aL.a * aR.a + aL.b * aR.b;
  check.dot = dot; check.halfWidth = Math.abs(aL.c - aR.c) * 0.5; check.reason = "";
  if (dot < 0.7) { check.reason = "rack normals diverge"; return null; }
  const cCenter = (aL.c + aR.c) * 0.5;
  const halfWidth = check.halfWidth;
  if (halfWidth < 0.3 || halfWidth > 6.0) { check.reason = "unrealistic half_width"; return null; }
  let aAvg = (aL.a + aR.a) * 0.5, bAvg = (aL.b + aR.b) * 0.5;
  const norm = Math.hypot(aAvg, bAvg);
  if (norm < 1e-6) { check.reason = "degenerate normal"; return null; }
  aAvg /= norm; bAvg /= norm;
  return { a: aAvg, b: bAvg, cCenter, halfWidth };
}

// BuildCenterlineMeasurement, single-rack branch: offset the (best-inlier) line by the half width
// toward the drone. side_sign says which side of the line the drone is on.
function singleRackCenterline(lineCoeffs, aisleYawRad, fcu, halfW) {
  const aligned = alignLineToHeading(lineCoeffs, aisleYawRad);
  const signedDist = aligned.a * fcu.x + aligned.b * fcu.y + aligned.c;
  const sideSign = signedDist >= 0 ? 1 : -1;
  return { a: aligned.a, b: aligned.b, c: aligned.c - sideSign * halfW, sideSign, signedDist };
}

// ── simulation ─────────────────────────────────────────────────────────────
// Rack lines in odom, a x + b y + c = 0. The true aisle is centered on c = -0.4 with half width 1.55.
const TRUE_C = -0.4;
function rackLine(offset, skewRad = 0) {
  const n = normalVector(HEADING + skewRad), base = normalVector(HEADING);
  // A line through the point offset*base with normal n.
  const px = -base.x * (TRUE_C - offset), py = -base.y * (TRUE_C - offset);
  return { a: n.x, b: n.y, c: -(n.x * px + n.y * py) };
}
const PHASES = [
  { id: "dual", title: "dual: both racks visible", frames: 90 },
  { id: "single", title: "single: right rack missing", frames: 90 },
  { id: "frozen", title: "frozen c: dual failed (normals 50 deg apart)", frames: 90 },
];
const TOTAL = PHASES.reduce((s, ph) => s + ph.frames, 0);

// Runs one frame of BuildCenterlineMeasurement for the current phase. `state` mirrors the
// aisle state the node keeps between frames (only centerline_c matters here).
function measure(phase, t, state) {
  const wobble = 0.03 * Math.sin(0.07 * t);
  const left = rackLine(1.55 + wobble);
  const check = { dot: 0, halfWidth: 0, reason: "" };
  if (phase.id === "dual" || phase.id === "frozen") {
    const right = rackLine(-1.55 - wobble, phase.id === "frozen" ? 50 * DEG : 0);
    const dual = computeDualCenterline(left, right, HEADING, check);
    if (dual) {
      state.centerlineC = dual.cCenter;
      return { mode: "dual", line: { a: dual.a, b: dual.b, c: dual.cCenter }, halfWidth: dual.halfWidth, left, right, check };
    }
    // Dual failed with both beams present and the state initialised: freeze c, heading-only update.
    const af = alignLineToHeading(left, HEADING);
    return { mode: "dual-fallback-frozen-c", line: { a: af.a, b: af.b, c: state.centerlineC }, halfWidth: CALIBRATED_HALF_WIDTH, left, right, check };
  }
  const single = singleRackCenterline(left, HEADING, FCU, CALIBRATED_HALF_WIDTH);
  state.centerlineC = single.c;
  return { mode: "single", line: { a: single.a, b: single.b, c: single.c }, halfWidth: CALIBRATED_HALF_WIDTH, left, right: null, check, single };
}

// Builds a tiny world-to-screen renderer for this sketch.
function makeWorld(p) {
  const rect = { x: 22, y: 70, w: p.width - 360, h: p.height - 95 };
  const center = { x: 1.5, y: 0.5 };
  const scale = Math.min(rect.w / 9, rect.h / 7);
  return {
    toScreen(pt) {
      return { x: rect.x + rect.w * 0.5 + (pt.x - center.x) * scale, y: rect.y + rect.h * 0.5 - (pt.y - center.y) * scale };
    },
    grid() { p.push(); p.stroke(42, 51, 72); p.noFill(); p.rect(rect.x, rect.y, rect.w, rect.h); p.pop(); },
    segment(a, b, color, weight) {
      const sa = this.toScreen(a), sb = this.toScreen(b);
      p.push(); p.stroke(...color); p.strokeWeight(weight); p.line(sa.x, sa.y, sb.x, sb.y); p.pop();
    },
    // A line a x + b y + c = 0 drawn from t0 to t1 metres along its direction (-b, a).
    line(line, t0, t1, color, weight) {
      const n = Math.hypot(line.a, line.b) || 1;
      const a = line.a / n, b = line.b / n, c = line.c / n;
      const base = { x: -a * c, y: -b * c };
      this.segment({ x: base.x - b * t0, y: base.y + a * t0 }, { x: base.x - b * t1, y: base.y + a * t1 }, color, weight);
    },
    marker(pt, color, label) {
      const s = this.toScreen(pt);
      p.push(); p.noStroke(); p.fill(...color); p.circle(s.x, s.y, 12); p.fill(230); p.textSize(11); p.text(label, s.x + 10, s.y - 8); p.pop();
    },
  };
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235); p.stroke(47, 58, 82); p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke(); p.fill(230); p.textStyle(p.BOLD); p.text("BuildCenterlineMeasurement", x + 14, 96);
  p.textStyle(p.NORMAL); p.fill(210, 220, 235); p.textSize(12);
  lines.forEach((line, i) => p.text(line, x + 14, 128 + i * 18));
  p.pop();
}

const STATE = { centerlineC: TRUE_C };
let paused = false;
let simFrame = 0;
document.getElementById("pauseButton").addEventListener("click", (event) => {
  paused = !paused;
  event.currentTarget.textContent = paused ? "Resume" : "Pause";
});
document.getElementById("resetButton").addEventListener("click", () => { simFrame = 0; STATE.centerlineC = TRUE_C; });

// Creates the p5 canvas and fixes the animation update rate.
function setup() {
  createCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
  frameRate(30);
}

// Runs one animation frame and redraws the current method state.
function draw() {
  const p = window;
  const t = simFrame % TOTAL;
  let acc = 0, phase = PHASES[0], local = t;
  for (const ph of PHASES) { if (t < acc + ph.frames) { phase = ph; local = t - acc; break; } acc += ph.frames; }
  const m = measure(phase, local, STATE);
  const w = makeWorld(p);
  p.background(8, 10, 16);
  p.noStroke(); p.fill(232, 238, 248); p.textSize(18);
  p.text("Centerline estimation", 22, 30);
  p.fill(149, 163, 184); p.textSize(12);
  p.text("One sketch: dual = validated midpoint of two aligned lines; single = one line offset by the calibrated half width; dual failed = freeze c", 22, 50);
  w.grid();
  w.line(m.left, -5, 8, [83, 198, 255], 3);
  if (m.right) w.line(m.right, -5, 8, m.mode === "dual" ? [255, 199, 87] : [248, 113, 113], 3);
  w.line({ a: normalVector(HEADING).x, b: normalVector(HEADING).y, c: TRUE_C }, -5, 8, [60, 80, 60], 1);
  w.line(m.line, -5, 8, [163, 230, 53], 5);
  w.marker(FCU, [255, 199, 87], "FCU");
  const lines = [
    `const DEMO_ID = "${DEMO_ID}"`,
    `phase: ${phase.title}`,
    `mode: ${m.mode}`,
    `centerline c: ${m.line.c.toFixed(3)}   (true ${TRUE_C.toFixed(3)})`,
    `half width: ${m.halfWidth.toFixed(3)} m`,
  ];
  if (m.mode !== "single") {
    lines.push(`normals dot: ${m.check.dot.toFixed(3)} (>= 0.7)`);
    lines.push(`measured half width: ${m.check.halfWidth.toFixed(3)} (0.3..6.0)`);
    if (m.check.reason) lines.push(`dual REJECTED: ${m.check.reason}`);
  } else {
    lines.push(`side_sign: ${m.single.sideSign} (drone dist to rack ${m.single.signedDist.toFixed(3)})`);
    lines.push(`half width used: calibrated ${CALIBRATED_HALF_WIDTH}`);
    lines.push(`expected_rack_distance: ${YAML.expected_rack_distance} (fallback)`);
  }
  lines.push("", "Blue/yellow: aligned rack lines.", "Green: this frame's centerline.", "Dim green: the true aisle center.", "");
  if (m.mode === "dual") lines.push("Midpoint of the two lines; half width", "is measured, not assumed.");
  else if (m.mode === "single") lines.push("One line shifted by the half width", "toward the drone. Calibration made", "that width exact; before it the YAML", "expected_rack_distance is used.");
  else lines.push("Normals 50 deg apart: dot < 0.7, so", "dual is rejected. With the state", "initialised, c is FROZEN at its last", "value and only heading updates.");
  panel(p, lines);
  if (!paused) simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
}
