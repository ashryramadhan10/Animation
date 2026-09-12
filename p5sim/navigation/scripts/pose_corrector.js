(function exposePoseCorrector(root) {
  "use strict";
  // Mirrors PoseCorrectorNode in src/pose_corrector_node.cpp. Each method keeps
  // the node's name (camelCase) and its order of operations; the C++ line range
  // is noted on every method. Differences from the node are sim-only and marked
  // "sim:" — no depth image, no camera intrinsics, no TF, no message_filters.
  // The pose used for calculation is the raw odom pose (pose_resolver.frame =
  // odom_fcu), exactly as the node runs today.
  const inNode = typeof module !== "undefined" && module.exports;
  const sim = inNode ? null : (root.PoseCorrectorSim = root.PoseCorrectorSim || {});
  const { Config } = inNode ? require("./config.js") : sim.config;
  const G = inNode ? require("./geometry.js") : sim.geometry;
  const L = inNode ? require("./line_fitter.js") : sim.lineFitter;
  const A = inNode ? require("./aisle_state.js") : sim.aisleState;
  const F = inNode ? require("./lateral_drift_filter.js") : sim.lateralDriftFilter;
  const H = inNode ? require("./heading.js") : sim.heading;
  const X = inNode ? require("./x_offset.js") : sim.xOffset;
  const T = inNode ? require("./correction_transform.js") : sim.correctionTransform;

  const DEG = Math.PI / 180;

  // ── construction (node ctor 77-578, reduced to the state the pipeline uses) ──
  function makeNodeState(cfg = Config) {
    const bp = cfg.beam_pointcloud;
    return {
      cfg,
      frameId: 0,
      fitter: new L.RecursiveLinRegFitter(L.fitterConfigFromYaml(bp)),
      rotCfg: L.rotationFilterConfigFromYaml(bp),
      lateralDriftFilter: new F.LateralDriftFilter(F.lateralFilterConfigFromYaml(bp)),
      latestMapPose: null,          // latest_map_pose_: odom pose at the last image stamp
      latestFcuPose: null,          // latest_fcu_pose_: newest pose seen by the timer
      lastPublishedHeading: null,   // last_published_heading_
      lastHeadingRateLimitStamp: null,
      headingJumpCount: 0,
      lastResetTime: null,
      lastTrackedBeamId: -1,
      yawReference: null,
      smoothedPlaneCoeffs: new Map(),   // smoothed_plane_coeffs_: trackId -> {a,b,c}
      trackSideMap: new Map(),          // track_side_map_: trackId -> RackSide
      latestBeamLateralM: new Map(),    // latest_beam_lateral_m_ (debug only)
      accumulator: new Map(),           // PointCloudAccumulator: trackId -> [{stamp, points}]
      aisleCalib: { isCalibrated: false, fromSingleRack: false, halfWidth: 0, a: 0, b: 0, c: 0 },
      aisleState: A.makeAisleState(),
      xOffset: { xOffsetRaw: 0, xOffsetFiltered: 0, xOffsetHasMeasurement: false },
      beamUprightMap: null,             // beam_upright_map_.vertical_uprights
      smoothedRackOrientation: null,    // smoothed_rack_orientation_ (viz SLERP stand-in)
      stored: {
        mapToVisionOdom: null, stamp: null, isIdentity: false,
        poseOffsetXRaw: 0, poseOffsetXFiltered: 0, poseOffsetYRaw: 0, poseOffsetYFiltered: 0,
        droneDistToCl: 0, headingOffsetDeg: null, centerlineYawDeg: null, headingOffsetRawDeg: null,
      },
      resets: [],
      currentTrace: null,
    };
  }

  // Beam upright map subscription (node 485-496): the mission's vertical uprights.
  function loadBeamUprightMap(state, uprights) { state.beamUprightMap = uprights ? uprights.slice() : null; }

  // ── accumulation (PointCloudAccumulator, sim-simplified) ────────────────────
  function cleanupOldEntries(state, nowSec) {
    const window = state.cfg.beam_pointcloud.accumulation_window_sec;
    for (const [trackId, entries] of state.accumulator) {
      const kept = entries.filter(e => nowSec - e.stamp <= window);
      if (kept.length) state.accumulator.set(trackId, kept); else state.accumulator.delete(trackId);
    }
  }
  function updateAccumulator(state, trackId, stamp, points) {
    const bp = state.cfg.beam_pointcloud;
    const entries = state.accumulator.get(trackId) || [];
    entries.push({ stamp, points: points.slice() });
    let total = entries.reduce((n, e) => n + e.points.length, 0);
    while (bp.accumulation_max_points > 0 && total > bp.accumulation_max_points && entries.length > 1) {
      total -= entries.shift().points.length;
    }
    state.accumulator.set(trackId, entries);
    const combined = [];
    for (const e of entries) combined.push(...e.points);
    return combined;
  }

  // ── SegDepthCallback (894-1018) ─────────────────────────────────────────────
  function processFrame(state, frame) {
    const bp = state.cfg.beam_pointcloud;
    state.frameId += 1;
    const trace = {
      frameIndex: frame.frameIndex, stamp: frame.stamp, fcuPose: frame.fcuPose,
      stages: [], xOffset: null, perScanCount: 0, hold: null, holdSkipped: null, reset: null,
      consensus: null, freshHeading: false, headingToPublish: null, rateLimit: null,
      centerlineMode: null, dualCheck: null, measurementRaw: null, measurement: null,
      calibration: null, aisleState: null, broadcast: null, xOffsetState: null, outputs: null,
    };
    state.currentTrace = trace;
    const now = frame.stamp;   // sim: the image stamp doubles as wall time

    // Yaw-maneuver reset (944-952). Only armed once a beam is tracked in the
    // non-consensus path, and disabled by yaw_reset_threshold_deg = 0 in the YAML.
    if (bp.yaw_reset_threshold_deg > 0 && state.lastTrackedBeamId >= 0) {
      if (shouldResetForYaw(state, frame.fcuPose.yaw, now)) {
        resetTrackingState(state, "yaw change", now, true);
        trace.reset = "yaw change";
      }
    }

    // sim: pose resolution is a pass-through of the odom pose (pose_resolver.frame = odom_fcu).
    state.latestMapPose = frame.fcuPose;
    state.latestFcuPose = Object.assign({ stamp: frame.stamp }, frame.fcuPose);

    // sim: the tracker (BeamInstanceMatcher) and side classification are inputs.
    const beamClouds = [];
    for (const track of frame.tracks || []) {
      state.trackSideMap.set(track.trackId, track.side === "left" ? A.RackSide.LEFT : A.RackSide.RIGHT);
      if (track.points && track.points.length) beamClouds.push(track);
    }

    processBeamClouds(state, beamClouds, frame.verticalDetections || [], frame.fcuPose, frame.stamp, now, trace);

    trace.calibration = Object.assign({}, state.aisleCalib);
    trace.aisleState = Object.assign({}, state.aisleState);
    trace.headingJumpCount = state.headingJumpCount;
    trace.lastPublishedHeading = state.lastPublishedHeading;
    trace.xOffsetState = Object.assign({}, state.xOffset);
    trace.outputs = snapshotStored(state);
    state.currentTrace = null;
    return trace;
  }

  function snapshotStored(state) {
    const s = Object.assign({}, state.stored);
    s.mapToVisionOdom = s.mapToVisionOdom ? Object.assign({}, s.mapToVisionOdom) : null;
    return s;
  }

  // ── ProcessBeamClouds (668-892) ─────────────────────────────────────────────
  function processBeamClouds(state, beamClouds, verticalDetections, poseAtImg, stamp, now, trace) {
    const bp = state.cfg.beam_pointcloud;
    const perScanResults = [];

    if (bp.enable_accumulation) cleanupOldEntries(state, now);

    for (const beam of beamClouds) {
      const stage = { trackId: beam.trackId, side: beam.side, inputPoints: beam.points, accumulated: null, rotation: null, rotFiltered: null, fitPoints: null, fit: null, beamResult: null, skipped: null };
      trace.stages.push(stage);
      const beamCloud = beam.points;
      if (beamCloud.length < 10) { stage.skipped = "too few points"; continue; }
      // sim: the 5th-percentile depth gate (705-719) needs the depth image; skipped.

      let sourceCloud = beamCloud;
      if (bp.enable_accumulation) {
        sourceCloud = updateAccumulator(state, beam.trackId, now, beamCloud);
        stage.accumulated = sourceCloud;
      }

      let fitCloud = sourceCloud;
      if (bp.use_rotation_filter && state.lastPublishedHeading !== null) {
        const isLeft = state.trackSideMap.get(beam.trackId) === A.RackSide.LEFT;
        const rot = L.applyTwoStageRotationFilter(sourceCloud, state.lastPublishedHeading, isLeft, state.rotCfg);
        stage.rotation = rot;
        stage.rotFiltered = rot.points;
        if (rot.points && rot.points.length >= bp.min_points_for_fitting) fitCloud = rot.points;
      }
      stage.fitPoints = fitCloud;

      const planeModel = state.fitter.fitPlane(fitCloud);   // FitWallLine (1587-1593), linreg path
      stage.fit = planeModel;
      if (!planeModel.valid) { stage.skipped = `line fit failed (${planeModel.reason})`; continue; }

      // sim: latest_beam_lateral_m_ stands in for the camera-frame lateral (debug only).
      state.latestBeamLateralM.set(beam.trackId, G.lineSignedDistance(
        G.alignLineToHeading(planeModel.coefficients, state.lastPublishedHeading !== null ? state.lastPublishedHeading : G.computeHeadingFromLineCoefficients(planeModel.coefficients)),
        poseAtImg));

      perScanResults.push({ trackId: beam.trackId, planeModel, fitCloud, rawCloud: beamCloud, stage });
    }

    // X-offset from vertical uprights (788-819).
    if (state.beamUprightMap && state.lastPublishedHeading !== null) {
      const heading = state.lastPublishedHeading;
      const observations = verticalDetections.map(d => X.buildVerticalObservation(d.x, d.y, heading));
      if (observations.length) {
        trace.xOffset = X.updateXOffsetFromVerticalObservations(state.xOffset, observations, heading, state.beamUprightMap, state.cfg.x_offset_correction);
      } else {
        trace.xOffset = { skipped: "no vertical detections" };
      }
    } else {
      trace.xOffset = { skipped: `map_received=${state.beamUprightMap ? "true" : "false"} heading_ready=${state.lastPublishedHeading !== null ? "true" : "false"}` };
    }

    trace.perScanCount = perScanResults.length;
    if (!perScanResults.length) {
      trace.hold = "no valid fit";
      publishHeldVisionCorrection(state, poseAtImg, stamp, "no valid fit", trace);
      return;
    }

    if (bp.enable_multi_beam_consensus) {
      const beamResults = [];
      for (const psr of perScanResults) {
        if (beamResults.length >= bp.max_beams_for_consensus) break;   // detection order, not by quality
        const br = buildBeamResultFromFit(state, psr.trackId, psr.planeModel, psr.fitCloud);
        psr.stage.beamResult = br;
        if (br.valid) beamResults.push(br);
      }
      if (beamResults.length) processBeamResults(state, beamResults, stamp, trace);
    } else {
      let chosen = null;
      if (state.lastTrackedBeamId >= 0) chosen = perScanResults.find(p => p.trackId === state.lastTrackedBeamId) || null;
      if (!chosen) { chosen = perScanResults[0]; state.lastTrackedBeamId = chosen.trackId; }
      processPerScanData(state, chosen.trackId, chosen.planeModel, chosen.fitCloud, stamp, trace, chosen.stage);
    }
  }

  // ── BuildBeamResultFromFit (2272-2336) ──────────────────────────────────────
  function buildBeamResultFromFit(state, trackId, planeModel, cloud) {
    const bp = state.cfg.beam_pointcloud;
    let abc = { a: planeModel.coefficients.a, b: planeModel.coefficients.b, c: planeModel.coefficients.c };
    const rawNorm = Math.hypot(abc.a, abc.b);
    if (rawNorm > 1e-6) abc = { a: abc.a / rawNorm, b: abc.b / rawNorm, c: abc.c / rawNorm };

    const prev = state.smoothedPlaneCoeffs.get(trackId);
    const smoothingRestarted = !prev;
    if (prev) {
      if (prev.a * abc.a + prev.b * abc.b < 0) abc = { a: -abc.a, b: -abc.b, c: -abc.c };
      const alpha = bp.plane_coefficients_ema_alpha;
      let blended = { a: alpha * abc.a + (1 - alpha) * prev.a, b: alpha * abc.b + (1 - alpha) * prev.b, c: alpha * abc.c + (1 - alpha) * prev.c };
      const bn = Math.hypot(blended.a, blended.b);
      if (bn > 1e-6) blended = { a: blended.a / bn, b: blended.b / bn, c: blended.c / bn };
      state.smoothedPlaneCoeffs.set(trackId, blended);
      abc = blended;
    } else {
      state.smoothedPlaneCoeffs.set(trackId, abc);
    }

    const result = {
      trackId,
      heading: G.computeHeadingFromLineCoefficients(abc),
      inlierCount: planeModel.inlierIndices.length,
      inlierRatio: planeModel.inlierRatio,
      valid: true,
      headingValid: false,
      headingRejectReason: "",
      planeCoefficients: abc,
      side: state.trackSideMap.has(trackId) ? state.trackSideMap.get(trackId) : A.RackSide.UNKNOWN,
      lineExtentM: L.lineExtent(cloud, planeModel.inlierIndices, planeModel.coefficients),
      smoothingRestarted,
    };
    const gate = H.isBeamReliableForHeading(result, bp);
    result.headingValid = gate.valid;
    result.headingRejectReason = gate.reason;
    return result;
  }

  // ── heading helpers on the node (2099-2200) ─────────────────────────────────
  function isSingleBeamReliableForCorrection(state, result) {
    const bp = state.cfg.beam_pointcloud;
    return H.isSingleBeamCorrectionReliable(result.inlierCount, result.inlierRatio, bp.single_beam_min_inliers_for_correction, bp.single_beam_min_inlier_ratio_for_correction);
  }
  function lastStableHeading(state) {
    if (state.lastPublishedHeading !== null) return state.lastPublishedHeading;
    if (state.aisleState.initialized) return state.aisleState.headingRad;
    return null;
  }
  function holdIfWeakSingleBeam(state, result, stamp, trace) {
    if (isSingleBeamReliableForCorrection(state, result)) return false;
    trace.hold = "weak single beam";
    if (state.latestMapPose) publishHeldVisionCorrection(state, state.latestMapPose, stamp, "weak single beam", trace);
    return true;
  }
  function shouldResetForYaw(state, currentYaw, nowSec) {
    const bp = state.cfg.beam_pointcloud;
    if (state.yawReference === null) { state.yawReference = currentYaw; return false; }
    const diff = G.normalizeAngle(currentYaw - state.yawReference);
    if (Math.abs(diff) < bp.yaw_reset_threshold_deg * DEG) return false;
    if (!H.resetCooldownPassed(state.lastResetTime, nowSec, bp.yaw_reset_cooldown_sec)) return false;
    state.yawReference = currentYaw;
    return true;
  }

  // ── ComputeConsensus (2202-2256) ────────────────────────────────────────────
  function computeConsensus(state, results) {
    const bp = state.cfg.beam_pointcloud;
    const computation = { valid: false, heading: 0, acceptedResults: [], acceptedTrackIds: [], rejectedSamples: [], reason: "" };
    if (!results.length) return computation;
    const samples = results.filter(r => r.headingValid).map(r => ({ trackId: r.trackId, headingRad: r.heading, weight: r.inlierCount }));
    if (!samples.length) { computation.reason = "no heading-qualified beams"; return computation; }
    const selection = H.selectConsensusHeadingSamples(samples, bp.consensus_heading_outlier_threshold_deg * DEG);
    computation.rejectedSamples = selection.rejectedSamples;
    if (!selection.valid) { computation.reason = "all beams rejected as outliers"; return computation; }
    computation.valid = true;
    computation.heading = selection.headingRad;
    computation.acceptedTrackIds = selection.acceptedTrackIds;
    computation.acceptedResults = results.filter(r => selection.acceptedTrackIds.includes(r.trackId));
    return computation;
  }

  // ── ProcessPerScanData (2341-2413): single-beam path when consensus is off ──
  function processPerScanData(state, trackId, planeModel, fitCloud, stamp, trace, stage) {
    const bp = state.cfg.beam_pointcloud;
    const br = buildBeamResultFromFit(state, trackId, planeModel, fitCloud);
    if (stage) stage.beamResult = br;
    if (!br.valid) {
      trace.hold = "line extent below minimum";
      if (state.latestMapPose) publishHeldVisionCorrection(state, state.latestMapPose, stamp, "line extent below minimum", trace);
      return;
    }
    if (holdIfWeakSingleBeam(state, br, stamp, trace)) return;

    const now = stamp;
    const freshHeading = br.headingValid;
    let headingToPublish = br.heading;
    if (freshHeading) {
      headingToPublish = G.resolveHeadingToReference(br.heading, lastStableHeading(state));
    } else {
      const held = lastStableHeading(state);
      if (held === null) {
        trace.hold = "no qualified heading yet";
        if (state.latestMapPose) publishHeldVisionCorrection(state, state.latestMapPose, stamp, "no qualified heading yet", trace);
        return;
      }
      headingToPublish = held;
    }
    if (freshHeading && bp.heading_jump_threshold_deg > 0 &&
        H.shouldResetForHeadingJump(state.lastPublishedHeading, headingToPublish, bp.heading_jump_threshold_deg * DEG, H.resetCooldownPassed(state.lastResetTime, now, bp.yaw_reset_cooldown_sec))) {
      if (state.headingJumpCount + 1 >= bp.heading_jump_required_count) {
        resetTrackingState(state, "heading jump", now, true);
        trace.reset = "heading jump";
        state.headingJumpCount = 0;
        return;
      }
      state.headingJumpCount += 1;
    } else {
      state.headingJumpCount = 0;
    }
    if (freshHeading) {
      const rl = H.rateLimitHeading(state, headingToPublish, stamp, bp.heading_max_rate_deg_s * DEG);
      headingToPublish = rl.heading; trace.rateLimit = rl;
    }
    trace.freshHeading = freshHeading;
    trace.headingToPublish = headingToPublish;
    trace.consensus = { valid: freshHeading, headingRad: headingToPublish, acceptedTrackIds: freshHeading ? [trackId] : [], rejectedSamples: [], reason: freshHeading ? "" : br.headingRejectReason };
    if (state.latestMapPose) applyVisionCorrection(state, [br], headingToPublish, stamp, trace);
  }

  // ── ProcessBeamResults (2418-2518): multi-beam consensus path ───────────────
  function processBeamResults(state, results, stamp, trace) {
    const bp = state.cfg.beam_pointcloud;
    if (!results.length) return;
    const best = results.reduce((a, b) => (b.inlierCount > a.inlierCount ? b : a));

    if (results.length === 1 && holdIfWeakSingleBeam(state, best, stamp, trace)) return;

    if (results.length < bp.min_beams_for_consensus) {
      const freshHeading = best.headingValid;
      let heading = best.heading;
      if (freshHeading) {
        heading = G.resolveHeadingToReference(best.heading, lastStableHeading(state));
        const rl = H.rateLimitHeading(state, heading, stamp, bp.heading_max_rate_deg_s * DEG);
        heading = rl.heading; trace.rateLimit = rl;
      } else {
        const held = lastStableHeading(state);
        if (held === null) {
          trace.hold = "no qualified consensus heading yet";
          if (state.latestMapPose) publishHeldVisionCorrection(state, state.latestMapPose, stamp, "no qualified consensus heading yet", trace);
          return;
        }
        heading = held;
      }
      trace.freshHeading = freshHeading;
      trace.headingToPublish = heading;
      trace.consensus = { valid: freshHeading, headingRad: heading, acceptedTrackIds: freshHeading ? [best.trackId] : [], rejectedSamples: [], reason: freshHeading ? "below min_beams_for_consensus" : best.headingRejectReason };
      if (state.latestMapPose) applyVisionCorrection(state, results, heading, stamp, trace);
      return;
    }

    const consensus = computeConsensus(state, results);
    const freshHeading = consensus.valid && consensus.acceptedResults.length > 0;
    let correctionResults;
    let consensusHeading = 0;
    if (freshHeading) {
      correctionResults = consensus.acceptedResults;
      consensusHeading = G.resolveHeadingToReference(consensus.heading, lastStableHeading(state));
    } else {
      const held = lastStableHeading(state);
      if (held === null) {
        trace.hold = "no qualified consensus heading yet";
        trace.consensus = { valid: false, headingRad: 0, acceptedTrackIds: [], rejectedSamples: consensus.rejectedSamples, reason: consensus.reason };
        if (state.latestMapPose) publishHeldVisionCorrection(state, state.latestMapPose, stamp, "no qualified consensus heading yet", trace);
        return;
      }
      consensusHeading = held;
      correctionResults = results;
    }
    trace.consensus = { valid: freshHeading, headingRad: consensusHeading, acceptedTrackIds: consensus.acceptedTrackIds, rejectedSamples: consensus.rejectedSamples, reason: consensus.reason };

    if (correctionResults.length === 1 && holdIfWeakSingleBeam(state, correctionResults[0], stamp, trace)) return;

    const now = stamp;
    if (freshHeading && bp.heading_jump_threshold_deg > 0 &&
        H.shouldResetForHeadingJump(state.lastPublishedHeading, consensusHeading, bp.heading_jump_threshold_deg * DEG, H.resetCooldownPassed(state.lastResetTime, now, bp.yaw_reset_cooldown_sec))) {
      if (state.headingJumpCount + 1 >= bp.heading_jump_required_count) {
        resetTrackingState(state, "heading jump (consensus)", now, true);
        trace.reset = "heading jump (consensus)";
        state.headingJumpCount = 0;
        return;
      }
      state.headingJumpCount += 1;
    } else {
      state.headingJumpCount = 0;
    }
    if (freshHeading) {
      const rl = H.rateLimitHeading(state, consensusHeading, stamp, bp.heading_max_rate_deg_s * DEG);
      consensusHeading = rl.heading; trace.rateLimit = rl;
    }
    trace.freshHeading = freshHeading;
    trace.headingToPublish = consensusHeading;
    if (state.latestMapPose) applyVisionCorrection(state, correctionResults, consensusHeading, stamp, trace);
  }

  // ── BuildCenterlineMeasurement (2763-2865) ──────────────────────────────────
  function buildCenterlineMeasurement(state, results, consensusHeading, stamp, trace) {
    const bp = state.cfg.beam_pointcloud;
    const meas = A.makeCenterlineMeasurement();
    meas.stamp = stamp;
    meas.headingRad = consensusHeading;

    let leftBest = null, rightBest = null;
    for (const r of results) {
      if (r.side === A.RackSide.LEFT) { if (!leftBest || r.inlierCount > leftBest.inlierCount) leftBest = r; }
      else if (r.side === A.RackSide.RIGHT) { if (!rightBest || r.inlierCount > rightBest.inlierCount) rightBest = r; }
    }

    const dualAttempted = leftBest !== null && rightBest !== null;
    if (dualAttempted) {
      const dual = computeDualCenterline(state, leftBest.planeCoefficients, rightBest.planeCoefficients, consensusHeading, trace);
      if (dual) {
        meas.valid = true; meas.dualSide = true;
        meas.a = dual.a; meas.b = dual.b; meas.c = dual.cCenter; meas.halfWidthM = dual.halfWidth;
        meas.confidence = A.kDualConfidence;
        if (trace) trace.centerlineMode = "dual";
        return meas;
      }
      if (state.aisleState.initialized) {
        // Dual failed with both beams present: freeze c so the EMA is not corrupted; heading-only update.
        const src = leftBest.inlierCount >= rightBest.inlierCount ? leftBest : rightBest;
        const af = G.alignLineToHeading(src.planeCoefficients, consensusHeading);
        meas.valid = true; meas.dualSide = false;
        meas.a = af.a; meas.b = af.b; meas.c = state.aisleState.centerlineC;
        meas.halfWidthM = state.aisleState.halfWidthM;
        meas.confidence = A.kSingleConfidence;
        if (trace) trace.centerlineMode = "dual-fallback-frozen-c";
        return meas;
      }
      // Not initialised yet: fall through to single-rack bootstrap.
    }

    let single = null;
    for (const r of results) if (!single || r.inlierCount > single.inlierCount) single = r;
    if (!single) return meas;

    const halfW = state.aisleCalib.isCalibrated ? state.aisleCalib.halfWidth : bp.expected_rack_distance;
    const aligned = G.alignLineToHeading(single.planeCoefficients, consensusHeading);
    const fcu = state.latestMapPose;
    const signedDist = aligned.a * fcu.x + aligned.b * fcu.y + aligned.c;
    const sideSign = signedDist >= 0 ? 1 : -1;
    const cCl = aligned.c - sideSign * halfW;
    const dLat = state.latestBeamLateralM.has(single.trackId) ? state.latestBeamLateralM.get(single.trackId) : 0;

    meas.valid = true; meas.dualSide = false;
    meas.a = aligned.a; meas.b = aligned.b; meas.c = cCl;
    meas.halfWidthM = halfW; meas.lateralCamM = dLat;
    meas.confidence = A.kSingleConfidence;
    if (trace) trace.centerlineMode = "single";
    return meas;
  }

  // ── ComputeDualCenterline (2949-2984) ───────────────────────────────────────
  function computeDualCenterline(state, leftCoeffs, rightCoeffs, aisleYawRad, trace) {
    const aL = G.alignLineToHeading(leftCoeffs, aisleYawRad);
    const aR = G.alignLineToHeading(rightCoeffs, aisleYawRad);
    const dot = aL.a * aR.a + aL.b * aR.b;
    const check = { dot, halfWidth: Math.abs(aL.c - aR.c) * 0.5, reason: "" };
    if (trace) trace.dualCheck = check;
    if (dot < 0.7) { check.reason = "rack normals diverge"; return null; }
    const cCenter = (aL.c + aR.c) * 0.5;
    const halfWidth = check.halfWidth;
    if (halfWidth < 0.3 || halfWidth > 6.0) { check.reason = "unrealistic half_width"; return null; }
    let aAvg = (aL.a + aR.a) * 0.5, bAvg = (aL.b + aR.b) * 0.5;
    const norm = Math.hypot(aAvg, bAvg);
    if (norm < 1e-6) { check.reason = "degenerate normal"; return null; }
    aAvg /= norm; bAvg /= norm;
    return { a: aAvg, b: bAvg, cCenter, halfWidth };
  }

  // ── TryInitialCalibration (2989-3009) / TryInitialCalibrationSingle (3015-3032) ──
  function tryInitialCalibration(state, dual) {
    const c = state.aisleCalib;
    if (c.isCalibrated && !c.fromSingleRack) return false;
    c.isCalibrated = true; c.fromSingleRack = false;
    c.halfWidth = dual.halfWidth; c.a = dual.a; c.b = dual.b; c.c = dual.cCenter;
    return true;
  }
  function tryInitialCalibrationSingle(state, a, b, cCl, halfW) {
    const c = state.aisleCalib;
    if (c.isCalibrated) return false;
    c.isCalibrated = true; c.fromSingleRack = true;
    c.halfWidth = halfW; c.a = a; c.b = b; c.c = cCl;
    return true;
  }

  // ── ApplyVisionCorrection (2886-2943) ───────────────────────────────────────
  function applyVisionCorrection(state, results, consensusHeading, stamp, trace) {
    const bp = state.cfg.beam_pointcloud;
    const meas = buildCenterlineMeasurement(state, results, consensusHeading, stamp, trace);
    if (trace) trace.measurementRaw = Object.assign({}, meas);
    if (!meas.valid) return;

    if (meas.dualSide) {
      tryInitialCalibration(state, { a: meas.a, b: meas.b, cCenter: meas.c, halfWidth: meas.halfWidthM });
      if (state.aisleCalib.isCalibrated) meas.c = bp.calibration_blend_alpha * meas.c + (1 - bp.calibration_blend_alpha) * state.aisleCalib.c;
    } else {
      if (bp.allow_single_rack_calibration) tryInitialCalibrationSingle(state, meas.a, meas.b, meas.c, meas.halfWidthM);
      if (state.aisleCalib.isCalibrated) meas.c = bp.calibration_blend_alpha * meas.c + (1 - bp.calibration_blend_alpha) * state.aisleCalib.c;
    }
    if (trace) trace.measurement = Object.assign({}, meas);

    A.updateAisleState(state.aisleState, meas, bp.aisle_tracker_dual_gain, bp.aisle_tracker_single_gain);
    if (!state.aisleState.initialized) return;

    const yaw = state.aisleState.headingRad;
    const aState = -Math.sin(yaw), bState = Math.cos(yaw);
    const cState = state.aisleState.centerlineC;
    const dLat = meas.dualSide ? 0 : meas.lateralCamM;

    publishRackPoseFromHeading(state, yaw);
    state.lastPublishedHeading = yaw;
    broadcastVisionCorrectedTF(state, state.latestMapPose, yaw, aState, bState, cState, dLat, stamp, false, trace);
  }

  // ── PublishRackPoseFromHeading (3253-3317), reduced to the stored outputs ────
  function publishRackPoseFromHeading(state, aisleYaw) {
    const bp = state.cfg.beam_pointcloud;
    state.smoothedRackOrientation = state.smoothedRackOrientation === null ? aisleYaw : G.blendAngleCircular(state.smoothedRackOrientation, aisleYaw, bp.heading_ema_alpha);
    const deg = T.radiansToDegrees(aisleYaw);
    state.stored.headingOffsetRawDeg = deg;      // heading_offset/raw: pre-SLERP
    state.stored.centerlineYawDeg = deg;         // carried by centerline_measurement
    state.stored.headingOffsetDeg = deg;
  }

  // ── BroadcastVisionCorrectedTF (1299-1400, markers omitted) ─────────────────
  function broadcastVisionCorrectedTF(state, fcuPose, aisleYawRad, aNormal, bNormal, cCenterline, dLateralCamera, stamp, held, trace) {
    const fcuX = fcuPose.x, fcuY = fcuPose.y;
    const rawDistToCl = aNormal * fcuX + bNormal * fcuY + cCenterline;
    const lateral = state.lateralDriftFilter.update(rawDistToCl);
    const distToCenterline = lateral.filteredM;
    const yIntercept = Math.abs(bNormal) > 1e-6 ? -cCenterline / bNormal : 0;   // pose_offset_y convention
    const lateralX = fcuX - distToCenterline * aNormal;
    const lateralY = fcuY - distToCenterline * bNormal;
    const cosH = Math.cos(aisleYawRad), sinH = Math.sin(aisleYawRad);
    const correctedX = lateralX + state.xOffset.xOffsetFiltered * cosH;
    const correctedY = lateralY + state.xOffset.xOffsetFiltered * sinH;
    const tf = T.buildVisionCorrectionTransform(fcuPose, correctedX, correctedY, fcuPose.z || 0, aisleYawRad);
    storeVisionCorrectionState(state, tf, stamp, yIntercept, distToCenterline);
    if (trace) {
      trace.broadcast = { held, aisleYaw: aisleYawRad, a: aNormal, b: bNormal, c: cCenterline, dLateralCamera, rawDistToCl, lateral, yIntercept, lateralX, lateralY, correctedX, correctedY, tf };
    }
  }

  // ── PublishHeldVisionCorrection (1060-1082) ─────────────────────────────────
  function publishHeldVisionCorrection(state, poseMsg, stamp, reason, trace) {
    if (!state.aisleState.initialized || !state.aisleState.lateralValid) {
      if (trace) trace.holdSkipped = `${reason}: no initialized aisle state`;
      return;
    }
    const yaw = state.aisleState.headingRad;
    broadcastVisionCorrectedTF(state, poseMsg, yaw, -Math.sin(yaw), Math.cos(yaw), state.aisleState.centerlineC, 0, stamp, true, trace);
  }

  // ── stored correction (1144-1242) ───────────────────────────────────────────
  function storeVisionCorrectionState(state, visionTf, stamp, yIntercept, distToCenterline) {
    const s = state.stored;
    s.mapToVisionOdom = Object.assign({}, visionTf.mapToVisionOdom);
    s.stamp = stamp;
    s.poseOffsetXRaw = state.xOffset.xOffsetRaw;
    s.poseOffsetXFiltered = state.xOffset.xOffsetFiltered;
    s.poseOffsetYRaw = yIntercept;
    s.poseOffsetYFiltered = yIntercept;
    s.droneDistToCl = distToCenterline;
    s.isIdentity = false;
  }
  function storeIdentityVisionCorrectionState(state, stamp) {
    const s = state.stored;
    s.mapToVisionOdom = { x: 0, y: 0, z: 0, yaw: 0 };
    s.stamp = stamp;
    s.poseOffsetXRaw = 0; s.poseOffsetXFiltered = 0; s.poseOffsetYRaw = 0; s.poseOffsetYFiltered = 0;
    s.droneDistToCl = 0;
    s.headingOffsetDeg = null; s.centerlineYawDeg = null;
    s.isIdentity = true;
  }
  function publishStoredVisionCorrection(state, fcuPoseMsg, stamp) {
    const s = state.stored;
    if (!s.mapToVisionOdom) return null;
    const mapToVisionOdom = Object.assign({}, s.mapToVisionOdom);
    const visionOdomToBase = { x: fcuPoseMsg.x, y: fcuPoseMsg.y, z: fcuPoseMsg.z || 0, yaw: G.normalizeAngle(fcuPoseMsg.yaw) };
    const correctedPose = T.composeStoredCorrectionPose(mapToVisionOdom, fcuPoseMsg);
    const diagnostics = { poseOffsetXRaw: s.poseOffsetXRaw, poseOffsetYRaw: s.poseOffsetYRaw, droneYToCenterline: F.droneYToCenterlineFromSignedError(s.droneDistToCl) };
    // The atomic measurement keeps the real perception stamp, not the tick time,
    // and stays silent while only the identity placeholder is stored.
    const measurement = s.centerlineYawDeg !== null
      ? { stamp: s.stamp, centerlineYawDeg: s.centerlineYawDeg, poseOffsetYM: s.poseOffsetYFiltered, poseOffsetXM: s.poseOffsetXFiltered, hasX: state.xOffset.xOffsetHasMeasurement }
      : null;
    return { tickStamp: stamp, mapToVisionOdom, visionOdomToBase, correctedPose, diagnostics, measurement };
  }

  // ── VisionCorrectionPropagationTimer (1244-1285) ────────────────────────────
  function propagationTick(state, latestPose, nowSec) {
    const vc = state.cfg.vision_correction;
    const tick = { published: false, reason: "", isIdentity: false, tickStamp: nowSec, mapToVisionOdom: null, visionOdomToBase: null, correctedPose: null, diagnostics: null, measurement: null };
    if (!state.stored.mapToVisionOdom) {
      if (!vc.publish_identity_until_ready) { tick.reason = "identity disabled"; return tick; }
      storeIdentityVisionCorrectionState(state, nowSec);
    }
    if (state.stored.isIdentity) {
      state.stored.stamp = nowSec;   // startup placeholder, never "stale"
    } else if (vc.max_correction_age_sec > 0) {
      if (Math.abs(nowSec - state.stored.stamp) > vc.max_correction_age_sec) { tick.reason = "correction stale"; return tick; }
    }
    if (!latestPose) { tick.reason = "no pose"; return tick; }
    state.latestFcuPose = latestPose;
    if (vc.max_pose_age_sec > 0 && latestPose.stamp !== undefined && latestPose.stamp !== null) {
      if (Math.abs(nowSec - latestPose.stamp) > vc.max_pose_age_sec) { tick.reason = "pose stale"; return tick; }
    }
    const out = publishStoredVisionCorrection(state, latestPose, nowSec);
    if (!out) { tick.reason = "nothing stored"; return tick; }
    Object.assign(tick, out);
    tick.published = true;
    tick.isIdentity = state.stored.isIdentity;
    return tick;
  }

  // ── ResetTrackingState (2654-2698) ──────────────────────────────────────────
  function resetTrackingState(state, reason, nowSec, preserveLateral = false) {
    state.lastTrackedBeamId = -1;
    state.headingJumpCount = 0;
    state.smoothedPlaneCoeffs.clear();
    state.trackSideMap.clear();
    state.yawReference = null;
    state.lastPublishedHeading = null;
    state.lastHeadingRateLimitStamp = null;
    state.lastResetTime = nowSec;
    state.smoothedRackOrientation = null;
    if (preserveLateral) {
      A.resetAisleHeading(state.aisleState);
      state.accumulator.clear();
    } else {
      state.lateralDriftFilter.reset();
      state.latestBeamLateralM.clear();
      A.resetAisleState(state.aisleState);
      state.xOffset.xOffsetRaw = 0; state.xOffset.xOffsetFiltered = 0; state.xOffset.xOffsetHasMeasurement = false;
      state.accumulator.clear();
    }
    state.resets.push({ stamp: nowSec, reason, preserveLateral });
  }


  // ── sim: the combined app's clock ───────────────────────────────────────────
  // A perception frame every third sim tick (10 Hz frames, 30 Hz ticks), a
  // propagation tick every sim tick. Dropout frames (null) skip processFrame and
  // let the timer republish the held correction against the moving pose.
  function runTimeline(world, cfg = Config) {
    const state = makeNodeState(cfg);
    loadBeamUprightMap(state, world.missionUprights);
    const ticks = [];
    const tickCount = world.frameCount * 3;
    for (let k = 0; k < tickCount; k += 1) {
      const t = k * world.dt / 3;
      const frameIndex = Math.floor(k / 3);
      let trace = null;
      if (k % 3 === 0 && world.frames[frameIndex]) trace = processFrame(state, world.frames[frameIndex]);
      const pose = world.poseAtTime ? world.poseAtTime(t) : sim_poseAtTime(world, t);
      const tick = propagationTick(state, pose, t);
      ticks.push({ k, t, frameIndex, trace, tick, pose });
    }
    return { state, ticks };
  }
  function sim_poseAtTime(world, t) {
    const W = inNode ? require("./synthetic_world.js") : sim.syntheticWorld;
    return W.poseAtTime(world, t);
  }

  const api = {
    runTimeline, makeNodeState, loadBeamUprightMap, processFrame, propagationTick, resetTrackingState,
    processBeamClouds, buildBeamResultFromFit, computeConsensus, processBeamResults, processPerScanData,
    holdIfWeakSingleBeam, lastStableHeading, buildCenterlineMeasurement, computeDualCenterline,
    tryInitialCalibration, tryInitialCalibrationSingle, applyVisionCorrection, broadcastVisionCorrectedTF,
    publishHeldVisionCorrection, storeVisionCorrectionState, storeIdentityVisionCorrectionState,
    publishStoredVisionCorrection, publishRackPoseFromHeading, updateAccumulator, cleanupOldEntries, shouldResetForYaw,
  };
  if (inNode) module.exports = api;
  else sim.poseCorrector = api;
})(typeof window !== "undefined" ? window : globalThis);
