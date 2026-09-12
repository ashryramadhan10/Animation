(function exposeLateralDriftFilter(root) {
  "use strict";
  // Mirrors include/warehouse_pose_corrector_vision_based/lateral_drift_filter.hpp:
  // LateralDriftFilterConfig, LateralDriftFilterUpdate, LateralDriftFilter,
  // DroneYToCenterlineFromSignedError. Isolated raw jumps are held; a jump that
  // repeats for jump_confirm_frames within jump_cluster_threshold_m is accepted,
  // then low-passed and step-limited so the output never snaps to the raw value.
  const inNode = typeof module !== "undefined" && module.exports;
  const sim = inNode ? null : (root.PoseCorrectorSim = root.PoseCorrectorSim || {});

  // Maps beam_pointcloud.lateral_* YAML keys onto the filter config (node ctor 331-342).
  function lateralFilterConfigFromYaml(bp) {
    return {
      ema_alpha: bp.lateral_ema_alpha,
      jump_threshold_m: bp.lateral_jump_threshold_m,
      jump_confirm_frames: bp.lateral_jump_confirm_frames,
      jump_cluster_threshold_m: bp.lateral_jump_cluster_threshold_m,
      max_step_m: bp.lateral_max_step_m,
    };
  }

  // DroneYToCenterlineFromSignedError — the published telemetry negates the internal sign.
  function droneYToCenterlineFromSignedError(signedDroneDistanceToCenterlineM) {
    return -signedDroneDistanceToCenterlineM;
  }

  class LateralDriftFilter {
    constructor(config = {}) { this.config = LateralDriftFilter.sanitize(config); this.reset(); }
    setConfig(config) { this.config = LateralDriftFilter.sanitize(config); }

    // Sanitize — clamp the config exactly as the header does.
    static sanitize(config) {
      const c = Object.assign({ ema_alpha: 0.05, jump_threshold_m: 0.25, jump_confirm_frames: 3, jump_cluster_threshold_m: 0.08, max_step_m: 0.04 }, config);
      c.ema_alpha = Math.min(1, Math.max(0, c.ema_alpha));
      c.jump_threshold_m = Math.max(0, c.jump_threshold_m);
      c.jump_confirm_frames = Math.max(1, c.jump_confirm_frames);
      c.jump_cluster_threshold_m = Math.max(0, c.jump_cluster_threshold_m);
      c.max_step_m = Math.max(0, c.max_step_m);
      return c;
    }

    reset() { this.filtered = null; this.lastAcceptedRaw = null; this.pendingJumpRaw = null; this.pendingJumpCount = 0; }
    hasValue() { return this.filtered !== null; }
    value() { return this.filtered; }

    // Update — twin of LateralDriftFilter::Update.
    update(rawM) {
      const result = { initialized: false, held: false, jumpDetected: false, jumpConfirmed: false, jumpCount: 0, rawM, filteredM: 0, rawDeltaM: 0 };
      if (this.filtered === null) {
        this.filtered = rawM;
        this.lastAcceptedRaw = rawM;
        result.initialized = true;
        result.filteredM = rawM;
        return result;
      }
      const referenceRaw = this.lastAcceptedRaw === null ? this.filtered : this.lastAcceptedRaw;
      result.rawDeltaM = rawM - referenceRaw;
      const isJump = this.config.jump_threshold_m > 0 && Math.abs(result.rawDeltaM) > this.config.jump_threshold_m;
      if (isJump) {
        result.jumpDetected = true;
        this.updatePendingJump(rawM);
        result.jumpCount = this.pendingJumpCount;
        if (this.pendingJumpCount < this.config.jump_confirm_frames) {
          result.held = true;
          result.filteredM = this.filtered;
          return result;
        }
        result.jumpConfirmed = true;
        this.pendingJumpRaw = null;
        this.pendingJumpCount = 0;
        this.lastAcceptedRaw = rawM;
        this.filtered = this.applyLowPassAndStepLimit(rawM);
        result.filteredM = this.filtered;
        return result;
      }
      this.pendingJumpRaw = null;
      this.pendingJumpCount = 0;
      this.lastAcceptedRaw = rawM;
      this.filtered = this.applyLowPassAndStepLimit(rawM);
      result.filteredM = this.filtered;
      return result;
    }

    // UpdatePendingJump — a new jump value starts a cluster; a nearby one extends it.
    updatePendingJump(rawM) {
      if (this.pendingJumpRaw === null ||
          (this.config.jump_cluster_threshold_m > 0 && Math.abs(rawM - this.pendingJumpRaw) > this.config.jump_cluster_threshold_m)) {
        this.pendingJumpRaw = rawM;
        this.pendingJumpCount = 1;
        return;
      }
      this.pendingJumpCount += 1;
    }

    // ApplyLowPassAndStepLimit — EMA toward raw, then clamp the output step.
    applyLowPassAndStepLimit(rawM) {
      const current = this.filtered;
      const target = this.config.ema_alpha * rawM + (1 - this.config.ema_alpha) * current;
      let delta = target - current;
      if (this.config.max_step_m > 0) delta = Math.min(this.config.max_step_m, Math.max(-this.config.max_step_m, delta));
      return current + delta;
    }
  }

  const api = { LateralDriftFilter, lateralFilterConfigFromYaml, droneYToCenterlineFromSignedError };
  if (inNode) module.exports = api;
  else sim.lateralDriftFilter = api;
})(typeof window !== "undefined" ? window : globalThis);
