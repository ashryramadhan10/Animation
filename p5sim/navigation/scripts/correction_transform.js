(function exposeCorrectionTransform(root) {
  "use strict";
  // Mirrors include/warehouse_pose_corrector_vision_based/vision_correction_transform.hpp
  // (VisionCorrectionTransform, build_vision_correction_transform, radians_to_degrees)
  // and PoseCorrectorNode::ComposeStoredCorrectionPose (node 1084-1121). Poses and
  // transforms are {x, y, z, yaw}; a scalar yaw stands in for the C++ quaternion,
  // normalised into (-pi, pi] where the C++ reads it back through getRPY.
  //
  //   map -> odom_vision_correction        : correction delta rotated by -aisle_yaw, rotation -aisle_yaw
  //       -> base_link_odom_vision_correction : the RAW FCU pose (translation and yaw)
  //   corrected_pose = R(-aisle_yaw) * raw + delta, yaw = raw_yaw - aisle_yaw
  const inNode = typeof module !== "undefined" && module.exports;
  const sim = inNode ? null : (root.PoseCorrectorSim = root.PoseCorrectorSim || {});
  const G = inNode ? require("./geometry.js") : sim.geometry;

  function radiansToDegrees(radians) { return radians * 180 / Math.PI; }

  // build_vision_correction_transform — the two TF edges plus the corrected pose.
  function buildVisionCorrectionTransform(rawFcuPose, correctedX, correctedY, correctedZ, aisleYawRad) {
    const rawX = rawFcuPose.x, rawY = rawFcuPose.y, rawZ = rawFcuPose.z || 0;
    const correctionYaw = G.normalizeAngle(-aisleYawRad);
    const cosC = Math.cos(correctionYaw), sinC = Math.sin(correctionYaw);
    const deltaX = correctedX - rawX;
    const deltaY = correctedY - rawY;
    const correctionX = cosC * deltaX - sinC * deltaY;
    const correctionY = sinC * deltaX + cosC * deltaY;
    const correctionZ = correctedZ - rawZ;
    const rawYaw = G.normalizeAngle(rawFcuPose.yaw);
    const childYaw = rawYaw;
    const composedYaw = G.normalizeAngle(correctionYaw + childYaw);
    return {
      mapToVisionOdom: { x: correctionX, y: correctionY, z: correctionZ, yaw: correctionYaw },
      visionOdomToBase: { x: rawX, y: rawY, z: rawZ, yaw: childYaw },
      correctedPose: {
        x: cosC * rawX - sinC * rawY + correctionX,
        y: sinC * rawX + cosC * rawY + correctionY,
        z: rawZ + correctionZ,
        yaw: composedYaw,
      },
      rawYaw, correctionYaw, childYaw, composedYaw,
    };
  }

  // ComposeStoredCorrectionPose — apply a stored map->vision_odom edge to a raw FCU pose.
  function composeStoredCorrectionPose(mapToVisionOdom, fcuPose) {
    const c = Math.cos(mapToVisionOdom.yaw), s = Math.sin(mapToVisionOdom.yaw);
    return {
      x: c * fcuPose.x - s * fcuPose.y + mapToVisionOdom.x,
      y: s * fcuPose.x + c * fcuPose.y + mapToVisionOdom.y,
      z: (fcuPose.z || 0) + (mapToVisionOdom.z || 0),
      yaw: G.normalizeAngle(mapToVisionOdom.yaw + G.normalizeAngle(fcuPose.yaw)),
    };
  }

  const api = { radiansToDegrees, buildVisionCorrectionTransform, composeStoredCorrectionPose };
  if (inNode) module.exports = api;
  else sim.correctionTransform = api;
})(typeof window !== "undefined" ? window : globalThis);
