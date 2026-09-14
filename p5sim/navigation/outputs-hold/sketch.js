const DEMO_ID = "outputs-hold";
// Mirrors VisionCorrectionPropagationTimer (1244-1285), the stored correction
// (1144-1242) and PublishRackPoseFromHeading (3253-3317) of PoseCorrectorNode in
// src/pose_corrector_node.cpp, plus build_vision_correction_transform in
// include/warehouse_pose_corrector_vision_based/vision_correction_transform.hpp.
const YAML = {                        // vision_correction in the deployed YAML
  odom_frame: "odom_vision_correction",
  base_frame: "base_link_odom_vision_correction",
  propagation_enabled: true,
  publish_identity_until_ready: true,
  propagation_rate_hz: 50.0,          // C++ default 30.0
  max_pose_age_sec: 0.25,
  max_correction_age_sec: 0.0,        // 0 means no age limit on the held correction
};
const AISLE_YAW = 33.5 * Math.PI / 180;
const TICK_COUNT = 300;
const TICK_DT = 1 / 30;               // the combined app's clock: 30 Hz ticks, a frame every third tick
const FRAME_EVERY = 3;
const FIRST_FRAME_TICK = 30;          // perception warm-up: the timer runs before the first frame
const DROPOUT = { from: 150, to: 209 };
const X_OFFSET_READY_TICK = 90;       // the x-offset stage reports its first measurement here
const X_OFFSET_M = 0.6;
const SPEED_M_S = 1.0;
const LATERAL_M = 0.3;                // the raw pose sits 0.3 m left of the centerline

// NormalizeAngle — twin of RackGeometryUtils::NormalizeAngle: wrap into [-pi, pi].
function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}
// Unit vector along an aisle heading.
function headingVector(yaw) { return { x: Math.cos(yaw), y: Math.sin(yaw) }; }
// Left normal of an aisle heading: the (a, b) of a rack line ax+by+c=0 aligned to it.
function normalVector(yaw) { return { x: -Math.sin(yaw), y: Math.cos(yaw) }; }
function radiansToDegrees(radians) { return radians * 180 / Math.PI; }

// DroneYToCenterlineFromSignedError — the published telemetry negates the internal sign.
function droneYToCenterlineFromSignedError(signedDroneDistanceToCenterlineM) {
  return -signedDroneDistanceToCenterlineM;
}

// build_vision_correction_transform — the two TF edges plus the corrected pose.
function buildVisionCorrectionTransform(rawFcuPose, correctedX, correctedY, correctedZ, aisleYawRad) {
  const rawX = rawFcuPose.x, rawY = rawFcuPose.y, rawZ = rawFcuPose.z || 0;
  const correctionYaw = normalizeAngle(-aisleYawRad);
  const cosC = Math.cos(correctionYaw), sinC = Math.sin(correctionYaw);
  const deltaX = correctedX - rawX;
  const deltaY = correctedY - rawY;
  const correctionX = cosC * deltaX - sinC * deltaY;
  const correctionY = sinC * deltaX + cosC * deltaY;
  const correctionZ = correctedZ - rawZ;
  const rawYaw = normalizeAngle(rawFcuPose.yaw);
  const childYaw = rawYaw;
  const composedYaw = normalizeAngle(correctionYaw + childYaw);
  return {
    mapToVisionOdom: { x: correctionX, y: correctionY, z: correctionZ, yaw: correctionYaw },
    visionOdomToBase: { x: rawX, y: rawY, z: rawZ, yaw: childYaw },
    correctedPose: {
      x: cosC * rawX - sinC * rawY + correctionX,
      y: sinC * rawX + cosC * rawY + correctionY,
      z: rawZ + correctionZ,
      yaw: composedYaw,
    },
    rawYaw, correctionYaw, childYaw, composedYaw,
  };
}

// ComposeStoredCorrectionPose — apply a stored map->vision_odom edge to a raw FCU pose.
function composeStoredCorrectionPose(mapToVisionOdom, fcuPose) {
  const c = Math.cos(mapToVisionOdom.yaw), s = Math.sin(mapToVisionOdom.yaw);
  return {
    x: c * fcuPose.x - s * fcuPose.y + mapToVisionOdom.x,
    y: s * fcuPose.x + c * fcuPose.y + mapToVisionOdom.y,
    z: (fcuPose.z || 0) + (mapToVisionOdom.z || 0),
    yaw: normalizeAngle(mapToVisionOdom.yaw + normalizeAngle(fcuPose.yaw)),
  };
}

// ── stored correction (1144-1242) ───────────────────────────────────────────
function storeVisionCorrectionState(state, visionTf, stamp, yIntercept, distToCenterline) {
  const s = state.stored;
  s.mapToVisionOdom = Object.assign({}, visionTf.mapToVisionOdom);
  s.stamp = stamp;
  s.poseOffsetXRaw = state.xOffset.xOffsetRaw;
  s.poseOffsetXFiltered = state.xOffset.xOffsetFiltered;
  s.poseOffsetYRaw = yIntercept;
  s.poseOffsetYFiltered = yIntercept;
  s.droneDistToCl = distToCenterline;
  s.isIdentity = false;
}
function storeIdentityVisionCorrectionState(state, stamp) {
  const s = state.stored;
  s.mapToVisionOdom = { x: 0, y: 0, z: 0, yaw: 0 };
  s.stamp = stamp;
  s.poseOffsetXRaw = 0; s.poseOffsetXFiltered = 0; s.poseOffsetYRaw = 0; s.poseOffsetYFiltered = 0;
  s.droneDistToCl = 0;
  s.headingOffsetDeg = null; s.centerlineYawDeg = null;
  s.isIdentity = true;
}
function publishStoredVisionCorrection(state, fcuPoseMsg, stamp) {
  const s = state.stored;
  if (!s.mapToVisionOdom) return null;
  const mapToVisionOdom = Object.assign({}, s.mapToVisionOdom);
  const visionOdomToBase = { x: fcuPoseMsg.x, y: fcuPoseMsg.y, z: fcuPoseMsg.z || 0, yaw: normalizeAngle(fcuPoseMsg.yaw) };
  const correctedPose = composeStoredCorrectionPose(mapToVisionOdom, fcuPoseMsg);
  const diagnostics = { poseOffsetXRaw: s.poseOffsetXRaw, poseOffsetYRaw: s.poseOffsetYRaw, droneYToCenterline: droneYToCenterlineFromSignedError(s.droneDistToCl) };
  // The atomic measurement keeps the real perception stamp, not the tick time,
  // and stays silent while only the identity placeholder is stored.
  const measurement = s.centerlineYawDeg !== null
    ? { stamp: s.stamp, centerlineYawDeg: s.centerlineYawDeg, poseOffsetYM: s.poseOffsetYFiltered, poseOffsetXM: s.poseOffsetXFiltered, hasX: state.xOffset.xOffsetHasMeasurement }
    : null;
  return { tickStamp: stamp, mapToVisionOdom, visionOdomToBase, correctedPose, diagnostics, measurement };
}

// ── VisionCorrectionPropagationTimer (1244-1285) ────────────────────────────
function propagationTick(state, latestPose, nowSec) {
  const vc = state.cfg.vision_correction;
  const tick = { published: false, reason: "", isIdentity: false, tickStamp: nowSec, mapToVisionOdom: null, visionOdomToBase: null, correctedPose: null, diagnostics: null, measurement: null };
  if (!state.stored.mapToVisionOdom) {
    if (!vc.publish_identity_until_ready) { tick.reason = "identity disabled"; return tick; }
    storeIdentityVisionCorrectionState(state, nowSec);
  }
  if (state.stored.isIdentity) {
    state.stored.stamp = nowSec;   // startup placeholder, never "stale"
  } else if (vc.max_correction_age_sec > 0) {
    if (Math.abs(nowSec - state.stored.stamp) > vc.max_correction_age_sec) { tick.reason = "correction stale"; return tick; }
  }
  if (!latestPose) { tick.reason = "no pose"; return tick; }
  state.latestFcuPose = latestPose;
  if (vc.max_pose_age_sec > 0 && latestPose.stamp !== undefined && latestPose.stamp !== null) {
    if (Math.abs(nowSec - latestPose.stamp) > vc.max_pose_age_sec) { tick.reason = "pose stale"; return tick; }
  }
  const out = publishStoredVisionCorrection(state, latestPose, nowSec);
  if (!out) { tick.reason = "nothing stored"; return tick; }
  Object.assign(tick, out);
  tick.published = true;
  tick.isIdentity = state.stored.isIdentity;
  return tick;
}

// The node state this page needs: the stored correction, the x-offset stage
// output, the newest pose seen by the timer, and the vision_correction config.
function makeState() {
  return {
    cfg: { vision_correction: YAML },
    latestFcuPose: null,
    xOffset: { xOffsetRaw: 0, xOffsetFiltered: 0, xOffsetHasMeasurement: false },
    stored: {
      mapToVisionOdom: null, stamp: null, isIdentity: false,
      poseOffsetXRaw: 0, poseOffsetXFiltered: 0, poseOffsetYRaw: 0, poseOffsetYFiltered: 0,
      droneDistToCl: 0, headingOffsetDeg: null, centerlineYawDeg: null, headingOffsetRawDeg: null,
    },
  };
}

// Raw FCU pose in odom at time t: along the aisle at 1 m/s, 0.3 m left of the centerline.
function rawPoseAt(t) {
  const h = headingVector(AISLE_YAW), n = normalVector(AISLE_YAW);
  const along = SPEED_M_S * t;
  return { x: h.x * along + n.x * LATERAL_M, y: h.y * along + n.y * LATERAL_M, z: 0, yaw: AISLE_YAW + (5 * Math.PI / 180) * Math.sin(0.9 * t), stamp: t };
}

// sim: one perception frame, the tail of BroadcastVisionCorrectedTF (1299-1400) for a
// known centerline: move the pose 0.3 m toward the centerline, add the x offset along
// the heading, build the transform, store it with the frame's real perception stamp.
function perceptionFrame(state, pose, stamp) {
  const h = headingVector(AISLE_YAW), n = normalVector(AISLE_YAW);
  const distToCenterline = LATERAL_M;
  const correctedX = pose.x - distToCenterline * n.x + state.xOffset.xOffsetFiltered * h.x;
  const correctedY = pose.y - distToCenterline * n.y + state.xOffset.xOffsetFiltered * h.y;
  const tf = buildVisionCorrectionTransform(pose, correctedX, correctedY, pose.z || 0, AISLE_YAW);
  storeVisionCorrectionState(state, tf, stamp, 0, distToCenterline);
  const deg = radiansToDegrees(AISLE_YAW);   // PublishRackPoseFromHeading: the stored yaw
  state.stored.headingOffsetRawDeg = deg;
  state.stored.centerlineYawDeg = deg;
  state.stored.headingOffsetDeg = deg;
  return tf;
}

// Runs the 300-tick timeline once: a frame every third tick after warm-up, none in the dropout.
function runTimeline() {
  const state = makeState();
  const ticks = [];
  for (let k = 0; k < TICK_COUNT; k += 1) {
    const t = k * TICK_DT;
    const pose = rawPoseAt(t);
    if (k === X_OFFSET_READY_TICK) state.xOffset = { xOffsetRaw: X_OFFSET_M, xOffsetFiltered: X_OFFSET_M, xOffsetHasMeasurement: true };
    const isFrame = k >= FIRST_FRAME_TICK && k % FRAME_EVERY === 0 && !(k >= DROPOUT.from && k <= DROPOUT.to);
    if (isFrame) perceptionFrame(state, pose, t);
    const tick = propagationTick(state, pose, t);
    ticks.push({ k, t, pose, isFrame, tick });
  }
  return ticks;
}
const RUN = runTimeline();

// Builds a fixed world-to-screen renderer (map frame) plus the timeline strip below it.
function makeWorld(p) {
  const rect = { x: 22, y: 70, w: p.width - 360, h: p.height - 95 - 78 };
  const strip = { x: 22, y: p.height - 25 - 66, w: p.width - 360, h: 66 };
  const scale = Math.min(rect.w / 13, rect.h / 8);
  return {
    rect, strip,
    toScreen(pt) { return { x: rect.x + (pt.x + 1.5) * scale, y: rect.y + rect.h - (pt.y + 1.5) * scale }; },
    tickX(k) { return strip.x + 8 + (k / (TICK_COUNT - 1)) * (strip.w - 16); },
    grid() {
      p.push(); p.stroke(42, 51, 72); p.noFill(); p.rect(rect.x, rect.y, rect.w, rect.h); p.rect(strip.x, strip.y, strip.w, strip.h);
      for (let x = -1; x <= 11; x += 1) { const a = this.toScreen({ x, y: -1.5 }), b = this.toScreen({ x, y: 6.5 }); p.line(a.x, a.y, b.x, b.y); }
      for (let y = -1; y <= 6; y += 1) { const a = this.toScreen({ x: -1.5, y }), b = this.toScreen({ x: 11.5, y }); p.line(a.x, a.y, b.x, b.y); }
      p.pop();
    },
    segment(a, b, color, weight) {
      const sa = this.toScreen(a), sb = this.toScreen(b);
      p.push(); p.stroke(...color); p.strokeWeight(weight); p.line(sa.x, sa.y, sb.x, sb.y); p.pop();
    },
    path(points, color, weight) {
      p.push(); p.noFill(); p.stroke(...color); p.strokeWeight(weight); p.beginShape();
      points.forEach(pt => { const s = this.toScreen(pt); p.vertex(s.x, s.y); }); p.endShape(); p.pop();
    },
    axis(origin, yaw, color, label) {
      const s = this.toScreen(origin);
      const xt = this.toScreen({ x: origin.x + Math.cos(yaw) * 0.8, y: origin.y + Math.sin(yaw) * 0.8 });
      const yt = this.toScreen({ x: origin.x - Math.sin(yaw) * 0.5, y: origin.y + Math.cos(yaw) * 0.5 });
      p.push(); p.strokeWeight(3); p.stroke(...color); p.line(s.x, s.y, xt.x, xt.y); p.stroke(120, 200, 120); p.line(s.x, s.y, yt.x, yt.y);
      p.noStroke(); p.fill(...color); p.circle(s.x, s.y, 8); p.textSize(11); p.text(label, s.x + 8, s.y + 16); p.pop();
    },
    band(from, to, color, label) {
      p.push(); p.noStroke(); p.fill(...color); p.rect(this.tickX(from), strip.y + 1, this.tickX(to) - this.tickX(from), strip.h - 2);
      p.fill(220); p.textSize(11); p.text(label, this.tickX(from) + 6, strip.y + 16); p.pop();
    },
    mark(k, color, weight, h) { p.push(); p.stroke(...color); p.strokeWeight(weight); p.line(this.tickX(k), strip.y + strip.h - h, this.tickX(k), strip.y + strip.h - 1); p.pop(); },
  };
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235); p.stroke(47, 58, 82); p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke(); p.fill(230); p.textStyle(p.BOLD); p.text("Propagation timer and hold", x + 14, 96);
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
  const k = simFrame % TICK_COUNT;
  const now = RUN[k];
  const tick = now.tick;
  const h = headingVector(AISLE_YAW);
  const w = makeWorld(p);
  const inDropout = k >= DROPOUT.from && k <= DROPOUT.to;
  const stampTick = tick.measurement ? Math.round(tick.measurement.stamp / TICK_DT) : null;
  p.background(8, 10, 16);
  p.noStroke(); p.fill(232, 238, 248); p.textSize(18);
  p.text("Propagation timer: outputs and hold", 22, 30);
  p.fill(149, 163, 184); p.textSize(12);
  p.text("Every tick: identity until the first frame -> age guards -> republish the stored map->odom_vision_correction edge against the newest pose", 22, 50);
  w.grid();
  w.segment({ x: -1.5 * h.x, y: -1.5 * h.y }, { x: 14 * h.x, y: 14 * h.y }, [60, 70, 95], 1);
  w.segment({ x: -1.5, y: 0 }, { x: 11.5, y: 0 }, [40, 90, 70], 1);
  w.path(RUN.slice(0, k + 1).map(r => r.pose), [255, 199, 87], 2);
  w.path(RUN.slice(0, k + 1).filter(r => r.tick.published).map(r => r.tick.correctedPose), [82, 255, 168], 2);
  w.axis({ x: 0, y: 0 }, 0, [230, 230, 230], "map");
  if (tick.published) {
    const m2o = tick.mapToVisionOdom;
    w.segment({ x: 0, y: 0 }, m2o, [79, 215, 232, 160], 1);
    w.segment(m2o, tick.correctedPose, [82, 255, 168, 160], 1);
    w.axis(m2o, m2o.yaw, [79, 215, 232], tick.isIdentity ? "odom_vision_correction (identity)" : "odom_vision_correction");
    w.axis(tick.correctedPose, tick.correctedPose.yaw, [82, 255, 168], "corrected_pose");
  }
  w.axis(now.pose, now.pose.yaw, [255, 199, 87], "raw FCU (odom)");
  w.band(0, FIRST_FRAME_TICK, [120, 130, 150, 70], "identity: no frame yet");
  w.band(DROPOUT.from, DROPOUT.to, [248, 113, 113, 60], "dropout: correction held");
  RUN.forEach(r => { if (r.isFrame) w.mark(r.k, [82, 255, 168, 200], 1, 12); });
  for (let s = 0; s <= TICK_COUNT; s += 30) { w.mark(s, [150, 160, 180], 1, 22); p.push(); p.noStroke(); p.fill(150, 160, 180); p.textSize(10); p.text(`${s / 30} s`, w.tickX(s) + 3, w.strip.y + w.strip.h - 26); p.pop(); }
  w.mark(X_OFFSET_READY_TICK, [96, 165, 250], 2, 30);
  if (stampTick !== null) w.mark(stampTick, [82, 255, 168], 3, w.strip.h - 2);
  w.mark(k, [255, 255, 255], 2, w.strip.h - 2);
  const m = tick.measurement;
  const age = m ? tick.tickStamp - m.stamp : null;
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `tick: ${k}   time: ${now.t.toFixed(3)} s`,
    `frame this tick: ${now.isFrame ? "yes" : inDropout ? "no (dropout)" : k < FIRST_FRAME_TICK ? "no (warm-up)" : "no"}`,
    `published: ${tick.published}   reason: "${tick.reason}"`,
    `isIdentity: ${tick.isIdentity}`,
    `measurement stamp: ${m ? m.stamp.toFixed(3) + " s" : "none (identity)"}`,
    `measurement age: ${age === null ? "n/a" : age.toFixed(3) + " s"}`,
    `has_x: ${m ? m.hasX : "n/a"}   pose_offset_x: ${m ? m.poseOffsetXM.toFixed(2) : "n/a"}`,
    tick.published ? `map->vision_odom: (${tick.mapToVisionOdom.x.toFixed(2)}, ${tick.mapToVisionOdom.y.toFixed(2)}) yaw ${radiansToDegrees(tick.mapToVisionOdom.yaw).toFixed(1)}` : "map->vision_odom: none",
    tick.published ? `vision_odom->base: raw (${tick.visionOdomToBase.x.toFixed(2)}, ${tick.visionOdomToBase.y.toFixed(2)})` : "",
    tick.published ? `corrected: (${tick.correctedPose.x.toFixed(2)}, ${tick.correctedPose.y.toFixed(2)}) yaw ${radiansToDegrees(tick.correctedPose.yaw).toFixed(1)}` : "",
    "",
    `propagation_rate_hz: ${YAML.propagation_rate_hz} (sim ticks 30 Hz)`,
    `publish_identity_until_ready: ${YAML.publish_identity_until_ready}`,
    `max_pose_age_sec: ${YAML.max_pose_age_sec}`,
    `max_correction_age_sec: ${YAML.max_correction_age_sec} (no limit)`,
    "",
    "Yellow: raw FCU pose (odom). Green:",
    "corrected_pose = R(-aisle) raw + delta,",
    "in the aisle-aligned map frame.",
    "During the dropout the stored edge is",
    "frozen, so the TF and corrected pose",
    "keep moving with the pose while the",
    "measurement stamp stays at the last frame.",
  ]);
  if (!paused) simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
}
