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
