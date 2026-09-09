# TF2 Transform Toolkit Track Design

## Purpose

Add a second puzzle track to the p5.js TF2 Puzzle Lab that teaches the transformation math a ROS 2 engineer uses around TF2 but that Track 1 does not cover: homogeneous matrices, roll/pitch/yaw and quaternion conversions, slerp, full SE(3) application and inversion, the camera optical-frame convention, odometry integration, covariance rotation, time-travel lookups, and rigid alignment of point clouds (ICP). Every puzzle mirrors a PythonRobotics function or a ROS REP/tf2 document and links to it.

Track 1 (TF2, 27 puzzles) is unchanged. The Pose Correction track moves from Track 2 to Track 3 and unlocks after this track's ICP finale.

## Learning Principles

Same as Track 1: one small function per puzzle, live draggable scenes, dashed reference versus red/green learner result, named mistake diagnoses, solved units reused by later puzzles, behavior-only checking. Two additions:

- Every puzzle shows a reference link to the PythonRobotics file and function it mirrors (GitHub URL, local path displayed), or to the ROS document for tf2-only material.
- Matrix and quaternion outputs are always drawn as the frame they encode, never only as numbers, so a wrong multiplication order is visible as a misplaced frame.

## Conventions

- Track 1 conventions hold: `{ x, y, yaw }` transforms mean `T_target_source`; `compose(a, b)` applies `b` first; angles are radians.
- A 2×2 rotation matrix is `[[c, -s], [s, c]]` as nested arrays, row-major. A 3×3 homogeneous matrix is `[[c, -s, x], [s, c, y], [0, 0, 1]]`. Points multiply as column vectors `[x, y, 1]`.
- 3D vectors are `{ x, y, z }`; quaternions are `{ x, y, z, w }`; an SE(3) transform is `{ translation, rotation }`. `q` and `-q` are the same rotation.
- Roll, pitch, yaw follow tf2 `setRPY`: `q = qz(yaw) ⊗ qy(pitch) ⊗ qx(roll)` (intrinsic Z-Y-X).
- Body frame axes follow REP-103: x forward, y left, z up. The camera optical frame has z forward, x right, y down.
- Rigid alignment uses the PythonRobotics convention `previous ≈ R · current + t`: the recovered transform maps the current cloud onto the previous cloud.
- PythonRobotics upstream: `https://github.com/AtsushiSakai/PythonRobotics` (local copy under `references/PythonRobotics`).

## Tracks

The catalog exposes three tracks:

1. **Track 1 · TF2** — unchanged, puzzles 1 to 27.
2. **Track 2 · Transform Toolkit** — this design, puzzles 28 to 51, `track: "toolkit"`, unlocked when `stamped-lookup` is solved.
3. **Track 3 · Pose Correction** — placeholder stages only (as today), unlocked when `icp-match` is solved.

Puzzle numbering and sequential unlocking continue across the concatenated catalog, so finishing puzzle 27 unlocks puzzle 28 with no new engine rule.

## Curriculum, Track 2

Each entry: id — `signature`; dependencies; scene kind and view; reference; diagnoses.

### Stage 8, Matrix Form

28. `rot-mat-2d` — `rotMat2d(yaw) → [[c, -s], [s, c]]`. Scene `matrix` view `rotation` (dial; the matrix columns are drawn as axes). Reference `utils/angle.py · rot_mat_2d`. Diagnoses: `transposed` (`[[c, s], [-s, c]]`).
29. `homogeneous-from-pose` — `homogeneousFromPose(transform) → 3×3`. Depends on `rot-mat-2d`. Scene `matrix` view `pose` (frame handle). Reference `SLAM/ICPMatching/icp_matching.py · update_homogeneous_matrix`. Diagnoses: `translation-in-last-row`.
30. `mat-mul-3` — `matMul3(a, b) → 3×3`. Scene `matrix` view `chain` (frame b in a, frame c in b; matrices built by fixtures). Reference `icp_matching.py · update_homogeneous_matrix`. Diagnoses: `reversed-order`, `element-wise` (Hadamard product).
31. `apply-homogeneous` — `applyHomogeneous(matrix, point) → point`. Scene `matrix` view `point` (frame handle plus point in it). Reference `icp_matching.py · icp_matching` (`Rt @ current_points + Tt`). Diagnoses: `rotation-ignored`, `homogeneous-coordinate-dropped` (uses `[x, y, 0]`).
32. `pose-from-homogeneous` — `poseFromHomogeneous(matrix) → { x, y, yaw }` with `yaw = atan2(m[1][0], m[0][0])`. Scene `matrix` view `readback` (frame handle). Reference `utils/angle.py · angle_mod`. Diagnoses: `acos-yaw` (`acos(m[0][0])` loses the sign), `atan2-swapped`.
33. `invert-homogeneous` — `invertHomogeneous(matrix) → 3×3` using `Rᵀ` and `-Rᵀ t`. No dependencies. Scene `matrix` view `inverse` (frame handle; `M · yours` must land on identity). Reference `icp_matching.py`. Diagnoses: `negated-only`, `transpose-whole-matrix`.

### Stage 9, 3D Orientation

34. `quaternion-from-rpy` — `quaternionFromRPY(roll, pitch, yaw) → quaternion`. Depends on `quaternion-multiply`. Scene `se3` view `rpy` (three sliders; the resulting basis is drawn). Reference tf2 `Quaternion::setRPY` (docs.ros.org). Diagnoses: `xyz-order` (`qx ⊗ qy ⊗ qz`), `half-angle-missing`.
35. `yaw-from-quaternion` — `yawFromQuaternion(q) → radians`, `atan2(2(wz + xy), 1 − 2(y² + z²))`. Comparator `angle`. Scene `se3` view `rpy` with roll and pitch sliders enabled so the shortcut fails. Reference tf2 `getYaw`. Diagnoses: `pure-yaw-shortcut` (`2·atan2(z, w)`).
36. `rpy-from-quaternion` — `rpyFromQuaternion(q) → { roll, pitch, yaw }` with `pitch = asin(clamp(2(wy − zx), −1, 1))`. Comparator `angles`. Depends on `yaw-from-quaternion`. Scene `se3` view `rpy`. Reference tf2 `Matrix3x3::getRPY`. Diagnoses: `roll-yaw-swapped`.
37. `slerp-quaternion` — `slerpQuaternion(a, b, amount) → quaternion` with the shortest-path sign flip and a normalized-lerp fallback when the dot product exceeds 0.9995. Comparator `quaternion`. Scene `se3` view `slerp` (yaw sliders for a and b, amount slider). Reference tf2 `Quaternion::slerp`. Diagnoses: `component-lerp`, `long-way` (no sign flip).
38. `transform-point-3d` — `transformPoint3D(aFromB, point) → vector3`. Depends on `rotate-by-quaternion`. Scene `se3` view `point3d` (yaw and pitch sliders, fixed point). Reference tf2 `doTransform(PointStamped)`. Diagnoses: `translate-then-rotate`.
39. `invert-se3` — `invertSE3(aFromB) → bFromA` with conjugate rotation and `rotate(conj, −t)`. Depends on `rotate-by-quaternion`. Scene `se3` view `inverse` (`aFromB ∘ yours` must land on the world axes). Reference tf2 `Transform::inverse`. Diagnoses: `negated-only`, `rotation-not-inverted`.
40. `optical-to-body` — `opticalToBody(vectorInOptical) → vectorInBody` with `body = { x: v.z, y: −v.x, z: −v.y }`. Scene `se3` view `optical` (fixed body and optical axes; two sliders set the direction of the input ray). Reference REP-103 (ros.org/reps/rep-0103). Diagnoses: `axes-swapped-only` (no sign flips), `body-to-optical` (inverse mapping).

### Stage 10, Motion and Uncertainty

41. `integrate-motion` — `integrateMotion(pose, v, omega, dt) → pose` with `x += v·dt·cos(yaw)`, `y += v·dt·sin(yaw)`, `yaw = wrapAngle(yaw + omega·dt)`. Depends on `wrap-angle`. Scene `motion` (pose handle, sliders v, ω, dt; the predicted pose and arc are drawn). Reference `Localization/extended_kalman_filter/extended_kalman_filter.py · motion_model`. Diagnoses: `yaw-updated-first` (uses the new yaw for the translation), `omega-ignored`.
42. `dead-reckon` — `deadReckon(start, commands) → pose` folding `integrateMotion` over `[{ v, omega, dt }]`. Depends on `integrate-motion`. Scene `motion-trail` (start pose handle, fixed command list; the trail and the end pose are drawn). Reference same file (`xDR` dead-reckoning trace). Diagnoses: `commands-reversed`.
43. `rotate-covariance` — `rotateCovariance(cov, yaw) → 2×2` as `R Σ Rᵀ`. Depends on `rot-mat-2d`. Comparator `deep`. Scene `covariance` (dial; the ellipse of Σ is drawn before and after). Reference `extended_kalman_filter.py · ekf_estimation` (`jF @ PEst @ jF.T`). Diagnoses: `no-transpose` (`R Σ R`), `unchanged`.

### Stage 11, Time Travel

44. `lookup-across-time` — `lookupAcrossTime(edges, target, targetTime, source, sourceTime, fixedFrame) → result` as `compose(lookup(target, fixed, targetTime).transform, lookup(fixed, source, sourceTime).transform)`, returning the first availability error if either lookup fails. Depends on `stamped-lookup`, `compose`. Comparator `deep`, tolerance 1e-6. Scene `robot-chain-time` view `across-time` (two timeline cursors, target/source selectors, fixed frame `map`). Reference tf2 `Buffer::lookupTransform` advanced API (docs.ros.org). Diagnoses: `single-time` (both ends at `targetTime`), `reversed-composition`.

### Stage 12, Rigid Alignment

45. `centroid` — `centroid(points) → { x, y }`. Scene `cloud-align` view `centroid`. Reference `icp_matching.py · svd_motion_estimation` (`np.mean`). Diagnoses: none (structural comparator).
46. `cross-covariance` — `crossCovariance(previous, current) → 2×2` as `Σ (c − cm)(p − pm)ᵀ` (PythonRobotics `W = c_shift @ p_shift.T`). Depends on `centroid`. Scene `cloud-align` view `covariance`. Diagnoses: `not-centered`, `transposed` (`p' c'ᵀ`).
47. `alignment-yaw` — `alignmentYaw(W) → radians` as `atan2(W[0][1] − W[1][0], W[0][0] + W[1][1])`, the closed-form 2D Kabsch rotation. Comparator `angle`. Scene `cloud-align` view `yaw`. Reference `svd_motion_estimation` (`R = (u @ vh).T`), with a note that 2D needs no SVD. Diagnoses: `sign-flipped` (`atan2(W[1][0] − W[0][1], …)`).
48. `rigid-transform-from-pairs` — `rigidTransformFromPairs(previous, current) → { x, y, yaw }` with `t = pm − R·cm`. Depends on `centroid`, `cross-covariance`, `alignment-yaw`, `rotate-vector`. Comparator `se2`. Scene `cloud-align` view `rigid` (drag the true motion frame; the current cloud is what a moved sensor sees; the recovered frame must land on the handle). Reference `svd_motion_estimation`. Diagnoses: `translation-unrotated` (`pm − cm`), `reversed` (maps previous onto current).
49. `nearest-neighbors` — `nearestNeighbors(previous, current) → { indexes, error }` where `indexes[i]` is the index of the previous point nearest to `current[i]` and `error` is the sum of those nearest distances. Comparator `deep`. Scene `cloud-align` view `neighbors` (correspondence segments drawn). Reference `icp_matching.py · nearest_neighbor_association`, noting that PythonRobotics sums residuals by index order while this puzzle sums nearest distances. Diagnoses: `reversed-roles` (nearest current point for each previous point).
50. `icp-step` — `icpStep(previous, current) → { transform, moved, error }`: associate, estimate the rigid transform on the paired points, apply it to `current`. Depends on `nearest-neighbors`, `rigid-transform-from-pairs`, `transform-point`. Comparator `deep`, tolerance 1e-6. Scene `cloud-align` view `step`. Reference `icp_matching.py · icp_matching` (loop body). Diagnoses: `unpaired-estimate` (estimates on unmatched order).
51. `icp-match` — `icpMatch(previous, current, options) → { transform, error }` with `options = { maxIterations, eps }` (the iteration count is not part of the checked result, so a correct ICP with a slightly different stopping rule still passes); repeats `icpStep`, accumulates `H = compose(step.transform, H)` (left-multiplication, which is the correct accumulation; the spec notes that PythonRobotics right-multiplies), stops when the error decrease is below `eps`, the error increases, or `maxIterations` is reached. Depends on `icp-step`, `compose`. Comparator `deep`, tolerance 1e-3. Scene `cloud-align` view `icp` (iteration count and residual shown; the recovered frame must land on the dragged motion handle). Reference `icp_matching.py · icp_matching`. Diagnoses: `right-multiplied` accumulation.

### Scaffolding

- Starter code is the signature plus one comment for stages 8 to 10, signature only for 11 and 12.
- Three hints per puzzle as in Track 1.
- The component shelf lists Track 1 units used by Track 2 puzzles (for example `wrapAngle`, `compose`, `rotateVector`, `rotateByQuaternion`, `lookupStampedTransform`).

## Scenes and Primitives

New scene kinds in `puzzle-scenes.js`, following the existing handle → `toArgs` → `layers` pattern:

- `matrix` — views `rotation`, `pose`, `chain`, `point`, `readback`, `inverse`. Fixtures build 3×3 matrices from frame handles (`matrixOf`). Matrix outputs are converted to poses with a scene-local `poseFromMatrix` and drawn as frames; 2×2 outputs are drawn as basis axes at the origin.
- `motion` — pose handle plus sliders `v`, `omega`, `dt`; draws the predicted arc (arc primitive around the turning center when ω ≠ 0, straight segment otherwise), the expected ghost pose, and the learner pose.
- `motion-trail` — start pose handle, fixed command list fixture; draws the reference trail with the `points` primitive and the expected and learner end poses as glyphs.
- `covariance` — dial handle, fixed Σ fixture; draws the input ellipse muted and the expected/learner ellipses with the new `ellipse` primitive.
- `cloud-align` — views `centroid`, `covariance`, `yaw`, `rigid`, `neighbors`, `step`, `icp`. Fixtures: a fixed `previous` cloud of about 24 points forming an L-shaped wall; `current = applyPoint(invert(motion), previous)` for every point, with a fixed index shuffle in the `neighbors`, `step`, and `icp` views so association matters. Draws both clouds with the `points` primitive, correspondences with `segments`, and frame results as frames.
- `se3` gains views `rpy`, `slerp`, `point3d`, `inverse`, `optical` and slider sets for roll, pitch, yaw, and amount.
- `robot-chain-time` gains view `across-time` with a second timeline handle and a fixed-frame label.

New primitives in `puzzle-sketch.js`: `points` (`{ points, style, size }`), `segments` (`{ pairs: [[from, to]], style, dashed }`), `ellipse` (`{ center, covariance, style, dashed }`, drawn from the eigen decomposition of a 2×2 matrix).

## Catalog, Engine, and Lab Changes

- `puzzles.js`: append 24 puzzles with `track: "toolkit"`; add the toolkit stages; `TF2_PUZZLE_TRACKS` becomes `[tf2, toolkit (unlockAfter: "stamped-lookup"), pose-correction (unlockAfter: "icp-match")]`. Each toolkit puzzle carries `reference: { label, url }`.
- `puzzle-engine.js`: add comparator `angles` (every numeric field compared modulo 2π); `validateCatalog` accepts it and requires `reference` on toolkit puzzles. No progress schema change: Track 1 progress stays valid and `highestUnlocked` simply continues past 27.
- `puzzle-lab.js`: replace the hard-coded 27 with the catalog length; render a `Reference ↗` link next to the walkthrough link when the puzzle has one; announce any track that flips to available after a check.
- `puzzle-lab.html` / `puzzle-lab.css`: a second link in the brief; the curriculum heading reads the count from the catalog.
- `README.md`: document Track 2 and the PythonRobotics links.

## Error Handling

Unchanged from Track 1. Matrix puzzles add one structural message: an output that is not a 3×3 or 2×2 array of finite numbers reports "return a 3×3 matrix as nested arrays" from the `deep` comparator's shape check.

## Verification

Node checks appended to `puzzle-tests.js`:

- Track 2 ids in order, numbers 28 to 51, `track: "toolkit"`, backward-only dependencies, a `reference` with a label and an `https://` URL on every toolkit puzzle;
- every toolkit reference solution passes every case; every diagnosis differs from the reference on at least one case;
- the `angles` comparator accepts modulo-2π equivalents on every field;
- every new scene kind builds arguments the reference accepts from initial handles and returns finite layers for match, mismatch, and error contexts;
- the `cloud-align` fixture round-trips: `rigidTransformFromPairs(previous, current)` recovers the motion handle within 1e-6, and `icpMatch` on the shuffled cloud recovers it within 1e-3;
- track states: toolkit locked until `stamped-lookup`, pose-correction locked until `icp-match`.

Browser checks through the local server: the toolkit appears locked below Track 1; after unlocking, the matrix scenes draw frames from matrices, RPY sliders move the basis, the covariance ellipse rotates with the dial, the cloud scenes show correspondences, the ICP finale converges onto the dragged frame, reference links open the right GitHub file, and no console errors appear.

## Non-Goals

- Track 3 (Pose Correction) puzzle content; only its unlock rule moves.
- Porting PythonRobotics estimators or planners as full ladders (EKF, particle filter, pure pursuit); a possible later track.
- 3D ICP or SVD-based alignment; 2D closed form only.
- Changing Track 1 puzzles or the progress schema.

## Success Criteria

A learner who finishes Track 2 can convert between poses, homogeneous matrices, RPY, and quaternions in both directions, interpolate rotations correctly, integrate odometry and see why it drifts, rotate a covariance, move an observation across time through a fixed frame, and recover the rigid transform between two point clouds with ICP, while reading the matching PythonRobotics code alongside each puzzle.
