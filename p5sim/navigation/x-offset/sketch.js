const DEMO_ID = "x-offset";
// Mirrors the X-offset correction section of PoseCorrectorNode in
// src/pose_corrector_node.cpp (lines 1679-1930): ProjectAlongAisle,
// ProjectAcrossAisle, BuildVerticalObservation, ApplyXOffsetToObservation,
// BuildProjectedMissionUprights, AssociateVerticalObservation, Median,
// UpdateXOffsetFromVerticalObservations. Vector helpers and the seeded RNG are
// the sim-only ones from scripts/geometry.js.
const YAML = {                        // x_offset_correction in the deployed YAML
  x_offset_ema_alpha: 0.05,
  pillar_match_range: 1.0,
  pillar_offset_outlier_threshold_m: 0.5,
  pillar_lateral_score_weight: 0.25,
};
const AISLE_YAW = 33.5 * Math.PI / 180;
const HALF_WIDTH_M = 1.6;             // expected_rack_distance
const UPRIGHT_SPACING_M = 2.8;
const UPRIGHTS_PER_SIDE = 8;
const FIRST_UPRIGHT_S = 1.0;
const ODOM_ALONG_LAG_M = 0.6;         // odom lags map along the aisle: the stage must recover +0.6
const DETECT_AHEAD_M = 4.0;
const DRONE_STEP_M = 0.16;
const DRONE_START_S = 1.4;
const NOISE_SIGMA_M = 0.05;
const SPURIOUS_EVERY = 17;
const SPURIOUS_ALONG_M = 0.9;
const FRAME_COUNT = 102;
const SEED = 7;

// Unit vector along an aisle heading.
function headingVector(yaw) { return { x: Math.cos(yaw), y: Math.sin(yaw) }; }
// Left normal of an aisle heading: the (a, b) of a rack line ax+by+c=0 aligned to it.
function normalVector(yaw) { return { x: -Math.sin(yaw), y: Math.cos(yaw) }; }
// Seeded random (sim-only, deterministic worlds).
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
function randNormal(rng, mean = 0, std = 1) {
  const u1 = Math.max(1e-9, rng());
  const u2 = Math.max(1e-9, rng());
  return mean + Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * std;
}

// ProjectAlongAisle / ProjectAcrossAisle — s/l decomposition along the aisle heading.
function projectAlongAisle(x, y, heading) { return Math.cos(heading) * x + Math.sin(heading) * y; }
function projectAcrossAisle(x, y, heading) { return -Math.sin(heading) * x + Math.cos(heading) * y; }

// BuildVerticalObservation — one detected upright position with its s/l projection.
function buildVerticalObservation(xMap, yMap, heading) {
  return { x: xMap, y: yMap, s: projectAlongAisle(xMap, yMap, heading), l: projectAcrossAisle(xMap, yMap, heading) };
}

// ApplyXOffsetToObservation — shift a detection along the aisle by the current x correction.
function applyXOffsetToObservation(observation, aisleHeadingRad, xOffsetM) {
  return {
    x: observation.x + xOffsetM * Math.cos(aisleHeadingRad),
    y: observation.y + xOffsetM * Math.sin(aisleHeadingRad),
    s: observation.s + xOffsetM,
    l: observation.l,
  };
}

// BuildProjectedMissionUprights — mission uprights (start/end midpoints) projected
// and sorted along the aisle; `order` is the sorted index.
function buildProjectedMissionUprights(uprights, heading) {
  const projected = [];
  for (const upright of uprights || []) {
    const x = (upright.start.x + upright.end.x) * 0.5;
    const y = (upright.start.y + upright.end.y) * 0.5;
    projected.push({ id: upright.id, order: 0, x, y, s: projectAlongAisle(x, y, heading), l: projectAcrossAisle(x, y, heading) });
  }
  projected.sort((a, b) => a.s - b.s);
  projected.forEach((u, i) => { u.order = i; });
  return projected;
}

// AssociateVerticalObservation — nearest mission upright inside pillar_match_range,
// scored by distance plus a weighted across-aisle residual.
function associateVerticalObservation(observation, uprights, aisleHeadingRad, currentXOffsetM, cfg) {
  if (!uprights || !uprights.length) return null;
  const correctedObservation = applyXOffsetToObservation(observation, aisleHeadingRad, currentXOffsetM);
  let best = null;
  let bestScore = Infinity;
  for (const upright of uprights) {
    const errX = upright.x - correctedObservation.x;
    const errY = upright.y - correctedObservation.y;
    const distance = Math.hypot(errX, errY);
    if (cfg.pillar_match_range > 0 && distance > cfg.pillar_match_range) continue;
    const lateralResidual = Math.abs(upright.l - correctedObservation.l);
    const score = distance + cfg.pillar_lateral_score_weight * lateralResidual;
    if (best === null || score < bestScore) {
      best = {
        observation, correctedObservation, upright, errX, errY,
        distanceM: distance, residualM: upright.s - correctedObservation.s,
        lateralResidualM: lateralResidual, scoreM: score,
      };
      bestScore = score;
    }
  }
  return best;
}

// Median — nth_element median; even counts average the middle pair.
function median(values) {
  if (!values || !values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  let result = sorted[mid];
  if (sorted.length % 2 === 0) result = 0.5 * (result + sorted[mid - 1]);
  return result;
}

// UpdateXOffsetFromVerticalObservations — one frame of pillar matching. Mutates
// state.{xOffsetRaw, xOffsetFiltered, xOffsetHasMeasurement} exactly as the node.
function updateXOffsetFromVerticalObservations(state, observations, aisleHeadingRad, uprights, cfg) {
  const out = { updated: false, reason: "", currentX: 0, matches: [], keptMatches: [], rejected: 0, meanResidual: 0, selected: null, projectedUprights: [] };
  if (!uprights || !uprights.length) { out.reason = "no map"; return out; }
  if (!observations || !observations.length) { out.reason = "no observations"; return out; }
  const projected = buildProjectedMissionUprights(uprights, aisleHeadingRad);
  out.projectedUprights = projected;
  const currentXForMatching = state.xOffsetHasMeasurement ? state.xOffsetRaw : 0;
  out.currentX = currentXForMatching;
  const bestByUprightId = new Map();
  for (const observation of observations) {
    const association = associateVerticalObservation(observation, projected, aisleHeadingRad, currentXForMatching, cfg);
    if (!association) { out.rejected += 1; continue; }
    const existing = bestByUprightId.get(association.upright.id);
    if (!existing || association.scoreM < existing.scoreM) bestByUprightId.set(association.upright.id, association);
  }
  const matches = Array.from(bestByUprightId.values());
  out.matches = matches;
  if (!matches.length) { out.reason = "no match"; return out; }
  const medianResidual = median(matches.map(m => m.residualM));
  let kept = matches.filter(m => !(matches.length > 1 && cfg.pillar_offset_outlier_threshold_m > 0 &&
    Math.abs(m.residualM - medianResidual) > cfg.pillar_offset_outlier_threshold_m));
  if (!kept.length) kept = [matches.reduce((a, b) => (b.scoreM < a.scoreM ? b : a))];
  const meanResidual = kept.reduce((sum, m) => sum + m.residualM, 0) / kept.length;
  const selected = kept.reduce((a, b) => (Math.abs(b.residualM - meanResidual) < Math.abs(a.residualM - meanResidual) ? b : a));
  state.xOffsetRaw = currentXForMatching + meanResidual;
  if (!state.xOffsetHasMeasurement) {
    state.xOffsetFiltered = state.xOffsetRaw;
    state.xOffsetHasMeasurement = true;
  } else {
    state.xOffsetFiltered = (1 - cfg.x_offset_ema_alpha) * state.xOffsetFiltered + cfg.x_offset_ema_alpha * state.xOffsetRaw;
  }
  out.updated = true; out.keptMatches = kept; out.meanResidual = meanResidual; out.selected = selected;
  return out;
}

// Mission map: one vertical upright every 2.8 m at each rack face, map frame.
function buildMissionUprights() {
  const h = headingVector(AISLE_YAW), n = normalVector(AISLE_YAW);
  const uprights = [];
  for (let i = 0; i < UPRIGHTS_PER_SIDE; i += 1) {
    const s = FIRST_UPRIGHT_S + i * UPRIGHT_SPACING_M;
    for (const side of [1, -1]) {
      const x = h.x * s + n.x * side * HALF_WIDTH_M;
      const y = h.y * s + n.y * side * HALF_WIDTH_M;
      uprights.push({ id: uprights.length + 1, side, s, start: { x, y }, end: { x, y } });
    }
  }
  return uprights;
}

// One perception frame: the uprights within 4 m ahead of the drone, seen in odom
// (0.6 m behind their map position, sigma 0.05), plus a spurious point every 17th
// frame 0.9 m along the aisle from the nearest upright behind the drone.
function buildFrame(i, uprights, rng) {
  const h = headingVector(AISLE_YAW);
  const droneS = DRONE_START_S + DRONE_STEP_M * i;
  const observe = (u, alongShift, spurious) => {
    const x = u.start.x + h.x * (alongShift - ODOM_ALONG_LAG_M) + randNormal(rng, 0, NOISE_SIGMA_M);
    const y = u.start.y + h.y * (alongShift - ODOM_ALONG_LAG_M) + randNormal(rng, 0, NOISE_SIGMA_M);
    return Object.assign(buildVerticalObservation(x, y, AISLE_YAW), { spurious, sourceId: u.id });
  };
  const detections = [];
  for (const u of uprights) {
    const ds = u.s - droneS;
    if (ds > 0 && ds <= DETECT_AHEAD_M) detections.push(observe(u, 0, false));
  }
  const behind = uprights.filter(u => u.s <= droneS);
  if (i % SPURIOUS_EVERY === 0 && behind.length) {
    detections.push(observe(behind.reduce((a, b) => (b.s > a.s ? b : a)), SPURIOUS_ALONG_M, true));
  }
  return {
    index: i, droneS, detections,
    droneMap: { x: h.x * droneS, y: h.y * droneS },
    droneOdom: { x: h.x * (droneS - ODOM_ALONG_LAG_M), y: h.y * (droneS - ODOM_ALONG_LAG_M) },
  };
}

// Runs the whole loop once with one persistent x-offset state and keeps every result.
function runSimulation() {
  const uprights = buildMissionUprights();
  const rng = makeRng(SEED);
  const state = { xOffsetRaw: 0, xOffsetFiltered: 0, xOffsetHasMeasurement: false };
  const frames = [];
  for (let i = 0; i < FRAME_COUNT; i += 1) {
    const frame = buildFrame(i, uprights, rng);
    frame.out = updateXOffsetFromVerticalObservations(state, frame.detections, AISLE_YAW, uprights, YAML);
    frame.state = Object.assign({}, state);
    frames.push(frame);
  }
  return { uprights, frames };
}
const SIM = runSimulation();

// Builds a tiny world-to-screen renderer whose camera follows `center` (map frame).
function makeWorld(p, center) {
  const rect = { x: 22, y: 70, w: p.width - 360, h: p.height - 95 };
  const scale = Math.min(rect.w / 13, rect.h / 9);
  return {
    toScreen(pt) { return { x: rect.x + rect.w * 0.5 + (pt.x - center.x) * scale, y: rect.y + rect.h * 0.5 - (pt.y - center.y) * scale }; },
    clipBegin() { const c = p.drawingContext; c.save(); c.beginPath(); c.rect(rect.x, rect.y, rect.w, rect.h); c.clip(); },
    clipEnd() { p.drawingContext.restore(); },
    grid() { p.push(); p.stroke(42, 51, 72); p.noFill(); p.rect(rect.x, rect.y, rect.w, rect.h); p.pop(); },
    segment(a, b, color, weight) {
      const sa = this.toScreen(a), sb = this.toScreen(b);
      p.push(); p.stroke(...color); p.strokeWeight(weight); p.line(sa.x, sa.y, sb.x, sb.y); p.pop();
    },
    arrow(a, b, color, weight) {
      const sa = this.toScreen(a), sb = this.toScreen(b);
      const ang = Math.atan2(sb.y - sa.y, sb.x - sa.x);
      p.push(); p.stroke(...color); p.strokeWeight(weight); p.line(sa.x, sa.y, sb.x, sb.y);
      p.translate(sb.x, sb.y); p.rotate(ang); p.line(0, 0, -8, -4); p.line(0, 0, -8, 4); p.pop();
    },
    ring(pt, radiusM, color, weight) {
      const s = this.toScreen(pt);
      p.push(); p.noFill(); p.stroke(...color); p.strokeWeight(weight); p.circle(s.x, s.y, 2 * radiusM * scale); p.pop();
    },
    dot(pt, color, d) { const s = this.toScreen(pt); p.push(); p.noStroke(); p.fill(...color); p.circle(s.x, s.y, d); p.pop(); },
    cylinder(pt, color, highlight, label) {
      const s = this.toScreen(pt), w = 12, h = 14;
      p.push(); p.stroke(8, 10, 16); p.strokeWeight(1); p.fill(...color);
      p.rect(s.x - w / 2, s.y - h / 2, w, h); p.ellipse(s.x, s.y + h / 2, w, 5);
      p.fill(200, 250, 255); p.ellipse(s.x, s.y - h / 2, w, 5);
      if (highlight) { p.noFill(); p.stroke(255); p.strokeWeight(2); p.circle(s.x, s.y, 26); }
      p.noStroke(); p.fill(180, 230, 240); p.textSize(10); p.text(label, s.x + 9, s.y - 8); p.pop();
    },
    pose(pt, yaw, color, label) {
      const s = this.toScreen(pt);
      p.push(); p.noStroke(); p.fill(...color); p.circle(s.x, s.y, 12);
      p.stroke(...color); p.strokeWeight(3); p.line(s.x, s.y, s.x + Math.cos(yaw) * 30, s.y - Math.sin(yaw) * 30);
      p.noStroke(); p.fill(230); p.textSize(11); p.text(label, s.x + 10, s.y + 16); p.pop();
    },
  };
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235); p.stroke(47, 58, 82); p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke(); p.fill(230); p.textStyle(p.BOLD); p.text("X offset from vertical uprights", x + 14, 96);
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
  const i = Math.floor(simFrame / 3) % FRAME_COUNT;
  const frame = SIM.frames[i];
  const out = frame.out;
  const h = headingVector(AISLE_YAW), n = normalVector(AISLE_YAW);
  const w = makeWorld(p, { x: frame.droneMap.x + h.x * 2, y: frame.droneMap.y + h.y * 2 });
  p.background(8, 10, 16);
  p.noStroke(); p.fill(232, 238, 248); p.textSize(18);
  p.text("X offset from vertical uprights", 22, 30);
  p.fill(149, 163, 184); p.textSize(12);
  p.text("One sketch: shift detections by the raw x -> match inside pillar_match_range -> median reject -> raw += mean residual -> EMA", 22, 50);
  w.grid();
  w.clipBegin();
  const s0 = FIRST_UPRIGHT_S - 2, s1 = FIRST_UPRIGHT_S + (UPRIGHTS_PER_SIDE - 1) * UPRIGHT_SPACING_M + 2;
  w.segment({ x: h.x * s0, y: h.y * s0 }, { x: h.x * s1, y: h.y * s1 }, [60, 70, 95], 1);
  for (const side of [1, -1]) {
    w.segment({ x: h.x * s0 + n.x * side * HALF_WIDTH_M, y: h.y * s0 + n.y * side * HALF_WIDTH_M },
              { x: h.x * s1 + n.x * side * HALF_WIDTH_M, y: h.y * s1 + n.y * side * HALF_WIDTH_M }, [40, 90, 100], 2);
  }
  const shifted = frame.detections.map(obs => applyXOffsetToObservation(obs, AISLE_YAW, out.currentX));
  shifted.forEach(pt => w.ring(pt, YAML.pillar_match_range, [96, 165, 250, 90], 1));
  const kept = new Set(out.keptMatches);
  out.matches.forEach(m => w.arrow(m.correctedObservation, m.upright, kept.has(m) ? [255, 199, 87] : [248, 113, 113, 150], kept.has(m) ? 2 : 1.5));
  const selectedId = out.selected ? out.selected.upright.id : -1;
  SIM.uprights.forEach(u => w.cylinder(u.start, [79, 215, 232], u.id === selectedId, `${u.id}`));
  frame.detections.forEach((obs, k) => {
    w.segment(obs, shifted[k], [96, 165, 250, 120], 1);
    w.dot(obs, obs.spurious ? [255, 80, 80] : [248, 113, 113], obs.spurious ? 12 : 9);
    w.dot(shifted[k], [96, 165, 250], 9);
  });
  w.pose(frame.droneOdom, AISLE_YAW, [255, 199, 87], "FCU (odom)");
  const corrected = { x: frame.droneOdom.x + h.x * frame.state.xOffsetFiltered, y: frame.droneOdom.y + h.y * frame.state.xOffsetFiltered };
  w.ring(corrected, 0.18, [82, 255, 168], 2);
  w.clipEnd();
  const spurious = frame.detections.some(obs => obs.spurious);
  const medianRejected = out.matches.length - out.keptMatches.length;
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `frame: ${i}   drone s: ${frame.droneS.toFixed(2)} m`,
    `detections: ${frame.detections.length}${spurious ? "  (+1 spurious, 0.9 m off)" : ""}`,
    `currentX for matching: ${out.currentX.toFixed(3)} m`,
    `matches: ${out.matches.length}   kept: ${out.keptMatches.length}   rejected: ${out.rejected}`,
    `median rejected: ${medianRejected}${out.updated ? "" : `   reason: ${out.reason}`}`,
    `meanResidual: ${out.meanResidual.toFixed(3)} m`,
    `xOffsetRaw: ${frame.state.xOffsetRaw.toFixed(3)} m`,
    `xOffsetFiltered: ${frame.state.xOffsetFiltered.toFixed(3)} m`,
    out.selected ? `selected: id ${out.selected.upright.id}, order ${out.selected.upright.order}` : "selected: none",
    "",
    `x_offset_ema_alpha: ${YAML.x_offset_ema_alpha}`,
    `pillar_match_range: ${YAML.pillar_match_range}`,
    `pillar_offset_outlier_threshold_m: ${YAML.pillar_offset_outlier_threshold_m}`,
    `pillar_lateral_score_weight: ${YAML.pillar_lateral_score_weight}`,
    "",
    "Cyan: mission uprights (map frame).",
    "Red: detections in odom, 0.6 m behind.",
    "Blue: detections shifted by the raw x;",
    "the circle is pillar_match_range.",
    "Yellow: kept match. Dim red: median",
    "rejects a residual > 0.5 m from the rest.",
    "Green ring: FCU + xOffsetFiltered.",
    "Expected: xOffsetFiltered -> +0.6 m.",
  ]);
  if (!paused) simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
}
