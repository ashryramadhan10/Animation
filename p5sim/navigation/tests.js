(function runNavigationTests(root) {
  "use strict";

  const runningInNode = typeof module !== "undefined" && module.exports;
  const tests = [];

  function loadModule(path, browserName) {
    if (!runningInNode) return (root.PoseCorrectorSim || {})[browserName] || null;
    try { return require(path); } catch (error) {
      if (error && error.code === "MODULE_NOT_FOUND") return null;
      throw error;
    }
  }

  const configApi = loadModule("./scripts/config.js", "config");
  const geometryApi = loadModule("./scripts/geometry.js", "geometry");
  const lineFitterApi = loadModule("./scripts/line_fitter.js", "lineFitter");
  const aisleStateApi = loadModule("./scripts/aisle_state.js", "aisleState");
  const lateralApi = loadModule("./scripts/lateral_drift_filter.js", "lateralDriftFilter");
  const headingApi = loadModule("./scripts/heading.js", "heading");
  const xOffsetApi = loadModule("./scripts/x_offset.js", "xOffset");
  const correctionApi = loadModule("./scripts/correction_transform.js", "correctionTransform");
  const nodeApi = loadModule("./scripts/pose_corrector.js", "poseCorrector");
  const worldApi = loadModule("./scripts/synthetic_world.js", "syntheticWorld");

  function test(name, run) { tests.push({ name, run }); }
  function near(actual, expected, epsilon = 1e-6, label = "") {
    if (!(Math.abs(actual - expected) <= epsilon)) {
      throw new Error(`${label ? label + ": " : ""}expected ${expected}, received ${actual}`);
    }
  }
  function assert(condition, message) { if (!condition) throw new Error(message || "assertion failed"); }
  function requireApi(api, name) { if (!api) throw new Error(`${name} is not implemented`); return api; }
  const DEG = Math.PI / 180;

  // ── config.js ──────────────────────────────────────────────────────────────
  test("Config carries the deployed YAML values under YAML keys", () => {
    const { Config } = requireApi(configApi, "config.js");
    near(Config.beam_pointcloud.heading_min_line_extent_m, 2.0);
    assert(Config.beam_pointcloud.heading_min_inliers === 500, "heading_min_inliers");
    near(Config.beam_pointcloud.consensus_heading_outlier_threshold_deg, 3.0);
    near(Config.beam_pointcloud.aisle_tracker_dual_gain, 0.2);
    near(Config.beam_pointcloud.plane_coefficients_ema_alpha, 0.08);
    assert(Config.beam_pointcloud.enable_accumulation === false, "accumulation off by default");
    near(Config.x_offset_correction.pillar_match_range, 1.0);
    near(Config.vision_correction.propagation_rate_hz, 50.0);
  });

  test("cloneConfig returns an independent deep copy", () => {
    const { Config, cloneConfig } = requireApi(configApi, "config.js");
    const copy = cloneConfig(Config);
    copy.beam_pointcloud.heading_min_inliers = 1;
    assert(Config.beam_pointcloud.heading_min_inliers === 500, "original untouched");
  });

  // ── geometry.js ───────────────────────────────────────────────────────────
  test("normalizeAngle wraps into [-pi, pi]", () => {
    const G = requireApi(geometryApi, "geometry.js");
    near(G.normalizeAngle(3 * Math.PI), Math.PI, 1e-9);
    near(G.normalizeAngle(-3 * Math.PI), -Math.PI, 1e-9);
    near(G.normalizeAngle(0.3), 0.3, 1e-12);
  });
  test("blendAngleCircular is continuous across the +/-pi boundary", () => {
    const G = requireApi(geometryApi, "geometry.js");
    const blended = G.blendAngleCircular(179 * DEG, -179 * DEG, 0.5);
    near(Math.abs(blended), Math.PI, 1e-9);
    near(G.blendAngleCircular(10 * DEG, 20 * DEG, 0.5), 15 * DEG, 1e-9);
  });
  test("resolveHeadingToReference: no reference returns input", () => {
    const G = requireApi(geometryApi, "geometry.js");
    near(G.resolveHeadingToReference(0.3, null), 0.3, 1e-9);
  });
  test("resolveHeadingToReference: same direction unchanged", () => {
    const G = requireApi(geometryApi, "geometry.js");
    near(G.resolveHeadingToReference(12 * DEG, 10 * DEG), 12 * DEG, 1e-6);
  });
  test("resolveHeadingToReference: flipped heading corrected", () => {
    const G = requireApi(geometryApi, "geometry.js");
    const ref = 10 * DEG, h = 190 * DEG;
    const result = G.resolveHeadingToReference(h, ref);
    assert(Math.abs(result - ref) < Math.abs(h - ref), "closer to reference than input");
  });
  test("computeHeadingFromLineCoefficients points along +x half-plane", () => {
    const G = requireApi(geometryApi, "geometry.js");
    const h = 33.5 * DEG;
    const line = { a: -Math.sin(h), b: Math.cos(h), c: 0.4 };
    near(G.computeHeadingFromLineCoefficients(line), h, 1e-9);
    const flipped = { a: Math.sin(h), b: -Math.cos(h), c: -0.4 };
    near(G.computeHeadingFromLineCoefficients(flipped), h, 1e-9);
  });
  test("alignLineToHeading flips the normal toward (-sin, cos) and renormalizes", () => {
    const G = requireApi(geometryApi, "geometry.js");
    const h = 33.5 * DEG;
    const aligned = G.alignLineToHeading({ a: 2 * Math.sin(h), b: -2 * Math.cos(h), c: -0.8 }, h);
    near(aligned.a, -Math.sin(h), 1e-9); near(aligned.b, Math.cos(h), 1e-9); near(aligned.c, 0.4, 1e-9);
  });
  test("makeRng is deterministic and randNormal has the requested mean", () => {
    const G = requireApi(geometryApi, "geometry.js");
    const a = G.makeRng(7), b = G.makeRng(7);
    near(a(), b(), 0);
    const rng = G.makeRng(3); let sum = 0;
    for (let i = 0; i < 4000; i += 1) sum += G.randNormal(rng, 1.5, 0.1);
    near(sum / 4000, 1.5, 0.01);
  });

  // ── line_fitter.js ────────────────────────────────────────────────────────
  function linePoints(G, heading, offset, from, to, count, sigma, rng) {
    const d = G.headingVector(heading), n = G.normalVector(heading);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const t = from + (to - from) * (i / Math.max(1, count - 1));
      const noise = sigma > 0 ? G.randNormal(rng, 0, sigma) : 0;
      out.push({ x: d.x * t + n.x * (offset + noise), y: d.y * t + n.y * (offset + noise) });
    }
    return out;
  }
  function yamlFitter(L, C, overrides = {}) {
    return new L.RecursiveLinRegFitter(Object.assign(L.fitterConfigFromYaml(C.Config.beam_pointcloud), overrides));
  }
  test("fitLine2D returns a unit normal line through collinear points", () => {
    const L = requireApi(lineFitterApi, "line_fitter.js");
    const pts = [{ x: 0, y: 1 }, { x: 2, y: 2 }, { x: 4, y: 3 }, { x: 6, y: 4 }];
    const line = L.fitLine2D(pts, 3);
    assert(line.isValid, "valid");
    near(Math.hypot(line.A, line.B), 1, 1e-9);
    for (const p of pts) near(line.A * p.x + line.B * p.y + line.C, 0, 1e-9);
  });
  test("fitPlane accepts a clean rack face and reports inlier ratio near 1", () => {
    const L = requireApi(lineFitterApi, "line_fitter.js"), G = requireApi(geometryApi, "geometry.js"), C = requireApi(configApi, "config.js");
    const pts = linePoints(G, 33.5 * DEG, 1.6, -1.6, 1.6, 600, 0.01, G.makeRng(1));
    const model = yamlFitter(L, C).fitPlane(pts);
    assert(model.valid, model.reason);
    assert(model.inlierRatio > 0.95, "ratio " + model.inlierRatio);
    near(G.computeHeadingFromLineCoefficients(model.coefficients), 33.5 * DEG, 0.01);
    near(L.lineExtent(pts, model.inlierIndices, model.coefficients), 3.2, 0.05);
  });
  test("fitPlane rejects too few points", () => {
    const L = requireApi(lineFitterApi, "line_fitter.js"), C = requireApi(configApi, "config.js");
    const model = yamlFitter(L, C).fitPlane([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
    assert(!model.valid && model.reason === "too few points", model.reason);
  });
  test("fitPlane rejects a gap wider than max_allowed_gap", () => {
    const L = requireApi(lineFitterApi, "line_fitter.js"), G = requireApi(geometryApi, "geometry.js"), C = requireApi(configApi, "config.js");
    const a = linePoints(G, 0, 0, -3, -2, 60, 0, null), b = linePoints(G, 0, 0, 2, 3, 60, 0, null);
    const model = yamlFitter(L, C).fitPlane(a.concat(b));
    assert(!model.valid && model.reason === "gap", model.reason);
  });
  test("fitPlane rejects a span shorter than min_line_length", () => {
    const L = requireApi(lineFitterApi, "line_fitter.js"), G = requireApi(geometryApi, "geometry.js"), C = requireApi(configApi, "config.js");
    const model = yamlFitter(L, C).fitPlane(linePoints(G, 0, 0, 0, 0.3, 40, 0, null));
    assert(!model.valid && model.reason === "line length", model.reason);
  });
  test("fitPlane returns no valid line when the first refinement collapses below min points", () => {
    // 40 collinear points hidden in 200 uniform junk: the first LSQ line sits
    // ~0.1 m off the true line, so the 0.05 m band catches only a few junk
    // points, the refinement breaks before assigning a line, and the C++
    // returns invalid with inlier_ratio still at its default 0.
    const L = requireApi(lineFitterApi, "line_fitter.js"), G = requireApi(geometryApi, "geometry.js"), C = requireApi(configApi, "config.js");
    const rng = G.makeRng(9);
    const good = linePoints(G, 0, 0, -2, 2, 40, 0.005, rng);
    const junk = [];
    for (let i = 0; i < 200; i += 1) junk.push({ x: G.randRange(rng, -2, 2), y: G.randRange(rng, -3, 3) });
    const model = yamlFitter(L, C).fitPlane(good.concat(junk));
    assert(!model.valid && model.reason === "no valid line", model.reason);
    near(model.inlierRatio, 0, 0);
  });
  test("fitPlane rejects a low inlier ratio and reports the achieved ratio", () => {
    // 40 collinear points plus 100 junk points 0.06-0.5 m to one side: the
    // refinement converges on a junk sub-line with well under 25% inliers.
    const L = requireApi(lineFitterApi, "line_fitter.js"), G = requireApi(geometryApi, "geometry.js"), C = requireApi(configApi, "config.js");
    const rng = G.makeRng(9);
    const good = linePoints(G, 0, 0, -2, 2, 40, 0.005, rng);
    const junk = [];
    for (let i = 0; i < 100; i += 1) junk.push({ x: G.randRange(rng, -2, 2), y: G.randRange(rng, 0.06, 0.5) });
    const model = yamlFitter(L, C).fitPlane(good.concat(junk));
    assert(!model.valid && model.reason === "inlier ratio", model.reason);
    assert(model.inlierRatio > 0 && model.inlierRatio < 0.25, "ratio " + model.inlierRatio);
  });
  test("rotationSearchFilter keeps the outer face band and drops interior points", () => {
    const L = requireApi(lineFitterApi, "line_fitter.js"), G = requireApi(geometryApi, "geometry.js");
    const h = 0;
    const face = linePoints(G, h, -1.6, -1.5, 1.5, 100, 0, null);
    const interior = linePoints(G, h, -1.9, -1.5, 1.5, 100, 0, null);
    const result = L.rotationSearchFilter(face.concat(interior), h, 3.0, 10, 0.5, 0.1, false);
    assert(result.points.length === 100, "kept " + result.points.length);
    near(result.bestAngle, h, 0.5 * DEG + 1e-9);
  });
  test("applyTwoStageRotationFilter with YAML thresholds keeps a 0.25 m interior band", () => {
    const L = requireApi(lineFitterApi, "line_fitter.js"), G = requireApi(geometryApi, "geometry.js"), C = requireApi(configApi, "config.js");
    const face = linePoints(G, 0, 1.6, -1.5, 1.5, 100, 0, null), interior = linePoints(G, 0, 1.85, -1.5, 1.5, 50, 0, null);
    const result = L.applyTwoStageRotationFilter(face.concat(interior), 0, true, L.rotationFilterConfigFromYaml(C.Config.beam_pointcloud));
    assert(result.points.length === 150, "yaml fine threshold 0.5 keeps everything within 0.5 m: " + result.points.length);
  });

  // ── aisle_state.js ────────────────────────────────────────────────────────
  function makeCl(A, headingRad, c, halfW, dual, conf = 1.0) {
    const m = A.makeCenterlineMeasurement();
    m.valid = true; m.headingRad = headingRad; m.c = c; m.halfWidthM = halfW; m.dualSide = dual; m.confidence = conf;
    return m;
  }
  test("AisleState default constructed is uninitialized", () => {
    const A = requireApi(aisleStateApi, "aisle_state.js");
    assert(A.makeAisleState().initialized === false, "initialized");
  });
  test("AisleState first update initializes directly", () => {
    const A = requireApi(aisleStateApi, "aisle_state.js");
    const s = A.makeAisleState(); const h = 15 * DEG;
    A.updateAisleState(s, makeCl(A, h, 0.5, 1.6, true), 0.4, 0.1);
    assert(s.initialized, "initialized"); near(s.headingRad, h, 1e-9); near(s.centerlineC, 0.5, 1e-9);
  });
  test("AisleState second update blends with dual gain (circular blend)", () => {
    // The C++ gtest test_aisle_state.cpp expects the LINEAR blend 0.6*h1+0.4*h2
    // at 1e-9, but aisle_types.hpp blends circularly (blend_angle_circular),
    // which differs by ~4e-5 rad here. The port mirrors the header, so this
    // test asserts the circular value exactly and the linear one loosely.
    const A = requireApi(aisleStateApi, "aisle_state.js"), G = requireApi(geometryApi, "geometry.js");
    const s = A.makeAisleState(); const h1 = 15 * DEG, h2 = 25 * DEG;
    A.updateAisleState(s, makeCl(A, h1, 0, 1.6, true), 0.4, 0.1);
    A.updateAisleState(s, makeCl(A, h2, 0, 1.6, true), 0.4, 0.1);
    near(s.headingRad, G.blendAngleCircular(h1, h2, 0.4), 1e-12);
    near(s.headingRad, 0.6 * h1 + 0.4 * h2, 1e-4);
  });
  test("AisleState single side uses lower gain (circular blend)", () => {
    const A = requireApi(aisleStateApi, "aisle_state.js"), G = requireApi(geometryApi, "geometry.js");
    const s = A.makeAisleState(); const h1 = 15 * DEG, h2 = 25 * DEG;
    A.updateAisleState(s, makeCl(A, h1, 0, 1.6, false), 0.4, 0.1);
    A.updateAisleState(s, makeCl(A, h2, 0, 1.6, false), 0.4, 0.1);
    near(s.headingRad, G.blendAngleCircular(h1, h2, 0.1), 1e-12);
    near(s.headingRad, 0.9 * h1 + 0.1 * h2, 1e-4);
  });
  test("AisleState single side does not update half width", () => {
    const A = requireApi(aisleStateApi, "aisle_state.js");
    const s = A.makeAisleState();
    A.updateAisleState(s, makeCl(A, 0, 0, 1.6, true), 0.4, 0.1);
    A.updateAisleState(s, makeCl(A, 0, 0, 2.0, false), 0.4, 0.1);
    near(s.halfWidthM, 1.6, 1e-6);
  });
  test("AisleState invalid measurement does not update", () => {
    const A = requireApi(aisleStateApi, "aisle_state.js");
    const s = A.makeAisleState();
    A.updateAisleState(s, makeCl(A, 15 * DEG, 0.5, 1.6, true), 0.4, 0.1);
    const before = s.headingRad;
    A.updateAisleState(s, A.makeCenterlineMeasurement(), 0.4, 0.1);
    near(s.headingRad, before, 1e-9);
  });
  test("AisleState reset clears initialized flag", () => {
    const A = requireApi(aisleStateApi, "aisle_state.js");
    const s = A.makeAisleState();
    A.updateAisleState(s, makeCl(A, 0.1, 0, 1.6, true), 0.4, 0.1);
    A.resetAisleState(s);
    assert(!s.initialized && !s.lateralValid, "cleared");
  });
  test("AisleState after reset next update reinitializes directly", () => {
    const A = requireApi(aisleStateApi, "aisle_state.js");
    const s = A.makeAisleState();
    A.updateAisleState(s, makeCl(A, 15 * DEG, 0, 1.6, true), 0.4, 0.1);
    A.resetAisleState(s);
    A.updateAisleState(s, makeCl(A, 30 * DEG, 0, 1.6, true), 0.4, 0.1);
    near(s.headingRad, 30 * DEG, 1e-9);
  });
  test("AisleState heading-only reset preserves and blends centerline_c", () => {
    const A = requireApi(aisleStateApi, "aisle_state.js");
    const s = A.makeAisleState();
    A.updateAisleState(s, makeCl(A, 15 * DEG, 0.5, 1.6, true), 0.4, 0.1);
    A.resetAisleHeading(s);
    assert(!s.initialized && s.lateralValid, "heading cleared, lateral kept");
    A.updateAisleState(s, makeCl(A, 30 * DEG, 1.0, 1.6, true), 0.4, 0.1);
    near(s.headingRad, 30 * DEG, 1e-9);
    near(s.centerlineC, 0.6 * 0.5 + 0.4 * 1.0, 1e-9);
  });
  test("CenterlineMeasurement default is invalid and dual confidence exceeds single", () => {
    const A = requireApi(aisleStateApi, "aisle_state.js");
    const c = A.makeCenterlineMeasurement();
    assert(!c.valid && !c.dualSide, "defaults");
    assert(A.kDualConfidence > A.kSingleConfidence, "confidence order");
  });
  test("BeamMeasurement default is invalid", () => {
    const A = requireApi(aisleStateApi, "aisle_state.js");
    const m = A.makeBeamMeasurement();
    assert(!m.valid && m.side === A.RackSide.UNKNOWN && m.trackId === -1 && m.inlierCount === 0, "defaults");
  });

  // ── lateral_drift_filter.js ───────────────────────────────────────────────
  test("LateralDriftFilter low-passes normal measurements", () => {
    const F = requireApi(lateralApi, "lateral_drift_filter.js");
    const f = new F.LateralDriftFilter({ ema_alpha: 0.5, jump_threshold_m: 0.25, max_step_m: 0.0 });
    const first = f.update(1.0);
    assert(first.initialized, "initialized"); near(first.filteredM, 1.0, 1e-9);
    const second = f.update(1.1);
    assert(!second.held, "not held"); near(second.filteredM, 1.05, 1e-9);
  });
  test("LateralDriftFilter holds an isolated jump and keeps previous output", () => {
    const F = requireApi(lateralApi, "lateral_drift_filter.js");
    const f = new F.LateralDriftFilter({ ema_alpha: 0.5, jump_threshold_m: 0.25, jump_confirm_frames: 3, jump_cluster_threshold_m: 0.08, max_step_m: 0.04 });
    f.update(0.0);
    const jump = f.update(0.5);
    assert(jump.jumpDetected && jump.held && !jump.jumpConfirmed, "held");
    near(jump.filteredM, 0.0, 1e-9);
  });
  test("LateralDriftFilter confirmed jump moves by step limit instead of snapping", () => {
    const F = requireApi(lateralApi, "lateral_drift_filter.js");
    const f = new F.LateralDriftFilter({ ema_alpha: 1.0, jump_threshold_m: 0.25, jump_confirm_frames: 3, jump_cluster_threshold_m: 0.08, max_step_m: 0.04 });
    f.update(0.0); f.update(0.50); f.update(0.53);
    const confirmed = f.update(0.52);
    assert(confirmed.jumpConfirmed && !confirmed.held, "confirmed");
    near(confirmed.filteredM, 0.04, 1e-9);
  });
  test("LateralDriftFilter unstable jump cluster keeps holding", () => {
    const F = requireApi(lateralApi, "lateral_drift_filter.js");
    const f = new F.LateralDriftFilter({ ema_alpha: 1.0, jump_threshold_m: 0.25, jump_confirm_frames: 2, jump_cluster_threshold_m: 0.05, max_step_m: 0.04 });
    f.update(0.0); f.update(0.50);
    const unstable = f.update(0.70);
    assert(unstable.jumpDetected && unstable.held && !unstable.jumpConfirmed, "still held");
    near(unstable.filteredM, 0.0, 1e-9);
  });
  test("droneYToCenterlineFromSignedError negates the signed error", () => {
    const F = requireApi(lateralApi, "lateral_drift_filter.js");
    near(F.droneYToCenterlineFromSignedError(-0.3), 0.3, 1e-9);
    near(F.droneYToCenterlineFromSignedError(0.2), -0.2, 1e-9);
    near(F.droneYToCenterlineFromSignedError(0.0), 0.0, 1e-9);
  });
  test("lateralFilterConfigFromYaml maps the beam_pointcloud keys", () => {
    const F = requireApi(lateralApi, "lateral_drift_filter.js"), C = requireApi(configApi, "config.js");
    const cfg = F.lateralFilterConfigFromYaml(C.Config.beam_pointcloud);
    near(cfg.ema_alpha, 0.05); near(cfg.jump_threshold_m, 0.25); assert(cfg.jump_confirm_frames === 3, "confirm"); near(cfg.jump_cluster_threshold_m, 0.08); near(cfg.max_step_m, 0.04);
  });

  // ── @@NEXT_TESTS@@ ─────────────────────────────────────────────────────────

  function runAllTests() {
    let passed = 0;
    const failures = [];
    for (const item of tests) {
      try { item.run(); passed += 1; } catch (error) { failures.push({ name: item.name, error }); }
    }
    if (runningInNode) {
      failures.forEach(({ name, error }) => console.error(`FAIL ${name}: ${error.message}`));
      console.log(`${passed}/${tests.length} tests passed`);
      if (failures.length) process.exitCode = 1;
    } else if (typeof root.renderTestResults === "function") {
      root.renderTestResults({ passed, total: tests.length, failures });
    }
  }

  if (runningInNode) runAllTests();
  else root.addEventListener("DOMContentLoaded", runAllTests);
})(typeof window !== "undefined" ? window : globalThis);
