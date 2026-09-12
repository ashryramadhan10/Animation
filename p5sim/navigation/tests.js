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

  // ── heading.js ────────────────────────────────────────────────────────────
  test("Consensus excludes a heading outlier from accepted tracks", () => {
    const H = requireApi(headingApi, "heading.js");
    const r = H.selectConsensusHeadingSamples([
      { trackId: 294, headingRad: 65 * DEG, weight: 65 },
      { trackId: 538, headingRad: 32 * DEG, weight: 30000 },
    ], 10 * DEG);
    assert(r.valid, "valid"); near(r.headingRad, 32 * DEG, 1e-6);
    assert(r.acceptedTrackIds.length === 1 && r.acceptedTrackIds[0] === 538, "accepted 538");
    assert(r.rejectedSamples.length === 1 && r.rejectedSamples[0].trackId === 294, "rejected 294");
  });
  test("Consensus keeps all tracks when headings agree", () => {
    const H = requireApi(headingApi, "heading.js");
    const r = H.selectConsensusHeadingSamples([
      { trackId: 1, headingRad: 30 * DEG, weight: 100 }, { trackId: 2, headingRad: 34 * DEG, weight: 200 },
    ], 10 * DEG);
    assert(r.valid && r.acceptedTrackIds.length === 2 && r.rejectedSamples.length === 0, "all kept");
  });
  test("Consensus with two equal beams 8 deg apart under a 3 deg gate rejects both", () => {
    const H = requireApi(headingApi, "heading.js");
    const r = H.selectConsensusHeadingSamples([
      { trackId: 1, headingRad: 0, weight: 600 }, { trackId: 2, headingRad: 8 * DEG, weight: 600 },
    ], 3 * DEG);
    assert(!r.valid && r.rejectedSamples.length === 2, "both rejected, no consensus");
  });
  test("Single beam correction gate rejects weak and accepts strong", () => {
    const H = requireApi(headingApi, "heading.js");
    assert(!H.isSingleBeamCorrectionReliable(458, 0.342, 800, 0.55), "weak 1");
    assert(!H.isSingleBeamCorrectionReliable(832, 0.353, 800, 0.55), "weak 2");
    assert(H.isSingleBeamCorrectionReliable(29002, 0.945, 800, 0.55), "strong");
  });
  test("isBeamReliableForHeading names every failed gate", () => {
    const H = requireApi(headingApi, "heading.js"), C = requireApi(configApi, "config.js");
    const bad = H.isBeamReliableForHeading({ lineExtentM: 1.2, inlierCount: 320, inlierRatio: 0.2 }, C.Config.beam_pointcloud);
    assert(!bad.valid, "invalid");
    assert(bad.reason === "extent 1.20m < 2.00m, inliers 320 < 500, ratio 20.0% < 35.0%", bad.reason);
    const good = H.isBeamReliableForHeading({ lineExtentM: 3.1, inlierCount: 640, inlierRatio: 0.76 }, C.Config.beam_pointcloud);
    assert(good.valid && good.reason === "", "valid with empty reason");
  });
  test("rateLimitHeading clamps the step to max rate times dt", () => {
    const H = requireApi(headingApi, "heading.js");
    const state = { lastPublishedHeading: 0, lastHeadingRateLimitStamp: 10.0 };
    const r = H.rateLimitHeading(state, 10 * DEG, 11.0, 0.75 * DEG);
    near(r.heading, 0.75 * DEG, 1e-9); assert(r.limited, "limited"); near(state.lastHeadingRateLimitStamp, 11.0, 0);
  });
  test("rateLimitHeading falls back to 1/30 s when dt is out of range", () => {
    const H = requireApi(headingApi, "heading.js");
    const state = { lastPublishedHeading: 0, lastHeadingRateLimitStamp: 10.0 };
    const r = H.rateLimitHeading(state, 10 * DEG, 13.0, 0.75 * DEG);
    near(r.heading, 0.75 * DEG / 30, 1e-9);
  });
  test("rateLimitHeading passes through without a last heading", () => {
    const H = requireApi(headingApi, "heading.js");
    const state = { lastPublishedHeading: null, lastHeadingRateLimitStamp: null };
    const r = H.rateLimitHeading(state, 10 * DEG, 5.0, 0.75 * DEG);
    near(r.heading, 10 * DEG, 1e-12); assert(!r.limited, "not limited"); near(state.lastHeadingRateLimitStamp, 5.0, 0);
  });
  test("shouldResetForHeadingJump honours threshold and cooldown", () => {
    const H = requireApi(headingApi, "heading.js");
    assert(!H.shouldResetForHeadingJump(null, 1.0, 5 * DEG, true), "no last heading");
    assert(!H.shouldResetForHeadingJump(0, 4 * DEG, 5 * DEG, true), "below threshold");
    assert(H.shouldResetForHeadingJump(0, 6 * DEG, 5 * DEG, true), "above threshold");
    assert(!H.shouldResetForHeadingJump(0, 6 * DEG, 5 * DEG, false), "cooldown blocks");
    assert(H.resetCooldownPassed(null, 5, 0.7) && H.resetCooldownPassed(4.0, 5.0, 0.7) && !H.resetCooldownPassed(4.5, 5.0, 0.7), "cooldown");
  });

  // ── x_offset.js ───────────────────────────────────────────────────────────
  function uprightsAlong(headingRad, spacing, count, lateral) {
    const d = { x: Math.cos(headingRad), y: Math.sin(headingRad) }, n = { x: -Math.sin(headingRad), y: Math.cos(headingRad) };
    const out = [];
    for (let k = 0; k < count; k += 1) {
      const s = k * spacing, x = d.x * s + n.x * lateral, y = d.y * s + n.y * lateral;
      out.push({ id: 100 + k, start: { x, y }, end: { x, y } });
    }
    return out;
  }
  test("projectAlongAisle and projectAcrossAisle decompose along the heading", () => {
    const X = requireApi(xOffsetApi, "x_offset.js");
    const h = 30 * DEG, p = { x: 2 * Math.cos(h) - 1 * Math.sin(h), y: 2 * Math.sin(h) + 1 * Math.cos(h) };
    near(X.projectAlongAisle(p.x, p.y, h), 2, 1e-9); near(X.projectAcrossAisle(p.x, p.y, h), 1, 1e-9);
  });
  test("buildProjectedMissionUprights sorts by along-aisle position and numbers them", () => {
    const X = requireApi(xOffsetApi, "x_offset.js");
    const ups = uprightsAlong(0, 2.8, 3, 1.6).reverse();
    const proj = X.buildProjectedMissionUprights(ups, 0);
    assert(proj[0].id === 100 && proj[2].id === 102, "sorted by s");
    assert(proj[0].order === 0 && proj[2].order === 2, "order");
    near(proj[1].s, 2.8, 1e-9); near(proj[1].l, 1.6, 1e-9);
  });
  test("associateVerticalObservation picks the nearest gate and rejects beyond range", () => {
    const X = requireApi(xOffsetApi, "x_offset.js"), C = requireApi(configApi, "config.js");
    const proj = X.buildProjectedMissionUprights(uprightsAlong(0, 2.8, 4, 1.6), 0);
    const obs = X.buildVerticalObservation(2.8 - 0.6, 1.6, 0);
    const m = X.associateVerticalObservation(obs, proj, 0, 0.0, C.Config.x_offset_correction);
    assert(m && m.upright.id === 101, "nearest is id 101");
    near(m.residualM, 0.6, 1e-9);
    const far = X.associateVerticalObservation(X.buildVerticalObservation(1.4, 1.6, 0), proj, 0, 0.0, C.Config.x_offset_correction);
    assert(far === null, "1.4 m from both neighbours is outside the 1.0 m gate");
  });
  test("updateXOffsetFromVerticalObservations converges to the along-aisle offset", () => {
    const X = requireApi(xOffsetApi, "x_offset.js"), C = requireApi(configApi, "config.js");
    const ups = uprightsAlong(0, 2.8, 5, 1.6);
    const state = { xOffsetRaw: 0, xOffsetFiltered: 0, xOffsetHasMeasurement: false };
    const obs1 = [X.buildVerticalObservation(2.8 - 0.6, 1.6, 0), X.buildVerticalObservation(5.6 - 0.6, 1.6, 0)];
    const r1 = X.updateXOffsetFromVerticalObservations(state, obs1, 0, ups, C.Config.x_offset_correction);
    assert(r1.updated && r1.matches.length === 2 && r1.keptMatches.length === 2, "two matches kept");
    near(state.xOffsetRaw, 0.6, 1e-9); near(state.xOffsetFiltered, 0.6, 1e-9); assert(state.xOffsetHasMeasurement, "has");
    const r2 = X.updateXOffsetFromVerticalObservations(state, obs1, 0, ups, C.Config.x_offset_correction);
    near(r2.meanResidual, 0.0, 1e-9); near(state.xOffsetRaw, 0.6, 1e-9);
  });
  test("updateXOffsetFromVerticalObservations rejects a residual outlier by median", () => {
    const X = requireApi(xOffsetApi, "x_offset.js"), C = requireApi(configApi, "config.js");
    const ups = uprightsAlong(0, 2.8, 6, 1.6);
    const state = { xOffsetRaw: 0, xOffsetFiltered: 0, xOffsetHasMeasurement: false };
    const obs = [
      X.buildVerticalObservation(2.8 - 0.30, 1.6, 0),
      X.buildVerticalObservation(5.6 - 0.32, 1.6, 0),
      X.buildVerticalObservation(8.4 - 0.95, 1.6, 0),
    ];
    const r = X.updateXOffsetFromVerticalObservations(state, obs, 0, ups, C.Config.x_offset_correction);
    assert(r.matches.length === 3 && r.keptMatches.length === 2, `kept ${r.keptMatches.length}`);
    near(state.xOffsetRaw, 0.31, 1e-9);
  });
  test("updateXOffsetFromVerticalObservations keeps one nearest association per upright", () => {
    const X = requireApi(xOffsetApi, "x_offset.js"), C = requireApi(configApi, "config.js");
    const ups = uprightsAlong(0, 2.8, 3, 1.6);
    const state = { xOffsetRaw: 0, xOffsetFiltered: 0, xOffsetHasMeasurement: false };
    const obs = [X.buildVerticalObservation(2.8 - 0.5, 1.6, 0), X.buildVerticalObservation(2.8 - 0.1, 1.6, 0)];
    const r = X.updateXOffsetFromVerticalObservations(state, obs, 0, ups, C.Config.x_offset_correction);
    assert(r.matches.length === 1, "one match for id 101");
    near(r.matches[0].residualM, 0.1, 1e-9);
  });
  test("median averages the middle pair for even counts", () => {
    const X = requireApi(xOffsetApi, "x_offset.js");
    near(X.median([3, 1, 2]), 2, 0); near(X.median([4, 1, 3, 2]), 2.5, 0); near(X.median([]), 0, 0);
  });

  // ── correction_transform.js ───────────────────────────────────────────────
  function angleDiff(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }
  test("VisionCorrectionTransform rotates aisle motion to the map x axis", () => {
    const T = requireApi(correctionApi, "correction_transform.js");
    const aisle = 32 * DEG, travel = 10;
    const p0 = { x: 0, y: 0, z: 2, yaw: 0 }, p1 = { x: Math.cos(aisle) * travel, y: Math.sin(aisle) * travel, z: 2, yaw: 0 };
    const t0 = T.buildVisionCorrectionTransform(p0, p0.x, p0.y, p0.z, aisle);
    const t1 = T.buildVisionCorrectionTransform(p1, p1.x, p1.y, p1.z, aisle);
    near(t1.correctedPose.x - t0.correctedPose.x, travel, 1e-6);
    near(t1.correctedPose.y - t0.correctedPose.y, 0, 1e-6);
    near(t1.mapToVisionOdom.yaw, -aisle, 1e-9);
  });
  test("VisionCorrectionTransform map to vision odom is the correction, not the FCU pose", () => {
    const T = requireApi(correctionApi, "correction_transform.js");
    const rawYaw = 1 * DEG, aisle = 32.6 * DEG, cx = 24.549, cy = 15.876;
    const raw = { x: 24.565, y: 15.922, z: 2, yaw: rawYaw };
    const tf = T.buildVisionCorrectionTransform(raw, cx, cy, 2, aisle);
    const cyaw = -aisle, dx = cx - raw.x, dy = cy - raw.y;
    const ecx = Math.cos(cyaw) * dx - Math.sin(cyaw) * dy, ecy = Math.sin(cyaw) * dx + Math.cos(cyaw) * dy;
    const epx = Math.cos(cyaw) * raw.x - Math.sin(cyaw) * raw.y + ecx, epy = Math.sin(cyaw) * raw.x + Math.cos(cyaw) * raw.y + ecy;
    assert(Math.hypot(tf.mapToVisionOdom.x, tf.mapToVisionOdom.y) < 1.0, "small correction");
    near(tf.mapToVisionOdom.x, ecx, 1e-9); near(tf.mapToVisionOdom.y, ecy, 1e-9);
    near(tf.visionOdomToBase.x, raw.x, 1e-9); near(tf.visionOdomToBase.y, raw.y, 1e-9);
    near(tf.correctedPose.x, epx, 1e-9); near(tf.correctedPose.y, epy, 1e-9);
    near(tf.visionOdomToBase.yaw, rawYaw, 1e-9); near(tf.mapToVisionOdom.yaw, -aisle, 1e-9);
    near(tf.correctedPose.yaw, rawYaw - aisle, 1e-9);
  });
  test("VisionCorrectionTransform corrected pose uses composed frame position and corrected FCU yaw", () => {
    const T = requireApi(correctionApi, "correction_transform.js");
    const rawYaw = -148 * DEG, aisle = 78.5 * DEG;
    const tf = T.buildVisionCorrectionTransform({ x: 3.809, y: 3.894, z: 1.428, yaw: rawYaw }, 4.377, 3.766, 1.428, aisle);
    near(angleDiff(tf.correctedPose.yaw, rawYaw - aisle), 0, 1e-9);
    near(tf.visionOdomToBase.yaw, rawYaw, 1e-9);
    near(angleDiff(tf.composedYaw, rawYaw - aisle), 0, 1e-9);
  });
  test("radiansToDegrees converts a right angle", () => {
    const T = requireApi(correctionApi, "correction_transform.js");
    near(T.radiansToDegrees(Math.PI / 2), 90, 1e-9);
  });
  test("composeStoredCorrectionPose reproduces the transform's corrected pose", () => {
    const T = requireApi(correctionApi, "correction_transform.js");
    const raw = { x: 24.565, y: 15.922, z: 2, yaw: 1 * DEG };
    const tf = T.buildVisionCorrectionTransform(raw, 24.549, 15.876, 2, 32.6 * DEG);
    const composed = T.composeStoredCorrectionPose(tf.mapToVisionOdom, raw);
    near(composed.x, tf.correctedPose.x, 1e-9); near(composed.y, tf.correctedPose.y, 1e-9);
    near(angleDiff(composed.yaw, tf.correctedPose.yaw), 0, 1e-9);
  });

  // ── pose_corrector.js ─────────────────────────────────────────────────────
  function rackFrame(G, idx, stamp, headingRad, halfWidth, cOffset, sides, faceCount = 640, rng = null) {
    const r = rng || G.makeRng(1000 + idx);
    const tracks = [];
    for (const side of sides) {
      const sign = side === "left" ? 1 : -1;
      const pts = linePoints(G, headingRad, sign * halfWidth + cOffset, -1.6 + 0.16 * idx, 1.6 + 0.16 * idx, faceCount, 0.018, r);
      tracks.push({ trackId: side === "left" ? 1 : 2, side, points: pts });
    }
    const d = G.headingVector(headingRad), n = G.normalVector(headingRad);
    const along = 0.16 * idx, lateral = 0.05 + cOffset;
    return { frameIndex: idx, stamp, fcuPose: { x: d.x * along + n.x * lateral, y: d.y * along + n.y * lateral, z: 2, yaw: headingRad }, tracks, verticalDetections: [] };
  }
  test("processFrame on a dual rack frame yields a dual measurement and calibrates once", () => {
    const N = requireApi(nodeApi, "pose_corrector.js"), G = requireApi(geometryApi, "geometry.js"), C = requireApi(configApi, "config.js");
    const state = N.makeNodeState(C.Config);
    const h = 33.5 * DEG;
    const t1 = N.processFrame(state, rackFrame(G, 0, 0.0, h, 1.6, 0, ["left", "right"]));
    assert(t1.hold === null, "no hold: " + t1.hold);
    assert(t1.measurement && t1.measurement.dualSide, "dual");
    assert(t1.calibration.isCalibrated && !t1.calibration.fromSingleRack, "calibrated on first dual");
    near(t1.calibration.halfWidth, 1.6, 0.05);
    near(t1.aisleState.headingRad, h, 0.01);
    assert(t1.broadcast && !t1.broadcast.held, "broadcast");
    const calibC = t1.calibration.c;
    N.processFrame(state, rackFrame(G, 1, 0.1, h, 1.6, 0, ["left", "right"]));
    near(state.aisleCalib.c, calibC, 0, "calibration is one-shot");
  });
  test("processFrame with no tracks holds with the C++ reason and keeps lateral running", () => {
    const N = requireApi(nodeApi, "pose_corrector.js"), G = requireApi(geometryApi, "geometry.js"), C = requireApi(configApi, "config.js");
    const state = N.makeNodeState(C.Config);
    const h = 33.5 * DEG;
    N.processFrame(state, rackFrame(G, 0, 0.0, h, 1.6, 0, ["left", "right"]));
    const empty = rackFrame(G, 1, 0.1, h, 1.6, 0, []);
    const t = N.processFrame(state, empty);
    assert(t.hold === "no valid fit", t.hold);
    assert(t.broadcast && t.broadcast.held, "held broadcast still runs the lateral filter");
  });
  test("processFrame before any heading holds because no aisle state exists", () => {
    const N = requireApi(nodeApi, "pose_corrector.js"), G = requireApi(geometryApi, "geometry.js"), C = requireApi(configApi, "config.js");
    const state = N.makeNodeState(C.Config);
    const t = N.processFrame(state, rackFrame(G, 0, 0.0, 33.5 * DEG, 1.6, 0, []));
    assert(t.hold === "no valid fit" && t.broadcast === null, "nothing to hold yet");
  });
  test("processFrame single rack uses calibrated half width after a dual calibration", () => {
    const N = requireApi(nodeApi, "pose_corrector.js"), G = requireApi(geometryApi, "geometry.js"), C = requireApi(configApi, "config.js");
    const state = N.makeNodeState(C.Config);
    const h = 33.5 * DEG;
    N.processFrame(state, rackFrame(G, 0, 0.0, h, 1.55, 0, ["left", "right"]));
    const t = N.processFrame(state, rackFrame(G, 1, 0.1, h, 1.55, 0, ["left"]));
    assert(t.measurement && !t.measurement.dualSide, "single");
    near(t.measurement.halfWidthM, 1.55, 0.05);
  });
  test("processFrame short beams hold the heading but still update lateral", () => {
    const N = requireApi(nodeApi, "pose_corrector.js"), G = requireApi(geometryApi, "geometry.js"), C = requireApi(configApi, "config.js");
    const state = N.makeNodeState(C.Config);
    const h = 33.5 * DEG;
    N.processFrame(state, rackFrame(G, 0, 0.0, h, 1.6, 0, ["left", "right"]));
    const short = rackFrame(G, 1, 0.1, h, 1.6, 0, ["left", "right"]);
    for (const tr of short.tracks) tr.points = tr.points.filter(p => Math.abs(G.dot(p, G.headingVector(h)) - 0.16) < 0.6);
    const t = N.processFrame(state, short);
    assert(t.stages.every(s => s.beamResult && !s.beamResult.headingValid), "both heading-rejected");
    assert(t.stages[0].beamResult.headingRejectReason.startsWith("extent"), t.stages[0].beamResult.headingRejectReason);
    assert(!t.freshHeading && t.hold === null && t.broadcast && !t.broadcast.held, "held heading, live lateral");
  });
  test("propagationTick publishes identity until the first correction, then the stored one", () => {
    const N = requireApi(nodeApi, "pose_corrector.js"), G = requireApi(geometryApi, "geometry.js"), C = requireApi(configApi, "config.js");
    const state = N.makeNodeState(C.Config);
    const pose = { x: 1, y: 2, z: 2, yaw: 0.1 };
    const t0 = N.propagationTick(state, pose, 0.0);
    assert(t0.published && t0.isIdentity && t0.measurement === null, "identity, no measurement");
    near(t0.correctedPose.x, 1, 1e-12); near(t0.correctedPose.yaw, 0.1, 1e-12);
    N.processFrame(state, rackFrame(G, 0, 0.05, 33.5 * DEG, 1.6, 0, ["left", "right"]));
    const t1 = N.propagationTick(state, pose, 0.2);
    assert(t1.published && !t1.isIdentity && t1.measurement, "stored correction");
    near(t1.measurement.stamp, 0.05, 1e-12);
    assert(t1.measurement.hasX === false, "no x yet");
  });
  test("propagationTick refuses a stale pose", () => {
    const N = requireApi(nodeApi, "pose_corrector.js"), C = requireApi(configApi, "config.js");
    const state = N.makeNodeState(C.Config);
    const t = N.propagationTick(state, { x: 0, y: 0, z: 0, yaw: 0, stamp: 0.0 }, 1.0);
    assert(!t.published && t.reason === "pose stale", t.reason);
  });
  test("resetTrackingState with preserveLateral keeps lateral state and x offset", () => {
    const N = requireApi(nodeApi, "pose_corrector.js"), G = requireApi(geometryApi, "geometry.js"), C = requireApi(configApi, "config.js");
    const state = N.makeNodeState(C.Config);
    N.processFrame(state, rackFrame(G, 0, 0.0, 33.5 * DEG, 1.6, 0, ["left", "right"]));
    state.xOffset.xOffsetRaw = 0.4; state.xOffset.xOffsetHasMeasurement = true;
    N.resetTrackingState(state, "test", 1.0, true);
    assert(!state.aisleState.initialized && state.aisleState.lateralValid, "heading-only");
    assert(state.lateralDriftFilter.hasValue() && state.xOffset.xOffsetHasMeasurement, "lateral kept");
    N.resetTrackingState(state, "test", 2.0, false);
    assert(!state.aisleState.lateralValid && !state.lateralDriftFilter.hasValue() && !state.xOffset.xOffsetHasMeasurement, "full reset");
  });

  // ── synthetic_world.js ────────────────────────────────────────────────────
  test("buildWorld places odom behind map by the configured offsets", () => {
    const W = requireApi(worldApi, "synthetic_world.js"), G = requireApi(geometryApi, "geometry.js");
    const w = W.buildWorld();
    assert(w.frames.length === 150 && w.missionUprights.length > 0, "sizes");
    near(w.trueCenterlineMap.c, 0, 1e-12);
    near(w.trueCenterlineOdom.c, 0.2, 1e-9);
    const p = { x: 3, y: 4 }; const back = W.odomToMap(w, W.mapToOdom(w, p));
    near(back.x, 3, 1e-12); near(back.y, 4, 1e-12);
    const f = w.frames[0];
    near(G.lineSignedDistance(w.trueCenterlineOdom, f.fcuPose), w.truth[0].lateral, 1e-9);
  });
  test("buildWorld fault schedule matches the spec windows", () => {
    const W = requireApi(worldApi, "synthetic_world.js");
    const w = W.buildWorld();
    const expect = [[0, "none"], [30, "missing-right"], [45, "short-both"], [55, "skew-right"], [70, "glitch-lateral"], [72, "none"], [75, "displacement"], [90, "dropout"], [100, "id-switch"], [110, "none"], [149, "none"]];
    for (const [i, id] of expect) assert((W.faultAt(w, i) || { id: "none" }).id === id, `frame ${i} expected ${id}`);
    assert(w.frames[90] === null && w.frames[99] === null && w.frames[100] !== null, "dropout frames are null");
    assert(w.frames[30].tracks.length === 1 && w.frames[30].tracks[0].side === "left", "right missing");
    assert(w.frames[100].tracks.find(t => t.side === "left").trackId === 3, "id switch");
    assert(w.frames[0].tracks.find(t => t.side === "left").points.length === 1000, "800 face + 200 interior");
  });
  test("poseAtTime interpolates between frames and carries a stamp", () => {
    const W = requireApi(worldApi, "synthetic_world.js");
    const w = W.buildWorld();
    const p = W.poseAtTime(w, 0.05);
    near(p.x, 0.5 * (w.frames[0].fcuPose.x + w.frames[1].fcuPose.x), 1e-9);
    near(p.stamp, 0.05, 1e-12);
  });
  test("vertical detections sit near mission uprights shifted by the odom offset", () => {
    const W = requireApi(worldApi, "synthetic_world.js"), X = requireApi(xOffsetApi, "x_offset.js");
    const w = W.buildWorld();
    const f = w.frames[5];
    assert(f.verticalDetections.length >= 2, "some detections");
    const proj = X.buildProjectedMissionUprights(w.missionUprights, w.headingRad);
    let close = 0;
    for (const d of f.verticalDetections) {
      const s = X.projectAlongAisle(d.x, d.y, w.headingRad) + w.odomOffset.along;
      if (proj.some(u => Math.abs(u.s - s) < 0.2)) close += 1;
    }
    assert(close >= f.verticalDetections.length - 1, "all but a spurious one are within 0.2 m of an upright");
  });

  // ── pipeline smoke test ───────────────────────────────────────────────────
  test("runTimeline reproduces the spec's end-to-end behaviour on the synthetic world", () => {
    const N = requireApi(nodeApi, "pose_corrector.js"), W = requireApi(worldApi, "synthetic_world.js"), G = requireApi(geometryApi, "geometry.js"), C = requireApi(configApi, "config.js");
    const world = W.buildWorld();
    const { ticks } = N.runTimeline(world, C.Config);
    const traces = ticks.filter(k => k.trace).map(k => k.trace);
    const byFrame = new Map(traces.map(t => [t.frameIndex, t]));
    // The corrected pose lives in the aisle-aligned frame (odom rotated by -aisle yaw):
    // "on the centerline" means y == -c_odom; x is the along-aisle position.
    const yOnCenterline = -world.trueCenterlineOdom.c;
    for (let i = 21; i <= 54; i += 1) {
      const t = byFrame.get(i); if (!t || !t.broadcast) continue;
      near(t.broadcast.tf.correctedPose.y, yOnCenterline, 0.05, `frame ${i} lateral`);
    }
    // 55-74: while both beams fail the 3 deg gate the node still feeds both into
    // the dual centerline, so the skewed line leaks into c (faithful behaviour).
    for (let i = 55; i <= 74; i += 1) {
      const t = byFrame.get(i); if (!t || !t.broadcast) continue;
      near(t.broadcast.tf.correctedPose.y, yOnCenterline, 0.10, `frame ${i} lateral (skew leak)`);
    }
    near(byFrame.get(149).broadcast.tf.correctedPose.y, yOnCenterline, 0.05, "frame 149 lateral settled");
    for (let i = 60; i <= 149; i += 1) {
      const t = byFrame.get(i); if (!t || !t.broadcast) continue;
      near(t.broadcast.tf.correctedPose.x, world.truth[i].along, 0.1, `frame ${i} along`);
    }
    near(byFrame.get(60).xOffsetState.xOffsetFiltered, 0.6, 0.1, "x offset by frame 60");
    const m20 = byFrame.get(20).measurement;
    near(-m20.c / m20.b, -world.trueCenterlineOdom.c / world.trueCenterlineOdom.b, 0.05, "intercept at frame 20");
    for (let i = 45; i <= 54; i += 1) {
      const t = byFrame.get(i);
      assert(!t.freshHeading, `frame ${i} heading should be held`);
      assert(t.stages[0].beamResult && t.stages[0].beamResult.headingRejectReason.startsWith("extent"), `frame ${i} reason: ${t.stages[0].beamResult && t.stages[0].beamResult.headingRejectReason}`);
    }
    for (let i = 55; i <= 69; i += 1) {
      const t = byFrame.get(i);
      near(G.normalizeAngle(t.aisleState.headingRad - world.headingRad), 0, 1.5 * DEG, `frame ${i} heading`);
    }
    assert(byFrame.get(70).broadcast.lateral.held, "frame 70 held");
    assert(byFrame.get(77).broadcast.lateral.jumpConfirmed, "frame 77 confirmed");
    const frozen = byFrame.get(89).outputs.stamp;
    for (const k of ticks.filter(x => x.frameIndex >= 90 && x.frameIndex <= 99)) {
      assert(k.trace === null && k.tick.published && !k.tick.isIdentity, `dropout tick ${k.k} publishes the held correction`);
      near(k.tick.measurement.stamp, frozen, 1e-9, `dropout tick ${k.k} stamp`);
    }
    const t100 = byFrame.get(100);
    assert(t100.stages.find(s => s.trackId === 3).beamResult.smoothingRestarted, "id 3 restarts the coefficient EMA");
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
