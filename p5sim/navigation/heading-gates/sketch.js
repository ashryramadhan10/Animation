const DEMO_ID = "heading-gates";
// Mirrors the heading-quality methods of PoseCorrectorNode in src/pose_corrector_node.cpp:
// IsBeamReliableForHeading (2108-2144), RateLimitHeading (2153-2182),
// ResetCooldownPassed (2614-2619), ShouldResetForHeadingJump (2635-2642), the
// heading-jump counter in ProcessPerScanData (2385-2398) and the inlier chord
// extent computed inline in BuildBeamResultFromFit (2315-2327).
const YAML = {
  heading_min_line_extent_m: 2.0,
  heading_min_inliers: 500,
  heading_min_inlier_ratio: 0.35,
  heading_max_rate_deg_s: 0.75,
  heading_jump_threshold_deg: 5.0,
  heading_jump_required_count: 2,
  yaw_reset_cooldown_sec: 0.7,   // read by ResetCooldownPassed for the jump reset too
};
const DEG = Math.PI / 180;
const AISLE_YAW = 33.5 * DEG;

// Unit vector along an aisle heading.
function headingVector(yaw) { return { x: Math.cos(yaw), y: Math.sin(yaw) }; }
// Left normal of an aisle heading: the (a, b) of a rack line ax+by+c=0 aligned to it.
function normalVector(yaw) { return { x: -Math.sin(yaw), y: Math.cos(yaw) }; }

// NormalizeAngle — twin of RackGeometryUtils::NormalizeAngle: wrap into [-pi, pi].
function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
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

// IsBeamReliableForHeading — extent, inlier count and ratio gates; the reason
// string is built with the same words and number formats as the C++ ostringstream.
function isBeamReliableForHeading(result, bp) {
  const failures = [];
  if (result.lineExtentM < bp.heading_min_line_extent_m) {
    failures.push(`extent ${result.lineExtentM.toFixed(2)}m < ${bp.heading_min_line_extent_m.toFixed(2)}m`);
  }
  if (result.inlierCount < bp.heading_min_inliers) {
    failures.push(`inliers ${result.inlierCount} < ${bp.heading_min_inliers}`);
  }
  if (result.inlierRatio < bp.heading_min_inlier_ratio) {
    failures.push(`ratio ${(result.inlierRatio * 100).toFixed(1)}% < ${(bp.heading_min_inlier_ratio * 100).toFixed(1)}%`);
  }
  return { valid: failures.length === 0, reason: failures.join(", ") };
}

// RateLimitHeading — clamp the heading step to max_rate * dt; dt outside (0, 1] s
// falls back to 1/30 s. Mutates state.lastHeadingRateLimitStamp like the node.
function rateLimitHeading(state, headingRad, stampSec, maxRateRadS) {
  if (maxRateRadS <= 0 || state.lastPublishedHeading === null || state.lastPublishedHeading === undefined) {
    state.lastHeadingRateLimitStamp = stampSec;
    return { heading: headingRad, limited: false, dt: 0, maxStep: 0 };
  }
  let dt = 0;
  if (state.lastHeadingRateLimitStamp !== null && state.lastHeadingRateLimitStamp !== undefined) {
    dt = stampSec - state.lastHeadingRateLimitStamp;
  }
  if (dt <= 0 || dt > 1) dt = 1 / 30;
  const maxStep = maxRateRadS * dt;
  const diff = normalizeAngle(headingRad - state.lastPublishedHeading);
  let limited = headingRad;
  let wasLimited = false;
  if (Math.abs(diff) > maxStep) {
    limited = normalizeAngle(state.lastPublishedHeading + Math.sign(diff) * maxStep);
    wasLimited = true;
  }
  state.lastHeadingRateLimitStamp = stampSec;
  return { heading: limited, limited: wasLimited, dt, maxStep };
}

// ResetCooldownPassed — true when no reset has happened or the cooldown elapsed.
function resetCooldownPassed(lastResetTime, nowSec, cooldownSec) {
  if (cooldownSec <= 0) return true;
  if (lastResetTime === null || lastResetTime === undefined) return true;
  return nowSec - lastResetTime >= cooldownSec;
}

// ShouldResetForHeadingJump — a heading more than the threshold from the last
// published one, once the cooldown has passed.
function shouldResetForHeadingJump(lastPublishedHeading, headingRad, thresholdRad, cooldownPassed) {
  if (lastPublishedHeading === null || lastPublishedHeading === undefined) return false;
  const diff = normalizeAngle(headingRad - lastPublishedHeading);
  if (Math.abs(diff) < thresholdRad) return false;
  return cooldownPassed;
}

const COUNT = 240;
const FRAME_DT = 0.1;                       // perception frames arrive at 10 Hz
const JUMP_WINDOW = { from: 150, to: 153 }; // +6 deg step in the requested heading
const DUPLICATE_STAMP_FRAME = 90;           // repeats the previous stamp: dt 0 -> 1/30 s fallback

// Frame stamp in seconds; one frame repeats its predecessor's stamp on purpose.
function stampOf(i) { return (i === DUPLICATE_STAMP_FRAME ? i - 1 : i) * FRAME_DT; }

// Synthetic beam for frame i: extent, inlier count and ratio each follow a sine
// over the 240-frame cycle, phase-shifted by 0 / 40 / 80 deg so the gate passes
// for a stretch, then fails on ratio, inliers and extent in turn, then recovers.
function beamAt(i) {
  const phase = 2 * Math.PI * i / COUNT;
  const extent = 2.1 + 1.3 * Math.sin(phase);                                        // 0.8 -> 3.4 m
  const inlierCount = Math.round(550 + 350 * Math.sin(phase + 2 * Math.PI / 9));    // 200 -> 900
  const inlierRatio = 0.5 + 0.3 * Math.sin(phase + 4 * Math.PI / 9);               // 0.2 -> 0.8
  const dir = headingVector(AISLE_YAW), n = normalVector(AISLE_YAW);
  const points = [], inlierIndices = [];
  for (let k = 0; k < 25; k += 1) {
    const t = -extent / 2 + extent * k / 24;
    const wobble = 0.015 * Math.sin(3.1 * k + 0.2 * i);
    points.push({ x: dir.x * t + n.x * wobble, y: dir.y * t + n.y * wobble });
    inlierIndices.push(k);
  }
  const coefficients = { a: n.x, b: n.y, c: 0 };
  return { points, inlierIndices, coefficients, lineExtentM: lineExtent(points, inlierIndices, coefficients), inlierCount, inlierRatio };
}

// Requested heading for frame i: a slow 3 deg sway plus the +6 deg step in the jump window.
function requestedHeadingRad(i) {
  const jump = i >= JUMP_WINDOW.from && i <= JUMP_WINDOW.to ? 6 : 0;
  return (33.5 + 3 * Math.sin(0.05 * i) + jump) * DEG;
}

// Runs the gate, the jump counter and the rate limiter over the loop with the
// node's state fields (ProcessPerScanData 2385-2398; every frame is "fresh").
function simulate() {
  const state = { lastPublishedHeading: null, lastHeadingRateLimitStamp: null, headingJumpCount: 0, lastResetTime: null };
  const maxRateRadS = YAML.heading_max_rate_deg_s * DEG;
  const thresholdRad = YAML.heading_jump_threshold_deg * DEG;
  const out = [];
  for (let i = 0; i < COUNT; i += 1) {
    const stamp = stampOf(i);
    const beam = beamAt(i);
    const requested = requestedHeadingRad(i);
    const rec = { i, stamp, beam, gate: isBeamReliableForHeading(beam, YAML), requested, published: null,
      limited: false, dt: 0, maxStep: 0, headingJumpCount: 0, resetFired: false, jumpDiffDeg: 0, cooldownPassed: true };
    if (state.lastPublishedHeading !== null) rec.jumpDiffDeg = normalizeAngle(requested - state.lastPublishedHeading) / DEG;
    rec.cooldownPassed = resetCooldownPassed(state.lastResetTime, stamp, YAML.yaw_reset_cooldown_sec);
    if (thresholdRad > 0 && shouldResetForHeadingJump(state.lastPublishedHeading, requested, thresholdRad, rec.cooldownPassed)) {
      if (state.headingJumpCount + 1 >= YAML.heading_jump_required_count) {
        // ResetTrackingState("heading jump", preserve_lateral=true), reduced to its heading fields.
        state.headingJumpCount = 0; state.lastPublishedHeading = null; state.lastHeadingRateLimitStamp = null; state.lastResetTime = stamp;
        rec.resetFired = true;
        out.push(rec); continue;
      }
      state.headingJumpCount += 1;
    } else {
      state.headingJumpCount = 0;
    }
    rec.headingJumpCount = state.headingJumpCount;
    const rl = rateLimitHeading(state, requested, stamp, maxRateRadS);
    state.lastPublishedHeading = rl.heading;   // ApplyVisionCorrection: last_published_heading_ = yaw
    Object.assign(rec, { published: rl.heading, limited: rl.limited, dt: rl.dt, maxStep: rl.maxStep });
    out.push(rec);
  }
  return out;
}
const RUN = simulate();

// Builds the two views: the beam chord in metres on the left, the heading strip on the right.
function makeViews(p) {
  const rect = { x: 22, y: 70, w: p.width - 360, h: p.height - 95 };
  const beamRect = { x: rect.x, y: rect.y, w: Math.floor(rect.w * 0.46), h: rect.h };
  const stripRect = { x: beamRect.x + beamRect.w + 16, y: rect.y, w: rect.w - beamRect.w - 16, h: rect.h };
  const scale = Math.min(beamRect.w, beamRect.h - 130) / 4.2;
  const cx = beamRect.x + beamRect.w / 2, cy = beamRect.y + (beamRect.h - 130) / 2;
  const yMin = 27, yMax = 43;
  return {
    beamRect, stripRect, yMin, yMax,
    toBeam(pt) { return { x: cx + pt.x * scale, y: cy - pt.y * scale }; },
    toStrip(i, deg) {
      return { x: stripRect.x + (i / (COUNT - 1)) * stripRect.w, y: stripRect.y + stripRect.h - ((deg - yMin) / (yMax - yMin)) * stripRect.h };
    },
    frames() {
      p.push(); p.stroke(42, 51, 72); p.noFill();
      p.rect(beamRect.x, beamRect.y, beamRect.w, beamRect.h); p.rect(stripRect.x, stripRect.y, stripRect.w, stripRect.h);
      for (let d = yMin; d <= yMax + 1e-9; d += 2) {
        const a = this.toStrip(0, d), b = this.toStrip(COUNT - 1, d);
        p.stroke(42, 51, 72); p.line(a.x, a.y, b.x, b.y);
        p.noStroke(); p.fill(90, 100, 120); p.textSize(10); p.text(`${d}`, b.x - 20, a.y - 3);
      }
      p.pop();
    },
  };
}

// Draws the beam as a bracketed chord along the aisle plus the three gate readouts.
function drawBeam(p, v, rec) {
  const { beam, gate } = rec;
  const dir = headingVector(AISLE_YAW), n = normalVector(AISLE_YAW);
  const half = beam.lineExtentM / 2;
  const color = gate.valid ? [82, 255, 168] : [248, 113, 113];
  const at = (t, s) => v.toBeam({ x: dir.x * t + n.x * s, y: dir.y * t + n.y * s });
  p.push();
  const a0 = at(-2.1, 0), a1 = at(2.1, 0);
  p.stroke(60, 70, 95); p.strokeWeight(1); p.line(a0.x, a0.y, a1.x, a1.y);
  p.stroke(...color); p.strokeWeight(3);
  const e0 = at(-half, 0), e1 = at(half, 0);
  p.line(e0.x, e0.y, e1.x, e1.y);
  for (const t of [-half, half]) { const b0 = at(t, 0.16), b1 = at(t, -0.16); p.line(b0.x, b0.y, b1.x, b1.y); }
  p.noStroke(); p.fill(230, 235, 245);
  beam.points.forEach(pt => { const s = v.toBeam(pt); p.circle(s.x, s.y, 4); });
  const mid = at(0, 0.3); p.fill(...color); p.textSize(11); p.text(`${beam.lineExtentM.toFixed(2)} m`, mid.x, mid.y);
  const rows = [
    [beam.lineExtentM >= YAML.heading_min_line_extent_m, `extent   ${beam.lineExtentM.toFixed(2)} m     min ${YAML.heading_min_line_extent_m.toFixed(2)} m`],
    [beam.inlierCount >= YAML.heading_min_inliers, `inliers  ${beam.inlierCount}     min ${YAML.heading_min_inliers}`],
    [beam.inlierRatio >= YAML.heading_min_inlier_ratio, `ratio    ${(beam.inlierRatio * 100).toFixed(1)}%     min ${(YAML.heading_min_inlier_ratio * 100).toFixed(1)}%`],
  ];
  const y0 = v.beamRect.y + v.beamRect.h - 92;
  p.textSize(12);
  rows.forEach(([pass, text], k) => {
    p.fill(...(pass ? [82, 255, 168] : [248, 113, 113]));
    p.text(`${pass ? "PASS" : "FAIL"}  ${text}`, v.beamRect.x + 14, y0 + k * 18);
  });
  p.fill(...color); p.text(gate.valid ? "heading valid: fresh heading published" : "heading held: gate failed", v.beamRect.x + 14, y0 + 62);
  p.fill(149, 163, 184); p.textSize(11); p.text("IsBeamReliableForHeading", v.beamRect.x + 14, v.beamRect.y + 18);
  p.pop();
}

// Draws requested vs published heading over the loop with the jump window and resets marked.
function drawStrip(p, v, upTo) {
  p.push();
  const w0 = v.toStrip(JUMP_WINDOW.from, v.yMax), w1 = v.toStrip(JUMP_WINDOW.to + 1, v.yMin);
  p.noStroke(); p.fill(255, 199, 87, 50); p.rect(w0.x, w0.y, w1.x - w0.x, w1.y - w0.y);
  p.noFill(); p.stroke(135, 148, 172); p.strokeWeight(1.5); p.beginShape();
  for (let i = 0; i <= upTo; i += 1) { const s = v.toStrip(i, RUN[i].requested / DEG); p.vertex(s.x, s.y); }
  p.endShape();
  p.stroke(82, 255, 168); p.strokeWeight(3); p.beginShape();
  for (let i = 0; i <= upTo; i += 1) {
    if (RUN[i].published === null) { p.endShape(); p.beginShape(); continue; }
    const s = v.toStrip(i, RUN[i].published / DEG); p.vertex(s.x, s.y);
  }
  p.endShape();
  for (let i = 0; i <= upTo; i += 1) {
    if (!RUN[i].resetFired) continue;
    const a = v.toStrip(i, v.yMax), b = v.toStrip(i, v.yMin);
    p.stroke(248, 113, 113); p.strokeWeight(2); p.line(a.x, a.y, b.x, b.y);
    p.noStroke(); p.fill(248, 113, 113); p.textSize(10); p.text("reset", a.x + 3, a.y + 12);
  }
  const c0 = v.toStrip(upTo, v.yMax), c1 = v.toStrip(upTo, v.yMin);
  p.stroke(230, 230, 230, 140); p.strokeWeight(1); p.line(c0.x, c0.y, c1.x, c1.y);
  p.noStroke(); p.fill(149, 163, 184); p.textSize(11);
  p.text("RateLimitHeading: requested (grey) vs published (green), deg", v.stripRect.x + 14, v.stripRect.y + 18);
  p.pop();
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235); p.stroke(47, 58, 82); p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke(); p.fill(230); p.textStyle(p.BOLD); p.text("Heading gates", x + 14, 96);
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
  const now = RUN[i];
  const v = makeViews(p);
  p.background(8, 10, 16);
  p.noStroke(); p.fill(232, 238, 248); p.textSize(18);
  p.text("Heading gates", 22, 30);
  p.fill(149, 163, 184); p.textSize(12);
  p.text("One sketch: extent / inliers / ratio gate -> heading jump counter -> rate limit at max_rate * dt", 22, 50);
  v.frames();
  drawBeam(p, v, now);
  drawStrip(p, v, i);
  const reasonLines = now.gate.valid ? ["reason: (none)"] : now.gate.reason.split(", ").map((r, k) => (k === 0 ? "reason: " : "        ") + r);
  const publishedLine = now.resetFired
    ? "published: none (reset, state cleared)"
    : `published: ${(now.published / DEG).toFixed(3)} deg   limited: ${now.limited}`;
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `frame: ${i}   stamp: ${now.stamp.toFixed(1)} s`,
    `gate: ${now.gate.valid ? "PASS" : "FAIL"}`,
    ...reasonLines,
    `requested: ${(now.requested / DEG).toFixed(3)} deg`,
    publishedLine,
    `dt: ${now.dt.toFixed(3)} s   max step: ${(now.maxStep / DEG).toFixed(3)} deg`,
    `jump diff: ${now.jumpDiffDeg.toFixed(2)} deg   cooldown ok: ${now.cooldownPassed}`,
    `headingJumpCount: ${now.headingJumpCount}${now.resetFired ? "   reset fired" : ""}`,
    "",
    `heading_min_line_extent_m: ${YAML.heading_min_line_extent_m}`,
    `heading_min_inliers: ${YAML.heading_min_inliers}`,
    `heading_min_inlier_ratio: ${YAML.heading_min_inlier_ratio}`,
    `heading_max_rate_deg_s: ${YAML.heading_max_rate_deg_s}`,
    `heading_jump_threshold_deg: ${YAML.heading_jump_threshold_deg}`,
    `heading_jump_required_count: ${YAML.heading_jump_required_count}`,
    `yaw_reset_cooldown_sec: ${YAML.yaw_reset_cooldown_sec}`,
    "",
    "Left: all three gates must pass or the",
    "node keeps its held heading (no limit).",
    "Right: a fresh heading moves at most",
    "0.75 deg/s * dt per frame, dt from the",
    "stamps (frame 90 repeats a stamp, so",
    "dt <= 0 falls back to 1/30 s).",
    "A jump >= 5 deg twice in a row, after",
    "the 0.7 s cooldown, resets heading",
    "state; the next frame publishes raw.",
  ]);
  if (!paused) simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
}
