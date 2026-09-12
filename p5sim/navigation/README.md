# p5js Vision Pose Corrector Simulator

A browser/p5js walkthrough of the ROS 2 node `warehouse_pose_corrector_vision_based`
(`/workspace/src/warehouse_pose_corrector_vision_based/`), aligned with the node as
it runs today. Every stage after depth back-projection is ported to JavaScript
under the C++ name, verified by tests ported from the C++ gtests, and shown in
sixteen demo pages on a synthetic aisle with a fault schedule.

Open the combined page:

```text
p5sim/navigation/index.html
```

p5js loads from CDN (`https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js`).

## Reading order

Each module mirrors one C++ file and names it in its header comment; each
function names its C++ twin. Read them in this order, it is the load order too:

| Module | Mirrors | What it holds |
| --- | --- | --- |
| `scripts/config.js` | `config/warehouse_pose_corrector_vision_based.yaml` | The deployed values under the YAML's own keys; C++ defaults in comments where different |
| `scripts/geometry.js` | `aisle_types.hpp`, `rack_geometry_utils.cpp` | Vectors, `normalizeAngle`, `blendAngleCircular`, `resolveHeadingToReference`, `computeHeadingFromLineCoefficients`, `alignLineToHeading`, seeded RNG |
| `scripts/line_fitter.js` | `recursive_linreg_fitter.cpp`, `rotation_search_filter.hpp` | `RecursiveLinRegFitter.fitPlane` (ratio, gap, length checks), `lineExtent`, `rotationSearchFilter`, `applyTwoStageRotationFilter` |
| `scripts/aisle_state.js` | `aisle_types.hpp` | `AisleState`, `CenterlineMeasurement`, `updateAisleState`, heading-only and full resets |
| `scripts/lateral_drift_filter.js` | `lateral_drift_filter.hpp` | `LateralDriftFilter`: jump hold, confirm, EMA, step limit |
| `scripts/heading.js` | `consensus_filter.hpp`, node heading methods | `selectConsensusHeadingSamples`, `isBeamReliableForHeading`, `rateLimitHeading`, `shouldResetForHeadingJump` |
| `scripts/x_offset.js` | node X-offset section | Upright projection, association, median outlier rejection, `updateXOffsetFromVerticalObservations` |
| `scripts/correction_transform.js` | `vision_correction_transform.hpp` | `buildVisionCorrectionTransform`, `composeStoredCorrectionPose` |
| `scripts/pose_corrector.js` | `pose_corrector_node.cpp` | The orchestrator: `processFrame` (the seg/depth callback chain), `propagationTick` (the timer), every private method under its name, `runTimeline` |
| `scripts/synthetic_world.js` | (sim only) | The aisle in the map frame, the constant odom offset, uprights, the drone path, the fault schedule |

`scripts/renderer.js`, `scripts/demos.js` and `scripts/sketch.js` are the combined
page's drawing code. Drawers only read the orchestrator's trace; they never
recompute pipeline math.

## The synthetic world

Everything is generated in the map frame and expressed in odom by subtracting a
constant offset: 0.6 m along the aisle and 0.2 m across. The node sees only odom,
exactly like the real node (`pose_resolver.frame: odom_fcu`), and estimates the
gap: the x-offset stage recovers the 0.6 m from mission uprights, and the
centerline intercept carries the 0.2 m.

Fault schedule over 150 frames at 10 Hz (the combined page runs a perception
frame every third animation tick and a propagation tick every tick):

| Frames | Fault | What the node does |
| --- | --- | --- |
| 0-29 | none | dual centerline, calibration on the first dual frame |
| 30-44 | right rack missing | single mode with the calibrated half width |
| 45-54 | both beams short (1.2 m) | no beam passes the extent gate: heading held, lateral still live |
| 55-69 | right beam skewed 20 deg, sparser | the 3 deg gate first rejects the skewed beam, then both; heading held; the dual midpoint still leaks the skewed line into c |
| 70-71 | odom pose glitch 0.35 m | lateral filter holds the isolated jump |
| 75-89 | true lateral displacement 0.35 m | confirmed on the third frame, then eased in by the 0.05 EMA |
| 90-99 | perception dropout | timer republishes the held correction; measurement stamp frozen at frame 89 |
| 100-109 | left track id 1 becomes 3 | coefficient EMA restarts for the new id |
| 110-149 | none | the lateral EMA settles on the displaced position |

## Demo pages

The combined page lists all sixteen. Each also has a standalone folder whose
`sketch.js` copies the functions it needs verbatim (same names, same C++ twin
comments), so one file can be read top to bottom without the shared scripts.

| Page | Shows | C++ twin |
| --- | --- | --- |
| `pipeline/` | the whole per-frame chain with hold reasons | `SegDepthCallback` chain |
| `synthetic-input/` | racks, uprights, map versus odom, the fault timeline | inputs |
| `accumulation/` | optional stage, off by default | `PointCloudAccumulator` |
| `rotation-filter/` | coarse and fine sweeps with the YAML thresholds | `RotationSearchFilter` |
| `line-fit/` | the refinement iterations and the gap and length checks | `RecursiveLinRegFitter::FitPlane` |
| `coefficient-smoothing/` | per-track EMA with sign-flip handling | `BuildBeamResultFromFit` |
| `heading-gates/` | extent, inlier and ratio gates; rate limit; jump counter | `IsBeamReliableForHeading`, `RateLimitHeading`, `ShouldResetForHeadingJump` |
| `heading-consensus/` | weighted circular mean and the 3 deg gate | `ComputeConsensus`, `select_consensus_heading_samples` |
| `centerline/` | dual with validation, single with calibrated half width, frozen c | `BuildCenterlineMeasurement`, `ComputeDualCenterline` |
| `calibration/` | the one-shot anchor and the 30/70 blend | `TryInitialCalibration`, `ApplyVisionCorrection` |
| `lateral-drift-filter/` | raw versus filtered with hold and confirm | `LateralDriftFilter` |
| `x-offset/` | pillar association and the running x offset | `UpdateXOffsetFromVerticalObservations` |
| `correction/` | signed distance, projection, x step, transform | `BroadcastVisionCorrectedTF` |
| `tf-logic/` | the two TF edges and the composed yaw | `build_vision_correction_transform` |
| `outputs-hold/` | the timer, identity until ready, frozen stamps through a dropout | `VisionCorrectionPropagationTimer`, `PublishStoredVisionCorrection` |
| `failure-cases/` | the schedule with the node's real reaction | hold and reset paths |

## Frames and outputs

- `map -> odom_vision_correction` carries the correction delta rotated by minus
  the aisle yaw, with rotation minus the aisle yaw.
- `odom_vision_correction -> base_link_odom_vision_correction` carries the raw
  FCU pose, translation and yaw.
- `corrected_pose` is `R(-aisle_yaw) * corrected + delta` with yaw
  `raw_yaw - aisle_yaw`: an aisle-aligned frame where x is the along-aisle
  position and y is minus the odom intercept. This is pinned by
  `test_vision_correction_transform.cpp`.
- The production output is one atomic `CenterlineMeasurement`: absolute
  centerline yaw, odom-frame intercept, x offset and `has_x`, stamped with the
  real perception time even when republished by the timer.

## Tests

Ported from the C++ gtests plus stage tests and an end-to-end smoke test on
the synthetic world:

```bash
node p5sim/navigation/tests.js            # headless, exit 1 on failure
node p5sim/navigation/scripts/demos_check.js   # draws every demo against a p5 stub
```

Or open `p5sim/navigation/tests.html` in a browser.

Two things the tests document about the C++ itself:

- `test_aisle_state.cpp` expects a linear heading blend, but `aisle_types.hpp`
  blends circularly since 2026-06-09; the C++ test fails by ~4e-5 rad at its
  1e-9 tolerance. The port mirrors the header.
- The recursive fit only shrinks its inlier set. With interior points behind
  the rack face, about 15% of face points are dropped for good, which is why
  the heading gate's 500-inlier floor matters.
