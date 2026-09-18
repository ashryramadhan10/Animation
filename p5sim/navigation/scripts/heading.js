(function exposeHeading(root) {
  "use strict";
  // Mirrors include/warehouse_pose_corrector_vision_based/consensus_filter.hpp
  // (select_consensus_heading_samples, is_single_beam_correction_reliable) and
  // the heading-quality methods of PoseCorrectorNode in src/pose_corrector_node.cpp:
  // IsBeamReliableForHeading (2108-2144), RateLimitHeading (2153-2182),
  // ResetCooldownPassed (2614-2619), ShouldResetForHeadingJump (2635-2642).
  const inNode = typeof module !== "undefined" && module.exports;
  const sim = inNode ? null : (root.PoseCorrectorSim = root.PoseCorrectorSim || {});
  const G = inNode ? require("./geometry.js") : sim.geometry;

  // accumulate_heading_sample — weighted unit-vector sums for a circular mean.
  function accumulateHeadingSample(sample, acc) {
    if (sample.weight <= 0) return false;
    acc.sumWeight += sample.weight;
    acc.sumSin += sample.weight * Math.sin(sample.headingRad);
    acc.sumCos += sample.weight * Math.cos(sample.headingRad);
    return true;
  }

  // is_single_beam_correction_reliable — inlier count and ratio floor for a lone beam.
  function isSingleBeamCorrectionReliable(inlierCount, inlierRatio, minInliers, minInlierRatio) {
    return inlierCount >= minInliers && inlierRatio >= minInlierRatio;
  }

  // select_consensus_heading_samples — weighted circular mean; samples farther
  // than the threshold from the initial mean are rejected and the mean recomputed.
  function selectConsensusHeadingSamples(samples, outlierThresholdRad) {
    const result = { valid: false, headingRad: 0, acceptedTrackIds: [], rejectedSamples: [] };
    if (!samples || !samples.length) return result;
    if (samples.length === 1) {
      result.valid = samples[0].weight > 0;
      result.headingRad = samples[0].headingRad;
      if (result.valid) result.acceptedTrackIds.push(samples[0].trackId);
      return result;
    }
    let acc = { sumWeight: 0, sumSin: 0, sumCos: 0 };
    for (const s of samples) accumulateHeadingSample(s, acc);
    if (acc.sumWeight <= 0) return result;
    const initialHeading = Math.atan2(acc.sumSin / acc.sumWeight, acc.sumCos / acc.sumWeight);
    if (outlierThresholdRad <= 0) {
      result.valid = true;
      result.headingRad = initialHeading;
      for (const s of samples) if (s.weight > 0) result.acceptedTrackIds.push(s.trackId);
      return result;
    }
    acc = { sumWeight: 0, sumSin: 0, sumCos: 0 };
    for (const s of samples) {
      if (s.weight <= 0) continue;
      const diff = Math.abs(G.normalizeAngle(s.headingRad - initialHeading));
      if (diff > outlierThresholdRad) { result.rejectedSamples.push({ trackId: s.trackId, diffRad: diff }); continue; }
      result.acceptedTrackIds.push(s.trackId);
      accumulateHeadingSample(s, acc);
    }
    if (acc.sumWeight <= 0) return result;
    result.valid = true;
    result.headingRad = Math.atan2(acc.sumSin / acc.sumWeight, acc.sumCos / acc.sumWeight);
    return result;
  }

  // IsBeamReliableForHeading — extent, inlier count and ratio gates; the reason
  // string is built with the same words and number formats as the C++ ostringstream.
  function isBeamReliableForHeading(result, bp) {
    const failures = [];
    if (result.lineExtentM < bp.heading_min_line_extent_m) {
      failures.push(`extent ${result.lineExtentM.toFixed(2)}m < ${bp.heading_min_line_extent_m.toFixed(2)}m`);
    }
    if (result.inlierCount < bp.heading_min_inliers) {
      failures.push(`inliers ${result.inlierCount} < ${bp.heading_min_inliers}`);
    }
    if (result.inlierRatio < bp.heading_min_inlier_ratio) {
      failures.push(`ratio ${(result.inlierRatio * 100).toFixed(1)}% < ${(bp.heading_min_inlier_ratio * 100).toFixed(1)}%`);
    }
    return { valid: failures.length === 0, reason: failures.join(", ") };
  }

  // RateLimitHeading — clamp the heading step to max_rate * dt; dt outside (0, 1] s
  // falls back to 1/30 s. Mutates state.lastHeadingRateLimitStamp like the node.
  function rateLimitHeading(state, headingRad, stampSec, maxRateRadS) {
    if (maxRateRadS <= 0 || state.lastPublishedHeading === null || state.lastPublishedHeading === undefined) {
      state.lastHeadingRateLimitStamp = stampSec;
      return { heading: headingRad, limited: false, dt: 0, maxStep: 0 };
    }
    let dt = 0;
    if (state.lastHeadingRateLimitStamp !== null && state.lastHeadingRateLimitStamp !== undefined) {
      dt = stampSec - state.lastHeadingRateLimitStamp;
    }
    if (dt <= 0 || dt > 1) dt = 1 / 30;
    const maxStep = maxRateRadS * dt;
    const diff = G.normalizeAngle(headingRad - state.lastPublishedHeading);
    let limited = headingRad;
    let wasLimited = false;
    if (Math.abs(diff) > maxStep) {
      limited = G.normalizeAngle(state.lastPublishedHeading + Math.sign(diff) * maxStep);
      wasLimited = true;
    }
    state.lastHeadingRateLimitStamp = stampSec;
    return { heading: limited, limited: wasLimited, dt, maxStep };
  }

  // ResetCooldownPassed — true when no reset has happened or the cooldown elapsed.
  function resetCooldownPassed(lastResetTime, nowSec, cooldownSec) {
    if (cooldownSec <= 0) return true;
    if (lastResetTime === null || lastResetTime === undefined) return true;
    return nowSec - lastResetTime >= cooldownSec;
  }

  // ShouldResetForHeadingJump — a heading more than the threshold from the last
  // published one, once the cooldown has passed.
  function shouldResetForHeadingJump(lastPublishedHeading, headingRad, thresholdRad, cooldownPassed) {
    if (lastPublishedHeading === null || lastPublishedHeading === undefined) return false;
    const diff = G.normalizeAngle(headingRad - lastPublishedHeading);
    if (Math.abs(diff) < thresholdRad) return false;
    return cooldownPassed;
  }

  const api = { selectConsensusHeadingSamples, isSingleBeamCorrectionReliable, isBeamReliableForHeading, rateLimitHeading, resetCooldownPassed, shouldResetForHeadingJump };
  if (inNode) module.exports = api;
  else sim.heading = api;
})(typeof window !== "undefined" ? window : globalThis);
