const DEMO_ID = "failure-cases";
// Mirrors the hold and reset paths of PoseCorrectorNode (src/pose_corrector_node.cpp):
// ProcessBeamClouds 668-892 ("no valid fit"), HoldIfWeakSingleBeam 2184-2200,
// IsBeamReliableForHeading 2108-2144, ComputeConsensus 2202-2256 with
// select_consensus_heading_samples (consensus_filter.hpp), ProcessBeamResults
// 2418-2518, BuildBeamResultFromFit 2272-2336 (coefficient EMA restart),
// LateralDriftFilter::Update (lateral_drift_filter.hpp, run on the centerline
// offset c inside the line-based BroadcastVisionCorrectedTF 1299-1400) and
// VisionCorrectionPropagationTimer 1244-1285. Case ids are the fault ids of
// scripts/synthetic_world.js.
const YAML = {                                          // beam_pointcloud.* (deployed values)
  max_beams_for_consensus: 2,                           // C++ default 4
  min_beams_for_consensus: 1,                           // C++ default 2
  consensus_heading_outlier_threshold_deg: 3.0,         // C++ default 10.0
  heading_min_line_extent_m: 2.0,
  heading_min_inliers: 500,
  heading_min_inlier_ratio: 0.35,
  single_beam_min_inliers_for_correction: 100,          // C++ default 800
  single_beam_min_inlier_ratio_for_correction: 0.15,    // C++ default 0.55
  lateral_ema_alpha: 0.05,                              // C++ default 0.1
  lateral_jump_threshold_m: 0.25,
  lateral_jump_confirm_frames: 3,
  lateral_jump_cluster_threshold_m: 0.08,
  lateral_max_step_m: 0.04,
  expected_rack_distance: 1.6,
};
const DEG = Math.PI / 180;
const AISLE = 33.5 * DEG;

// ── copied from scripts/geometry.js, heading.js, lateral_drift_filter.js ──────
// NormalizeAngle — twin of RackGeometryUtils::NormalizeAngle: wrap into [-pi, pi].
function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}
// accumulate_heading_sample — weighted unit-vector sums for a circular mean.
function accumulateHeadingSample(sample, acc) {
  if (sample.weight <= 0) return false;
  acc.sumWeight += sample.weight;
  acc.sumSin += sample.weight * Math.sin(sample.headingRad);
  acc.sumCos += sample.weight * Math.cos(sample.headingRad);
  return true;
}
// is_single_beam_correction_reliable — inlier count and ratio floor for a lone beam.
function isSingleBeamCorrectionReliable(inlierCount, inlierRatio, minInliers, minInlierRatio) {
  return inlierCount >= minInliers && inlierRatio >= minInlierRatio;
}
// select_consensus_heading_samples — weighted circular mean; samples farther
// than the threshold from the initial mean are rejected and the mean recomputed.
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
// Maps beam_pointcloud.lateral_* YAML keys onto the filter config (node ctor 331-342).
function lateralFilterConfigFromYaml(bp) {
  return { ema_alpha: bp.lateral_ema_alpha, jump_threshold_m: bp.lateral_jump_threshold_m, jump_confirm_frames: bp.lateral_jump_confirm_frames, jump_cluster_threshold_m: bp.lateral_jump_cluster_threshold_m, max_step_m: bp.lateral_max_step_m };
}
// LateralDriftFilter — twin of warehouse_pose_corrector::LateralDriftFilter.
class LateralDriftFilter {
  constructor(config = {}) { this.config = LateralDriftFilter.sanitize(config); this.reset(); }
  // Sanitize — clamp the config exactly as the header does.
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

// ── the cases: hand-built BeamResults in detection order (sim-only) ───────────
// State assumed before each case: frames 0-29 ran, so LastStableHeading() is the
// aisle heading and smoothed_plane_coeffs_ holds track ids 1 and 2.
const LAST_STABLE_HEADING = AISLE;
const KNOWN_TRACK_IDS = new Set([1, 2]);
const beam = (trackId, side, inlierCount, inlierRatio, lineExtentM, skewDeg = 0) => ({ trackId, side, inlierCount, inlierRatio, lineExtentM, heading: AISLE + skewDeg * DEG });
const missing = (trackId, side, why) => ({ trackId, side, missing: why, lineExtentM: 3.2, heading: AISLE });
const dual = () => [beam(1, "left", 680, 0.68, 3.2), beam(2, "right", 680, 0.68, 3.2)];
const LATERAL_FRAMES = 30;
const CASES = [
  { id: "none", frames: "0-29", label: "no fault: dual, calibration on first dual", beams: dual },
  { id: "missing-right", frames: "30-44", label: "right rack missing", beams: () => [beam(1, "left", 680, 0.68, 3.2), missing(2, "right", "no cloud")] },
  { id: "short-both", frames: "45-54", label: "both beams short (extent 1.2 m)", beams: () => [beam(1, "left", 680, 0.68, 1.2), beam(2, "right", 680, 0.68, 1.2)] },
  { id: "skew-right", frames: "55-69", label: "right beam skewed +20 deg, sparse (EMA drifts 0 -> 10 deg)", beams: t => [beam(1, "left", 850, 0.65, 3.2), beam(2, "right", 560, 0.68, 3.0, 10 * t)] },
  // lateral cases: droneY = drone's odom y across the aisle, rackShift = how far the rack points (and so
  // the measured line) move in odom. An odom glitch moves pose and racks together; a true displacement
  // moves only the drone.
  { id: "glitch-lateral", frames: "70-71", label: "odom pose glitch +0.35 m (2 frames)", beams: dual, lateral: { droneY: i => 0.05 + (i === 10 || i === 11 ? 0.35 : 0), rackShift: i => (i === 10 || i === 11 ? 0.35 : 0) } },
  { id: "displacement", frames: "75-89", label: "true lateral displacement +0.35 m", beams: dual, lateral: { droneY: i => 0.05 + (i >= 10 ? 0.35 : 0), rackShift: () => 0 } },
  { id: "dropout", frames: "90-99", label: "perception dropout (timer only)", dropout: true, beams: () => [missing(1, "left", "no frame"), missing(2, "right", "no frame")] },
  { id: "id-switch", frames: "100-109", label: "left track id 1 -> 3", beams: () => [beam(3, "left", 680, 0.68, 3.2), beam(2, "right", 680, 0.68, 3.2)] },
  { id: "weak-single", frames: "-", label: "lone beam with 60 inliers", beams: () => [beam(1, "left", 60, 0.50, 2.5), missing(2, "right", "no cloud")] },
  { id: "no-valid-fit", frames: "-", label: "both fits fail (gap / line length / ratio)", beams: () => [missing(1, "left", "fit failed"), missing(2, "right", "fit failed")] },
];
const CASE_FRAMES = 90;   // 3 s per case at 30 fps

// Runs the node's guard chain on one case: ProcessBeamClouds -> (first N fits) ->
// BuildBeamResultFromFit gate -> ProcessBeamResults -> ComputeConsensus -> aisle state EMA on c ->
// LateralDriftFilter on c -> corrected y = drone's distance to the filtered line.
function nodeReaction(c, t, lastStableHeading) {
  const out = { beams: c.beams(t), accepted: new Set(), rejected: new Map(), hold: null, text: "", guard: "", lateral: null };
  if (c.dropout) {
    out.text = "timer republishes held correction, measurement stamp frozen";
    out.guard = "VisionCorrectionPropagationTimer -> PublishStoredVisionCorrection";
    return out;
  }
  const fits = out.beams.filter(b => !b.missing);
  if (!fits.length) { out.hold = "no valid fit"; out.guard = "ProcessBeamClouds (per_scan_results empty)"; return out; }
  const results = fits.slice(0, YAML.max_beams_for_consensus);   // detection order, not by quality
  for (const r of results) {
    const gate = isBeamReliableForHeading(r, YAML);
    r.headingValid = gate.valid; r.headingRejectReason = gate.reason;
    r.smoothingRestarted = !KNOWN_TRACK_IDS.has(r.trackId);
  }
  if (results.length === 1 && !isSingleBeamCorrectionReliable(results[0].inlierCount, results[0].inlierRatio, YAML.single_beam_min_inliers_for_correction, YAML.single_beam_min_inlier_ratio_for_correction)) {
    out.hold = "weak single beam"; out.guard = "HoldIfWeakSingleBeam (is_single_beam_correction_reliable)"; return out;
  }
  const samples = results.filter(r => r.headingValid).map(r => ({ trackId: r.trackId, headingRad: r.heading, weight: r.inlierCount }));
  const sel = selectConsensusHeadingSamples(samples, YAML.consensus_heading_outlier_threshold_deg * DEG);
  sel.acceptedTrackIds.forEach(id => out.accepted.add(id));
  sel.rejectedSamples.forEach(r => out.rejected.set(r.trackId, r.diffRad));
  if (sel.valid && sel.acceptedTrackIds.length) {
    out.text = `fresh heading ${(sel.headingRad / DEG).toFixed(2)} deg from beam ${sel.acceptedTrackIds.join(", ")}` + (results.length === 1 ? " (single mode, calibrated half width)" : "");
    out.guard = results.length === 1 ? "ComputeConsensus -> BuildCenterlineMeasurement single branch" : "ComputeConsensus (select_consensus_heading_samples)";
    const restarted = results.filter(r => r.smoothingRestarted).map(r => r.trackId);
    if (restarted.length) { out.text += `; coefficient EMA restarted for id ${restarted.join(", ")}`; out.guard = "BuildBeamResultFromFit (no smoothed_plane_coeffs_ entry)"; }
  } else if (lastStableHeading === null) {
    out.hold = "no qualified consensus heading yet"; out.guard = "ProcessBeamResults (LastStableHeading() empty)"; return out;
  } else {
    out.text = "heading held, lateral live";
    out.guard = samples.length ? "ComputeConsensus: all beams rejected as outliers" : "IsBeamReliableForHeading: no heading-qualified beams";
  }
  if (c.lateral) {   // BroadcastVisionCorrectedTF filters the LINE offset c; the drone's motion never enters the filter
    const filter = new LateralDriftFilter(lateralFilterConfigFromYaml(YAML));
    const upTo = Math.min(LATERAL_FRAMES - 1, Math.floor(t * LATERAL_FRAMES));
    const series = [];
    let cState = 0;                                  // aisle-state EMA on c (UpdateAisleState, alpha 0.2), true centerline at odom y = 0
    for (let i = 0; i <= upTo; i += 1) {
      const cMeasured = -c.lateral.rackShift(i);     // line a x + b y + c = 0 with normal (0, 1): c = -(rack midline y)
      cState += 0.2 * (cMeasured - cState);
      const f = filter.update(cState);
      const droneY = c.lateral.droneY(i);
      series.push({ ...f, cMeasured, droneY, distToCenterline: droneY + f.filteredM });
    }
    out.lateral = { now: series[upTo], series, frame: upTo };
  }
  return out;
}

// ── renderer: top-down aisle, plus a strip chart for the lateral cases ────────
function makeWorld(p) {
  const rect = { x: 22, y: 70, w: p.width - 360, h: p.height - 95 };
  const scale = Math.min(rect.w / 9, rect.h / 7);
  const cx = rect.x + rect.w * 0.5, cy = rect.y + rect.h * 0.45;
  const dir = { x: Math.cos(AISLE), y: Math.sin(AISLE) }, nrm = { x: -Math.sin(AISLE), y: Math.cos(AISLE) };
  const toScreen = (along, across) => ({ x: cx + (dir.x * along + nrm.x * across) * scale, y: cy - (dir.y * along + nrm.y * across) * scale });
  return {
    grid() { p.push(); p.stroke(42, 51, 72); p.noFill(); p.rect(rect.x, rect.y, rect.w, rect.h); p.pop(); },
    centerline() {
      const a = toScreen(-3.4, 0), b = toScreen(3.4, 0);
      p.push(); p.stroke(163, 230, 53, 170); p.strokeWeight(2); p.drawingContext.setLineDash([10, 6]); p.line(a.x, a.y, b.x, b.y); p.drawingContext.setLineDash([]); p.pop();
    },
    beam(b, color, dashed, label) {
      const across = b.side === "left" ? YAML.expected_rack_distance : -YAML.expected_rack_distance;
      const c = toScreen(0, across);
      const hx = Math.cos(b.heading) * b.lineExtentM * 0.5 * scale, hy = Math.sin(b.heading) * b.lineExtentM * 0.5 * scale;
      p.push(); p.stroke(color); p.strokeWeight(dashed ? 2 : 5);
      if (dashed) p.drawingContext.setLineDash([6, 6]);
      p.line(c.x - hx, c.y + hy, c.x + hx, c.y - hy);
      p.drawingContext.setLineDash([]);
      p.noStroke(); p.fill(color); p.textSize(11); p.text(label, c.x + hx + 8, c.y - hy); p.pop();
    },
    drone(across, color, label) {
      const s = toScreen(0, across);
      p.push(); p.translate(s.x, s.y); p.rotate(-AISLE); p.noStroke(); p.fill(color); p.triangle(14, 0, -8, 8, -8, -8);
      p.rotate(AISLE); p.textSize(11); p.text(label, 18, 4); p.pop();
    },
    strip(series, frame) {
      const s = { x: rect.x + 40, y: rect.y + rect.h - 120, w: rect.w - 80, h: 100 }, yMin = -0.45, yMax = 0.5;
      const sx = i => s.x + i / (LATERAL_FRAMES - 1) * s.w, sy = v => s.y + s.h - (v - yMin) / (yMax - yMin) * s.h;
      p.push(); p.stroke(42, 51, 72); p.noFill(); p.rect(s.x, s.y, s.w, s.h);
      p.stroke(60, 70, 90); p.line(s.x, sy(0), s.x + s.w, sy(0));
      const plot = (key, color, weight) => { p.stroke(color); p.strokeWeight(weight); p.noFill(); p.beginShape(); series.forEach((r, i) => p.vertex(sx(i), sy(r[key]))); p.endShape(); };
      plot("cMeasured", p.color(135, 148, 172), 1.5); plot("filteredM", p.color(163, 230, 53), 3);
      plot("droneY", p.color(255, 199, 87), 1.5); plot("distToCenterline", p.color(82, 255, 168), 3);
      p.stroke(230, 230, 230, 140); p.strokeWeight(1); p.line(sx(frame), s.y, sx(frame), s.y + s.h);
      p.noStroke(); p.fill(149, 163, 184); p.textSize(11); p.text("c measured (grey) / c filtered (lime) ; drone odom y (amber) / corrected y = drone dist to line (green)", s.x, s.y - 6); p.pop();
    },
    tag(text, color) { p.push(); p.noStroke(); p.fill(color); p.textSize(15); p.textStyle(p.BOLD); p.text(text, rect.x + 14, rect.y + 24); p.pop(); },
  };
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235); p.stroke(47, 58, 82); p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke(); p.fill(230); p.textStyle(p.BOLD); p.text("Node reaction", x + 14, 96);
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
  const caseIndex = Math.floor(simFrame / CASE_FRAMES) % CASES.length;
  const c = CASES[caseIndex];
  const t = (simFrame % CASE_FRAMES) / CASE_FRAMES;
  const r = nodeReaction(c, t, LAST_STABLE_HEADING);
  const startup = r.text === "heading held, lateral live" ? nodeReaction(c, t, null) : null;
  const world = makeWorld(p);
  p.background(8, 10, 16);
  p.noStroke(); p.fill(232, 238, 248); p.textSize(18);
  p.text("Failure cases", 22, 30);
  p.fill(149, 163, 184); p.textSize(12);
  p.text("One sketch: each fault of the synthetic world's schedule, run through the node's real guards", 22, 50);
  world.grid();
  world.centerline();
  for (const b of r.beams) {
    const tag = b.missing ? `beam ${b.trackId} (${b.missing})` : `beam ${b.trackId} (${b.inlierCount} inl, ${b.lineExtentM.toFixed(1)} m)` + (b.smoothingRestarted ? " EMA restart" : "");
    if (b.missing) world.beam(b, b.missing === "fit failed" ? p.color(248, 113, 113) : p.color(135, 148, 172), true, tag);
    else world.beam(b, r.accepted.has(b.trackId) ? p.color(82, 255, 168) : p.color(248, 113, 113), false, tag);
  }
  if (r.lateral) {
    world.drone(r.lateral.now.droneY, p.color(255, 199, 87), "raw odom");
    world.drone(r.lateral.now.distToCenterline, p.color(82, 255, 168), "corrected y");
    world.strip(r.lateral.series, r.lateral.frame);
  } else {
    world.drone(0, p.color(79, 215, 232), "drone");
  }
  world.tag(`${c.id}: ${r.hold ? `hold "${r.hold}"` : r.text}`, r.hold ? p.color(248, 113, 113) : r.accepted.size ? p.color(82, 255, 168) : p.color(255, 199, 87));
  const lat = r.lateral ? r.lateral.now : null;
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `case ${caseIndex + 1}/${CASES.length}: ${c.id}  (frames ${c.frames})`,
    c.label,
    "",
    `reaction: ${r.hold ? `PublishHeldVisionCorrection("${r.hold}")` : r.text}`,
    `guard: ${r.guard}`,
    `accepted: ${[...r.accepted].join(", ") || "none"}`,
    `rejected: ${[...r.rejected].map(([id, d]) => `${id} (diff ${(d / DEG).toFixed(2)} deg)`).join(", ") || "none"}`,
    ...r.beams.filter(b => !b.missing && b.headingRejectReason).map(b => `  beam ${b.trackId} gate: ${b.headingRejectReason}`),
    ...(startup && startup.hold ? [`at startup the same frame would hold:`, `  "${startup.hold}" (${startup.guard})`] : []),
    ...(lat ? [`frame ${r.lateral.frame}: c measured ${lat.cMeasured.toFixed(3)} state ${lat.rawM.toFixed(3)} filtered ${lat.filteredM.toFixed(3)}`, `  c filter held: ${lat.held}  jumpCount: ${lat.jumpCount}`, `  drone odom y ${lat.droneY.toFixed(3)} -> corrected y ${lat.distToCenterline.toFixed(3)}`, c.id === "glitch-lateral" ? "  glitch moves pose AND racks: the aisle EMA absorbs" : "  only the drone moved: c unchanged, corrected y", c.id === "glitch-lateral" ? "  the line shift, corrected y follows the glitch" : "  reflects the displacement at once"] : []),
    "",
    `max_beams_for_consensus: ${YAML.max_beams_for_consensus}`,
    `consensus_heading_outlier_threshold_deg: ${YAML.consensus_heading_outlier_threshold_deg.toFixed(1)}`,
    `heading_min_line_extent_m / inliers / ratio: ${YAML.heading_min_line_extent_m} / ${YAML.heading_min_inliers} / ${YAML.heading_min_inlier_ratio}`,
    `single_beam_min_inliers_for_correction: ${YAML.single_beam_min_inliers_for_correction}`,
    `lateral_jump_threshold_m / confirm_frames: ${YAML.lateral_jump_threshold_m} / ${YAML.lateral_jump_confirm_frames}`,
    "",
    "Green: votes for the heading. Red: rejected",
    "or below a gate. Dashed: missing or failed.",
    "A held frame still runs the c filter.",
  ]);
  if (!paused) simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
}
