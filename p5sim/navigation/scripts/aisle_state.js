(function exposeAisleState(root) {
  "use strict";
  // Mirrors include/warehouse_pose_corrector_vision_based/aisle_types.hpp:
  // RackSide, kDualConfidence / kSingleConfidence, BeamMeasurement,
  // CenterlineMeasurement, AisleState, update_aisle_state, reset_aisle_state,
  // reset_aisle_heading. Structs are plain objects built by make*() so their
  // defaults are visible in one place.
  const inNode = typeof module !== "undefined" && module.exports;
  const sim = inNode ? null : (root.PoseCorrectorSim = root.PoseCorrectorSim || {});
  const G = inNode ? require("./geometry.js") : sim.geometry;

  const RackSide = Object.freeze({ UNKNOWN: "unknown", LEFT: "left", RIGHT: "right" });
  const kDualConfidence = 1.0;
  const kSingleConfidence = 0.4;

  // BeamMeasurement — compact result from one successful beam line fit.
  function makeBeamMeasurement() {
    return {
      valid: false, side: RackSide.UNKNOWN, headingRad: 0, cLine: 0,
      planeCoeffs: { a: 0, b: 0, c: 0 }, inlierCount: 0, residual: 0,
      visibleLengthM: 0, confidence: 0, trackId: -1, stamp: 0,
    };
  }

  // CenterlineMeasurement — centerline derived from one or two beams in a frame.
  function makeCenterlineMeasurement() {
    return {
      valid: false, dualSide: false, headingRad: 0, a: 0, b: 0, c: 0,
      halfWidthM: 0, lateralCamM: 0, confidence: 0, stamp: 0,
    };
  }

  // AisleState — the single canonical tracker state. Two validity flags:
  // `initialized` (heading usable) and `lateralValid` (centerlineC trusted),
  // so a heading-only reset can keep the lateral estimate alive.
  function makeAisleState() {
    return {
      initialized: false, lateralValid: false, headingRad: 0, centerlineC: 0,
      halfWidthM: 0, confidence: 0, dualLastFrame: false, lastUpdate: 0,
    };
  }

  // update_aisle_state — first heading after (re)init sets directly; later calls
  // blend at the dual or single gain. Lateral blends whenever lateralValid, even
  // on the first heading after a heading-only reset.
  function updateAisleState(state, meas, dualGain, singleGain) {
    if (!meas.valid) return;
    const gain = meas.dualSide ? dualGain : singleGain;
    if (!state.initialized) {
      state.headingRad = meas.headingRad;
      if (state.lateralValid) {
        state.centerlineC = (1 - gain) * state.centerlineC + gain * meas.c;
      } else {
        state.centerlineC = meas.c;
        state.halfWidthM = meas.halfWidthM;
        state.lateralValid = true;
      }
      state.initialized = true;
    } else {
      state.headingRad = G.blendAngleCircular(state.headingRad, meas.headingRad, gain);
      state.centerlineC = (1 - gain) * state.centerlineC + gain * meas.c;
      if (meas.dualSide) state.halfWidthM = (1 - gain) * state.halfWidthM + gain * meas.halfWidthM;
    }
    state.dualLastFrame = meas.dualSide;
    state.confidence = meas.confidence;
    state.lastUpdate = meas.stamp;
  }

  // reset_aisle_state — full reset: heading and lateral both untrusted.
  function resetAisleState(state) { state.initialized = false; state.lateralValid = false; }

  // reset_aisle_heading — heading-only reset; centerlineC is intentionally kept.
  function resetAisleHeading(state) { state.initialized = false; }

  const api = { RackSide, kDualConfidence, kSingleConfidence, makeBeamMeasurement, makeCenterlineMeasurement, makeAisleState, updateAisleState, resetAisleState, resetAisleHeading };
  if (inNode) module.exports = api;
  else sim.aisleState = api;
})(typeof window !== "undefined" ? window : globalThis);
