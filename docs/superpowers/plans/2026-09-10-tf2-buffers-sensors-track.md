# TF2 Buffers & Sensors Track Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Append Track 3 · Buffers & Sensors (puzzles 52 to 63): rotation conversions, URDF mounts, twists, lidar de-skewing, and the static-versus-dynamic buffer semantics of TF2 (latching, pruning, arrival latency, reparenting, and a buffer-aware lookup).

**Architecture:** Same pattern as Track 2: the catalog gains `ADVANCED_STAGES`, a fourth track entry, and arrays `ADVANCED_13` to `ADVANCED_15`; `puzzle()` picks the stage list by track. The `se3` scene gains `axis-angle` and `urdf` views and draws matrix results; new scene kinds `twist`, `deskew`, and `buffer` reuse existing primitives. The engine requires a reference link on every non-tf2 puzzle.

**Tech Stack:** Vanilla JavaScript, p5.js, Web Workers, Node 22 tests, `python -m http.server`.

**Spec:** `docs/superpowers/specs/2026-09-10-tf2-buffers-sensors-track-design.md`

---

## File Structure

Paths relative to `C:\Users\ashry\Programming Experiments\Animation`.

- `p5sim/tf2_walkthrough/puzzles.js` — `ADVANCED_STAGES`, four tracks, track-aware stage list, `ADVANCED_13`, `ADVANCED_14`, `ADVANCED_15`.
- `p5sim/tf2_walkthrough/puzzle-scenes.js` — se3 views `axis-angle` and `urdf`, matrix results in `rpy`, `twistScene`, `deskewScene`, `bufferScene`, `describe` additions.
- `p5sim/tf2_walkthrough/puzzle-engine.js` — reference required on every non-tf2 puzzle.
- `p5sim/tf2_walkthrough/puzzle-tests.js` — four-track assertions, Track 3 tests.
- `p5sim/tf2_walkthrough/README.md` — Track 3 section.

Conventions: commit messages end with the attribution lines in each commit step; run `node p5sim/tf2_walkthrough/puzzle-tests.js` and `node p5sim/tf2_walkthrough/tests.js` from the repo root (`21/21 tests passed` must hold); never `git add -A`.

---

### Task 1: Track scaffolding and Stage 13 (Conversions)

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzles.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-scenes.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-engine.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-tests.js`

- [ ] **Step 1: Update the track assertions and add failing Stage 13 tests**

In `puzzle-tests.js`, inside the test `"catalog track 1 has 27 puzzles and the whole catalog is sequential"`:

1. Replace `assert(["tf2", "toolkit"].includes(puzzle.track), …);` with:

```js
      assert(["tf2", "toolkit", "advanced"].includes(puzzle.track), puzzle.id + " has unknown track " + puzzle.track);
```

2. Replace the five lines from `same(api.TF2_PUZZLE_TRACKS.map((track) => track.id), ["tf2", "toolkit", "pose-correction"]);` through `assert(api.TF2_PUZZLE_TRACKS[2].stages.length === 4, "track 3 lists four placeholder stages");` with:

```js
    same(api.TF2_PUZZLE_TRACKS.map((track) => track.id), ["tf2", "toolkit", "advanced", "pose-correction"]);
    assert(api.TF2_PUZZLE_TRACKS[1].unlockAfter === "stamped-lookup", "track 2 unlocks after the capstone");
    assert(api.TF2_PUZZLE_TRACKS[1].stages.length === 5, "track 2 lists five stages");
    assert(api.TF2_PUZZLE_TRACKS[2].unlockAfter === "icp-match", "track 3 unlocks after the ICP finale");
    assert(api.TF2_PUZZLE_TRACKS[2].stages.length === 3, "track 3 lists three stages");
    assert(api.TF2_PUZZLE_TRACKS[3].unlockAfter === "buffer-lookup", "track 4 unlocks after the buffer finale");
    assert(api.TF2_PUZZLE_TRACKS[3].stages.length === 4, "track 4 lists four placeholder stages");
```

In the progress test, change the two track-state assertions to:

```js
    same(api.trackStates(tracks, progress).map((entry) => entry.state), ["available", "locked", "locked", "locked"]);
```

and

```js
    same(api.trackStates(tracks, progress).map((entry) => entry.state), ["available", "available", "locked", "locked"]);
```

Replace `function toolkitPuzzles() { return puzzleList().filter((puzzle) => puzzle.track === "toolkit"); }` with:

```js
  function toolkitPuzzles() { return puzzleList().filter((puzzle) => puzzle.track !== "tf2"); }
```

Append before `async function runAllTests()`:

```js
  // ---------------------------------------------------------------- advanced track
  test("catalog track 3 stage 13 contains the conversion bricks", () => {
    same(idsInRange(52, 55), ["rotation-matrix-from-quaternion", "quaternion-from-rotation-matrix", "quaternion-from-axis-angle", "axis-angle-from-quaternion"]);
  });

  test("catalog stage 13 references pass their cases and diagnoses differ", () => {
    checkStageRange(52, 55);
  });

  test("scenes: conversion views round-trip the slider rotation", () => {
    const api = scenesApi();
    const toMatrix = puzzlesApi().getPuzzle("rotation-matrix-from-quaternion");
    const toQuaternion = puzzlesApi().getPuzzle("quaternion-from-rotation-matrix");
    const values = api.initialValues(toMatrix);
    const q = api.toArgs(toMatrix, values)[0];
    const matrix = referenceOutput(toMatrix, [q]);
    const back = referenceOutput(toQuaternion, [matrix]);
    assert(valuesMatch("quaternion", back, q), "matrix → quaternion should recover the slider quaternion");
    const fromAxis = puzzlesApi().getPuzzle("quaternion-from-axis-angle");
    const toAxis = puzzlesApi().getPuzzle("axis-angle-from-quaternion");
    const axisValues = api.initialValues(fromAxis);
    const built = referenceOutput(fromAxis, api.toArgs(fromAxis, axisValues));
    const recovered = referenceOutput(toAxis, [built]);
    near(recovered.angle, Math.abs(axisValues.angle));
  });
```

- [ ] **Step 2: Run the tests and confirm the new and changed tests fail**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: about `40/48 puzzle tests passed` (track list, track states, stage 13 ids, references, scenes).

- [ ] **Step 3: Add the advanced stages, the fourth track, and the track-aware builder**

In `puzzles.js`, insert directly before `const TRACKS = Object.freeze([`:

```js
  const ADVANCED_STAGES = Object.freeze([
    { id: "conversions", title: "Conversions", subtitle: "Rotation matrices and axis-angle, both directions.", range: [52, 55] },
    { id: "sensors-motion", title: "Sensors & Motion", subtitle: "URDF mounts, body twists, and lidar de-skewing.", range: [56, 58] },
    { id: "buffer-semantics", title: "Buffer Semantics", subtitle: "Latching, pruning, arrival, reparenting, lookup.", range: [59, 63] },
  ]);
```

Replace the `TRACKS` block (from `const TRACKS = Object.freeze([` through its closing `]);`) with:

```js
  const TRACKS = Object.freeze([
    Object.freeze({ id: "tf2", title: "Track 1 · TF2", stages: STAGES }),
    Object.freeze({
      id: "toolkit",
      title: "Track 2 · Transform Toolkit",
      unlockAfter: "stamped-lookup",
      note: "Unlocks after the stamped lookup capstone.",
      stages: TOOLKIT_STAGES,
    }),
    Object.freeze({
      id: "advanced",
      title: "Track 3 · Buffers & Sensors",
      unlockAfter: "icp-match",
      note: "Unlocks after the ICP finale.",
      stages: ADVANCED_STAGES,
    }),
    Object.freeze({
      id: "pose-correction",
      title: "Track 4 · Pose Correction",
      unlockAfter: "buffer-lookup",
      note: "Unlocks after the buffer lookup finale. Puzzles arrive with the next track.",
      stages: Object.freeze([
        { id: "pointcloud-bricks", title: "Point-Cloud Bricks", subtitle: "Rack points, line fits, and distances.", range: [0, 0] },
        { id: "rack-filters", title: "Rack Filters", subtitle: "Accumulate, filter, smooth, and agree.", range: [0, 0] },
        { id: "aisle-correction", title: "Aisle Correction", subtitle: "Centerline, lateral error, corrected pose.", range: [0, 0] },
        { id: "correction-capstone", title: "Correction Capstone", subtitle: "Publish map → odom on a drifting robot.", range: [0, 0] },
      ]),
    }),
  ]);
```

Replace `    const stageList = track === "toolkit" ? TOOLKIT_STAGES : STAGES;` with:

```js
    const stageList = track === "toolkit" ? TOOLKIT_STAGES : (track === "advanced" ? ADVANCED_STAGES : STAGES);
```

- [ ] **Step 4: Add the Stage 13 puzzles**

Insert directly before `const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7, TOOLKIT_8, TOOLKIT_9, TOOLKIT_10, TOOLKIT_11, TOOLKIT_12));`:

```js
  const TF2_MATRIX3 = "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Matrix3x3.html";
  const TF2_QUATERNION = "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Quaternion.html";
  const IDENTITY_M3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const Z90_M3 = [[0, -1, 0], [1, 0, 0], [0, 0, 1]];
  const Y90_M3 = [[0, 0, 1], [0, 1, 0], [-1, 0, 0]];
  const X90_M3 = [[1, 0, 0], [0, 0, -1], [0, 1, 0]];
  const Z180_M3 = [[-1, 0, 0], [0, -1, 0], [0, 0, 1]];
  const AXIS_SLIDERS = [
    { id: "axisYaw", type: "slider", label: "axis yaw", value: 0.8, min: -PI, max: PI },
    { id: "axisPitch", type: "slider", label: "axis pitch", value: 0.5, min: -PI / 2, max: PI / 2 },
    { id: "angle", type: "slider", label: "angle", value: 1.2, min: -PI, max: PI },
  ];

  const ADVANCED_13 = [
    puzzle({
      number: 52, id: "rotation-matrix-from-quaternion", track: "advanced", title: "Quaternion to Rotation Matrix",
      goal: "Convert a quaternion into the 3×3 rotation matrix whose columns are the rotated axes.",
      concept: "Eigen, tf2::Matrix3x3, and every SLAM paper switch between these forms constantly.",
      functionName: "rotationMatrixFromQuaternion", signature: "rotationMatrixFromQuaternion(q) → 3×3",
      starterSource: starter("rotationMatrixFromQuaternion", "q", "Normalize first; then the standard 1 − 2(y² + z²), 2(xy − wz), … formula."),
      referenceSource: lines(
        "function rotationMatrixFromQuaternion(q) {",
        "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  var x = q.x / n, y = q.y / n, z = q.z / n, w = q.w / n;",
        "  return [",
        "    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],",
        "    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],",
        "    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],",
        "  ];",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "se3",
      reference: docref("tf2 · Matrix3x3::setRotation", TF2_MATRIX3),
      scene: { kind: "se3", view: "rpy", handles: RPY_SLIDERS, args: [{ fixture: "quatFromRPY" }] },
      diagnoses: [
        diagnosis("transposed", "That is the transpose, the inverse rotation: the sign pattern is +wz in row 1 column 0 and −wz in row 0 column 1.", lines(
          "function rotationMatrixFromQuaternion(q) {",
          "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  var x = q.x / n, y = q.y / n, z = q.z / n, w = q.w / n;",
          "  return [[1 - 2 * (y * y + z * z), 2 * (x * y + w * z), 2 * (x * z - w * y)], [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)], [2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y)]];",
          "}"
        )),
        diagnosis("not-normalized", "The quaternion was not normalized: a scaled quaternion produces a scaled, non-orthonormal matrix.", lines(
          "function rotationMatrixFromQuaternion(q) {",
          "  var x = q.x, y = q.y, z = q.z, w = q.w;",
          "  return [[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)], [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)], [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]];",
          "}"
        )),
      ],
      hints: ["Each column is where one axis lands: R·(1,0,0), R·(0,1,0), R·(0,0,1).", "Diagonal: 1 − 2(sum of the other two squares); off-diagonal: 2(product ± w·other).", "Row 0: [1 − 2(y²+z²), 2(xy − wz), 2(xz + wy)]; then cycle."],
      cases: [
        example([IDENTITY_Q], IDENTITY_M3, "identity"),
        example([Z90], Z90_M3, "Z quarter turn"),
        example([Y90], Y90_M3, "Y quarter turn"),
        example([X90], X90_M3, "X quarter turn"),
        example([{ x: 0, y: 0, z: 2 * HALF, w: 2 * HALF }], Z90_M3, "non-unit input"),
      ],
    }),
    puzzle({
      number: 53, id: "quaternion-from-rotation-matrix", track: "advanced", title: "Rotation Matrix to Quaternion",
      goal: "Recover a quaternion from a rotation matrix without losing precision at 180°.",
      concept: "Pick the largest of the trace and the three diagonal entries so the division is never by a tiny number.",
      functionName: "quaternionFromRotationMatrix", signature: "quaternionFromRotationMatrix(m) → quaternion",
      starterSource: starter("quaternionFromRotationMatrix", "m"),
      referenceSource: lines(
        "function quaternionFromRotationMatrix(m) {",
        "  var trace = m[0][0] + m[1][1] + m[2][2], s;",
        "  if (trace > 0) {",
        "    s = Math.sqrt(trace + 1) * 2;",
        "    return { x: (m[2][1] - m[1][2]) / s, y: (m[0][2] - m[2][0]) / s, z: (m[1][0] - m[0][1]) / s, w: 0.25 * s };",
        "  }",
        "  if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {",
        "    s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2;",
        "    return { x: 0.25 * s, y: (m[0][1] + m[1][0]) / s, z: (m[0][2] + m[2][0]) / s, w: (m[2][1] - m[1][2]) / s };",
        "  }",
        "  if (m[1][1] > m[2][2]) {",
        "    s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2;",
        "    return { x: (m[0][1] + m[1][0]) / s, y: 0.25 * s, z: (m[1][2] + m[2][1]) / s, w: (m[0][2] - m[2][0]) / s };",
        "  }",
        "  s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2;",
        "  return { x: (m[0][2] + m[2][0]) / s, y: (m[1][2] + m[2][1]) / s, z: 0.25 * s, w: (m[1][0] - m[0][1]) / s };",
        "}"
      ),
      comparator: "quaternion", walkthroughChapter: "se3",
      reference: docref("tf2 · Matrix3x3::getRotation", TF2_MATRIX3),
      scene: { kind: "se3", view: "rpy", handles: RPY_SLIDERS, args: [{ fixture: "matrixFromRPY" }] },
      diagnoses: [
        diagnosis("trace-only", "Only the trace branch was used: at 180° the trace is −1 and the square root is zero, so the result blows up. Branch on the largest diagonal entry.", lines(
          "function quaternionFromRotationMatrix(m) {",
          "  var s = Math.sqrt(m[0][0] + m[1][1] + m[2][2] + 1) * 2;",
          "  return { x: (m[2][1] - m[1][2]) / s, y: (m[0][2] - m[2][0]) / s, z: (m[1][0] - m[0][1]) / s, w: 0.25 * s };",
          "}"
        )),
        diagnosis("conjugated", "The vector part has the wrong sign: x uses m21 − m12, not m12 − m21.", lines(
          "function quaternionFromRotationMatrix(m) {",
          "  var trace = m[0][0] + m[1][1] + m[2][2], s;",
          "  if (trace > 0) { s = Math.sqrt(trace + 1) * 2; return { x: (m[1][2] - m[2][1]) / s, y: (m[2][0] - m[0][2]) / s, z: (m[0][1] - m[1][0]) / s, w: 0.25 * s }; }",
          "  if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) { s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2; return { x: -0.25 * s, y: -(m[0][1] + m[1][0]) / s, z: -(m[0][2] + m[2][0]) / s, w: (m[2][1] - m[1][2]) / s }; }",
          "  if (m[1][1] > m[2][2]) { s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2; return { x: -(m[0][1] + m[1][0]) / s, y: -0.25 * s, z: -(m[1][2] + m[2][1]) / s, w: (m[0][2] - m[2][0]) / s }; }",
          "  s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2;",
          "  return { x: -(m[0][2] + m[2][0]) / s, y: -(m[1][2] + m[2][1]) / s, z: -0.25 * s, w: (m[1][0] - m[0][1]) / s };",
          "}"
        )),
      ],
      hints: ["When the trace is positive, w = √(trace + 1) / 2 and the vector part comes from the antisymmetric entries.", "Otherwise pick the largest diagonal entry and solve for that component first.", "Four branches: trace, m00, m11, m22; each divides by s = 2·√(1 + chosen − others)."],
      cases: [
        example([IDENTITY_M3], IDENTITY_Q, "identity"),
        example([Z90_M3], Z90, "Z quarter turn"),
        example([Z180_M3], { x: 0, y: 0, z: 1, w: 0 }, "Z half turn (trace −1)"),
        example([X90_M3], X90, "X quarter turn"),
        example([Y90_M3], Y90, "Y quarter turn"),
      ],
    }),
    puzzle({
      number: 54, id: "quaternion-from-axis-angle", track: "advanced", title: "Axis-Angle to Quaternion",
      goal: "Build the quaternion for a rotation of angle about an axis.",
      concept: "A quaternion is literally (axis · sin(θ/2), cos(θ/2)); yaw quaternions were the Z-axis special case.",
      functionName: "quaternionFromAxisAngle", signature: "quaternionFromAxisAngle(axis, angle) → quaternion",
      starterSource: starter("quaternionFromAxisAngle", "axis, angle", "Normalize the axis; multiply it by sin(angle/2); w = cos(angle/2)."),
      referenceSource: lines(
        "function quaternionFromAxisAngle(axis, angle) {",
        "  var n = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);",
        "  var s = Math.sin(angle / 2);",
        "  return { x: axis.x / n * s, y: axis.y / n * s, z: axis.z / n * s, w: Math.cos(angle / 2) };",
        "}"
      ),
      comparator: "quaternion", walkthroughChapter: "se3",
      reference: docref("tf2 · Quaternion::setRotation(axis, angle)", TF2_QUATERNION),
      scene: { kind: "se3", view: "axis-angle", handles: AXIS_SLIDERS, args: [{ fixture: "axisFromSliders" }, { handle: "angle" }] },
      diagnoses: [
        diagnosis("full-angle", "Used the full angle: quaternions store half angles.", "function quaternionFromAxisAngle(axis, angle) { var n = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z); var s = Math.sin(angle); return { x: axis.x / n * s, y: axis.y / n * s, z: axis.z / n * s, w: Math.cos(angle) }; }"),
        diagnosis("axis-not-normalized", "The axis was not normalized, so the quaternion length depends on the axis length.", "function quaternionFromAxisAngle(axis, angle) { var s = Math.sin(angle / 2); return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(angle / 2) }; }"),
      ],
      hints: ["The axis must be a unit vector.", "Vector part = axis · sin(angle/2); scalar part = cos(angle/2).", "Divide the axis by its length before scaling by sin(angle/2)."],
      cases: [
        example([{ x: 0, y: 0, z: 1 }, PI / 2], Z90, "Z quarter turn"),
        example([{ x: 1, y: 0, z: 0 }, PI / 2], X90, "X quarter turn"),
        example([{ x: 0, y: 0, z: 2 }, PI], { x: 0, y: 0, z: 1, w: 0 }, "non-unit axis"),
        example([{ x: 1, y: 1, z: 0 }, PI], { x: HALF, y: HALF, z: 0, w: 0 }, "diagonal axis"),
        example([{ x: 0, y: 1, z: 0 }, 0], IDENTITY_Q, "zero angle"),
      ],
    }),
    puzzle({
      number: 55, id: "axis-angle-from-quaternion", track: "advanced", title: "Quaternion to Axis-Angle",
      goal: "Recover the rotation axis and the angle in [0, π] from a quaternion.",
      concept: "q and −q are the same rotation, so flip the sign when w is negative to get the short angle.",
      functionName: "axisAngleFromQuaternion", signature: "axisAngleFromQuaternion(q) → { axis, angle }",
      starterSource: starter("axisAngleFromQuaternion", "q", "Normalize; flip q if w < 0; angle = 2·atan2(|v|, w); axis = v / |v| (or +Z when |v| ≈ 0)."),
      referenceSource: lines(
        "function axisAngleFromQuaternion(q) {",
        "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  var x = q.x / n, y = q.y / n, z = q.z / n, w = q.w / n;",
        "  if (w < 0) { x = -x; y = -y; z = -z; w = -w; }",
        "  var s = Math.sqrt(x * x + y * y + z * z);",
        "  if (s < 1e-9) return { axis: { x: 0, y: 0, z: 1 }, angle: 0 };",
        "  return { axis: { x: x / s, y: y / s, z: z / s }, angle: 2 * Math.atan2(s, w) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "se3",
      reference: docref("tf2 · Quaternion::getAxis / getAngle", TF2_QUATERNION),
      scene: { kind: "se3", view: "axis-angle", handles: AXIS_SLIDERS, args: [{ fixture: "quatFromAxisAngle" }] },
      diagnoses: [
        diagnosis("no-flip", "A negative w gives the long way around (angle > π) and a flipped axis: negate the whole quaternion first.", lines(
          "function axisAngleFromQuaternion(q) {",
          "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  var x = q.x / n, y = q.y / n, z = q.z / n, w = q.w / n;",
          "  var s = Math.sqrt(x * x + y * y + z * z);",
          "  if (s < 1e-9) return { axis: { x: 0, y: 0, z: 1 }, angle: 0 };",
          "  return { axis: { x: x / s, y: y / s, z: z / s }, angle: 2 * Math.atan2(s, w) };",
          "}"
        )),
        diagnosis("axis-unnormalized", "The axis is the vector part divided by its length, not the raw vector part.", lines(
          "function axisAngleFromQuaternion(q) {",
          "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  var x = q.x / n, y = q.y / n, z = q.z / n, w = q.w / n;",
          "  if (w < 0) { x = -x; y = -y; z = -z; w = -w; }",
          "  var s = Math.sqrt(x * x + y * y + z * z);",
          "  if (s < 1e-9) return { axis: { x: 0, y: 0, z: 1 }, angle: 0 };",
          "  return { axis: { x: x, y: y, z: z }, angle: 2 * Math.atan2(s, w) };",
          "}"
        )),
      ],
      hints: ["|v| = sin(θ/2) and w = cos(θ/2) for a unit quaternion.", "angle = 2·atan2(|v|, w); axis = v / |v|.", "Negate q when w < 0 so the angle stays within [0, π]; return +Z with angle 0 for the identity."],
      cases: [
        example([Z90], { axis: { x: 0, y: 0, z: 1 }, angle: PI / 2 }, "Z quarter turn"),
        example([X90], { axis: { x: 1, y: 0, z: 0 }, angle: PI / 2 }, "X quarter turn"),
        example([{ x: 0, y: 0, z: 1, w: 0 }], { axis: { x: 0, y: 0, z: 1 }, angle: PI }, "half turn"),
        example([IDENTITY_Q], { axis: { x: 0, y: 0, z: 1 }, angle: 0 }, "identity"),
        example([{ x: 0, y: 0, z: -HALF, w: -HALF }], { axis: { x: 0, y: 0, z: 1 }, angle: PI / 2 }, "negated quaternion"),
      ],
    }),
  ];
```

Then change the `PUZZLES` line to:

```js
  const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7, TOOLKIT_8, TOOLKIT_9, TOOLKIT_10, TOOLKIT_11, TOOLKIT_12, ADVANCED_13));
```

- [ ] **Step 5: Require references on every non-tf2 puzzle**

In `puzzle-engine.js`, replace `if (puzzle.track === "toolkit" && !(puzzle.reference && typeof puzzle.reference.url === "string"))` with `if (puzzle.track !== "tf2" && !(puzzle.reference && typeof puzzle.reference.url === "string"))` (rest of the line unchanged).

- [ ] **Step 6: Extend the SE(3) scene**

In `puzzle-scenes.js`:

1. In `describe`, insert directly after `if ("roll" in value && "pitch" in value && "yaw" in value) return …;`:

```js
      if (value.axis && Number.isFinite(value.angle)) return "axis " + fmtVector3(value.axis) + " · " + degrees(value.angle);
      if (Number.isFinite(value.vx) && Number.isFinite(value.vy) && Number.isFinite(value.wz)) return "vx " + fmt(value.vx) + " · vy " + fmt(value.vy) + " · wz " + fmt(value.wz);
      if (value.edges && Number.isFinite(value.duration)) return Object.keys(value.edges).map((child) => child + ": " + (value.edges[child].isStatic ? "static" : (value.edges[child].samples || []).map((s) => fmt(s.time)).join("/"))).join(" · ");
```

2. Insert directly before `const se3Scene = {`:

```js
  function matrixFromQuaternion(q) {
    const u = qnormalize(q);
    const x = u.x, y = u.y, z = u.z, w = u.w;
    return [
      [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
      [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
      [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
    ];
  }
  function basisFromMatrix(m) {
    return { x: { x: m[0][0], y: m[1][0], z: m[2][0] }, y: { x: m[0][1], y: m[1][1], z: m[2][1] }, z: { x: m[0][2], y: m[1][2], z: m[2][2] } };
  }
  function quatFromAxisAngle(axis, angle) {
    const n = Math.hypot(axis.x, axis.y, axis.z) || 1;
    const s = Math.sin(angle / 2);
    return { x: axis.x / n * s, y: axis.y / n * s, z: axis.z / n * s, w: Math.cos(angle / 2) };
  }
  function scaled3(v, k) { return { x: v.x * k, y: v.y * k, z: v.z * k }; }
  function isAxisAngle(v) { return Boolean(v) && typeof v === "object" && isVector3(v.axis) && Number.isFinite(v.angle); }
  const URDF_XYZ = [0.6, 0.2, 0.4];
```

3. In the `se3Scene.fixtures` object, insert after the `opticalRay:` line:

```js
      matrixFromRPY: (values) => matrixFromQuaternion(qFromRPY(values.roll, values.pitch, values.yaw)),
      axisFromSliders: (values) => direction3(values.axisYaw, values.axisPitch),
      quatFromAxisAngle: (values) => quatFromAxisAngle(direction3(values.axisYaw, values.axisPitch), values.angle),
      urdfXyz: () => URDF_XYZ.slice(),
      rpyArray: (values) => [values.roll, values.pitch, values.yaw],
```

4. In the `rpy` view branch, insert after the line `if (isQuaternion(context.actual)) drawBasis(context.actual, resultLabel(context), resultStyle(context), false);` that belongs to that branch (the first occurrence inside `} else if (view === "rpy") {`):

```js
        if (isMatrix(context.expected, 3)) out.push(axes3d(ORIGIN3, basisFromMatrix(context.expected), "expected", "expected", { dashed: true }));
        if (isMatrix(context.actual, 3)) out.push(axes3d(ORIGIN3, basisFromMatrix(context.actual), resultLabel(context), resultStyle(context)));
```

5. Insert directly before the final `} else {` of `se3Scene.layers` (the branch that precedes `out.push(...notes(`):

```js
      } else if (view === "axis-angle") {
        const axis = se3Scene.fixtures.axisFromSliders(context.values);
        out.push(arrow3d(ORIGIN3, scaled3(axis, 1.4), "axis · angle " + degrees(context.values.angle), "input"));
        if (isQuaternion(context.expected)) drawBasis(context.expected, "expected", "expected", true);
        if (isQuaternion(context.actual)) drawBasis(context.actual, resultLabel(context), resultStyle(context), false);
        if (isAxisAngle(context.expected)) out.push(arrow3d(ORIGIN3, scaled3(context.expected.axis, 1.2), "expected axis · " + degrees(context.expected.angle), "expected", { dashed: true }));
        if (isAxisAngle(context.actual)) out.push(arrow3d(ORIGIN3, scaled3(context.actual.axis, 1.0), resultLabel(context) + " · " + degrees(context.actual.angle), resultStyle(context)));
      } else if (view === "urdf") {
        const xyz = se3Scene.fixtures.urdfXyz();
        out.push(label("<origin xyz=\"" + xyz.join(" ") + "\" rpy=\"" + [context.values.roll, context.values.pitch, context.values.yaw].map((v) => v.toFixed(2)).join(" ") + "\"/>", "input", { row: 3 }));
        if (isSE3(context.expected)) out.push(axes3d(context.expected.translation, basisOf(context.expected.rotation), "expected mount", "expected", { dashed: true }));
        if (isSE3(context.actual)) out.push(axes3d(context.actual.translation, basisOf(context.actual.rotation), resultLabel(context), resultStyle(context)));
```

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `48/48 puzzle tests passed`.

- [ ] **Step 8: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzles.js p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-engine.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: add buffers and sensors track with rotation conversion stage

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014bGFMz54uBLRNsi4hos8KD"
```

---

### Task 2: Stage 14 (Sensors & Motion) with twist and deskew scenes

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzles.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-scenes.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-tests.js`

- [ ] **Step 1: Add failing tests**

Append to `puzzle-tests.js` before `async function runAllTests()`:

```js
  test("catalog track 3 stage 14 contains the sensor and motion bricks", () => {
    same(idsInRange(56, 58), ["static-from-urdf", "twist-from-poses", "deskew-scan"]);
  });

  test("catalog stage 14 references pass their cases and diagnoses differ", () => {
    checkStageRange(56, 58);
  });

  test("scenes: twist and deskew kinds build valid arguments, and de-skewing straightens the wall", () => {
    checkSceneKinds(["twist", "deskew"]);
    const api = scenesApi();
    const puzzle = puzzlesApi().getPuzzle("deskew-scan");
    const values = api.initialValues(puzzle);
    const args = api.toArgs(puzzle, values);
    const deskewed = referenceOutput(puzzle, args);
    assert(deskewed.length === 12, "twelve de-skewed points");
    deskewed.forEach((point, i) => {
      const world = api.se2.applyPoint(values.end, point);
      near(world.x, 3);
      near(world.y, -1.5 + 3 * i / 11);
    });
  });
```

- [ ] **Step 2: Run the tests and confirm the new tests fail**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `48/51 puzzle tests passed`.

- [ ] **Step 3: Add the Stage 14 puzzles**

Insert directly before `const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7, TOOLKIT_8, TOOLKIT_9, TOOLKIT_10, TOOLKIT_11, TOOLKIT_12, ADVANCED_13));`:

```js
  const ADVANCED_14 = [
    puzzle({
      number: 56, id: "static-from-urdf", track: "advanced", title: "Static Mount from URDF",
      goal: "Turn a URDF <origin xyz rpy> into the SE(3) transform a static broadcaster publishes.",
      concept: "Every sensor mount on a real robot is specified exactly this way; robot_state_publisher turns it into a static TF.",
      functionName: "staticFromUrdf", signature: "staticFromUrdf(xyz, rpy) → { translation, rotation }",
      starterSource: starter("staticFromUrdf", "xyz, rpy", "xyz is [x, y, z] metres; rpy is [roll, pitch, yaw] radians."),
      referenceSource: lines(
        "function staticFromUrdf(xyz, rpy) {",
        "  return { translation: { x: xyz[0], y: xyz[1], z: xyz[2] }, rotation: quaternionFromRPY(rpy[0], rpy[1], rpy[2]) };",
        "}"
      ),
      comparator: "se3", walkthroughChapter: "broadcasters",
      dependencies: ["quaternion-from-rpy"],
      reference: docref("URDF · <joint> <origin xyz rpy>", "https://wiki.ros.org/urdf/XML/joint"),
      scene: { kind: "se3", view: "urdf", handles: [
        { id: "roll", type: "slider", label: "roll", value: 0.2, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "pitch", value: -0.1, min: -PI / 2, max: PI / 2 },
        { id: "yaw", type: "slider", label: "yaw", value: 1.2, min: -PI, max: PI },
      ], args: [{ fixture: "urdfXyz" }, { fixture: "rpyArray" }] },
      diagnoses: [
        diagnosis("degrees-assumed", "URDF angles are radians already; converting from degrees shrinks them.", "function staticFromUrdf(xyz, rpy) { return { translation: { x: xyz[0], y: xyz[1], z: xyz[2] }, rotation: quaternionFromRPY(rpy[0] * Math.PI / 180, rpy[1] * Math.PI / 180, rpy[2] * Math.PI / 180) }; }"),
        diagnosis("rpy-order-swapped", "The array is [roll, pitch, yaw]; it was read as [yaw, pitch, roll].", "function staticFromUrdf(xyz, rpy) { return { translation: { x: xyz[0], y: xyz[1], z: xyz[2] }, rotation: quaternionFromRPY(rpy[2], rpy[1], rpy[0]) }; }"),
      ],
      hints: ["Translation is the xyz triple as is.", "Rotation is quaternionFromRPY(roll, pitch, yaw) with the array in that order.", "Return { translation: { x: xyz[0], y: xyz[1], z: xyz[2] }, rotation: quaternionFromRPY(rpy[0], rpy[1], rpy[2]) }."],
      cases: [
        example([[0.2, 0, 0.1], [0, 0, PI / 2]], { translation: { x: 0.2, y: 0, z: 0.1 }, rotation: Z90 }, "laser mount"),
        example([[0, 0, 0], [PI / 2, 0, 0]], { translation: { x: 0, y: 0, z: 0 }, rotation: X90 }, "roll only"),
        example([[1, 2, 3], [0, 0, 0]], { translation: { x: 1, y: 2, z: 3 }, rotation: IDENTITY_Q }, "translation only"),
        example([[0, 0, 0], [-PI / 2, 0, -PI / 2]], { translation: { x: 0, y: 0, z: 0 }, rotation: { x: -0.5, y: 0.5, z: -0.5, w: 0.5 } }, "camera optical mount"),
      ],
    }),
    puzzle({
      number: 57, id: "twist-from-poses", track: "advanced", title: "Twist from Two Poses",
      goal: "Estimate the body-frame velocity between two stamped poses.",
      concept: "Odometry messages carry a twist in the child frame; it is relativeTransform divided by dt.",
      functionName: "twistFromPoses", signature: "twistFromPoses(a, b, dt) → { vx, vy, wz }",
      starterSource: starter("twistFromPoses", "a, b, dt", "relativeTransform(a, b) is the motion seen from a; divide by dt."),
      referenceSource: lines(
        "function twistFromPoses(a, b, dt) {",
        "  var relative = relativeTransform(a, b);",
        "  return { vx: relative.x / dt, vy: relative.y / dt, wz: relative.yaw / dt };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["relative-transform"],
      reference: docref("nav_msgs/Odometry · twist is expressed in the child frame", "https://docs.ros.org/en/rolling/p/nav_msgs/msg/Odometry.html"),
      scene: { kind: "twist", handles: [
        { id: "a", type: "pose", label: "a", value: { x: -2, y: -0.5, yaw: 0.3 } },
        { id: "b", type: "pose", label: "b", value: { x: 0.5, y: 0.8, yaw: 0.9 } },
        { id: "dt", type: "slider", label: "dt (s)", value: 1.0, min: 0.1, max: 2 },
      ] },
      diagnoses: [
        diagnosis("world-frame-delta", "That is the world-frame displacement: a twist is expressed in a's body frame, so use relativeTransform first.", "function twistFromPoses(a, b, dt) { return { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt, wz: wrapAngle(b.yaw - a.yaw) / dt }; }"),
        diagnosis("no-dt", "Not divided by dt: a twist is a rate, not a displacement.", "function twistFromPoses(a, b, dt) { var relative = relativeTransform(a, b); return { vx: relative.x, vy: relative.y, wz: relative.yaw }; }"),
      ],
      hints: ["Where is b as seen from a? That is relativeTransform(a, b).", "Divide each component by dt.", "Return { vx: rel.x / dt, vy: rel.y / dt, wz: rel.yaw / dt }."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, { x: 1, y: 0, yaw: 0 }, 0.5], { vx: 2, vy: 0, wz: 0 }, "forward"),
        example([{ x: 0, y: 0, yaw: PI / 2 }, { x: 0, y: 1, yaw: PI / 2 }, 1], { vx: 1, vy: 0, wz: 0 }, "forward while facing +y"),
        example([{ x: 0, y: 0, yaw: 0 }, { x: 0, y: 0, yaw: 0.2 }, 0.1], { vx: 0, vy: 0, wz: 2 }, "turn in place"),
        example([{ x: 1, y: 1, yaw: PI }, { x: 0, y: 1, yaw: PI }, 1], { vx: 1, vy: 0, wz: 0 }, "forward while facing −x"),
      ],
    }),
    puzzle({
      number: 58, id: "deskew-scan", track: "advanced", title: "De-skew a Lidar Scan",
      goal: "Re-express every scan point, measured at its own time, in the sensor frame at the end of the scan.",
      concept: "A spinning lidar moves while it scans; without de-skewing, a straight wall bends.",
      functionName: "deskewScan", signature: "deskewScan(points, times, samples, endTime) → points",
      starterSource: starter("deskewScan", "points, times, samples, endTime"),
      referenceSource: lines(
        "function deskewScan(points, times, samples, endTime) {",
        "  var toEnd = invert(sampleEdge({ samples: samples }, endTime));",
        "  var out = [];",
        "  for (var i = 0; i < points.length; i += 1) {",
        "    var poseAtTime = sampleEdge({ samples: samples }, times[i]);",
        "    out.push(transformPoint(compose(toEnd, poseAtTime), points[i]));",
        "  }",
        "  return out;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      dependencies: ["sample-edge", "compose", "invert", "transform-point"],
      reference: docref("laser_geometry · LaserProjection::transformLaserScanToPointCloud", "https://docs.ros.org/en/rolling/p/laser_geometry/"),
      scene: { kind: "deskew", handles: [{ id: "end", type: "pose", label: "sensor at t=1", value: { x: 1.2, y: 0.3, yaw: 0.4 } }], args: [{ fixture: "rawPoints" }, { fixture: "times" }, { fixture: "samples" }, 1] },
      diagnoses: [
        diagnosis("no-interpolation", "Every point used the end pose, so nothing moved: sample the pose at each point's own time.", lines(
          "function deskewScan(points, times, samples, endTime) {",
          "  var endPose = sampleEdge({ samples: samples }, endTime);",
          "  var toEnd = invert(endPose);",
          "  return points.map(function (point) { return transformPoint(compose(toEnd, endPose), point); });",
          "}"
        )),
        diagnosis("inverse-direction", "The composition is backwards: go from the point's frame up to odom, then down into the end frame: compose(invert(endPose), poseAtTime).", lines(
          "function deskewScan(points, times, samples, endTime) {",
          "  var endPose = sampleEdge({ samples: samples }, endTime);",
          "  var out = [];",
          "  for (var i = 0; i < points.length; i += 1) {",
          "    var poseAtTime = sampleEdge({ samples: samples }, times[i]);",
          "    out.push(transformPoint(compose(invert(poseAtTime), endPose), points[i]));",
          "  }",
          "  return out;",
          "}"
        )),
      ],
      hints: ["Each point lives in the sensor frame at its own time.", "Go up to odom with the pose at that time, then down into the end frame with the inverse of the end pose.", "T = compose(invert(pose(endTime)), pose(times[i])); apply it to points[i]."],
      cases: [
        example([[{ x: 3, y: 0 }, { x: 3, y: 1 }], [0, 0.5], [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 1, transform: { x: 0, y: 0, yaw: 0 } }], 1], [{ x: 3, y: 0 }, { x: 3, y: 1 }], "stationary sensor"),
        example([[{ x: 3, y: 0 }, { x: 2.5, y: 0 }, { x: 2, y: 0 }], [0, 0.5, 1], [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 1, transform: { x: 1, y: 0, yaw: 0 } }], 1], [{ x: 2, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 0 }], "moving forward"),
        example([[{ x: 1, y: 0 }, { x: 0.5, y: 0 }], [0, 1], [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 1, transform: { x: 0, y: 0, yaw: PI / 2 } }], 1], [{ x: 0, y: -1 }, { x: 0.5, y: 0 }], "turning in place"),
        example([[], [], [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 1, transform: { x: 1, y: 0, yaw: 0 } }], 1], [], "empty scan"),
      ],
    }),
  ];
```

Then change the `PUZZLES` line to:

```js
  const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7, TOOLKIT_8, TOOLKIT_9, TOOLKIT_10, TOOLKIT_11, TOOLKIT_12, ADVANCED_13, ADVANCED_14));
```

- [ ] **Step 4: Add the twist and deskew scenes**

In `puzzle-scenes.js`, in `describe`, insert directly after the line `if (value.every((item) => typeof item === "string")) return value.join(" → ");`:

```js
      if (value.length && value.every(isPoint)) return value.length + " points · first " + fmtPoint(value[0]);
```

Insert directly before `const SCENES = {`:

```js
  // ------------------------------------------------------------ sensors and motion
  function isTwist(v) { return Boolean(v) && typeof v === "object" && ["vx", "vy", "wz"].every((key) => Number.isFinite(v[key])); }
  const twistScene = {
    fixtures: {},
    layers(context) {
      const a = context.values.a;
      const b = context.values.b;
      const out = [arrow(a, b, "muted", { dashed: true, weight: 1 }), glyph(a, "a (t)", "input"), glyph(b, "b (t + dt)", "input"), ...laneLayers(context.puzzle, context.values)];
      const drawTwist = (twist, style, dashed, text) => {
        const velocity = rotate({ x: twist.vx, y: twist.vy }, a.yaw);
        out.push(arrow(a, add(a, velocity), style, { dashed, weight: dashed ? 2 : 3 }));
        out.push(arc(a, 0.7, a.yaw, a.yaw + twist.wz, style, { dashed, arrowhead: true }));
        out.push(label(text, style, { at: add(add(a, velocity), { x: 0.15, y: 0.2 }) }));
      };
      if (isTwist(context.expected)) drawTwist(context.expected, "expected", true, "expected · one second of motion");
      if (isTwist(context.actual)) drawTwist(context.actual, resultStyle(context), false, resultLabel(context));
      out.push(...notes(context, describe(context.expected), describe(context.actual), ["dt = " + fmt(context.values.dt) + " s · arrows show one second of the twist in a's body frame"]));
      return out;
    },
  };
  const WALL_POINTS = (() => {
    const list = [];
    for (let i = 0; i < 12; i += 1) list.push({ x: 3, y: -1.5 + 3 * i / 11 });
    return list;
  })();
  const SCAN_TIMES = WALL_POINTS.map((point, i) => i / 11);
  function scanSamples(values) { return [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 1, transform: values.end }]; }
  function scanPoseAt(values, time) { return lerpTransform({ x: 0, y: 0, yaw: 0 }, values.end, time); }
  function rawScan(values) { return WALL_POINTS.map((point, i) => applyPoint(invert(scanPoseAt(values, SCAN_TIMES[i])), point)); }
  const deskewScene = {
    fixtures: { rawPoints: rawScan, times: () => SCAN_TIMES.slice(), samples: scanSamples },
    layers(context) {
      const end = context.values.end;
      const raw = rawScan(context.values);
      const out = [
        pointsPrimitive(WALL_POINTS, "muted", { size: 6, label: "wall (odom)" }),
        glyph({ x: 0, y: 0, yaw: 0 }, "sensor at t=0", "muted"),
        glyph(end, "sensor at t=1", "input"),
        pointsPrimitive(raw.map((p) => applyPoint(end, p)), "input", { size: 5, label: "raw scan drawn at t=1 (bent)" }),
      ];
      if (isCloud(context.expected)) out.push(pointsPrimitive(context.expected.map((p) => applyPoint(end, p)), "expected", { size: 4, label: "expected de-skewed" }));
      if (isCloud(context.actual)) out.push(pointsPrimitive(context.actual.map((p) => applyPoint(end, p)), resultStyle(context), { size: 4, label: resultLabel(context) }));
      out.push(...notes(context, describe(context.expected), describe(context.actual), ["all points are drawn in odom by applying the t=1 sensor pose"]));
      return out;
    },
  };
```

Add to the `SCENES` literal after `"cloud-align": cloudAlignScene,`:

```js
    "twist": twistScene,
    "deskew": deskewScene,
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `51/51 puzzle tests passed`.

- [ ] **Step 6: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzles.js p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: add URDF mount, twist, and lidar de-skew puzzles

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014bGFMz54uBLRNsi4hos8KD"
```

---

### Task 3: Stage 15 (Buffer Semantics), the buffer scene, README, verification

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzles.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-scenes.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-tests.js`
- Modify: `p5sim/tf2_walkthrough/README.md`

- [ ] **Step 1: Add failing tests**

Append to `puzzle-tests.js` before `async function runAllTests()`:

```js
  test("catalog track 3 stage 15 contains the buffer semantics ladder", () => {
    same(idsInRange(59, 63), ["insert-transform", "parent-at", "buffer-can-transform", "wait-for-transform", "buffer-lookup"]);
    assert(puzzleList().length === 63, "catalog should hold 63 puzzles");
  });

  test("catalog stage 15 references pass their cases and diagnoses differ", () => {
    checkStageRange(59, 63);
  });

  test("scenes: buffer views build valid arguments and the lookup view answers at the cursor time", () => {
    checkSceneKinds(["buffer"]);
    const api = scenesApi();
    const puzzle = puzzlesApi().getPuzzle("buffer-lookup");
    const values = api.initialValues(puzzle);
    const result = referenceOutput(puzzle, api.toArgs(puzzle, values));
    assert(result.ok && Number.isFinite(result.transform.x), "default buffer lookup should succeed");
    const past = referenceOutput(puzzle, api.toArgs(puzzle, { ...values, time: 1 }));
    same(past, { ok: false, code: "PAST_EXTRAPOLATION" });
  });
```

- [ ] **Step 2: Run the tests and confirm the new tests fail**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `51/54 puzzle tests passed`.

- [ ] **Step 3: Add the Stage 15 puzzles**

Insert directly before `const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7, TOOLKIT_8, TOOLKIT_9, TOOLKIT_10, TOOLKIT_11, TOOLKIT_12, ADVANCED_13, ADVANCED_14));`:

```js
  const TF2_BUFFER_CORE = "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1BufferCore.html";
  const TF2_ROS_BUFFER = "https://docs.ros.org/en/rolling/p/tf2_ros/generated/classtf2__ros_1_1Buffer.html";
  const EMPTY_BUFFER = { duration: 10, edges: {} };
  const LASER_STATIC_EDGE = { isStatic: true, samples: [{ time: 0, parent: "base_link", transform: { x: 1, y: 0, yaw: 0 } }] };
  const ODOM_TWO = { isStatic: false, samples: [{ time: 0, parent: "map", transform: { x: 0, y: 0, yaw: 0 } }, { time: 5, parent: "map", transform: { x: 5, y: 0, yaw: 0 } }] };
  const CHAIN_BUFFER = { duration: 10, edges: {
    odom: { isStatic: false, samples: [{ time: 0, parent: "map", transform: { x: 0, y: 0, yaw: 0 } }, { time: 10, parent: "map", transform: { x: 10, y: 0, yaw: 0 } }] },
    base_link: { isStatic: false, samples: [{ time: 2, parent: "odom", transform: { x: 0, y: 0, yaw: 0 } }, { time: 9, parent: "odom", transform: { x: 7, y: 0, yaw: 0 } }] },
    laser: LASER_STATIC_EDGE,
    camera: { isStatic: false, samples: [{ time: 8, parent: "base_link", transform: { x: 0, y: 0.3, yaw: 0 } }, { time: 9, parent: "base_link", transform: { x: 0, y: 0.3, yaw: 0 } }] },
  } };
  const REPARENT_BUFFER = { duration: 10, edges: {
    odom: { isStatic: false, samples: [{ time: 0, parent: "map", transform: { x: 2, y: 0, yaw: 0 } }, { time: 10, parent: "map", transform: { x: 2, y: 0, yaw: 0 } }] },
    base_link: { isStatic: false, samples: [{ time: 0, parent: "odom", transform: { x: 1, y: 0, yaw: 0 } }, { time: 6, parent: "map", transform: { x: 5, y: 0, yaw: 0 } }, { time: 9, parent: "map", transform: { x: 5, y: 0, yaw: 0 } }] },
    laser: LASER_STATIC_EDGE,
  } };
  const ARRIVALS = [{ time: 0, arrival: 0.2 }, { time: 1, arrival: 1.3 }, { time: 2, arrival: 2.1 }, { time: 3, arrival: 3.6 }, { time: 4, arrival: 4.2 }];

  const ADVANCED_15 = [
    puzzle({
      number: 59, id: "insert-transform", track: "advanced", title: "Insert into a TF Buffer",
      goal: "Latch a static transform, or append a dynamic one and prune history older than the buffer duration.",
      concept: "This is the whole static-versus-dynamic difference: one latched sample forever, versus a sliding window of stamped samples.",
      functionName: "insertTransform", signature: "insertTransform(buffer, sample, isStatic) → newBuffer",
      starterSource: starter("insertTransform", "buffer, sample, isStatic", "sample is { child, parent, time, transform }. Return a new buffer; do not mutate."),
      referenceSource: lines(
        "function insertTransform(buffer, sample, isStatic) {",
        "  var edges = Object.assign({}, buffer.edges);",
        "  var entry = { time: sample.time, parent: sample.parent, transform: sample.transform };",
        "  if (isStatic) {",
        "    edges[sample.child] = { isStatic: true, samples: [entry] };",
        "    return { duration: buffer.duration, edges: edges };",
        "  }",
        "  var existing = edges[sample.child] && !edges[sample.child].isStatic ? edges[sample.child].samples : [];",
        "  var samples = existing.concat([entry]).sort(function (a, b) { return a.time - b.time; });",
        "  var newest = samples[samples.length - 1].time;",
        "  samples = samples.filter(function (s) { return s.time >= newest - buffer.duration; });",
        "  edges[sample.child] = { isStatic: false, samples: samples };",
        "  return { duration: buffer.duration, edges: edges };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "broadcasters",
      reference: docref("tf2 · BufferCore::setTransform and TimeCache pruning", TF2_BUFFER_CORE),
      scene: { kind: "buffer", view: "insert", handles: [
        { id: "time", type: "timeline", label: "sample time", value: 14, start: 0, end: 20 },
        { id: "kind", type: "selector", label: "edge", value: "dynamic", options: ["dynamic", "static"] },
      ], args: [{ fixture: "buffer" }, { fixture: "insertedSample" }, { fixture: "insertIsStatic" }] },
      diagnoses: [
        diagnosis("no-pruning", "Old samples were kept: a dynamic edge only holds samples newer than newest − duration.", lines(
          "function insertTransform(buffer, sample, isStatic) {",
          "  var edges = Object.assign({}, buffer.edges);",
          "  var entry = { time: sample.time, parent: sample.parent, transform: sample.transform };",
          "  if (isStatic) { edges[sample.child] = { isStatic: true, samples: [entry] }; return { duration: buffer.duration, edges: edges }; }",
          "  var existing = edges[sample.child] && !edges[sample.child].isStatic ? edges[sample.child].samples : [];",
          "  var samples = existing.concat([entry]).sort(function (a, b) { return a.time - b.time; });",
          "  edges[sample.child] = { isStatic: false, samples: samples };",
          "  return { duration: buffer.duration, edges: edges };",
          "}"
        )),
        diagnosis("static-appended", "A static transform was appended like a dynamic sample: static edges are latched, one sample that replaces the previous one.", lines(
          "function insertTransform(buffer, sample, isStatic) {",
          "  var edges = Object.assign({}, buffer.edges);",
          "  var entry = { time: sample.time, parent: sample.parent, transform: sample.transform };",
          "  var existing = edges[sample.child] ? edges[sample.child].samples : [];",
          "  var samples = existing.concat([entry]).sort(function (a, b) { return a.time - b.time; });",
          "  if (!isStatic) { var newest = samples[samples.length - 1].time; samples = samples.filter(function (s) { return s.time >= newest - buffer.duration; }); }",
          "  edges[sample.child] = { isStatic: isStatic, samples: samples };",
          "  return { duration: buffer.duration, edges: edges };",
          "}"
        )),
      ],
      hints: ["Copy buffer.edges; never modify the input.", "Static: edges[child] = { isStatic: true, samples: [entry] }.", "Dynamic: append, sort by time, then keep only samples with time ≥ newest − buffer.duration."],
      cases: [
        example([EMPTY_BUFFER, { child: "laser", parent: "base_link", time: 0, transform: { x: 1, y: 0, yaw: 0 } }, true], { duration: 10, edges: { laser: { isStatic: true, samples: [{ time: 0, parent: "base_link", transform: { x: 1, y: 0, yaw: 0 } }] } } }, "latch a static edge"),
        example([{ duration: 10, edges: { odom: ODOM_TWO } }, { child: "odom", parent: "map", time: 14, transform: { x: 14, y: 0, yaw: 0 } }, false], { duration: 10, edges: { odom: { isStatic: false, samples: [{ time: 5, parent: "map", transform: { x: 5, y: 0, yaw: 0 } }, { time: 14, parent: "map", transform: { x: 14, y: 0, yaw: 0 } }] } } }, "append and prune"),
        example([{ duration: 10, edges: { laser: LASER_STATIC_EDGE } }, { child: "laser", parent: "base_link", time: 3, transform: { x: 2, y: 0, yaw: 0 } }, true], { duration: 10, edges: { laser: { isStatic: true, samples: [{ time: 3, parent: "base_link", transform: { x: 2, y: 0, yaw: 0 } }] } } }, "republish a static edge"),
        example([{ duration: 10, edges: { odom: { isStatic: false, samples: [{ time: 0, parent: "map", transform: { x: 0, y: 0, yaw: 0 } }, { time: 8, parent: "map", transform: { x: 8, y: 0, yaw: 0 } }] } } }, { child: "odom", parent: "map", time: 4, transform: { x: 4, y: 0, yaw: 0 } }, false], { duration: 10, edges: { odom: { isStatic: false, samples: [{ time: 0, parent: "map", transform: { x: 0, y: 0, yaw: 0 } }, { time: 4, parent: "map", transform: { x: 4, y: 0, yaw: 0 } }, { time: 8, parent: "map", transform: { x: 8, y: 0, yaw: 0 } }] } } }, "out-of-order arrival"),
      ],
    }),
    puzzle({
      number: 60, id: "parent-at", track: "advanced", title: "Parent at a Time",
      goal: "Find a frame's parent at a given time, and refuse to interpolate across a reparenting.",
      concept: "TF2 allows a child's parent to change over time; the two samples around a lookup must agree.",
      functionName: "parentAt", signature: "parentAt(buffer, child, time) → parent | null",
      starterSource: starter("parentAt", "buffer, child, time"),
      referenceSource: lines(
        "function parentAt(buffer, child, time) {",
        "  var edge = buffer.edges[child];",
        "  if (!edge || !edge.samples.length) return null;",
        "  if (edge.isStatic) return edge.samples[0].parent;",
        "  var b = bracketSamples(edge.samples, time);",
        "  var before = edge.samples[b.beforeIndex], after = edge.samples[b.afterIndex];",
        "  if (b.amount === 0) return before.parent;",
        "  return before.parent === after.parent ? before.parent : null;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "tree",
      dependencies: ["bracket-samples"],
      reference: docref("tf2 · TimeCache::getParent", "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1TimeCache.html"),
      scene: { kind: "buffer", view: "parents", handles: [{ id: "time", type: "timeline", label: "time", value: 3, start: -1, end: 11 }], args: [{ fixture: "reparentBuffer" }, "base_link", { handle: "time" }] },
      diagnoses: [
        diagnosis("latest-only", "Always returned the newest sample's parent: the parent must be read at the requested time.", lines(
          "function parentAt(buffer, child, time) {",
          "  var edge = buffer.edges[child];",
          "  if (!edge || !edge.samples.length) return null;",
          "  return edge.samples[edge.samples.length - 1].parent;",
          "}"
        )),
        diagnosis("ignores-change", "Returned the earlier sample's parent even when the later one differs: interpolating across a reparenting is not allowed, return null.", lines(
          "function parentAt(buffer, child, time) {",
          "  var edge = buffer.edges[child];",
          "  if (!edge || !edge.samples.length) return null;",
          "  if (edge.isStatic) return edge.samples[0].parent;",
          "  var b = bracketSamples(edge.samples, time);",
          "  return edge.samples[b.beforeIndex].parent;",
          "}"
        )),
      ],
      hints: ["Static edges have one parent for all time.", "Bracket the dynamic samples with bracketSamples; an exact hit (amount 0) uses that sample's parent.", "If the two bracketing samples name different parents, return null."],
      cases: [
        example([REPARENT_BUFFER, "base_link", 7], "map", "after the reparenting"),
        example([REPARENT_BUFFER, "base_link", 3], null, "across the reparenting"),
        example([REPARENT_BUFFER, "base_link", -1], "odom", "before the history"),
        example([REPARENT_BUFFER, "laser", 42], "base_link", "static edge"),
        example([REPARENT_BUFFER, "camera", 1], null, "unknown child"),
        example([REPARENT_BUFFER, "base_link", 0], "odom", "exactly on a sample"),
      ],
    }),
    puzzle({
      number: 61, id: "buffer-can-transform", track: "advanced", title: "Can the Buffer Answer?",
      goal: "Decide whether a lookup is answerable: connected path, every dynamic edge on it covers the time, no reparenting in between.",
      concept: "Static edges never limit a lookup; only the dynamic edges on the actual path do.",
      functionName: "canTransform", signature: "canTransform(buffer, target, source, time) → { ok } | { ok: false, code }",
      starterSource: starter("canTransform", "buffer, target, source, time", "Codes: DISCONNECTED, PAST_EXTRAPOLATION, FUTURE_EXTRAPOLATION, PARENT_CHANGE."),
      referenceSource: lines(
        "function canTransform(buffer, target, source, time) {",
        "  var tree = {};",
        "  Object.keys(buffer.edges).forEach(function (child) {",
        "    var edge = buffer.edges[child];",
        "    tree[child] = { parent: parentAt(buffer, child, time) || edge.samples[edge.samples.length - 1].parent };",
        "  });",
        "  var steps = directedPath(tree, target, source);",
        "  if (steps === null) return { ok: false, code: \"DISCONNECTED\" };",
        "  for (var i = 0; i < steps.length; i += 1) {",
        "    var edge = buffer.edges[steps[i].child];",
        "    if (edge.isStatic) continue;",
        "    var start = edge.samples[0].time, end = edge.samples[edge.samples.length - 1].time;",
        "    if (time < start) return { ok: false, code: \"PAST_EXTRAPOLATION\" };",
        "    if (time > end) return { ok: false, code: \"FUTURE_EXTRAPOLATION\" };",
        "    if (parentAt(buffer, steps[i].child, time) === null) return { ok: false, code: \"PARENT_CHANGE\" };",
        "  }",
        "  return { ok: true };",
        "}"
      ),
      comparator: "error", walkthroughChapter: "time-buffer",
      dependencies: ["parent-at", "directed-path"],
      reference: docref("tf2_ros · Buffer::canTransform", TF2_ROS_BUFFER),
      scene: { kind: "buffer", view: "can", handles: [
        { id: "time", type: "timeline", label: "time", value: 5, start: -1, end: 12 },
        { id: "target", type: "selector", label: "target", value: "map", options: CHAIN_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: CHAIN_OPTIONS },
      ], args: [{ fixture: "buffer" }, { handle: "target" }, { handle: "source" }, { handle: "time" }] },
      diagnoses: [
        diagnosis("static-ranged", "A static edge was treated as a range around its latch time: static edges are valid at every time.", lines(
          "function canTransform(buffer, target, source, time) {",
          "  var tree = {};",
          "  Object.keys(buffer.edges).forEach(function (child) { var edge = buffer.edges[child]; tree[child] = { parent: parentAt(buffer, child, time) || edge.samples[edge.samples.length - 1].parent }; });",
          "  var steps = directedPath(tree, target, source);",
          "  if (steps === null) return { ok: false, code: \"DISCONNECTED\" };",
          "  for (var i = 0; i < steps.length; i += 1) {",
          "    var edge = buffer.edges[steps[i].child];",
          "    var start = edge.samples[0].time, end = edge.samples[edge.samples.length - 1].time;",
          "    if (time < start) return { ok: false, code: \"PAST_EXTRAPOLATION\" };",
          "    if (time > end) return { ok: false, code: \"FUTURE_EXTRAPOLATION\" };",
          "    if (parentAt(buffer, steps[i].child, time) === null) return { ok: false, code: \"PARENT_CHANGE\" };",
          "  }",
          "  return { ok: true };",
          "}"
        )),
        diagnosis("whole-buffer-range", "Every dynamic edge in the buffer was checked: only the edges on the path between target and source matter.", lines(
          "function canTransform(buffer, target, source, time) {",
          "  var tree = {};",
          "  Object.keys(buffer.edges).forEach(function (child) { var edge = buffer.edges[child]; tree[child] = { parent: parentAt(buffer, child, time) || edge.samples[edge.samples.length - 1].parent }; });",
          "  var steps = directedPath(tree, target, source);",
          "  if (steps === null) return { ok: false, code: \"DISCONNECTED\" };",
          "  var children = Object.keys(buffer.edges);",
          "  for (var i = 0; i < children.length; i += 1) {",
          "    var edge = buffer.edges[children[i]];",
          "    if (edge.isStatic) continue;",
          "    var start = edge.samples[0].time, end = edge.samples[edge.samples.length - 1].time;",
          "    if (time < start) return { ok: false, code: \"PAST_EXTRAPOLATION\" };",
          "    if (time > end) return { ok: false, code: \"FUTURE_EXTRAPOLATION\" };",
          "    if (parentAt(buffer, children[i], time) === null) return { ok: false, code: \"PARENT_CHANGE\" };",
          "  }",
          "  return { ok: true };",
          "}"
        )),
      ],
      hints: ["Build a plain tree of parents at the requested time, then reuse directedPath.", "Only the edges on the path matter, and static ones always pass.", "For each dynamic step: PAST if time < first sample, FUTURE if time > last sample, PARENT_CHANGE if parentAt is null."],
      cases: [
        example([CHAIN_BUFFER, "map", "laser", 5], { ok: true }, "inside every range"),
        example([CHAIN_BUFFER, "map", "laser", 1], { ok: false, code: "PAST_EXTRAPOLATION" }, "before base_link history"),
        example([CHAIN_BUFFER, "map", "base_link", 9.5], { ok: false, code: "FUTURE_EXTRAPOLATION" }, "after base_link history"),
        example([CHAIN_BUFFER, "map", "nowhere", 5], { ok: false, code: "DISCONNECTED" }, "unknown frame"),
        example([CHAIN_BUFFER, "laser", "base_link", 100], { ok: true }, "static-only path at any time"),
        example([CHAIN_BUFFER, "map", "base_link", 2], { ok: true }, "off-path camera edge does not matter"),
        example([REPARENT_BUFFER, "map", "base_link", 3], { ok: false, code: "PARENT_CHANGE" }, "across a reparenting"),
      ],
    }),
    puzzle({
      number: 62, id: "wait-for-transform", track: "advanced", title: "When Does the Answer Arrive?",
      goal: "Given when each sample reached the buffer, find the earliest wall time a lookup at a stamp becomes answerable.",
      concept: "Transforms arrive late. A lookup needs the sample *after* the stamp too, so nodes wait or time out.",
      functionName: "waitForTransform", signature: "waitForTransform(samples, stamp) → wallTime | null",
      starterSource: starter("waitForTransform", "samples, stamp", "samples are { time, arrival } sorted by time. Bracket the stamp; the answer is the later arrival."),
      referenceSource: lines(
        "function waitForTransform(samples, stamp) {",
        "  if (!samples.length || stamp < samples[0].time || stamp > samples[samples.length - 1].time) return null;",
        "  var b = bracketSamples(samples, stamp);",
        "  if (b.amount === 0) return samples[b.beforeIndex].arrival;",
        "  return Math.max(samples[b.beforeIndex].arrival, samples[b.afterIndex].arrival);",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "time-buffer",
      dependencies: ["bracket-samples"],
      reference: docref("tf2_ros · Buffer::canTransform(…, timeout) and waitForTransform", TF2_ROS_BUFFER),
      scene: { kind: "buffer", view: "wait", handles: [{ id: "stamp", type: "timeline", label: "requested stamp", value: 1.5, start: -0.5, end: 4.5 }], args: [{ fixture: "arrivals" }, { handle: "stamp" }] },
      diagnoses: [
        diagnosis("before-only", "Only the earlier sample's arrival was used: interpolation also needs the sample after the stamp.", lines(
          "function waitForTransform(samples, stamp) {",
          "  if (!samples.length || stamp < samples[0].time || stamp > samples[samples.length - 1].time) return null;",
          "  var b = bracketSamples(samples, stamp);",
          "  return samples[b.beforeIndex].arrival;",
          "}"
        )),
        diagnosis("stamp-not-arrival", "The sample's stamp was returned instead of its arrival time.", lines(
          "function waitForTransform(samples, stamp) {",
          "  if (!samples.length || stamp < samples[0].time || stamp > samples[samples.length - 1].time) return null;",
          "  var b = bracketSamples(samples, stamp);",
          "  return Math.max(samples[b.beforeIndex].time, samples[b.afterIndex].time);",
          "}"
        )),
      ],
      hints: ["No bracket, no answer: return null outside the stamped history.", "An exact stamp needs only that one sample's arrival.", "Otherwise the lookup waits for the later of the two bracketing arrivals."],
      cases: [
        example([ARRIVALS, 0.5], 1.3, "between samples"),
        example([ARRIVALS, 1], 1.3, "exact stamp"),
        example([ARRIVALS, 2.5], 3.6, "late arrival dominates"),
        example([ARRIVALS, 4], 4.2, "last stamp"),
        example([ARRIVALS, 4.5], null, "not yet answerable"),
        example([ARRIVALS, -1], null, "before the history"),
      ],
    }),
    puzzle({
      number: 63, id: "buffer-lookup", track: "advanced", title: "Buffer-Aware Lookup",
      goal: "Answer a lookup from a real buffer: check availability, sample every edge at the time with the right parent, then traverse.",
      concept: "Static edges pass their latched transform through; dynamic edges interpolate; parents come from parentAt.",
      functionName: "bufferLookup", signature: "bufferLookup(buffer, target, source, time) → { ok: true, transform } | { ok: false, code }",
      starterSource: starter("bufferLookup", "buffer, target, source, time"),
      referenceSource: lines(
        "function bufferLookup(buffer, target, source, time) {",
        "  var availability = canTransform(buffer, target, source, time);",
        "  if (!availability.ok) return availability;",
        "  var tree = {};",
        "  Object.keys(buffer.edges).forEach(function (child) {",
        "    var edge = buffer.edges[child];",
        "    var parent = parentAt(buffer, child, time) || edge.samples[edge.samples.length - 1].parent;",
        "    var transform = edge.isStatic ? edge.samples[0].transform : sampleEdge({ samples: edge.samples }, time);",
        "    tree = storeEdge(tree, { parent: parent, child: child, transform: transform });",
        "  });",
        "  return { ok: true, transform: lookupTransform(tree, target, source) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sandbox",
      dependencies: ["buffer-can-transform", "parent-at", "sample-edge", "store-edge", "lookup-transform"],
      reference: docref("tf2 · BufferCore::lookupTransform", TF2_BUFFER_CORE),
      scene: { kind: "buffer", view: "lookup", handles: [
        { id: "time", type: "timeline", label: "time", value: 4, start: -1, end: 12 },
        { id: "target", type: "selector", label: "target", value: "map", options: CHAIN_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: CHAIN_OPTIONS },
      ], args: [{ fixture: "buffer" }, { handle: "target" }, { handle: "source" }, { handle: "time" }] },
      diagnoses: [diagnosis("skips-availability", "The lookup never asked canTransform, so it answers with clamped data at times the buffer cannot cover.", lines(
        "function bufferLookup(buffer, target, source, time) {",
        "  var tree = {};",
        "  Object.keys(buffer.edges).forEach(function (child) {",
        "    var edge = buffer.edges[child];",
        "    var parent = parentAt(buffer, child, time) || edge.samples[edge.samples.length - 1].parent;",
        "    var transform = edge.isStatic ? edge.samples[0].transform : sampleEdge({ samples: edge.samples }, time);",
        "    tree = storeEdge(tree, { parent: parent, child: child, transform: transform });",
        "  });",
        "  var transform = lookupTransform(tree, target, source);",
        "  return transform === null ? { ok: false, code: \"DISCONNECTED\" } : { ok: true, transform: transform };",
        "}"
      ))],
      hints: ["canTransform first; return its error object unchanged.", "Static edges contribute samples[0].transform; dynamic edges contribute sampleEdge({ samples }, time).", "storeEdge each child with parentAt's answer, then lookupTransform(tree, target, source)."],
      cases: [
        example([CHAIN_BUFFER, "map", "laser", 5], { ok: true, transform: { x: 9, y: 0, yaw: 0 } }, "interpolated chain"),
        example([CHAIN_BUFFER, "map", "laser", 1], { ok: false, code: "PAST_EXTRAPOLATION" }, "unavailable time"),
        example([CHAIN_BUFFER, "laser", "base_link", 100], { ok: true, transform: { x: -1, y: 0, yaw: 0 } }, "static-only path"),
        example([REPARENT_BUFFER, "map", "base_link", 8], { ok: true, transform: { x: 5, y: 0, yaw: 0 } }, "after reparenting to map"),
        example([REPARENT_BUFFER, "map", "base_link", 2], { ok: false, code: "PARENT_CHANGE" }, "across the reparenting"),
      ],
    }),
  ];
```

Then change the `PUZZLES` line to:

```js
  const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7, TOOLKIT_8, TOOLKIT_9, TOOLKIT_10, TOOLKIT_11, TOOLKIT_12, ADVANCED_13, ADVANCED_14, ADVANCED_15));
```

- [ ] **Step 4: Add the buffer scene**

In `puzzle-scenes.js`, insert directly before `const SCENES = {`:

```js
  // ------------------------------------------------------------ buffer semantics
  const BUFFER_SCENE = { duration: 10, edges: {
    odom: { isStatic: false, samples: [{ time: 0, parent: "map", transform: { x: -2, y: -0.5, yaw: 0 } }, { time: 5, parent: "map", transform: { x: 0, y: 0.5, yaw: 0.4 } }, { time: 10, parent: "map", transform: { x: 2, y: 1, yaw: 0.8 } }] },
    base_link: { isStatic: false, samples: [{ time: 2, parent: "odom", transform: { x: 1, y: 0, yaw: 0 } }, { time: 6, parent: "odom", transform: { x: 2, y: 0.5, yaw: 0.5 } }, { time: 9, parent: "odom", transform: { x: 2.5, y: 1, yaw: 1.0 } }] },
    laser: { isStatic: true, samples: [{ time: 0, parent: "base_link", transform: LASER_MOUNT }] },
  } };
  const REPARENT_SCENE = { duration: 10, edges: {
    odom: BUFFER_SCENE.edges.odom,
    base_link: { isStatic: false, samples: [{ time: 0, parent: "odom", transform: { x: 1, y: 0, yaw: 0 } }, { time: 6, parent: "map", transform: { x: 3, y: 1, yaw: 0.3 } }, { time: 9, parent: "map", transform: { x: 3.5, y: 1.5, yaw: 0.5 } }] },
    laser: BUFFER_SCENE.edges.laser,
  } };
  const ARRIVAL_SCENE = [{ time: 0, arrival: 0.2 }, { time: 1, arrival: 1.3 }, { time: 2, arrival: 2.1 }, { time: 3, arrival: 3.6 }, { time: 4, arrival: 4.2 }];
  function sampleBufferEdge(edge, time) {
    if (edge.isStatic) return edge.samples[0].transform;
    const b = bracket(edge.samples, time);
    return lerpTransform(edge.samples[b.beforeIndex].transform, edge.samples[b.afterIndex].transform, b.amount);
  }
  function bufferLane(handle, y, text, samples, style, options) {
    const settings = options || {};
    const out = [lane({ x: LANE_LEFT, y }, { x: LANE_RIGHT, y }, "muted", { label: text })];
    samples.forEach((sample) => out.push(marker({ x: laneX(handle, sample.time), y }, settings.labelParent ? sample.parent : "", style, { height: settings.height || 0.16, dashed: settings.dashed })));
    return out;
  }
  const bufferScene = {
    fixtures: {
      buffer: () => BUFFER_SCENE,
      reparentBuffer: () => REPARENT_SCENE,
      arrivals: () => ARRIVAL_SCENE,
      insertedSample: (values) => (values.kind === "static"
        ? { child: "laser", parent: "base_link", time: values.time, transform: { x: 0.8, y: 0, yaw: 0.2 } }
        : { child: "odom", parent: "map", time: values.time, transform: { x: 3, y: 1.5, yaw: 1.0 } }),
      insertIsStatic: (values) => values.kind === "static",
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const out = laneLayers(context.puzzle, context.values);
      if (view === "insert") {
        const handle = findHandle(context.puzzle, "time");
        ["odom", "base_link", "laser"].forEach((child, index) => {
          const y = 1.9 - index * 0.6;
          const edge = BUFFER_SCENE.edges[child];
          out.push(...bufferLane(handle, y, child + (edge.isStatic ? " (static, latched)" : " (dynamic, 10 s window)"), edge.samples, "muted"));
          const expectedEdge = context.expected && context.expected.edges ? context.expected.edges[child] : null;
          const actualEdge = context.actual && context.actual.edges ? context.actual.edges[child] : null;
          if (expectedEdge && Array.isArray(expectedEdge.samples)) out.push(...bufferLane(handle, y + 0.18, "", expectedEdge.samples, "expected", { dashed: true, height: 0.12 }));
          if (actualEdge && Array.isArray(actualEdge.samples)) out.push(...bufferLane(handle, y - 0.18, "", actualEdge.samples, resultStyle(context), { height: 0.12 }));
        });
        out.push(label("grey: current samples · dashed above: expected result · below: yours · samples older than newest − 10 s must go", "muted", { row: 3 }));
      } else if (view === "parents") {
        const handle = findHandle(context.puzzle, "time");
        out.push(...bufferLane(handle, 1.6, "base_link samples, labelled by parent", REPARENT_SCENE.edges.base_link.samples, "input", { labelParent: true, height: 0.2 }));
        const edges = [{ parent: "map", child: "odom", style: "muted" }];
        if (typeof context.expected === "string") edges.push({ parent: context.expected, child: "base_link", style: "expected", dashed: true });
        if (typeof context.actual === "string") edges.push({ parent: context.actual, child: "base_link", style: resultStyle(context) });
        out.push(treePrimitive([{ id: "map", style: "muted" }, { id: "odom", style: "muted" }, { id: "base_link", style: "input" }], edges, [], { caption: "parent of base_link at the cursor; null means the bracket spans a parent change" }));
      } else if (view === "can") {
        const handle = findHandle(context.puzzle, "time");
        ["odom", "base_link", "laser"].forEach((child, index) => {
          const edge = BUFFER_SCENE.edges[child];
          const y = 1.9 - index * 0.6;
          if (edge.isStatic) out.push(...bufferLane(handle, y, child + " (static: valid at any time)", edge.samples, "muted"));
          else out.push(...rangeLane(handle, { start: edge.samples[0].time, end: edge.samples[edge.samples.length - 1].time }, y, child + " history"));
        });
        out.push(label("canTransform(" + context.values.target + ", " + context.values.source + ") at t = " + fmt(context.values.time), "muted", { row: 3 }));
      } else if (view === "wait") {
        const handle = findHandle(context.puzzle, "stamp");
        out.push(...bufferLane(handle, 1.6, "stamps (when each pose was true)", ARRIVAL_SCENE, "muted"));
        out.push(...bufferLane(handle, 0.8, "arrivals (when the buffer received each one)", ARRIVAL_SCENE.map((sample) => ({ time: sample.arrival })), "input"));
        out.push(segments(ARRIVAL_SCENE.map((sample) => [{ x: laneX(handle, sample.time), y: 1.6 }, { x: laneX(handle, sample.arrival), y: 0.8 }]), "muted", { dashed: true }));
        if (typeof context.expected === "number") out.push(marker({ x: laneX(handle, context.expected), y: 0.8 }, "expected: answerable at " + fmt(context.expected), "expected", { height: 0.35, dashed: true }));
        if (typeof context.actual === "number" && Number.isFinite(context.actual)) out.push(marker({ x: laneX(handle, context.actual), y: 0.8 }, resultLabel(context) + " " + fmt(context.actual), resultStyle(context), { height: 0.3 }));
      } else {
        const handle = findHandle(context.puzzle, "time");
        const time = Math.max(2, Math.min(9, context.values.time));
        const chainValues = { odom: sampleBufferEdge(BUFFER_SCENE.edges.odom, time), base_link: sampleBufferEdge(BUFFER_SCENE.edges.base_link, time) };
        out.push(...chainLayers(chainValues, "input"));
        ["odom", "base_link"].forEach((child, index) => {
          const edge = BUFFER_SCENE.edges[child];
          out.push(...rangeLane(handle, { start: edge.samples[0].time, end: edge.samples[edge.samples.length - 1].time }, -1.2 - index * 0.6, child === "odom" ? "map → odom" : "odom → base_link"));
        });
        out.push(label("chain drawn at t = " + fmt(time) + " · laser is static", "muted", { at: { x: LANE_LEFT, y: -0.6 } }));
        const expectedTransform = context.expected && context.expected.ok ? context.expected.transform : null;
        const actualTransform = context.actual && context.actual.ok ? context.actual.transform : null;
        out.push(...lookupLayers(context, (name) => chainWorld(chainValues, name), context.values.target, context.values.source, expectedTransform, actualTransform));
        if (context.expected && context.expected.ok === false) out.push(label("expected error: " + context.expected.code, "expected", { row: 4 }));
        if (context.actual && context.actual.ok === false) out.push(label("your error: " + String(context.actual.code), resultStyle(context), { row: 5 }));
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
```

Add to the `SCENES` literal after `"deskew": deskewScene,`:

```js
    "buffer": bufferScene,
```

- [ ] **Step 5: Update the README**

In `README.md`, replace the paragraph starting `Track 3 (Pose Correction) is listed in the map` with:

```markdown
Track 3 (Buffers & Sensors) adds puzzles 52 to 63, unlocked by the ICP finale:

13. Conversions: rotationMatrixFromQuaternion, quaternionFromRotationMatrix, quaternionFromAxisAngle, axisAngleFromQuaternion.
14. Sensors and motion: staticFromUrdf, twistFromPoses, deskewScan.
15. Buffer semantics: insertTransform (latch versus sliding window), parentAt (reparenting), canTransform, waitForTransform (arrival latency), bufferLookup.

Stage 15 is where the static-versus-dynamic difference actually lives: a static edge is one latched sample that answers any time, a dynamic edge is a pruned history that only answers inside its range, and only the dynamic edges on the lookup path constrain it.

Track 4 (Pose Correction) is listed in the map and unlocks after the buffer lookup finale. Its puzzles, built from the warehouse rack pipeline in `p5sim/navigation`, arrive with the next track.
```

- [ ] **Step 6: Run every check**

Run:

```powershell
node p5sim/tf2_walkthrough/tests.js
node p5sim/tf2_walkthrough/puzzle-tests.js
```

Expected: `21/21 tests passed` and `54/54 puzzle tests passed`.

Then serve `p5sim` and confirm in a browser: `tests.html` reports both suites passing; `puzzle-lab.html` shows "63 geometry builds", four track blocks, and no console errors; after unlocking (`highestUnlocked: 62`), puzzle 59 shows three lanes with the dashed expected samples above and yours below and the pruned samples missing from both, puzzle 60 shows the parent switching from odom to map as the cursor passes t = 6, puzzle 62 shows stamp and arrival lanes joined by segments, and puzzle 63 draws the chain at the cursor time with the answer frame on the source.

- [ ] **Step 7: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzles.js p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-tests.js p5sim/tf2_walkthrough/README.md
git commit -m "feat: add TF buffer semantics stage with latching, pruning, arrival, reparenting, and lookup

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014bGFMz54uBLRNsi4hos8KD"
```

