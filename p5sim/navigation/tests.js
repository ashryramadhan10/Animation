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
