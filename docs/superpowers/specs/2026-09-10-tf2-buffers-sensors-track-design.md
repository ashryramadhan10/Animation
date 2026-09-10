# TF2 Buffers & Sensors Track Design

## Purpose

Add a third puzzle track that teaches the parts of TF2 practice the first two tracks leave out: the remaining rotation conversions, how static sensor mounts are specified, velocity from poses, lidar de-skewing, and above all the *buffer* semantics that separate static from dynamic transforms: latching, bounded history, arrival latency, reparenting, and a lookup that respects all of them.

Track 1 (TF2) and Track 2 (Transform Toolkit) are unchanged. Pose Correction moves from Track 3 to Track 4 and unlocks after this track's buffer-lookup finale.

## Conventions

Track 1 and Track 2 conventions hold. Additions:

- A **buffer** is `{ duration, edges }` where `edges[child] = { isStatic, samples }` and every sample is `{ time, parent, transform }`. A static edge holds exactly one latched sample that answers any time and is replaced when republished. A dynamic edge keeps samples sorted by time and prunes any sample older than `newest − duration`.
- A sample's parent may change over time (reparenting). Interpolating between two samples with different parents is an error, as in tf2's `TimeCache`.
- Arrival samples are `{ time, arrival }`: `time` is the stamp, `arrival` the wall-clock moment the buffer received it.
- URDF origins are `xyz = [x, y, z]` metres and `rpy = [roll, pitch, yaw]` radians.
- A body-frame twist is `{ vx, vy, wz }`.

## Tracks

1. Track 1 · TF2, puzzles 1 to 27.
2. Track 2 · Transform Toolkit, puzzles 28 to 51.
3. **Track 3 · Buffers & Sensors**, puzzles 52 to 63, `track: "advanced"`, unlocked by `icp-match`.
4. Track 4 · Pose Correction, placeholder, unlocked by `buffer-lookup`.

## Curriculum, Track 3

### Stage 13, Conversions

52. `rotation-matrix-from-quaternion` — `rotationMatrixFromQuaternion(q) → 3×3`, normalizing first. Scene `se3` view `rpy` (matrix outputs are drawn as the basis their columns describe). Reference tf2 `Matrix3x3::setRotation`. Diagnoses: `transposed`, `not-normalized`.
53. `quaternion-from-rotation-matrix` — `quaternionFromRotationMatrix(m) → quaternion` by the trace/largest-diagonal (Shepperd) method. Comparator `quaternion`. Scene `se3` view `rpy` with the matrix built from the sliders. Reference tf2 `Matrix3x3::getRotation`. Diagnoses: `trace-only` (fails at 180°), `conjugated`.
54. `quaternion-from-axis-angle` — `quaternionFromAxisAngle(axis, angle) → quaternion` with the axis normalized and half angles. Scene `se3` view `axis-angle` (axis yaw and pitch sliders, angle slider). Reference tf2 `Quaternion::setRotation`. Diagnoses: `full-angle`, `axis-not-normalized`.
55. `axis-angle-from-quaternion` — `axisAngleFromQuaternion(q) → { axis, angle }` with `angle ∈ [0, π]` (negate q when w < 0) and axis `(0, 0, 1)` for the identity. Comparator `deep`. Scene `se3` view `axis-angle`. Reference tf2 `Quaternion::getAxis` / `getAngle`. Diagnoses: `no-flip`, `axis-unnormalized`.

### Stage 14, Sensors & Motion

56. `static-from-urdf` — `staticFromUrdf(xyz, rpy) → { translation, rotation }` using `quaternionFromRPY`. Depends on `quaternion-from-rpy`. Scene `se3` view `urdf`. Reference ROS URDF `<origin xyz rpy>`. Diagnoses: `degrees-assumed`, `rpy-order-swapped`.
57. `twist-from-poses` — `twistFromPoses(a, b, dt) → { vx, vy, wz }` in a's body frame: `relativeTransform(a, b)` divided by `dt`. Depends on `relative-transform`. Scene `twist` (two poses, dt slider; the velocity is drawn from a). Reference `nav_msgs/Odometry` twist semantics. Diagnoses: `world-frame-delta`, `no-dt`.
58. `deskew-scan` — `deskewScan(points, times, samples, endTime) → points`: each point measured at `times[i]` in the sensor frame is re-expressed in the sensor frame at `endTime` through `compose(invert(pose(endTime)), pose(times[i]))`, with poses interpolated from `samples`. Depends on `sample-edge`, `compose`, `invert`, `transform-point`. Scene `deskew` (drag the end pose; the raw scan of a straight wall bends, the de-skewed one is straight). Reference `laser_geometry::LaserProjection::transformLaserScanToPointCloud`. Diagnoses: `no-interpolation`, `inverse-direction`.

### Stage 15, Buffer Semantics

59. `insert-transform` — `insertTransform(buffer, sample, isStatic) → newBuffer`, pure. Static: latch a single sample, replacing the edge. Dynamic: append, sort by time, prune older than `newest − duration`. Scene `buffer` view `insert` (time cursor and a static/dynamic selector; lanes per edge show kept, added, and pruned samples). Reference tf2 `BufferCore::setTransform` and `TimeCache::pruneList`. Diagnoses: `no-pruning`, `static-appended`.
60. `parent-at` — `parentAt(buffer, child, time) → parent | null`: static returns its parent; dynamic brackets the samples and returns the shared parent, the exact sample's parent when the bracket amount is 0, and `null` when the bracket spans a parent change; `null` for an unknown child. Depends on `bracket-samples`. Scene `buffer` view `parents` (a child whose parent switches from odom to map at t = 6). Reference tf2 `TimeCache::getParent`. Diagnoses: `latest-only`, `ignores-change`.
61. `buffer-can-transform` — `canTransform(buffer, target, source, time) → { ok } | { ok: false, code }` with codes `DISCONNECTED`, `PAST_EXTRAPOLATION`, `FUTURE_EXTRAPOLATION`, `PARENT_CHANGE`; only edges on the path are checked, static edges always pass. Depends on `parent-at`, `directed-path`. Scene `buffer` view `can` (time cursor, target and source selectors; path lanes highlighted). Reference tf2 `Buffer::canTransform`. Diagnoses: `static-ranged`, `whole-buffer-range`.
62. `wait-for-transform` — `waitForTransform(samples, stamp) → wallTime | null`: the earliest wall time at which a lookup at `stamp` is answerable, the later arrival of the two bracketing samples; `null` when no bracket exists. Depends on `bracket-samples`. Scene `buffer` view `wait` (stamp lane and arrival lane joined by segments). Reference tf2 `Buffer::canTransform(…, timeout)` / `waitForTransform`. Diagnoses: `before-only`, `stamp-not-arrival`.
63. `buffer-lookup` — `bufferLookup(buffer, target, source, time) → { ok: true, transform } | availability error`: `canTransform`, then sample every edge at `time` (static: its latched transform; dynamic: `sampleEdge`), assign parents with `parentAt` (falling back to the latest parent for off-path edges), `storeEdge` into a tree, `lookupTransform`. Depends on `buffer-can-transform`, `parent-at`, `sample-edge`, `store-edge`, `lookup-transform`. Scene `buffer` view `lookup` (the chain drawn at the cursor time; the answer frame must land on the source frame). Reference tf2 `BufferCore::lookupTransform`. Diagnoses: `skips-availability`.

## Scenes

- `se3` gains view `axis-angle` (fixtures `axisFromSliders`, `angle`, `quatFromAxisAngle`) and view `urdf` (fixtures `urdfXyz`, `rpyArray`); the `rpy` view also draws 3×3 matrix results as the basis of their columns, and `urdf` draws SE(3) results as axes at their translation.
- `twist` — handles a, b (poses), dt (slider); draws both poses, the relative arrow, and the velocity arrow and turn-rate arc from a.
- `deskew` — handle `end` (pose); fixtures: a straight wall of 12 points at x = 3 in odom, twelve evenly spaced times in [0, 1], sensor samples from the origin pose at t = 0 to `end` at t = 1, and the raw scan expressed in the sensor frame at each point's time. Draws the true wall, the raw scan re-drawn in the end frame (bent), and expected/learner de-skewed points.
- `buffer` — views `insert`, `parents`, `can`, `wait`, `lookup`. Fixtures: a three-edge buffer (map→odom dynamic, odom→base_link dynamic, base_link→laser static), a reparenting buffer, arrival samples, and the inserted sample built from the cursor. Draws one lane per edge with sample ticks, cursors, path highlights, and, for `lookup`, the chain sampled at the cursor time with the answer frame.

## Catalog, Engine, and Lab Changes

- `puzzles.js`: `ADVANCED_STAGES`, a stage list per track in `puzzle()`, `TRACKS` with four entries, arrays `ADVANCED_13` to `ADVANCED_15`.
- `puzzle-engine.js`: `validateCatalog` requires a reference on every non-tf2 puzzle.
- No lab or renderer changes: all primitives already exist.

## Verification

Node tests: ids 52 to 63 in order, references present, every reference passes its cases, every diagnosis differs, every new scene kind and view builds arguments the reference accepts and finite layers, tracks `[tf2, toolkit, advanced, pose-correction]` with the right unlock chain, and a de-skew round trip (the reference straightens the bent scan to the wall in the end frame within 1e-6). Headless browser render of the lab and of every Track 3 scene.

## Non-Goals

- Track 4 puzzle content.
- 3D de-skewing, IMU integration, or covariance in the buffer.
- Changing existing tracks.
