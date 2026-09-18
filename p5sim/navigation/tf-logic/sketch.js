const DEMO_ID = "tf-logic";
// Mirrors include/warehouse_pose_corrector_vision_based/vision_correction_transform.hpp
// (build_vision_correction_transform), PoseCorrectorNode::ComposeStoredCorrectionPose
// (src/pose_corrector_node.cpp 1084-1121) and RackGeometryUtils::NormalizeAngle
// (src/common/rack_geometry_utils.cpp). Pinned by test/test_vision_correction_transform.cpp.
//
//   map -> odom_vision_correction           : correction delta rotated by -aisle_yaw, rotation -aisle_yaw
//       -> base_link_odom_vision_correction : the RAW FCU pose (translation and raw yaw)
//   corrected_pose = R(-aisle_yaw) * raw + delta, yaw = raw_yaw - aisle_yaw
//
// The delta is LINE-based (BroadcastVisionCorrectedTF, same as the laser's
// createCorrectedTF): corrected = raw + c * n, i.e. odom shifted by the
// centerline offset c so the centerline becomes the x axis of the corrected
// frame. The drone keeps its real distance from the middle: 0 when centered.
const YAML = {
  map_frame: "map",
  vision_correction: {
    odom_frame: "odom_vision_correction",
    base_frame: "base_link_odom_vision_correction",
  },
};
const DEG = Math.PI / 180;
const AISLE_YAW = 33.5 * DEG;
const LATERAL_OFFSET_M = 0.3;   // the drone really flies 0.3 m left of the centerline

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

// ComposeStoredCorrectionPose — apply a stored map->vision_odom edge to a raw FCU pose
// (this is what tf2 computes when it chains the two edges).
function composeStoredCorrectionPose(mapToVisionOdom, fcuPose) {
  const c = Math.cos(mapToVisionOdom.yaw), s = Math.sin(mapToVisionOdom.yaw);
  return {
    x: c * fcuPose.x - s * fcuPose.y + mapToVisionOdom.x,
    y: s * fcuPose.x + c * fcuPose.y + mapToVisionOdom.y,
    z: (fcuPose.z || 0) + (mapToVisionOdom.z || 0),
    yaw: normalizeAngle(mapToVisionOdom.yaw + normalizeAngle(fcuPose.yaw)),
  };
}

// ── simulation ─────────────────────────────────────────────────────────────
const ORIGIN = { x: 0.5, y: 0.2 };   // sim: where the odom aisle centerline starts (odom_fcu coordinates)
const DIR = { x: Math.cos(AISLE_YAW), y: Math.sin(AISLE_YAW) };
const NORMAL = { x: -Math.sin(AISLE_YAW), y: Math.cos(AISLE_YAW) };
// Centerline in odom, a x + b y + c = 0 with unit normal NORMAL: c = -NORMAL . ORIGIN.
const CENTERLINE_C = -(NORMAL.x * ORIGIN.x + NORMAL.y * ORIGIN.y);
const LOOP = 200;

// Raw FCU pose in odom_fcu: down the aisle, 0.3 m left of the centerline, yaw 33.5 + 12 sin(0.04 i) deg.
function rawPoseAt(i) {
  const along = (i % LOOP) * 0.02;
  return {
    x: ORIGIN.x + DIR.x * along + NORMAL.x * LATERAL_OFFSET_M,
    y: ORIGIN.y + DIR.y * along + NORMAL.y * LATERAL_OFFSET_M,
    z: 2.0,
    yaw: (33.5 + 12 * Math.sin(0.04 * i)) * DEG,
  };
}

// The lateral stage's output (BroadcastVisionCorrectedTF): the raw pose shifted by the
// centerline offset c along the normal (odom coordinates). The shift is the same for every
// point; it does not depend on where the drone is.
function correctedPointAt(raw) {
  return { x: raw.x + NORMAL.x * CENTERLINE_C, y: raw.y + NORMAL.y * CENTERLINE_C };
}

// After R(-aisle) plus that shift the odom centerline lands on the map x axis (y = 0).
const MAP_AISLE_Y = 0;

// Builds a tiny world-to-screen renderer for this sketch.
function makeWorld(p) {
  const rect = { x: 22, y: 70, w: p.width - 360, h: p.height - 95 };
  const center = { x: 2.2, y: 0.9 };
  const scale = Math.min(rect.w / 6.8, rect.h / 5);
  return {
    toScreen(pt) {
      return { x: rect.x + rect.w * 0.5 + (pt.x - center.x) * scale, y: rect.y + rect.h * 0.5 - (pt.y - center.y) * scale };
    },
    grid() {
      p.push(); p.stroke(42, 51, 72); p.noFill(); p.rect(rect.x, rect.y, rect.w, rect.h);
      for (let x = -1; x <= 5; x += 1) { const a = this.toScreen({ x, y: -1.5 }), b = this.toScreen({ x, y: 3.3 }); p.line(a.x, a.y, b.x, b.y); }
      for (let y = -1; y <= 3; y += 1) { const a = this.toScreen({ x: -1.1, y }), b = this.toScreen({ x: 5.5, y }); p.line(a.x, a.y, b.x, b.y); }
      p.pop();
    },
    segment(a, b, color, weight) {
      const sa = this.toScreen(a), sb = this.toScreen(b);
      p.push(); p.stroke(...color); p.strokeWeight(weight); p.line(sa.x, sa.y, sb.x, sb.y); p.pop();
    },
    // An axis triad: red x, green y, label offset dy pixels below the origin.
    triad(origin, yaw, label, len, dy) {
      const s = this.toScreen(origin);
      const xTip = this.toScreen({ x: origin.x + Math.cos(yaw) * len, y: origin.y + Math.sin(yaw) * len });
      const yTip = this.toScreen({ x: origin.x - Math.sin(yaw) * len * 0.8, y: origin.y + Math.cos(yaw) * len * 0.8 });
      p.push(); p.strokeWeight(4);
      p.stroke(248, 113, 113); p.line(s.x, s.y, xTip.x, xTip.y);
      p.stroke(82, 255, 168); p.line(s.x, s.y, yTip.x, yTip.y);
      p.noStroke(); p.fill(230); p.text(label, s.x + 8, s.y + dy); p.pop();
    },
    pose(pt, yaw, color, label, hollow, dy) {
      const s = this.toScreen(pt);
      p.push();
      if (hollow) { p.noFill(); p.stroke(...color); p.strokeWeight(2); } else { p.noStroke(); p.fill(...color); }
      p.circle(s.x, s.y, 14);
      p.stroke(...color); p.strokeWeight(2); p.line(s.x, s.y, s.x + Math.cos(yaw) * 30, s.y - Math.sin(yaw) * 30);
      p.noStroke(); p.fill(...color); p.text(label, s.x + 10, s.y + dy); p.pop();
    },
  };
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235); p.stroke(47, 58, 82); p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke(); p.fill(230); p.textStyle(p.BOLD); p.text("TF yaw logic", x + 14, 96);
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
  const i = simFrame;
  const raw = rawPoseAt(i);
  const target = correctedPointAt(raw);
  const tf = buildVisionCorrectionTransform(raw, target.x, target.y, raw.z, AISLE_YAW);
  const base = composeStoredCorrectionPose(tf.mapToVisionOdom, tf.visionOdomToBase);
  const deltaDist = Math.hypot(base.x - tf.correctedPose.x, base.y - tf.correctedPose.y);
  const w = makeWorld(p);
  p.background(8, 10, 16);
  p.noStroke(); p.fill(232, 238, 248); p.textSize(18);
  p.text("TF correction frame logic", 22, 30);
  p.fill(149, 163, 184); p.textSize(12);
  p.text("One sketch: map -> odom_vision_correction carries -aisle yaw; its child carries the raw FCU pose; composed yaw = fcu - aisle", 22, 50);
  w.grid();
  // Input side, odom_fcu coordinates (dim): the aisle centerline, the raw pose, its shift by c.
  w.segment({ x: ORIGIN.x - DIR.x, y: ORIGIN.y - DIR.y }, { x: ORIGIN.x + DIR.x * 5, y: ORIGIN.y + DIR.y * 5 }, [70, 82, 110], 2);
  w.segment(raw, target, [200, 200, 200, 150], 1.5);
  w.pose(raw, raw.yaw, [255, 199, 87, 180], "raw FCU (odom_fcu)", false, -12);
  w.pose(target, raw.yaw, [83, 198, 255, 180], "raw + c*n (odom)", true, 20);
  // Output side, map coordinates: the rotated aisle, the three frames, the corrected pose.
  w.segment({ x: -1, y: MAP_AISLE_Y }, { x: 5.5, y: MAP_AISLE_Y }, [60, 110, 80], 2);
  w.triad({ x: 0, y: 0 }, 0, YAML.map_frame, 1.0, -8);
  w.triad(tf.mapToVisionOdom, tf.mapToVisionOdom.yaw, YAML.vision_correction.odom_frame, 0.8, 18);
  w.triad(base, base.yaw, YAML.vision_correction.base_frame, 0.8, 18);
  w.pose(tf.correctedPose, tf.correctedPose.yaw, [82, 255, 168], "corrected_pose (map)", true, 34);
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `aisle yaw: ${(AISLE_YAW / DEG).toFixed(2)} deg`,
    `raw FCU yaw: ${(tf.rawYaw / DEG).toFixed(2)} deg`,
    "",
    `${YAML.map_frame} -> ${YAML.vision_correction.odom_frame}`,
    `  yaw: ${(tf.correctionYaw / DEG).toFixed(2)} deg (= -aisle)`,
    `  translation: (${tf.mapToVisionOdom.x.toFixed(3)}, ${tf.mapToVisionOdom.y.toFixed(3)}) m`,
    `${YAML.vision_correction.odom_frame} ->`,
    `  ${YAML.vision_correction.base_frame}`,
    `  yaw: ${(tf.childYaw / DEG).toFixed(2)} deg (= raw FCU yaw)`,
    `  translation: raw (${raw.x.toFixed(3)}, ${raw.y.toFixed(3)}) m`,
    `composed yaw = fcu - aisle: ${(tf.composedYaw / DEG).toFixed(2)} deg`,
    `corrected_pose: (${tf.correctedPose.x.toFixed(3)}, ${tf.correctedPose.y.toFixed(3)})`,
    `composed base vs corrected_pose: ${deltaDist.toExponential(1)} m`,
    `centerline c (odom): ${CENTERLINE_C.toFixed(3)} m`,
    `corrected_pose y = true offset: ${tf.correctedPose.y.toFixed(3)} m`,
    "",
    "The child carries the raw FCU yaw;",
    "composition yields the FCU yaw",
    "relative to the aisle, which is what",
    "corrected_pose publishes.",
    "",
    "Position: R(-aisle) * raw + (x, c).",
    "The shift is the line's offset c, not",
    "the drone's distance, so the drone",
    "keeps its real 0.3 m from the middle.",
  ]);
  if (!paused) simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
}
