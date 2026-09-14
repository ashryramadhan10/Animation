const DEMO_ID = "pipeline";
// Mirrors the per-frame chain of PoseCorrectorNode in src/pose_corrector_node.cpp:
// SegDepthCallback -> ProcessBeamClouds -> FitWallLine (RecursiveLinRegFitter,
// src/beam_pointcloud/recursive_linreg_fitter.cpp) -> BuildBeamResultFromFit ->
// IsBeamReliableForHeading -> ComputeConsensus (select_consensus_heading_samples,
// consensus_filter.hpp) -> ComputeDualCenterline -> update_aisle_state
// (aisle_types.hpp) -> BroadcastVisionCorrectedTF (LateralDriftFilter,
// lateral_drift_filter.hpp; build_vision_correction_transform,
// vision_correction_transform.hpp). Two racks, one frame at a time, read top
// to bottom. Not modeled here: coefficient EMA, rate limiter, calibration
// anchor and x offset (each has its own page).
const DEG = Math.PI / 180;
const YAML = {
  linreg_distance_threshold: 0.05, linreg_min_inlier_ratio: 0.25, min_points_for_fitting: 10,
  linreg_max_iterations: 10, linreg_max_allowed_gap: 3.0, linreg_min_line_length: 0.5,
  heading_min_line_extent_m: 2.0, heading_min_inliers: 500, heading_min_inlier_ratio: 0.35,
  max_beams_for_consensus: 2, consensus_heading_outlier_threshold_deg: 3.0,
  aisle_tracker_dual_gain: 0.2, aisle_tracker_single_gain: 0.05, expected_rack_distance: 1.6,
  lateral_ema_alpha: 0.05, lateral_jump_threshold_m: 0.25, lateral_jump_confirm_frames: 3,
  lateral_jump_cluster_threshold_m: 0.08, lateral_max_step_m: 0.04,
};

// ── vectors and seeded random (sim-only, from scripts/geometry.js) ──────────
function v(x, y) { return { x, y }; }
function add(a, b) { return v(a.x + b.x, a.y + b.y); }
function mul(a, s) { return v(a.x * s, a.y * s); }
function headingVector(yaw) { return v(Math.cos(yaw), Math.sin(yaw)); }
function normalVector(yaw) { return v(-Math.sin(yaw), Math.cos(yaw)); }
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

// ── angles and lines (aisle_types.hpp, rack_geometry_utils.cpp, node helpers) ─
// NormalizeAngle — twin of RackGeometryUtils::NormalizeAngle: wrap into [-pi, pi].
function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}
// blend_angle_circular — wrap-safe weighted blend. `w` is the weight on `b`.
function blendAngleCircular(a, b, w) {
  const s = (1 - w) * Math.sin(a) + w * Math.sin(b);
  const c = (1 - w) * Math.cos(a) + w * Math.cos(b);
  return Math.atan2(s, c);
}
// ResolveHeadingToReference — pick heading or heading+pi, whichever is closer to the reference.
function resolveHeadingToReference(heading, reference) {
  if (reference === null || reference === undefined) return heading;
  const alt = normalizeAngle(heading + Math.PI);
  const diff = Math.abs(normalizeAngle(heading - reference));
  const altDiff = Math.abs(normalizeAngle(alt - reference));
  return altDiff < diff ? alt : heading;
}
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

// ── heading gate and consensus (node 2108-2144, consensus_filter.hpp) ───────
// IsBeamReliableForHeading — extent, inlier count and ratio gates with the C++ reason words.
function isBeamReliableForHeading(result, bp) {
  const failures = [];
  if (result.lineExtentM < bp.heading_min_line_extent_m) failures.push(`extent ${result.lineExtentM.toFixed(2)}m < ${bp.heading_min_line_extent_m.toFixed(2)}m`);
  if (result.inlierCount < bp.heading_min_inliers) failures.push(`inliers ${result.inlierCount} < ${bp.heading_min_inliers}`);
  if (result.inlierRatio < bp.heading_min_inlier_ratio) failures.push(`ratio ${(result.inlierRatio * 100).toFixed(1)}% < ${(bp.heading_min_inlier_ratio * 100).toFixed(1)}%`);
  return { valid: failures.length === 0, reason: failures.join(", ") };
}
// accumulate_heading_sample — weighted unit-vector sums for a circular mean.
function accumulateHeadingSample(sample, acc) {
  if (sample.weight <= 0) return false;
  acc.sumWeight += sample.weight;
  acc.sumSin += sample.weight * Math.sin(sample.headingRad);
  acc.sumCos += sample.weight * Math.cos(sample.headingRad);
  return true;
}
// select_consensus_heading_samples — weighted circular mean with outlier rejection.
function selectConsensusHeadingSamples(samples, outlierThresholdRad) {
  const result = { valid: false, headingRad: 0, acceptedTrackIds: [], rejectedSamples: [] };
  if (!samples || !samples.length) return result;
  if (samples.length === 1) {
    result.valid = samples[0].weight > 0;
    result.headingRad = samples[0].headingRad;
    if (result.valid) result.acceptedTrackIds.push(samples[0].trackId);
    return result;
  }
  let acc = { sumWeight: 0, sumSin: 0, sumCos: 0 };
  for (const s of samples) accumulateHeadingSample(s, acc);
  if (acc.sumWeight <= 0) return result;
  const initialHeading = Math.atan2(acc.sumSin / acc.sumWeight, acc.sumCos / acc.sumWeight);
  if (outlierThresholdRad <= 0) {
    result.valid = true;
    result.headingRad = initialHeading;
    for (const s of samples) if (s.weight > 0) result.acceptedTrackIds.push(s.trackId);
    return result;
  }
  acc = { sumWeight: 0, sumSin: 0, sumCos: 0 };
  for (const s of samples) {
    if (s.weight <= 0) continue;
    const diff = Math.abs(normalizeAngle(s.headingRad - initialHeading));
    if (diff > outlierThresholdRad) { result.rejectedSamples.push({ trackId: s.trackId, diffRad: diff }); continue; }
    result.acceptedTrackIds.push(s.trackId);
    accumulateHeadingSample(s, acc);
  }
  if (acc.sumWeight <= 0) return result;
  result.valid = true;
  result.headingRad = Math.atan2(acc.sumSin / acc.sumWeight, acc.sumCos / acc.sumWeight);
  return result;
}

// ── ComputeDualCenterline (node 2949-2984) ──────────────────────────────────
function computeDualCenterline(state, leftCoeffs, rightCoeffs, aisleYawRad, trace) {
  const aL = alignLineToHeading(leftCoeffs, aisleYawRad);
  const aR = alignLineToHeading(rightCoeffs, aisleYawRad);
  const dot = aL.a * aR.a + aL.b * aR.b;
  const check = { dot, halfWidth: Math.abs(aL.c - aR.c) * 0.5, reason: "" };
  if (trace) trace.dualCheck = check;
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

// ── AisleState and update_aisle_state (aisle_types.hpp) ─────────────────────
const kDualConfidence = 1.0;
function makeAisleState() {
  return { initialized: false, lateralValid: false, headingRad: 0, centerlineC: 0, halfWidthM: 0, confidence: 0, dualLastFrame: false, lastUpdate: 0 };
}
// update_aisle_state — first heading sets directly; later calls blend at the dual or single gain.
function updateAisleState(state, meas, dualGain, singleGain) {
  if (!meas.valid) return;
  const gain = meas.dualSide ? dualGain : singleGain;
  if (!state.initialized) {
    state.headingRad = meas.headingRad;
    if (state.lateralValid) {
      state.centerlineC = (1 - gain) * state.centerlineC + gain * meas.c;
    } else {
      state.centerlineC = meas.c;
      state.halfWidthM = meas.halfWidthM;
      state.lateralValid = true;
    }
    state.initialized = true;
  } else {
    state.headingRad = blendAngleCircular(state.headingRad, meas.headingRad, gain);
    state.centerlineC = (1 - gain) * state.centerlineC + gain * meas.c;
    if (meas.dualSide) state.halfWidthM = (1 - gain) * state.halfWidthM + gain * meas.halfWidthM;
  }
  state.dualLastFrame = meas.dualSide;
  state.confidence = meas.confidence;
  state.lastUpdate = meas.stamp;
}

// ── LateralDriftFilter (lateral_drift_filter.hpp) ───────────────────────────
// Maps beam_pointcloud.lateral_* YAML keys onto the filter config (node ctor 331-342).
function lateralFilterConfigFromYaml(bp) {
  return { ema_alpha: bp.lateral_ema_alpha, jump_threshold_m: bp.lateral_jump_threshold_m, jump_confirm_frames: bp.lateral_jump_confirm_frames, jump_cluster_threshold_m: bp.lateral_jump_cluster_threshold_m, max_step_m: bp.lateral_max_step_m };
}
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
      if (this.pendingJumpCount < this.config.jump_confirm_frames) { result.held = true; result.filteredM = this.filtered; return result; }
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
    if (this.pendingJumpRaw === null || (this.config.jump_cluster_threshold_m > 0 && Math.abs(rawM - this.pendingJumpRaw) > this.config.jump_cluster_threshold_m)) {
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

// ── build_vision_correction_transform (vision_correction_transform.hpp) ─────
function buildVisionCorrectionTransform(rawFcuPose, correctedX, correctedY, correctedZ, aisleYawRad) {
  const rawX = rawFcuPose.x, rawY = rawFcuPose.y, rawZ = rawFcuPose.z || 0;
  const correctionYaw = normalizeAngle(-aisleYawRad);
  const cosC = Math.cos(correctionYaw), sinC = Math.sin(correctionYaw);
  const deltaX = correctedX - rawX, deltaY = correctedY - rawY;
  const correctionX = cosC * deltaX - sinC * deltaY;
  const correctionY = sinC * deltaX + cosC * deltaY;
  const correctionZ = correctedZ - rawZ;
  const rawYaw = normalizeAngle(rawFcuPose.yaw);
  const childYaw = rawYaw;
  const composedYaw = normalizeAngle(correctionYaw + childYaw);
  return {
    mapToVisionOdom: { x: correctionX, y: correctionY, z: correctionZ, yaw: correctionYaw },
    visionOdomToBase: { x: rawX, y: rawY, z: rawZ, yaw: childYaw },
    correctedPose: { x: cosC * rawX - sinC * rawY + correctionX, y: sinC * rawX + cosC * rawY + correctionY, z: rawZ + correctionZ, yaw: composedYaw },
    rawYaw, correctionYaw, childYaw, composedYaw,
  };
}

// ── synthetic world (as scripts/synthetic_world.js, two racks per frame) ────
const WORLD = { headingRad: 33.5 * DEG, halfWidth: 1.6, frameCount: 120, dt: 0.1, odomAlong: 0.6, odomLateral: 0.2, seed: 73 };
// Frames 0-2 and 45-54 shorten both beams (extent 1.2 m) so the gate, hold and held-heading paths show.
function halfExtentFor(i) { return (i <= 2 || (i >= 45 && i <= 54)) ? 0.6 : 1.6; }
function rackPoints(rng, dir, normal, along, sideSign, halfWidth, halfExtent, faceCount, interiorCount) {
  const base = add(mul(dir, along), mul(normal, sideSign * halfWidth));
  const outward = mul(normal, sideSign);
  const pts = [];
  for (let i = 0; i < faceCount; i += 1) {
    const t = randRange(rng, -halfExtent, halfExtent), n = randNormal(rng, 0, 0.018);
    pts.push({ x: base.x + dir.x * t + outward.x * n, y: base.y + dir.y * t + outward.y * n, kind: "face" });
  }
  for (let i = 0; i < interiorCount; i += 1) {
    const t = randRange(rng, -halfExtent, halfExtent), depth = randRange(rng, 0.06, 0.25) + randNormal(rng, 0, 0.025);
    pts.push({ x: base.x + dir.x * t + outward.x * depth, y: base.y + dir.y * t + outward.y * depth, kind: "interior" });
  }
  return pts;
}
function makeFrame(i) {
  const dir = headingVector(WORLD.headingRad), normal = normalVector(WORLD.headingRad);
  const vec = add(mul(dir, WORLD.odomAlong), mul(normal, WORLD.odomLateral));   // map = odom + vec
  const toOdom = p => Object.assign({}, p, { x: p.x - vec.x, y: p.y - vec.y });
  const rng = makeRng(WORLD.seed * 1000 + i);
  const along = 0.16 * i, lateral = 0.08 * Math.sin(0.025 * i) + 0.05, yaw = WORLD.headingRad + 4 * DEG * Math.sin(0.21 * i);
  const mapPose = { x: dir.x * along + normal.x * lateral, y: dir.y * along + normal.y * lateral, z: 2.0, yaw };
  const tracks = [];
  for (const [side, sideSign, trackId] of [["left", 1, 1], ["right", -1, 2]]) {
    tracks.push({ trackId, side, points: rackPoints(rng, dir, normal, along, sideSign, WORLD.halfWidth, halfExtentFor(i), 800, 200).map(toOdom) });
  }
  return { frameIndex: i, stamp: i * WORLD.dt, fcuPose: toOdom(mapPose), tracks };
}

// ── the pipeline, one frame (stateful across frames like the node) ──────────
const NODE = { fitter: new RecursiveLinRegFitter(fitterConfigFromYaml(YAML)), aisleState: makeAisleState(), lateralDriftFilter: new LateralDriftFilter(lateralFilterConfigFromYaml(YAML)), lastPublishedHeading: null };
function lastStableHeading() { return NODE.lastPublishedHeading !== null ? NODE.lastPublishedHeading : (NODE.aisleState.initialized ? NODE.aisleState.headingRad : null); }
// BroadcastVisionCorrectedTF — LINE-based like the laser's createCorrectedTF: jump guard + EMA on
// the centerline offset c, then shift odom by c along the normal (x offset is 0 here). The drone's
// corrected y is its real signed distance to the centerline; the filter never sees the drone's motion.
function broadcastVisionCorrectedTF(fcuPose, aisleYawRad, aNormal, bNormal, cCenterline, held, trace) {
  const lateral = NODE.lateralDriftFilter.update(cCenterline);
  const cFiltered = lateral.filteredM;
  const distToCenterline = aNormal * fcuPose.x + bNormal * fcuPose.y + cFiltered;   // telemetry + marker only
  const correctedX = fcuPose.x + cFiltered * aNormal, correctedY = fcuPose.y + cFiltered * bNormal;
  trace.broadcast = { held, aisleYaw: aisleYawRad, a: aNormal, b: bNormal, c: cCenterline, cFiltered, distToCenterline, lateral, correctedX, correctedY, tf: buildVisionCorrectionTransform(fcuPose, correctedX, correctedY, fcuPose.z, aisleYawRad) };
}
// PublishHeldVisionCorrection — reuse the aisle state; the lateral filter still runs.
function publishHeldVisionCorrection(fcuPose, reason, trace) {
  trace.hold = reason;
  if (!NODE.aisleState.initialized || !NODE.aisleState.lateralValid) { trace.holdSkipped = `${reason}: no initialized aisle state`; return; }
  const yaw = NODE.aisleState.headingRad;
  broadcastVisionCorrectedTF(fcuPose, yaw, -Math.sin(yaw), Math.cos(yaw), NODE.aisleState.centerlineC, true, trace);
}
function runFrame(frame) {
  const trace = { frame, beams: [], hold: null, holdSkipped: null, consensus: null, freshHeading: false, heading: null, dual: null, dualCheck: null, aisleState: null, broadcast: null };
  // ProcessBeamClouds: fit each track, then BuildBeamResultFromFit + IsBeamReliableForHeading.
  for (const track of frame.tracks) {
    const fit = NODE.fitter.fitPlane(track.points);
    const beam = { trackId: track.trackId, side: track.side, points: track.points, fit, valid: fit.valid, headingValid: false, headingRejectReason: "", heading: 0, inlierCount: 0, inlierRatio: 0, lineExtentM: 0, planeCoefficients: null };
    trace.beams.push(beam);
    if (!fit.valid) { beam.headingRejectReason = `line fit failed (${fit.reason})`; continue; }
    const abc = fit.coefficients;
    Object.assign(beam, { heading: computeHeadingFromLineCoefficients(abc), inlierCount: fit.inlierIndices.length, inlierRatio: fit.inlierRatio, lineExtentM: lineExtent(track.points, fit.inlierIndices, abc), planeCoefficients: abc });
    const gate = isBeamReliableForHeading(beam, YAML);
    beam.headingValid = gate.valid; beam.headingRejectReason = gate.reason;
  }
  const results = trace.beams.filter(b => b.valid).slice(0, YAML.max_beams_for_consensus);   // detection order
  if (!results.length) { publishHeldVisionCorrection(frame.fcuPose, "no valid fit", trace); return trace; }
  // ComputeConsensus: only heading-valid beams vote, weighted by inlier count.
  const samples = results.filter(r => r.headingValid).map(r => ({ trackId: r.trackId, headingRad: r.heading, weight: r.inlierCount }));
  const selection = selectConsensusHeadingSamples(samples, YAML.consensus_heading_outlier_threshold_deg * DEG);
  const reason = !samples.length ? "no heading-qualified beams" : (!selection.valid ? "all beams rejected as outliers" : "");
  trace.consensus = { valid: selection.valid, headingRad: selection.headingRad, acceptedTrackIds: selection.acceptedTrackIds, rejectedSamples: selection.rejectedSamples, reason };
  trace.freshHeading = selection.valid;
  let heading;
  if (trace.freshHeading) heading = resolveHeadingToReference(selection.headingRad, lastStableHeading());
  else {
    heading = lastStableHeading();
    if (heading === null) { publishHeldVisionCorrection(frame.fcuPose, "no qualified consensus heading yet", trace); return trace; }
  }
  trace.heading = heading;
  // BuildCenterlineMeasurement, dual branch: both beams feed lateral even when heading is held.
  const left = results.find(r => r.side === "left"), right = results.find(r => r.side === "right");
  if (!left || !right) { publishHeldVisionCorrection(frame.fcuPose, "single beam (not modeled on this page)", trace); return trace; }
  const dual = computeDualCenterline(null, left.planeCoefficients, right.planeCoefficients, heading, trace);
  if (!dual) { publishHeldVisionCorrection(frame.fcuPose, `dual centerline failed: ${trace.dualCheck.reason}`, trace); return trace; }
  trace.dual = dual;
  const meas = { valid: true, dualSide: true, headingRad: heading, a: dual.a, b: dual.b, c: dual.cCenter, halfWidthM: dual.halfWidth, confidence: kDualConfidence, stamp: frame.stamp };
  updateAisleState(NODE.aisleState, meas, YAML.aisle_tracker_dual_gain, YAML.aisle_tracker_single_gain);
  trace.aisleState = Object.assign({}, NODE.aisleState);
  const yaw = NODE.aisleState.headingRad;
  NODE.lastPublishedHeading = yaw;
  broadcastVisionCorrectedTF(frame.fcuPose, yaw, -Math.sin(yaw), Math.cos(yaw), NODE.aisleState.centerlineC, false, trace);
  return trace;
}
// Frames are stateful, so they are computed in order once and cached by index.
const TRACES = [];
function traceAt(i) {
  while (TRACES.length <= i) TRACES.push(runFrame(makeFrame(TRACES.length)));
  return TRACES[i];
}

// Builds a tiny world-to-screen renderer around the current frame's points.
function makeWorld(p, points) {
  const rect = { x: 22, y: 70, w: p.width - 360, h: p.height - 95 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of points) { minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y); maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y); }
  minX -= 0.7; minY -= 0.7; maxX += 0.7; maxY += 0.7;
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
    // Draws a*x + b*y + c = 0 as a chord of `half` metres either side of `through`'s projection.
    line(line, through, half, color, weight) {
      const d = { x: -line.b, y: line.a };
      const t = d.x * through.x + d.y * through.y;
      const foot = { x: d.x * t - line.a * line.c, y: d.y * t - line.b * line.c };
      const a = this.toScreen({ x: foot.x - d.x * half, y: foot.y - d.y * half }), b = this.toScreen({ x: foot.x + d.x * half, y: foot.y + d.y * half });
      p.push(); p.stroke(color); p.strokeWeight(weight); p.line(a.x, a.y, b.x, b.y); p.pop();
    },
    pose(pose, color, label) {
      const s = this.toScreen(pose);
      p.push(); p.noStroke(); p.fill(color); p.circle(s.x, s.y, 12);
      p.stroke(color); p.strokeWeight(3); p.line(s.x, s.y, s.x + Math.cos(pose.yaw) * 40, s.y - Math.sin(pose.yaw) * 40);
      p.noStroke(); p.fill(230); p.text(label, s.x + 10, s.y - 10); p.pop();
    },
  };
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235); p.stroke(47, 58, 82); p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke(); p.fill(230); p.textStyle(p.BOLD); p.text("Pipeline, one frame", x + 14, 96);
  p.textStyle(p.NORMAL); p.fill(210, 220, 235); p.textSize(11);
  lines.forEach((line, i) => p.text(line, x + 14, 124 + i * 16));
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
  const t = traceAt(i);
  const frame = t.frame, fcu = frame.fcuPose;
  const all = [fcu];
  for (const b of t.beams) all.push(...b.points);
  const w = makeWorld(p, all);
  const sideColor = b => (b.side === "left" ? [83, 198, 255] : [255, 199, 87]);
  p.background(8, 10, 16);
  p.noStroke(); p.fill(232, 238, 248); p.textSize(18);
  p.text("Full pipeline, one frame", 22, 30);
  p.fill(149, 163, 184); p.textSize(12);
  p.text("Two tracks in odom -> fit -> heading gate -> consensus -> dual centerline -> aisle state EMA -> c filter -> shift by c -> transform", 22, 50);
  w.grid();
  const lines = [`const DEMO_ID = "${DEMO_ID}"`, `frame: ${i}   stamp: ${frame.stamp.toFixed(1)} s   beams: ${t.beams.length}`, `hold: ${t.hold || "none"}${t.holdSkipped ? " (skipped: no aisle state)" : ""}`, `freshHeading: ${t.freshHeading}`];
  for (const b of t.beams) {
    const c = sideColor(b);
    w.points(b.points, p.color(c[0], c[1], c[2], 55), 2.5);
    if (!b.valid) { lines.push(`${b.side} id ${b.trackId}: ${b.headingRejectReason}`); continue; }
    w.points(b.fit.inlierIndices.map(k => b.points[k]), p.color(c[0], c[1], c[2], 200), 3);
    w.line(b.planeCoefficients, fcu, b.lineExtentM * 0.5 + 0.2, b.headingValid ? p.color(c[0], c[1], c[2]) : p.color(248, 113, 113), 2);
    lines.push(`${b.side} id ${b.trackId}: inliers ${b.inlierCount}/${b.points.length}  extent ${b.lineExtentM.toFixed(2)} m`);
    lines.push(`   heading ${(b.heading / DEG).toFixed(2)} deg  gate: ${b.headingValid ? "ok" : b.headingRejectReason}`);
  }
  if (t.consensus) lines.push(`consensus: ${t.consensus.valid ? (t.consensus.headingRad / DEG).toFixed(2) + " deg, accepted " + t.consensus.acceptedTrackIds.join(",") : t.consensus.reason}`);
  if (t.heading !== null) lines.push(`heading used: ${(t.heading / DEG).toFixed(2)} deg${t.freshHeading ? "" : " (held)"}`);
  if (t.dual) lines.push(`dual: half ${t.dual.halfWidth.toFixed(3)} m  c ${t.dual.cCenter.toFixed(3)}  dot ${t.dualCheck.dot.toFixed(3)}`);
  else if (t.dualCheck) lines.push(`dual failed: ${t.dualCheck.reason}`);
  const st = NODE.aisleState.initialized ? (t.aisleState || NODE.aisleState) : null;
  const br = t.broadcast;
  if (br) {
    const cl = { a: br.a, b: br.b, c: br.c };
    w.line(cl, fcu, 3.0, p.color(163, 230, 53), 4);
    const foot = { x: fcu.x - br.distToCenterline * br.a, y: fcu.y - br.distToCenterline * br.b }, s0 = w.toScreen(fcu), s1 = w.toScreen(foot);
    p.push(); p.stroke(255, 255, 255, 120); p.strokeWeight(1); p.line(s0.x, s0.y, s1.x, s1.y); p.pop();
    w.pose({ x: br.correctedX, y: br.correctedY, yaw: br.aisleYaw }, p.color(82, 255, 168), "corrected");
    lines.push(`aisle state: heading ${(br.aisleYaw / DEG).toFixed(2)} deg  c ${br.c.toFixed(3)}${st ? "  halfW " + st.halfWidthM.toFixed(2) : ""}`);
    lines.push(`c raw: ${br.c.toFixed(3)}   c filtered: ${br.cFiltered.toFixed(3)}   drone dist: ${br.distToCenterline.toFixed(3)} m`);
    lines.push(`c filter: held ${br.lateral.held}  jumpCount ${br.lateral.jumpCount}`);
    lines.push(`corrected_pose y (= drone dist): ${br.tf.correctedPose.y.toFixed(3)} m`);
    lines.push(`map->odom_vision: (${br.tf.mapToVisionOdom.x.toFixed(3)}, ${br.tf.mapToVisionOdom.y.toFixed(3)}) yaw ${(br.tf.correctionYaw / DEG).toFixed(1)} deg`);
    lines.push(`corrected_pose: (${br.tf.correctedPose.x.toFixed(2)}, ${br.tf.correctedPose.y.toFixed(2)}) yaw ${(br.tf.composedYaw / DEG).toFixed(2)} deg`);
  }
  w.pose(fcu, p.color(255, 199, 87), "FCU (odom)");
  lines.push("", `heading_min_line_extent_m: ${YAML.heading_min_line_extent_m}   heading_min_inliers: ${YAML.heading_min_inliers}`,
    `heading_min_inlier_ratio: ${YAML.heading_min_inlier_ratio}   max_beams_for_consensus: ${YAML.max_beams_for_consensus}`,
    `consensus_heading_outlier_threshold_deg: ${YAML.consensus_heading_outlier_threshold_deg}`,
    `aisle_tracker_dual_gain: ${YAML.aisle_tracker_dual_gain}   lateral_ema_alpha: ${YAML.lateral_ema_alpha}`,
    `linreg_distance_threshold: ${YAML.linreg_distance_threshold}   linreg_min_inlier_ratio: ${YAML.linreg_min_inlier_ratio}`,
    "", "Dim: raw track points. Bright: inliers.", "Red beam line: fit ok but heading-rejected;", "it still feeds the dual centerline.",
    "The recursive fit only shrinks its inlier", "set, so ~15% of the face is dropped for good.",
    "Green: aisle-state centerline (odom c ~ +0.2).", "x offset is 0 here (see x-offset page).");
  panel(p, lines);
  if (!paused) simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
}
