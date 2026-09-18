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
   `broadcastVisionCorrectedTF` (line-based since the C++ change of
   2026-09-14): the lateral drift filter guards and low-passes the centerline
   offset `c`; odom is shifted by `c` along the aisle normal plus the x offset
   along the heading, so the TF translation is `(x_offset, c)` like the laser's
   `createCorrectedTF`; `buildVisionCorrectionTransform`,
   `storeVisionCorrectionState`. The drone's signed distance to the filtered
   line is telemetry only.
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
Everything is generated in the map frame, then expressed in odom by
subtracting a constant odom offset: `odomAlongOffsetM = 0.6` along the aisle
and `odomLateralOffsetM = 0.2` across it. So odom lags map by 0.6 m along the
aisle (the x-offset stage must recover +0.6) and the map centerline, which is
`c = 0` in map, has `c = +0.2` in odom (the intercept output is non-zero).
Each rack per frame: 800 face points along +/-1.6 m (extent 3.2 m, above the
2.0 m heading gate) with sigma 0.018 m, plus 200 interior points 0.06 to
0.25 m behind the face. The recursive fit only ever shrinks its inlier set,
so the interior-biased first pass drops about 15% of the face for good; 800
leaves ~680 inliers, clearly above the 500 gate, where 640 sat on the edge. Uprights every 2.8 m along each rack at the face
line. The mission map holds the true upright positions in the map frame.

Because relative camera geometry is preserved, a constant odom offset shifts
rack points and the FCU pose together and changes only the intercept. A
sudden odom jump, however, does reach the lateral filter: the pose moves at
once while the aisle-state centerline (EMA plus calibration anchor) lags, so
the signed distance jumps. A true lateral displacement reaches it directly.
The schedule uses one of each.

Vertical detections per frame: uprights within 4 m ahead and 2.5 m behind
along the aisle on both sides, each as an odom XY point with sigma 0.05 m.
One spurious detection every 17th frame, 0.9 m off any upright.

Drone (true, map frame): along = 0.16 i; lateral = 0.08 sin(0.025 i) + 0.05
(slow enough for the 0.05 lateral EMA to track within 0.05 m);
yaw = heading + 4 deg sin(0.21 i). Reported odom pose = true minus the odom
offset. Frames every 0.1 s. Track ids 1 (left) and 2 (right).

Fault schedule over 150 frames (the lateral EMA needs about sixty frames to
absorb a 0.35 m displacement, so the run is long enough to show it settle):

| Frames | Fault | Node reaction to show |
|---|---|---|
| 0-29 | none | dual, calibration on first dual |
| 30-44 | right rack missing | single mode with calibrated half width |
| 45-54 | both beams short (extent 1.2 m) | no heading-qualified beam: heading held, lateral still updates from both |
| 55-69 | right beam skewed +20 deg with 660 face points; left 1000 face points | consensus rejects the skewed beam at the 3 deg gate once its coefficient EMA drifts past it; if both fall outside the gate the heading is held. Published heading stays within 1.5 deg of truth throughout |
| 70-71 | odom pose glitch: reported odom shifts 0.35 m laterally for two frames, pose and rack points together | isolated jump: lateral filter holds. (A shift of rack points alone never reaches the filter: the aisle-state EMA absorbs it. An odom jump does, because the state lags the pose.) |
| 75-89 | true lateral displacement 0.35 m (drone really moves, odom tracks it) | sustained jump: confirmed on the third frame, then EMA and step limit |
| 90-99 | perception dropout: no frame delivered, timer only | identity never returns; held correction republished; measurement stamp frozen at frame 89 |
| 100-109 | left track id 1 becomes 3 | coefficient EMA restarts for id 3 |
| 110-149 | none | recovery; the lateral EMA settles on the displaced position |

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

Pipeline smoke test on the synthetic world, 150 frames. The node's corrected
pose is expressed in the aisle-aligned frame (odom rotated by minus the aisle
yaw), so "on the centerline" means its y equals minus the odom intercept c.
Frames 21-54 and the final frame have that y within 0.05 m, and frames 55-74
within 0.10 m (while both beams fail the 3 deg gate the node feeds both into
the dual centerline, so the skewed line leaks into c: a real node trait); from frame 60 the
along-aisle x is within 0.1 m of the true map position; `x_offset_filtered` is within 0.1 m of +0.6 by frame 60; the
measurement intercept is within 0.05 m of the true odom intercept by frame
20; frames 45-54 report a held heading with a reason naming the extent;
across frames 55-69 the published heading stays within 1.5 deg of the true
heading; the lateral filter reports `held` at frame 70 and `jumpConfirmed`
at frame 77; during ticks for frames 90-99 the measurement stamp equals the
frame-89 stamp while the tick corrected pose keeps moving; the first frame
with track id 3 reports a restarted coefficient EMA.

Error handling: pure functions never throw on empty input; they return
invalid results with a reason string, as the C++ logs. Drawers guard on
`trace.valid` and on missing stages. World bounds for rendering come from
the world, not per-frame results, so the view does not jitter.

## Out of scope

Pose buffer and image-time interpolation, camera intrinsics and depth
back-projection, the beam instance matcher's pixel-space matching, TF mode
pose resolution, and the tf2 walkthrough Track 4 content.
