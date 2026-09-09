# TF2 Transform Toolkit Track Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Append Track 2 · Transform Toolkit (puzzles 28 to 51) to the TF2 Puzzle Lab: homogeneous matrices, RPY/quaternion conversions, slerp, SE(3) apply/invert, the optical frame, odometry integration, covariance rotation, time-travel lookup, and 2D ICP, each with a PythonRobotics or ROS reference link.

**Architecture:** The catalog gains a second stage list and a `track` field so `puzzle()` can place toolkit puzzles; tracks become `[tf2, toolkit, pose-correction]`. New scene kinds (`matrix`, `motion`, `motion-trail`, `covariance`, `cloud-align`) and new views on `se3` and `robot-chain-time` follow the existing handle → `toArgs` → `layers` pattern. The renderer gains `points`, `segments`, and `ellipse` primitives. The engine gains an `angles` comparator. The lab shows a reference link and derives counts from the catalog.

**Tech Stack:** Vanilla JavaScript (browser globals plus CommonJS), p5.js, Web Workers, Node 22 for tests, `python -m http.server` for browser checks.

**Spec:** `docs/superpowers/specs/2026-09-09-tf2-transform-toolkit-track-design.md`

---

## File Structure

All paths relative to `C:\Users\ashry\Programming Experiments\Animation`.

Modify:

- `p5sim/tf2_walkthrough/puzzles.js` — `TOOLKIT_STAGES`, three tracks, `pyref`/`docref` helpers, track-aware `puzzle()`, arrays `TOOLKIT_8` … `TOOLKIT_12`.
- `p5sim/tf2_walkthrough/puzzle-scenes.js` — matrix helpers and `matrixScene`; se3 views `rpy`, `slerp`, `point3d`, `inverse`, `optical`; `motionScene`, `motionTrailScene`, `covarianceScene`; `robot-chain-time` view `across-time`; `cloudAlignScene`; primitives `points`, `segments`, `ellipse`; matrix formatting in `describe`.
- `p5sim/tf2_walkthrough/puzzle-engine.js` — `angles` comparator; `validateCatalog` requires `reference` on toolkit puzzles.
- `p5sim/tf2_walkthrough/puzzle-sketch.js` — draw `points`, `segments`, `ellipse`.
- `p5sim/tf2_walkthrough/puzzle-lab.js`, `puzzle-lab.html` — reference link, catalog-derived counts, generalized track announcements.
- `p5sim/tf2_walkthrough/puzzle-tests.js` — updated Track 1 assertions for three tracks; new toolkit tests.
- `p5sim/tf2_walkthrough/README.md` — Track 2 section.

Conventions:

- Commit messages end with the two attribution lines shown in each commit step.
- Run `node p5sim/tf2_walkthrough/puzzle-tests.js` and `node p5sim/tf2_walkthrough/tests.js` from the repo root; the second must keep printing `21/21 tests passed`.
- The working tree has unrelated uncommitted changes (`.gitignore`, `pyanim/`); never `git add -A`.

---

### Task 1: Catalog scaffolding, Stage 8 (Matrix Form), and the matrix scene

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzles.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-scenes.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-engine.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-tests.js`

- [ ] **Step 1: Update the Track 1 assertions and add failing Stage 8 tests**

In `puzzle-tests.js`, replace the test `"catalog has exactly 27 sequential puzzles with backward-only dependencies"` with:

```js
  test("catalog track 1 has 27 puzzles and the whole catalog is sequential", () => {
    const api = puzzlesApi();
    const list = api.TF2_PUZZLES;
    assert(list.filter((puzzle) => puzzle.track === "tf2").length === 27, "expected 27 tf2 puzzles");
    const seen = new Set();
    list.forEach((puzzle, index) => {
      assert(puzzle.number === index + 1, puzzle.id + " has number " + puzzle.number);
      assert(!seen.has(puzzle.id), "duplicate id " + puzzle.id);
      assert(["tf2", "toolkit"].includes(puzzle.track), puzzle.id + " has unknown track " + puzzle.track);
      puzzle.dependencies.forEach((dependency) => assert(seen.has(dependency), puzzle.id + " depends on unknown or later puzzle " + dependency));
      seen.add(puzzle.id);
      assert(api.getPuzzle(puzzle.id) === puzzle, "getPuzzle should resolve " + puzzle.id);
    });
    const stageIds = api.TF2_PUZZLE_TRACKS.flatMap((track) => track.stages.map((stage) => stage.id));
    list.forEach((puzzle) => assert(stageIds.includes(puzzle.stage), puzzle.id + " has unknown stage " + puzzle.stage));
    same(api.TF2_PUZZLE_TRACKS.map((track) => track.id), ["tf2", "toolkit", "pose-correction"]);
    assert(api.TF2_PUZZLE_TRACKS[1].unlockAfter === "stamped-lookup", "track 2 unlocks after the capstone");
    assert(api.TF2_PUZZLE_TRACKS[1].stages.length === 5, "track 2 lists five stages");
    assert(api.TF2_PUZZLE_TRACKS[2].unlockAfter === "icp-match", "track 3 unlocks after the ICP finale");
    assert(api.TF2_PUZZLE_TRACKS[2].stages.length === 4, "track 3 lists four placeholder stages");
  });
```

In the test `"engine progress uses the v2 key, rejects v1 records, and unlocks tracks"`, change the two track-state assertions to:

```js
    same(api.trackStates(tracks, progress).map((entry) => entry.state), ["available", "locked", "locked"]);
```

and

```js
    same(api.trackStates(tracks, progress).map((entry) => entry.state), ["available", "available", "locked"]);
```

In the test `"engine validateCatalog accepts the real catalog and rejects a bad scene kind"`, replace the hard-coded `const kinds = [...]` line with:

```js
    const kinds = scenesApi().SCENE_KINDS;
```

Then append before `async function runAllTests()`:

```js
  // ---------------------------------------------------------------- toolkit track
  function toolkitPuzzles() { return puzzleList().filter((puzzle) => puzzle.track === "toolkit"); }

  test("catalog track 2 stage 8 contains the matrix bricks and every toolkit puzzle links a reference", () => {
    same(idsInRange(28, 33), ["rot-mat-2d", "homogeneous-from-pose", "mat-mul-3", "apply-homogeneous", "pose-from-homogeneous", "invert-homogeneous"]);
    toolkitPuzzles().forEach((puzzle) => {
      assert(puzzle.reference && typeof puzzle.reference.label === "string" && /^https:\/\//.test(puzzle.reference.url), puzzle.id + " needs a reference link");
    });
  });

  test("catalog stage 8 references pass their cases and diagnoses differ", () => {
    checkStageRange(28, 33);
  });

  test("scenes: matrix kind builds valid arguments and finite layers", () => {
    checkSceneKinds(["matrix"]);
  });
```

- [ ] **Step 2: Run the tests and confirm the new and updated tests fail**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: failures for the track list (`["tf2","pose-correction"]` vs three tracks), the track-state assertions, the stage 8 id list, and the matrix scene; about `26/30 puzzle tests passed`.

- [ ] **Step 3: Add toolkit stages, three tracks, reference helpers, and the track-aware builder to `puzzles.js`**

Replace the `TRACKS` block (from `const TRACKS = Object.freeze([` through its closing `]);`) with:

```js
  const TOOLKIT_STAGES = Object.freeze([
    { id: "matrix-form", title: "Matrix Form", subtitle: "SE(2) as a 3×3 homogeneous matrix.", range: [28, 33] },
    { id: "orientation-3d", title: "3D Orientation", subtitle: "RPY, quaternions, slerp, and SE(3).", range: [34, 40] },
    { id: "motion-uncertainty", title: "Motion & Uncertainty", subtitle: "Integrate odometry and rotate covariance.", range: [41, 43] },
    { id: "time-travel", title: "Time Travel", subtitle: "Move an observation across time through a fixed frame.", range: [44, 44] },
    { id: "rigid-alignment", title: "Rigid Alignment", subtitle: "Recover a transform from two point clouds.", range: [45, 51] },
  ]);

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
      id: "pose-correction",
      title: "Track 3 · Pose Correction",
      unlockAfter: "icp-match",
      note: "Unlocks after the ICP finale. Puzzles arrive with the next track.",
      stages: Object.freeze([
        { id: "pointcloud-bricks", title: "Point-Cloud Bricks", subtitle: "Rack points, line fits, and distances.", range: [0, 0] },
        { id: "rack-filters", title: "Rack Filters", subtitle: "Accumulate, filter, smooth, and agree.", range: [0, 0] },
        { id: "aisle-correction", title: "Aisle Correction", subtitle: "Centerline, lateral error, corrected pose.", range: [0, 0] },
        { id: "correction-capstone", title: "Correction Capstone", subtitle: "Publish map → odom on a drifting robot.", range: [0, 0] },
      ]),
    }),
  ]);

  const PYROBOTICS = "https://github.com/AtsushiSakai/PythonRobotics/blob/master/";

  function pyref(path, symbol) {
    return Object.freeze({ label: "PythonRobotics · " + path + (symbol ? " · " + symbol : ""), url: PYROBOTICS + path });
  }

  function docref(label, url) {
    return Object.freeze({ label, url });
  }
```

Replace the first four lines of `function puzzle(config) {` (through `if (!stage) throw …`) and the two lines `tolerance: 1e-6,` / `track: "tf2",` so the function starts:

```js
  function puzzle(config) {
    const track = config.track || "tf2";
    const stageList = track === "toolkit" ? TOOLKIT_STAGES : STAGES;
    const stage = stageList.find((candidate) => config.number >= candidate.range[0] && config.number <= candidate.range[1]);
    if (!stage) throw new Error("Puzzle " + config.number + " has no stage");
    return Object.freeze({
      tolerance: 1e-6,
      reference: null,
      ...config,
      track,
      stage: stage.id,
```

The rest of the function is unchanged.

- [ ] **Step 4: Add the Stage 8 puzzles**

Insert directly before `const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7));`:

```js
  const IDENTITY_3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const ROT90_T31 = [[0, -1, 3], [1, 0, 1], [0, 0, 1]];

  const TOOLKIT_8 = [
    puzzle({
      number: 28, id: "rot-mat-2d", track: "toolkit", title: "Rotation as a Matrix",
      goal: "Build the 2×2 rotation matrix for a yaw angle.",
      concept: "The columns are the rotated x and y axes; rotateVector was this matrix all along.",
      functionName: "rotMat2d", signature: "rotMat2d(yaw) → [[c, -s], [s, c]]",
      starterSource: starter("rotMat2d", "yaw", "Row-major nested arrays: first row [cos, -sin], second row [sin, cos]."),
      referenceSource: "function rotMat2d(yaw) { var c = Math.cos(yaw), s = Math.sin(yaw); return [[c, -s], [s, c]]; }",
      comparator: "deep", walkthroughChapter: "matrix-stack",
      reference: pyref("utils/angle.py", "rot_mat_2d"),
      scene: { kind: "matrix", view: "rotation", handles: [{ id: "yaw", type: "dial", label: "yaw", value: 0.7 }] },
      diagnoses: [diagnosis("transposed", "Transposed: that matrix rotates by −yaw. The first row is [cos, −sin].", "function rotMat2d(yaw) { var c = Math.cos(yaw), s = Math.sin(yaw); return [[c, s], [-s, c]]; }")],
      hints: ["The first column is where the x axis goes: (cos, sin).", "Row-major: row 0 is [cos, −sin], row 1 is [sin, cos].", "Return [[Math.cos(yaw), -Math.sin(yaw)], [Math.sin(yaw), Math.cos(yaw)]]."],
      cases: [
        example([PI / 2], [[0, -1], [1, 0]], "quarter turn"),
        example([0], [[1, 0], [0, 1]], "identity"),
        example([PI], [[-1, 0], [0, -1]], "half turn"),
        example([-PI / 4], [[Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, Math.SQRT1_2]], "negative yaw"),
      ],
    }),
    puzzle({
      number: 29, id: "homogeneous-from-pose", track: "toolkit", title: "Pose to Homogeneous Matrix",
      goal: "Pack a pose into a 3×3 homogeneous matrix.",
      concept: "Rotation in the top-left, translation in the last column, [0 0 1] on the bottom: that is what the p5 matrix stack multiplies.",
      functionName: "homogeneousFromPose", signature: "homogeneousFromPose(transform) → 3×3",
      starterSource: starter("homogeneousFromPose", "transform", "Reuse rotMat2d for the top-left block."),
      referenceSource: lines(
        "function homogeneousFromPose(transform) {",
        "  var r = rotMat2d(transform.yaw);",
        "  return [[r[0][0], r[0][1], transform.x], [r[1][0], r[1][1], transform.y], [0, 0, 1]];",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "matrix-stack",
      dependencies: ["rot-mat-2d"],
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "update_homogeneous_matrix"),
      scene: { kind: "matrix", view: "pose", handles: [{ id: "transform", type: "frame", label: "pose", value: { x: 2, y: 1, yaw: PI / 3 } }] },
      diagnoses: [diagnosis("translation-in-last-row", "Translation landed in the bottom row: column vectors need it in the last column.", lines(
        "function homogeneousFromPose(transform) {",
        "  var r = rotMat2d(transform.yaw);",
        "  return [[r[0][0], r[0][1], 0], [r[1][0], r[1][1], 0], [transform.x, transform.y, 1]];",
        "}"
      ))],
      hints: ["The matrix must move [x, y, 1] the way transformPoint does.", "Top-left 2×2 is the rotation, last column is (x, y, 1).", "[[c, −s, x], [s, c, y], [0, 0, 1]]."],
      cases: [
        example([{ x: 2, y: 1, yaw: 0 }], [[1, 0, 2], [0, 1, 1], [0, 0, 1]], "pure translation"),
        example([{ x: 0, y: 0, yaw: PI / 2 }], [[0, -1, 0], [1, 0, 0], [0, 0, 1]], "pure rotation"),
        example([{ x: -3, y: 4, yaw: PI }], [[-1, 0, -3], [0, -1, 4], [0, 0, 1]], "half turn with offset"),
      ],
    }),
    puzzle({
      number: 30, id: "mat-mul-3", track: "toolkit", title: "Multiply Homogeneous Matrices",
      goal: "Multiply two 3×3 matrices; the right operand acts first, exactly like compose.",
      concept: "push(); translate(); rotate(); is matrix multiplication in disguise.",
      functionName: "matMul3", signature: "matMul3(a, b) → 3×3",
      starterSource: starter("matMul3", "a, b", "result[i][j] = sum over k of a[i][k] * b[k][j]."),
      referenceSource: lines(
        "function matMul3(a, b) {",
        "  var result = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];",
        "  for (var i = 0; i < 3; i += 1) {",
        "    for (var j = 0; j < 3; j += 1) {",
        "      for (var k = 0; k < 3; k += 1) result[i][j] += a[i][k] * b[k][j];",
        "    }",
        "  }",
        "  return result;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "composition",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "update_homogeneous_matrix (Hin @ H)"),
      scene: { kind: "matrix", view: "chain", handles: [
        { id: "aFromB", type: "frame", label: "b", value: { x: 2, y: 1, yaw: PI / 2 } },
        { id: "bFromC", type: "frame", label: "c", value: { x: 1.5, y: 0, yaw: PI / 4 }, in: "aFromB" },
      ], args: [{ fixture: "matrixA" }, { fixture: "matrixB" }] },
      diagnoses: [
        diagnosis("reversed-order", "Multiplied b × a: matrix products do not commute; a is on the left.", lines(
          "function matMul3(a, b) {",
          "  var result = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];",
          "  for (var i = 0; i < 3; i += 1) for (var j = 0; j < 3; j += 1) for (var k = 0; k < 3; k += 1) result[i][j] += b[i][k] * a[k][j];",
          "  return result;",
          "}"
        )),
        diagnosis("element-wise", "Multiplied element by element: a matrix product sums over the inner index.", "function matMul3(a, b) { return [[a[0][0]*b[0][0], a[0][1]*b[0][1], a[0][2]*b[0][2]], [a[1][0]*b[1][0], a[1][1]*b[1][1], a[1][2]*b[1][2]], [a[2][0]*b[2][0], a[2][1]*b[2][1], a[2][2]*b[2][2]]]; }"),
      ],
      hints: ["Each output entry is a row of a dotted with a column of b.", "Three nested loops over i, j, k.", "result[i][j] += a[i][k] * b[k][j]."],
      cases: [
        example([[[0, -1, 10], [1, 0, 0], [0, 0, 1]], [[0, -1, 1], [1, 0, 0], [0, 0, 1]]], [[-1, 0, 10], [0, -1, 1], [0, 0, 1]], "turning chain"),
        example([IDENTITY_3, ROT90_T31], ROT90_T31, "identity on the left"),
        example([[[1, 0, 2], [0, 1, -1], [0, 0, 1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]]], [[0, -1, 2], [1, 0, -1], [0, 0, 1]], "order-sensitive"),
      ],
    }),
    puzzle({
      number: 31, id: "apply-homogeneous", track: "toolkit", title: "Apply a Homogeneous Matrix",
      goal: "Move a point with a 3×3 matrix by treating it as [x, y, 1].",
      concept: "The trailing 1 is what lets one multiplication both rotate and translate.",
      functionName: "applyHomogeneous", signature: "applyHomogeneous(matrix, point) → point",
      starterSource: starter("applyHomogeneous", "matrix, point", "Multiply the first two rows by [x, y, 1]."),
      referenceSource: lines(
        "function applyHomogeneous(matrix, point) {",
        "  return { x: matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2], y: matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2] };",
        "}"
      ),
      comparator: "vector2", walkthroughChapter: "matrix-stack",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "icp_matching (Rt @ current_points + Tt)"),
      scene: { kind: "matrix", view: "point", handles: [
        { id: "transform", type: "frame", label: "source", value: { x: 3, y: 1, yaw: PI / 2 } },
        { id: "point", type: "point", label: "p", value: { x: 2, y: 0 }, in: "transform" },
      ], args: [{ fixture: "matrixOfTransform" }, { handle: "point" }] },
      diagnoses: [
        diagnosis("rotation-ignored", "Only the last column was used: the rotation block must multiply x and y.", "function applyHomogeneous(matrix, point) { return { x: point.x + matrix[0][2], y: point.y + matrix[1][2] }; }"),
        diagnosis("homogeneous-coordinate-dropped", "The trailing 1 was dropped, so the translation column never contributes.", "function applyHomogeneous(matrix, point) { return { x: matrix[0][0] * point.x + matrix[0][1] * point.y, y: matrix[1][0] * point.x + matrix[1][1] * point.y }; }"),
      ],
      hints: ["Extend the point to [x, y, 1].", "x′ = m00·x + m01·y + m02·1, and the same with row 1 for y′.", "Return { x: m[0][0]*x + m[0][1]*y + m[0][2], y: m[1][0]*x + m[1][1]*y + m[1][2] }."],
      cases: [
        example([ROT90_T31, { x: 2, y: 0 }], { x: 3, y: 3 }, "rotate then shift"),
        example([IDENTITY_3, { x: 5, y: -2 }], { x: 5, y: -2 }, "identity"),
        example([[[-1, 0, -1], [0, -1, 4], [0, 0, 1]], { x: 2, y: -3 }], { x: -3, y: 7 }, "half-turn matrix"),
      ],
    }),
    puzzle({
      number: 32, id: "pose-from-homogeneous", track: "toolkit", title: "Read a Pose Back Out",
      goal: "Extract x, y, and yaw from a homogeneous matrix.",
      concept: "The first column is the rotated x axis, so atan2 of it recovers yaw with the right sign.",
      functionName: "poseFromHomogeneous", signature: "poseFromHomogeneous(matrix) → { x, y, yaw }",
      starterSource: starter("poseFromHomogeneous", "matrix", "Translation is the last column; yaw comes from the first column."),
      referenceSource: "function poseFromHomogeneous(matrix) { return { x: matrix[0][2], y: matrix[1][2], yaw: Math.atan2(matrix[1][0], matrix[0][0]) }; }",
      comparator: "se2", walkthroughChapter: "matrix-stack",
      reference: pyref("utils/angle.py", "angle_mod"),
      scene: { kind: "matrix", view: "readback", handles: [{ id: "transform", type: "frame", label: "pose", value: { x: -1, y: 2, yaw: -PI / 3 } }], args: [{ fixture: "matrixOfTransform" }] },
      diagnoses: [
        diagnosis("acos-yaw", "acos(m00) loses the sign of the rotation: use atan2(m10, m00).", "function poseFromHomogeneous(matrix) { return { x: matrix[0][2], y: matrix[1][2], yaw: Math.acos(matrix[0][0]) }; }"),
        diagnosis("atan2-swapped", "atan2 arguments swapped: it takes (sin, cos), which are (m10, m00).", "function poseFromHomogeneous(matrix) { return { x: matrix[0][2], y: matrix[1][2], yaw: Math.atan2(matrix[0][0], matrix[1][0]) }; }"),
      ],
      hints: ["x and y sit in the last column.", "m10 is sin(yaw) and m00 is cos(yaw).", "yaw = Math.atan2(matrix[1][0], matrix[0][0])."],
      cases: [
        example([ROT90_T31], { x: 3, y: 1, yaw: PI / 2 }, "quarter turn"),
        example([[[1, 0, 5], [0, 1, -2], [0, 0, 1]]], { x: 5, y: -2, yaw: 0 }, "pure translation"),
        example([[[0.5, Math.sqrt(3) / 2, 0], [-Math.sqrt(3) / 2, 0.5, 0], [0, 0, 1]]], { x: 0, y: 0, yaw: -PI / 3 }, "negative yaw"),
      ],
    }),
    puzzle({
      number: 33, id: "invert-homogeneous", track: "toolkit", title: "Invert a Homogeneous Matrix",
      goal: "Invert a rigid 3×3 matrix without a general matrix inverse.",
      concept: "A rotation's inverse is its transpose, and the translation becomes −Rᵀt.",
      functionName: "invertHomogeneous", signature: "invertHomogeneous(matrix) → 3×3",
      starterSource: starter("invertHomogeneous", "matrix", "Transpose the rotation block; the new translation is −Rᵀ · t."),
      referenceSource: lines(
        "function invertHomogeneous(matrix) {",
        "  var r00 = matrix[0][0], r01 = matrix[0][1], r10 = matrix[1][0], r11 = matrix[1][1];",
        "  var tx = matrix[0][2], ty = matrix[1][2];",
        "  return [[r00, r10, -(r00 * tx + r10 * ty)], [r01, r11, -(r01 * tx + r11 * ty)], [0, 0, 1]];",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "composition",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "update_homogeneous_matrix"),
      scene: { kind: "matrix", view: "inverse", handles: [{ id: "transform", type: "frame", label: "b", value: { x: 3, y: 1, yaw: PI / 2 } }], args: [{ fixture: "matrixOfTransform" }] },
      diagnoses: [
        diagnosis("negated-only", "Only the translation was negated: it must also be rotated by the transposed block.", "function invertHomogeneous(matrix) { return [[matrix[0][0], matrix[0][1], -matrix[0][2]], [matrix[1][0], matrix[1][1], -matrix[1][2]], [0, 0, 1]]; }"),
        diagnosis("transpose-whole-matrix", "Transposing the whole 3×3 moves the translation into the bottom row; only the rotation block transposes.", "function invertHomogeneous(matrix) { return [[matrix[0][0], matrix[1][0], 0], [matrix[0][1], matrix[1][1], 0], [matrix[0][2], matrix[1][2], 1]]; }"),
      ],
      hints: ["For rotations, Rᵀ is R⁻¹.", "Inverse = [Rᵀ, −Rᵀ t; 0 0 1].", "Swap m01 and m10; new tx = −(m00·tx + m10·ty); new ty = −(m01·tx + m11·ty)."],
      cases: [
        example([ROT90_T31], [[0, 1, -1], [-1, 0, 3], [0, 0, 1]], "quarter-turn inverse"),
        example([[[1, 0, 2], [0, 1, -4], [0, 0, 1]]], [[1, 0, -2], [0, 1, 4], [0, 0, 1]], "translation inverse"),
        example([[[-1, 0, 1], [0, -1, 1], [0, 0, 1]]], [[-1, 0, 1], [0, -1, 1], [0, 0, 1]], "half turn is its own inverse"),
      ],
    }),
  ];
```

Then change the `PUZZLES` line to:

```js
  const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7, TOOLKIT_8));
```

- [ ] **Step 5: Require references on toolkit puzzles in the engine**

In `puzzle-engine.js`, inside `validateCatalog`, insert directly after the line `if (Array.isArray(sceneKinds) && !sceneKinds.includes(puzzle.scene.kind)) return { valid: false, message: puzzle.id + " uses unknown scene kind " + puzzle.scene.kind };`:

```js
      if (puzzle.track === "toolkit" && !(puzzle.reference && typeof puzzle.reference.url === "string")) return { valid: false, message: puzzle.id + " needs a reference link." };
```

- [ ] **Step 6: Add matrix formatting and the matrix scene to `puzzle-scenes.js`**

In `describe`, insert directly after `if (typeof value === "string") return value;`:

```js
    if (Array.isArray(value) && value.length && value.every((row) => Array.isArray(row) && row.every((item) => typeof item === "number"))) {
      return "[" + value.map((row) => row.map(fmt).join(" ")).join("; ") + "]";
    }
```

Insert directly before `const SCENES = {`:

```js
  // ------------------------------------------------------------ matrix form
  function isMatrix(m, size) {
    return Array.isArray(m) && m.length === size && m.every((row) => Array.isArray(row) && row.length === size && row.every((item) => Number.isFinite(item)));
  }
  function matrixOf(t) {
    const c = Math.cos(t.yaw);
    const s = Math.sin(t.yaw);
    return [[c, -s, t.x], [s, c, t.y], [0, 0, 1]];
  }
  function poseFromMatrix(m) {
    return { x: m[0][2], y: m[1][2], yaw: Math.atan2(m[1][0], m[0][0]) };
  }
  function columnLayers(m, origin, text, style, dashed) {
    const scale = 1.2;
    const alpha = style === "expected" ? 200 : 255;
    return [
      arrow(origin, add(origin, { x: m[0][0] * scale, y: m[1][0] * scale }), "x", { dashed, weight: 2.5, alpha }),
      arrow(origin, add(origin, { x: m[0][1] * scale, y: m[1][1] * scale }), "y", { dashed, weight: 2.5, alpha }),
      label(text, style, { at: add(origin, { x: 0.15, y: -0.35 }) }),
    ];
  }
  const matrixScene = {
    fixtures: {
      matrixOfTransform: (values) => matrixOf(values.transform),
      matrixA: (values) => matrixOf(values.aFromB),
      matrixB: (values) => matrixOf(values.bFromC),
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const out = [];
      const expectedMatrix = isMatrix(context.expected, 3) ? context.expected : null;
      const actualMatrix = isMatrix(context.actual, 3) ? context.actual : null;
      if (view === "rotation") {
        const handle = handleDefs(context.puzzle)[0];
        const yaw = context.values[handle.id];
        out.push(arc({ x: 0, y: 0 }, dialRadius(handle), 0, yaw, "input", { track: true }));
        out.push(label("yaw = " + degrees(yaw), "input", { at: direction(yaw, dialRadius(handle) + 0.5) }));
        if (isMatrix(context.expected, 2)) out.push(...columnLayers(context.expected, { x: 0, y: 0 }, "expected columns", "expected", true));
        if (isMatrix(context.actual, 2)) out.push(...columnLayers(context.actual, { x: 0, y: 0 }, resultLabel(context), resultStyle(context), false));
      } else if (view === "pose" || view === "readback") {
        const transform = context.values.transform;
        out.push(frame(identity(), "world", "muted"), frame(transform, "pose", "input"));
        if (view === "pose") {
          if (expectedMatrix) out.push(frame(poseFromMatrix(expectedMatrix), "expected matrix", "expected", { dashed: true }));
          if (actualMatrix) {
            const placed = poseFromMatrix(actualMatrix);
            out.push(frame(placed, resultLabel(context), resultStyle(context)));
            out.push(...errorArrow(context, placed, transform));
          }
        } else {
          if (isTransform(context.expected)) out.push(glyph(context.expected, "expected pose", "expected", { dashed: true }));
          if (isTransform(context.actual)) {
            out.push(glyph(context.actual, resultLabel(context), resultStyle(context)));
            out.push(...errorArrow(context, context.actual, context.expected));
          }
        }
      } else if (view === "chain") {
        const aFromB = context.values.aFromB;
        const aFromC = compose(aFromB, context.values.bFromC);
        out.push(frame(identity(), "a", "muted"), frame(aFromB, "b", "input"), frame(aFromC, "c", "input", { alpha: 170 }), arrow(aFromB, aFromC, "input", { dashed: true, weight: 1 }));
        if (expectedMatrix) out.push(frame(poseFromMatrix(expectedMatrix), "expected A·B", "expected", { dashed: true }));
        if (actualMatrix) {
          const placed = poseFromMatrix(actualMatrix);
          out.push(frame(placed, resultLabel(context), resultStyle(context)));
          out.push(...errorArrow(context, placed, aFromC));
        }
      } else if (view === "point") {
        const transform = context.values.transform;
        const world = applyPoint(transform, context.values.point);
        out.push(frame(identity(), "target", "muted"), frame(transform, "source", "input"), arrow(transform, world, "input", { dashed: true, weight: 1 }), point(world, "p = " + fmtPoint(context.values.point) + " in source", "input"));
        if (isPoint(context.expected)) out.push(point(context.expected, "expected in target", "expected", { dashed: true }));
        if (isPoint(context.actual)) {
          out.push(point(context.actual, resultLabel(context), resultStyle(context)));
          out.push(...errorArrow(context, context.actual, context.expected));
        }
      } else if (view === "inverse") {
        const transform = context.values.transform;
        out.push(frame(identity(), "a", "muted"), frame(transform, "b", "input"), label("b ∘ yours must land on a", "muted", { row: 3 }));
        if (expectedMatrix) out.push(frame(compose(transform, poseFromMatrix(expectedMatrix)), "b ∘ expected", "expected", { dashed: true }));
        if (actualMatrix) {
          const placed = compose(transform, poseFromMatrix(actualMatrix));
          out.push(frame(placed, "b ∘ yours", resultStyle(context)));
          out.push(...errorArrow(context, placed, identity()));
        }
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
```

Add to the `SCENES` literal, after the `"robot-chain-time": robotChainTimeScene,` line:

```js
    "matrix": matrixScene,
```

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `30/30 puzzle tests passed`.

- [ ] **Step 8: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzles.js p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-engine.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: add transform toolkit track with matrix form stage

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Np6fGLQWawWohjyrsBWLcz"
```

---

### Task 2: Stage 9 (3D Orientation), the `angles` comparator, and new SE(3) views

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzles.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-engine.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-scenes.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-tests.js`

- [ ] **Step 1: Add failing tests**

Append to `puzzle-tests.js` before `async function runAllTests()`:

```js
  test("catalog track 2 stage 9 contains the 3D orientation bricks", () => {
    same(idsInRange(34, 40), ["quaternion-from-rpy", "yaw-from-quaternion", "rpy-from-quaternion", "slerp-quaternion", "transform-point-3d", "invert-se3", "optical-to-body"]);
  });

  test("catalog stage 9 references pass their cases and diagnoses differ", () => {
    checkStageRange(34, 40);
  });

  test("engine angles comparator wraps every numeric field", () => {
    const api = engineApi();
    const twoPi = 2 * Math.PI;
    assert(api.compareOutput("angles", { roll: 4, pitch: 0, yaw: -1 }, { roll: 4 - twoPi, pitch: twoPi, yaw: -1 + twoPi }, 1e-6).pass, "angles should wrap");
    assert(!api.compareOutput("angles", { roll: 4, pitch: 0.5, yaw: -1 }, { roll: 4, pitch: 0, yaw: -1 }, 1e-6).pass, "angles should still detect differences");
    assert(!api.compareOutput("deep", { roll: 4, pitch: 0, yaw: -1 }, { roll: 4 - twoPi, pitch: 0, yaw: -1 }, 1e-6).pass, "deep wraps only yaw");
  });

  test("scenes: se3 views for rpy, slerp, point3d, inverse, and optical build valid arguments", () => {
    checkSceneKinds(["se3"]);
    const api = scenesApi();
    const optical = puzzlesApi().getPuzzle("optical-to-body");
    const values = api.initialValues(optical);
    const body = referenceOutput(optical, api.toArgs(optical, values));
    near(Math.hypot(body.x, body.y, body.z), 1);
    near(body.z, Math.sin(values.pitch));
  });
```

- [ ] **Step 2: Run the tests and confirm the new tests fail**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `30/34 puzzle tests passed`.

- [ ] **Step 3: Add the `angles` comparator to the engine**

In `puzzle-engine.js`:

1. Change the `COMPARATORS` line to:

```js
  const COMPARATORS = Object.freeze(["scalar", "angle", "angles", "vector2", "vector3", "quaternion", "se2", "se3", "deep", "path", "error"]);
```

2. In `compareValue`, replace the line `const error = angleFields.has(lastKey) ? Math.abs(angleDelta(actual, expected)) : Math.abs(actual - expected);` with:

```js
      const wraps = angleFields === null || angleFields.has(lastKey);
      const error = wraps ? Math.abs(angleDelta(actual, expected)) : Math.abs(actual - expected);
```

3. In `compareOutput`, insert directly before `const angleFields = new Set(comparator === "se2" || comparator === "deep" ? ["yaw"] : []);`:

```js
    if (comparator === "angles") return compareValue(actual, expected, epsilon, "result", null);
```

- [ ] **Step 4: Add the Stage 9 puzzles**

Insert directly before `const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7, TOOLKIT_8));`:

```js
  const X90 = { x: HALF, y: 0, z: 0, w: HALF };
  const RP60 = { x: 0.4330127018922193, y: 0.4330127018922193, z: -0.25, w: 0.75 };
  const Z170 = { x: 0, y: 0, z: Math.sin(85 * PI / 180), w: Math.cos(85 * PI / 180) };
  const Z_MINUS_170 = { x: 0, y: 0, z: -Math.sin(85 * PI / 180), w: Math.cos(85 * PI / 180) };
  const RPY_SLIDERS = [
    { id: "roll", type: "slider", label: "roll", value: 0.3, min: -PI, max: PI },
    { id: "pitch", type: "slider", label: "pitch", value: 0.4, min: -PI / 2, max: PI / 2 },
    { id: "yaw", type: "slider", label: "yaw", value: 1.0, min: -PI, max: PI },
  ];

  const TOOLKIT_9 = [
    puzzle({
      number: 34, id: "quaternion-from-rpy", track: "toolkit", title: "Quaternion from Roll, Pitch, Yaw",
      goal: "Build the quaternion tf2's setRPY builds: yaw about Z, then pitch about Y, then roll about X.",
      concept: "Euler angles are three half-angle quaternions multiplied in Z-Y-X order.",
      functionName: "quaternionFromRPY", signature: "quaternionFromRPY(roll, pitch, yaw) → quaternion",
      starterSource: starter("quaternionFromRPY", "roll, pitch, yaw", "q = qz(yaw) × qy(pitch) × qx(roll), each built from half angles."),
      referenceSource: lines(
        "function quaternionFromRPY(roll, pitch, yaw) {",
        "  var qx = { x: Math.sin(roll / 2), y: 0, z: 0, w: Math.cos(roll / 2) };",
        "  var qy = { x: 0, y: Math.sin(pitch / 2), z: 0, w: Math.cos(pitch / 2) };",
        "  var qz = { x: 0, y: 0, z: Math.sin(yaw / 2), w: Math.cos(yaw / 2) };",
        "  return quaternionMultiply(quaternionMultiply(qz, qy), qx);",
        "}"
      ),
      comparator: "quaternion", walkthroughChapter: "se3",
      dependencies: ["quaternion-multiply"],
      reference: docref("tf2 · Quaternion::setRPY", "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Quaternion.html"),
      scene: { kind: "se3", view: "rpy", handles: RPY_SLIDERS },
      diagnoses: [
        diagnosis("xyz-order", "Multiplied in X-Y-Z order: setRPY applies yaw first, so the product is qz × qy × qx.", lines(
          "function quaternionFromRPY(roll, pitch, yaw) {",
          "  var qx = { x: Math.sin(roll / 2), y: 0, z: 0, w: Math.cos(roll / 2) };",
          "  var qy = { x: 0, y: Math.sin(pitch / 2), z: 0, w: Math.cos(pitch / 2) };",
          "  var qz = { x: 0, y: 0, z: Math.sin(yaw / 2), w: Math.cos(yaw / 2) };",
          "  return quaternionMultiply(quaternionMultiply(qx, qy), qz);",
          "}"
        )),
        diagnosis("half-angle-missing", "Used the full angle: a quaternion stores sin and cos of half the angle.", lines(
          "function quaternionFromRPY(roll, pitch, yaw) {",
          "  var qx = { x: Math.sin(roll), y: 0, z: 0, w: Math.cos(roll) };",
          "  var qy = { x: 0, y: Math.sin(pitch), z: 0, w: Math.cos(pitch) };",
          "  var qz = { x: 0, y: 0, z: Math.sin(yaw), w: Math.cos(yaw) };",
          "  return quaternionMultiply(quaternionMultiply(qz, qy), qx);",
          "}"
        )),
      ],
      hints: ["Each axis rotation is its own quaternion with half angles.", "Order matters: qz × qy × qx (yaw, then pitch, then roll).", "Build qx, qy, qz with sin(angle/2) on their axis and cos(angle/2) in w, then multiply."],
      cases: [
        example([0, 0, PI / 2], Z90, "yaw only"),
        example([PI / 2, 0, 0], X90, "roll only"),
        example([0, PI / 2, 0], Y90, "pitch only"),
        example([PI / 3, PI / 3, 0], RP60, "roll and pitch"),
        example([PI / 2, 0, PI / 2], { x: 0.5, y: 0.5, z: 0.5, w: 0.5 }, "roll and yaw"),
      ],
    }),
    puzzle({
      number: 35, id: "yaw-from-quaternion", track: "toolkit", title: "Yaw from a Quaternion",
      goal: "Extract the yaw angle from any quaternion, the way tf2::getYaw does.",
      concept: "The shortcut 2·atan2(z, w) only works when roll and pitch are zero.",
      functionName: "yawFromQuaternion", signature: "yawFromQuaternion(q) → radians",
      starterSource: starter("yawFromQuaternion", "q", "yaw = atan2(2(w·z + x·y), 1 − 2(y² + z²))."),
      referenceSource: "function yawFromQuaternion(q) { return Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z)); }",
      comparator: "angle", walkthroughChapter: "se3",
      reference: docref("tf2 · getYaw (tf2/utils.h)", "https://docs.ros.org/en/rolling/p/tf2/generated/namespacetf2.html"),
      scene: { kind: "se3", view: "rpy", handles: [
        { id: "roll", type: "slider", label: "roll", value: 0.6, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "pitch", value: 0.4, min: -PI / 2, max: PI / 2 },
        { id: "yaw", type: "slider", label: "yaw", value: 1.2, min: -PI, max: PI },
      ], args: [{ fixture: "quatFromRPY" }] },
      diagnoses: [diagnosis("pure-yaw-shortcut", "2·atan2(z, w) assumes no roll or pitch; use the full formula with x·y and y² terms.", "function yawFromQuaternion(q) { return 2 * Math.atan2(q.z, q.w); }")],
      hints: ["Yaw is the rotation of the body x axis projected onto the XY plane.", "Numerator 2(wz + xy); denominator 1 − 2(y² + z²).", "Return Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z))."],
      cases: [
        example([Z90], PI / 2, "pure yaw"),
        example([X90], 0, "pure roll"),
        example([RP60], 0, "roll and pitch, no yaw"),
        example([{ x: 0, y: 0, z: -HALF, w: HALF }], -PI / 2, "negative yaw"),
        example([{ x: 0.5, y: 0.5, z: 0.5, w: 0.5 }], PI / 2, "roll and yaw"),
      ],
    }),
    puzzle({
      number: 36, id: "rpy-from-quaternion", track: "toolkit", title: "Roll, Pitch, Yaw from a Quaternion",
      goal: "Recover all three Euler angles from a quaternion.",
      concept: "Pitch comes from an asin that must be clamped; roll and yaw come from atan2 pairs.",
      functionName: "rpyFromQuaternion", signature: "rpyFromQuaternion(q) → { roll, pitch, yaw }",
      starterSource: starter("rpyFromQuaternion", "q", "roll = atan2(2(wx + yz), 1 − 2(x² + y²)); pitch = asin(2(wy − zx)); reuse yawFromQuaternion."),
      referenceSource: lines(
        "function rpyFromQuaternion(q) {",
        "  var sinp = 2 * (q.w * q.y - q.z * q.x);",
        "  if (sinp > 1) sinp = 1;",
        "  if (sinp < -1) sinp = -1;",
        "  return { roll: Math.atan2(2 * (q.w * q.x + q.y * q.z), 1 - 2 * (q.x * q.x + q.y * q.y)), pitch: Math.asin(sinp), yaw: yawFromQuaternion(q) };",
        "}"
      ),
      comparator: "angles", walkthroughChapter: "se3",
      dependencies: ["yaw-from-quaternion"],
      reference: docref("tf2 · Matrix3x3::getRPY", "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Matrix3x3.html"),
      scene: { kind: "se3", view: "rpy", handles: [
        { id: "roll", type: "slider", label: "roll", value: 0.5, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "pitch", value: -0.3, min: -PI / 2, max: PI / 2 },
        { id: "yaw", type: "slider", label: "yaw", value: 2.0, min: -PI, max: PI },
      ], args: [{ fixture: "quatFromRPY" }] },
      diagnoses: [diagnosis("roll-yaw-swapped", "Roll and yaw are swapped: roll uses (wx + yz) and the x², y² terms; yaw uses (wz + xy).", lines(
        "function rpyFromQuaternion(q) {",
        "  var sinp = 2 * (q.w * q.y - q.z * q.x);",
        "  if (sinp > 1) sinp = 1;",
        "  if (sinp < -1) sinp = -1;",
        "  return { roll: yawFromQuaternion(q), pitch: Math.asin(sinp), yaw: Math.atan2(2 * (q.w * q.x + q.y * q.z), 1 - 2 * (q.x * q.x + q.y * q.y)) };",
        "}"
      ))],
      hints: ["Each angle has its own pair of quaternion terms.", "Clamp the asin argument to [−1, 1] before calling it.", "roll: atan2(2(wx + yz), 1 − 2(x² + y²)); pitch: asin(2(wy − zx)); yaw: yawFromQuaternion(q)."],
      cases: [
        example([Z90], { roll: 0, pitch: 0, yaw: PI / 2 }, "pure yaw"),
        example([X90], { roll: PI / 2, pitch: 0, yaw: 0 }, "pure roll"),
        example([RP60], { roll: PI / 3, pitch: PI / 3, yaw: 0 }, "roll and pitch"),
        example([{ x: 0.5, y: 0.5, z: 0.5, w: 0.5 }], { roll: PI / 2, pitch: 0, yaw: PI / 2 }, "roll and yaw"),
      ],
    }),
    puzzle({
      number: 37, id: "slerp-quaternion", track: "toolkit", title: "Slerp Between Rotations",
      goal: "Interpolate two quaternions along the shortest arc, the way TF2 interpolates 3D orientation.",
      concept: "Flip the sign when the dot product is negative, then weight by sines of the arc angle.",
      functionName: "slerpQuaternion", signature: "slerpQuaternion(a, b, amount) → quaternion",
      starterSource: starter("slerpQuaternion", "a, b, amount"),
      referenceSource: lines(
        "function slerpQuaternion(a, b, amount) {",
        "  var dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;",
        "  var target = b;",
        "  if (dot < 0) { dot = -dot; target = { x: -b.x, y: -b.y, z: -b.z, w: -b.w }; }",
        "  var wa, wb;",
        "  if (dot > 0.9995) { wa = 1 - amount; wb = amount; }",
        "  else { var theta = Math.acos(dot); wa = Math.sin((1 - amount) * theta) / Math.sin(theta); wb = Math.sin(amount * theta) / Math.sin(theta); }",
        "  var q = { x: wa * a.x + wb * target.x, y: wa * a.y + wb * target.y, z: wa * a.z + wb * target.z, w: wa * a.w + wb * target.w };",
        "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };",
        "}"
      ),
      comparator: "quaternion", walkthroughChapter: "time-buffer",
      reference: docref("tf2 · Quaternion::slerp", "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Quaternion.html"),
      scene: { kind: "se3", view: "slerp", handles: [
        { id: "yawA", type: "slider", label: "a: yaw", value: 2.9, min: -PI, max: PI },
        { id: "yawB", type: "slider", label: "b: yaw", value: -2.7, min: -PI, max: PI },
        { id: "amount", type: "slider", label: "amount", value: 0.5, min: 0, max: 1 },
      ], args: [{ fixture: "slerpA" }, { fixture: "slerpB" }, { handle: "amount" }] },
      diagnoses: [
        diagnosis("component-lerp", "Linear interpolation of components does not move at constant angular speed; weight by sin((1−t)θ) and sin(tθ).", lines(
          "function slerpQuaternion(a, b, amount) {",
          "  var dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;",
          "  var target = dot < 0 ? { x: -b.x, y: -b.y, z: -b.z, w: -b.w } : b;",
          "  var q = { x: (1 - amount) * a.x + amount * target.x, y: (1 - amount) * a.y + amount * target.y, z: (1 - amount) * a.z + amount * target.z, w: (1 - amount) * a.w + amount * target.w };",
          "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };",
          "}"
        )),
        diagnosis("long-way", "Took the long way around: when the dot product is negative, negate b first.", lines(
          "function slerpQuaternion(a, b, amount) {",
          "  var dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;",
          "  var wa, wb;",
          "  if (Math.abs(dot) > 0.9995) { wa = 1 - amount; wb = amount; }",
          "  else { var theta = Math.acos(dot); wa = Math.sin((1 - amount) * theta) / Math.sin(theta); wb = Math.sin(amount * theta) / Math.sin(theta); }",
          "  var q = { x: wa * a.x + wb * b.x, y: wa * a.y + wb * b.y, z: wa * a.z + wb * b.z, w: wa * a.w + wb * b.w };",
          "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };",
          "}"
        )),
      ],
      hints: ["q and −q are the same rotation, so pick the closer sign of b first.", "θ = acos(a·b); weights are sin((1−t)θ)/sin θ and sin(tθ)/sin θ.", "Fall back to a normalized linear blend when a·b > 0.9995 to avoid dividing by sin θ ≈ 0."],
      cases: [
        example([IDENTITY_Q, Z90, 0.5], { x: 0, y: 0, z: Math.sin(PI / 8), w: Math.cos(PI / 8) }, "halfway to a quarter turn"),
        example([IDENTITY_Q, Z90, 0.25], { x: 0, y: 0, z: Math.sin(PI / 16), w: Math.cos(PI / 16) }, "quarter of the way"),
        example([Z170, Z_MINUS_170, 0.5], { x: 0, y: 0, z: 1, w: 0 }, "across the wrap"),
        example([X90, Y90, 1], Y90, "amount one"),
        example([X90, Y90, 0], X90, "amount zero"),
      ],
    }),
    puzzle({
      number: 38, id: "transform-point-3d", track: "toolkit", title: "Transform a 3D Point",
      goal: "Apply an SE(3) transform to a point: rotate by the quaternion, then translate.",
      concept: "Same rotate-then-translate order as transformPoint, with a quaternion doing the rotating.",
      functionName: "transformPoint3D", signature: "transformPoint3D(aFromB, point) → vector3",
      starterSource: starter("transformPoint3D", "aFromB, point", "rotateByQuaternion first, then add the translation."),
      referenceSource: lines(
        "function transformPoint3D(aFromB, point) {",
        "  var rotated = rotateByQuaternion(aFromB.rotation, point);",
        "  return { x: rotated.x + aFromB.translation.x, y: rotated.y + aFromB.translation.y, z: rotated.z + aFromB.translation.z };",
        "}"
      ),
      comparator: "vector3", walkthroughChapter: "stamped-data",
      dependencies: ["rotate-by-quaternion"],
      reference: docref("tf2 · doTransform(PointStamped)", "https://docs.ros.org/en/rolling/p/tf2_geometry_msgs/"),
      scene: { kind: "se3", view: "point3d", handles: [
        { id: "yaw", type: "slider", label: "b: yaw", value: PI / 2, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "b: pitch", value: 0.3, min: -PI / 2, max: PI / 2 },
      ], args: [{ fixture: "aFromBSliders" }, { fixture: "point3" }] },
      diagnoses: [diagnosis("translate-then-rotate", "Translated before rotating: the offset got rotated too.", lines(
        "function transformPoint3D(aFromB, point) {",
        "  var shifted = { x: point.x + aFromB.translation.x, y: point.y + aFromB.translation.y, z: point.z + aFromB.translation.z };",
        "  return rotateByQuaternion(aFromB.rotation, shifted);",
        "}"
      ))],
      hints: ["A rigid transform rotates first, then translates.", "Rotate the point with rotateByQuaternion(aFromB.rotation, point).", "Add aFromB.translation component-wise to the rotated point."],
      cases: [
        example([{ translation: { x: 1, y: 0, z: 0 }, rotation: Z90 }, { x: 1, y: 0, z: 0 }], { x: 1, y: 1, z: 0 }, "quarter turn then shift"),
        example([{ translation: { x: 0, y: 0, z: 1 }, rotation: IDENTITY_Q }, { x: 2, y: 3, z: 4 }], { x: 2, y: 3, z: 5 }, "pure translation"),
        example([{ translation: { x: 1, y: 1, z: 1 }, rotation: Y90 }, { x: 0, y: 0, z: 1 }], { x: 2, y: 1, z: 1 }, "pitch then shift"),
      ],
    }),
    puzzle({
      number: 39, id: "invert-se3", track: "toolkit", title: "Invert an SE(3) Transform",
      goal: "Invert a translation-plus-quaternion transform.",
      concept: "The inverse rotation is the conjugate, and the inverse translation is that rotation applied to −t.",
      functionName: "invertSE3", signature: "invertSE3(aFromB) → bFromA",
      starterSource: starter("invertSE3", "aFromB", "conjugate = (−x, −y, −z, w); translation = rotate(conjugate, −t)."),
      referenceSource: lines(
        "function invertSE3(aFromB) {",
        "  var q = aFromB.rotation;",
        "  var conjugate = { x: -q.x, y: -q.y, z: -q.z, w: q.w };",
        "  var t = rotateByQuaternion(conjugate, { x: -aFromB.translation.x, y: -aFromB.translation.y, z: -aFromB.translation.z });",
        "  return { translation: t, rotation: conjugate };",
        "}"
      ),
      comparator: "se3", walkthroughChapter: "composition",
      dependencies: ["rotate-by-quaternion"],
      reference: docref("tf2 · Transform::inverse", "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Transform.html"),
      scene: { kind: "se3", view: "inverse", handles: [
        { id: "yaw", type: "slider", label: "b: yaw", value: 0.9, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "b: pitch", value: 0.4, min: -PI / 2, max: PI / 2 },
      ], args: [{ fixture: "aFromBSliders" }] },
      diagnoses: [
        diagnosis("negated-only", "Only negated the translation: it must be rotated by the conjugate as well.", lines(
          "function invertSE3(aFromB) {",
          "  var q = aFromB.rotation;",
          "  return { translation: { x: -aFromB.translation.x, y: -aFromB.translation.y, z: -aFromB.translation.z }, rotation: { x: -q.x, y: -q.y, z: -q.z, w: q.w } };",
          "}"
        )),
        diagnosis("rotation-not-inverted", "The rotation was kept as is: the inverse needs the conjugate quaternion.", lines(
          "function invertSE3(aFromB) {",
          "  var q = aFromB.rotation;",
          "  var conjugate = { x: -q.x, y: -q.y, z: -q.z, w: q.w };",
          "  var t = rotateByQuaternion(conjugate, { x: -aFromB.translation.x, y: -aFromB.translation.y, z: -aFromB.translation.z });",
          "  return { translation: t, rotation: q };",
          "}"
        )),
      ],
      hints: ["For a unit quaternion the inverse is the conjugate.", "bFromA translation = conjugate applied to −t.", "Return { translation: rotateByQuaternion(conjugate, −t), rotation: conjugate }."],
      cases: [
        example([{ translation: { x: 1, y: 0, z: 0 }, rotation: Z90 }], { translation: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: -HALF, w: HALF } }, "quarter-turn inverse"),
        example([{ translation: { x: 2, y: -4, z: 6 }, rotation: IDENTITY_Q }], { translation: { x: -2, y: 4, z: -6 }, rotation: IDENTITY_Q }, "translation inverse"),
        example([{ translation: { x: 0, y: 0, z: 1 }, rotation: Y90 }], { translation: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: -HALF, z: 0, w: HALF } }, "pitch inverse"),
      ],
    }),
    puzzle({
      number: 40, id: "optical-to-body", track: "toolkit", title: "Camera Optical Frame to Body Frame",
      goal: "Re-express a camera_optical vector (x right, y down, z forward) in the body frame (x forward, y left, z up).",
      concept: "REP-103: optical z is body x, optical x is body −y, optical y is body −z.",
      functionName: "opticalToBody", signature: "opticalToBody(v) → vector3",
      starterSource: starter("opticalToBody", "v", "body.x = v.z; body.y = −v.x; body.z = −v.y."),
      referenceSource: "function opticalToBody(v) { return { x: v.z, y: -v.x, z: -v.y }; }",
      comparator: "vector3", walkthroughChapter: "se3",
      reference: docref("REP-103 · Standard Units of Measure and Coordinate Conventions (suffix frames)", "https://www.ros.org/reps/rep-0103.html#suffix-frames"),
      scene: { kind: "se3", view: "optical", handles: [
        { id: "yaw", type: "slider", label: "ray yaw (body)", value: 0.5, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "ray pitch (body)", value: 0.2, min: -PI / 2, max: PI / 2 },
      ], args: [{ fixture: "opticalRay" }] },
      diagnoses: [
        diagnosis("axes-swapped-only", "Axes were permuted but not flipped: optical x points right, which is body −y; optical y points down, which is body −z.", "function opticalToBody(v) { return { x: v.z, y: v.x, z: v.y }; }"),
        diagnosis("body-to-optical", "That is the inverse mapping (body → optical). This puzzle converts optical → body.", "function opticalToBody(v) { return { x: -v.y, y: -v.z, z: v.x }; }"),
      ],
      hints: ["Optical z is forward, which is body x.", "Optical x is right (body −y); optical y is down (body −z).", "Return { x: v.z, y: -v.x, z: -v.y }."],
      cases: [
        example([{ x: 0, y: 0, z: 1 }], { x: 1, y: 0, z: 0 }, "optical forward"),
        example([{ x: 1, y: 0, z: 0 }], { x: 0, y: -1, z: 0 }, "optical right"),
        example([{ x: 0, y: 1, z: 0 }], { x: 0, y: 0, z: -1 }, "optical down"),
        example([{ x: 0.5, y: -0.25, z: 2 }], { x: 2, y: -0.5, z: 0.25 }, "general ray"),
      ],
    }),
  ];
```

Then change the `PUZZLES` line to:

```js
  const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7, TOOLKIT_8, TOOLKIT_9));
```

- [ ] **Step 5: Extend the SE(3) scene with the new views**

In `puzzle-scenes.js`, in `describe`, insert directly after `if ("beforeIndex" in value) return …;`:

```js
      if ("roll" in value && "pitch" in value && "yaw" in value) return "roll " + degrees(value.roll) + " · pitch " + degrees(value.pitch) + " · yaw " + degrees(value.yaw);
```

Replace the whole `const se3Scene = { … };` definition (from `const se3Scene = {` through its closing `  };`) with:

```js
  function qconj(q) { return { x: -q.x, y: -q.y, z: -q.z, w: q.w }; }
  function qFromRPY(roll, pitch, yaw) {
    return qmul(qmul(axisAngle(AXIS_Z, yaw), axisAngle(AXIS_Y, pitch)), axisAngle({ x: 1, y: 0, z: 0 }, roll));
  }
  function transform3(t, p) {
    const r = qrot(t.rotation, p);
    return { x: r.x + t.translation.x, y: r.y + t.translation.y, z: r.z + t.translation.z };
  }
  function compose3(a, b) { return { translation: transform3(a, b.translation), rotation: qmul(a.rotation, b.rotation) }; }
  function direction3(yaw, pitch) { return { x: Math.cos(pitch) * Math.cos(yaw), y: Math.cos(pitch) * Math.sin(yaw), z: Math.sin(pitch) }; }
  function bodyToOptical(v) { return { x: -v.y, y: -v.z, z: v.x }; }
  const OPTICAL_BASIS = { x: { x: 0, y: -1, z: 0 }, y: { x: 0, y: 0, z: -1 }, z: { x: 1, y: 0, z: 0 } };
  const IDENTITY_BASIS = basisOf({ x: 0, y: 0, z: 0, w: 1 });
  function isSE3(t) { return Boolean(t) && typeof t === "object" && isVector3(t.translation) && isQuaternion(t.rotation); }
  function isRPY(v) { return Boolean(v) && typeof v === "object" && ["roll", "pitch", "yaw"].every((key) => Number.isFinite(v[key])); }
  const se3Scene = {
    fixtures: {
      quatA: (values) => axisAngle(AXIS_Z, values.yawA),
      quatB: (values) => axisAngle(AXIS_Y, values.pitchB),
      quat: (values) => axisAngle(AXIS_Z, values.yaw),
      vector: () => ({ x: 1, y: 0.4, z: 0.2 }),
      aFromB: (values) => ({ translation: { x: 1, y: 0, z: 0 }, rotation: axisAngle(AXIS_Z, values.yawA) }),
      bFromC: (values) => ({ translation: { x: 1, y: 0, z: 0.5 }, rotation: axisAngle(AXIS_Y, values.pitchB) }),
      quatFromRPY: (values) => qFromRPY(values.roll, values.pitch, values.yaw),
      slerpA: (values) => axisAngle(AXIS_Z, values.yawA),
      slerpB: (values) => axisAngle(AXIS_Z, values.yawB),
      aFromBSliders: (values) => ({ translation: { x: 1, y: 0, z: 0.5 }, rotation: qmul(axisAngle(AXIS_Z, values.yaw), axisAngle(AXIS_Y, values.pitch)) }),
      point3: () => ({ x: 1, y: 0.4, z: 0.2 }),
      opticalRay: (values) => bodyToOptical(direction3(values.yaw, values.pitch)),
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const out = [axes3d(ORIGIN3, IDENTITY_BASIS, "world", "muted"), ...laneLayers(context.puzzle, context.values)];
      const drawBasis = (q, text, style, dashed) => out.push(axes3d(ORIGIN3, basisOf(q), text, style, dashed ? { dashed: true } : {}));
      if (view === "rotate") {
        const v = se3Scene.fixtures.vector();
        out.push(arrow3d(ORIGIN3, v, "v", "input"));
        if (isVector3(context.expected)) out.push(arrow3d(ORIGIN3, context.expected, "expected", "expected", { dashed: true }));
        if (isVector3(context.actual)) out.push(arrow3d(ORIGIN3, context.actual, resultLabel(context), resultStyle(context)));
      } else if (view === "compose") {
        const aFromB = se3Scene.fixtures.aFromB(context.values);
        out.push(axes3d(aFromB.translation, basisOf(aFromB.rotation), "b", "input"));
        if (isSE3(context.expected)) out.push(axes3d(context.expected.translation, basisOf(context.expected.rotation), "expected c", "expected", { dashed: true }));
        if (isSE3(context.actual)) out.push(axes3d(context.actual.translation, basisOf(context.actual.rotation), resultLabel(context), resultStyle(context)));
      } else if (view === "rpy") {
        const input = se3Scene.fixtures.quatFromRPY(context.values);
        out.push(axes3d(ORIGIN3, basisOf(input), "input rpy", "input", { size: 0.9 }));
        if (typeof context.expected === "number") out.push(arrow3d(ORIGIN3, direction3(context.expected, 0), "expected yaw", "expected", { dashed: true }));
        if (typeof context.actual === "number" && Number.isFinite(context.actual)) out.push(arrow3d(ORIGIN3, direction3(context.actual, 0), resultLabel(context), resultStyle(context)));
        if (isRPY(context.expected)) drawBasis(qFromRPY(context.expected.roll, context.expected.pitch, context.expected.yaw), "expected", "expected", true);
        if (isRPY(context.actual)) drawBasis(qFromRPY(context.actual.roll, context.actual.pitch, context.actual.yaw), resultLabel(context), resultStyle(context), false);
        if (isQuaternion(context.expected)) drawBasis(context.expected, "expected", "expected", true);
        if (isQuaternion(context.actual)) drawBasis(context.actual, resultLabel(context), resultStyle(context), false);
      } else if (view === "slerp") {
        out.push(axes3d(ORIGIN3, basisOf(se3Scene.fixtures.slerpA(context.values)), "a", "muted", { size: 0.8 }));
        out.push(axes3d(ORIGIN3, basisOf(se3Scene.fixtures.slerpB(context.values)), "b", "muted", { size: 0.8 }));
        if (isQuaternion(context.expected)) drawBasis(context.expected, "expected", "expected", true);
        if (isQuaternion(context.actual)) drawBasis(context.actual, resultLabel(context), resultStyle(context), false);
      } else if (view === "point3d") {
        const aFromB = se3Scene.fixtures.aFromBSliders(context.values);
        const p = se3Scene.fixtures.point3();
        out.push(axes3d(aFromB.translation, basisOf(aFromB.rotation), "b", "input"), arrow3d(aFromB.translation, transform3(aFromB, p), "p in b", "input"));
        if (isVector3(context.expected)) out.push(arrow3d(ORIGIN3, context.expected, "expected in a", "expected", { dashed: true }));
        if (isVector3(context.actual)) out.push(arrow3d(ORIGIN3, context.actual, resultLabel(context), resultStyle(context)));
      } else if (view === "inverse") {
        const aFromB = se3Scene.fixtures.aFromBSliders(context.values);
        out.push(axes3d(aFromB.translation, basisOf(aFromB.rotation), "b", "input"), label("aFromB ∘ yours must land on the world axes", "muted", { row: 3 }));
        if (isSE3(context.expected)) {
          const placed = compose3(aFromB, context.expected);
          out.push(axes3d(placed.translation, basisOf(placed.rotation), "aFromB ∘ expected", "expected", { dashed: true }));
        }
        if (isSE3(context.actual)) {
          const placed = compose3(aFromB, context.actual);
          out.push(axes3d(placed.translation, basisOf(placed.rotation), "aFromB ∘ yours", resultStyle(context)));
        }
      } else if (view === "optical") {
        const body = direction3(context.values.yaw, context.values.pitch);
        out.push(axes3d(ORIGIN3, OPTICAL_BASIS, "optical: x right, y down, z fwd", "input", { size: 0.8 }), arrow3d(ORIGIN3, body, "ray (given in optical coords)", "input"));
        if (isVector3(context.expected)) out.push(arrow3d(ORIGIN3, context.expected, "expected in body", "expected", { dashed: true }));
        if (isVector3(context.actual)) out.push(arrow3d(ORIGIN3, context.actual, resultLabel(context), resultStyle(context)));
      } else {
        if (isQuaternion(context.expected)) drawBasis(context.expected, "expected", "expected", true);
        if (isQuaternion(context.actual)) drawBasis(context.actual, resultLabel(context), resultStyle(context), false);
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
```

`qconj`, `compose3`, and `transform3` are also used by later tasks.

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `34/34 puzzle tests passed`.

- [ ] **Step 7: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzles.js p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-engine.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: add 3D orientation stage with RPY, slerp, SE(3), and optical frame

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Np6fGLQWawWohjyrsBWLcz"
```

---

### Task 3: Stage 10 (Motion and Uncertainty) with motion, trail, and covariance scenes

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzles.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-scenes.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-sketch.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-tests.js`

- [ ] **Step 1: Add failing tests**

Append to `puzzle-tests.js` before `async function runAllTests()`:

```js
  test("catalog track 2 stage 10 contains motion and covariance bricks", () => {
    same(idsInRange(41, 43), ["integrate-motion", "dead-reckon", "rotate-covariance"]);
  });

  test("catalog stage 10 references pass their cases and diagnoses differ", () => {
    checkStageRange(41, 43);
  });

  test("scenes: motion, motion-trail, and covariance kinds build valid arguments and finite layers", () => {
    checkSceneKinds(["motion", "motion-trail", "covariance"]);
    const api = scenesApi();
    const trail = puzzlesApi().getPuzzle("dead-reckon");
    const args = api.toArgs(trail, api.initialValues(trail));
    assert(Array.isArray(args[1]) && args[1].length === 20, "dead-reckon scene supplies 20 commands");
  });
```

- [ ] **Step 2: Run the tests and confirm the new tests fail**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `34/37 puzzle tests passed`.

- [ ] **Step 3: Add the Stage 10 puzzles**

Insert directly before `const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7, TOOLKIT_8, TOOLKIT_9));`:

```js
  const TOOLKIT_10 = [
    puzzle({
      number: 41, id: "integrate-motion", track: "toolkit", title: "Integrate One Odometry Step",
      goal: "Advance a pose by velocity v and yaw rate ω over dt, exactly like the EKF motion model.",
      concept: "This is how odom → base_link is produced, one dead-reckoned step at a time.",
      functionName: "integrateMotion", signature: "integrateMotion(pose, v, omega, dt) → pose",
      starterSource: starter("integrateMotion", "pose, v, omega, dt", "x += v·dt·cos(yaw); y += v·dt·sin(yaw); yaw = wrapAngle(yaw + ω·dt)."),
      referenceSource: lines(
        "function integrateMotion(pose, v, omega, dt) {",
        "  return { x: pose.x + v * dt * Math.cos(pose.yaw), y: pose.y + v * dt * Math.sin(pose.yaw), yaw: wrapAngle(pose.yaw + omega * dt) };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "frame-roles",
      dependencies: ["wrap-angle"],
      reference: pyref("Localization/extended_kalman_filter/extended_kalman_filter.py", "motion_model"),
      scene: { kind: "motion", handles: [
        { id: "pose", type: "pose", label: "pose", value: { x: -2, y: -0.5, yaw: 0.4 } },
        { id: "v", type: "slider", label: "v (m/s)", value: 1.5, min: 0, max: 3 },
        { id: "omega", type: "slider", label: "ω (rad/s)", value: 0.8, min: -2, max: 2 },
        { id: "dt", type: "slider", label: "dt (s)", value: 1.0, min: 0.1, max: 2 },
      ] },
      diagnoses: [
        diagnosis("yaw-updated-first", "The translation used the new yaw: the model moves along the current heading, then turns.", lines(
          "function integrateMotion(pose, v, omega, dt) {",
          "  var yaw = wrapAngle(pose.yaw + omega * dt);",
          "  return { x: pose.x + v * dt * Math.cos(yaw), y: pose.y + v * dt * Math.sin(yaw), yaw: yaw };",
          "}"
        )),
        diagnosis("omega-ignored", "The yaw rate was ignored: yaw must advance by ω·dt.", "function integrateMotion(pose, v, omega, dt) { return { x: pose.x + v * dt * Math.cos(pose.yaw), y: pose.y + v * dt * Math.sin(pose.yaw), yaw: pose.yaw }; }"),
      ],
      hints: ["Distance travelled is v·dt along the current heading.", "Turn by ω·dt after moving, and wrap the result.", "Return { x: x + v·dt·cos(yaw), y: y + v·dt·sin(yaw), yaw: wrapAngle(yaw + ω·dt) }."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, 1, 0.1, 0.1], { x: 0.1, y: 0, yaw: 0.01 }, "PythonRobotics defaults"),
        example([{ x: 1, y: 2, yaw: PI / 2 }, 2, 0, 0.5], { x: 1, y: 3, yaw: PI / 2 }, "straight along +y"),
        example([{ x: 0, y: 0, yaw: PI }, 1, 1, PI], { x: -PI, y: 0, yaw: 0 }, "move then wrap"),
        example([{ x: 0, y: 0, yaw: 0 }, 0, 0.5, 2], { x: 0, y: 0, yaw: 1 }, "turn in place"),
      ],
    }),
    puzzle({
      number: 42, id: "dead-reckon", track: "toolkit", title: "Dead Reckoning",
      goal: "Fold a list of (v, ω, dt) commands into a final pose.",
      concept: "Odometry drift is what happens when these commands carry small errors and nothing corrects them.",
      functionName: "deadReckon", signature: "deadReckon(start, commands) → pose",
      starterSource: starter("deadReckon", "start, commands", "Apply integrateMotion for each command in order."),
      referenceSource: lines(
        "function deadReckon(start, commands) {",
        "  var pose = { x: start.x, y: start.y, yaw: start.yaw };",
        "  for (var i = 0; i < commands.length; i += 1) pose = integrateMotion(pose, commands[i].v, commands[i].omega, commands[i].dt);",
        "  return pose;",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "frame-roles",
      dependencies: ["integrate-motion"],
      reference: pyref("Localization/extended_kalman_filter/extended_kalman_filter.py", "observation (xDR dead reckoning)"),
      scene: { kind: "motion-trail", handles: [{ id: "start", type: "pose", label: "start", value: { x: -3, y: -1, yaw: 0.3 } }], args: [{ handle: "start" }, { fixture: "commands" }] },
      diagnoses: [diagnosis("commands-reversed", "Commands were applied last to first: dead reckoning replays them in order.", lines(
        "function deadReckon(start, commands) {",
        "  var pose = { x: start.x, y: start.y, yaw: start.yaw };",
        "  for (var i = commands.length - 1; i >= 0; i -= 1) pose = integrateMotion(pose, commands[i].v, commands[i].omega, commands[i].dt);",
        "  return pose;",
        "}"
      ))],
      hints: ["Start from a copy of the start pose.", "Each command is one integrateMotion step.", "Loop over commands in order and feed the result back in."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, [{ v: 1, omega: 0, dt: 1 }, { v: 1, omega: 0, dt: 1 }]], { x: 2, y: 0, yaw: 0 }, "two straight steps"),
        example([{ x: 0, y: 0, yaw: 0 }, [{ v: 0, omega: PI / 2, dt: 1 }, { v: 1, omega: 0, dt: 1 }]], { x: 0, y: 1, yaw: PI / 2 }, "turn then move"),
        example([{ x: 1, y: 1, yaw: 0 }, []], { x: 1, y: 1, yaw: 0 }, "no commands"),
        example([{ x: 0, y: 0, yaw: 0 }, [{ v: 2, omega: 1, dt: 0.5 }]], { x: 1, y: 0, yaw: 0.5 }, "single step"),
      ],
    }),
    puzzle({
      number: 43, id: "rotate-covariance", track: "toolkit", title: "Rotate a Covariance",
      goal: "Express a 2×2 position covariance in a frame rotated by yaw: R Σ Rᵀ.",
      concept: "Uncertainty is a quadratic form, so it transforms with R on both sides, not once.",
      functionName: "rotateCovariance", signature: "rotateCovariance(cov, yaw) → 2×2",
      starterSource: starter("rotateCovariance", "cov, yaw", "Compute R·Σ first, then multiply by Rᵀ on the right."),
      referenceSource: lines(
        "function rotateCovariance(cov, yaw) {",
        "  var r = rotMat2d(yaw);",
        "  var rs = [",
        "    [r[0][0] * cov[0][0] + r[0][1] * cov[1][0], r[0][0] * cov[0][1] + r[0][1] * cov[1][1]],",
        "    [r[1][0] * cov[0][0] + r[1][1] * cov[1][0], r[1][0] * cov[0][1] + r[1][1] * cov[1][1]],",
        "  ];",
        "  return [",
        "    [rs[0][0] * r[0][0] + rs[0][1] * r[0][1], rs[0][0] * r[1][0] + rs[0][1] * r[1][1]],",
        "    [rs[1][0] * r[0][0] + rs[1][1] * r[0][1], rs[1][0] * r[1][0] + rs[1][1] * r[1][1]],",
        "  ];",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["rot-mat-2d"],
      reference: pyref("Localization/extended_kalman_filter/extended_kalman_filter.py", "ekf_estimation (jF @ PEst @ jF.T)"),
      scene: { kind: "covariance", handles: [{ id: "yaw", type: "dial", label: "yaw", value: 0.6 }], args: [{ fixture: "covariance" }, { handle: "yaw" }] },
      diagnoses: [
        diagnosis("no-transpose", "Multiplied R Σ R: the right-hand factor must be the transpose Rᵀ.", lines(
          "function rotateCovariance(cov, yaw) {",
          "  var r = rotMat2d(yaw);",
          "  var rs = [[r[0][0] * cov[0][0] + r[0][1] * cov[1][0], r[0][0] * cov[0][1] + r[0][1] * cov[1][1]], [r[1][0] * cov[0][0] + r[1][1] * cov[1][0], r[1][0] * cov[0][1] + r[1][1] * cov[1][1]]];",
          "  return [[rs[0][0] * r[0][0] + rs[0][1] * r[1][0], rs[0][0] * r[0][1] + rs[0][1] * r[1][1]], [rs[1][0] * r[0][0] + rs[1][1] * r[1][0], rs[1][0] * r[0][1] + rs[1][1] * r[1][1]]];",
          "}"
        )),
        diagnosis("unchanged", "The covariance was returned as is: a rotated frame sees a rotated ellipse.", "function rotateCovariance(cov, yaw) { return [[cov[0][0], cov[0][1]], [cov[1][0], cov[1][1]]]; }"),
      ],
      hints: ["A covariance transforms as R Σ Rᵀ.", "Build R with rotMat2d, multiply Σ on the left, then Rᵀ on the right.", "(R Σ Rᵀ)[i][j] = Σₖ (RΣ)[i][k] · R[j][k]."],
      cases: [
        example([[[4, 0], [0, 1]], PI / 2], [[1, 0], [0, 4]], "quarter turn swaps the axes"),
        example([[[1, 0], [0, 1]], 0.7], [[1, 0], [0, 1]], "isotropic is invariant"),
        example([[[2, 1], [1, 2]], PI], [[2, 1], [1, 2]], "half turn is invariant"),
        example([[[4, 0], [0, 1]], PI / 4], [[2.5, 1.5], [1.5, 2.5]], "45 degrees mixes the axes"),
      ],
    }),
  ];
```

Then change the `PUZZLES` line to:

```js
  const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7, TOOLKIT_8, TOOLKIT_9, TOOLKIT_10));
```

- [ ] **Step 4: Add the motion, trail, and covariance scenes**

In `puzzle-scenes.js`, insert directly before `const SCENES = {`:

```js
  // ------------------------------------------------------------ motion and uncertainty
  function stepMotion(pose, v, omega, dt) {
    return { x: pose.x + v * dt * Math.cos(pose.yaw), y: pose.y + v * dt * Math.sin(pose.yaw), yaw: wrap(pose.yaw + omega * dt) };
  }
  const TRAIL_COMMANDS = (() => {
    const list = [];
    for (let i = 0; i < 12; i += 1) list.push({ v: 1.1, omega: 0.45, dt: 0.5 });
    for (let j = 0; j < 8; j += 1) list.push({ v: 0.9, omega: -0.7, dt: 0.5 });
    return list;
  })();
  function pointsPrimitive(list, style, options) { return { kind: "points", points: list, style, ...(options || {}) }; }
  function segments(pairs, style, options) { return { kind: "segments", pairs, style, ...(options || {}) }; }
  function ellipse(center, covariance, style, options) { return { kind: "ellipse", center, covariance, style, ...(options || {}) }; }
  const motionScene = {
    fixtures: {},
    layers(context) {
      const pose = context.values.pose;
      const out = [glyph(pose, "pose", "input"), ...laneLayers(context.puzzle, context.values)];
      if (isTransform(context.expected)) out.push(arrow(pose, context.expected, "muted", { dashed: true, weight: 1 }), glyph(context.expected, "expected", "expected", { dashed: true }));
      if (isTransform(context.actual)) {
        out.push(glyph(context.actual, resultLabel(context), resultStyle(context)));
        out.push(...errorArrow(context, context.actual, context.expected));
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual), ["v = " + fmt(context.values.v) + " m/s · ω = " + fmt(context.values.omega) + " rad/s · dt = " + fmt(context.values.dt) + " s"]));
      return out;
    },
  };
  const motionTrailScene = {
    fixtures: { commands: () => TRAIL_COMMANDS },
    layers(context) {
      let pose = context.values.start;
      const trail = [];
      TRAIL_COMMANDS.forEach((command) => { pose = stepMotion(pose, command.v, command.omega, command.dt); trail.push({ x: pose.x, y: pose.y }); });
      const out = [glyph(context.values.start, "start", "input"), pointsPrimitive(trail, "muted", { size: 4 }), label(TRAIL_COMMANDS.length + " commands (v, ω, dt) applied in order", "muted", { row: 3 })];
      if (isTransform(context.expected)) out.push(glyph(context.expected, "expected end", "expected", { dashed: true }));
      if (isTransform(context.actual)) {
        out.push(glyph(context.actual, resultLabel(context), resultStyle(context)));
        out.push(...errorArrow(context, context.actual, context.expected));
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const COVARIANCE_INPUT = [[1.0, 0], [0, 0.16]];
  const covarianceScene = {
    fixtures: { covariance: () => COVARIANCE_INPUT },
    layers(context) {
      const handle = handleDefs(context.puzzle)[0];
      const yaw = context.values[handle.id];
      const out = [
        arc({ x: 0, y: 0 }, dialRadius(handle), 0, yaw, "input", { track: true }),
        label("yaw = " + degrees(yaw), "input", { at: direction(yaw, dialRadius(handle) + 0.5) }),
        ellipse({ x: 0, y: 0 }, COVARIANCE_INPUT, "muted", { label: "Σ (input)" }),
      ];
      if (isMatrix(context.expected, 2)) out.push(ellipse({ x: 0, y: 0 }, context.expected, "expected", { dashed: true, label: "expected R Σ Rᵀ" }));
      if (isMatrix(context.actual, 2)) out.push(ellipse({ x: 0, y: 0 }, context.actual, resultStyle(context), { label: resultLabel(context) }));
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
```

Add to the `SCENES` literal after `"matrix": matrixScene,`:

```js
    "motion": motionScene,
    "motion-trail": motionTrailScene,
    "covariance": covarianceScene,
```

In the `api` object, change the `primitives:` line to:

```js
    primitives: { frame, point, arrow, arc, label, glyph, lane, marker, shade, points: pointsPrimitive, segments, ellipse },
```

- [ ] **Step 5: Render points, segments, and ellipses in the sketch**

In `puzzle-sketch.js`, insert directly before `function drawPrimitive(primitive) {`:

```js
      function drawPoints(primitive) {
        const size = primitive.size || 5;
        p.push();
        p.noStroke();
        p.fill.apply(p, color(primitive.style, primitive.alpha === undefined ? 230 : primitive.alpha));
        (primitive.points || []).forEach((item) => {
          if (!item || !Number.isFinite(item.x) || !Number.isFinite(item.y)) return;
          const at = toScreen(item);
          p.circle(at.x, at.y, size);
        });
        p.pop();
        if (primitive.label && primitive.points && primitive.points.length) {
          const at = toScreen(primitive.points[0]);
          drawText(primitive.label, at.x + 8, at.y - 8, primitive.style, 10);
        }
      }

      function drawSegments(primitive) {
        (primitive.pairs || []).forEach((pair) => {
          if (!pair || !pair[0] || !pair[1]) return;
          strokeLine(pair[0], pair[1], primitive.style, { weight: primitive.weight || 1, dashed: primitive.dashed, alpha: primitive.alpha });
        });
      }

      function drawEllipse(primitive) {
        const cov = primitive.covariance;
        if (!cov || !cov[0] || !cov[1] || ![cov[0][0], cov[0][1], cov[1][0], cov[1][1]].every(Number.isFinite)) return;
        const a = cov[0][0];
        const b = (cov[0][1] + cov[1][0]) / 2;
        const d = cov[1][1];
        const mean = (a + d) / 2;
        const spread = Math.sqrt(Math.max(0, ((a - d) / 2) * ((a - d) / 2) + b * b));
        const major = Math.sqrt(Math.max(0, mean + spread));
        const minor = Math.sqrt(Math.max(0, mean - spread));
        const angle = 0.5 * Math.atan2(2 * b, a - d);
        const k = primitive.scale || 2;
        const center = toScreen(primitive.center);
        p.push();
        p.translate(center.x, center.y);
        p.rotate(-angle);
        p.noFill();
        p.stroke.apply(p, color(primitive.style));
        p.strokeWeight(2);
        setDash(Boolean(primitive.dashed));
        p.ellipse(0, 0, 2 * k * major * unit(), 2 * k * minor * unit());
        setDash(false);
        p.pop();
        if (primitive.label) {
          const tip = { x: center.x + k * major * unit() * Math.cos(angle) + 8, y: center.y - k * major * unit() * Math.sin(angle) - 6 };
          drawText(primitive.label, tip.x, tip.y, primitive.style, 10);
        }
      }
```

In `drawPrimitive`, insert directly after `case "arrow3d": return drawArrow3d(primitive);`:

```js
          case "points": return drawPoints(primitive);
          case "segments": return drawSegments(primitive);
          case "ellipse": return drawEllipse(primitive);
```

- [ ] **Step 6: Run the tests and syntax-check the sketch**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js` then `node --check p5sim/tf2_walkthrough/puzzle-sketch.js`

Expected: `37/37 puzzle tests passed` and no output from the check.

- [ ] **Step 7: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzles.js p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-sketch.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: add motion and uncertainty stage with trail and covariance scenes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Np6fGLQWawWohjyrsBWLcz"
```

---

### Task 4: Stage 11 (Time Travel) and the across-time view

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzles.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-scenes.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-tests.js`

- [ ] **Step 1: Add failing tests**

Append to `puzzle-tests.js` before `async function runAllTests()`:

```js
  test("catalog track 2 stage 11 contains the time-travel lookup", () => {
    same(idsInRange(44, 44), ["lookup-across-time"]);
  });

  test("catalog stage 11 references pass their cases and diagnoses differ", () => {
    checkStageRange(44, 44);
  });

  test("scenes: the across-time view builds valid arguments and finite layers", () => {
    checkSceneKinds(["robot-chain-time"]);
    const api = scenesApi();
    const puzzle = puzzlesApi().getPuzzle("lookup-across-time");
    const args = api.toArgs(puzzle, api.initialValues(puzzle));
    same(args.slice(1), ["base_link", 3, "laser", 7, "map"]);
    const result = referenceOutput(puzzle, args);
    assert(result.ok && result.targetTime === 3 && result.sourceTime === 7, "reference should answer the default scene lookup");
  });
```

- [ ] **Step 2: Run the tests and confirm the new tests fail**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `37/40 puzzle tests passed`.

- [ ] **Step 3: Add the Stage 11 puzzle**

Insert directly before `const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7, TOOLKIT_8, TOOLKIT_9, TOOLKIT_10));`:

```js
  const ROTATING_EDGES_CASE = [
    { parent: "map", child: "odom", samples: [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 10, transform: { x: 0, y: 0, yaw: PI } }] },
    { parent: "odom", child: "base_link", isStatic: true, transform: { x: 2, y: 0, yaw: 0 } },
  ];

  const TOOLKIT_11 = [
    puzzle({
      number: 44, id: "lookup-across-time", track: "toolkit", title: "Look Up Across Time",
      goal: "Answer tf2's advanced lookup: where was source at time t₂, seen from target at time t₁, through a fixed frame?",
      concept: "T_target(t₁)←source(t₂) = T_target(t₁)←fixed ∘ T_fixed←source(t₂); the fixed frame is the bridge between the two moments.",
      functionName: "lookupAcrossTime", signature: "lookupAcrossTime(edges, target, targetTime, source, sourceTime, fixedFrame) → result",
      starterSource: starter("lookupAcrossTime", "edges, target, targetTime, source, sourceTime, fixedFrame"),
      referenceSource: lines(
        "function lookupAcrossTime(edges, target, targetTime, source, sourceTime, fixedFrame) {",
        "  var targetFromFixed = lookupStampedTransform(edges, target, fixedFrame, targetTime);",
        "  if (!targetFromFixed.ok) return targetFromFixed;",
        "  var fixedFromSource = lookupStampedTransform(edges, fixedFrame, source, sourceTime);",
        "  if (!fixedFromSource.ok) return fixedFromSource;",
        "  return { ok: true, targetTime: targetTime, sourceTime: sourceTime, transform: compose(targetFromFixed.transform, fixedFromSource.transform) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "time-buffer",
      dependencies: ["stamped-lookup", "compose"],
      reference: docref("tf2 · Buffer::lookupTransform(target, target_time, source, source_time, fixed_frame)", "https://docs.ros.org/en/rolling/p/tf2_ros/generated/classtf2__ros_1_1Buffer.html"),
      scene: { kind: "robot-chain-time", view: "across-time", handles: [
        { id: "targetTime", type: "timeline", label: "target time t₁", value: 3, start: 0, end: 10 },
        { id: "sourceTime", type: "timeline", label: "source time t₂", value: 7, start: 0, end: 10 },
        { id: "target", type: "selector", label: "target", value: "base_link", options: CHAIN_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: CHAIN_OPTIONS },
      ], args: [{ fixture: "stampedEdges" }, { handle: "target" }, { handle: "targetTime" }, { handle: "source" }, { handle: "sourceTime" }, "map"] },
      diagnoses: [
        diagnosis("single-time", "Both ends were looked up at the target time: the source side must be sampled at sourceTime.", lines(
          "function lookupAcrossTime(edges, target, targetTime, source, sourceTime, fixedFrame) {",
          "  var targetFromFixed = lookupStampedTransform(edges, target, fixedFrame, targetTime);",
          "  if (!targetFromFixed.ok) return targetFromFixed;",
          "  var fixedFromSource = lookupStampedTransform(edges, fixedFrame, source, targetTime);",
          "  if (!fixedFromSource.ok) return fixedFromSource;",
          "  return { ok: true, targetTime: targetTime, sourceTime: sourceTime, transform: compose(targetFromFixed.transform, fixedFromSource.transform) };",
          "}"
        )),
        diagnosis("reversed-composition", "Composed in the wrong order: target←fixed goes on the left, fixed←source on the right.", lines(
          "function lookupAcrossTime(edges, target, targetTime, source, sourceTime, fixedFrame) {",
          "  var targetFromFixed = lookupStampedTransform(edges, target, fixedFrame, targetTime);",
          "  if (!targetFromFixed.ok) return targetFromFixed;",
          "  var fixedFromSource = lookupStampedTransform(edges, fixedFrame, source, sourceTime);",
          "  if (!fixedFromSource.ok) return fixedFromSource;",
          "  return { ok: true, targetTime: targetTime, sourceTime: sourceTime, transform: compose(fixedFromSource.transform, targetFromFixed.transform) };",
          "}"
        )),
      ],
      hints: ["Two ordinary stamped lookups, both through the fixed frame.", "target←fixed at t₁, then fixed←source at t₂.", "Return the first availability error, otherwise compose(targetFromFixed, fixedFromSource)."],
      cases: [
        example([STAMPED_EDGES_CASE, "base_link", 2, "base_link", 5, "map"], { ok: true, targetTime: 2, sourceTime: 5, transform: { x: 6, y: 0, yaw: 0 } }, "where the robot went"),
        example([STAMPED_EDGES_CASE, "laser", 0, "map", 6, "map"], { ok: true, targetTime: 0, sourceTime: 6, transform: { x: -1, y: 0, yaw: 0 } }, "map seen from the laser"),
        example([STAMPED_EDGES_CASE, "map", 8, "base_link", 3, "map"], { ok: false, code: "FUTURE_EXTRAPOLATION", bounds: { start: 0, end: 6 } }, "target time unavailable"),
        example([ROTATING_EDGES_CASE, "base_link", 0, "base_link", 10, "map"], { ok: true, targetTime: 0, sourceTime: 10, transform: { x: -4, y: 0, yaw: PI } }, "rotation across time"),
      ],
    }),
  ];
```

Then change the `PUZZLES` line to:

```js
  const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7, TOOLKIT_8, TOOLKIT_9, TOOLKIT_10, TOOLKIT_11));
```

- [ ] **Step 4: Add the across-time view to the robot-chain-time scene**

In `puzzle-scenes.js`:

1. In `describe`, replace the `if ("ok" in value) return …;` line with:

```js
      if ("ok" in value) {
        if (!value.ok) return value.code + (value.bounds ? " · bounds [" + fmt(value.bounds.start) + ", " + fmt(value.bounds.end) + "]" : "");
        const when = Number.isFinite(value.time) ? " · t=" + fmt(value.time) : (Number.isFinite(value.targetTime) ? " · t₁=" + fmt(value.targetTime) + " t₂=" + fmt(value.sourceTime) : "");
        return "ok" + when + (value.transform ? " · " + fmtTransform(value.transform) : "") + (value.bounds ? " · bounds [" + fmt(value.bounds.start) + ", " + fmt(value.bounds.end) + "]" : "");
      }
```

2. Replace the `chainLayers` function with a version that takes a style:

```js
  function chainLayers(values, style) {
    const tone = style || "input";
    const base = chainWorld(values, "base_link");
    const laser = chainWorld(values, "laser");
    return [frame(identity(), "map", "muted"), frame(values.odom, "odom", tone), arrow(values.odom, base, tone, { dashed: true, weight: 1 }), glyph(base, "base_link", tone), frame(laser, "laser", tone, { alpha: 170, size: 0.55 })];
  }
```

3. Insert directly before `const robotChainTimeScene = {`:

```js
  function sampledChain(time) {
    const sampled = {};
    STAMPED_EDGES.forEach((edge) => { sampled[edge.child] = sampleAt(edge, time); });
    return { odom: sampled.odom, base_link: sampled.base_link };
  }
  function acrossTimeLayers(context) {
    const dynamic = STAMPED_EDGES.filter((edge) => !edge.isStatic);
    const start = Math.max(...dynamic.map((edge) => edge.samples[0].time));
    const end = Math.min(...dynamic.map((edge) => edge.samples[edge.samples.length - 1].time));
    const clamp = (t) => Math.max(start, Math.min(end, t));
    const targetTime = clamp(context.values.targetTime);
    const sourceTime = clamp(context.values.sourceTime);
    const targetChain = sampledChain(targetTime);
    const sourceChain = sampledChain(sourceTime);
    const handle = findHandle(context.puzzle, "targetTime");
    const out = chainLayers(targetChain, "muted").concat(chainLayers(sourceChain, "input"), laneLayers(context.puzzle, context.values));
    dynamic.forEach((edge, index) => out.push(...rangeLane(handle, { start: edge.samples[0].time, end: edge.samples[edge.samples.length - 1].time }, -1.2 - index * 0.6, edge.parent + " → " + edge.child)));
    out.push(shade({ x: laneX(handle, start), y: -2.0 }, { x: laneX(handle, end), y: -0.9 }, "expected"));
    out.push(label("grey chain at t₁ = " + fmt(targetTime) + " · yellow chain at t₂ = " + fmt(sourceTime) + " · fixed frame: map", "muted", { at: { x: LANE_LEFT, y: -0.6 } }));
    const target = context.values.target;
    const source = context.values.source;
    const expectedTransform = context.expected && context.expected.ok ? context.expected.transform : null;
    const actualTransform = context.actual && context.actual.ok ? context.actual.transform : null;
    if (isTransform(expectedTransform)) out.push(frame(compose(chainWorld(targetChain, target), expectedTransform), target + "(t₁) ∘ expected", "expected", { dashed: true }));
    if (isTransform(actualTransform)) {
      const placed = compose(chainWorld(targetChain, target), actualTransform);
      out.push(frame(placed, target + "(t₁) ∘ yours", resultStyle(context)));
      out.push(...errorArrow(context, placed, chainWorld(sourceChain, source)));
    }
    out.push(label("drawn from " + target + " at t₁; must land on " + source + " at t₂", "muted", { row: 3 }));
    if (context.expected && context.expected.ok === false) out.push(label("expected error: " + context.expected.code, "expected", { row: 4 }));
    if (context.actual && context.actual.ok === false) out.push(label("your error: " + String(context.actual.code), resultStyle(context), { row: 5 }));
    out.push(...notes(context, describe(context.expected), describe(context.actual)));
    return out;
  }
```

4. In `robotChainTimeScene.layers`, insert as the first statement of the function body:

```js
      if (context.puzzle.scene.view === "across-time") return acrossTimeLayers(context);
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `40/40 puzzle tests passed`.

- [ ] **Step 6: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzles.js p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: add time-travel lookup puzzle and across-time scene view

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Np6fGLQWawWohjyrsBWLcz"
```

---

### Task 5: Stage 12 (Rigid Alignment) and the cloud-align scene

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzles.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-scenes.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-tests.js`

- [ ] **Step 1: Add failing tests**

Append to `puzzle-tests.js` before `async function runAllTests()`:

```js
  test("catalog track 2 stage 12 contains the rigid alignment ladder", () => {
    same(idsInRange(45, 51), ["centroid", "cross-covariance", "alignment-yaw", "rigid-transform-from-pairs", "nearest-neighbors", "icp-step", "icp-match"]);
  });

  test("catalog stage 12 references pass their cases and diagnoses differ", () => {
    checkStageRange(45, 51);
  });

  test("scenes: cloud-align recovers the dragged motion through rigid pairs and ICP", () => {
    checkSceneKinds(["cloud-align"]);
    const api = scenesApi();
    const rigid = puzzlesApi().getPuzzle("rigid-transform-from-pairs");
    const rigidValues = api.initialValues(rigid);
    const recovered = referenceOutput(rigid, api.toArgs(rigid, rigidValues));
    near(recovered.x, rigidValues.motion.x); near(recovered.y, rigidValues.motion.y); near(recovered.yaw, rigidValues.motion.yaw);
    const icp = puzzlesApi().getPuzzle("icp-match");
    const icpValues = api.initialValues(icp);
    const matched = referenceOutput(icp, api.toArgs(icp, icpValues));
    near(matched.transform.x, icpValues.motion.x, 1e-3); near(matched.transform.y, icpValues.motion.y, 1e-3); near(matched.transform.yaw, icpValues.motion.yaw, 1e-3);
    assert(matched.error < 1e-3, "ICP should converge on the clean cloud");
  });
```

- [ ] **Step 2: Run the tests and confirm the new tests fail**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `40/43 puzzle tests passed`.

- [ ] **Step 3: Add the Stage 12 puzzles**

Insert directly before `const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7, TOOLKIT_8, TOOLKIT_9, TOOLKIT_10, TOOLKIT_11));`:

```js
  function poseApply(t, p) {
    var c = Math.cos(t.yaw), s = Math.sin(t.yaw);
    return { x: c * p.x - s * p.y + t.x, y: s * p.x + c * p.y + t.y };
  }
  function poseInvert(t) {
    var c = Math.cos(t.yaw), s = Math.sin(t.yaw);
    return { x: -(c * t.x + s * t.y), y: -(-s * t.x + c * t.y), yaw: -t.yaw };
  }
  const DIAMOND = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
  const DIAMOND_ROTATED = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
  const DIAMOND_MOVED = [{ x: -2, y: 0 }, { x: -1, y: 1 }, { x: -2, y: 2 }, { x: -3, y: 1 }];
  const DIAMOND_AT_23 = DIAMOND.map((p) => ({ x: p.x + 2, y: p.y + 3 }));
  const DIAMOND_AT_12 = DIAMOND.map((p) => ({ x: p.x + 1, y: p.y + 2 }));
  const A20 = 20 * PI / 180;
  const DIAMOND_TURNED_20 = DIAMOND.map((p) => poseApply({ x: 0, y: 0, yaw: -A20 }, p));
  const LINE3 = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
  const LINE4 = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
  const LINE4_SHIFTED = [{ x: 0.1, y: 0 }, { x: 1.1, y: 0 }, { x: 2.1, y: 0 }, { x: 3.1, y: 0 }];
  const LINE4_REVERSED = [{ x: 3.1, y: 0 }, { x: 2.1, y: 0 }, { x: 1.1, y: 0 }, { x: 0.1, y: 0 }];
  const CORNER = [{ x: -1.5, y: 1 }, { x: -1, y: 1 }, { x: -0.5, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 0.5 }, { x: 0, y: 0 }, { x: 0, y: -0.5 }, { x: 0, y: -1 }];
  const CORNER_MOTION = { x: 0.3, y: -0.2, yaw: 0.15 };
  const CORNER_MOVED = [4, 0, 7, 2, 5, 1, 6, 3].map((index) => poseApply(poseInvert(CORNER_MOTION), CORNER[index]));
  const ICP_OPTIONS = { maxIterations: 30, eps: 1e-6 };

  const TOOLKIT_12 = [
    puzzle({
      number: 45, id: "centroid", track: "toolkit", title: "Centroid of a Cloud",
      goal: "Average a list of points.",
      concept: "Alignment removes the centroids first so only rotation is left to solve.",
      functionName: "centroid", signature: "centroid(points) → { x, y }",
      starterSource: starter("centroid", "points", "Sum x and y, divide by the count."),
      referenceSource: lines(
        "function centroid(points) {",
        "  var sx = 0, sy = 0;",
        "  for (var i = 0; i < points.length; i += 1) { sx += points[i].x; sy += points[i].y; }",
        "  return { x: sx / points.length, y: sy / points.length };",
        "}"
      ),
      comparator: "vector2", walkthroughChapter: "sensor-scenario",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "svd_motion_estimation (np.mean)"),
      scene: { kind: "cloud-align", view: "centroid", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "current" }] },
      hints: ["The centroid is the mean of x and the mean of y.", "Accumulate both sums in one loop.", "Return { x: sumX / n, y: sumY / n }."],
      cases: [
        example([[{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }]], { x: 1, y: 1 }, "square"),
        example([[{ x: 1, y: 1 }]], { x: 1, y: 1 }, "single point"),
        example([[{ x: -3, y: 4 }, { x: 5, y: -2 }, { x: 1, y: 7 }]], { x: 1, y: 3 }, "three points"),
      ],
    }),
    puzzle({
      number: 46, id: "cross-covariance", track: "toolkit", title: "Cross-Covariance of Two Clouds",
      goal: "Accumulate W = Σ (cᵢ − c̄)(pᵢ − p̄)ᵀ over paired points.",
      concept: "W holds every rotation clue between the clouds; PythonRobotics feeds it to an SVD.",
      functionName: "crossCovariance", signature: "crossCovariance(previous, current) → 2×2",
      starterSource: starter("crossCovariance", "previous, current", "Center both clouds with centroid, then sum the outer products c′ · p′ᵀ."),
      referenceSource: lines(
        "function crossCovariance(previous, current) {",
        "  var pm = centroid(previous), cm = centroid(current);",
        "  var w = [[0, 0], [0, 0]];",
        "  for (var i = 0; i < previous.length; i += 1) {",
        "    var px = previous[i].x - pm.x, py = previous[i].y - pm.y, cx = current[i].x - cm.x, cy = current[i].y - cm.y;",
        "    w[0][0] += cx * px; w[0][1] += cx * py; w[1][0] += cy * px; w[1][1] += cy * py;",
        "  }",
        "  return w;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      dependencies: ["centroid"],
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "svd_motion_estimation (W = c_shift @ p_shift.T)"),
      scene: { kind: "cloud-align", view: "covariance", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "previous" }, { fixture: "current" }] },
      diagnoses: [
        diagnosis("not-centered", "The clouds were not centered: subtract each centroid before the outer products.", lines(
          "function crossCovariance(previous, current) {",
          "  var w = [[0, 0], [0, 0]];",
          "  for (var i = 0; i < previous.length; i += 1) { w[0][0] += current[i].x * previous[i].x; w[0][1] += current[i].x * previous[i].y; w[1][0] += current[i].y * previous[i].x; w[1][1] += current[i].y * previous[i].y; }",
          "  return w;",
          "}"
        )),
        diagnosis("transposed", "Outer products are p′ · c′ᵀ: that is Wᵀ, which flips the recovered rotation.", lines(
          "function crossCovariance(previous, current) {",
          "  var pm = centroid(previous), cm = centroid(current);",
          "  var w = [[0, 0], [0, 0]];",
          "  for (var i = 0; i < previous.length; i += 1) {",
          "    var px = previous[i].x - pm.x, py = previous[i].y - pm.y, cx = current[i].x - cm.x, cy = current[i].y - cm.y;",
          "    w[0][0] += px * cx; w[0][1] += px * cy; w[1][0] += py * cx; w[1][1] += py * cy;",
          "  }",
          "  return w;",
          "}"
        )),
      ],
      hints: ["Center both clouds on their centroids first.", "Each pair adds the outer product of the centered current point and the centered previous point.", "w[0][0] += cx·px; w[0][1] += cx·py; w[1][0] += cy·px; w[1][1] += cy·py."],
      cases: [
        example([DIAMOND, DIAMOND_ROTATED], [[0, 2], [-2, 0]], "quarter turn"),
        example([DIAMOND, DIAMOND], [[2, 0], [0, 2]], "identical clouds"),
        example([DIAMOND_AT_23, DIAMOND_AT_12], [[2, 0], [0, 2]], "translation only"),
      ],
    }),
    puzzle({
      number: 47, id: "alignment-yaw", track: "toolkit", title: "Rotation from W",
      goal: "Read the aligning yaw straight out of the 2×2 cross-covariance.",
      concept: "In 2D the Kabsch/SVD solution collapses to one atan2; no SVD needed.",
      functionName: "alignmentYaw", signature: "alignmentYaw(W) → radians",
      starterSource: starter("alignmentYaw", "W", "yaw = atan2(W[0][1] − W[1][0], W[0][0] + W[1][1])."),
      referenceSource: "function alignmentYaw(W) { return Math.atan2(W[0][1] - W[1][0], W[0][0] + W[1][1]); }",
      comparator: "angle", walkthroughChapter: "composition",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "svd_motion_estimation (R = (u @ vh).T)"),
      scene: { kind: "cloud-align", view: "yaw", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "crossCovariance" }] },
      diagnoses: [diagnosis("sign-flipped", "The numerator is W01 − W10; swapping them recovers the inverse rotation.", "function alignmentYaw(W) { return Math.atan2(W[1][0] - W[0][1], W[0][0] + W[1][1]); }")],
      hints: ["The trace of W measures cos(yaw); the antisymmetric part measures sin(yaw).", "sin ∝ W01 − W10, cos ∝ W00 + W11.", "Return Math.atan2(W[0][1] - W[1][0], W[0][0] + W[1][1])."],
      cases: [
        example([[[0, 2], [-2, 0]]], PI / 2, "quarter turn"),
        example([[[2, 0], [0, 2]]], 0, "no rotation"),
        example([[[1, -1], [1, 1]]], -PI / 4, "negative rotation"),
        example([[[-2, 0], [0, -2]]], PI, "half turn"),
      ],
    }),
    puzzle({
      number: 48, id: "rigid-transform-from-pairs", track: "toolkit", title: "Rigid Transform from Paired Points",
      goal: "Find the transform that maps the current cloud onto the previous cloud, given index-paired points.",
      concept: "PythonRobotics' svd_motion_estimation: rotation from W, then t = p̄ − R c̄.",
      functionName: "rigidTransformFromPairs", signature: "rigidTransformFromPairs(previous, current) → { x, y, yaw }",
      starterSource: starter("rigidTransformFromPairs", "previous, current"),
      referenceSource: lines(
        "function rigidTransformFromPairs(previous, current) {",
        "  var pm = centroid(previous), cm = centroid(current);",
        "  var yaw = alignmentYaw(crossCovariance(previous, current));",
        "  var rotated = rotateVector(cm, yaw);",
        "  return { x: pm.x - rotated.x, y: pm.y - rotated.y, yaw: yaw };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "composition",
      dependencies: ["centroid", "cross-covariance", "alignment-yaw", "rotate-vector"],
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "svd_motion_estimation"),
      scene: { kind: "cloud-align", view: "rigid", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "previous" }, { fixture: "current" }] },
      diagnoses: [
        diagnosis("translation-unrotated", "t = p̄ − c̄ ignores the rotation: rotate the current centroid first, t = p̄ − R·c̄.", lines(
          "function rigidTransformFromPairs(previous, current) {",
          "  var pm = centroid(previous), cm = centroid(current);",
          "  var yaw = alignmentYaw(crossCovariance(previous, current));",
          "  return { x: pm.x - cm.x, y: pm.y - cm.y, yaw: yaw };",
          "}"
        )),
        diagnosis("reversed", "That maps previous onto current. The convention is previous ≈ T(current).", lines(
          "function rigidTransformFromPairs(previous, current) {",
          "  var pm = centroid(previous), cm = centroid(current);",
          "  var yaw = -alignmentYaw(crossCovariance(previous, current));",
          "  var rotated = rotateVector(pm, yaw);",
          "  return { x: cm.x - rotated.x, y: cm.y - rotated.y, yaw: yaw };",
          "}"
        )),
      ],
      hints: ["Centroids give the translation once the rotation is known.", "yaw from alignmentYaw(crossCovariance(previous, current)).", "t = p̄ − rotateVector(c̄, yaw)."],
      cases: [
        example([DIAMOND, DIAMOND_ROTATED], { x: 0, y: 0, yaw: PI / 2 }, "pure rotation"),
        example([DIAMOND_AT_23, DIAMOND_AT_12], { x: 1, y: 1, yaw: 0 }, "pure translation"),
        example([DIAMOND, DIAMOND_MOVED], { x: 1, y: 2, yaw: PI / 2 }, "rotation and translation"),
      ],
    }),
    puzzle({
      number: 49, id: "nearest-neighbors", track: "toolkit", title: "Nearest-Neighbour Association",
      goal: "For every current point, find the index of the nearest previous point and sum those distances.",
      concept: "Association is what turns two unordered clouds into pairs the rigid solver can use.",
      functionName: "nearestNeighbors", signature: "nearestNeighbors(previous, current) → { indexes, error }",
      starterSource: starter("nearestNeighbors", "previous, current"),
      referenceSource: lines(
        "function nearestNeighbors(previous, current) {",
        "  var indexes = [], error = 0;",
        "  for (var i = 0; i < current.length; i += 1) {",
        "    var best = 0, bestDistance = Infinity;",
        "    for (var j = 0; j < previous.length; j += 1) {",
        "      var d = Math.hypot(previous[j].x - current[i].x, previous[j].y - current[i].y);",
        "      if (d < bestDistance) { bestDistance = d; best = j; }",
        "    }",
        "    indexes.push(best);",
        "    error += bestDistance;",
        "  }",
        "  return { indexes: indexes, error: error };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "nearest_neighbor_association (this puzzle sums nearest distances)"),
      scene: { kind: "cloud-align", view: "neighbors", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "previous" }, { fixture: "currentShuffled" }] },
      diagnoses: [diagnosis("reversed-roles", "You searched from previous to current. The output has one index per current point.", lines(
        "function nearestNeighbors(previous, current) {",
        "  var indexes = [], error = 0;",
        "  for (var i = 0; i < previous.length; i += 1) {",
        "    var best = 0, bestDistance = Infinity;",
        "    for (var j = 0; j < current.length; j += 1) {",
        "      var d = Math.hypot(current[j].x - previous[i].x, current[j].y - previous[i].y);",
        "      if (d < bestDistance) { bestDistance = d; best = j; }",
        "    }",
        "    indexes.push(best);",
        "    error += bestDistance;",
        "  }",
        "  return { indexes: indexes, error: error };",
        "}"
      ))],
      hints: ["Loop over current points; for each, scan every previous point.", "Keep the smallest distance and its index.", "Sum the winning distances into error."],
      cases: [
        example([LINE3, [{ x: 2.1, y: 0 }, { x: 0.1, y: 0 }]], { indexes: [2, 0], error: 0.2 }, "two queries"),
        example([LINE3, LINE3], { indexes: [0, 1, 2], error: 0 }, "identical clouds"),
        example([[{ x: 0, y: 0 }, { x: 3, y: 4 }], [{ x: 3, y: 3 }, { x: 0, y: 1 }, { x: 1, y: 0 }]], { indexes: [1, 0, 0], error: 3 }, "shared neighbour"),
      ],
    }),
    puzzle({
      number: 50, id: "icp-step", track: "toolkit", title: "One ICP Iteration",
      goal: "Associate, estimate the rigid transform on the paired points, and move the current cloud.",
      concept: "Every ICP iteration is association followed by one closed-form alignment.",
      functionName: "icpStep", signature: "icpStep(previous, current) → { transform, moved, error }",
      starterSource: starter("icpStep", "previous, current"),
      referenceSource: lines(
        "function icpStep(previous, current) {",
        "  var match = nearestNeighbors(previous, current);",
        "  var paired = match.indexes.map(function (index) { return previous[index]; });",
        "  var transform = rigidTransformFromPairs(paired, current);",
        "  var moved = current.map(function (point) { return transformPoint(transform, point); });",
        "  return { transform: transform, moved: moved, error: match.error };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      dependencies: ["nearest-neighbors", "rigid-transform-from-pairs", "transform-point"],
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "icp_matching (loop body)"),
      scene: { kind: "cloud-align", view: "step", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "previous" }, { fixture: "currentShuffled" }] },
      diagnoses: [diagnosis("unpaired-estimate", "The rigid solve used the clouds in index order; pair each current point with its nearest previous point first.", lines(
        "function icpStep(previous, current) {",
        "  var match = nearestNeighbors(previous, current);",
        "  var transform = rigidTransformFromPairs(previous, current);",
        "  var moved = current.map(function (point) { return transformPoint(transform, point); });",
        "  return { transform: transform, moved: moved, error: match.error };",
        "}"
      ))],
      hints: ["Association first, then estimation, then application.", "paired[i] = previous[indexes[i]] lines the previous cloud up with current.", "moved = current mapped through transformPoint with the estimated transform."],
      cases: [
        example([LINE4, LINE4_SHIFTED], { transform: { x: -0.1, y: 0, yaw: 0 }, moved: LINE4, error: 0.4 }, "shifted line"),
        example([LINE4, LINE4_REVERSED], { transform: { x: -0.1, y: 0, yaw: 0 }, moved: [{ x: 3, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }], error: 0.4 }, "reversed order"),
        example([DIAMOND, DIAMOND], { transform: { x: 0, y: 0, yaw: 0 }, moved: DIAMOND, error: 0 }, "already aligned"),
      ],
    }),
    puzzle({
      number: 51, id: "icp-match", track: "toolkit", title: "Iterative Closest Point",
      goal: "Repeat icpStep until the association error stops improving, accumulating the total transform.",
      concept: "Each step's transform goes on the left of the running total, because it acts on already-moved points.",
      functionName: "icpMatch", signature: "icpMatch(previous, current, options) → { transform, error }",
      starterSource: starter("icpMatch", "previous, current, options"),
      referenceSource: lines(
        "function icpMatch(previous, current, options) {",
        "  var maxIterations = options && options.maxIterations ? options.maxIterations : 50;",
        "  var eps = options && typeof options.eps === \"number\" ? options.eps : 0.0001;",
        "  var accumulated = { x: 0, y: 0, yaw: 0 };",
        "  var points = current;",
        "  var previousError = Infinity, error = Infinity, iterations = 0;",
        "  while (iterations < maxIterations) {",
        "    var step = icpStep(previous, points);",
        "    iterations += 1;",
        "    error = step.error;",
        "    accumulated = compose(step.transform, accumulated);",
        "    points = step.moved;",
        "    var change = previousError - error;",
        "    previousError = error;",
        "    if (change < eps) break;",
        "  }",
        "  return { transform: accumulated, error: error };",
        "}"
      ),
      comparator: "deep", tolerance: 1e-3, walkthroughChapter: "sensor-scenario",
      dependencies: ["icp-step", "compose"],
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "icp_matching (this puzzle accumulates by left-multiplication)"),
      scene: { kind: "cloud-align", view: "icp", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "previous" }, { fixture: "currentShuffled" }, { fixture: "icpOptions" }] },
      diagnoses: [diagnosis("right-multiplied", "Accumulated on the right: each new step acts on already-moved points, so it goes on the left, compose(step, total).", lines(
        "function icpMatch(previous, current, options) {",
        "  var maxIterations = options && options.maxIterations ? options.maxIterations : 50;",
        "  var eps = options && typeof options.eps === \"number\" ? options.eps : 0.0001;",
        "  var accumulated = { x: 0, y: 0, yaw: 0 };",
        "  var points = current;",
        "  var previousError = Infinity, error = Infinity, iterations = 0;",
        "  while (iterations < maxIterations) {",
        "    var step = icpStep(previous, points);",
        "    iterations += 1;",
        "    error = step.error;",
        "    accumulated = compose(accumulated, step.transform);",
        "    points = step.moved;",
        "    var change = previousError - error;",
        "    previousError = error;",
        "    if (change < eps) break;",
        "  }",
        "  return { transform: accumulated, error: error };",
        "}"
      ))],
      hints: ["Keep a running transform and the moved cloud between iterations.", "total = compose(step.transform, total); stop when the error stops dropping by more than eps.", "Return the accumulated transform and the last association error."],
      cases: [
        example([LINE4, LINE4_SHIFTED, ICP_OPTIONS], { transform: { x: -0.1, y: 0, yaw: 0 }, error: 0 }, "shifted line"),
        example([DIAMOND, DIAMOND_TURNED_20, ICP_OPTIONS], { transform: { x: 0, y: 0, yaw: A20 }, error: 0 }, "turned diamond"),
        example([CORNER, CORNER_MOVED, ICP_OPTIONS], { transform: CORNER_MOTION, error: 0 }, "moved corner"),
        example([DIAMOND, DIAMOND, ICP_OPTIONS], { transform: { x: 0, y: 0, yaw: 0 }, error: 0 }, "already aligned"),
      ],
    }),
  ];
```

Then change the `PUZZLES` line to:

```js
  const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7, TOOLKIT_8, TOOLKIT_9, TOOLKIT_10, TOOLKIT_11, TOOLKIT_12));
```

- [ ] **Step 4: Add the cloud-align scene**

In `puzzle-scenes.js`, in `describe`, insert directly after `if ("beforeIndex" in value) return …;`:

```js
      if (Array.isArray(value.indexes) && Number.isFinite(value.error)) return "error " + fmt(value.error) + " · " + value.indexes.length + " pairs";
      if (value.transform && Number.isFinite(value.error)) return fmtTransform(value.transform) + " · error " + fmt(value.error);
```

Insert directly before `const SCENES = {`:

```js
  // ------------------------------------------------------------ rigid alignment
  const CLOUD_PREVIOUS = (() => {
    const list = [];
    for (let i = 0; i < 12; i += 1) list.push({ x: -3 + 0.25 * i, y: 1.5 });
    for (let j = 0; j < 12; j += 1) list.push({ x: 0, y: 1.5 - 0.25 * j });
    return list;
  })();
  const CLOUD_SHUFFLE = [17, 3, 22, 8, 0, 14, 11, 19, 5, 23, 9, 1, 16, 6, 20, 12, 2, 18, 10, 7, 21, 4, 15, 13];
  function cloudCurrent(values) {
    const inverse = invert(values.motion);
    return CLOUD_PREVIOUS.map((p) => applyPoint(inverse, p));
  }
  function cloudShuffled(values) {
    const current = cloudCurrent(values);
    return CLOUD_SHUFFLE.map((index) => current[index]);
  }
  function centroidOf(list) {
    let sx = 0;
    let sy = 0;
    list.forEach((p) => { sx += p.x; sy += p.y; });
    return list.length ? { x: sx / list.length, y: sy / list.length } : { x: 0, y: 0 };
  }
  function crossCovarianceOf(previous, current) {
    const pm = centroidOf(previous);
    const cm = centroidOf(current);
    const w = [[0, 0], [0, 0]];
    for (let i = 0; i < Math.min(previous.length, current.length); i += 1) {
      const px = previous[i].x - pm.x;
      const py = previous[i].y - pm.y;
      const cx = current[i].x - cm.x;
      const cy = current[i].y - cm.y;
      w[0][0] += cx * px; w[0][1] += cx * py; w[1][0] += cy * px; w[1][1] += cy * py;
    }
    return w;
  }
  function isCloud(list) { return Array.isArray(list) && list.every(isPoint); }
  const cloudAlignScene = {
    fixtures: {
      previous: () => CLOUD_PREVIOUS,
      current: cloudCurrent,
      currentShuffled: cloudShuffled,
      crossCovariance: (values) => crossCovarianceOf(CLOUD_PREVIOUS, cloudCurrent(values)),
      icpOptions: () => ({ maxIterations: 30, eps: 1e-6 }),
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const motion = context.values.motion;
      const shuffled = view === "neighbors" || view === "step" || view === "icp";
      const current = shuffled ? cloudShuffled(context.values) : cloudCurrent(context.values);
      const out = [
        pointsPrimitive(CLOUD_PREVIOUS, "muted", { size: 6, label: "previous" }),
        pointsPrimitive(current, "input", { size: 5, label: "current (as the moved sensor sees it)" }),
        frame(motion, "true motion", "input"),
      ];
      const cm = centroidOf(current);
      if (view === "centroid") {
        if (isPoint(context.expected)) out.push(point(context.expected, "expected centroid", "expected", { dashed: true }));
        if (isPoint(context.actual)) {
          out.push(point(context.actual, resultLabel(context), resultStyle(context)));
          out.push(...errorArrow(context, context.actual, context.expected));
        }
      } else if (view === "covariance") {
        out.push(point(centroidOf(CLOUD_PREVIOUS), "previous centroid", "muted"), point(cm, "current centroid", "input"));
        const normalized = (w) => {
          const n0 = Math.hypot(w[0][0], w[1][0]) || 1;
          const n1 = Math.hypot(w[0][1], w[1][1]) || 1;
          return [[w[0][0] / n0, w[0][1] / n1], [w[1][0] / n0, w[1][1] / n1]];
        };
        if (isMatrix(context.expected, 2)) out.push(...columnLayers(normalized(context.expected), cm, "expected W columns", "expected", true));
        if (isMatrix(context.actual, 2)) out.push(...columnLayers(normalized(context.actual), cm, resultLabel(context), resultStyle(context), false));
      } else if (view === "yaw") {
        if (typeof context.expected === "number") out.push(arc(cm, 1.0, 0, context.expected, "expected", { dashed: true, arrowhead: true, track: true }));
        if (typeof context.actual === "number" && Number.isFinite(context.actual)) out.push(arc(cm, 0.8, 0, context.actual, resultStyle(context), { arrowhead: true }));
      } else if (view === "neighbors") {
        const pairsOf = (value) => (value && Array.isArray(value.indexes)
          ? value.indexes.map((index, i) => (current[i] && CLOUD_PREVIOUS[index] ? [current[i], CLOUD_PREVIOUS[index]] : null)).filter(Boolean)
          : []);
        out.push(segments(pairsOf(context.expected), "expected", { dashed: true }));
        out.push(segments(pairsOf(context.actual), resultStyle(context), { weight: 1.5 }));
      } else {
        const expectedTransform = view === "rigid" ? context.expected : (context.expected && context.expected.transform);
        const actualTransform = view === "rigid" ? context.actual : (context.actual && context.actual.transform);
        if (view === "step" && context.actual && isCloud(context.actual.moved)) out.push(pointsPrimitive(context.actual.moved, resultStyle(context), { size: 4, label: "moved (yours)" }));
        if (isTransform(expectedTransform)) out.push(frame(expectedTransform, "expected", "expected", { dashed: true }));
        if (isTransform(actualTransform)) {
          out.push(frame(actualTransform, resultLabel(context), resultStyle(context)));
          out.push(...errorArrow(context, actualTransform, motion));
        }
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
```

Add to the `SCENES` literal after `"covariance": covarianceScene,`:

```js
    "cloud-align": cloudAlignScene,
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `43/43 puzzle tests passed`.

- [ ] **Step 6: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzles.js p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: add rigid alignment stage with closed-form 2D ICP

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Np6fGLQWawWohjyrsBWLcz"
```

---

### Task 6: Lab wiring, README, and verification

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzle-lab.html`
- Modify: `p5sim/tf2_walkthrough/puzzle-lab.js`
- Modify: `p5sim/tf2_walkthrough/README.md`

- [ ] **Step 1: Update the HTML shell**

In `puzzle-lab.html`:

1. Change `<p class="card-kicker">Two tracks, one ladder</p>` to `<p class="card-kicker">Three tracks, one ladder</p>` and `<h2 id="curriculumHeading">27 geometry builds</h2>` to `<h2 id="curriculumHeading">Geometry builds</h2>`.
2. Directly after the line `<a id="walkthroughLink" class="concept-link" href="index.html">Review concept ↗</a>` insert:

```html
                <a id="referenceLink" class="concept-link" href="#" target="_blank" rel="noopener" hidden>Reference ↗</a>
```

- [ ] **Step 2: Update the controller**

In `puzzle-lab.js`:

1. In the `ids` array, change `"puzzleGoal", "puzzleConcept", "puzzleSignature", "walkthroughLink",` to `"puzzleGoal", "puzzleConcept", "puzzleSignature", "walkthroughLink", "referenceLink", "curriculumHeading",`.

2. In `renderMap`, replace the block

```js
      if (track.note) {
        const note = document.createElement("p");
        note.className = "track-note";
        note.textContent = state === "locked" ? track.note : "Available. Puzzles arrive with the next track.";
        block.append(note);
      }
```

with

```js
      if (track.note && (state === "locked" || members.length === 0)) {
        const note = document.createElement("p");
        note.className = "track-note";
        note.textContent = state === "locked" ? track.note : "Available. Puzzles arrive with the next track.";
        block.append(note);
      }
```

3. In `renderPuzzle`, directly after `dom.walkthroughLink.textContent = "Review " + puzzle.walkthroughChapter.replaceAll("-", " ") + " ↗";` insert:

```js
    if (puzzle.reference) {
      dom.referenceLink.href = puzzle.reference.url;
      dom.referenceLink.textContent = puzzle.reference.label + " ↗";
      dom.referenceLink.hidden = false;
    } else {
      dom.referenceLink.hidden = true;
    }
```

4. In `check`, replace

```js
      const unlockedTrack2Before = root.trackStates(tracks, progress)[1].state;
      progress = root.completePuzzle(progress, puzzle, dom.codeEditor.value, new Date().toISOString(), puzzles);
      save();
      sketch.celebrate();
      renderMap();
      renderComponents();
      renderFooter();
      if (unlockedTrack2Before === "locked" && root.trackStates(tracks, progress)[1].state === "available") {
        setFeedback(result.message + " Track 2 · Pose Correction is now available; its puzzles arrive with the next track.", "success");
      }
```

with

```js
      const before = root.trackStates(tracks, progress);
      progress = root.completePuzzle(progress, puzzle, dom.codeEditor.value, new Date().toISOString(), puzzles);
      save();
      sketch.celebrate();
      renderMap();
      renderComponents();
      renderFooter();
      const after = root.trackStates(tracks, progress);
      const unlocked = tracks.filter((track, index) => before[index].state === "locked" && after[index].state === "available");
      if (unlocked.length) setFeedback(result.message + " " + unlocked.map((track) => track.title).join(" and ") + " is now available.", "success");
```

5. In `initialize`, replace

```js
    if (!catalogStatus.valid || puzzles.length !== 27) {
      dom.feedbackPanel.textContent = catalogStatus.valid ? "The lab expected 27 puzzles." : catalogStatus.message;
```

with

```js
    if (!catalogStatus.valid || puzzles.length === 0) {
      dom.feedbackPanel.textContent = catalogStatus.valid ? "The catalog is empty." : catalogStatus.message;
```

and directly after `session = root.createLiveSession({ workerUrl: "puzzle-worker.js" });` insert:

```js
    dom.curriculumHeading.textContent = puzzles.length + " geometry builds";
```

- [ ] **Step 3: Update the README**

In `README.md`, replace the paragraph starting `Track 2 (Pose Correction) is listed in the map` with:

```markdown
Track 2 (Transform Toolkit) adds puzzles 28 to 51, unlocked by the capstone, and is the transformation math around TF2 that Track 1 leaves out:

8. Matrix form: rotMat2d, homogeneousFromPose, matMul3, applyHomogeneous, poseFromHomogeneous, invertHomogeneous.
9. 3D orientation: quaternionFromRPY, yawFromQuaternion, rpyFromQuaternion, slerpQuaternion, transformPoint3D, invertSE3, opticalToBody.
10. Motion and uncertainty: integrateMotion, deadReckon, rotateCovariance.
11. Time travel: lookupAcrossTime.
12. Rigid alignment: centroid, crossCovariance, alignmentYaw, rigidTransformFromPairs, nearestNeighbors, icpStep, icpMatch.

Every toolkit puzzle links the PythonRobotics file and function it mirrors (a local copy lives under `references/PythonRobotics`) or the ROS REP / tf2 document for tf2-only material. Two deliberate differences from PythonRobotics: nearestNeighbors sums nearest distances rather than index-order residuals, and icpMatch accumulates by left-multiplication.

Track 3 (Pose Correction) is listed in the map and unlocks after the ICP finale. Its puzzles, built from the warehouse rack pipeline in `p5sim/navigation`, arrive with the next track.
```

- [ ] **Step 4: Run every check**

Run:

```powershell
node p5sim/tf2_walkthrough/tests.js
node p5sim/tf2_walkthrough/puzzle-tests.js
node --check p5sim/tf2_walkthrough/puzzle-lab.js
```

Expected: `21/21 tests passed`, `43/43 puzzle tests passed`, no output from the check.

Then serve `p5sim` (`cd p5sim; python -m http.server 4173 --bind 127.0.0.1`) and confirm in a browser:

1. `tests.html` reports both suites passing with no console errors.
2. `puzzle-lab.html` shows "51 geometry builds", three track blocks (Track 2 locked below Track 1, Track 3 locked below it), and no console errors.
3. After unlocking via the console (`localStorage.setItem("tf2-puzzle-lab:v2", JSON.stringify({ ...JSON.parse(localStorage.getItem("tf2-puzzle-lab:v2")), highestUnlocked: 50 }))` then reload): puzzle 28 shows a dial and column arrows; 30 draws frames from matrices; 34 has three sliders moving an RGB basis; 43 shows the covariance ellipse rotating with the dial; 44 shows two timeline cursors and two robot chains; 49 shows correspondence segments; 51 draws the recovered frame on the dragged motion handle once a correct solution is entered. Each toolkit puzzle shows a Reference link that opens the right GitHub or ROS page.

- [ ] **Step 5: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzle-lab.html p5sim/tf2_walkthrough/puzzle-lab.js p5sim/tf2_walkthrough/README.md
git commit -m "feat: show reference links and three tracks in the puzzle lab

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Np6fGLQWawWohjyrsBWLcz"
```

