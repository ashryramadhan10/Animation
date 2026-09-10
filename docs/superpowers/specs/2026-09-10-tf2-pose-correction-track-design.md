# TF2 Pose Correction Track Design

## Purpose

Replace the Pose Correction placeholder with a real fourth track that builds, brick by brick, the warehouse rack-based correction pipeline from `p5sim/navigation`: rack point clouds in the laser frame, line fitting, rack-face filtering, smoothing, heading consensus, aisle centerline, corrected pose, and finally the `map -> odom` transform that a localizer publishes. The finale uses the Track 1 idea that odometry is never rewritten; the correction sits above it.

## Conventions

Track 1 to 3 conventions hold. Additions:

- A **line** is `{ a, b, c }` with `a² + b² = 1` meaning `a·x + b·y + c = 0`. `fitLine` normalizes the sign so `b > 0`, or `a > 0` when `|b| < 1e-9`. The **signed distance** of a point is `a·x + b·y + c`.
- A line's **heading** is the direction along it with a non-negative x component, computed as in `core.js`: `(dx, dy) = (−b, a)`, flipped if `dx < 0`.
- The **aisle heading** `h` has left normal `n = (−sin h, cos h)`. Rack lines are aligned so their normal points along `n`; the left rack then has a positive signed distance from the aisle center and the right rack a negative one.
- The **map** aisle is the map x-axis: centerline `y = 0`, heading `0`. The correction `mapFromOdom = { x: 0, y: c, yaw: −h }` for an observed odom-frame centerline `{ a, b, c }` with heading `h`; the along-aisle position is unobservable from racks and stays at 0.
- Beams are `{ heading, inlierCount }`. Headings of lines are ambiguous modulo π and are resolved toward a reference before averaging.
- Rack clouds are deterministic: face points every 0.5 m along the rack plus interior points 0.3 m behind the face for the filter puzzle. No random numbers.

## Tracks

1. Track 1 · TF2 (1–27), 2. Track 2 · Transform Toolkit (28–51), 3. Track 3 · Buffers & Sensors (52–63), 4. **Track 4 · Pose Correction (64–75)**, `track: "correction"`, unlocked by `buffer-lookup`. No placeholder track follows.

## Curriculum, Track 4

### Stage 16, Point-Cloud Bricks

64. `points-to-odom` — `pointsToOdom(odomFromLaser, points) → points`. Depends on `transform-point`. Scene `aisle` view `cloud` (drag the robot; the transformed cloud must land on the racks). Reference `navigation/scripts/core.js` (frame handling in `runPipeline`). Diagnoses: `rotation-ignored`.
65. `fit-line` — `fitLine(points) → { a, b, c }` by total least squares (principal axis of the covariance) with the sign rule. Scene `aisle` view `fit`. Reference `core.js · fitLine2D`. Diagnoses: `slope-intercept` (returns `{ a: slope, b: −1, c: intercept }` unnormalized), `x-only-regression` (ordinary least squares that fails on vertical lines).
66. `signed-line-distance` — `signedLineDistance(point, line) → number`. Scene `aisle` view `distance`. Reference `core.js · lineDistance`. Diagnoses: `absolute`.
67. `heading-from-line` — `headingFromLine(line) → radians`. Comparator `angle`. Scene `aisle` view `heading`. Reference `core.js · headingFromLine`. Diagnoses: `normal-not-direction`, `no-flip`.

### Stage 17, Rack Filters

68. `inlier-refit` — `refitInliers(points, threshold, maxIterations) → { line, inliers }`: fit, keep points within `threshold`, refit on them, stop when the inlier set stops changing. Depends on `fit-line`, `signed-line-distance`. Scene `aisle` view `refit` (drag an outlier). Reference `core.js · recursiveLineFit`. Diagnoses: `single-pass`.
69. `face-filter` — `faceFilter(points, heading, side, threshold) → points`: project onto the aisle's left normal and keep the points within `threshold` of the rack face (the minimum for the left rack, the maximum for the right). Scene `aisle` view `face`. Reference `core.js · rotationSearchFilter` (the keep rule at the best angle). Diagnoses: `sides-swapped`, `heading-as-normal`.
70. `smooth-line` — `smoothLine(previous, line, alpha) → line`: sign-align to the previous normal, blend, renormalize; `previous === null` returns the line. Scene `aisle` view `smooth`. Reference `core.js · smoothLine`. Diagnoses: `no-sign-check`, `no-renormalize`.
71. `consensus-heading` — `consensusHeading(beams, previousHeading) → radians`: resolve each heading by ±π toward `previousHeading` (or the first beam when null), weight by `inlierCount`, circular mean. Comparator `angle`. Scene `aisle` view `consensus`. Reference `core.js · consensusHeading`, `resolveHeadingToReference`. Diagnoses: `arithmetic-mean`, `no-resolve`.

### Stage 18, Aisle Correction

72. `centerline-from-racks` — `centerlineFromRacks(leftLine, rightLine, heading) → line`: align both normals with the aisle's left normal, average, renormalize. Scene `aisle` view `centerline`. Reference `core.js · computeCenterline` (dual). Diagnoses: `no-alignment`.
73. `single-rack-centerline` — `centerlineFromOneRack(line, heading, pose, expectedDistance) → line`: align, then shift by `expectedDistance` toward the robot's side. Scene `aisle` view `single`. Reference `core.js · computeCenterline` (single-beam fallback). Diagnoses: `wrong-side`.
74. `corrected-pose` — `correctedPose(pose, centerline, aisleHeading, gain) → pose`: move against the normal by `gain · signedDistance`, set yaw to the aisle heading. Depends on `signed-line-distance`. Scene `aisle` view `correct`. Reference `core.js · correctedPoseFromCenterline`. Diagnoses: `sign-flipped`, `yaw-kept`.
75. `aisle-correction-step` — `aisleCorrectionStep(frame, threshold) → { heading, centerline, mapFromOdom, correctedPose }` with `frame = { odomFromBase, baseFromLaser, leftPoints, rightPoints }` (points in the laser frame): transform both clouds into odom, refit each, headings, consensus with the inlier counts, centerline, `mapFromOdom = { x: 0, y: c, yaw: −heading }`, `correctedPose = transformPose(mapFromOdom, odomFromBase)`. Depends on `compose`, `points-to-odom`, `inlier-refit`, `heading-from-line`, `consensus-heading`, `centerline-from-racks`, `transform-pose`. Scene `aisle` view `capstone` (drag the aisle's drift and the robot; the racks pushed through your `mapFromOdom` must land on the map's rack lines). Reference `core.js · runPipeline` and `tf-logic`. Diagnoses: `points-not-transformed`, `yaw-sign`.

## Scene

One kind, `aisle`, with views `cloud`, `fit`, `distance`, `heading`, `refit`, `face`, `smooth`, `consensus`, `centerline`, `single`, `correct`, `capstone`. Fixtures build rack faces at ±1.6 m from an aisle frame handle (drift in odom), interior points for the face view, laser-frame clouds from the robot pose and the fixed laser mount, and fixed lines for the distance, smoothing, and correction views. Lines are drawn as long segments; kept and dropped points, inliers, beams, and the corrected pose use existing primitives.

## Catalog, Engine, Lab

- `puzzles.js`: `CORRECTION_STAGES`, the fourth track becomes real (`id: "correction"`), `puzzle()` picks its stage list, arrays `CORRECTION_16` to `CORRECTION_18`.
- Engine and lab unchanged (references are already required on non-tf2 puzzles; the map already renders any number of tracks).

## Verification

Node tests for ids 64 to 75, references, diagnoses, the `aisle` scene for every view, and a capstone round trip on the scene defaults: pushing the observed rack points through the reference `mapFromOdom` lands them on `y = ±1.6` within 1e-6 and the corrected pose's y equals the robot's signed offset from the observed centerline. Headless render of the lab and all twelve scenes.

## Non-Goals

- Accumulation windows, the two-stage rotation search, and the failure-case freezing logic from `core.js`.
- Noise, EMA gains over time, and the live drifting simulation; the capstone corrects one frame.
