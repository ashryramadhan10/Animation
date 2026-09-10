# TF2 Uncertainty & Estimation Track Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Append Track 5 · Uncertainty & Estimation (puzzles 76 to 87): wheel and gyro kinematics, twists between frames, covariance propagation and compounding, Mahalanobis gating, covariance ellipses, EKF predict/update, particle weights and resampling, and an EKF localization step.

**Architecture:** Same catalog pattern (`ESTIMATION_STAGES`, a fifth track, `puzzle()` picks the stage list, arrays `ESTIMATION_19` to `ESTIMATION_21`). The `se3` scene gains a `gyro` view; a new `estimation` scene kind reuses glyphs, ellipses, points, arrows, and arcs.

**Tech Stack:** Vanilla JavaScript, p5.js, Web Workers, Node 22 tests.

**Spec:** `docs/superpowers/specs/2026-09-10-tf2-estimation-track-design.md`

---

## File Structure

- `p5sim/tf2_walkthrough/puzzles.js` — stages, track, `ESTIMATION_19` to `ESTIMATION_21`.
- `p5sim/tf2_walkthrough/puzzle-scenes.js` — se3 `gyro` view, `estimationScene`, `describe` additions.
- `p5sim/tf2_walkthrough/puzzle-tests.js` — five-track assertions and Track 5 tests.
- `p5sim/tf2_walkthrough/README.md` — Track 5 section.

Conventions as before.

---

### Task 1: Catalog, tests, all three stages, scenes, README

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzles.js`, `p5sim/tf2_walkthrough/puzzle-scenes.js`, `p5sim/tf2_walkthrough/puzzle-tests.js`, `p5sim/tf2_walkthrough/README.md`

- [ ] **Step 1: Update track assertions and add failing tests**

In `puzzle-tests.js`:

1. Replace `assert(["tf2", "toolkit", "advanced", "correction"].includes(puzzle.track), …);` with:

```js
      assert(["tf2", "toolkit", "advanced", "correction", "estimation"].includes(puzzle.track), puzzle.id + " has unknown track " + puzzle.track);
```

2. Replace the line `same(api.TF2_PUZZLE_TRACKS.map((track) => track.id), ["tf2", "toolkit", "advanced", "correction"]);` with:

```js
    same(api.TF2_PUZZLE_TRACKS.map((track) => track.id), ["tf2", "toolkit", "advanced", "correction", "estimation"]);
    assert(api.TF2_PUZZLE_TRACKS[4].unlockAfter === "aisle-correction-step", "track 5 unlocks after the map → odom capstone");
    assert(api.TF2_PUZZLE_TRACKS[4].stages.length === 3, "track 5 lists three stages");
```

3. Change the two track-state assertions to five entries:

```js
    same(api.trackStates(tracks, progress).map((entry) => entry.state), ["available", "locked", "locked", "locked", "locked"]);
```

and

```js
    same(api.trackStates(tracks, progress).map((entry) => entry.state), ["available", "available", "locked", "locked", "locked"]);
```

4. Replace `assert(puzzleList().length === 75, "catalog should hold 75 puzzles");` with `assert(puzzleList().length >= 75, "catalog should hold at least 75 puzzles");`.

5. Append before `async function runAllTests()`:

```js
  // ---------------------------------------------------------------- estimation track
  test("catalog track 5 contains kinematics, uncertainty, and estimation ladders", () => {
    same(idsInRange(76, 78), ["diff-drive-twist", "integrate-gyro", "twist-in-sensor-frame"]);
    same(idsInRange(79, 82), ["covariance-propagate-motion", "compose-uncertain", "mahalanobis-distance", "covariance-ellipse"]);
    same(idsInRange(83, 87), ["ekf-predict", "ekf-update-position", "particle-weights", "resample-particles", "ekf-localize-step"]);
    assert(puzzleList().length === 87, "catalog should hold 87 puzzles");
  });

  test("catalog stages 19 to 21 references pass their cases and diagnoses differ", () => {
    checkStageRange(76, 87);
  });

  test("scenes: estimation views build valid arguments and analytic checks hold", () => {
    checkSceneKinds(["estimation", "se3"]);
    const api = scenesApi();
    const ellipsePuzzle = puzzlesApi().getPuzzle("covariance-ellipse");
    const ellipseValues = api.initialValues(ellipsePuzzle);
    const shape = referenceOutput(ellipsePuzzle, api.toArgs(ellipsePuzzle, ellipseValues));
    near(shape.angle, ellipseValues.angle); near(shape.major, ellipseValues.major); near(shape.minor, ellipseValues.minor);
    const update = puzzlesApi().getPuzzle("ekf-update-position");
    const perfect = referenceOutput(update, [{ x: 0, y: 0, yaw: 0.3 }, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], { x: 2, y: -1 }, [[0, 0], [0, 0]]]);
    near(perfect.state.x, 2); near(perfect.state.y, -1); near(perfect.P[0][0], 0); near(perfect.P[2][2], 1);
    const resample = puzzlesApi().getPuzzle("resample-particles");
    const list = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
    same(referenceOutput(resample, [list, [0.25, 0.25, 0.25, 0.25], 0.1]), list);
  });
```

- [ ] **Step 2: Run the tests and confirm failures**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: about `57/65 puzzle tests passed`.

- [ ] **Step 3: Add stages, the fifth track, and the builder entry**

In `puzzles.js`, insert directly before `const TRACKS = Object.freeze([`:

```js
  const ESTIMATION_STAGES = Object.freeze([
    { id: "kinematics", title: "Kinematics", subtitle: "Wheel speeds, gyro rates, and twists between frames.", range: [76, 78] },
    { id: "uncertainty", title: "Uncertainty", subtitle: "Propagate, compound, gate, and draw covariance.", range: [79, 82] },
    { id: "estimation", title: "Estimation", subtitle: "EKF predict and update, particle weights and resampling.", range: [83, 87] },
  ]);
```

Insert directly after the correction track entry (after the line `      stages: CORRECTION_STAGES,` and its closing `    }),`):

```js
    Object.freeze({
      id: "estimation",
      title: "Track 5 · Uncertainty & Estimation",
      unlockAfter: "aisle-correction-step",
      note: "Unlocks after the map → odom capstone.",
      stages: ESTIMATION_STAGES,
    }),
```

Replace the `const stageList = …` line with:

```js
    const stageList = { tf2: STAGES, toolkit: TOOLKIT_STAGES, advanced: ADVANCED_STAGES, correction: CORRECTION_STAGES, estimation: ESTIMATION_STAGES }[track] || STAGES;
```

- [ ] **Step 4: Add the puzzles**

Insert directly before the `PUZZLES` line:

```js
  const EKF_PY = "Localization/extended_kalman_filter/extended_kalman_filter.py";
  const PF_PY = "Localization/particle_filter/particle_filter.py";
  const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const ZERO3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const I2 = [[1, 0], [0, 1]];
  const ZERO2 = [[0, 0], [0, 0]];
  function diag3(a, b, c) { return [[a, 0, 0], [0, b, 0], [0, 0, c]]; }
  const P_AFTER_STRAIGHT = [[1, 0, 0], [0, 2, 1], [0, 1, 1]];
  const P3 = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];

  const ESTIMATION_19 = [
    puzzle({
      number: 76, id: "diff-drive-twist", track: "estimation", title: "Wheel Speeds to Twist",
      goal: "Convert left and right wheel speeds into the body twist a differential-drive controller publishes.",
      concept: "This is where odom → base_link is born: v is the mean wheel speed, ω is their difference over the wheelbase.",
      functionName: "diffDriveTwist", signature: "diffDriveTwist(vLeft, vRight, wheelBase) → { v, omega }",
      starterSource: starter("diffDriveTwist", "vLeft, vRight, wheelBase", "v = (vL + vR) / 2; ω = (vR − vL) / wheelBase."),
      referenceSource: "function diffDriveTwist(vLeft, vRight, wheelBase) { return { v: (vLeft + vRight) / 2, omega: (vRight - vLeft) / wheelBase }; }",
      comparator: "deep", walkthroughChapter: "frame-roles",
      reference: docref("ros2_control · diff_drive_controller", "https://control.ros.org/rolling/doc/ros2_controllers/diff_drive_controller/doc/userdoc.html"),
      scene: { kind: "estimation", view: "diffdrive", handles: [
        { id: "vLeft", type: "slider", label: "left wheel (m/s)", value: 0.6, min: -1, max: 1 },
        { id: "vRight", type: "slider", label: "right wheel (m/s)", value: 0.9, min: -1, max: 1 },
      ], args: [{ handle: "vLeft" }, { handle: "vRight" }, 0.5] },
      diagnoses: [
        diagnosis("omega-sign", "Turn rate has the wrong sign: a faster right wheel turns the robot left (positive ω).", "function diffDriveTwist(vLeft, vRight, wheelBase) { return { v: (vLeft + vRight) / 2, omega: (vLeft - vRight) / wheelBase }; }"),
        diagnosis("no-wheelbase", "The wheel speed difference must be divided by the wheelbase to become rad/s.", "function diffDriveTwist(vLeft, vRight, wheelBase) { return { v: (vLeft + vRight) / 2, omega: vRight - vLeft }; }"),
      ],
      hints: ["Forward speed is the average of the two wheels.", "Turning comes from the difference, scaled by the distance between wheels.", "Return { v: (vL + vR) / 2, omega: (vR − vL) / wheelBase }."],
      cases: [
        example([1, 1, 0.5], { v: 1, omega: 0 }, "straight"),
        example([0, 1, 0.5], { v: 0.5, omega: 2 }, "pivot on the left wheel"),
        example([1, -1, 0.5], { v: 0, omega: -4 }, "spin in place"),
        example([0.2, 0.4, 0.4], { v: 0.3, omega: 0.5 }, "gentle arc"),
      ],
    }),
    puzzle({
      number: 77, id: "integrate-gyro", track: "estimation", title: "Integrate a Gyro",
      goal: "Advance an orientation quaternion by body-frame angular rates over dt.",
      concept: "Body rates rotate about the body axes, so the small rotation multiplies on the right.",
      functionName: "integrateGyro", signature: "integrateGyro(q, omega, dt) → quaternion",
      starterSource: starter("integrateGyro", "q, omega, dt", "angle = |ω|·dt about axis ω/|ω|; q ⊗ Δq."),
      referenceSource: lines(
        "function integrateGyro(q, omega, dt) {",
        "  var rate = Math.sqrt(omega.x * omega.x + omega.y * omega.y + omega.z * omega.z);",
        "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  var unit = { x: q.x / n, y: q.y / n, z: q.z / n, w: q.w / n };",
        "  if (rate * dt < 1e-12) return unit;",
        "  var delta = quaternionFromAxisAngle({ x: omega.x / rate, y: omega.y / rate, z: omega.z / rate }, rate * dt);",
        "  return quaternionMultiply(unit, delta);",
        "}"
      ),
      comparator: "quaternion", walkthroughChapter: "se3",
      dependencies: ["quaternion-multiply", "quaternion-from-axis-angle"],
      reference: docref("imu_filter_madgwick (gyro integration step)", "https://docs.ros.org/en/rolling/p/imu_filter_madgwick/"),
      scene: { kind: "se3", view: "gyro", handles: [
        { id: "wx", type: "slider", label: "ωx (rad/s)", value: 0.4, min: -2, max: 2 },
        { id: "wy", type: "slider", label: "ωy (rad/s)", value: 0.2, min: -2, max: 2 },
        { id: "wz", type: "slider", label: "ωz (rad/s)", value: 1.2, min: -2, max: 2 },
        { id: "dt", type: "slider", label: "dt (s)", value: 0.8, min: 0, max: 1 },
      ], args: [{ fixture: "identityQuat" }, { fixture: "omegaFromSliders" }, { handle: "dt" }] },
      diagnoses: [
        diagnosis("world-frame-rates", "The increment was applied on the left, as if the rates were world-frame: gyro rates are body-frame, so q ⊗ Δq.", lines(
          "function integrateGyro(q, omega, dt) {",
          "  var rate = Math.sqrt(omega.x * omega.x + omega.y * omega.y + omega.z * omega.z);",
          "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  var unit = { x: q.x / n, y: q.y / n, z: q.z / n, w: q.w / n };",
          "  if (rate * dt < 1e-12) return unit;",
          "  var delta = quaternionFromAxisAngle({ x: omega.x / rate, y: omega.y / rate, z: omega.z / rate }, rate * dt);",
          "  return quaternionMultiply(delta, unit);",
          "}"
        )),
        diagnosis("rate-not-scaled-by-dt", "The rotation angle is |ω|·dt, not |ω|.", lines(
          "function integrateGyro(q, omega, dt) {",
          "  var rate = Math.sqrt(omega.x * omega.x + omega.y * omega.y + omega.z * omega.z);",
          "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  var unit = { x: q.x / n, y: q.y / n, z: q.z / n, w: q.w / n };",
          "  if (rate < 1e-12) return unit;",
          "  var delta = quaternionFromAxisAngle({ x: omega.x / rate, y: omega.y / rate, z: omega.z / rate }, rate);",
          "  return quaternionMultiply(unit, delta);",
          "}"
        )),
      ],
      hints: ["The angle turned in dt is |ω|·dt about the axis ω/|ω|.", "Build that as a quaternion with quaternionFromAxisAngle.", "Body-frame rates go on the right: quaternionMultiply(q, Δq)."],
      cases: [
        example([IDENTITY_Q, { x: 0, y: 0, z: PI / 2 }, 1], Z90, "yaw rate for one second"),
        example([Z90, { x: 0, y: 0, z: PI / 2 }, 1], { x: 0, y: 0, z: 1, w: 0 }, "accumulates"),
        example([IDENTITY_Q, { x: PI, y: 0, z: 0 }, 0.5], X90, "half a second"),
        example([Z90, { x: PI / 2, y: 0, z: 0 }, 1], { x: 0.5, y: 0.5, z: 0.5, w: 0.5 }, "body roll after a yaw"),
        example([Y90, { x: 0, y: 0, z: 0 }, 1], Y90, "no rotation"),
      ],
    }),
    puzzle({
      number: 78, id: "twist-in-sensor-frame", track: "estimation", title: "Twist at a Mounted Sensor",
      goal: "Express the robot's body twist at a rigidly mounted sensor frame, lever arm included.",
      concept: "A turning robot drags its sensors sideways: v_sensor = v + ω × r, then rotate into the sensor axes.",
      functionName: "twistInSensorFrame", signature: "twistInSensorFrame(twist, baseFromSensor) → twist",
      starterSource: starter("twistInSensorFrame", "twist, baseFromSensor", "r = sensor offset; v' = (vx − ω·ry, vy + ω·rx) rotated by −yaw; ω unchanged."),
      referenceSource: lines(
        "function twistInSensorFrame(twist, baseFromSensor) {",
        "  var vx = twist.vx - twist.wz * baseFromSensor.y;",
        "  var vy = twist.vy + twist.wz * baseFromSensor.x;",
        "  var local = rotateVector({ x: vx, y: vy }, -baseFromSensor.yaw);",
        "  return { vx: local.x, vy: local.y, wz: twist.wz };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "data-types",
      dependencies: ["rotate-vector"],
      reference: docref("tf2_geometry_msgs (why twists are not transformed like vectors)", "https://docs.ros.org/en/rolling/p/tf2_geometry_msgs/"),
      scene: { kind: "estimation", view: "sensor-twist", handles: [
        { id: "sensor", type: "frame", label: "sensor in base_link", value: { x: 1.2, y: 0.4, yaw: 0.6 } },
        { id: "vx", type: "slider", label: "vx (m/s)", value: 0.8, min: -1, max: 1 },
        { id: "wz", type: "slider", label: "ωz (rad/s)", value: 0.7, min: -2, max: 2 },
      ], args: [{ fixture: "twistFromSliders" }, { handle: "sensor" }] },
      diagnoses: [
        diagnosis("lever-arm-ignored", "Only rotated the velocity: a sensor off the rotation axis also moves with ω × r.", lines(
          "function twistInSensorFrame(twist, baseFromSensor) {",
          "  var local = rotateVector({ x: twist.vx, y: twist.vy }, -baseFromSensor.yaw);",
          "  return { vx: local.x, vy: local.y, wz: twist.wz };",
          "}"
        )),
        diagnosis("rotation-ignored", "The lever arm was added but the result stayed in base_link axes; rotate by −yaw into the sensor frame.", lines(
          "function twistInSensorFrame(twist, baseFromSensor) {",
          "  return { vx: twist.vx - twist.wz * baseFromSensor.y, vy: twist.vy + twist.wz * baseFromSensor.x, wz: twist.wz };",
          "}"
        )),
      ],
      hints: ["The sensor's velocity in base axes is v + ω × r with r its offset.", "In 2D, ω × r = (−ω·ry, ω·rx).", "Rotate that vector by −yaw to express it in the sensor's own axes; ω stays the same."],
      cases: [
        example([{ vx: 0, vy: 0, wz: 1 }, { x: 1, y: 0, yaw: 0 }], { vx: 0, vy: 1, wz: 1 }, "sensor ahead, pure spin"),
        example([{ vx: 0, vy: 0, wz: 1 }, { x: 0, y: 1, yaw: 0 }], { vx: -1, vy: 0, wz: 1 }, "sensor to the left, pure spin"),
        example([{ vx: 1, vy: 0, wz: 0 }, { x: 0, y: 0, yaw: PI / 2 }], { vx: 0, vy: -1, wz: 0 }, "rotated sensor, straight motion"),
        example([{ vx: 1, vy: 0, wz: 0.5 }, { x: 2, y: 0, yaw: 0 }], { vx: 1, vy: 1, wz: 0.5 }, "arc with a forward sensor"),
      ],
    }),
  ];

  const ESTIMATION_20 = [
    puzzle({
      number: 79, id: "covariance-propagate-motion", track: "estimation", title: "Propagate Covariance Through Motion",
      goal: "Compute F P Fᵀ + Q for the odometry motion model.",
      concept: "Yaw uncertainty turns into sideways position uncertainty as the robot drives; the Jacobian encodes exactly that.",
      functionName: "predictCovariance", signature: "predictCovariance(P, pose, v, dt, Q) → 3×3",
      starterSource: starter("predictCovariance", "P, pose, v, dt, Q", "F = [[1, 0, −v·dt·sin yaw], [0, 1, v·dt·cos yaw], [0, 0, 1]] at the current pose."),
      referenceSource: lines(
        "function predictCovariance(P, pose, v, dt, Q) {",
        "  var f = [[1, 0, -v * dt * Math.sin(pose.yaw)], [0, 1, v * dt * Math.cos(pose.yaw)], [0, 0, 1]];",
        "  var ft = [[f[0][0], f[1][0], f[2][0]], [f[0][1], f[1][1], f[2][1]], [f[0][2], f[1][2], f[2][2]]];",
        "  var propagated = matMul3(matMul3(f, P), ft);",
        "  return propagated.map(function (row, i) { return row.map(function (value, j) { return value + Q[i][j]; }); });",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["mat-mul-3"],
      reference: pyref(EKF_PY, "jacob_f / PPred"),
      scene: { kind: "estimation", view: "predict-cov", handles: [
        { id: "pose", type: "pose", label: "pose", value: { x: -1, y: 0, yaw: 0.4 } },
        { id: "v", type: "slider", label: "v (m/s)", value: 1, min: 0, max: 2 },
        { id: "dt", type: "slider", label: "dt (s)", value: 1, min: 0.1, max: 2 },
      ], args: [{ fixture: "priorP" }, { handle: "pose" }, { handle: "v" }, { handle: "dt" }, { fixture: "smallQ" }] },
      diagnoses: [
        diagnosis("no-transpose", "The right-hand factor must be Fᵀ, not F.", lines(
          "function predictCovariance(P, pose, v, dt, Q) {",
          "  var f = [[1, 0, -v * dt * Math.sin(pose.yaw)], [0, 1, v * dt * Math.cos(pose.yaw)], [0, 0, 1]];",
          "  var propagated = matMul3(matMul3(f, P), f);",
          "  return propagated.map(function (row, i) { return row.map(function (value, j) { return value + Q[i][j]; }); });",
          "}"
        )),
        diagnosis("jacobian-identity", "P + Q ignores the motion: the Jacobian couples yaw uncertainty into position.", "function predictCovariance(P, pose, v, dt, Q) { return P.map(function (row, i) { return row.map(function (value, j) { return value + Q[i][j]; }); }); }"),
      ],
      hints: ["Differentiate integrateMotion with respect to (x, y, yaw).", "Only the yaw column is non-trivial: (−v·dt·sin yaw, v·dt·cos yaw, 1).", "Return matMul3(matMul3(F, P), Fᵀ) plus Q element-wise."],
      cases: [
        example([I3, { x: 0, y: 0, yaw: 0 }, 1, 1, ZERO3], P_AFTER_STRAIGHT, "one metre forward"),
        example([I3, { x: 0, y: 0, yaw: PI / 2 }, 1, 1, ZERO3], [[2, 0, -1], [0, 1, 0], [-1, 0, 1]], "facing +y"),
        example([ZERO3, { x: 1, y: 2, yaw: 0.3 }, 2, 0.5, diag3(0.1, 0.2, 0.3)], diag3(0.1, 0.2, 0.3), "only process noise"),
        example([I3, { x: 0, y: 0, yaw: 0 }, 0, 1, ZERO3], I3, "standing still"),
      ],
    }),
    puzzle({
      number: 80, id: "compose-uncertain", track: "estimation", title: "Compound Two Uncertain Transforms",
      goal: "Compose two transforms and their covariances to first order.",
      concept: "Uncertainty in the parent's yaw sweeps the child's position sideways; the two Jacobians capture that.",
      functionName: "composeUncertain", signature: "composeUncertain(a, b) → { transform, covariance }",
      starterSource: starter("composeUncertain", "a, b", "a and b are { transform, covariance }; covariance = J_A Σ_A J_Aᵀ + J_B Σ_B J_Bᵀ."),
      referenceSource: lines(
        "function composeUncertain(a, b) {",
        "  var ta = a.transform, tb = b.transform;",
        "  var c = Math.cos(ta.yaw), s = Math.sin(ta.yaw);",
        "  var ja = [[1, 0, -(s * tb.x + c * tb.y)], [0, 1, c * tb.x - s * tb.y], [0, 0, 1]];",
        "  var jb = [[c, -s, 0], [s, c, 0], [0, 0, 1]];",
        "  function transpose(m) { return [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]]; }",
        "  var fromA = matMul3(matMul3(ja, a.covariance), transpose(ja));",
        "  var fromB = matMul3(matMul3(jb, b.covariance), transpose(jb));",
        "  var covariance = fromA.map(function (row, i) { return row.map(function (value, j) { return value + fromB[i][j]; }); });",
        "  return { transform: compose(ta, tb), covariance: covariance };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "composition",
      dependencies: ["compose", "mat-mul-3"],
      reference: docref("Smith, Self & Cheeseman (1990), Estimating Uncertain Spatial Relationships in Robotics", "https://doi.org/10.1007/978-1-4613-8997-2_14"),
      scene: { kind: "estimation", view: "compose-uncertain", handles: [{ id: "b", type: "frame", label: "b in a", value: { x: 1.5, y: 0.5, yaw: 0.6 } }], args: [{ fixture: "uncertainA" }, { fixture: "uncertainB" }] },
      diagnoses: [
        diagnosis("sum-only", "Covariances were added without Jacobians: the child's covariance must be rotated by the parent's yaw, and the parent's yaw uncertainty must sweep the child's offset.", lines(
          "function composeUncertain(a, b) {",
          "  var covariance = a.covariance.map(function (row, i) { return row.map(function (value, j) { return value + b.covariance[i][j]; }); });",
          "  return { transform: compose(a.transform, b.transform), covariance: covariance };",
          "}"
        )),
        diagnosis("no-yaw-lever", "J_A was taken as the identity: the parent's yaw uncertainty must sweep the child's offset (the third column of J_A).", lines(
          "function composeUncertain(a, b) {",
          "  var ta = a.transform, tb = b.transform;",
          "  var c = Math.cos(ta.yaw), s = Math.sin(ta.yaw);",
          "  var jb = [[c, -s, 0], [s, c, 0], [0, 0, 1]];",
          "  var jbt = [[c, s, 0], [-s, c, 0], [0, 0, 1]];",
          "  var fromB = matMul3(matMul3(jb, b.covariance), jbt);",
          "  var covariance = a.covariance.map(function (row, i) { return row.map(function (value, j) { return value + fromB[i][j]; }); });",
          "  return { transform: compose(ta, tb), covariance: covariance };",
          "}"
        )),
      ],
      hints: ["The transform part is just compose(a, b).", "J_A = [[1, 0, −(sinθ·xb + cosθ·yb)], [0, 1, cosθ·xb − sinθ·yb], [0, 0, 1]] with θ the parent yaw; J_B rotates by θ.", "Σ = J_A Σ_A J_Aᵀ + J_B Σ_B J_Bᵀ using matMul3."],
      cases: [
        example([{ transform: { x: 0, y: 0, yaw: 0 }, covariance: ZERO3 }, { transform: { x: 1, y: 0, yaw: 0 }, covariance: diag3(1, 2, 3) }], { transform: { x: 1, y: 0, yaw: 0 }, covariance: diag3(1, 2, 3) }, "certain parent"),
        example([{ transform: { x: 0, y: 0, yaw: PI / 2 }, covariance: ZERO3 }, { transform: { x: 1, y: 0, yaw: 0 }, covariance: diag3(1, 0, 0) }], { transform: { x: 0, y: 1, yaw: PI / 2 }, covariance: diag3(0, 1, 0) }, "rotated parent turns x noise into y noise"),
        example([{ transform: { x: 0, y: 0, yaw: 0 }, covariance: diag3(0, 0, 1) }, { transform: { x: 1, y: 0, yaw: 0 }, covariance: ZERO3 }], { transform: { x: 1, y: 0, yaw: 0 }, covariance: [[0, 0, 0], [0, 1, 1], [0, 1, 1]] }, "yaw noise sweeps the child sideways"),
        example([{ transform: { x: 2, y: 1, yaw: 0 }, covariance: diag3(0.5, 0.5, 0) }, { transform: { x: 0, y: 0, yaw: 0 }, covariance: diag3(0, 0, 0.2) }], { transform: { x: 2, y: 1, yaw: 0 }, covariance: diag3(0.5, 0.5, 0.2) }, "independent parts add"),
      ],
    }),
    puzzle({
      number: 81, id: "mahalanobis-distance", track: "estimation", title: "Mahalanobis Distance",
      goal: "Measure an innovation against its covariance: d² = yᵀ S⁻¹ y.",
      concept: "Data association gates on this, not on metres: a 1 m miss is nothing along a loose axis and huge along a tight one.",
      functionName: "mahalanobisDistance", signature: "mahalanobisDistance(innovation, covariance) → number",
      starterSource: starter("mahalanobisDistance", "innovation, covariance", "Invert the 2×2 covariance: [[d, −b], [−c, a]] / (ad − bc)."),
      referenceSource: lines(
        "function mahalanobisDistance(innovation, covariance) {",
        "  var a = covariance[0][0], b = covariance[0][1], c = covariance[1][0], d = covariance[1][1];",
        "  var det = a * d - b * c;",
        "  var ix = (d * innovation.x - b * innovation.y) / det;",
        "  var iy = (-c * innovation.x + a * innovation.y) / det;",
        "  return innovation.x * ix + innovation.y * iy;",
        "}"
      ),
      comparator: "scalar", walkthroughChapter: "sensor-scenario",
      reference: pyref("SLAM/EKFSLAM/ekf_slam.py", "search_correspond_landmark_id"),
      scene: { kind: "estimation", view: "mahalanobis", handles: [{ id: "point", type: "point", label: "innovation", value: { x: 1.2, y: 0.5 } }], args: [{ handle: "point" }, { fixture: "gateCovariance" }] },
      diagnoses: [
        diagnosis("no-inverse", "That is yᵀ S y: the covariance must be inverted.", "function mahalanobisDistance(innovation, covariance) { var x = innovation.x, y = innovation.y; return x * (covariance[0][0] * x + covariance[0][1] * y) + y * (covariance[1][0] * x + covariance[1][1] * y); }"),
        diagnosis("euclidean", "Plain squared length ignores the covariance entirely.", "function mahalanobisDistance(innovation, covariance) { return innovation.x * innovation.x + innovation.y * innovation.y; }"),
      ],
      hints: ["Invert the 2×2 covariance in closed form.", "Multiply the inverse by the innovation, then dot with the innovation again.", "For S = I this is the squared Euclidean distance."],
      cases: [
        example([{ x: 3, y: 4 }, I2], 25, "identity covariance"),
        example([{ x: 2, y: 1 }, [[4, 0], [0, 1]]], 2, "loose x axis"),
        example([{ x: 1, y: 1 }, [[2, 1], [1, 2]]], 2 / 3, "correlated"),
        example([{ x: 0, y: 0 }, [[3, 0.5], [0.5, 1]]], 0, "zero innovation"),
      ],
    }),
    puzzle({
      number: 82, id: "covariance-ellipse", track: "estimation", title: "Covariance to Ellipse",
      goal: "Turn a 2×2 covariance into the orientation and semi-axes of its uncertainty ellipse.",
      concept: "Eigenvectors are the ellipse axes; eigenvalues are variances, so the axes are their square roots times the sigma count.",
      functionName: "covarianceEllipse", signature: "covarianceEllipse(cov, sigmas) → { angle, major, minor }",
      starterSource: starter("covarianceEllipse", "cov, sigmas", "angle = ½·atan2(2b, a − d); eigenvalues = mean ± spread."),
      referenceSource: lines(
        "function covarianceEllipse(cov, sigmas) {",
        "  var a = cov[0][0], b = (cov[0][1] + cov[1][0]) / 2, d = cov[1][1];",
        "  var mean = (a + d) / 2;",
        "  var spread = Math.sqrt(Math.max(0, ((a - d) / 2) * ((a - d) / 2) + b * b));",
        "  return { angle: 0.5 * Math.atan2(2 * b, a - d), major: sigmas * Math.sqrt(Math.max(0, mean + spread)), minor: sigmas * Math.sqrt(Math.max(0, mean - spread)) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      reference: pyref("utils/plot.py", "plot_covariance_ellipse"),
      scene: { kind: "estimation", view: "ellipse", handles: [
        { id: "angle", type: "slider", label: "angle", value: 0.5, min: -PI / 2, max: PI / 2 },
        { id: "major", type: "slider", label: "major σ", value: 1.2, min: 0.2, max: 2 },
        { id: "minor", type: "slider", label: "minor σ", value: 0.5, min: 0.1, max: 2 },
      ], args: [{ fixture: "ellipseCovariance" }, 1] },
      diagnoses: [
        diagnosis("variance-not-stddev", "The eigenvalues are variances; the semi-axes need their square roots.", lines(
          "function covarianceEllipse(cov, sigmas) {",
          "  var a = cov[0][0], b = (cov[0][1] + cov[1][0]) / 2, d = cov[1][1];",
          "  var mean = (a + d) / 2;",
          "  var spread = Math.sqrt(Math.max(0, ((a - d) / 2) * ((a - d) / 2) + b * b));",
          "  return { angle: 0.5 * Math.atan2(2 * b, a - d), major: sigmas * (mean + spread), minor: sigmas * (mean - spread) };",
          "}"
        )),
        diagnosis("angle-not-halved", "The orientation is half of atan2(2b, a − d).", lines(
          "function covarianceEllipse(cov, sigmas) {",
          "  var a = cov[0][0], b = (cov[0][1] + cov[1][0]) / 2, d = cov[1][1];",
          "  var mean = (a + d) / 2;",
          "  var spread = Math.sqrt(Math.max(0, ((a - d) / 2) * ((a - d) / 2) + b * b));",
          "  return { angle: Math.atan2(2 * b, a - d), major: sigmas * Math.sqrt(Math.max(0, mean + spread)), minor: sigmas * Math.sqrt(Math.max(0, mean - spread)) };",
          "}"
        )),
      ],
      hints: ["For a symmetric 2×2, eigenvalues are mean ± sqrt(((a − d)/2)² + b²).", "The major axis angle is ½·atan2(2b, a − d).", "Semi-axes = sigmas × sqrt(eigenvalue)."],
      cases: [
        example([[[4, 0], [0, 1]], 1], { angle: 0, major: 2, minor: 1 }, "axis-aligned"),
        example([[[1, 0], [0, 4]], 1], { angle: PI / 2, major: 2, minor: 1 }, "tall"),
        example([[[2, 1], [1, 2]], 1], { angle: PI / 4, major: Math.sqrt(3), minor: 1 }, "correlated"),
        example([I2, 2], { angle: 0, major: 2, minor: 2 }, "circle at 2σ"),
      ],
    }),
  ];

  const ESTIMATION_21 = [
    puzzle({
      number: 83, id: "ekf-predict", track: "estimation", title: "EKF Predict",
      goal: "Advance the state with the motion model and the covariance with its Jacobian.",
      concept: "Prediction is integrateMotion for the mean and predictCovariance for the spread, evaluated at the previous state.",
      functionName: "ekfPredict", signature: "ekfPredict(state, P, u, dt, Q) → { state, P }",
      starterSource: starter("ekfPredict", "state, P, u, dt, Q", "u = { v, omega }."),
      referenceSource: "function ekfPredict(state, P, u, dt, Q) { return { state: integrateMotion(state, u.v, u.omega, dt), P: predictCovariance(P, state, u.v, dt, Q) }; }",
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["integrate-motion", "covariance-propagate-motion"],
      reference: pyref(EKF_PY, "ekf_estimation (predict)"),
      scene: { kind: "estimation", view: "ekf-predict", handles: [
        { id: "pose", type: "pose", label: "state", value: { x: -1.5, y: -0.5, yaw: 0.3 } },
        { id: "v", type: "slider", label: "v (m/s)", value: 1, min: 0, max: 2 },
        { id: "omega", type: "slider", label: "ω (rad/s)", value: 0.5, min: -2, max: 2 },
      ], args: [{ handle: "pose" }, { fixture: "priorP" }, { fixture: "control" }, 1, { fixture: "smallQ" }] },
      diagnoses: [
        diagnosis("jacobian-at-new-state", "The Jacobian was evaluated at the predicted state; linearize at the state you start from.", "function ekfPredict(state, P, u, dt, Q) { var next = integrateMotion(state, u.v, u.omega, dt); return { state: next, P: predictCovariance(P, next, u.v, dt, Q) }; }"),
        diagnosis("covariance-unchanged", "The covariance must grow with motion.", "function ekfPredict(state, P, u, dt, Q) { return { state: integrateMotion(state, u.v, u.omega, dt), P: P }; }"),
      ],
      hints: ["Mean: integrateMotion(state, u.v, u.omega, dt).", "Covariance: predictCovariance(P, state, u.v, dt, Q) with the old state.", "Return both in one object."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, I3, { v: 1, omega: 0 }, 1, ZERO3], { state: { x: 1, y: 0, yaw: 0 }, P: P_AFTER_STRAIGHT }, "straight"),
        example([{ x: 0, y: 0, yaw: 0 }, I3, { v: 1, omega: PI / 2 }, 1, ZERO3], { state: { x: 1, y: 0, yaw: PI / 2 }, P: P_AFTER_STRAIGHT }, "turning"),
        example([{ x: 1, y: 1, yaw: PI / 2 }, ZERO3, { v: 2, omega: 0 }, 0.5, diag3(0.1, 0.1, 0.1)], { state: { x: 1, y: 2, yaw: PI / 2 }, P: diag3(0.1, 0.1, 0.1) }, "only process noise"),
      ],
    }),
    puzzle({
      number: 84, id: "ekf-update-position", track: "estimation", title: "EKF Update with a Position Fix",
      goal: "Fuse a position measurement: innovation, gain, corrected state, shrunk covariance.",
      concept: "K = P Hᵀ (H P Hᵀ + R)⁻¹ decides how much to trust the fix; yaw gets corrected through its correlation with position.",
      functionName: "ekfUpdatePosition", signature: "ekfUpdatePosition(state, P, z, R) → { state, P }",
      starterSource: starter("ekfUpdatePosition", "state, P, z, R", "H picks x and y. S = P[0..1][0..1] + R; K = P Hᵀ S⁻¹; x += K·y; P = (I − K H) P."),
      referenceSource: lines(
        "function ekfUpdatePosition(state, P, z, R) {",
        "  var yx = z.x - state.x, yy = z.y - state.y;",
        "  var s00 = P[0][0] + R[0][0], s01 = P[0][1] + R[0][1], s10 = P[1][0] + R[1][0], s11 = P[1][1] + R[1][1];",
        "  var det = s00 * s11 - s01 * s10;",
        "  var i00 = s11 / det, i01 = -s01 / det, i10 = -s10 / det, i11 = s00 / det;",
        "  var k = [];",
        "  for (var r = 0; r < 3; r += 1) k.push([P[r][0] * i00 + P[r][1] * i10, P[r][0] * i01 + P[r][1] * i11]);",
        "  var next = { x: state.x + k[0][0] * yx + k[0][1] * yy, y: state.y + k[1][0] * yx + k[1][1] * yy, yaw: state.yaw + k[2][0] * yx + k[2][1] * yy };",
        "  var updated = [];",
        "  for (var i = 0; i < 3; i += 1) {",
        "    updated.push([]);",
        "    for (var j = 0; j < 3; j += 1) {",
        "      var kh0 = (i === 0 ? 1 : 0) - k[i][0], kh1 = (i === 1 ? 1 : 0) - k[i][1], kh2 = (i === 2 ? 1 : 0);",
        "      updated[i].push(kh0 * P[0][j] + kh1 * P[1][j] + kh2 * P[2][j]);",
        "    }",
        "  }",
        "  return { state: next, P: updated };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      reference: pyref(EKF_PY, "ekf_estimation (update)"),
      scene: { kind: "estimation", view: "ekf-update", handles: [
        { id: "state", type: "pose", label: "prior state", value: { x: 0, y: 0, yaw: 0.2 } },
        { id: "z", type: "point", label: "position fix z", value: { x: 1.2, y: 0.6 } },
      ], args: [{ handle: "state" }, { fixture: "updateP" }, { handle: "z" }, { fixture: "updateR" }] },
      diagnoses: [
        diagnosis("full-gain", "The state jumped all the way to the measurement: the Kalman gain weighs P against R.", lines(
          "function ekfUpdatePosition(state, P, z, R) {",
          "  var k = [[1, 0], [0, 1], [0, 0]];",
          "  var next = { x: z.x, y: z.y, yaw: state.yaw };",
          "  var updated = [];",
          "  for (var i = 0; i < 3; i += 1) {",
          "    updated.push([]);",
          "    for (var j = 0; j < 3; j += 1) {",
          "      var kh0 = (i === 0 ? 1 : 0) - k[i][0], kh1 = (i === 1 ? 1 : 0) - k[i][1], kh2 = (i === 2 ? 1 : 0);",
          "      updated[i].push(kh0 * P[0][j] + kh1 * P[1][j] + kh2 * P[2][j]);",
          "    }",
          "  }",
          "  return { state: next, P: updated };",
          "}"
        )),
        diagnosis("covariance-unchanged", "After a measurement the covariance must shrink: P = (I − K H) P.", lines(
          "function ekfUpdatePosition(state, P, z, R) {",
          "  var yx = z.x - state.x, yy = z.y - state.y;",
          "  var s00 = P[0][0] + R[0][0], s01 = P[0][1] + R[0][1], s10 = P[1][0] + R[1][0], s11 = P[1][1] + R[1][1];",
          "  var det = s00 * s11 - s01 * s10;",
          "  var i00 = s11 / det, i01 = -s01 / det, i10 = -s10 / det, i11 = s00 / det;",
          "  var k = [];",
          "  for (var r = 0; r < 3; r += 1) k.push([P[r][0] * i00 + P[r][1] * i10, P[r][0] * i01 + P[r][1] * i11]);",
          "  return { state: { x: state.x + k[0][0] * yx + k[0][1] * yy, y: state.y + k[1][0] * yx + k[1][1] * yy, yaw: state.yaw + k[2][0] * yx + k[2][1] * yy }, P: P };",
          "}"
        )),
      ],
      hints: ["Innovation y = z − (x, y).", "S is the position block of P plus R; K = P Hᵀ S⁻¹ is 3×2 (rows x, y, yaw).", "state += K·y; P = (I − K H) P, where K H has K's columns in positions x and y."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, I3, { x: 2, y: 2 }, I2], { state: { x: 1, y: 1, yaw: 0 }, P: diag3(0.5, 0.5, 1) }, "equal trust"),
        example([{ x: 0, y: 0, yaw: 0 }, I3, { x: 2, y: 2 }, ZERO2], { state: { x: 2, y: 2, yaw: 0 }, P: diag3(0, 0, 1) }, "perfect measurement"),
        example([{ x: 0, y: 0, yaw: 0 }, [[1, 0, 0.5], [0, 1, 0], [0.5, 0, 1]], { x: 2, y: 0 }, I2], { state: { x: 1, y: 0, yaw: 0.5 }, P: [[0.5, 0, 0.25], [0, 0.5, 0], [0.25, 0, 0.875]] }, "yaw corrected through correlation"),
        example([{ x: 1, y: 1, yaw: 0.3 }, I3, { x: 1, y: 1 }, I2], { state: { x: 1, y: 1, yaw: 0.3 }, P: diag3(0.5, 0.5, 1) }, "measurement agrees"),
      ],
    }),
    puzzle({
      number: 85, id: "particle-weights", track: "estimation", title: "Weight Particles by a Measurement",
      goal: "Give each particle the normalized Gaussian likelihood of the measurement.",
      concept: "A particle filter never inverts anything; it just scores hypotheses and renormalizes.",
      functionName: "particleWeights", signature: "particleWeights(particles, z, sigma) → weights",
      starterSource: starter("particleWeights", "particles, z, sigma", "w_i ∝ exp(−|p_i − z|² / (2σ²)); normalize to sum 1."),
      referenceSource: lines(
        "function particleWeights(particles, z, sigma) {",
        "  var raw = particles.map(function (p) { var dx = p.x - z.x, dy = p.y - z.y; return Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma)); });",
        "  var total = raw.reduce(function (sum, w) { return sum + w; }, 0);",
        "  if (total === 0) return raw.map(function () { return 1 / raw.length; });",
        "  return raw.map(function (w) { return w / total; });",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: pyref(PF_PY, "gauss_likelihood"),
      scene: { kind: "estimation", view: "particles", handles: [
        { id: "z", type: "point", label: "measurement z", value: { x: 0.5, y: 0.3 } },
        { id: "sigma", type: "slider", label: "σ", value: 0.8, min: 0.2, max: 2 },
      ], args: [{ fixture: "particles" }, { handle: "z" }, { handle: "sigma" }] },
      diagnoses: [
        diagnosis("unnormalized", "Raw likelihoods must be divided by their sum so the weights form a distribution.", "function particleWeights(particles, z, sigma) { return particles.map(function (p) { var dx = p.x - z.x, dy = p.y - z.y; return Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma)); }); }"),
        diagnosis("no-square", "The Gaussian uses the squared distance, not the distance.", lines(
          "function particleWeights(particles, z, sigma) {",
          "  var raw = particles.map(function (p) { var dx = p.x - z.x, dy = p.y - z.y; return Math.exp(-Math.sqrt(dx * dx + dy * dy) / (2 * sigma * sigma)); });",
          "  var total = raw.reduce(function (sum, w) { return sum + w; }, 0);",
          "  return raw.map(function (w) { return w / total; });",
          "}"
        )),
      ],
      hints: ["Squared distance from each particle to z.", "exp(−d² / (2σ²)) is the unnormalized weight.", "Divide by the sum of all weights."],
      cases: [
        example([[{ x: 0, y: 0 }, { x: 2, y: 0 }], { x: 1, y: 0 }, 1], [0.5, 0.5], "equidistant"),
        example([[{ x: 0, y: 0 }, { x: 3, y: 0 }], { x: 0, y: 0 }, 1], [1 / (1 + Math.exp(-4.5)), Math.exp(-4.5) / (1 + Math.exp(-4.5))], "one particle on the fix"),
        example([[{ x: 5, y: 5 }], { x: 0, y: 0 }, 1], [1], "single particle"),
        example([[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], { x: 0, y: 0 }, 1], [1 / (1 + 2 * Math.exp(-0.5)), Math.exp(-0.5) / (1 + 2 * Math.exp(-0.5)), Math.exp(-0.5) / (1 + 2 * Math.exp(-0.5))], "three particles"),
      ],
    }),
    puzzle({
      number: 86, id: "resample-particles", track: "estimation", title: "Low-Variance Resampling",
      goal: "Draw a new particle set with one systematic sweep through the cumulative weights.",
      concept: "One random offset plus equally spaced pointers keeps the good particles without the noise of independent draws.",
      functionName: "resampleLowVariance", signature: "resampleLowVariance(particles, weights, u0) → particles",
      starterSource: starter("resampleLowVariance", "particles, weights, u0", "u0 ∈ [0, 1/N); pointer m at u0 + m/N; advance the cumulative index while it is below the pointer."),
      referenceSource: lines(
        "function resampleLowVariance(particles, weights, u0) {",
        "  var count = weights.length, out = [], index = 0;",
        "  var total = weights.reduce(function (sum, w) { return sum + w; }, 0);",
        "  var running = weights[0] / total;",
        "  for (var m = 0; m < count; m += 1) {",
        "    var u = u0 + m / count;",
        "    while (running < u && index < count - 1) { index += 1; running += weights[index] / total; }",
        "    out.push({ x: particles[index].x, y: particles[index].y });",
        "  }",
        "  return out;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: pyref(PF_PY, "re_sampling"),
      scene: { kind: "estimation", view: "resample", handles: [{ id: "u0", type: "slider", label: "u0 (start offset)", value: 0.05, min: 0, max: 0.16 }], args: [{ fixture: "resampleParticles" }, { fixture: "resampleWeights" }, { handle: "u0" }] },
      diagnoses: [
        diagnosis("max-weight-only", "Copying only the heaviest particle collapses the filter; sweep the cumulative weights instead.", lines(
          "function resampleLowVariance(particles, weights, u0) {",
          "  var best = 0;",
          "  for (var i = 1; i < weights.length; i += 1) { if (weights[i] > weights[best]) best = i; }",
          "  return weights.map(function () { return { x: particles[best].x, y: particles[best].y }; });",
          "}"
        )),
        diagnosis("no-cumulative", "Each pointer was compared with a single weight instead of the running cumulative sum.", lines(
          "function resampleLowVariance(particles, weights, u0) {",
          "  var count = weights.length, out = [], index = 0;",
          "  var total = weights.reduce(function (sum, w) { return sum + w; }, 0);",
          "  for (var m = 0; m < count; m += 1) {",
          "    var u = u0 + m / count;",
          "    while (weights[index] / total < u && index < count - 1) index += 1;",
          "    out.push({ x: particles[index].x, y: particles[index].y });",
          "  }",
          "  return out;",
          "}"
        )),
      ],
      hints: ["Normalize the weights and keep a running cumulative sum.", "Pointer m sits at u0 + m/N.", "Advance the index while the cumulative sum is below the pointer, then copy that particle."],
      cases: [
        example([P3, [1, 0, 0], 0.1], [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }], "one heavy particle"),
        example([P3, [1 / 3, 1 / 3, 1 / 3], 0.1], P3, "uniform weights keep the set"),
        example([P3, [0.5, 0.5, 0], 0.2], [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0 }], "two survivors"),
        example([[{ x: 0, y: 0 }, { x: 1, y: 0 }], [0.2, 0.8], 0.3], [{ x: 1, y: 0 }, { x: 1, y: 0 }], "heavy second particle"),
      ],
    }),
    puzzle({
      number: 87, id: "ekf-localize-step", track: "estimation", title: "One EKF Localization Step",
      goal: "Predict with odometry, then update with a position fix.",
      concept: "This is the loop every localizer runs: motion grows uncertainty, measurements shrink it.",
      functionName: "ekfLocalizeStep", signature: "ekfLocalizeStep(state, P, u, z, dt, Q, R) → { state, P }",
      starterSource: starter("ekfLocalizeStep", "state, P, u, z, dt, Q, R"),
      referenceSource: lines(
        "function ekfLocalizeStep(state, P, u, z, dt, Q, R) {",
        "  var predicted = ekfPredict(state, P, u, dt, Q);",
        "  return ekfUpdatePosition(predicted.state, predicted.P, z, R);",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["ekf-predict", "ekf-update-position"],
      reference: pyref(EKF_PY, "ekf_estimation"),
      scene: { kind: "estimation", view: "ekf-step", handles: [
        { id: "state", type: "pose", label: "state before", value: { x: -1.5, y: -0.5, yaw: 0.3 } },
        { id: "z", type: "point", label: "position fix z", value: { x: -0.4, y: 0.3 } },
        { id: "v", type: "slider", label: "v (m/s)", value: 1, min: 0, max: 2 },
        { id: "omega", type: "slider", label: "ω (rad/s)", value: 0.5, min: -2, max: 2 },
      ], args: [{ handle: "state" }, { fixture: "priorP" }, { fixture: "control" }, { handle: "z" }, 1, { fixture: "smallQ" }, { fixture: "updateR" }] },
      diagnoses: [
        diagnosis("update-before-predict", "The measurement belongs to the time after the motion: predict first, then update.", lines(
          "function ekfLocalizeStep(state, P, u, z, dt, Q, R) {",
          "  var updated = ekfUpdatePosition(state, P, z, R);",
          "  return ekfPredict(updated.state, updated.P, u, dt, Q);",
          "}"
        )),
        diagnosis("no-update", "The fix was ignored: apply ekfUpdatePosition after predicting.", "function ekfLocalizeStep(state, P, u, z, dt, Q, R) { return ekfPredict(state, P, u, dt, Q); }"),
      ],
      hints: ["Two calls, in order.", "predicted = ekfPredict(state, P, u, dt, Q).", "return ekfUpdatePosition(predicted.state, predicted.P, z, R)."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, I3, { v: 1, omega: 0 }, { x: 1, y: 0 }, 1, ZERO3, I2], { state: { x: 1, y: 0, yaw: 0 }, P: [[0.5, 0, 0], [0, 2 / 3, 1 / 3], [0, 1 / 3, 2 / 3]] }, "fix agrees"),
        example([{ x: 0, y: 0, yaw: 0 }, I3, { v: 1, omega: 0 }, { x: 1, y: 1 }, 1, ZERO3, I2], { state: { x: 1, y: 2 / 3, yaw: 1 / 3 }, P: [[0.5, 0, 0], [0, 2 / 3, 1 / 3], [0, 1 / 3, 2 / 3]] }, "fix pulls sideways and corrects yaw"),
        example([{ x: 0, y: 0, yaw: 0 }, I3, { v: 1, omega: 0 }, { x: 1, y: 1 }, 1, ZERO3, ZERO2], { state: { x: 1, y: 1, yaw: 0.5 }, P: [[0, 0, 0], [0, 0, 0], [0, 0, 0.5]] }, "perfect fix"),
      ],
    }),
  ];
```

Then change the `PUZZLES` line to end with `CORRECTION_18, ESTIMATION_19, ESTIMATION_20, ESTIMATION_21));`.

- [ ] **Step 5: Add the gyro view and the estimation scene**

In `puzzle-scenes.js`:

1. In `describe`, insert directly after the `if (Array.isArray(value.indexes) && Number.isFinite(value.error)) return …;` line:

```js
      if (value.state && Array.isArray(value.P)) return "state " + fmtTransform(value.state) + " · σx " + fmt(Math.sqrt(Math.max(0, value.P[0][0]))) + " σy " + fmt(Math.sqrt(Math.max(0, value.P[1][1]))) + " σyaw " + fmt(Math.sqrt(Math.max(0, value.P[2][2])));
      if (Number.isFinite(value.angle) && Number.isFinite(value.major) && Number.isFinite(value.minor)) return "angle " + degrees(value.angle) + " · major " + fmt(value.major) + " · minor " + fmt(value.minor);
      if (value.transform && Array.isArray(value.covariance)) return fmtTransform(value.transform) + " · σx " + fmt(Math.sqrt(Math.max(0, value.covariance[0][0]))) + " σy " + fmt(Math.sqrt(Math.max(0, value.covariance[1][1])));
      if (Number.isFinite(value.v) && Number.isFinite(value.omega)) return "v " + fmt(value.v) + " m/s · ω " + fmt(value.omega) + " rad/s";
```

and, in the array branch, directly after `if (value.every((item) => typeof item === "string")) return value.join(" → ");`:

```js
      if (value.length && value.every((item) => typeof item === "number")) return "[" + value.map(fmt).join(", ") + "]";
```

2. In `se3Scene.fixtures`, insert after the `rpyArray:` line:

```js
      identityQuat: () => ({ x: 0, y: 0, z: 0, w: 1 }),
      omegaFromSliders: (values) => ({ x: values.wx, y: values.wy, z: values.wz }),
```

3. In `se3Scene.layers`, insert directly before the final `} else {` branch (the one followed by `if (isQuaternion(context.expected)) drawBasis(context.expected, "expected", "expected", true);` and then `out.push(...notes(`):

```js
      } else if (view === "gyro") {
        const omega = se3Scene.fixtures.omegaFromSliders(context.values);
        const rate = Math.hypot(omega.x, omega.y, omega.z);
        if (rate > 1e-9) out.push(arrow3d(ORIGIN3, scaled3({ x: omega.x / rate, y: omega.y / rate, z: omega.z / rate }, 1.4), "ω axis · " + fmt(rate) + " rad/s × " + fmt(context.values.dt) + " s", "input"));
        if (isQuaternion(context.expected)) drawBasis(context.expected, "expected", "expected", true);
        if (isQuaternion(context.actual)) drawBasis(context.actual, resultLabel(context), resultStyle(context), false);
```

4. Insert directly before `const SCENES = {`:

```js
  // ------------------------------------------------------------ uncertainty and estimation
  const P_PRIOR = [[0.05, 0, 0], [0, 0.05, 0], [0, 0, 0.1]];
  const Q_SMALL = [[0.01, 0, 0], [0, 0.01, 0], [0, 0, 0.01]];
  const P_UPDATE = [[0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.2]];
  const R_UPDATE = [[0.2, 0], [0, 0.2]];
  const S_GATE = [[1.0, 0.4], [0.4, 0.5]];
  const PARTICLES = (() => { const list = []; for (let i = 0; i < 4; i += 1) for (let j = 0; j < 3; j += 1) list.push({ x: -1.5 + i, y: -1 + j }); return list; })();
  const RESAMPLE_PARTICLES = [{ x: -2, y: 0 }, { x: -1.2, y: 0.6 }, { x: -0.4, y: -0.3 }, { x: 0.4, y: 0.5 }, { x: 1.2, y: -0.4 }, { x: 2, y: 0.2 }];
  const RESAMPLE_WEIGHTS = [0.05, 0.1, 0.35, 0.3, 0.15, 0.05];
  function xyBlock(m) { return [[m[0][0], m[0][1]], [m[1][0], m[1][1]]]; }
  function isMatrix3(m) { return isMatrix(m, 3); }
  function isState(v) { return Boolean(v) && typeof v === "object" && isTransform(v.state) && isMatrix3(v.P); }
  function isTwistLike(v) { return Boolean(v) && typeof v === "object" && Number.isFinite(v.v) && Number.isFinite(v.omega); }
  function twistLayers(origin, twist, style, dashed, text) {
    const velocity = rotate({ x: twist.vx, y: twist.vy }, origin.yaw);
    return [
      arrow(origin, add(origin, velocity), style, { dashed, weight: dashed ? 2 : 3 }),
      arc(origin, 0.6, origin.yaw, origin.yaw + twist.wz, style, { dashed, arrowhead: true }),
      label(text, style, { at: add(add(origin, velocity), { x: 0.15, y: 0.2 }) }),
    ];
  }
  const estimationScene = {
    fixtures: {
      twistFromSliders: (values) => ({ vx: values.vx, vy: 0, wz: values.wz }),
      priorP: () => P_PRIOR,
      smallQ: () => Q_SMALL,
      control: (values) => ({ v: values.v, omega: values.omega }),
      uncertainA: () => ({ transform: { x: 0, y: 0, yaw: 0 }, covariance: [[0.02, 0, 0], [0, 0.02, 0], [0, 0, 0.05]] }),
      uncertainB: (values) => ({ transform: values.b, covariance: [[0.03, 0, 0], [0, 0.01, 0], [0, 0, 0.02]] }),
      gateCovariance: () => S_GATE,
      ellipseCovariance: (values) => {
        const c = Math.cos(values.angle), s = Math.sin(values.angle);
        const l1 = values.major * values.major, l2 = values.minor * values.minor;
        return [[c * c * l1 + s * s * l2, c * s * (l1 - l2)], [c * s * (l1 - l2), s * s * l1 + c * c * l2]];
      },
      updateP: () => P_UPDATE,
      updateR: () => R_UPDATE,
      particles: () => PARTICLES,
      resampleParticles: () => RESAMPLE_PARTICLES,
      resampleWeights: () => RESAMPLE_WEIGHTS,
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const values = context.values;
      const out = laneLayers(context.puzzle, values);
      const origin = { x: 0, y: 0, yaw: 0 };
      if (view === "diffdrive") {
        out.push(glyph(origin, "robot", "input"), segments([[{ x: -0.15, y: 0.25 }, { x: 0.15, y: 0.25 }], [{ x: -0.15, y: -0.25 }, { x: 0.15, y: -0.25 }]], "input", { weight: 4 }));
        out.push(label("left " + fmt(values.vLeft) + " m/s · right " + fmt(values.vRight) + " m/s · wheelbase 0.5 m", "muted", { row: 3 }));
        const trailOf = (twist) => { let pose = origin; const trail = []; for (let i = 0; i < 20; i += 1) { pose = stepMotion(pose, twist.v, twist.omega, 0.05); trail.push({ x: pose.x, y: pose.y }); } return trail; };
        if (isTwistLike(context.expected)) { out.push(pointsPrimitive(trailOf(context.expected), "expected", { size: 5, label: "expected 1 s path" })); out.push(...twistLayers(origin, { vx: context.expected.v, vy: 0, wz: context.expected.omega }, "expected", true, "expected")); }
        if (isTwistLike(context.actual)) { out.push(pointsPrimitive(trailOf(context.actual), resultStyle(context), { size: 3 })); out.push(...twistLayers(origin, { vx: context.actual.v, vy: 0, wz: context.actual.omega }, resultStyle(context), false, resultLabel(context))); }
      } else if (view === "sensor-twist") {
        const sensor = values.sensor;
        out.push(glyph(origin, "base_link", "input"), ...twistLayers(origin, { vx: values.vx, vy: 0, wz: values.wz }, "input", false, "body twist"), frame(sensor, "sensor", "input", { size: 0.6 }));
        const drawAt = (twist, style, dashed, text) => {
          const velocity = rotate({ x: twist.vx, y: twist.vy }, sensor.yaw);
          out.push(arrow(sensor, add(sensor, velocity), style, { dashed, weight: dashed ? 2 : 3 }), label(text, style, { at: add(add(sensor, velocity), { x: 0.15, y: 0.2 }) }));
        };
        if (isTwist(context.expected)) drawAt(context.expected, "expected", true, "expected sensor velocity");
        if (isTwist(context.actual)) drawAt(context.actual, resultStyle(context), false, resultLabel(context));
      } else if (view === "predict-cov" || view === "ekf-predict") {
        const pose = values.pose;
        const control = view === "predict-cov" ? { v: values.v, omega: 0 } : { v: values.v, omega: values.omega };
        const predicted = stepMotion(pose, control.v, control.omega, view === "predict-cov" ? values.dt : 1);
        out.push(glyph(pose, "pose", "input"), ellipse(pose, xyBlock(P_PRIOR), "muted", { label: "prior 2σ" }), arrow(pose, predicted, "muted", { dashed: true, weight: 1 }), glyph(predicted, "predicted", "muted", { dashed: true }));
        const expectedP = view === "predict-cov" ? context.expected : (context.expected && context.expected.P);
        const actualP = view === "predict-cov" ? context.actual : (context.actual && context.actual.P);
        if (isMatrix3(expectedP)) out.push(ellipse(predicted, xyBlock(expectedP), "expected", { dashed: true, label: "expected 2σ" }));
        if (isMatrix3(actualP)) out.push(ellipse(predicted, xyBlock(actualP), resultStyle(context), { label: resultLabel(context) }));
        if (view === "ekf-predict") {
          if (isState(context.expected)) out.push(glyph(context.expected.state, "expected state", "expected", { dashed: true }));
          if (isState(context.actual)) out.push(glyph(context.actual.state, resultLabel(context), resultStyle(context)));
        }
      } else if (view === "compose-uncertain") {
        const b = values.b;
        out.push(frame(origin, "a", "muted"), ellipse(origin, xyBlock(estimationScene.fixtures.uncertainA().covariance), "muted", { label: "Σa 2σ" }), frame(b, "b", "input"), ellipse(b, xyBlock(estimationScene.fixtures.uncertainB(values).covariance), "input", { label: "Σb 2σ (in a)" }));
        if (context.expected && isTransform(context.expected.transform) && isMatrix3(context.expected.covariance)) out.push(ellipse(context.expected.transform, xyBlock(context.expected.covariance), "expected", { dashed: true, label: "expected compound 2σ" }));
        if (context.actual && isTransform(context.actual.transform) && isMatrix3(context.actual.covariance)) out.push(ellipse(context.actual.transform, xyBlock(context.actual.covariance), resultStyle(context), { label: resultLabel(context) }));
      } else if (view === "mahalanobis") {
        [1, 2, 3].forEach((k) => out.push(ellipse(origin, S_GATE, "muted", { scale: k, label: k + "σ" })));
        out.push(point(values.point, "innovation", "input"), arrow(origin, values.point, "input", { weight: 1.5 }));
        if (typeof context.expected === "number") out.push(label("expected d² = " + fmt(context.expected), "expected", { at: add(values.point, { x: 0.15, y: 0.3 }) }));
        if (typeof context.actual === "number" && Number.isFinite(context.actual)) out.push(label(resultLabel(context) + " d² = " + fmt(context.actual), resultStyle(context), { at: add(values.point, { x: 0.15, y: -0.35 }) }));
      } else if (view === "ellipse") {
        out.push(ellipse(origin, estimationScene.fixtures.ellipseCovariance(values), "input", { scale: 1, label: "1σ ellipse from the sliders" }));
        const axes = (result, style, dashed, text) => {
          out.push(arrow(origin, direction(result.angle, result.major), style, { dashed, weight: dashed ? 2 : 3 }));
          out.push(arrow(origin, direction(result.angle + Math.PI / 2, result.minor), style, { dashed, weight: dashed ? 2 : 3 }));
          out.push(label(text, style, { at: add(direction(result.angle, result.major), { x: 0.15, y: 0.2 }) }));
        };
        if (context.expected && Number.isFinite(context.expected.angle)) axes(context.expected, "expected", true, "expected axes");
        if (context.actual && Number.isFinite(context.actual.angle)) axes(context.actual, resultStyle(context), false, resultLabel(context));
      } else if (view === "ekf-update" || view === "ekf-step") {
        const state = values.state;
        const prior = view === "ekf-step" ? P_PRIOR : P_UPDATE;
        out.push(glyph(state, view === "ekf-step" ? "state before" : "prior state", "input"), ellipse(state, xyBlock(prior), "muted", { label: "prior 2σ" }), point(values.z, "measurement z", "input"), ellipse(values.z, R_UPDATE, "input", { label: "R 2σ" }));
        if (view === "ekf-step") {
          const predicted = stepMotion(state, values.v, values.omega, 1);
          out.push(arrow(state, predicted, "muted", { dashed: true, weight: 1 }), glyph(predicted, "predicted", "muted", { dashed: true }));
        }
        if (isState(context.expected)) out.push(glyph(context.expected.state, "expected posterior", "expected", { dashed: true }), ellipse(context.expected.state, xyBlock(context.expected.P), "expected", { dashed: true }));
        if (isState(context.actual)) out.push(glyph(context.actual.state, resultLabel(context), resultStyle(context)), ellipse(context.actual.state, xyBlock(context.actual.P), resultStyle(context)));
      } else if (view === "particles") {
        out.push(point(values.z, "measurement z", "input"), ellipse(values.z, [[values.sigma * values.sigma, 0], [0, values.sigma * values.sigma]], "input", { scale: 1, label: "σ" }));
        const sized = (weights, style, base, gain) => { if (!Array.isArray(weights)) return; weights.forEach((w, i) => { if (PARTICLES[i] && Number.isFinite(w)) out.push(pointsPrimitive([PARTICLES[i]], style, { size: base + gain * w })); }); };
        sized(context.expected, "expected", 4, 40);
        sized(context.actual, resultStyle(context), 2, 28);
        out.push(pointsPrimitive(PARTICLES, "muted", { size: 3, label: "particles" }));
      } else if (view === "resample") {
        RESAMPLE_WEIGHTS.forEach((w, i) => out.push(pointsPrimitive([RESAMPLE_PARTICLES[i]], "muted", { size: 4 + 40 * w })));
        out.push(label("weights " + RESAMPLE_WEIGHTS.map(fmt).join(" · ") + " · u0 = " + fmt(values.u0), "muted", { row: 3 }));
        const counts = (list) => { const map = new Map(); (list || []).forEach((p) => { const key = fmt(p.x) + "," + fmt(p.y); map.set(key, (map.get(key) || 0) + 1); }); return map; };
        if (isCloud(context.expected)) { const c = counts(context.expected); RESAMPLE_PARTICLES.forEach((p) => { const n = c.get(fmt(p.x) + "," + fmt(p.y)) || 0; if (n) out.push(label("×" + n, "expected", { at: add(p, { x: 0.12, y: 0.3 }) })); }); }
        if (isCloud(context.actual)) { const c = counts(context.actual); RESAMPLE_PARTICLES.forEach((p) => { const n = c.get(fmt(p.x) + "," + fmt(p.y)) || 0; if (n) out.push(label("×" + n, resultStyle(context), { at: add(p, { x: 0.12, y: -0.4 }) })); }); }
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
```

5. Add to the `SCENES` literal after `"aisle": aisleScene,`:

```js
    "estimation": estimationScene,
```

- [ ] **Step 6: Update the README**

In `README.md`, insert directly after the line `Each puzzle links the matching demo under \`p5sim/navigation\`.`:

```markdown

Track 5 (Uncertainty & Estimation) adds puzzles 76 to 87, unlocked by the map → odom capstone, and follows PythonRobotics' localization examples:

19. Kinematics: diffDriveTwist, integrateGyro, twistInSensorFrame (with the lever arm).
20. Uncertainty: predictCovariance (F P Fᵀ + Q), composeUncertain, mahalanobisDistance, covarianceEllipse.
21. Estimation: ekfPredict, ekfUpdatePosition, particleWeights, resampleLowVariance, ekfLocalizeStep.
```

- [ ] **Step 7: Run every check**

Run: `node p5sim/tf2_walkthrough/tests.js` and `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `21/21 tests passed` and `65/65 puzzle tests passed`.

Then serve `p5sim` and confirm the lab shows "87 geometry builds" and five tracks, renders every Track 5 scene, and shows no console errors.

- [ ] **Step 8: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzles.js p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-tests.js p5sim/tf2_walkthrough/README.md
git commit -m "feat: add Track 5 uncertainty and estimation with kinematics, covariance, EKF, and particle filter bricks

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014bGFMz54uBLRNsi4hos8KD"
```
