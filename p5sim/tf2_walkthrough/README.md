# TF2, Drawn as a Tree

An interactive p5.js walkthrough of the ROS 2 TF2 mental model. It starts with the familiar p5 matrix stack, builds a time-aware 2D transform tree, applies it to the standard mobile-robot frame chain, and finishes with a 3D quaternion chapter.

## Run

Serve the `p5sim` folder so the local p5 library and Puzzle Lab worker can load:

```powershell
cd p5sim
python -m http.server 4173 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:4173/tf2_walkthrough/
```

The walkthrough can be opened directly in most browsers. The Puzzle Lab should use the Python server because learner code runs in a Web Worker.

## Puzzle Lab

Open `puzzle-lab.html` from the walkthrough header. The lab is NANDgame-style: every puzzle is one small JavaScript function, and later puzzles reuse the functions you already solved.

Track 1 (TF2) contains 27 puzzles in seven stages:

1. Rotation bricks: headingVector, headingOf, wrapAngle, rotateVector, yawDelta.
2. Frames (SE(2)): transformPoint, transformVector, transformPose, compose, invert, relativeTransform.
3. Tree: storeEdge, ancestorChain, commonAncestor, directedPath, validateTree.
4. Lookup and robot frames: lookupTransform, laserPointToMap, correctionFromPose (the `map -> odom` hand-off).
5. Time: interpolateTransform, bracketSamples, latestCommonTime, sampleEdge.
6. SE(3): quaternionMultiply, rotateByQuaternion, composeSE3.
7. Capstone: lookupStampedTransform.

Track 2 (Transform Toolkit) adds puzzles 28 to 51, unlocked by the capstone, and is the transformation math around TF2 that Track 1 leaves out:

8. Matrix form: rotMat2d, homogeneousFromPose, matMul3, applyHomogeneous, poseFromHomogeneous, invertHomogeneous.
9. 3D orientation: quaternionFromRPY, yawFromQuaternion, rpyFromQuaternion, slerpQuaternion, transformPoint3D, invertSE3, opticalToBody.
10. Motion and uncertainty: integrateMotion, deadReckon, rotateCovariance.
11. Time travel: lookupAcrossTime.
12. Rigid alignment: centroid, crossCovariance, alignmentYaw, rigidTransformFromPairs, nearestNeighbors, icpStep, icpMatch.

Every toolkit puzzle links the PythonRobotics file and function it mirrors (a local copy lives under `references/PythonRobotics`) or the ROS REP / tf2 document for tf2-only material. Two deliberate differences from PythonRobotics: nearestNeighbors sums nearest distances rather than index-order residuals, and icpMatch accumulates by left-multiplication.

Track 3 (Buffers & Sensors) adds puzzles 52 to 63, unlocked by the ICP finale:

13. Conversions: rotationMatrixFromQuaternion, quaternionFromRotationMatrix, quaternionFromAxisAngle, axisAngleFromQuaternion.
14. Sensors and motion: staticFromUrdf, twistFromPoses, deskewScan.
15. Buffer semantics: insertTransform (latch versus sliding window), parentAt (reparenting), canTransform, waitForTransform (arrival latency), bufferLookup.

Stage 15 is where the static-versus-dynamic difference actually lives: a static edge is one latched sample that answers any time, a dynamic edge is a pruned history that only answers inside its range, and only the dynamic edges on the lookup path constrain it.

Track 4 (Pose Correction) adds puzzles 64 to 83, unlocked by the buffer finale, and is the vision pose corrector from `p5sim/navigation` (the JavaScript twin of `warehouse_pose_corrector_vision_based`) rebuilt brick by brick:

16. Point-cloud bricks: pointsToOdom, fitLine (total least squares), signedLineDistance, headingFromLine.
17. Rack filters: refitInliers, faceFilter, smoothLine, consensusHeading.
18. Aisle correction: centerlineFromRacks, centerlineFromOneRack, correctedPoseFromCenterline (shift odom by the centerline offset c along the normal, the same shift the laser node applies from its intercept), aisleCorrectionStep, which produces the `map -> odom` transform that keeps `odom -> base_link` untouched.
19. Vision node: isBeamReliableForHeading (the heading gate), selectConsensusHeading (the 3° outlier gate), rateLimitHeading, blendAisleState (heading blended on the circle), computeDualCenterline (normals and half-width checks), lowPassStepLimit, lateralJumpGuard (LateralDriftFilter on c: hold, confirm, ease in), visionCorrectionTransform (map → odom = delta rotated by −heading; corrected_pose.y is the drone's real distance from the middle).

Each puzzle links the navigation page that animates the same step and names the module function it mirrors (`scripts/<module>.js · <function>`). Stage 18's old "pull the pose toward the centerline by gain × distance" brick was replaced on 2026-09-14 when the node moved to the line-based shift; that pull is now the puzzle's first diagnosis.

Track 5 (Uncertainty & Estimation) adds puzzles 84 to 95, unlocked by the vision correction transform, and follows PythonRobotics' localization examples:

19. Kinematics: diffDriveTwist, integrateGyro, twistInSensorFrame (with the lever arm).
20. Uncertainty: predictCovariance (F P Fᵀ + Q), composeUncertain, mahalanobisDistance, covarianceEllipse.
21. Estimation: ekfPredict, ekfUpdatePosition, particleWeights, resampleLowVariance, ekfLocalizeStep.

Track 6 (Bayesian Filters) adds puzzles 96 to 110, unlocked by the EKF localization step, and follows *Kalman and Bayesian Filters in Python* (`references/Kalman-and-Bayesian-Filters-in-Python-master`) chapter by chapter:

22. Scalar filters: ghFilterStep, discretePredict, discreteUpdate, gaussianMultiply, kalman1dStep.
23. Multivariate Kalman: matMul2, matInv2, constantVelocityModel, kfPredict, kfUpdate, kalmanTrackStep (the dog tracker).
24. Nonlinear and smoothing: sigmaPoints, unscentedTransform, unscentedPolarToCartesian, rtsSmootherStep.

Track 5's covariance, EKF, and particle puzzles carry an "Also read" link into the book's matching chapter.

Every puzzle has a live scene. Drag frame origins, rotation grips, points, dials, sliders, and timeline cursors; your function runs on every change and the canvas draws your result in red next to the dashed reference until they match and turn green. Known mistakes such as a mirrored rotation, a reversed composition, or translate-before-rotate are named in the feedback panel. `Run` re-evaluates the current input; `Check` runs the hidden cases and unlocks the next puzzle.

Puzzle code is plain JavaScript, but the p5 math vocabulary is available: `PI`, `TWO_PI`, `HALF_PI`, `sin`, `cos`, `atan2`, `sqrt`, `dist`, `radians`, `degrees`, `lerp`, `map`, `constrain`, and friends. Drawing and vector helpers such as `createVector` or `push` are not, because results must be plain `{ x, y }` objects. The editor colours syntax, indents on Enter, and handles Tab and Shift+Tab.

Learner code runs in a persistent Web Worker. A function that does not finish within 250 ms (750 ms for Check) is stopped and the worker restarts; the page never freezes. This is a reliability boundary, not a security sandbox.

Progress, drafts, hints, and solved component source are stored only in the browser under `tf2-puzzle-lab:v2`. Reset Code shows which dependent components would be invalidated. Reset all progress removes only this record.

Puzzle Lab keyboard controls:

- Ctrl+Enter: run now on the current inputs.
- Ctrl+Shift+Enter: check the full behavior.
- Alt+Left / Alt+Right: move between unlocked puzzles.
- Escape: dismiss transient detail.

## Side Lab

`side-lab.html` is a second lab that shares the engine, scenes, editor, and worker but keeps its own progress. It rebuilds the core of the `agents`, `force`, `scalar_projection`, `procedural_animation`, and `random_distribution` sketches as 32 puzzles in six stages: vectors, forces, steering, flocking, procedural chains, and randomness. Every puzzle links its Nature of Code chapter and opens the sketch file it came from. It is open from the start and does not depend on the TF2 tracks.

## Algo Lab

`algo-lab.html` is a judge-style lab for the first six sections of the CSES Problem Set: Introductory, Sorting and Searching, Dynamic Programming, Graph Algorithms, Range Queries, and Tree Algorithms, Every section is open from the start; inside a section the puzzles unlock in order, so you can move between sections the way you do on the site. Each puzzle links its section of the free *Competitive Programmer's Handbook* and its CSES task. Besides the small preset inputs in the scene, Check runs hidden cases of CSES size under a four-second budget, so a solution with the wrong complexity fails with "did not finish", the same lesson the real judge teaches. Heap and segment-tree bricks are updated in place; later puzzles reuse them.

## Learning Route

The thirteen chapters cover:

1. p5 `push()`/`pop()` and local coordinate frames.
2. Frame, transform, point, vector, pose, and stamped-data distinctions.
3. `T_target_source`, composition order, and inverse transforms.
4. Roots, parents, children, branches, common ancestors, cycles, and disconnected trees.
5. `map -> odom -> base_link -> laser/camera`.
6. Globally corrected `map` versus smooth but drifting `odom`.
7. Static and dynamic broadcasters and edge authority.
8. Source/target lookup direction.
9. PointStamped, Vector3Stamped, PoseStamped, and `doTransform`.
10. Timestamp history, interpolation, latest common time, and extrapolation errors.
11. A complete laser observation transformed into `map`.
12. XYZ translation and quaternion orientation in 3D.
13. A free lookup and time-scrubbing sandbox.

## Controls

- Back/Next or Left/Right Arrow: change chapter.
- Space: pause or play the animation.
- R: reset the current chapter.
- Mouse drag: move the demonstration frame in early 2D chapters.
- Mouse drag in the SE(3) chapter: orbit the 3D camera.
- Source/Target selectors: change lookup direction.
- Query-time slider: inspect interpolation and extrapolation.

## Read the Code

Suggested order:

1. `transform2d.js` — immutable SE(2) math.
2. `transform-tree.js` — topology, buffering, lookup, and typed errors.
3. `chapters.js` — the teaching sequence and ROS 2 parallels.
4. `sketch.js` — p5 rendering and interaction.
5. `transform3d.js` — normalized quaternion and SE(3) bridge.

Every edge stores `T_parent_child`, the transform that converts child-frame coordinates into its parent. A lookup returns `T_target_source`.

## Model Checks

Run the dependency-free checks with:

```powershell
node p5sim/tf2_walkthrough/tests.js
node p5sim/tf2_walkthrough/puzzle-tests.js
```

The same checks can be viewed in a browser at `tests.html`.
