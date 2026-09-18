# Navigation Sim Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `p5sim/navigation` so every stage of the current `warehouse_pose_corrector_vision_based` node after depth back-projection is modeled in JavaScript under the C++ names, verified by tests ported from the C++ gtests, and shown in sixteen p5 demo pages.

**Architecture:** Nine modules under `p5sim/navigation/scripts/` mirror the C++ headers one-to-one and attach to one global `PoseCorrectorSim` (and `module.exports` under Node). `pose_corrector.js` is the orchestrator mirroring `pose_corrector_node.cpp`; `synthetic_world.js` builds a deterministic world with a fault schedule; `demos.js` draws from the orchestrator's trace and never recomputes. Standalone pages copy the functions they need verbatim so each reads top to bottom.

**Tech Stack:** p5.js 1.9.4 from cdnjs, plain ES2020 JavaScript, IIFE modules with dual browser/Node export, Node 22 for headless tests. No bundler, no npm.

**Spec:** `docs/superpowers/specs/2026-09-12-navigation-sim-alignment-design.md`

## Global Constraints

- Function and field names mirror the C++ in camelCase; every module starts with a comment naming the C++ file it mirrors, and every ported function names its C++ twin.
- Config keys keep the deployed YAML's nesting and spelling (`Config.beam_pointcloud.heading_min_inliers`). Values come from `src/warehouse_pose_corrector_vision_based/config/warehouse_pose_corrector_vision_based.yaml`; where the C++ default differs, note it in a trailing comment.
- Module shell convention (copy exactly, changing only the name and dependencies):

```js
(function exposeGeometry(root) {
  "use strict";
  const inNode = typeof module !== "undefined" && module.exports;
  const sim = inNode ? null : (root.PoseCorrectorSim = root.PoseCorrectorSim || {});
  const config = inNode ? require("./config.js") : sim.config;   // one line per dependency
  // ... body ...
  const api = { /* exports */ };
  if (inNode) module.exports = api;
  else sim.geometry = api;                                        // module name
})(typeof window !== "undefined" ? window : globalThis);
```

- Load order everywhere (index.html, tests.html, tests.js): `config, geometry, line_fitter, aisle_state, lateral_drift_filter, heading, x_offset, correction_transform, pose_corrector, synthetic_world`, then `renderer, demos, sketch` for pages.
- Existing standalone folder names are kept: `pipeline, synthetic-input, accumulation, rotation-filter, line-fit, coefficient-smoothing, heading-consensus, centerline, correction, tf-logic, failure-cases`. New folders: `heading-gates, calibration, lateral-drift-filter, x-offset, outputs-hold`.
- Pure functions never throw on empty input; they return an invalid result with a `reason` string.
- Tests run with `node p5sim/navigation/tests.js` from the repo root; exit code 1 on any failure.
- Commit after every task with `git -c user.name="Ashry Ramadhan" -c user.email="ashry.ramadhan@digitalplace.ai" commit`, ending the message with the session attribution lines.
- C++ reference paths are relative to `/workspace/src/warehouse_pose_corrector_vision_based/`.

---

## File structure

| File | Responsibility |
|---|---|
| `p5sim/navigation/scripts/config.js` | YAML-shaped config object and `cloneConfig` |
| `p5sim/navigation/scripts/geometry.js` | vectors, angles, line helpers, seeded RNG (`aisle_types.hpp`, `rack_geometry_utils.cpp`) |
| `p5sim/navigation/scripts/line_fitter.js` | `RecursiveLinRegFitter`, `lineExtent`, rotation search filter (`recursive_linreg_fitter.cpp`, `rotation_search_filter.hpp`) |
| `p5sim/navigation/scripts/aisle_state.js` | measurement and state structs and updates (`aisle_types.hpp`) |
| `p5sim/navigation/scripts/lateral_drift_filter.js` | `LateralDriftFilter` (`lateral_drift_filter.hpp`) |
| `p5sim/navigation/scripts/heading.js` | consensus and heading gates (`consensus_filter.hpp`, node lines 2099-2182, 2614-2642) |
| `p5sim/navigation/scripts/x_offset.js` | upright projection, association, x-offset update (node lines 1679-1930) |
| `p5sim/navigation/scripts/correction_transform.js` | correction TF and stored-pose composition (`vision_correction_transform.hpp`, node 1084-1121) |
| `p5sim/navigation/scripts/pose_corrector.js` | orchestrator (`pose_corrector_node.cpp`) |
| `p5sim/navigation/scripts/synthetic_world.js` | world, trajectory, fault schedule |
| `p5sim/navigation/scripts/renderer.js` | unchanged |
| `p5sim/navigation/scripts/demos.js` | sixteen drawers reading the trace |
| `p5sim/navigation/scripts/sketch.js` | p5 loop; unchanged except demo list source |
| `p5sim/navigation/tests.html`, `tests.js` | test page and Node runner |
| `p5sim/navigation/index.html` | combined app, script tags updated |
| `p5sim/navigation/<id>/index.html`, `sketch.js` | sixteen standalone pages |
| `p5sim/navigation/README.md` | file map and reading order updated |
| `p5sim/navigation/scripts/core.js` | deleted in Task 12 |

---

### Task 1: Test runner and config module

**Files:**
- Create: `p5sim/navigation/scripts/config.js`
- Create: `p5sim/navigation/tests.js`
- Create: `p5sim/navigation/tests.html`

**Interfaces:**
- Produces: `Config` (nested object), `cloneConfig(cfg) -> deep copy`. Every later module takes YAML-shaped sub-objects from it: `Config.beam_pointcloud`, `Config.x_offset_correction`, `Config.vision_correction`.
- Produces for tests: `test(name, fn)`, `near(actual, expected, eps=1e-6)`, `assert(cond, msg)`, `loadModule(path)`, `requireApi(api, name)`.

- [ ] **Step 1: Write the runner with the first failing tests**

`p5sim/navigation/tests.js`:

```js
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
  function near(actual, expected, epsilon = 1e-6) {
    if (!(Math.abs(actual - expected) <= epsilon)) throw new Error(`expected ${expected}, received ${actual}`);
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

  // (later tasks append their test blocks here, before runAllTests)

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
```

`p5sim/navigation/tests.html` follows `p5sim/tf2_walkthrough/tests.html` with one results section titled "Navigation sim tests", one `renderTestResults`, and script tags in the global load order followed by `tests.js`.

- [ ] **Step 2: Run to verify the config tests fail**

Run: `node p5sim/navigation/tests.js`
Expected: `FAIL Config carries ...: config.js is not implemented`, exit code 1.

- [ ] **Step 3: Write config.js**

Values copied from the YAML; C++ default in a trailing comment where different:

```js
(function exposeConfig(root) {
  "use strict";
  // Mirrors config/warehouse_pose_corrector_vision_based.yaml (deployed values).
  // Trailing comments give the C++ declare_parameter default where it differs.
  const inNode = typeof module !== "undefined" && module.exports;
  const sim = inNode ? null : (root.PoseCorrectorSim = root.PoseCorrectorSim || {});

  const Config = {
    map_frame: "map",
    pose_resolver: { frame: "odom_fcu" },
    expected_rack_distance_note: "see beam_pointcloud.expected_rack_distance",
    beam_instance_matcher: { max_missed_frames: 10, max_centroid_dist_px: 100.0 },
    beam_pointcloud: {
      ransac_distance_threshold: 0.05,
      ransac_max_iterations: 100,
      ransac_min_inlier_ratio: 0.25,        // C++ default 0.6
      min_points_for_fitting: 10,
      use_linreg_fitter: true,              // C++ default false
      linreg_distance_threshold: 0.05,
      linreg_min_inlier_ratio: 0.25,        // C++ default 0.5
      linreg_max_iterations: 10,
      linreg_max_allowed_gap: 3.0,
      linreg_min_line_length: 0.5,
      heading_min_line_extent_m: 2.0,
      heading_min_inliers: 500,
      heading_min_inlier_ratio: 0.35,
      heading_max_rate_deg_s: 0.75,
      use_rotation_filter: true,            // C++ default false
      rot_coarse_pivot_distance: 3.0,
      rot_coarse_search_range_deg: 30.0,    // C++ default 20.0
      rot_coarse_search_step_deg: 5.0,
      rot_coarse_filter_threshold: 0.8,     // C++ default 0.5
      rot_fine_pivot_distance: 3.0,
      rot_fine_search_range_deg: 10.0,
      rot_fine_search_step_deg: 0.5,
      rot_fine_filter_threshold: 0.5,       // C++ default 0.3
      min_beam_depth: 0.3,                  // C++ default 0.5
      rack_pose_position_ema_alpha: 0.3,
      heading_ema_alpha: 0.05,              // C++ default 0.3 (viz-only SLERP)
      plane_coefficients_ema_alpha: 0.08,   // C++ default 0.3
      lateral_ema_alpha: 0.05,              // C++ default 0.1
      lateral_jump_threshold_m: 0.25,
      lateral_jump_confirm_frames: 3,
      lateral_jump_cluster_threshold_m: 0.08,
      lateral_max_step_m: 0.04,
      calibration_blend_alpha: 0.3,
      allow_single_rack_calibration: false,
      yaw_reset_threshold_deg: 0.0,         // C++ default 15.0; 0 disables
      yaw_reset_cooldown_sec: 0.7,
      heading_jump_threshold_deg: 5.0,      // C++ default 25.0
      heading_jump_required_count: 2,
      track_change_log_period_sec: 5.0,
      sync_warn_delta_sec: 0.2,
      enable_accumulation: false,
      accumulation_window_sec: 4.0,
      accumulation_max_points: 50000,
      enable_multi_beam_consensus: true,    // C++ default false
      max_beams_for_consensus: 2,           // C++ default 4
      min_beams_for_consensus: 1,           // C++ default 2
      consensus_heading_outlier_threshold_deg: 3.0,  // C++ default 10.0
      single_beam_min_inliers_for_correction: 100,   // C++ default 800
      single_beam_min_inlier_ratio_for_correction: 0.15,  // C++ default 0.55
      expected_rack_distance: 1.6,
      aisle_tracker_dual_gain: 0.2,         // C++ default 0.4
      aisle_tracker_single_gain: 0.05,      // C++ default 0.1
    },
    x_offset_correction: {
      x_offset_ema_alpha: 0.05,
      pillar_match_range: 1.0,
      pillar_offset_outlier_threshold_m: 0.5,
      pillar_lateral_score_weight: 0.25,
    },
    vision_correction: {
      odom_frame: "odom_vision_correction",
      base_frame: "base_link_odom_vision_correction",
      propagation_enabled: true,
      publish_identity_until_ready: true,
      propagation_rate_hz: 50.0,            // C++ default 30.0
      max_pose_age_sec: 0.25,
      max_correction_age_sec: 0.0,
    },
  };

  function cloneConfig(cfg) { return JSON.parse(JSON.stringify(cfg)); }

  const api = { Config, cloneConfig };
  if (inNode) module.exports = api;
  else sim.config = api;
})(typeof window !== "undefined" ? window : globalThis);
```

Remove the `expected_rack_distance_note` line; it is not in the YAML.

- [ ] **Step 4: Run to verify the config tests pass**

Run: `node p5sim/navigation/tests.js`
Expected: `2/2 tests passed`.

- [ ] **Step 5: Commit**

`git add p5sim/navigation/scripts/config.js p5sim/navigation/tests.js p5sim/navigation/tests.html` then commit `feat(navigation): test runner and YAML-shaped config`.

---

### Task 2: geometry.js

**Files:**
- Create: `p5sim/navigation/scripts/geometry.js`
- Modify: `p5sim/navigation/tests.js` (append block)

**Interfaces:**
- Produces: `v, add, sub, mul, dot, len, normalize, headingVector(yaw), normalVector(yaw), degToRad, radToDeg, meanPoint(points), normalizeAngle(a), blendAngleCircular(a, b, w), resolveHeadingToReference(h, refOrNull), computeHeadingFromLineCoefficients({a,b,c}), alignLineToHeading({a,b,c}, yaw) -> {a,b,c}, lineSignedDistance({a,b,c}, {x,y}), makeRng(seed), randRange(rng, min, max), randNormal(rng, mean, std)`.
- Mirrors: `aisle_types.hpp` lines 78-83 (`blend_angle_circular`), 151-167 (`resolve_heading_to_reference`); `rack_geometry_utils.cpp` 38-48 (`NormalizeAngle`); node 2731-2743 (`ComputeHeadingFromLineCoefficients`), 3034-3059 (`AlignLineToHeading`). RNG copied from the old `core.js` 125-145.

- [ ] **Step 1: Append failing tests**

```js
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
```

- [ ] **Step 2: Run to verify failure** — `node p5sim/navigation/tests.js`, expect `geometry.js is not implemented` failures.

- [ ] **Step 3: Write geometry.js** with the module shell (no dependencies). Port each function from its C++ twin above; `resolveHeadingToReference` uses the `normalizeAngle` form of node 2745-2755 (identical result to `aisle_types.hpp`). `computeHeadingFromLineCoefficients`: `dx=-b, dy=a`, normalize, flip when `dx<0`, `atan2`. `alignLineToHeading`: normalize by `hypot(a,b)` (return `{a:0,b:1,c:0}` when below 1e-6), flip all three when `a*(-sin yaw)+b*cos yaw < 0`.

- [ ] **Step 4: Run to verify pass** — expect `10/10 tests passed`.

- [ ] **Step 5: Commit** — `feat(navigation): geometry module mirroring aisle_types and rack_geometry_utils`.

---

### Task 3: line_fitter.js

**Files:**
- Create: `p5sim/navigation/scripts/line_fitter.js`
- Modify: `p5sim/navigation/tests.js` (append)

**Interfaces:**
- Consumes: geometry `meanPoint`.
- Produces:
  - `fitLine2D(points, minPointsForFitting) -> {A, B, C, isValid}` (mirrors `recursive_linreg_fitter.cpp` 13-75)
  - `class RecursiveLinRegFitter { constructor(cfg); fitPlane(points) -> PlaneModel; extractInliers(points, inlierIndices) -> points; getConfig() }` where `cfg = {distance_threshold, min_inlier_ratio, min_points_for_fitting, max_iterations, max_allowed_gap, min_line_length}` and `PlaneModel = {valid, coefficients:{a,b,c}, inlierIndices, inlierRatio, reason, iterations:[{line:{a,b,c}, inlierIndices}]}` (mirrors 80-170; `iterations` and `reason` are sim additions for the line-fit page and hold logging; `reason` is one of `"too few points" | "no valid line" | "inlier ratio" | "gap" | "line length"`)
  - `fitterConfigFromYaml(beamPointcloudCfg) -> cfg` (mirrors node 169-183: linreg_* keys plus `min_points_for_fitting`)
  - `lineExtent(points, inlierIndices, coefficients) -> meters` (mirrors node 2315-2327: project inliers onto direction `(-b, a)`, return max minus min, 0 when none)
  - `rotationSearchFilter(points, estimatedAngle, pivotDistance, searchRangeDeg, searchStepDeg, filterThreshold, isLeftSide) -> {points, bestAngle, debug:{pivot, angles, metrics, rotatedValues, bestIndex, bestMetric}}` (mirrors `rotation_search_filter.hpp` 23-110; `debug` is a sim addition)
  - `rotationFilterConfigFromYaml(beamPointcloudCfg) -> {coarse_pivot_distance, coarse_search_range_deg, coarse_search_step_deg, coarse_filter_threshold, fine_pivot_distance, fine_search_range_deg, fine_search_step_deg, fine_filter_threshold}` (node 192-210)
  - `applyTwoStageRotationFilter(points, estimatedAngle, isLeftSide, rotCfg) -> {points, coarse, fine}` (mirrors 125-157)

- [ ] **Step 1: Append failing tests**

```js
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
  test("fitPlane rejects a low inlier ratio and reports the achieved ratio", () => {
    const L = requireApi(lineFitterApi, "line_fitter.js"), G = requireApi(geometryApi, "geometry.js"), C = requireApi(configApi, "config.js");
    const rng = G.makeRng(9);
    const good = linePoints(G, 0, 0, -2, 2, 40, 0.005, rng);
    const junk = [];
    for (let i = 0; i < 200; i += 1) junk.push({ x: G.randRange(rng, -2, 2), y: G.randRange(rng, -3, 3) });
    const model = yamlFitter(L, C).fitPlane(good.concat(junk));
    assert(!model.valid && model.reason === "inlier ratio", model.reason);
    assert(model.inlierRatio > 0 && model.inlierRatio < 0.25, "ratio " + model.inlierRatio);
  });
  test("rotationSearchFilter keeps the outer face band and drops interior points", () => {
    const L = requireApi(lineFitterApi, "line_fitter.js"), G = requireApi(geometryApi, "geometry.js");
    const h = 0;
    const face = linePoints(G, h, -1.6, -1.5, 1.5, 100, 0, null);         // right rack face at y = -1.6
    const interior = linePoints(G, h, -1.9, -1.5, 1.5, 100, 0, null);     // 0.3 m behind it (further from aisle)
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
```

Note on the right-rack test: for `isLeftSide=false` the filter minimizes `max(rotated_y)`; with the pivot to the right (`-normal * pivot`) the face is the layer nearest the aisle, so `ry` of the face is the largest and interior points 0.3 m beyond fall outside `bestMetric - 0.1`. If the port keeps the C++ sign conventions exactly (`pivot_sign = isLeft ? 1 : -1`, pivot at `avg + pivot_sign*d*(sin, -cos)`), this holds.

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Write line_fitter.js.** Port `FitLine2D` (13-75), `FitPlane` (80-170) keeping the exact loop semantics: on convergence set line and active then break; when `next < min_points_for_fitting` break WITHOUT updating line or active; otherwise update both. Record `iterations.push({line, inlierIndices: next})` after each candidate. Set `reason` on each early return. Port `ExtractInliers` (175-188). Port `RotationSearchFilter` and `ApplyTwoStageRotationFilter` from the header. Add `lineExtent` from node 2315-2327 and the two `*FromYaml` mappers.

- [ ] **Step 4: Run to verify pass** — expect `18/18`.

- [ ] **Step 5: Commit** — `feat(navigation): recursive linreg fitter and rotation search filter`.

---

### Task 4: aisle_state.js

**Files:**
- Create: `p5sim/navigation/scripts/aisle_state.js`
- Modify: `p5sim/navigation/tests.js` (append)

**Interfaces:**
- Consumes: geometry `blendAngleCircular`.
- Produces: `RackSide = {UNKNOWN:"unknown", LEFT:"left", RIGHT:"right"}`, `kDualConfidence = 1.0`, `kSingleConfidence = 0.4`, `makeBeamMeasurement()`, `makeCenterlineMeasurement()`, `makeAisleState()`, `updateAisleState(state, meas, dualGain, singleGain)`, `resetAisleState(state)`, `resetAisleHeading(state)`. Field names: `BeamMeasurement {valid, side, headingRad, cLine, planeCoeffs:{a,b,c}, inlierCount, residual, visibleLengthM, confidence, trackId, stamp}`; `CenterlineMeasurement {valid, dualSide, headingRad, a, b, c, halfWidthM, lateralCamM, confidence, stamp}`; `AisleState {initialized, lateralValid, headingRad, centerlineC, halfWidthM, confidence, dualLastFrame, lastUpdate}`. Mirrors `aisle_types.hpp` 12-147.

- [ ] **Step 1: Append failing tests** (ported from `test_aisle_state.cpp`, `test_centerline_meas.cpp`, `test_beam_measurement.cpp`)

```js
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
  test("AisleState second update blends with dual gain", () => {
    const A = requireApi(aisleStateApi, "aisle_state.js");
    const s = A.makeAisleState(); const h1 = 15 * DEG, h2 = 25 * DEG;
    A.updateAisleState(s, makeCl(A, h1, 0, 1.6, true), 0.4, 0.1);
    A.updateAisleState(s, makeCl(A, h2, 0, 1.6, true), 0.4, 0.1);
    near(s.headingRad, 0.6 * h1 + 0.4 * h2, 1e-9);
  });
  test("AisleState single side uses lower gain", () => {
    const A = requireApi(aisleStateApi, "aisle_state.js");
    const s = A.makeAisleState(); const h1 = 15 * DEG, h2 = 25 * DEG;
    A.updateAisleState(s, makeCl(A, h1, 0, 1.6, false), 0.4, 0.1);
    A.updateAisleState(s, makeCl(A, h2, 0, 1.6, false), 0.4, 0.1);
    near(s.headingRad, 0.9 * h1 + 0.1 * h2, 1e-9);
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
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Write aisle_state.js** porting `update_aisle_state` (96-128) exactly, including the `lateral_valid` blend-on-first-heading branch and the dual-only half width blend.
- [ ] **Step 4: Run to verify pass** — expect `29/29`.
- [ ] **Step 5: Commit** — `feat(navigation): aisle state and measurement structs from aisle_types.hpp`.

---

### Task 5: lateral_drift_filter.js

**Files:**
- Create: `p5sim/navigation/scripts/lateral_drift_filter.js`
- Modify: `p5sim/navigation/tests.js` (append)

**Interfaces:**
- Produces: `class LateralDriftFilter { constructor(cfg = {}); setConfig(cfg); reset(); hasValue(); value(); update(rawM) -> {initialized, held, jumpDetected, jumpConfirmed, jumpCount, rawM, filteredM, rawDeltaM} }` with `cfg = {ema_alpha, jump_threshold_m, jump_confirm_frames, jump_cluster_threshold_m, max_step_m}` sanitized as in the header (lines 108-116); `lateralFilterConfigFromYaml(beamPointcloudCfg)` maps `lateral_ema_alpha, lateral_jump_threshold_m, lateral_jump_confirm_frames, lateral_jump_cluster_threshold_m, lateral_max_step_m`; `droneYToCenterlineFromSignedError(d) -> -d`. Mirrors `lateral_drift_filter.hpp` 10-148.

- [ ] **Step 1: Append failing tests** (ported from `test_lateral_drift_filter.cpp`)

```js
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
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Write lateral_drift_filter.js** porting `Update` (61-105), `UpdatePendingJump` (118-130), `ApplyLowPassAndStepLimit` (132-141), `Sanitize` (108-116). Use `null` for the C++ `std::optional` members.
- [ ] **Step 4: Run to verify pass** — `35/35`.
- [ ] **Step 5: Commit** — `feat(navigation): lateral drift filter from lateral_drift_filter.hpp`.

---

### Task 6: heading.js

**Files:**
- Create: `p5sim/navigation/scripts/heading.js`
- Modify: `p5sim/navigation/tests.js` (append)

**Interfaces:**
- Consumes: geometry `normalizeAngle`.
- Produces:
  - `selectConsensusHeadingSamples(samples:[{trackId, headingRad, weight}], outlierThresholdRad) -> {valid, headingRad, acceptedTrackIds, rejectedSamples:[{trackId, diffRad}]}` (mirrors `consensus_filter.hpp` 55-107)
  - `isSingleBeamCorrectionReliable(inlierCount, inlierRatio, minInliers, minInlierRatio) -> bool` (46-53)
  - `isBeamReliableForHeading(result:{lineExtentM, inlierCount, inlierRatio}, beamPointcloudCfg) -> {valid, reason}`; reason is the C++ string built at node 2108-2144, e.g. `"extent 1.20m < 2.00m, inliers 320 < 500"` with two-decimal extent, integer inliers, one-decimal percent ratio.
  - `rateLimitHeading(state:{lastPublishedHeading, lastHeadingRateLimitStamp}, headingRad, stampSec, maxRateRadS) -> {heading, limited, dt, maxStep}` and it mutates `state.lastHeadingRateLimitStamp` exactly as node 2153-2182 (`dt <= 0 || dt > 1 -> 1/30`; when no last heading or rate <= 0 return input and set stamp). `lastHeadingRateLimitStamp` is `null` for "never".
  - `resetCooldownPassed(lastResetTime, nowSec, cooldownSec) -> bool` (2614-2619; `null` last reset means passed)
  - `shouldResetForHeadingJump(lastPublishedHeading, headingRad, thresholdRad, cooldownPassed) -> bool` (2635-2642)

- [ ] **Step 1: Append failing tests**

```js
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
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Write heading.js** porting the header and the node methods listed. Build the reason string with the same words, separators (", "), and number formats as the C++ `ostringstream` code.
- [ ] **Step 4: Run to verify pass** — `44/44`.
- [ ] **Step 5: Commit** — `feat(navigation): consensus and heading gates`.

---

### Task 7: x_offset.js

**Files:**
- Create: `p5sim/navigation/scripts/x_offset.js`
- Modify: `p5sim/navigation/tests.js` (append)

**Interfaces:**
- Produces (mirroring node 1707-1930):
  - `projectAlongAisle(x, y, heading)`, `projectAcrossAisle(x, y, heading)`
  - `buildVerticalObservation(xMap, yMap, heading) -> {x, y, s, l}`
  - `applyXOffsetToObservation(obs, heading, xOffsetM) -> {x, y, s, l}`
  - `buildProjectedMissionUprights(uprights:[{id, start:{x,y}, end:{x,y}}], heading) -> [{id, order, x, y, s, l}]` sorted by `s`, `order` = index
  - `associateVerticalObservation(obs, projected, heading, currentXOffsetM, xOffsetCfg) -> null | {observation, correctedObservation, upright, errX, errY, distanceM, residualM, lateralResidualM, scoreM}`
  - `median(values) -> number` (1812-1824, even-count average)
  - `updateXOffsetFromVerticalObservations(state, observations, heading, uprights, xOffsetCfg) -> {updated, reason, currentX, matches, keptMatches, rejected, meanResidual, selected, projectedUprights}` where `state = {xOffsetRaw, xOffsetFiltered, xOffsetHasMeasurement}` is mutated as node 1909-1917. `reason` is `""` on success, `"no map"`, `"no observations"`, or `"no match"`.

- [ ] **Step 1: Append failing tests**

```js
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
      X.buildVerticalObservation(8.4 - 0.95, 1.6, 0),   // 0.65 m from the median of 0.30/0.32/0.95
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
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Write x_offset.js** porting each node method. In `associateVerticalObservation`, `score = distance + pillar_lateral_score_weight * lateralResidual`; keep the `pillar_match_range > 0` guard. In the update, keep the `best_by_upright_id` map keyed by upright id, the `matches.size() > 1` condition on outlier rejection, the fallback to the lowest-score match when all are rejected, and `selected` = the kept match closest to the mean residual.
- [ ] **Step 4: Run to verify pass** — `51/51`.
- [ ] **Step 5: Commit** — `feat(navigation): x-offset landmark matching from the node`.

---

### Task 8: correction_transform.js

**Files:**
- Create: `p5sim/navigation/scripts/correction_transform.js`
- Modify: `p5sim/navigation/tests.js` (append)

**Interfaces:**
- Consumes: geometry `normalizeAngle`.
- Produces: `radiansToDegrees(r)`, `buildVisionCorrectionTransform(rawPose:{x,y,z,yaw}, correctedX, correctedY, correctedZ, aisleYawRad) -> {mapToVisionOdom:{x,y,z,yaw}, visionOdomToBase:{x,y,z,yaw}, correctedPose:{x,y,z,yaw}, rawYaw, correctionYaw, childYaw, composedYaw}` (mirrors `vision_correction_transform.hpp` 73-145 with yaw scalars in place of quaternions; `composedYaw = normalizeAngle(correctionYaw + childYaw)`), `composeStoredCorrectionPose(mapToVisionOdom, fcuPose:{x,y,z,yaw}) -> {x,y,z,yaw}` (node 1084-1121: rotate position by the stored yaw, add translation, yaw = stored yaw + raw yaw).

- [ ] **Step 1: Append failing tests** (ported from `test_vision_correction_transform.cpp`)

```js
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
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Write correction_transform.js** porting the header with scalar yaw.
- [ ] **Step 4: Run to verify pass** — `56/56`.
- [ ] **Step 5: Commit** — `feat(navigation): vision correction transform`.

---

### Task 9: pose_corrector.js (orchestrator)

**Files:**
- Create: `p5sim/navigation/scripts/pose_corrector.js`
- Modify: `p5sim/navigation/tests.js` (append)

**Interfaces:**
- Consumes: every module from Tasks 1-8 under the names listed in their Interfaces blocks.
- Produces:
  - `makeNodeState(cfg = Config) -> state` with fields (names mirror the node's members):
    `cfg, frameId, fitter (RecursiveLinRegFitter), rotCfg, lateralDriftFilter, latestMapPose, latestFcuPose, lastPublishedHeading, lastHeadingRateLimitStamp, headingJumpCount, lastResetTime, lastTrackedBeamId, smoothedPlaneCoeffs (Map trackId->{a,b,c}), trackSideMap (Map), latestBeamLateralM (Map), accumulator (Map trackId->[{stamp, points}]), aisleCalib {isCalibrated, fromSingleRack, halfWidth, a, b, c}, aisleState, xOffset {xOffsetRaw, xOffsetFiltered, xOffsetHasMeasurement}, beamUprightMap (null | uprights), stored {mapToVisionOdom, stamp, isIdentity, poseOffsetXRaw, poseOffsetXFiltered, poseOffsetYRaw, poseOffsetYFiltered, droneDistToCl, headingOffsetDeg, centerlineYawDeg}, resets []`.
  - `loadBeamUprightMap(state, uprights)` (the TransientLocal map subscription).
  - `processFrame(state, frame) -> trace`. `frame = {frameIndex, stamp, fcuPose:{x,y,z,yaw}, tracks:[{trackId, side:"left"|"right", points:[{x,y}]}], verticalDetections:[{x,y}]}`, all in odom XY.
    `trace = {frameIndex, stamp, fcuPose, stages:[{trackId, side, inputPoints, accumulated|null, rotFiltered|null, fitPoints, fit, beamResult|null}], xOffset:{skipped:reason}|updateResult, hold:null|reason, reset:null|reason, consensus:null|{valid, headingRad, acceptedTrackIds, rejectedSamples}, freshHeading, headingToPublish, rateLimit:null|{limited, dt, maxStep}, measurement:null|CenterlineMeasurement, calibration:copy, aisleState:copy, broadcast:null|{held, rawDistToCl, lateral, yIntercept, lateralX, lateralY, correctedX, correctedY, tf}, xOffsetState:copy, outputs:copy of stored}`.
    `beamResult = {trackId, heading, inlierCount, inlierRatio, valid, headingValid, headingRejectReason, planeCoefficients:{a,b,c}, side, lineExtentM, smoothingRestarted}`.
    Hold reasons are the C++ strings: `"no valid fit"`, `"weak single beam"`, `"no qualified heading yet"`, `"no qualified consensus heading yet"`, `"line extent below minimum"`.
  - `propagationTick(state, latestPose, nowSec) -> {published, reason, isIdentity, mapToVisionOdom, visionOdomToBase, correctedPose, diagnostics:{poseOffsetXRaw, poseOffsetYRaw, droneYToCenterline}, measurement:null|{stamp, centerlineYawDeg, poseOffsetYM, poseOffsetXM, hasX}}`. `reason` is `""` when published, else `"identity disabled"`, `"correction stale"`, `"no pose"`, `"pose stale"`.
  - `resetTrackingState(state, reason, nowSec, preserveLateral)` (node 2654-2698).
  - Internal methods exported for the standalone pages and tests, each mirroring the node method of the same name: `processBeamClouds, buildBeamResultFromFit, computeConsensus, processBeamResults, processPerScanData, holdIfWeakSingleBeam, lastStableHeading, buildCenterlineMeasurement, computeDualCenterline, tryInitialCalibration, tryInitialCalibrationSingle, applyVisionCorrection, broadcastVisionCorrectedTF, publishHeldVisionCorrection, storeVisionCorrectionState, storeIdentityVisionCorrectionState, publishStoredVisionCorrection, publishRackPoseFromHeading, updateAccumulator`.

Port notes (read the C++ ranges before writing each):
- `processFrame` = `SegDepthCallback` 894-1018 minus intrinsics, cv_bridge, and pose resolution: `state.latestMapPose = frame.fcuPose`; split tracks by side; the side map is set from `track.side`; the yaw-maneuver reset (944-952) runs only when `yaw_reset_threshold_deg > 0` and is ported as `shouldResetForYaw` (2621-2633) with `state.yawReference`.
- `processBeamClouds` 668-892: skip the 5th-percentile depth gate (no depth in sim) but keep the `< 10 points` gate; `latestBeamLateralM` gets the FCU-to-raw-line signed distance as its stand-in for camera lateral (debug only). Accumulation: `updateAccumulator(state, trackId, stamp, points, cfg)` keeps entries within `accumulation_window_sec` and caps at `accumulation_max_points` (oldest dropped). Rotation filter only when `use_rotation_filter && lastPublishedHeading !== null`, and only replaces `fitPoints` when it keeps at least `min_points_for_fitting`. Then the X-offset block (788-819), then the consensus/per-scan branch (841-891). `max_beams_for_consensus` truncates in detection order.
- `buildBeamResultFromFit` 2272-2336: normalize `(a,b,c)` by `hypot(a,b)`; flip when the dot with the previous smoothed normal is negative; EMA with `plane_coefficients_ema_alpha`; renormalize. `smoothingRestarted = true` when the track had no previous entry. `lineExtentM` from `lineExtent(fitPoints, inlierIndices, rawCoefficients)` using the raw fit coefficients as the C++ does.
- `processBeamResults` 2418-2518 in full, including the `results.size() < min_beams_for_consensus` branch, `correction_results = results` when no fresh heading, the weak-single hold, the jump-reset counter, and the rate limit.
- `buildCenterlineMeasurement` 2763-2865 and `computeDualCenterline` 2949-2984 verbatim; `applyVisionCorrection` 2886-2943 including both calibration blends and `publishRackPoseFromHeading` (3253-3317 reduced to: set `stored.centerlineYawDeg` and `stored.headingOffsetDeg` to `radiansToDegrees(yaw)`; keep `smoothedRackOrientation` as a scalar yaw SLERP with `heading_ema_alpha` for the raw diagnostic).
- `broadcastVisionCorrectedTF` 1299-1400 (markers omitted), line-based since the C++ change of 2026-09-14: lateral filter on the centerline offset `c` (not on the drone's distance), `cFiltered`, y intercept `= |b|>1e-6 ? -cFiltered/b : 0`, drone distance to the filtered line (telemetry), corrected = raw + `cFiltered` * normal + x offset along heading, `buildVisionCorrectionTransform`, `storeVisionCorrectionState`. Matches the laser's `createCorrectedTF` translation `(x_corr, c)`.
- `publishHeldVisionCorrection` 1060-1082; `storeIdentityVisionCorrectionState` 1161-1185; `publishStoredVisionCorrection` 1187-1242 (the measurement is emitted only when `stored.centerlineYawDeg !== null`, with `stamp = stored.stamp`); `propagationTick` = `VisionCorrectionPropagationTimer` 1244-1285.
- `resetTrackingState` 2654-2698; log to `state.resets` and set `trace.reset`.

- [ ] **Step 1: Append failing tests**

```js
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
```

`propagationTick` accepts a pose with an optional `stamp`; when present, `max_pose_age_sec` is checked against `nowSec - stamp` (the C++ checks `latest_fcu_pose_.header.stamp`).

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Write pose_corrector.js** following the port notes.
- [ ] **Step 4: Run to verify pass** — `64/64`.
- [ ] **Step 5: Commit** — `feat(navigation): pose corrector orchestrator mirroring pose_corrector_node.cpp`.

---

### Task 10: synthetic_world.js

**Files:**
- Create: `p5sim/navigation/scripts/synthetic_world.js`
- Modify: `p5sim/navigation/tests.js` (append)

**Interfaces:**
- Consumes: geometry.
- Produces:
  - `buildWorld(options = {}) -> world` with defaults `{seed: 73, headingDeg: 33.5, halfWidth: 1.6, uprightSpacing: 2.8, frameCount: 150, dt: 0.1, odomAlongOffsetM: 0.6, odomLateralOffsetM: 0.2}` and fields `{seed, headingRad, halfWidth, uprightSpacing, frameCount, dt, odomOffset:{along, lateral, vec:{x,y}}, missionUprights:[{id, type:2, start, end}] (map), trueCenterlineMap:{a,b,c:0}, trueCenterlineOdom:{a,b,c}, faults:[{id, label, from, to}], frames:[frame|null], truth:[{mapPose:{x,y,z,yaw}, along, lateral}]}`.
  - `faultAt(world, frameIndex) -> fault|null`, `mapToOdom(world, p)`, `odomToMap(world, p)`, `poseAtTime(world, tSec) -> odom pose {x,y,z,yaw,stamp}` linearly interpolated between the truth poses (yaw via `blendAngleCircular`).
  - Fault ids and windows exactly as the spec table: `none` (0-29, 72-74, 110-149), `missing-right` (30-44), `short-both` (45-54), `skew-right` (55-69), `glitch-lateral` (70-71), `displacement` (75-89), `dropout` (90-99, `frames[i] = null`), `id-switch` (100-109). Frames 72-74 are `none`.
  - Frame content per spec Section 3: 800 face points (`sigma 0.018`) over +/-1.6 m along, 200 interior points 0.06-0.25 m behind; `short-both` keeps only |t| <= 0.6 m; `skew-right` rotates the right rack's points by +20 deg about their centre and uses 660 face points while the left uses 1000; `glitch-lateral` shifts the reported odom pose AND the odom rack/upright points by +0.35 m along the aisle normal (an odom jump); `displacement` adds +0.35 m to the drone's true lateral; `id-switch` gives the left track id 3. Vertical detections: uprights within [-2.5, +4] m of the drone along the aisle, each `+ randNormal(0.05)`, plus one spurious point 0.9 m along-aisle off the nearest upright on every frame where `frameIndex % 17 === 0`. Everything is generated in map and converted with `mapToOdom`.

- [ ] **Step 1: Append failing tests**

```js
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
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Write synthetic_world.js.**
- [ ] **Step 4: Run to verify pass** — `68/68`.
- [ ] **Step 5: Commit** — `feat(navigation): synthetic world with fault schedule`.

---

### Task 11: Pipeline smoke test

**Files:**
- Modify: `p5sim/navigation/tests.js` (append)
- Possibly modify: `pose_corrector.js`, `synthetic_world.js` when a deviation from the spec surfaces.

**Interfaces:**
- Consumes: `buildWorld`, `poseAtTime`, `makeNodeState`, `loadBeamUprightMap`, `processFrame`, `propagationTick`.
- Produces: `runTimeline(world, cfg) -> {state, ticks:[{k, t, frameIndex, trace|null, tick, pose}]}` exported from `pose_corrector.js` (added in this task) so `demos.js` reuses it.

- [ ] **Step 1: Append the failing smoke test**

```js
  // ── pipeline smoke test ───────────────────────────────────────────────────
  test("runTimeline reproduces the spec's end-to-end behaviour on the synthetic world", () => {
    const N = requireApi(nodeApi, "pose_corrector.js"), W = requireApi(worldApi, "synthetic_world.js"), G = requireApi(geometryApi, "geometry.js"), C = requireApi(configApi, "config.js");
    const world = W.buildWorld();
    const { ticks } = N.runTimeline(world, C.Config);
    const traces = ticks.filter(k => k.trace).map(k => k.trace);
    const byFrame = new Map(traces.map(t => [t.frameIndex, t]));
    // corrected pose: on the map centerline and at the true along position after frame 20
    for (let i = 21; i < 120; i += 1) {
      const t = byFrame.get(i); if (!t || !t.broadcast) continue;
      if ([70, 71].includes(i) || (i >= 75 && i <= 89)) continue;
      const cp = t.broadcast.tf.correctedPose;
      near(G.lineSignedDistance(world.trueCenterlineMap, cp), 0, 0.05, `frame ${i} lateral`);
      if (i >= 60) near(G.dot(cp, G.headingVector(world.headingRad)), world.truth[i].along, 0.1, `frame ${i} along`);
    }
    near(byFrame.get(60).xOffsetState.xOffsetFiltered, 0.6, 0.1);
    near(-byFrame.get(20).measurement.c / byFrame.get(20).measurement.b, -world.trueCenterlineOdom.c / world.trueCenterlineOdom.b, 0.05);
    for (let i = 45; i <= 54; i += 1) { const t = byFrame.get(i); assert(!t.freshHeading && t.stages[0].beamResult.headingRejectReason.startsWith("extent"), `frame ${i} held heading`); }
    for (let i = 55; i <= 69; i += 1) { const t = byFrame.get(i); near(G.normalizeAngle(t.aisleState.headingRad - world.headingRad), 0, 1.5 * DEG, `frame ${i} heading`); }
    assert(byFrame.get(70).broadcast.lateral.held, "frame 70 held");
    assert(byFrame.get(77).broadcast.lateral.jumpConfirmed, "frame 77 confirmed");
    const frozen = byFrame.get(89).outputs.stamp;
    for (const k of ticks.filter(x => x.frameIndex >= 90 && x.frameIndex <= 99)) {
      assert(k.trace === null && k.tick.published && !k.tick.isIdentity, "dropout tick publishes held correction");
      near(k.tick.measurement.stamp, frozen, 1e-9);
    }
    const t100 = byFrame.get(100);
    assert(t100.stages.find(s => s.trackId === 3).beamResult.smoothingRestarted, "id 3 restarts the coefficient EMA");
  });
```

`near` gains an optional fourth `label` argument prefixed to the error message; update the helper.

- [ ] **Step 2: Run to verify failure** (`runTimeline is not a function`).
- [ ] **Step 3: Add `runTimeline` to pose_corrector.js**: `loadBeamUprightMap(state, world.missionUprights)`; for `k` in `0 .. frameCount*3 - 1`: `t = k * dt / 3`; if `k % 3 === 0` and `world.frames[k/3]` is not null, `trace = processFrame(state, frame)`; `pose = poseAtTime(world, t)`; `tick = propagationTick(state, pose, t)`; push `{k, t, frameIndex: floor(k/3), trace, tick, pose}`.
- [ ] **Step 4: Run; fix deviations in the orchestrator or world until the smoke test passes.** Each fix is a port error or a world-tuning error; re-read the C++ range before changing orchestrator logic. Expected final: `69/69`.
- [ ] **Step 5: Commit** — `test(navigation): end-to-end smoke test on the synthetic world`.

---

### Task 12: Combined app: demos.js, index.html, sketch.js; delete core.js

**Files:**
- Create: `p5sim/navigation/scripts/demos.js` (rewrite)
- Modify: `p5sim/navigation/index.html` (script tags), `p5sim/navigation/scripts/sketch.js` (read demo ids from `PoseCorrectorSim.demos`)
- Delete: `p5sim/navigation/scripts/core.js`

**Interfaces:**
- Consumes: `runTimeline`, world, renderer (`WorldRenderer, computeBounds, drawPanel, drawTextBlock, drawLegend`).
- Produces: `global.VisionPipelineP5Demos = {Colors, DemoIds, DemoLabels, createDemoState, drawDemo}` (same names `sketch.js` already uses; `sketch.js` switches `Core.DemoIds/DemoLabels` to `Demos.DemoIds/DemoLabels`).

`createDemoState()` builds `world = buildWorld()`, runs `runTimeline`, and precomputes: `worldBounds` from all rack points and the truth path (fixed for the whole run), `rotationDemo` from frame 20's right track (coarse and fine debug), `lineFitDemo` from frame 24's left track (`fit.iterations`), `smoothingHistory` = per-frame left-track raw vs smoothed line from the traces.

Sixteen drawers, each `draw(p, state, simFrame)`; `tickIndex = simFrame % ticks.length`, `frameIndex = floor(tickIndex/3)`, `trace = last non-null trace at or before frameIndex`. Every drawer paints a title, a world grid, and a right panel via the existing helpers. Panel lines list the YAML keys that drive the stage.

| Id | World layer | Panel lines |
|---|---|---|
| `pipeline` | rack points per stage (input muted, rotFiltered red, inliers white line), centerline green, FCU yellow, corrected green, x-offset arrow, active fault label | frame, fault, hold reason, mode dual/single, heading deg, raw and filtered lateral, x raw and filtered, `has_x` |
| `synthetic-input` | true racks, uprights as cylinders (map, cyan) and their odom images (dim), mission origin, odom origin, drone true and odom poses | odom offset along and lateral, upright spacing, counts, fault timeline as a list with the active one marked |
| `accumulation` | left track current frame bright, accumulated dim green; run a second `makeNodeState` with `enable_accumulation: true` in `createDemoState` and show both fits | `enable_accumulation`, window, cap, points current vs accumulated, heading with and without |
| `rotation-filter` | coarse sweep animation: candidate boundary line, kept vs rejected, pivot; then fine stage | `rot_coarse_*`, `rot_fine_*`, candidate index and angle, best angle, kept counts |
| `line-fit` | iteration animation from `fit.iterations` plus the final gap and span check | `linreg_*`, iteration, inliers, ratio, span, max gap, `reason` when invalid |
| `coefficient-smoothing` | raw line orange vs smoothed cyan for the left track | `plane_coefficients_ema_alpha`, raw and smoothed heading, sign-flip count |
| `heading-gates` | the left beam with its inlier chord drawn as a bracket; a rate-limit strip showing requested vs published heading over the last 60 frames; jump counter | `heading_min_line_extent_m`, `heading_min_inliers`, `heading_min_inlier_ratio`, `heading_max_rate_deg_s`, `heading_jump_threshold_deg`, `heading_jump_required_count`, current reason string |
| `heading-consensus` | number line of beam headings sized by inliers, accepted green, rejected red, mean bar, gate band | `max_beams_for_consensus`, `consensus_heading_outlier_threshold_deg`, accepted ids, rejected ids with diff, held or fresh |
| `centerline` | accepted lines by side, centerline, half-width brackets, frozen-c badge when the fallback fires | mode, half width measured, normals dot, `expected_rack_distance`, calibrated half width |
| `calibration` | fixed cyan calibrated line, current measurement line, blended line | `calibration_blend_alpha`, `allow_single_rack_calibration`, calibrated at frame, anchor c, measurement c, blended c |
| `lateral-drift-filter` | strip chart of raw vs filtered distance over the run with the fault windows shaded | `lateral_ema_alpha`, `lateral_jump_threshold_m`, `lateral_jump_confirm_frames`, `lateral_jump_cluster_threshold_m`, `lateral_max_step_m`, current `held`, `jumpCount`, `jumpConfirmed` |
| `x-offset` | mission uprights cyan, detections red, shifted detections blue, matches with arrows, gate circles | `pillar_match_range`, `pillar_offset_outlier_threshold_m`, `pillar_lateral_score_weight`, `x_offset_ema_alpha`, matched, kept, rejected, mean residual, raw, filtered |
| `correction` | centerline (filtered c), FCU, foot on the line, shift-by-c arrow, x-offset step, corrected pose | c raw, c filtered, drone distance to line, y intercept, x offset, corrected pose |
| `tf-logic` | three axes: map at origin; `odom_vision_correction` at the correction translation rotated by -aisle; `base_link_odom_vision_correction` at the raw pose under it; corrected pose | aisle yaw, correction yaw, child yaw = raw FCU yaw, composed yaw = fcu - aisle, translation |
| `outputs-hold` | timeline strip: tick outputs vs perception frames; corrected pose path; identity badge before the first fix; dropout shading | `propagation_rate_hz`, `publish_identity_until_ready`, `max_pose_age_sec`, `max_correction_age_sec`, tick time, measurement stamp, age, `has_x`, published or reason |
| `failure-cases` | the world view at the current fault with the node's reaction overlaid | active fault label and window, hold reason, reset log entries, lateral filter flags, consensus accepted and rejected |

- [ ] **Step 1: Rewrite demos.js** with the sixteen drawers and `createDemoState`; update `sketch.js` to read `Demos.DemoIds` and `Demos.DemoLabels`; update `index.html` script tags to the global load order; delete `scripts/core.js`.
- [ ] **Step 2: Syntax check** — `node --check p5sim/navigation/scripts/demos.js && node --check p5sim/navigation/scripts/sketch.js`.
- [ ] **Step 3: Headless render check** — add `p5sim/navigation/scripts/demos_check.js`: a Node script that stubs a minimal `p` (every p5 method used by renderer and demos as a no-op recorder, `width 1200`, `height 800`), loads the modules and `demos.js`, calls `createDemoState()`, and calls `drawDemo(p, state, id, simFrame)` for every id at `simFrame` in `[0, 90, 200, 260, 300, 359]`. It exits 1 on any exception. Run it: `node p5sim/navigation/scripts/demos_check.js`.
- [ ] **Step 4: Browser check** — open `p5sim/navigation/index.html`, cycle all sixteen demos, confirm no console errors.
- [ ] **Step 5: Commit** — `feat(navigation): combined app on the ported pipeline; remove core.js`.

---

### Task 13: Standalone pages

One sub-task per page; each is self-contained: constants, the functions it needs copied verbatim from the modules (same names, with the C++ twin comment kept), a small deterministic input, a tiny world renderer, a panel, `setup`, `draw`, `windowResized`. The `index.html` for new folders is the existing template with the title and subtitle changed. Verify each with `node --check <folder>/sketch.js` and by opening the page.

The canonical template is `lateral-drift-filter/sketch.js` (13a). Every other page uses the same structure: copy this file's scaffolding (the `makeWorld`, `panel`, button wiring, `setup`, `draw`, `windowResized` sections) and replace the constants, the copied functions, the per-frame simulation, and the drawing.

- [ ] **13a `lateral-drift-filter/` (new).** Copy `LateralDriftFilter` and `droneYToCenterlineFromSignedError` verbatim. Simulation: 360-frame raw distance series: `0.05 sin(0.13 i)` plus an isolated +0.35 at frames 70-71, a sustained +0.35 from 120 to 220, and a +0.5 unstable cluster (alternating +0.5 and +0.7) at 260-266. Run two filters: YAML config and `ema_alpha: 1.0` to expose the step limit. Draw a strip chart with raw grey, YAML-filtered green, alpha-1 filtered orange, and shaded windows. Panel: the five YAML keys, `held`, `jumpCount`, `jumpConfirmed`, `rawDeltaM`.

Full file:

```js
const DEMO_ID = "lateral-drift-filter";
// Mirrors include/warehouse_pose_corrector_vision_based/lateral_drift_filter.hpp
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

// DroneYToCenterlineFromSignedError — the published telemetry negates the internal sign.
function droneYToCenterlineFromSignedError(d) { return -d; }

// Builds the raw signed-distance series with the three fault windows.
function rawSeries(count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    let value = 0.05 * Math.sin(0.13 * i);
    if (i === 70 || i === 71) value += 0.35;                      // isolated glitch
    if (i >= 120 && i <= 220) value += 0.35;                      // true sustained displacement
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
  { from: 70, to: 71, label: "isolated glitch", color: [248, 113, 113, 50] },
  { from: 120, to: 220, label: "sustained displacement", color: [82, 255, 168, 40] },
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
  p.text("One sketch: jump detection -> hold until confirmed -> EMA -> output step limit", 22, 50);
  chart.grid();
  WINDOWS.forEach(win => chart.window(win));
  chart.series(SERIES, i, [135, 148, 172], 1.5);
  chart.series(SNAP_RUN.map(r => r.filteredM), i, [255, 142, 88], 2);
  chart.series(YAML_RUN.map(r => r.filteredM), i, [82, 255, 168], 3);
  chart.cursor(i);
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `frame: ${i}`,
    `raw: ${now.rawM.toFixed(3)} m   filtered: ${now.filteredM.toFixed(3)} m`,
    `raw delta: ${now.rawDeltaM.toFixed(3)} m`,
    `held: ${now.held}   jumpCount: ${now.jumpCount}`,
    `jumpConfirmed: ${now.jumpConfirmed}`,
    `drone_y_to_centerline: ${droneYToCenterlineFromSignedError(now.filteredM).toFixed(3)} m`,
    "",
    `lateral_ema_alpha: ${YAML.lateral_ema_alpha}`,
    `lateral_jump_threshold_m: ${YAML.lateral_jump_threshold_m}`,
    `lateral_jump_confirm_frames: ${YAML.lateral_jump_confirm_frames}`,
    `lateral_jump_cluster_threshold_m: ${YAML.lateral_jump_cluster_threshold_m}`,
    `lateral_max_step_m: ${YAML.lateral_max_step_m}`,
    "",
    "Grey: raw signed distance.",
    "Green: YAML filter (EMA 0.05).",
    "Orange: alpha 1.0, so only the",
    "0.04 m step limit shapes it.",
    "",
    "An isolated jump is held. A jump",
    "that repeats for 3 frames within",
    "0.08 m is confirmed, then eased in.",
  ]);
  if (!paused) simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28), Math.max(540, window.innerHeight - 118));
}
```

Commit: `feat(navigation): lateral drift filter standalone page`.

- [ ] **13b `heading-gates/` (new).** Copy `isBeamReliableForHeading`, `rateLimitHeading`, `shouldResetForHeadingJump`, `resetCooldownPassed`, `normalizeAngle`, `lineExtent`, `headingVector`, `normalVector`. Simulation: a synthetic beam whose extent cycles 0.8 -> 3.4 m, inliers 200 -> 900, ratio 0.2 -> 0.8 over 240 frames (three sine phases), evaluated against the YAML gate; a requested heading series `33.5 + 3 sin(0.05 i)` deg fed at 10 Hz through `rateLimitHeading` at 0.75 deg/s; a jump counter driven by a +6 deg step at frames 150-153. Draw: left half, the beam as a bracketed chord with the three gate readouts coloured pass/fail; right half, a strip of requested vs published heading with the jump window shaded. Panel: the six YAML keys, the current reason string, `limited`, `headingJumpCount`, and "reset fired" when the count reaches `heading_jump_required_count`.

- [ ] **13c `calibration/` (new).** Copy `tryInitialCalibration`, `tryInitialCalibrationSingle`, `alignLineToHeading`, `normalVector`, `headingVector`. Simulation: a dual measurement at frame 0 with `half_width 1.58, c 0.21`; then measurements whose `c` wanders `0.21 + 0.25 sin(0.07 i)`; the blended `c = 0.3 c_meas + 0.7 c_calib`. Toggle every 120 frames between dual and single (single blends only after calibration; with `allow_single_rack_calibration` false a single-first run shows no anchor until the first dual). Draw: cyan fixed anchor line, orange measurement line, green blended line, on a 33.5 deg aisle. Panel: `calibration_blend_alpha`, `allow_single_rack_calibration`, `isCalibrated`, `fromSingleRack`, calibrated at frame, `c` anchor, measurement, blended.

- [ ] **13d `x-offset/` (new).** Copy `projectAlongAisle`, `projectAcrossAisle`, `buildVerticalObservation`, `applyXOffsetToObservation`, `buildProjectedMissionUprights`, `associateVerticalObservation`, `median`, `updateXOffsetFromVerticalObservations`, `headingVector`, `normalVector`, `makeRng`, `randNormal`. Simulation: uprights every 2.8 m on both sides of a 33.5 deg aisle, 8 per side; per frame, detections = uprights within 4 m ahead of a drone moving 0.16 m/frame, shifted by -0.6 m along the aisle plus noise 0.05, and a spurious point every 17th frame; run the update with the YAML config. Draw: cyan cylinders (map), red detections, blue shifted detections, yellow arrows to the matched upright, gate circles of `pillar_match_range`, drone. Panel: the four YAML keys, `matches`, `kept`, `rejected`, `meanResidual`, `xOffsetRaw`, `xOffsetFiltered`, `selected` id and order.

- [ ] **13e `outputs-hold/` (new).** Copy `buildVisionCorrectionTransform`, `composeStoredCorrectionPose`, `storeVisionCorrectionState`, `storeIdentityVisionCorrectionState`, `publishStoredVisionCorrection`, `propagationTick` (the standalone version takes a `state` literal with the `stored` fields). Simulation: a drone moving along a 33.5 deg aisle; perception "frames" arrive every 3 ticks at ticks 0-299 except a dropout at ticks 150-209; each frame stores a correction with the true perception stamp; every tick calls `propagationTick`. Draw: the corrected pose path (green), the raw path (yellow), a timeline strip at the bottom with tick marks, frame marks, the identity badge before the first frame, and the dropout shaded. Panel: `propagation_rate_hz`, `publish_identity_until_ready`, `max_pose_age_sec`, `max_correction_age_sec`, tick time, measurement stamp, measurement age, `has_x`, `published`, reason, `isIdentity`.

- [ ] **13f `tf-logic/` (fix).** Replace the file. Copy `buildVisionCorrectionTransform`, `normalizeAngle`. Simulation: raw pose moving along the aisle with yaw `33.5 + 12 sin(0.04 i)` deg; corrected pose = raw projected 0.3 m toward the centerline. Draw three axis triads: `map` at origin; `odom_vision_correction` at `mapToVisionOdom` translation rotated by its yaw (-aisle); `base_link_odom_vision_correction` at the raw pose composed under the parent; and the corrected pose. Panel: aisle yaw, `map -> odom_vision_correction` yaw = -aisle, `odom_vision_correction -> base` yaw = raw FCU yaw, composed yaw = fcu - aisle, translation, and the note "the child carries the raw FCU yaw; composition yields the FCU yaw relative to the aisle, which is what corrected_pose publishes".

- [ ] **13g `pipeline/` (update).** Copy the pipeline functions needed for a two-rack single frame: `fitLine2D`, `RecursiveLinRegFitter` (as a class), `lineExtent`, `alignLineToHeading`, `computeHeadingFromLineCoefficients`, `isBeamReliableForHeading`, `selectConsensusHeadingSamples`, `computeDualCenterline`, `LateralDriftFilter`, `buildVisionCorrectionTransform`, plus vector helpers. Simulation: the standalone generates two racks per frame as today (face plus interior) and runs: fit -> gate -> consensus -> dual centerline -> aisle state EMA (`aisle_tracker_dual_gain`) -> lateral filter -> transform. Panel adds hold reason, `freshHeading`, and the gate reason strings.

- [ ] **13h `synthetic-input/` (update).** Add uprights every 2.8 m, a mission map drawn in cyan at the map position and the odom image dimmed, and both odom offsets in the panel. Copy `headingVector`, `normalVector`, `makeRng`, `randNormal`.

- [ ] **13i `accumulation/` (update).** Copy `updateAccumulator` from `pose_corrector.js`. Panel states `enable_accumulation: false` by default and shows the single-frame fit beside the accumulated fit.

- [ ] **13j `rotation-filter/` (update).** Replace the local filter with the verbatim `rotationSearchFilter` and `applyTwoStageRotationFilter`; animate the coarse sweep with YAML `30 / 5 / 0.8` then the fine sweep `10 / 0.5 / 0.5`. Panel lists the eight `rot_*` keys.

- [ ] **13k `line-fit/` (update).** Replace `fitLine`/`recursiveFit` with `fitLine2D` and `RecursiveLinRegFitter.fitPlane`; animate `iterations`; add a final frame that shows the gap and span checks with `linreg_max_allowed_gap` and `linreg_min_line_length`; show `reason` when invalid.

- [ ] **13l `coefficient-smoothing/` (update).** Use `{a,b,c}` lines and the exact EMA from `buildBeamResultFromFit` (normalize, flip on negative dot, blend with `plane_coefficients_ema_alpha: 0.08`, renormalize). Show a sign-flip event.

- [ ] **13m `heading-consensus/` (update).** Replace the local consensus with `selectConsensusHeadingSamples` and the YAML 3 deg gate; take the first `max_beams_for_consensus` in detection order rather than sorting; include a beam that fails `isBeamReliableForHeading` and therefore never votes. Show the "both rejected -> held" case at a two-beam 8 deg split.

- [ ] **13n `centerline/` (update).** Use `computeDualCenterline` with its two validations and `buildCenterlineMeasurement`'s single-rack branch with the best-inlier beam and a calibrated half width; include a frozen-c fallback phase where both normals disagree.

- [ ] **13o `correction/` (update).** Copy `LateralDriftFilter` and `buildVisionCorrectionTransform`; add the x-offset step along the heading; the panel shows the y intercept and `drone_y_to_centerline`.

- [ ] **13p `failure-cases/` (update).** Drive the cases from a fault list matching the world's schedule ids and, for each, compute the node's reaction with the copied gate, consensus, and filter functions; the panel prints the actual hold reason or reset instead of a hand-written note.

Each sub-task ends with `node --check` and a commit `feat(navigation): <page> standalone page`.

---

### Task 14: README and final verification

**Files:**
- Modify: `p5sim/navigation/README.md`

- [ ] **Step 1: Rewrite the README** to the new file map (nine modules with their C++ twin), the sixteen demos with one line each, the reading order (`config -> geometry -> line_fitter -> aisle_state -> lateral_drift_filter -> heading -> x_offset -> correction_transform -> pose_corrector -> synthetic_world`), how to run the tests (`node p5sim/navigation/tests.js` or `tests.html`), and the note that all numbers come from the deployed YAML.
- [ ] **Step 2: Run everything** — `node p5sim/navigation/tests.js` (expect all passed), `node p5sim/navigation/scripts/demos_check.js`, and `for f in p5sim/navigation/*/sketch.js; do node --check "$f"; done`.
- [ ] **Step 3: Verify the puzzle-track links** — `grep -o 'navref("[a-z-]*"' p5sim/tf2_walkthrough/puzzles.js | sort -u` and confirm each folder still exists.
- [ ] **Step 4: Commit** — `docs(navigation): README for the aligned sim`.
