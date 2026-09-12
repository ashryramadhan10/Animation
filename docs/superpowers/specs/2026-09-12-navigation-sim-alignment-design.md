# Navigation Sim Alignment Design

Date: 2026-09-12. Aligns `p5sim/navigation` with the current
`warehouse_pose_corrector_vision_based` node (working tree of 2026-09-12,
`pose_corrector_node.cpp` and headers) so the sim can be read next to the C++.

## Purpose

The sim was written against an older node. The line fit, rotation filter, and
coefficient EMA still match. Everything after them has drifted: the node now
has a heading quality gate, a rate limiter, a jump reset, a jump-guarded
lateral filter, one-shot aisle calibration, an x-offset stage that matches
vertical uprights to a mission map, a propagation timer with hold semantics,
and a different TF yaw convention. The sim's `tf-logic` demo states the old
convention, which the C++ unit test `test_vision_correction_transform.cpp`
now contradicts.

Scope chosen: full alignment. Every stage of the current node that runs after
depth back-projection is modeled, every stale demo is fixed, and new
standalone pages are added for the stages that had none.

## Decisions

- Function names mirror the C++ in camelCase. Each module names the C++ file
  it mirrors in a header comment; each function names its C++ twin.
- Config values come from the deployed YAML
  (`config/warehouse_pose_corrector_vision_based.yaml`). Keys keep the YAML's
  nesting and spelling. Where the C++ default differs, it is noted in a
  trailing comment.
- The sim still starts after the image and depth stage. Segmentation, depth
  back-projection, `T_map_from_cam`, and left/right side classification are
  synthetic inputs.
- Accumulation stays modeled but is off by default, matching the YAML.
- Standalone per-method pages stay self-contained (they copy the functions
  they need, under the same names). Existing folder names are kept because
  `p5sim/tf2_walkthrough/puzzles.js` links to them by name.
- The tf2 walkthrough Track 4 is out of scope beyond its links resolving.
- A Node-runnable test page is added in the repo's existing style.

## Section 1: Files and modules

`scripts/core.js` is replaced by nine modules under `p5sim/navigation/scripts/`.
All attach to one global `PoseCorrectorSim` and export via `module.exports`
under Node, following the `tf2_walkthrough` IIFE convention.

| Module | Mirrors | Holds |
|---|---|---|
| `config.js` | deployed YAML | `Config.beam_pointcloud.*`, `Config.x_offset_correction.*`, `Config.vision_correction.*`, `Config.beam_instance_matcher.*`; YAML values, C++ defaults in comments |
| `geometry.js` | `aisle_types.hpp`, `rack_geometry_utils.cpp` | vectors; `normalizeAngle`, `blendAngleCircular`, `resolveHeadingToReference`, `computeHeadingFromLineCoefficients`, `alignLineToHeading`, `lineSignedDistance`; seeded RNG |
| `line_fitter.js` | `recursive_linreg_fitter.cpp`, `rotation_search_filter.hpp` | `fitLine2D`, `RecursiveLinRegFitter.fitPlane` (inlier ratio, max gap, min length), `extractInliers`, `lineExtent`, `rotationSearchFilter`, `applyTwoStageRotationFilter` |
| `aisle_state.js` | `aisle_types.hpp` | `makeAisleState`, `makeCenterlineMeasurement`, `updateAisleState`, `resetAisleState`, `resetAisleHeading`, `kDualConfidence`, `kSingleConfidence` |
| `lateral_drift_filter.js` | `lateral_drift_filter.hpp` | `LateralDriftFilter` (`update`, `reset`, `hasValue`, `value`), `droneYToCenterlineFromSignedError` |
| `heading.js` | `consensus_filter.hpp` and node heading methods | `selectConsensusHeadingSamples`, `isSingleBeamCorrectionReliable`, `isBeamReliableForHeading`, `rateLimitHeading`, `shouldResetForHeadingJump` |
| `x_offset.js` | node X-offset section | `projectAlongAisle`, `projectAcrossAisle`, `buildVerticalObservation`, `applyXOffsetToObservation`, `buildProjectedMissionUprights`, `associateVerticalObservation`, `median`, `updateXOffsetFromVerticalObservations` |
| `correction_transform.js` | `vision_correction_transform.hpp` | `buildVisionCorrectionTransform`, `composeStoredCorrectionPose` |
| `pose_corrector.js` | `pose_corrector_node.cpp` | `makeNodeState`, `processFrame`, `propagationTick`, and the node's private methods under their names: `processBeamClouds`, `buildBeamResultFromFit`, `computeConsensus`, `processBeamResults`, `holdIfWeakSingleBeam`, `buildCenterlineMeasurement`, `computeDualCenterline`, `tryInitialCalibration`, `tryInitialCalibrationSingle`, `applyVisionCorrection`, `broadcastVisionCorrectedTF`, `publishHeldVisionCorrection`, `storeVisionCorrectionState`, `storeIdentityVisionCorrectionState`, `publishStoredVisionCorrection`, `resetTrackingState` |

Not ports: `synthetic_world.js` (world, trajectory, fault schedule),
`renderer.js` (unchanged), `demos.js` (drawers), `sketch.js` (p5 loop).

Load order for `index.html` and `tests.html`: config, geometry, line_fitter,
aisle_state, lateral_drift_filter, heading, x_offset, correction_transform,
pose_corrector, synthetic_world, renderer, demos, sketch.

## Section 2: Per-frame data flow and the timer tick

`processFrame(state, frame, cfg)` follows `SegDepthCallback` order and returns
a trace the drawers read. Drawers never recompute.

1. Inputs: odom-frame FCU pose at the image stamp; horizontal tracks
   `{trackId, side, points}` in odom XY; vertical detections as odom XY points.
2. Per-track fit (`processBeamClouds`): optional accumulation, optional
   two-stage rotation filter when `lastPublishedHeading` exists, then
   `fitPlane`. Failed fits are recorded with a reason and skipped.
3. X offset: if the mission map is loaded and a heading exists, project,
   associate within `pillar_match_range`, median-reject residual outliers,
   `updateXOffsetFromVerticalObservations`. Otherwise record the skip reason.
4. Beam results (`buildBeamResultFromFit`): per-track coefficient EMA with
   sign-flip handling, heading, inlier chord extent, `isBeamReliableForHeading`
   with reason string. A beam may be lateral-valid and heading-rejected.
5. Consensus (`processBeamResults`): only heading-valid beams vote, weighted
   circular mean with `consensus_heading_outlier_threshold_deg`. No fresh
   heading: hold last stable heading, all beams still feed lateral. Lone weak
   beam: `holdIfWeakSingleBeam`. Then `shouldResetForHeadingJump` with the
   required count, then `rateLimitHeading`.
6. Centerline and calibration (`buildCenterlineMeasurement`): dual via
   `computeDualCenterline` (normals dot >= 0.7, half width in [0.3, 6.0]),
   frozen-c fallback when dual fails with state initialized, single with the
   best-inlier beam and calibrated or expected half width.
   `tryInitialCalibration` anchors once on dual; later `c` blends toward the
   anchor at `calibration_blend_alpha`. Single-rack calibration only if
   `allow_single_rack_calibration`.
7. Aisle state and broadcast: `updateAisleState`, then
   `broadcastVisionCorrectedTF`: raw signed distance, lateral drift filter,
   projection onto centerline, x offset along heading,
   `buildVisionCorrectionTransform`, `storeVisionCorrectionState`.
8. Hold path: any early exit in 2 to 6 calls `publishHeldVisionCorrection`,
   which reuses the aisle state and still runs the lateral filter. The trace
   records the hold reason string.

`propagationTick(state, latestPose, now)` mirrors the timer: identity until
the first real correction, stale-correction and stale-pose guards,
`publishStoredVisionCorrection` yielding the two TF edges, the corrected pose,
diagnostics, and one `CenterlineMeasurement` stamped with the stored
perception time, not `now`.

The combined app runs a perception frame every third sim tick and a
propagation tick every sim tick.

## Section 3: Synthetic world and fault schedule

`synthetic_world.js` exports `buildWorld(seed)` and `buildFrames(world, n)`.

World: aisle heading 33.5 deg, half width 1.6 m (`expected_rack_distance`).
Each rack per frame: 640 face points along +/-1.6 m (extent 3.2 m, above the
2.0 m heading gate) with sigma 0.018 m, plus 200 interior points 0.06 to
0.25 m behind the face. Uprights every 2.8 m along each rack at the face
line. The mission map holds the true upright positions in the map frame.
Odom is offset from map by `odomAlongOffsetM = 0.6` along the aisle, so
detected uprights (odom) disagree with the map and the x-offset stage has
work to do; the expected converged `x_offset_filtered` is +0.6.

Vertical detections per frame: uprights within 4 m ahead and 2.5 m behind
along the aisle on both sides, each as an odom XY point with sigma 0.05 m.
One spurious detection every 17th frame, 0.9 m off any upright.

Drone: along = 0.16 i; lateral = 0.16 sin(0.13 i) + 0.05; yaw = heading +
4 deg sin(0.21 i). Frames every 0.1 s. Track ids 1 (left) and 2 (right).

Fault schedule over 120 frames:

| Frames | Fault | Node reaction to show |
|---|---|---|
| 0-29 | none | dual, calibration on first dual |
| 30-44 | right rack missing | single mode with calibrated half width |
| 45-54 | left beam short (extent 1.2 m) | heading held, lateral still updates |
| 55-64 | right beam skewed +8 deg | consensus rejects it at the 3 deg gate |
| 65-66 | odom lateral jump 0.35 m, isolated | lateral filter holds |
| 70-84 | odom lateral jump 0.35 m, sustained | confirmed after 3, step-limited |
| 85-94 | perception dropout: no frame delivered, timer only | identity never returns; held correction republished; measurement stamp frozen |
| 95-104 | left track id 1 becomes 3 | coefficient EMA restarts for id 3 |
| 105-119 | none | recovery |

The schedule is a plain array so a page can show which fault is active.

## Section 4: Demos and pages

Sixteen demo ids. Existing eleven are kept and updated; five are new.
Each has a drawer in `demos.js` and a self-contained standalone folder.

| Id | Shows | Mirrors |
|---|---|---|
| `pipeline` | full trace: stage overlays, mode, hold reason, outputs | `SegDepthCallback` chain |
| `synthetic-input` | racks, uprights, mission map, odom offset, fault timeline | inputs |
| `accumulation` | optional stage, off by default, toggle to compare | `PointCloudAccumulator` |
| `rotation-filter` | sweep and band, YAML values 30/5/0.8 and 10/0.5/0.5 | `RotationSearchFilter` |
| `line-fit` | iterations, gap and length validation, inlier chord | `RecursiveLinRegFitter::FitPlane` |
| `coefficient-smoothing` | per-track EMA alpha 0.08 with sign flip | `BuildBeamResultFromFit` |
| `heading-gates` new | extent, inliers, ratio gate with reasons; rate limit; jump counter | `IsBeamReliableForHeading`, `RateLimitHeading`, `ShouldResetForHeadingJump` |
| `heading-consensus` | first-N in detection order, heading-valid only, 3 deg gate | `ComputeConsensus`, `select_consensus_heading_samples` |
| `centerline` | dual with validation, single with best-inlier, frozen-c fallback | `BuildCenterlineMeasurement`, `ComputeDualCenterline` |
| `calibration` new | first dual anchor, blend of later c, single-rack flag | `TryInitialCalibration`, `ApplyVisionCorrection` |
| `lateral-drift-filter` new | raw vs filtered, isolated hold, sustained confirm, cluster, max step | `LateralDriftFilter` |
| `x-offset` new | map uprights, shifted detections, association, median reject, raw and EMA | `UpdateXOffsetFromVerticalObservations` |
| `correction` | signed distance, filter, projection, x along heading | `BroadcastVisionCorrectedTF` |
| `tf-logic` fixed | map to vision odom = delta rotated by -aisle, yaw -aisle; vision odom to base = raw pose; composed = fcu - aisle | `build_vision_correction_transform` |
| `outputs-hold` new | timer, identity until ready, held correction through dropout, TF edges, measurement stamp vs tick time, `has_x` | `VisionCorrectionPropagationTimer`, `PublishStoredVisionCorrection` |
| `failure-cases` | driven by the fault schedule, shows the node's real reaction | hold and reset paths |

The combined `index.html` lists all sixteen. Standalone `index.html` files
use the existing template with a link back to the combined app.

## Section 5: Testing and error handling

`p5sim/navigation/tests.html` and `tests.js` in the `tf2_walkthrough` style.
Run headless with `node p5sim/navigation/tests.js`.

Ported from the C++ gtests with the same expected values:
`test_lateral_drift_filter`, `test_aisle_state`, `test_consensus_filter`,
`test_resolve_heading`, `test_vision_correction_transform` (including the
24.565, 15.922 and -148 deg cases), `test_centerline_meas` and
`test_beam_measurement` defaults.

Added for stages without a C++ unit test: line fitter rejects a gap over
3.0 m and a span under 0.5 m and a low inlier ratio; rotation filter keeps
the face band and drops interior; `isBeamReliableForHeading` reason strings;
`rateLimitHeading` clamps to 0.75 deg/s; x-offset association picks the
nearest gate, median rejects a 0.9 m outlier, raw accumulates and EMA follows.

Pipeline smoke test on the synthetic world, 120 frames:
after frame 20 the corrected pose is within 0.05 m of the true centerline;
`x_offset_filtered` is within 0.1 m of +0.6 by frame 60; during frames 85-94
the measurement stamp stays frozen while tick outputs advance; across frames
55-64 the heading moves no more than the rate limit allows; the lateral
filter holds at 65-66 and confirms by 73.

Error handling: pure functions never throw on empty input; they return
invalid results with a reason string, as the C++ logs. Drawers guard on
`trace.valid` and on missing stages. World bounds for rendering come from
the world, not per-frame results, so the view does not jitter.

## Out of scope

Pose buffer and image-time interpolation, camera intrinsics and depth
back-projection, the beam instance matcher's pixel-space matching, TF mode
pose resolution, and the tf2 walkthrough Track 4 content.
