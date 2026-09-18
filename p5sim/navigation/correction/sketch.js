const DEMO_ID = "correction";
// Mirrors PoseCorrectorNode::BroadcastVisionCorrectedTF (src/pose_corrector_node.cpp 1299-1400),
// include/warehouse_pose_corrector_vision_based/lateral_drift_filter.hpp and
// vision_correction_transform.hpp. One frame, LINE-based like the laser's createCorrectedTF:
// centerline offset c -> jump guard + EMA on c -> shift odom by c along the normal -> x offset
// along the heading -> the two TF edges. The drone keeps its real distance from the middle.
const YAML = {
  lateral_ema_alpha: 0.05,
  lateral_jump_threshold_m: 0.25,
  lateral_jump_confirm_frames: 3,
  lateral_jump_cluster_threshold_m: 0.08,
  lateral_max_step_m: 0.04,
};
const X_OFFSET_FILTERED_M = 0.6;   // sim: x_offset_filtered_ held constant (the x-offset page shows how it is estimated)
const DEG = Math.PI / 180;
const AISLE_YAW = 33.5 * DEG;
// Centerline in odom, a x + b y + c = 0: normal (-sin, cos) of the heading and the odom intercept c = +0.2.
const CENTERLINE = { a: -Math.sin(AISLE_YAW), b: Math.cos(AISLE_YAW), c: 0.2 };

// Maps beam_pointcloud.lateral_* YAML keys onto the filter config (node ctor 331-342).
function lateralFilterConfigFromYaml(bp) {
  return {
    ema_alpha: bp.lateral_ema_alpha,
    jump_threshold_m: bp.lateral_jump_threshold_m,
    jump_confirm_frames: bp.lateral_jump_confirm_frames,
    jump_cluster_threshold_m: bp.lateral_jump_cluster_threshold_m,
    max_step_m: bp.lateral_max_step_m,
  };
}

// DroneYToCenterlineFromSignedError — the published telemetry negates the internal sign.
function droneYToCenterlineFromSignedError(d) { return -d; }

// LateralDriftFilter — twin of warehouse_pose_corrector::LateralDriftFilter.
class LateralDriftFilter {
  constructor(config = {}) { this.config = LateralDriftFilter.sanitize(config); this.reset(); }
  static sanitize(config) {
    const c = Object.assign({ ema_alpha: 0.05, jump_threshold_m: 0.25, jump_confirm_frames: 3, jump_cluster_threshold_m: 0.08, max_step_m: 0.04 }, config);
    c.ema_alpha = Math.min(1, Math.max(0, c.ema_alpha));
    c.jump_threshold_m = Math.max(0, c.jump_threshold_m);
    c.jump_confirm_frames = Math.max(1, c.jump_confirm_frames);
    c.jump_cluster_threshold_m = Math.max(0, c.jump_cluster_threshold_m);
    c.max_step_m = Math.max(0, c.max_step_m);
    return c;
  }
  reset() { this.filtered = null; this.lastAcceptedRaw = null; this.pendingJumpRaw = null; this.pendingJumpCount = 0; }
  hasValue() { return this.filtered !== null; }
  value() { return this.filtered; }
  // Update — twin of LateralDriftFilter::Update.
  update(rawM) {
    const result = { initialized: false, held: false, jumpDetected: false, jumpConfirmed: false, jumpCount: 0, rawM, filteredM: 0, rawDeltaM: 0 };
    if (this.filtered === null) {
      this.filtered = rawM; this.lastAcceptedRaw = rawM;
      result.initialized = true; result.filteredM = rawM;
      return result;
    }
    const referenceRaw = this.lastAcceptedRaw === null ? this.filtered : this.lastAcceptedRaw;
    result.rawDeltaM = rawM - referenceRaw;
    const isJump = this.config.jump_threshold_m > 0 && Math.abs(result.rawDeltaM) > this.config.jump_threshold_m;
    if (isJump) {
      result.jumpDetected = true;
      this.updatePendingJump(rawM);
      result.jumpCount = this.pendingJumpCount;
      if (this.pendingJumpCount < this.config.jump_confirm_frames) {
        result.held = true; result.filteredM = this.filtered;
        return result;
      }
      result.jumpConfirmed = true;
      this.pendingJumpRaw = null; this.pendingJumpCount = 0;
      this.lastAcceptedRaw = rawM;
      this.filtered = this.applyLowPassAndStepLimit(rawM);
      result.filteredM = this.filtered;
      return result;
    }
    this.pendingJumpRaw = null; this.pendingJumpCount = 0;
    this.lastAcceptedRaw = rawM;
    this.filtered = this.applyLowPassAndStepLimit(rawM);
    result.filteredM = this.filtered;
    return result;
  }
  // UpdatePendingJump — a new jump value starts a cluster; a nearby one extends it.
  updatePendingJump(rawM) {
    if (this.pendingJumpRaw === null ||
        (this.config.jump_cluster_threshold_m > 0 && Math.abs(rawM - this.pendingJumpRaw) > this.config.jump_cluster_threshold_m)) {
      this.pendingJumpRaw = rawM; this.pendingJumpCount = 1; return;
    }
    this.pendingJumpCount += 1;
  }
  // ApplyLowPassAndStepLimit — EMA toward raw, then clamp the output step.
  applyLowPassAndStepLimit(rawM) {
    const current = this.filtered;
    const target = this.config.ema_alpha * rawM + (1 - this.config.ema_alpha) * current;
    let delta = target - current;
    if (this.config.max_step_m > 0) delta = Math.min(this.config.max_step_m, Math.max(-this.config.max_step_m, delta));
    return current + delta;
  }
}

// NormalizeAngle — twin of RackGeometryUtils::NormalizeAngle: wrap into [-pi, pi].
function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
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

// BroadcastVisionCorrectedTF — the per-frame chain in the node's order. `state` holds the
// lateral filter and x_offset_filtered_ (sim: the store step and d_lateral_camera are omitted).
function broadcastVisionCorrectedTF(state, fcuPose, aisleYawRad, aNormal, bNormal, cCenterline) {
  const fcuX = fcuPose.x, fcuY = fcuPose.y;
  // Jump guard + low-pass on the centerline offset c itself (laser low-passes its intercept).
  const lateral = state.lateralDriftFilter.update(cCenterline);
  const cFiltered = lateral.filteredM;
  // Drone's signed distance to the filtered centerline: telemetry (drone_y_to_centerline)
  // and the projection marker only; not used for the transform.
  const distToCenterline = aNormal * fcuX + bNormal * fcuY + cFiltered;
  const yIntercept = Math.abs(bNormal) > 1e-6 ? -cFiltered / bNormal : 0;   // pose_offset_y convention
  const lateralX = fcuX - distToCenterline * aNormal;   // foot of the perpendicular (marker)
  const lateralY = fcuY - distToCenterline * bNormal;
  const cosH = Math.cos(aisleYawRad), sinH = Math.sin(aisleYawRad);
  // Shift by the line offset along its normal, plus the pillar x offset along the heading.
  // build_vision_correction_transform turns this into map->vision_odom = (x_offset, c) in
  // the rotated frame, so the corrected base y equals distToCenterline.
  const correctedX = fcuX + cFiltered * aNormal + state.xOffset.xOffsetFiltered * cosH;
  const correctedY = fcuY + cFiltered * bNormal + state.xOffset.xOffsetFiltered * sinH;
  const tf = buildVisionCorrectionTransform(fcuPose, correctedX, correctedY, fcuPose.z || 0, aisleYawRad);
  return { aisleYaw: aisleYawRad, a: aNormal, b: bNormal, c: cCenterline, cFiltered, distToCenterline, lateral, yIntercept, lateralX, lateralY, correctedX, correctedY, tf };
}

// ── simulation ─────────────────────────────────────────────────────────────
const COUNT = 480;
const DIR = { x: Math.cos(AISLE_YAW), y: Math.sin(AISLE_YAW) };
const NORMAL = { x: CENTERLINE.a, y: CENTERLINE.b };

// True drone lateral offset from the middle (map): slow drift, then a real 0.3 m displacement
// from frame 300 on. This reaches the corrected pose at once; it never goes through the filter.
function trueLateralAt(i) {
  let lateral = 0.35 * Math.sin(0.02 * i) + 0.1;
  if (i >= 300) lateral += 0.3;
  return lateral;
}

// Raw FCU pose in odom: the true position minus the odom offset, so n·q = lateral - c.
function fcuPoseAt(i) {
  const along = 0.4 + 5.2 * (i / COUNT);
  const lateral = trueLateralAt(i);
  return {
    x: DIR.x * along + NORMAL.x * (lateral - CENTERLINE.c),
    y: DIR.y * along + NORMAL.y * (lateral - CENTERLINE.c),
    z: 2.0,
    yaw: AISLE_YAW + 0.25 * Math.sin(0.05 * i),
  };
}

// The centerline offset c the aisle state hands in each frame: the true 0.2 plus estimate
// noise, an isolated 0.4 m glitch at 150-151 (held by the filter) and a sustained 0.3 m
// shift from 380 on (confirmed after 3 frames, then eased in).
function measuredCAt(i) {
  let c = CENTERLINE.c + 0.01 * Math.sin(0.3 * i);
  if (i === 150 || i === 151) c += 0.4;
  if (i >= 380) c += 0.3;
  return c;
}

// Runs the chain over the whole series with one filter instance, like the node does.
function runFrames(count) {
  const state = { lateralDriftFilter: new LateralDriftFilter(lateralFilterConfigFromYaml(YAML)), xOffset: { xOffsetFiltered: X_OFFSET_FILTERED_M } };
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const fcu = fcuPoseAt(i);
    out.push(Object.assign({ fcu, trueLateral: trueLateralAt(i) }, broadcastVisionCorrectedTF(state, fcu, AISLE_YAW, CENTERLINE.a, CENTERLINE.b, measuredCAt(i))));
  }
  return out;
}
const RUN = runFrames(COUNT);

// Builds a tiny world-to-screen renderer for this sketch (odom coordinates).
function makeWorld(p) {
  const rect = { x: 22, y: 70, w: p.width - 360, h: p.height - 95 };
  const center = { x: 2.5, y: 1.0 };
  const scale = Math.min(rect.w / 8, rect.h / 7);
  return {
    toScreen(pt) {
      return { x: rect.x + rect.w * 0.5 + (pt.x - center.x) * scale, y: rect.y + rect.h * 0.5 - (pt.y - center.y) * scale };
    },
    grid() {
      p.push(); p.stroke(42, 51, 72); p.noFill(); p.rect(rect.x, rect.y, rect.w, rect.h);
      const ox = this.toScreen({ x: 0, y: -2.5 }), oy = this.toScreen({ x: 0, y: 4.5 });
      const ax = this.toScreen({ x: -1.5, y: 0 }), ay = this.toScreen({ x: 6.5, y: 0 });
      p.stroke(60, 70, 95); p.line(ox.x, ox.y, oy.x, oy.y); p.line(ax.x, ax.y, ay.x, ay.y);
      p.noStroke(); p.fill(110, 120, 145); p.text("x = 0", ox.x + 4, oy.y + 14);
      p.pop();
    },
    segment(a, b, color, weight) {
      const sa = this.toScreen(a), sb = this.toScreen(b);
      p.push(); p.stroke(...color); p.strokeWeight(weight); p.line(sa.x, sa.y, sb.x, sb.y); p.pop();
    },
    // A line a x + b y + c = 0 drawn from t0 to t1 metres along its direction (-b, a).
    line(line, t0, t1, color, weight) {
      const base = { x: -line.a * line.c, y: -line.b * line.c };
      this.segment({ x: base.x - line.b * t0, y: base.y + line.a * t0 }, { x: base.x - line.b * t1, y: base.y + line.a * t1 }, color, weight);
    },
    marker(pt, color, label, hollow, yaw) {
      const s = this.toScreen(pt);
      p.push();
      if (hollow) { p.noFill(); p.stroke(...color); p.strokeWeight(2); } else { p.noStroke(); p.fill(...color); }
      p.circle(s.x, s.y, 12);
      if (yaw !== undefined) { p.stroke(...color); p.strokeWeight(3); p.line(s.x, s.y, s.x + Math.cos(yaw) * 40, s.y - Math.sin(yaw) * 40); }
      p.noStroke(); p.fill(...color); p.text(label, s.x + 10, s.y - 8); p.pop();
    },
  };
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235); p.stroke(47, 58, 82); p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke(); p.fill(230); p.textStyle(p.BOLD); p.text("Corrected pose", x + 14, 96);
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
  const i = simFrame % COUNT;
  const now = RUN[i];
  const fcu = now.fcu;
  const measuredLine = { a: CENTERLINE.a, b: CENTERLINE.b, c: now.c };
  const filteredLine = { a: CENTERLINE.a, b: CENTERLINE.b, c: now.cFiltered };
  const foot = { x: now.lateralX, y: now.lateralY };
  const corrected = { x: now.correctedX, y: now.correctedY };
  const w = makeWorld(p);
  p.background(8, 10, 16);
  p.noStroke(); p.fill(232, 238, 248); p.textSize(18);
  p.text("Lateral pose correction", 22, 30);
  p.fill(149, 163, 184); p.textSize(12);
  p.text("One sketch: centerline offset c -> jump guard + EMA on c -> shift odom by c along the normal -> x offset along the heading -> TF", 22, 50);
  w.grid();
  w.line({ a: CENTERLINE.a, b: CENTERLINE.b, c: CENTERLINE.c - 1.6 }, -2, 8, [50, 58, 80], 2);
  w.line({ a: CENTERLINE.a, b: CENTERLINE.b, c: CENTERLINE.c + 1.6 }, -2, 8, [50, 58, 80], 2);
  w.line(measuredLine, -2, 8, [255, 142, 88, 160], 2);
  w.line(filteredLine, -2, 8, [163, 230, 53], 4);
  w.marker({ x: 0, y: now.yIntercept }, [230, 230, 230], "y intercept", true);
  w.segment(fcu, foot, [255, 255, 255, 170], 2);
  w.marker(foot, [83, 198, 255], "foot on centerline", false);
  w.segment(fcu, { x: fcu.x + now.cFiltered * NORMAL.x, y: fcu.y + now.cFiltered * NORMAL.y }, [163, 230, 53, 200], 3);
  w.segment({ x: fcu.x + now.cFiltered * NORMAL.x, y: fcu.y + now.cFiltered * NORMAL.y }, corrected, [255, 142, 88], 3);
  w.marker(fcu, [255, 199, 87], "FCU (raw)", false, fcu.yaw);
  w.marker(corrected, [82, 255, 168], "corrected (odom)", false);
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `frame: ${i}`,
    `aisle yaw: ${(AISLE_YAW / DEG).toFixed(2)} deg`,
    `c measured: ${now.c.toFixed(3)} m   c filtered: ${now.cFiltered.toFixed(3)} m`,
    `held: ${now.lateral.held}   jumpConfirmed: ${now.lateral.jumpConfirmed}`,
    `drone distance to line: ${now.distToCenterline.toFixed(3)} m`,
    `true lateral offset: ${now.trueLateral.toFixed(3)} m`,
    `y intercept (-c / b): ${now.yIntercept.toFixed(3)} m`,
    `drone_y_to_centerline: ${droneYToCenterlineFromSignedError(now.distToCenterline).toFixed(3)} m`,
    `x_offset_filtered: ${X_OFFSET_FILTERED_M.toFixed(3)} m`,
    `corrected (odom): (${corrected.x.toFixed(3)}, ${corrected.y.toFixed(3)})`,
    `corrected_pose (map): (${now.tf.correctedPose.x.toFixed(3)}, ${now.tf.correctedPose.y.toFixed(3)})`,
    `corrected_pose yaw: ${(now.tf.composedYaw / DEG).toFixed(2)} deg (fcu - aisle)`,
    "",
    `lateral_ema_alpha: ${YAML.lateral_ema_alpha}`,
    `lateral_jump_threshold_m: ${YAML.lateral_jump_threshold_m}`,
    `lateral_jump_confirm_frames: ${YAML.lateral_jump_confirm_frames}`,
    `lateral_jump_cluster_threshold_m: ${YAML.lateral_jump_cluster_threshold_m}`,
    `lateral_max_step_m: ${YAML.lateral_max_step_m}`,
    "",
    "Green arrow: shift by c (same for every",
    "point). Orange: x offset along the aisle.",
    "corrected_pose y == drone distance to",
    "the line: the real offset from the middle,",
    "so the 0.3 m move at frame 300 shows at",
    "once, while the c glitch at 150 is held.",
  ]);
  if (!paused) simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
}
