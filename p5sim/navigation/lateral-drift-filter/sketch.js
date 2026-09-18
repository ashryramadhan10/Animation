const DEMO_ID = "lateral-drift-filter";
// Mirrors include/warehouse_pose_corrector_vision_based/lateral_drift_filter.hpp
//
// What it filters: since the line-based correction (BroadcastVisionCorrectedTF)
// the input is the CENTERLINE OFFSET c estimated each frame, a property of the
// line, not the drone's distance to it. A jump in c means the line estimate
// jumped (mode switch, calibration, a corrupted dual midpoint); the drone's own
// lateral motion never reaches this filter. The corrected TF uses the output.
const YAML = {
  lateral_ema_alpha: 0.05,
  lateral_jump_threshold_m: 0.25,
  lateral_jump_confirm_frames: 3,
  lateral_jump_cluster_threshold_m: 0.08,
  lateral_max_step_m: 0.04,
};

// Maps beam_pointcloud.lateral_* YAML keys onto the filter config.
function lateralFilterConfigFromYaml(bp) {
  return {
    ema_alpha: bp.lateral_ema_alpha,
    jump_threshold_m: bp.lateral_jump_threshold_m,
    jump_confirm_frames: bp.lateral_jump_confirm_frames,
    jump_cluster_threshold_m: bp.lateral_jump_cluster_threshold_m,
    max_step_m: bp.lateral_max_step_m,
  };
}

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

// Builds the raw centerline-offset series c (metres) with three fault windows.
function rawSeries(count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    let value = 0.2 + 0.02 * Math.sin(0.13 * i);                 // c hovers near the odom intercept
    if (i === 70 || i === 71) value += 0.35;                      // isolated glitch in the line estimate
    if (i >= 120 && i <= 220) value += 0.35;                      // sustained shift (e.g. calibration anchor jump)
    if (i >= 260 && i <= 266) value += (i % 2 === 0 ? 0.5 : 0.7); // unstable cluster
    out.push(value);
  }
  return out;
}

// Runs one filter over the whole series and keeps every update result.
function runFilter(series, config) {
  const filter = new LateralDriftFilter(config);
  return series.map(raw => filter.update(raw));
}

const WINDOWS = [
  { from: 70, to: 71, label: "isolated glitch in c", color: [248, 113, 113, 50] },
  { from: 120, to: 220, label: "sustained shift of c", color: [82, 255, 168, 40] },
  { from: 260, to: 266, label: "unstable cluster", color: [255, 199, 87, 50] },
];
const COUNT = 360;
const SERIES = rawSeries(COUNT);
const YAML_RUN = runFilter(SERIES, lateralFilterConfigFromYaml(YAML));
const SNAP_RUN = runFilter(SERIES, Object.assign(lateralFilterConfigFromYaml(YAML), { ema_alpha: 1.0 }));

// Builds a strip-chart renderer: x is frame index, y is metres.
function makeChart(p) {
  const rect = { x: 22, y: 70, w: p.width - 360, h: p.height - 95 };
  const yMin = -0.3, yMax = 0.9;
  return {
    toScreen(i, y) {
      return { x: rect.x + (i / (COUNT - 1)) * rect.w, y: rect.y + rect.h - ((y - yMin) / (yMax - yMin)) * rect.h };
    },
    grid() {
      p.push(); p.stroke(42, 51, 72); p.noFill(); p.rect(rect.x, rect.y, rect.w, rect.h);
      for (let y = yMin; y <= yMax + 1e-9; y += 0.1) { const a = this.toScreen(0, y), b = this.toScreen(COUNT - 1, y); p.line(a.x, a.y, b.x, b.y); }
      p.pop();
    },
    window(win) {
      const a = this.toScreen(win.from, yMax), b = this.toScreen(win.to + 1, yMin);
      p.push(); p.noStroke(); p.fill(...win.color); p.rect(a.x, a.y, b.x - a.x, b.y - a.y); p.pop();
    },
    series(values, upTo, color, weight) {
      p.push(); p.stroke(...color); p.strokeWeight(weight); p.noFill(); p.beginShape();
      for (let i = 0; i <= upTo; i += 1) { const s = this.toScreen(i, values[i]); p.vertex(s.x, s.y); }
      p.endShape(); p.pop();
    },
    cursor(i) {
      const a = this.toScreen(i, yMax), b = this.toScreen(i, yMin);
      p.push(); p.stroke(230, 230, 230, 140); p.strokeWeight(1); p.line(a.x, a.y, b.x, b.y); p.pop();
    },
  };
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235); p.stroke(47, 58, 82); p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke(); p.fill(230); p.textStyle(p.BOLD); p.text("Lateral drift filter", x + 14, 96);
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
  const now = YAML_RUN[i];
  const chart = makeChart(p);
  p.background(8, 10, 16);
  p.noStroke(); p.fill(232, 238, 248); p.textSize(18);
  p.text("Lateral drift filter", 22, 30);
  p.fill(149, 163, 184); p.textSize(12);
  p.text("One sketch on the centerline offset c: jump detection -> hold until confirmed -> EMA -> output step limit", 22, 50);
  chart.grid();
  WINDOWS.forEach(win => chart.window(win));
  chart.series(SERIES, i, [135, 148, 172], 1.5);
  chart.series(SNAP_RUN.map(r => r.filteredM), i, [255, 142, 88], 2);
  chart.series(YAML_RUN.map(r => r.filteredM), i, [82, 255, 168], 3);
  chart.cursor(i);
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `frame: ${i}`,
    `c raw: ${now.rawM.toFixed(3)} m   c filtered: ${now.filteredM.toFixed(3)} m`,
    `raw delta: ${now.rawDeltaM.toFixed(3)} m`,
    `held: ${now.held}   jumpCount: ${now.jumpCount}`,
    `jumpConfirmed: ${now.jumpConfirmed}`,
    `TF sideways translation = c filtered`,
    "",
    `lateral_ema_alpha: ${YAML.lateral_ema_alpha}`,
    `lateral_jump_threshold_m: ${YAML.lateral_jump_threshold_m}`,
    `lateral_jump_confirm_frames: ${YAML.lateral_jump_confirm_frames}`,
    `lateral_jump_cluster_threshold_m: ${YAML.lateral_jump_cluster_threshold_m}`,
    `lateral_max_step_m: ${YAML.lateral_max_step_m}`,
    "",
    "Grey: raw centerline offset c.",
    "Green: YAML filter (EMA 0.05).",
    "Orange: alpha 1.0, so only the",
    "0.04 m step limit shapes it.",
    "",
    "An isolated jump is held. A jump",
    "that repeats for 3 frames within",
    "0.08 m is confirmed, then eased in.",
    "",
    "Note: c arrives already smoothed by",
    "the aisle-state EMA, so in flight the",
    "jump guard rarely fires; the 0.05 EMA",
    "mostly adds lag on top.",
  ]);
  if (!paused) simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
}
