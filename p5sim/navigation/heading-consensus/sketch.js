const DEMO_ID = "heading-consensus";
// Mirrors include/warehouse_pose_corrector_vision_based/consensus_filter.hpp
// (select_consensus_heading_samples) and PoseCorrectorNode in
// src/pose_corrector_node.cpp: ProcessBeamClouds 840-848 (first N fits in
// detection order), IsBeamReliableForHeading 2108-2144, ComputeConsensus 2202-2256.
const YAML = {                                   // beam_pointcloud.* (deployed values)
  enable_multi_beam_consensus: true,             // C++ default false
  max_beams_for_consensus: 2,                    // C++ default 4
  min_beams_for_consensus: 1,                    // C++ default 2
  consensus_heading_outlier_threshold_deg: 3.0,  // C++ default 10.0
  heading_min_line_extent_m: 2.0,
  heading_min_inliers: 500,
  heading_min_inlier_ratio: 0.35,
};
const DEG = Math.PI / 180;
const AISLE_DEG = 33.5;

// ── copied from scripts/geometry.js and scripts/heading.js ────────────────────
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

// ── per-frame simulation (sim-only) ───────────────────────────────────────────
// Three beam results in DETECTION order. Beam 2 (the lighter one) swings away
// from beam 1 by `splitDeg`. Beam 3 is short and sparse: it fails the heading
// gate, and it also sits beyond max_beams_for_consensus.
function makeBeamResults(splitDeg) {
  return [
    { trackId: 1, side: "left", heading: AISLE_DEG * DEG, inlierCount: 1000, inlierRatio: 0.70, lineExtentM: 3.2 },
    { trackId: 2, side: "right", heading: (AISLE_DEG + splitDeg) * DEG, inlierCount: 660, inlierRatio: 0.68, lineExtentM: 3.0 },
    { trackId: 3, side: "left", heading: (AISLE_DEG + 1.0) * DEG, inlierCount: 300, inlierRatio: 0.50, lineExtentM: 1.2 },
  ];
}
// sim: the initial weighted mean of all voters (select_consensus_heading_samples keeps it private); drawn as the gate centre.
function initialMean(samples) {
  const acc = { sumWeight: 0, sumSin: 0, sumCos: 0 };
  for (const s of samples) accumulateHeadingSample(s, acc);
  return acc.sumWeight > 0 ? Math.atan2(acc.sumSin, acc.sumCos) : null;
}
// ProcessBeamClouds keeps the first max_beams_for_consensus fits in detection order;
// ComputeConsensus lets only the heading-valid ones vote, weighted by inlier count.
function runFrame(splitDeg, lastPublishedHeading) {
  const detected = makeBeamResults(splitDeg);
  detected.forEach(r => { const g = isBeamReliableForHeading(r, YAML); r.headingValid = g.valid; r.headingRejectReason = g.reason; });
  const taken = detected.slice(0, YAML.max_beams_for_consensus);
  const samples = taken.filter(r => r.headingValid).map(r => ({ trackId: r.trackId, headingRad: r.heading, weight: r.inlierCount }));
  const selection = selectConsensusHeadingSamples(samples, YAML.consensus_heading_outlier_threshold_deg * DEG);
  const fresh = selection.valid && selection.acceptedTrackIds.length > 0;
  return { detected, taken, samples, selection, gateCentre: initialMean(samples), fresh, heading: fresh ? selection.headingRad : lastPublishedHeading };
}
const SPLIT_FRAMES = 300;   // split grows 0 -> 10 deg over 10 s, holds 2 s, repeats
const HOLD_FRAMES = 60;

// ── renderer: an angle axis plus a top-down view of the beams ─────────────────
function makeWorld(p) {
  const rect = { x: 22, y: 70, w: p.width - 360, h: p.height - 95 };
  const axis = { x0: rect.x + 60, x1: rect.x + rect.w - 40, y: rect.y + rect.h - 70, degMin: 28, degMax: 48 };
  const top = { cx: rect.x + rect.w * 0.5, cy: rect.y + rect.h * 0.42, scale: Math.min(rect.w, rect.h) * 0.11 };
  const degX = deg => axis.x0 + (deg - axis.degMin) / (axis.degMax - axis.degMin) * (axis.x1 - axis.x0);
  return {
    frame() { p.push(); p.stroke(42, 51, 72); p.noFill(); p.rect(rect.x, rect.y, rect.w, rect.h); p.pop(); },
    axis() {
      p.push(); p.stroke(42, 51, 72); p.strokeWeight(2); p.line(axis.x0, axis.y, axis.x1, axis.y);
      for (let deg = axis.degMin; deg <= axis.degMax; deg += 2) {
        const x = degX(deg); p.stroke(42, 51, 72); p.line(x, axis.y - 8, x, axis.y + 8);
        p.noStroke(); p.fill(149, 163, 184); p.textSize(11); p.text(`${deg}`, x - 7, axis.y + 24);
      }
      p.pop();
    },
    gateBand(centreRad, halfDeg) {
      if (centreRad === null) return;
      const c = centreRad / DEG;
      p.push(); p.noStroke(); p.fill(79, 215, 232, 26); p.rect(degX(c - halfDeg), axis.y - 46, degX(c + halfDeg) - degX(c - halfDeg), 92);
      p.stroke(79, 215, 232, 160); p.strokeWeight(1); p.line(degX(c), axis.y - 46, degX(c), axis.y + 46);
      p.noStroke(); p.fill(79, 215, 232); p.textSize(11); p.text("initial mean +/- 3 deg", degX(c) + 6, axis.y - 50); p.pop();
    },
    sample(r, color, label) {
      const x = degX(r.heading / DEG);
      p.push(); p.noStroke(); p.fill(color); p.circle(x, axis.y, Math.max(10, Math.min(26, r.inlierCount / 45)));
      p.fill(230); p.textSize(11); p.text(label, x - 18, axis.y - 22); p.pop();
    },
    mean(rad, color, label) {
      if (rad === null) return;
      const x = degX(rad / DEG);
      p.push(); p.stroke(color); p.strokeWeight(4); p.line(x, axis.y - 60, x, axis.y + 60);
      p.noStroke(); p.fill(color); p.textSize(11); p.text(label, x + 6, axis.y + 58); p.pop();
    },
    // Top-down: rack line chords at their own headings, offset +/-1.6 m across a 33.5 deg aisle.
    beamChord(r, offsetAcross, along, color, dashed) {
      const nx = -Math.sin(AISLE_DEG * DEG), ny = Math.cos(AISLE_DEG * DEG), dx = Math.cos(AISLE_DEG * DEG), dy = Math.sin(AISLE_DEG * DEG);
      const cx = nx * offsetAcross + dx * along, cy = ny * offsetAcross + dy * along;
      const hx = Math.cos(r.heading) * r.lineExtentM * 0.5, hy = Math.sin(r.heading) * r.lineExtentM * 0.5;
      const sx = v => top.cx + v * top.scale, sy = v => top.cy - v * top.scale;
      p.push(); p.stroke(color); p.strokeWeight(dashed ? 2 : 4);
      if (dashed) p.drawingContext.setLineDash([6, 6]);
      p.line(sx(cx - hx), sy(cy - hy), sx(cx + hx), sy(cy + hy));
      p.drawingContext.setLineDash([]);
      p.noStroke(); p.fill(color); p.textSize(11); p.text(`beam ${r.trackId}`, sx(cx + hx) + 6, sy(cy + hy)); p.pop();
    },
    headingArrow(rad, color) {
      if (rad === null) return;
      const len = top.scale * 2.2;
      p.push(); p.stroke(color); p.strokeWeight(3); p.line(top.cx, top.cy, top.cx + Math.cos(rad) * len, top.cy - Math.sin(rad) * len);
      p.noStroke(); p.fill(color); p.circle(top.cx, top.cy, 8); p.pop();
    },
    tag(text, color) { p.push(); p.noStroke(); p.fill(color); p.textSize(15); p.textStyle(p.BOLD); p.text(text, rect.x + 14, rect.y + 24); p.pop(); },
  };
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235); p.stroke(47, 58, 82); p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke(); p.fill(230); p.textStyle(p.BOLD); p.text("ComputeConsensus", x + 14, 96);
  p.textStyle(p.NORMAL); p.fill(210, 220, 235); p.textSize(12);
  lines.forEach((line, i) => p.text(line, x + 14, 128 + i * 18));
  p.pop();
}

let paused = false;
let simFrame = 0;
let lastPublishedHeading = null;   // last_published_heading_: what LastStableHeading() returns
document.getElementById("pauseButton").addEventListener("click", (event) => {
  paused = !paused;
  event.currentTarget.textContent = paused ? "Resume" : "Pause";
});
document.getElementById("resetButton").addEventListener("click", () => { simFrame = 0; lastPublishedHeading = null; });

// Creates the p5 canvas and fixes the animation update rate.
function setup() {
  createCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
  frameRate(30);
}

// Runs one animation frame and redraws the current method state.
function draw() {
  const p = window;
  const local = simFrame % (SPLIT_FRAMES + HOLD_FRAMES);
  const splitDeg = 10 * Math.min(1, local / SPLIT_FRAMES);
  const frame = runFrame(splitDeg, lastPublishedHeading);
  if (frame.fresh && !paused) lastPublishedHeading = frame.heading;
  const accepted = new Set(frame.selection.acceptedTrackIds);
  const rejected = new Map(frame.selection.rejectedSamples.map(r => [r.trackId, r.diffRad]));
  const regime = frame.fresh
    ? (rejected.size ? "B: lighter beam rejected, mean = beam 1" : "A: both accepted, mean drifts")
    : "C: both rejected -> no consensus, heading held";
  const world = makeWorld(p);
  p.background(8, 10, 16);
  p.noStroke(); p.fill(232, 238, 248); p.textSize(18);
  p.text("Heading consensus", 22, 30);
  p.fill(149, 163, 184); p.textSize(12);
  p.text("One sketch: first N fits in detection order -> heading gate -> weighted circular mean -> reject beams beyond 3 deg -> recompute", 22, 50);
  world.frame();
  world.tag(`regime ${regime}`, frame.fresh ? p.color(82, 255, 168) : p.color(248, 113, 113));
  for (const r of frame.detected) {
    const inCap = frame.taken.includes(r);
    const color = !inCap || !r.headingValid ? p.color(135, 148, 172) : accepted.has(r.trackId) ? p.color(82, 255, 168) : p.color(248, 113, 113);
    world.beamChord(r, r.side === "left" ? 1.6 : -1.6, r.trackId === 3 ? 3.6 : 0, color, !inCap || !r.headingValid);
    if (inCap && r.headingValid) world.sample(r, color, `beam ${r.trackId} (w ${r.inlierCount})`);
  }
  world.headingArrow(frame.heading, frame.fresh ? p.color(163, 230, 53) : p.color(255, 199, 87));
  world.axis();
  world.gateBand(frame.gateCentre, YAML.consensus_heading_outlier_threshold_deg);
  world.mean(frame.heading, frame.fresh ? p.color(163, 230, 53) : p.color(255, 199, 87), frame.fresh ? "consensus" : "held");
  const beam3 = frame.detected[2];
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `split beam1 -> beam2: ${splitDeg.toFixed(2)} deg`,
    `max_beams_for_consensus: ${YAML.max_beams_for_consensus}`,
    `consensus_heading_outlier_threshold_deg: ${YAML.consensus_heading_outlier_threshold_deg.toFixed(1)}`,
    `detection order: 1, 2, 3 -> taken: ${frame.taken.map(r => r.trackId).join(", ")}`,
    `beam 3: beyond cap; gate would also fail:`,
    `  ${beam3.headingRejectReason}`,
    `voters: ${frame.samples.map(s => `${s.trackId} (w ${s.weight})`).join(", ") || "none"}`,
    `initial mean: ${frame.gateCentre === null ? "-" : (frame.gateCentre / DEG).toFixed(2) + " deg"}`,
    `accepted ids: ${frame.selection.acceptedTrackIds.join(", ") || "none"}`,
    `rejected: ${[...rejected].map(([id, d]) => `${id} (diff ${(d / DEG).toFixed(2)} deg)`).join(", ") || "none"}`,
    `heading: ${frame.heading === null ? "none yet" : (frame.heading / DEG).toFixed(2) + " deg"}  ${frame.fresh ? "fresh" : "held"}`,
    "",
    "Weights are inlier counts (1000 vs 660).",
    "Beam 2 leaves the gate at 4.98 deg split",
    "(its distance to the mean is 0.60 split);",
    "beam 1 at 7.54 deg (0.40 split). Then",
    "select_consensus_heading_samples is",
    "invalid: ProcessBeamResults keeps",
    "LastStableHeading() and still feeds",
    "both beams to the lateral correction.",
  ]);
  if (!paused) simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
}
