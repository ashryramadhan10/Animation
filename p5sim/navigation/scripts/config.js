(function exposeConfig(root) {
  "use strict";
  // Mirrors config/warehouse_pose_corrector_vision_based.yaml (deployed values).
  // Keys keep the YAML nesting and spelling so a grep lands on the same name in
  // both places. Trailing comments give the C++ declare_parameter default in
  // pose_corrector_node.cpp where it differs from the YAML.
  const inNode = typeof module !== "undefined" && module.exports;
  const sim = inNode ? null : (root.PoseCorrectorSim = root.PoseCorrectorSim || {});

  const Config = {
    map_frame: "map",
    pose_resolver: { frame: "odom_fcu" },
    beam_instance_matcher: { max_missed_frames: 10, max_centroid_dist_px: 100.0 },
    beam_pointcloud: {
      ransac_distance_threshold: 0.05,
      ransac_max_iterations: 100,
      ransac_min_inlier_ratio: 0.25,        // C++ default 0.6
      min_points_for_fitting: 10,
      use_linreg_fitter: true,              // C++ default false
      linreg_distance_threshold: 0.05,
      linreg_min_inlier_ratio: 0.25,        // C++ default 0.5
      linreg_max_iterations: 10,
      linreg_max_allowed_gap: 3.0,
      linreg_min_line_length: 0.5,
      heading_min_line_extent_m: 2.0,
      heading_min_inliers: 500,
      heading_min_inlier_ratio: 0.35,
      heading_max_rate_deg_s: 0.75,
      use_rotation_filter: true,            // C++ default false
      rot_coarse_pivot_distance: 3.0,
      rot_coarse_search_range_deg: 30.0,    // C++ default 20.0
      rot_coarse_search_step_deg: 5.0,
      rot_coarse_filter_threshold: 0.8,     // C++ default 0.5
      rot_fine_pivot_distance: 3.0,
      rot_fine_search_range_deg: 10.0,
      rot_fine_search_step_deg: 0.5,
      rot_fine_filter_threshold: 0.5,       // C++ default 0.3
      min_beam_depth: 0.3,                  // C++ default 0.5
      rack_pose_position_ema_alpha: 0.3,
      heading_ema_alpha: 0.05,              // C++ default 0.3 (viz-only SLERP)
      plane_coefficients_ema_alpha: 0.08,   // C++ default 0.3
      lateral_ema_alpha: 0.05,              // C++ default 0.1
      lateral_jump_threshold_m: 0.25,
      lateral_jump_confirm_frames: 3,
      lateral_jump_cluster_threshold_m: 0.08,
      lateral_max_step_m: 0.04,
      calibration_blend_alpha: 0.3,
      allow_single_rack_calibration: false,
      yaw_reset_threshold_deg: 0.0,         // C++ default 15.0; 0 disables the yaw-maneuver reset
      yaw_reset_cooldown_sec: 0.7,
      heading_jump_threshold_deg: 5.0,      // C++ default 25.0
      heading_jump_required_count: 2,
      track_change_log_period_sec: 5.0,
      sync_warn_delta_sec: 0.2,
      enable_accumulation: false,
      accumulation_window_sec: 4.0,
      accumulation_max_points: 50000,
      enable_multi_beam_consensus: true,    // C++ default false
      max_beams_for_consensus: 2,           // C++ default 4
      min_beams_for_consensus: 1,           // C++ default 2
      consensus_heading_outlier_threshold_deg: 3.0,        // C++ default 10.0
      single_beam_min_inliers_for_correction: 100,         // C++ default 800
      single_beam_min_inlier_ratio_for_correction: 0.15,   // C++ default 0.55
      expected_rack_distance: 1.6,
      aisle_tracker_dual_gain: 0.2,         // C++ default 0.4
      aisle_tracker_single_gain: 0.05,      // C++ default 0.1
    },
    x_offset_correction: {
      x_offset_ema_alpha: 0.05,
      pillar_match_range: 1.0,
      pillar_offset_outlier_threshold_m: 0.5,
      pillar_lateral_score_weight: 0.25,
    },
    vision_correction: {
      odom_frame: "odom_vision_correction",
      base_frame: "base_link_odom_vision_correction",
      propagation_enabled: true,
      publish_identity_until_ready: true,
      propagation_rate_hz: 50.0,            // C++ default 30.0
      max_pose_age_sec: 0.25,
      max_correction_age_sec: 0.0,          // 0 means no age limit on the held correction
    },
  };

  // Deep copy so a demo or test can override a key without touching the shared object.
  function cloneConfig(cfg) { return JSON.parse(JSON.stringify(cfg)); }

  const api = { Config, cloneConfig };
  if (inNode) module.exports = api;
  else sim.config = api;
})(typeof window !== "undefined" ? window : globalThis);
