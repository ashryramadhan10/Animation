const DEMO_ID = "calibration";
// Mirrors the aisle calibration of PoseCorrectorNode in src/pose_corrector_node.cpp:
// TryInitialCalibration (2989-3009), TryInitialCalibrationSingle (3015-3032) and the
// calibration blend at the top of ApplyVisionCorrection (2895-2917), plus
// AlignLineToHeading. The tracker EMA and TF broadcast that follow the blend in
// the node are out of scope for this page.
const YAML = {
  calibration_blend_alpha: 0.3,
  allow_single_rack_calibration: false,
  expected_rack_distance: 1.6,   // half width assumed by a single-rack measurement before calibration
};
const DEG = Math.PI / 180;
const AISLE_YAW = 33.5 * DEG;

// Unit vector along an aisle heading.
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

// aisle_calib_ — the node's one-shot calibration anchor.
function makeAisleCalib() { return { isCalibrated: false, fromSingleRack: false, halfWidth: 0, a: 0, b: 0, c: 0 }; }

// TryInitialCalibration — dual geometry always wins: it anchors once and upgrades a single-rack anchor.
function tryInitialCalibration(state, dual) {
  const c = state.aisleCalib;
  if (c.isCalibrated && !c.fromSingleRack) return false;
  c.isCalibrated = true; c.fromSingleRack = false;
  c.halfWidth = dual.halfWidth; c.a = dual.a; c.b = dual.b; c.c = dual.cCenter;
  return true;
}
// TryInitialCalibrationSingle — anchors only while nothing is calibrated yet (opt-in flag).
function tryInitialCalibrationSingle(state, a, b, cCl, halfW) {
  const c = state.aisleCalib;
  if (c.isCalibrated) return false;
  c.isCalibrated = true; c.fromSingleRack = true;
  c.halfWidth = halfW; c.a = a; c.b = b; c.c = cCl;
  return true;
}

// The calibration block of ApplyVisionCorrection (node 2895-2917): try to anchor,
// then blend the measured c toward the anchor before the tracker ever sees it.
function applyCalibrationBlend(state, meas, bp) {
  if (meas.dualSide) {
    tryInitialCalibration(state, { a: meas.a, b: meas.b, cCenter: meas.c, halfWidth: meas.halfWidthM });
    if (state.aisleCalib.isCalibrated) meas.c = bp.calibration_blend_alpha * meas.c + (1 - bp.calibration_blend_alpha) * state.aisleCalib.c;
  } else {
    if (bp.allow_single_rack_calibration) tryInitialCalibrationSingle(state, meas.a, meas.b, meas.c, meas.halfWidthM);
    if (state.aisleCalib.isCalibrated) meas.c = bp.calibration_blend_alpha * meas.c + (1 - bp.calibration_blend_alpha) * state.aisleCalib.c;
  }
  return meas;
}

const COUNT = 480;
const PHASE = 120;             // dual / single alternate every 120 frames
const DUAL_HALF_WIDTH = 1.58;  // the frame-0 dual measurement: half_width 1.58, c 0.21

// Raw centerline measurement for frame i: c wanders around 0.21; the fitted normal
// arrives with an arbitrary sign and scale so alignLineToHeading has real work.
function measurementAt(i, dualSide, calib, bp) {
  const yaw = AISLE_YAW + 0.4 * DEG * Math.sin(0.03 * i);
  const sign = i % 2 === 0 ? 1 : -1, scale = 1 + 0.5 * Math.abs(Math.sin(0.11 * i));
  const cRaw = 0.21 + 0.25 * Math.sin(0.07 * i);
  const raw = { a: sign * scale * -Math.sin(yaw), b: sign * scale * Math.cos(yaw), c: sign * scale * cRaw };
  const line = alignLineToHeading(raw, AISLE_YAW);
  // A single-rack measurement uses the calibrated half width, else expected_rack_distance
  // (BuildCenterlineMeasurement single branch); dual measures it directly.
  const halfWidthM = dualSide ? DUAL_HALF_WIDTH : (calib.isCalibrated ? calib.halfWidth : bp.expected_rack_distance);
  return { valid: true, dualSide, raw, a: line.a, b: line.b, c: line.c, halfWidthM };
}

// Runs the loop with the given phase order and flag; keeps every frame's record.
function runCalibration(dualFirst, allowSingle) {
  const bp = Object.assign({}, YAML, { allow_single_rack_calibration: allowSingle });
  const state = { aisleCalib: makeAisleCalib() };
  const out = [];
  let calibratedAt = null, upgradedAt = null;
  for (let i = 0; i < COUNT; i += 1) {
    const dualSide = (Math.floor(i / PHASE) % 2 === 0) === dualFirst;
    const meas = measurementAt(i, dualSide, state.aisleCalib, bp);
    const cMeas = meas.c;
    const before = Object.assign({}, state.aisleCalib);
    applyCalibrationBlend(state, meas, bp);
    const calib = state.aisleCalib;
    if (!before.isCalibrated && calib.isCalibrated) calibratedAt = i;
    if (before.fromSingleRack && !calib.fromSingleRack) upgradedAt = i;
    out.push({ i, dualSide, raw: meas.raw, a: meas.a, b: meas.b, cMeas, cBlend: meas.c, halfWidthM: meas.halfWidthM,
      calib: Object.assign({}, calib), calibratedAt, upgradedAt });
  }
  return out;
}
const MAIN = runCalibration(true, YAML.allow_single_rack_calibration);   // dual at frame 0
const ALT_OFF = runCalibration(false, false);                            // single first, flag off
const ALT_ON = runCalibration(false, true);                              // single first, flag on

// Builds the world view (odom metres, top) and the c strip chart (bottom) on the left.
function makeViews(p) {
  const rect = { x: 22, y: 70, w: p.width - 360, h: p.height - 95 };
  const worldRect = { x: rect.x, y: rect.y, w: rect.w, h: Math.floor(rect.h * 0.6) };
  const stripRect = { x: rect.x, y: worldRect.y + worldRect.h + 14, w: rect.w, h: rect.h - worldRect.h - 14 };
  const scale = Math.min(worldRect.w / 7.6, worldRect.h / 6.6);
  const cx = worldRect.x + worldRect.w / 2, cy = worldRect.y + worldRect.h / 2;
  const cMin = -0.15, cMax = 0.6;
  return {
    worldRect, stripRect, cMin, cMax,
    toWorld(pt) { return { x: cx + pt.x * scale, y: cy - pt.y * scale }; },
    toStrip(i, c) {
      return { x: stripRect.x + (i / (COUNT - 1)) * stripRect.w, y: stripRect.y + stripRect.h - ((c - cMin) / (cMax - cMin)) * stripRect.h };
    },
    frames() {
      p.push(); p.stroke(42, 51, 72); p.noFill();
      p.rect(worldRect.x, worldRect.y, worldRect.w, worldRect.h); p.rect(stripRect.x, stripRect.y, stripRect.w, stripRect.h);
      for (let c = 0; c <= cMax + 1e-9; c += 0.2) {
        const a = this.toStrip(0, c), b = this.toStrip(COUNT - 1, c);
        p.stroke(42, 51, 72); p.line(a.x, a.y, b.x, b.y);
        p.noStroke(); p.fill(90, 100, 120); p.textSize(10); p.text(c.toFixed(1), b.x - 22, a.y - 3);
      }
      p.pop();
    },
    // Draws the line a*x + b*y + c = 0 as a chord of +-3.2 m along the aisle.
    line(ln, color, weight, label) {
      const p0 = { x: -ln.c * ln.a, y: -ln.c * ln.b }, d = { x: -ln.b, y: ln.a };
      const s0 = this.toWorld({ x: p0.x - d.x * 3.2, y: p0.y - d.y * 3.2 }), s1 = this.toWorld({ x: p0.x + d.x * 3.2, y: p0.y + d.y * 3.2 });
      p.push(); p.stroke(...color); p.strokeWeight(weight); p.line(s0.x, s0.y, s1.x, s1.y);
      if (label) { p.noStroke(); p.fill(...color); p.textSize(11); p.text(label, s1.x + 6, s1.y); }
      p.pop();
    },
  };
}

// Draws the anchor racks and centerline (cyan), the measurement (orange) and the blend (green).
function drawWorld(p, v, rec) {
  const calib = rec.calib;
  if (calib.isCalibrated) {
    const anchor = { a: calib.a, b: calib.b, c: calib.c };
    v.line({ a: anchor.a, b: anchor.b, c: anchor.c - calib.halfWidth }, [56, 189, 248, 90], 4);
    v.line({ a: anchor.a, b: anchor.b, c: anchor.c + calib.halfWidth }, [56, 189, 248, 90], 4);
    v.line(anchor, [56, 189, 248], 2, `anchor c ${calib.c.toFixed(3)}`);
  }
  v.line({ a: rec.a, b: rec.b, c: rec.cMeas }, [255, 142, 88], 2, `meas c ${rec.cMeas.toFixed(3)}`);
  v.line({ a: rec.a, b: rec.b, c: rec.cBlend }, [82, 255, 168], 3, `blend c ${rec.cBlend.toFixed(3)}`);
  const o = v.toWorld({ x: 0, y: 0 });
  p.push(); p.noStroke(); p.fill(255, 199, 87); p.circle(o.x, o.y, 8); p.fill(230); p.textSize(11); p.text("odom origin", o.x + 8, o.y - 6);
  p.fill(149, 163, 184); p.text(`odom XY, aisle at ${(AISLE_YAW / DEG).toFixed(1)} deg${calib.isCalibrated ? "" : "   (no anchor yet)"}`, v.worldRect.x + 14, v.worldRect.y + 18);
  p.pop();
}

// Draws c over the loop: phase bands, measurement, blend and the anchor level.
function drawStrip(p, v, run, upTo) {
  p.push();
  for (let k = 0; k * PHASE < COUNT; k += 1) {
    const dual = run[k * PHASE].dualSide;
    const a = v.toStrip(k * PHASE, v.cMax), b = v.toStrip(Math.min(COUNT - 1, (k + 1) * PHASE), v.cMin);
    p.noStroke(); p.fill(...(dual ? [56, 189, 248, 22] : [255, 199, 87, 28])); p.rect(a.x, a.y, b.x - a.x, b.y - a.y);
    p.fill(149, 163, 184); p.textSize(10); p.text(dual ? "dual" : "single", a.x + 4, a.y + 12);
  }
  const trace = (key, color, weight) => {
    p.noFill(); p.stroke(...color); p.strokeWeight(weight); p.beginShape();
    for (let i = 0; i <= upTo; i += 1) { const s = v.toStrip(i, run[i][key]); p.vertex(s.x, s.y); }
    p.endShape();
  };
  trace("cMeas", [255, 142, 88], 1.5);
  trace("cBlend", [82, 255, 168], 3);
  const at = run[upTo].calibratedAt;
  if (at !== null) { const a = v.toStrip(at, run[upTo].calib.c), b = v.toStrip(upTo, run[upTo].calib.c); p.stroke(56, 189, 248); p.strokeWeight(2); p.line(a.x, a.y, b.x, b.y); }
  const c0 = v.toStrip(upTo, v.cMax), c1 = v.toStrip(upTo, v.cMin);
  p.stroke(230, 230, 230, 140); p.strokeWeight(1); p.line(c0.x, c0.y, c1.x, c1.y);
  p.noStroke(); p.fill(149, 163, 184); p.textSize(11); p.text("c over time: measurement (orange), blended (green), anchor (cyan)", v.stripRect.x + 14, v.stripRect.y + v.stripRect.h - 8);
  p.pop();
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235); p.stroke(47, 58, 82); p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke(); p.fill(230); p.textStyle(p.BOLD); p.text("Aisle calibration", x + 14, 96);
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
  const now = MAIN[i];
  const v = makeViews(p);
  p.background(8, 10, 16);
  p.noStroke(); p.fill(232, 238, 248); p.textSize(18);
  p.text("Aisle calibration", 22, 30);
  p.fill(149, 163, 184); p.textSize(12);
  p.text("One sketch: first dual measurement anchors once -> every later c is blended 0.3 meas / 0.7 anchor -> tracker", 22, 50);
  v.frames();
  drawWorld(p, v, now);
  drawStrip(p, v, MAIN, i);
  const off = ALT_OFF[COUNT - 1], on = ALT_ON[COUNT - 1];
  const alpha = YAML.calibration_blend_alpha;
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `frame: ${i}   measurement: ${now.dualSide ? "dual" : "single"}`,
    `calibration_blend_alpha: ${alpha}`,
    `allow_single_rack_calibration: ${YAML.allow_single_rack_calibration}`,
    `expected_rack_distance: ${YAML.expected_rack_distance}`,
    "",
    `isCalibrated: ${now.calib.isCalibrated}   fromSingleRack: ${now.calib.fromSingleRack}`,
    `calibrated at frame: ${now.calibratedAt === null ? "-" : now.calibratedAt}`,
    `c anchor: ${now.calib.isCalibrated ? now.calib.c.toFixed(3) : "-"}   half width: ${now.calib.isCalibrated ? now.calib.halfWidth.toFixed(3) : "-"}`,
    `raw fit: (${now.raw.a.toFixed(2)}, ${now.raw.b.toFixed(2)}, ${now.raw.c.toFixed(2)}) -> aligned`,
    `c measurement: ${now.cMeas.toFixed(3)}   half width: ${now.halfWidthM.toFixed(2)}`,
    `c blended: ${now.cBlend.toFixed(3)} = ${alpha}*meas + ${(1 - alpha).toFixed(1)}*anchor`,
    "",
    "Same series, single rack first:",
    `flag off: no anchor until frame ${off.calibratedAt}`,
    `  (first dual, c ${ALT_OFF[off.calibratedAt].calib.c.toFixed(3)}); before`,
    "  that c passes to the tracker as is.",
    `flag on: anchors at frame ${on.calibratedAt} from one`,
    `  rack (c ${ALT_ON[on.calibratedAt].calib.c.toFixed(3)}, hw ${ALT_ON[on.calibratedAt].calib.halfWidth.toFixed(2)} assumed),`,
    `  upgraded by the dual at frame ${on.upgradedAt}.`,
    "",
    "Cyan: anchor set once by the first",
    "dual measurement, never moved.",
    "Orange: this frame's aligned line.",
    "Green: the c the tracker receives.",
  ]);
  if (!paused) simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
}
