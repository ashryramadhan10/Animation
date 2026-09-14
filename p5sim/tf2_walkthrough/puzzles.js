(function exposeTF2Puzzles(root) {
  "use strict";

  const PI = Math.PI;
  const FRAME_OPTIONS = Object.freeze(["map", "odom", "base_link", "laser", "camera"]);
  const CHAIN_OPTIONS = Object.freeze(["map", "odom", "base_link", "laser"]);

  const STAGES = Object.freeze([
    { id: "rotation-bricks", title: "Rotation Bricks", subtitle: "cos, sin, atan2, and the angle wrap.", range: [1, 5] },
    { id: "frames", title: "Frames (SE(2))", subtitle: "Apply, compose, invert, and relate rigid transforms.", range: [6, 11] },
    { id: "tree", title: "Tree", subtitle: "Turn parent-child edges into traversable structure.", range: [12, 16] },
    { id: "lookup-robot", title: "Lookup & Robot Frames", subtitle: "Resolve map, odom, base_link, and laser questions.", range: [17, 19] },
    { id: "time", title: "Time", subtitle: "Interpolate samples and respect buffer boundaries.", range: [20, 23] },
    { id: "se3", title: "SE(3)", subtitle: "Lift the same ideas into quaternion-based 3D.", range: [24, 26] },
    { id: "capstone", title: "Capstone", subtitle: "Answer a stamped lookup end to end.", range: [27, 27] },
  ]);

  const TOOLKIT_STAGES = Object.freeze([
    { id: "matrix-form", title: "Matrix Form", subtitle: "SE(2) as a 3×3 homogeneous matrix.", range: [28, 33] },
    { id: "orientation-3d", title: "3D Orientation", subtitle: "RPY, quaternions, slerp, and SE(3).", range: [34, 40] },
    { id: "motion-uncertainty", title: "Motion & Uncertainty", subtitle: "Integrate odometry and rotate covariance.", range: [41, 43] },
    { id: "time-travel", title: "Time Travel", subtitle: "Move an observation across time through a fixed frame.", range: [44, 44] },
    { id: "rigid-alignment", title: "Rigid Alignment", subtitle: "Recover a transform from two point clouds.", range: [45, 51] },
  ]);

  const ADVANCED_STAGES = Object.freeze([
    { id: "conversions", title: "Conversions", subtitle: "Rotation matrices and axis-angle, both directions.", range: [52, 55] },
    { id: "sensors-motion", title: "Sensors & Motion", subtitle: "URDF mounts, body twists, and lidar de-skewing.", range: [56, 58] },
    { id: "buffer-semantics", title: "Buffer Semantics", subtitle: "Latching, pruning, arrival, reparenting, lookup.", range: [59, 63] },
  ]);

  const CORRECTION_STAGES = Object.freeze([
    { id: "pointcloud-bricks", title: "Point-Cloud Bricks", subtitle: "Rack points into odom, line fits, distances, headings.", range: [64, 67] },
    { id: "rack-filters", title: "Rack Filters", subtitle: "Inlier refits, rack faces, smoothing, consensus.", range: [68, 71] },
    { id: "aisle-correction", title: "Aisle Correction", subtitle: "Centerline, shift by c, and map → odom.", range: [72, 75] },
    { id: "vision-node", title: "Vision Node", subtitle: "Heading gate, outlier gate, rate limit, aisle state, the c filter, and the TF.", range: [76, 83] },
  ]);

  const ESTIMATION_STAGES = Object.freeze([
    { id: "kinematics", title: "Kinematics", subtitle: "Wheel speeds, gyro rates, and twists between frames.", range: [84, 86] },
    { id: "uncertainty", title: "Uncertainty", subtitle: "Propagate, compound, gate, and draw covariance.", range: [87, 90] },
    { id: "estimation", title: "Estimation", subtitle: "EKF predict and update, particle weights and resampling.", range: [91, 95] },
  ]);

  const BAYES_STAGES = Object.freeze([
    { id: "scalar-filters", title: "Scalar Filters", subtitle: "g-h, discrete Bayes, Gaussians, and the 1D Kalman filter.", range: [96, 100] },
    { id: "multivariate-kalman", title: "Multivariate Kalman", subtitle: "A position-velocity tracker, brick by brick.", range: [101, 106] },
    { id: "nonlinear-smoothing", title: "Nonlinear & Smoothing", subtitle: "Sigma points, the unscented transform, and RTS smoothing.", range: [107, 110] },
  ]);

  const TRACKS = Object.freeze([
    Object.freeze({ id: "tf2", title: "Track 1 · TF2", stages: STAGES }),
    Object.freeze({
      id: "toolkit",
      title: "Track 2 · Transform Toolkit",
      unlockAfter: "stamped-lookup",
      note: "Unlocks after the stamped lookup capstone.",
      stages: TOOLKIT_STAGES,
    }),
    Object.freeze({
      id: "advanced",
      title: "Track 3 · Buffers & Sensors",
      unlockAfter: "icp-match",
      note: "Unlocks after the ICP finale.",
      stages: ADVANCED_STAGES,
    }),
    Object.freeze({
      id: "correction",
      title: "Track 4 · Pose Correction",
      unlockAfter: "buffer-lookup",
      note: "Unlocks after the buffer lookup finale.",
      stages: CORRECTION_STAGES,
    }),
    Object.freeze({
      id: "estimation",
      title: "Track 5 · Uncertainty & Estimation",
      unlockAfter: "vision-correction-transform",
      note: "Unlocks after the vision correction transform.",
      stages: ESTIMATION_STAGES,
    }),
    Object.freeze({
      id: "bayes",
      title: "Track 6 · Bayesian Filters",
      unlockAfter: "ekf-localize-step",
      note: "Unlocks after the EKF localization step.",
      stages: BAYES_STAGES,
    }),
  ]);

  const PYROBOTICS = "https://github.com/AtsushiSakai/PythonRobotics/blob/master/";

  function pyref(path, symbol) {
    return Object.freeze({ label: "PythonRobotics · " + path + (symbol ? " · " + symbol : ""), url: PYROBOTICS + path });
  }

  function docref(label, url) {
    return Object.freeze({ label, url });
  }

  function navref(page, module, symbol) {
    return Object.freeze({ label: "p5sim/navigation · scripts/" + module + " · " + symbol, url: "../navigation/" + page + "/index.html" });
  }

  const KBF = "https://github.com/rlabbe/Kalman-and-Bayesian-Filters-in-Python/blob/master/";

  function bookref(chapter, symbol) {
    return Object.freeze({ label: "Kalman & Bayesian Filters · " + chapter + (symbol ? " · " + symbol : ""), url: KBF + chapter + ".ipynb" });
  }

  function lines() {
    return Array.from(arguments).join("\n");
  }

  function starter(functionName, args, comment) {
    return comment
      ? lines("function " + functionName + "(" + args + ") {", "  // " + comment, "  return null;", "}")
      : lines("function " + functionName + "(" + args + ") {", "  return null;", "}");
  }

  function example(args, expected, label) {
    return Object.freeze({ args, expected, label });
  }

  function diagnosis(id, message, source) {
    return Object.freeze({ id, message, source });
  }

  function handle(config) {
    return Object.freeze(config);
  }

  function puzzle(config) {
    const track = config.track || "tf2";
    const stageList = { tf2: STAGES, toolkit: TOOLKIT_STAGES, advanced: ADVANCED_STAGES, correction: CORRECTION_STAGES, estimation: ESTIMATION_STAGES, bayes: BAYES_STAGES }[track] || STAGES;
    const stage = stageList.find((candidate) => config.number >= candidate.range[0] && config.number <= candidate.range[1]);
    if (!stage) throw new Error("Puzzle " + config.number + " has no stage");
    return Object.freeze({
      tolerance: 1e-6,
      reference: null,
      reading: null,
      ...config,
      track,
      stage: stage.id,
      dependencies: Object.freeze(config.dependencies || []),
      diagnoses: Object.freeze(config.diagnoses || []),
      hints: Object.freeze(config.hints),
      publicCases: Object.freeze(config.cases.slice(0, 1)),
      checkCases: Object.freeze(config.cases.slice(1)),
      scene: Object.freeze({
        kind: config.scene.kind,
        view: config.scene.view || null,
        handles: Object.freeze(config.scene.handles.map(handle)),
        args: config.scene.args ? Object.freeze(config.scene.args) : null,
      }),
    });
  }

  const STAGE_1_2 = [
    puzzle({
      number: 1, id: "heading-vector", title: "Point Along a Yaw",
      goal: "Turn a yaw angle into the unit vector that points along it.",
      concept: "Every rotation in SE(2) is built from this pair: cos for x and sin for y.",
      functionName: "headingVector", signature: "headingVector(yaw) → { x, y }",
      starterSource: starter("headingVector", "yaw", "The unit vector along yaw: cos for x, sin for y."),
      referenceSource: "function headingVector(yaw) { return { x: Math.cos(yaw), y: Math.sin(yaw) }; }",
      comparator: "vector2", walkthroughChapter: "matrix-stack",
      scene: { kind: "dial", handles: [{ id: "yaw", type: "dial", label: "yaw", value: 0.6 }] },
      diagnoses: [diagnosis("swapped", "Mirrored across the diagonal: x should use cos(yaw) and y should use sin(yaw).", "function headingVector(yaw) { return { x: Math.sin(yaw), y: Math.cos(yaw) }; }")],
      hints: ["A heading is a direction, so its vector has length one.", "On the unit circle, x = cos(yaw) and y = sin(yaw).", "Return { x: Math.cos(yaw), y: Math.sin(yaw) }."],
      cases: [
        example([PI / 2], { x: 0, y: 1 }, "quarter turn"),
        example([0], { x: 1, y: 0 }, "zero yaw"),
        example([PI], { x: -1, y: 0 }, "half turn"),
        example([-PI / 4], { x: Math.SQRT1_2, y: -Math.SQRT1_2 }, "negative yaw"),
      ],
    }),
    puzzle({
      number: 2, id: "heading-of", title: "Vector to Heading",
      goal: "Recover the signed yaw of a direction in every quadrant.",
      concept: "atan2 keeps the quadrant that a plain ratio throws away.",
      functionName: "headingOf", signature: "headingOf(v) → radians",
      starterSource: starter("headingOf", "v", "Use the two-argument arctangent."),
      referenceSource: "function headingOf(v) { return Math.atan2(v.y, v.x); }",
      comparator: "angle", walkthroughChapter: "data-types",
      scene: { kind: "vector", handles: [{ id: "v", type: "vector", label: "v", value: { x: 2, y: 1.2 } }] },
      diagnoses: [
        diagnosis("atan2-swapped", "Arguments swapped: atan2 takes (y, x), so the angle is measured from the wrong axis.", "function headingOf(v) { return Math.atan2(v.x, v.y); }"),
        diagnosis("atan-ratio", "atan(y / x) loses the quadrant: a vector pointing left comes back as if it pointed right.", "function headingOf(v) { return Math.atan(v.y / v.x); }"),
      ],
      hints: ["A direction's angle depends on both components and their signs.", "Math.atan2(y, x) keeps the quadrant; a plain ratio does not.", "Return Math.atan2(v.y, v.x)."],
      cases: [
        example([{ x: 0, y: 3 }], PI / 2, "positive Y"),
        example([{ x: 2, y: 0 }], 0, "positive X"),
        example([{ x: -1, y: -1 }], -3 * PI / 4, "third quadrant"),
        example([{ x: -2, y: 0 }], PI, "negative X"),
      ],
    }),
    puzzle({
      number: 3, id: "wrap-angle", title: "Wrap an Angle",
      goal: "Bring any angle into the range [-π, π) without changing its direction.",
      concept: "Angles repeat every full turn; TF2 compares and interpolates yaw only after wrapping.",
      functionName: "wrapAngle", signature: "wrapAngle(angle) → radians in [-π, π]",
      starterSource: starter("wrapAngle", "angle", "Shift by π, reduce modulo 2π, fix a negative remainder, shift back."),
      referenceSource: lines(
        "function wrapAngle(angle) {",
        "  var wrapped = (angle + Math.PI) % (2 * Math.PI);",
        "  if (wrapped < 0) wrapped += 2 * Math.PI;",
        "  return wrapped - Math.PI;",
        "}"
      ),
      comparator: "wrapped", walkthroughChapter: "data-types",
      scene: { kind: "dial", handles: [{ id: "angle", type: "dial", label: "angle", value: 4.0, accumulate: true }] },
      diagnoses: [diagnosis("unwrapped", "Same direction, but not wrapped: the value must land inside [-π, π].", "function wrapAngle(angle) { return angle; }")],
      hints: ["Angles repeat every full turn; two values can mean the same direction.", "Shift by π, take the remainder modulo 2π, fix a negative remainder, then shift back.", "wrapped = (angle + π) mod 2π; add 2π if negative; return wrapped − π."],
      cases: [
        example([4], 4 - 2 * PI, "past π"),
        example([0.5], 0.5, "already inside"),
        example([-4], -4 + 2 * PI, "below −π"),
        example([7], 7 - 2 * PI, "more than a turn"),
        example([PI], -PI, "exactly π (either sign is accepted)"),
      ],
    }),
    puzzle({
      number: 4, id: "rotate-vector", title: "Turn a Direction",
      goal: "Rotate a vector by yaw without translating it.",
      concept: "The 2×2 rotation matrix mixes x and y; a flipped sin sign mirrors the result.",
      functionName: "rotateVector", signature: "rotateVector(v, yaw) → vector",
      starterSource: starter("rotateVector", "v, yaw", "Apply the 2×2 rotation matrix rows [cos, -sin] and [sin, cos]."),
      referenceSource: lines(
        "function rotateVector(v, yaw) {",
        "  var c = Math.cos(yaw);",
        "  var s = Math.sin(yaw);",
        "  return { x: c * v.x - s * v.y, y: s * v.x + c * v.y };",
        "}"
      ),
      comparator: "vector2", walkthroughChapter: "matrix-stack",
      scene: { kind: "vector-dial", handles: [
        { id: "v", type: "vector", label: "v", value: { x: 2, y: 0.5 } },
        { id: "yaw", type: "dial", label: "yaw", value: 0.8 },
      ] },
      diagnoses: [
        diagnosis("negated-yaw", "Rotated the wrong way: the sign of sin is flipped, which mirrors the rotation.", "function rotateVector(v, yaw) { var c = Math.cos(yaw), s = Math.sin(yaw); return { x: c * v.x + s * v.y, y: -s * v.x + c * v.y }; }"),
        diagnosis("swapped-rows", "Rows swapped: x′ should be cos·x − sin·y and y′ should be sin·x + cos·y.", "function rotateVector(v, yaw) { var c = Math.cos(yaw), s = Math.sin(yaw); return { x: s * v.x + c * v.y, y: c * v.x - s * v.y }; }"),
      ],
      hints: ["A rotation mixes x and y but never adds an offset.", "Use the matrix rows [cos, −sin] and [sin, cos].", "x′ = cos(yaw)·x − sin(yaw)·y; y′ = sin(yaw)·x + cos(yaw)·y."],
      cases: [
        example([{ x: 1, y: 0 }, PI / 2], { x: 0, y: 1 }, "quarter turn"),
        example([{ x: 2, y: -3 }, PI], { x: -2, y: 3 }, "half turn"),
        example([{ x: 0, y: 2 }, PI / 2], { x: -2, y: 0 }, "quarter turn of +Y"),
        example([{ x: 3, y: 4 }, 0], { x: 3, y: 4 }, "zero yaw"),
      ],
    }),
    puzzle({
      number: 5, id: "yaw-delta", title: "Shortest Turn",
      goal: "Return the shortest signed turn from one heading to another.",
      concept: "Interpolation, correction, and comparison all need the short way around the circle.",
      functionName: "yawDelta", signature: "yawDelta(from, to) → radians in [-π, π]",
      starterSource: starter("yawDelta", "from, to", "Subtract, then wrap with your wrapAngle."),
      referenceSource: "function yawDelta(from, to) { return wrapAngle(to - from); }",
      comparator: "wrapped", walkthroughChapter: "time-buffer",
      dependencies: ["wrap-angle"],
      scene: { kind: "two-dials", handles: [
        { id: "from", type: "dial", label: "from", value: 2.8, radius: 1.6 },
        { id: "to", type: "dial", label: "to", value: -2.6, radius: 2.4 },
      ] },
      diagnoses: [
        diagnosis("reversed", "Reversed: yawDelta measures the turn from `from` to `to`, so subtract from, not to.", "function yawDelta(from, to) { return wrapAngle(from - to); }"),
        diagnosis("long-way", "Took the long way around: wrap the difference so the turn is the shortest signed one.", "function yawDelta(from, to) { return to - from; }"),
      ],
      hints: ["The shortest turn is never more than half a circle.", "Subtract to − from, then wrap the result with your wrapAngle.", "Return wrapAngle(to - from)."],
      cases: [
        example([170 * PI / 180, -170 * PI / 180], PI / 9, "across the wrap"),
        example([0, PI / 2], PI / 2, "quarter turn left"),
        example([1, 0.5], -0.5, "small turn right"),
        example([-PI / 2, PI / 2], -PI, "half turn"),
      ],
    }),
    puzzle({
      number: 6, id: "transform-point", title: "Move a Point Between Frames",
      goal: "Express a source-frame point in target-frame coordinates.",
      concept: "T_target_source rotates first, then translates. The point does not move; its numbers change.",
      functionName: "transformPoint", signature: "transformPoint(transform, point) → point",
      starterSource: starter("transformPoint", "transform, point", "Rotate point by transform.yaw, then add transform.x and transform.y."),
      referenceSource: lines(
        "function transformPoint(transform, point) {",
        "  var rotated = rotateVector(point, transform.yaw);",
        "  return { x: rotated.x + transform.x, y: rotated.y + transform.y };",
        "}"
      ),
      comparator: "vector2", walkthroughChapter: "matrix-stack",
      dependencies: ["rotate-vector"],
      scene: { kind: "frame-point", handles: [
        { id: "transform", type: "frame", label: "source", value: { x: 3, y: 1, yaw: PI / 2 } },
        { id: "point", type: "point", label: "p", value: { x: 2, y: 0 }, in: "transform" },
      ] },
      diagnoses: [
        diagnosis("translate-then-rotate", "Translated before rotating: the offset got rotated too. Rotate the point first, then add the translation.", "function transformPoint(transform, point) { var shifted = { x: point.x + transform.x, y: point.y + transform.y }; return rotateVector(shifted, transform.yaw); }"),
        diagnosis("rotation-ignored", "Rotation ignored: the point was only shifted.", "function transformPoint(transform, point) { return { x: point.x + transform.x, y: point.y + transform.y }; }"),
        diagnosis("negated-yaw", "Rotated by −yaw: the point went the wrong way around the frame origin.", "function transformPoint(transform, point) { var rotated = rotateVector(point, -transform.yaw); return { x: rotated.x + transform.x, y: rotated.y + transform.y }; }"),
      ],
      hints: ["T_target_source turns source coordinates into target coordinates.", "A rigid transform rotates first, then translates.", "Rotate point by transform.yaw with rotateVector, then add transform.x and transform.y."],
      cases: [
        example([{ x: 3, y: 1, yaw: PI / 2 }, { x: 2, y: 0 }], { x: 3, y: 3 }, "rotate then shift"),
        example([{ x: -1, y: 4, yaw: PI }, { x: 2, y: -3 }], { x: -3, y: 7 }, "half-turn transform"),
        example([{ x: 0, y: 0, yaw: 0 }, { x: 5, y: -2 }], { x: 5, y: -2 }, "identity"),
        example([{ x: 1, y: 1, yaw: -PI / 2 }, { x: 0, y: 2 }], { x: 3, y: 1 }, "negative yaw"),
      ],
    }),
    puzzle({
      number: 7, id: "transform-vector", title: "Move a Vector Between Frames",
      goal: "Express a source-frame vector in target-frame coordinates.",
      concept: "Vectors are displacements: they rotate with the frame but ignore where its origin is.",
      functionName: "transformVector", signature: "transformVector(transform, vector) → vector",
      starterSource: starter("transformVector", "transform, vector", "Only the rotation applies to a vector."),
      referenceSource: "function transformVector(transform, vector) { return rotateVector(vector, transform.yaw); }",
      comparator: "vector2", walkthroughChapter: "data-types",
      dependencies: ["rotate-vector"],
      scene: { kind: "frame-vector", handles: [
        { id: "transform", type: "frame", label: "source", value: { x: 3, y: 1, yaw: PI / 2 } },
        { id: "vector", type: "vector", label: "v", value: { x: 2, y: 0 }, in: "transform" },
      ] },
      diagnoses: [diagnosis("translated", "A vector was translated: directions and displacements ignore where the frame origin is.", "function transformVector(transform, vector) { var r = rotateVector(vector, transform.yaw); return { x: r.x + transform.x, y: r.y + transform.y }; }")],
      hints: ["A vector is a displacement; moving the origin does not change it.", "Only the rotation part of the transform applies.", "Return rotateVector(vector, transform.yaw)."],
      cases: [
        example([{ x: 3, y: 1, yaw: PI / 2 }, { x: 2, y: 0 }], { x: 0, y: 2 }, "rotated only"),
        example([{ x: -1, y: 4, yaw: PI }, { x: 2, y: -3 }], { x: -2, y: 3 }, "half turn"),
        example([{ x: 10, y: 10, yaw: 0 }, { x: 1, y: 1 }], { x: 1, y: 1 }, "translation ignored"),
      ],
    }),
    puzzle({
      number: 8, id: "transform-pose", title: "Move a Pose Between Frames",
      goal: "Transform position and heading together.",
      concept: "A pose is a point plus a yaw; the yaws add and the sum is wrapped.",
      functionName: "transformPose", signature: "transformPose(transform, pose) → pose",
      starterSource: starter("transformPose", "transform, pose", "Transform the point, then compose the headings."),
      referenceSource: lines(
        "function transformPose(transform, pose) {",
        "  var point = transformPoint(transform, pose);",
        "  return { x: point.x, y: point.y, yaw: wrapAngle(transform.yaw + pose.yaw) };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "stamped-data",
      dependencies: ["transform-point", "wrap-angle"],
      scene: { kind: "frame-pose", handles: [
        { id: "transform", type: "frame", label: "source", value: { x: 2, y: 1, yaw: PI / 2 } },
        { id: "pose", type: "pose", label: "pose", value: { x: 1, y: 0, yaw: PI / 2 }, in: "transform" },
      ] },
      diagnoses: [diagnosis("yaw-not-composed", "Position moved but heading did not: add the frame's yaw to the pose's yaw.", "function transformPose(transform, pose) { var point = transformPoint(transform, pose); return { x: point.x, y: point.y, yaw: pose.yaw }; }")],
      hints: ["A pose is a point plus a heading.", "Transform the point, then add the yaws and wrap.", "Use transformPoint for x, y and wrapAngle(transform.yaw + pose.yaw) for yaw."],
      cases: [
        example([{ x: 2, y: 1, yaw: PI / 2 }, { x: 1, y: 0, yaw: PI / 2 }], { x: 2, y: 2, yaw: PI }, "pose composition"),
        example([{ x: 0, y: 0, yaw: 3 * PI / 4 }, { x: 0, y: 0, yaw: 3 * PI / 4 }], { x: 0, y: 0, yaw: -PI / 2 }, "yaw wrapping"),
        example([{ x: 1, y: -1, yaw: 0 }, { x: 2, y: 2, yaw: 0.3 }], { x: 3, y: 1, yaw: 0.3 }, "pure translation"),
      ],
    }),
    puzzle({
      number: 9, id: "compose", title: "Chain Two Transforms",
      goal: "Create T_a_c from T_a_b and T_b_c.",
      concept: "The right operand acts first; the child origin is pushed through the parent transform.",
      functionName: "compose", signature: "compose(aFromB, bFromC) → aFromC",
      starterSource: starter("compose", "aFromB, bFromC", "Push c's origin through aFromB, then add the yaws."),
      referenceSource: lines(
        "function compose(aFromB, bFromC) {",
        "  var origin = transformPoint(aFromB, { x: bFromC.x, y: bFromC.y });",
        "  return { x: origin.x, y: origin.y, yaw: wrapAngle(aFromB.yaw + bFromC.yaw) };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "composition",
      dependencies: ["transform-point", "wrap-angle"],
      scene: { kind: "frame-chain", handles: [
        { id: "aFromB", type: "frame", label: "b", value: { x: 2, y: 1, yaw: PI / 2 } },
        { id: "bFromC", type: "frame", label: "c", value: { x: 1.5, y: 0, yaw: PI / 4 }, in: "aFromB" },
      ] },
      diagnoses: [
        diagnosis("reversed-order", "Composed in the wrong order: the right operand acts first, so c's origin must be pushed through aFromB, not the other way round.", "function compose(aFromB, bFromC) { var origin = transformPoint(bFromC, { x: aFromB.x, y: aFromB.y }); return { x: origin.x, y: origin.y, yaw: wrapAngle(aFromB.yaw + bFromC.yaw) }; }"),
        diagnosis("translation-unrotated", "Child translation was not rotated by the parent yaw before adding.", "function compose(aFromB, bFromC) { return { x: aFromB.x + bFromC.x, y: aFromB.y + bFromC.y, yaw: wrapAngle(aFromB.yaw + bFromC.yaw) }; }"),
      ],
      hints: ["Follow the names: a←b then b←c gives a←c.", "The child's origin lives in b; move it into a with aFromB, then add the yaws.", "origin = transformPoint(aFromB, bFromC); yaw = wrapAngle(aFromB.yaw + bFromC.yaw)."],
      cases: [
        example([{ x: 10, y: 0, yaw: PI / 2 }, { x: 1, y: 0, yaw: PI / 2 }], { x: 10, y: 1, yaw: PI }, "turning chain"),
        example([{ x: 2, y: -1, yaw: -PI / 2 }, { x: 0, y: 3, yaw: PI }], { x: 5, y: -1, yaw: PI / 2 }, "order-sensitive chain"),
        example([{ x: 0, y: 0, yaw: 0 }, { x: 4, y: 2, yaw: 0.5 }], { x: 4, y: 2, yaw: 0.5 }, "identity parent"),
        example([{ x: 1, y: 1, yaw: PI }, { x: 1, y: 0, yaw: 0 }], { x: 0, y: 1, yaw: -PI }, "half-turn parent"),
      ],
    }),
    puzzle({
      number: 10, id: "invert", title: "Walk an Edge Backward",
      goal: "Invert a rigid transform so target and source exchange roles.",
      concept: "Negate the yaw, then express the reversed translation in the rotated frame.",
      functionName: "invert", signature: "invert(transform) → inverse",
      starterSource: starter("invert", "transform", "Negate yaw; rotate the negated translation by the negated yaw."),
      referenceSource: lines(
        "function invert(transform) {",
        "  var yaw = -transform.yaw;",
        "  var shifted = rotateVector({ x: -transform.x, y: -transform.y }, yaw);",
        "  return { x: shifted.x, y: shifted.y, yaw: yaw };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "composition",
      dependencies: ["rotate-vector"],
      scene: { kind: "frame-inverse", handles: [{ id: "transform", type: "frame", label: "b", value: { x: 3, y: 1, yaw: PI / 2 } }] },
      diagnoses: [
        diagnosis("negated-only", "Only negated: the reversed translation must also be rotated by −yaw.", "function invert(transform) { return { x: -transform.x, y: -transform.y, yaw: -transform.yaw }; }"),
        diagnosis("rotated-by-positive-yaw", "Rotated the reversed translation by +yaw instead of −yaw.", "function invert(transform) { var shifted = rotateVector({ x: -transform.x, y: -transform.y }, transform.yaw); return { x: shifted.x, y: shifted.y, yaw: -transform.yaw }; }"),
      ],
      hints: ["The inverse walks the same edge backward.", "Negate the yaw, then express the reversed translation in the rotated frame.", "yaw′ = −yaw; t′ = rotateVector(−t, yaw′)."],
      cases: [
        example([{ x: 3, y: 1, yaw: PI / 2 }], { x: -1, y: 3, yaw: -PI / 2 }, "quarter-turn inverse"),
        example([{ x: 2, y: -4, yaw: 0 }], { x: -2, y: 4, yaw: 0 }, "translation inverse"),
        example([{ x: 0, y: 0, yaw: PI / 3 }], { x: 0, y: 0, yaw: -PI / 3 }, "rotation inverse"),
        example([{ x: 1, y: 1, yaw: PI }], { x: 1, y: 1, yaw: -PI }, "half-turn inverse"),
      ],
    }),
    puzzle({
      number: 11, id: "relative-transform", title: "Where Is b, Seen From a?",
      goal: "Compute aFromB from two world poses.",
      concept: "This is lookup in miniature: go from b up to world, then from world down into a.",
      functionName: "relativeTransform", signature: "relativeTransform(worldFromA, worldFromB) → aFromB",
      starterSource: starter("relativeTransform", "worldFromA, worldFromB", "Invert a, then compose with b."),
      referenceSource: "function relativeTransform(worldFromA, worldFromB) { return compose(invert(worldFromA), worldFromB); }",
      comparator: "se2", walkthroughChapter: "lookup",
      dependencies: ["compose", "invert"],
      scene: { kind: "two-frames", handles: [
        { id: "worldFromA", type: "frame", label: "a", value: { x: -1.5, y: 0.5, yaw: PI / 4 } },
        { id: "worldFromB", type: "frame", label: "b", value: { x: 2, y: 1.5, yaw: -PI / 6 } },
      ] },
      diagnoses: [
        diagnosis("reversed", "Reversed: this is bFromA. aFromB expresses b in a's coordinates, so invert a and then apply b.", "function relativeTransform(worldFromA, worldFromB) { return compose(invert(worldFromB), worldFromA); }"),
        diagnosis("difference-only", "Subtracted world positions without rotating into a's frame.", "function relativeTransform(worldFromA, worldFromB) { return { x: worldFromB.x - worldFromA.x, y: worldFromB.y - worldFromA.y, yaw: wrapAngle(worldFromB.yaw - worldFromA.yaw) }; }"),
      ],
      hints: ["Where is b, as seen from a?", "Go from b up to world, then from world down into a: invert a, then compose.", "Return compose(invert(worldFromA), worldFromB)."],
      cases: [
        example([{ x: 1, y: 0, yaw: PI / 2 }, { x: 1, y: 2, yaw: PI / 2 }], { x: 2, y: 0, yaw: 0 }, "b ahead of a"),
        example([{ x: 0, y: 0, yaw: 0 }, { x: 3, y: 2, yaw: 0.5 }], { x: 3, y: 2, yaw: 0.5 }, "a is the world"),
        example([{ x: 2, y: 2, yaw: PI }, { x: 2, y: 0, yaw: PI }], { x: 0, y: 2, yaw: 0 }, "b beside a"),
      ],
    }),
  ];

  const ROBOT_TREE_CASE = {
    odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } },
    base_link: { parent: "odom", transform: { x: 2, y: 0, yaw: PI / 2 } },
    laser: { parent: "base_link", transform: { x: 1, y: 0, yaw: 0 } },
  };

  const STAGE_3_4 = [
    puzzle({
      number: 12, id: "store-edge", title: "Store One TF Edge",
      goal: "Store parentFromChild under the child name without mutating the current tree.",
      concept: "Every non-root frame has exactly one parent, so the child name is the key.",
      functionName: "storeEdge", signature: "storeEdge(tree, edge) → newTree",
      starterSource: starter("storeEdge", "tree, edge"),
      referenceSource: lines(
        "function storeEdge(tree, edge) {",
        "  var next = Object.assign({}, tree);",
        "  next[edge.child] = { parent: edge.parent, transform: edge.transform };",
        "  return next;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "tree",
      scene: { kind: "tree", view: "tree-result", handles: [
        { id: "edge", type: "selector", label: "edge to add", value: "base_link", options: ["odom", "base_link", "laser", "camera"] },
      ], args: [{ fixture: "treeWithoutEdge" }, { fixture: "selectedEdge" }] },
      hints: ["The child uniquely identifies its incoming edge.", "Copy the tree, then assign next[edge.child].", "Store both parent and parentFromChild transform under the child key."],
      cases: [
        example([{}, { parent: "map", child: "odom", transform: { x: 1, y: 0, yaw: 0 } }], { odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } } }, "first edge"),
        example([{ odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } } }, { parent: "odom", child: "base_link", transform: { x: 2, y: 0, yaw: 0 } }], { odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } }, base_link: { parent: "odom", transform: { x: 2, y: 0, yaw: 0 } } }, "second edge"),
        example([{ odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } } }, { parent: "base_link", child: "laser", transform: { x: 0.5, y: 0, yaw: 0 } }], { odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } }, laser: { parent: "base_link", transform: { x: 0.5, y: 0, yaw: 0 } } }, "detached edge"),
      ],
    }),
    puzzle({
      number: 13, id: "ancestor-chain", title: "Climb to the Root",
      goal: "List a frame and every ancestor until the root frame.",
      concept: "Each child record points one step upward; the root has no incoming edge.",
      functionName: "ancestorChain", signature: "ancestorChain(tree, frame) → frame[]",
      starterSource: starter("ancestorChain", "tree, frame"),
      referenceSource: lines(
        "function ancestorChain(tree, frame) {",
        "  var chain = [frame];",
        "  var current = frame;",
        "  while (tree[current]) { current = tree[current].parent; chain.push(current); }",
        "  return chain;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "tree",
      scene: { kind: "tree", view: "node-list", handles: [
        { id: "frame", type: "selector", label: "frame", value: "laser", options: FRAME_OPTIONS },
      ], args: [{ fixture: "tree" }, { handle: "frame" }] },
      hints: ["Each child record points one step upward.", "Repeat while tree[current] exists.", "Push the parent, make it current, and stop at a name with no incoming edge."],
      cases: [
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" }, laser: { parent: "base_link" } }, "laser"], ["laser", "base_link", "odom", "map"], "sensor chain"),
        example([{ child: { parent: "root" } }, "root"], ["root"], "already root"),
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" }, camera: { parent: "base_link" } }, "base_link"], ["base_link", "odom", "map"], "middle of the chain"),
      ],
    }),
    puzzle({
      number: 14, id: "common-ancestor", title: "Find the Join",
      goal: "Find the nearest frame shared by two ancestor chains.",
      concept: "Every lookup passes through exactly one nearest common ancestor.",
      functionName: "commonAncestor", signature: "commonAncestor(tree, a, b) → frame | null",
      starterSource: starter("commonAncestor", "tree, a, b"),
      referenceSource: lines(
        "function commonAncestor(tree, a, b) {",
        "  var aChain = ancestorChain(tree, a);",
        "  var bSet = new Set(ancestorChain(tree, b));",
        "  for (var i = 0; i < aChain.length; i += 1) { if (bSet.has(aChain[i])) return aChain[i]; }",
        "  return null;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "tree",
      dependencies: ["ancestor-chain"],
      scene: { kind: "tree", view: "single-node", handles: [
        { id: "a", type: "selector", label: "a", value: "laser", options: FRAME_OPTIONS },
        { id: "b", type: "selector", label: "b", value: "camera", options: FRAME_OPTIONS },
      ], args: [{ fixture: "tree" }, { handle: "a" }, { handle: "b" }] },
      hints: ["Start from one frame so the first match is the nearest.", "Put one chain in a Set, then scan the other from its frame upward.", "Return null when the roots are disconnected."],
      cases: [
        example([{ left: { parent: "base" }, right: { parent: "base" }, base: { parent: "map" } }, "left", "right"], "base", "sibling join"),
        example([{ a: { parent: "rootA" }, b: { parent: "rootB" } }, "a", "b"], null, "disconnected roots"),
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" }, laser: { parent: "base_link" } }, "laser", "odom"], "odom", "ancestor is the join"),
      ],
    }),
    puzzle({
      number: 15, id: "directed-path", title: "Mark the Traversal",
      goal: "Build source-to-target steps and mark when an edge must be inverted.",
      concept: "Child-to-parent uses the stored edge; parent-to-child needs its inverse.",
      functionName: "directedPath", signature: "directedPath(tree, target, source) → step[] | null",
      starterSource: starter("directedPath", "tree, target, source"),
      referenceSource: lines(
        "function directedPath(tree, target, source) {",
        "  var join = commonAncestor(tree, target, source);",
        "  if (join === null) return null;",
        "  var steps = [];",
        "  var current = source;",
        "  while (current !== join) { var up = tree[current]; steps.push({ from: current, to: up.parent, child: current, inverse: false }); current = up.parent; }",
        "  var targetChain = ancestorChain(tree, target);",
        "  var down = targetChain.slice(0, targetChain.indexOf(join)).reverse();",
        "  for (var i = 0; i < down.length; i += 1) { steps.push({ from: tree[down[i]].parent, to: down[i], child: down[i], inverse: true }); }",
        "  return steps;",
        "}"
      ),
      comparator: "path", walkthroughChapter: "lookup",
      dependencies: ["ancestor-chain", "common-ancestor"],
      scene: { kind: "tree", view: "steps", handles: [
        { id: "target", type: "selector", label: "target", value: "map", options: FRAME_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: FRAME_OPTIONS },
      ], args: [{ fixture: "tree" }, { handle: "target" }, { handle: "source" }] },
      hints: ["Walk source upward normally, then walk from the join down toward target.", "Child-to-parent uses stored parentFromChild; parent-to-child needs its inverse.", "Build the upward steps first, then reverse target's pre-join ancestor slice for downward steps."],
      cases: [
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" }, laser: { parent: "base_link" } }, "map", "laser"], [{ from: "laser", to: "base_link", child: "laser", inverse: false }, { from: "base_link", to: "odom", child: "base_link", inverse: false }, { from: "odom", to: "map", child: "odom", inverse: false }], "upward lookup"),
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" } }, "base_link", "map"], [{ from: "map", to: "odom", child: "odom", inverse: true }, { from: "odom", to: "base_link", child: "base_link", inverse: true }], "downward lookup"),
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" }, laser: { parent: "base_link" }, camera: { parent: "base_link" } }, "camera", "laser"], [{ from: "laser", to: "base_link", child: "laser", inverse: false }, { from: "base_link", to: "camera", child: "camera", inverse: true }], "sibling lookup"),
      ],
    }),
    puzzle({
      number: 16, id: "validate-tree", title: "Protect the Tree",
      goal: "Reject duplicate parents and cycles before accepting TF edges.",
      concept: "TF allows one parent per child and no frame may be its own ancestor.",
      functionName: "validateTree", signature: "validateTree(edges) → { valid, code? }",
      starterSource: starter("validateTree", "edges"),
      referenceSource: lines(
        "function validateTree(edges) {",
        "  var parents = {};",
        "  for (var i = 0; i < edges.length; i += 1) { if (parents[edges[i].child] && parents[edges[i].child] !== edges[i].parent) return { valid: false, code: \"DUPLICATE_PARENT\" }; parents[edges[i].child] = edges[i].parent; }",
        "  var children = Object.keys(parents);",
        "  for (var j = 0; j < children.length; j += 1) { var seen = new Set(); var current = children[j]; while (parents[current]) { if (seen.has(current)) return { valid: false, code: \"CYCLE\" }; seen.add(current); current = parents[current]; } }",
        "  return { valid: true };",
        "}"
      ),
      comparator: "error", walkthroughChapter: "tree",
      scene: { kind: "tree", view: "validation", handles: [
        { id: "edgeSet", type: "selector", label: "edge set", value: "duplicate-parent", options: ["valid-chain", "duplicate-parent", "cycle"] },
      ], args: [{ fixture: "edgeSet" }] },
      hints: ["TF allows only one parent for each child.", "After recording parents, walk upward from every child and watch for repeats.", "Return DUPLICATE_PARENT first; otherwise return CYCLE when an ancestor repeats."],
      cases: [
        example([[{ parent: "map", child: "base" }, { parent: "odom", child: "base" }]], { valid: false, code: "DUPLICATE_PARENT" }, "duplicate parent"),
        example([[{ parent: "a", child: "b" }, { parent: "b", child: "a" }]], { valid: false, code: "CYCLE" }, "cycle"),
        example([[{ parent: "map", child: "odom" }, { parent: "odom", child: "base" }]], { valid: true }, "valid chain"),
      ],
    }),
    puzzle({
      number: 17, id: "lookup-transform", title: "Resolve T_target_source",
      goal: "Compose each directed path step to answer a transform lookup.",
      concept: "Start with identity at the source; every step goes on the left, inverted when it walks downward.",
      functionName: "lookupTransform", signature: "lookupTransform(tree, target, source) → transform | null",
      starterSource: starter("lookupTransform", "tree, target, source"),
      referenceSource: lines(
        "function lookupTransform(tree, target, source) {",
        "  var steps = directedPath(tree, target, source);",
        "  if (steps === null) return null;",
        "  var result = { x: 0, y: 0, yaw: 0 };",
        "  for (var i = 0; i < steps.length; i += 1) {",
        "    var edge = tree[steps[i].child].transform;",
        "    var step = steps[i].inverse ? invert(edge) : edge;",
        "    result = compose(step, result);",
        "  }",
        "  return result;",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "lookup",
      dependencies: ["compose", "invert", "directed-path"],
      scene: { kind: "robot-chain", view: "lookup", handles: [
        { id: "odom", type: "frame", label: "odom", value: { x: 1, y: 0.5, yaw: 0.2 } },
        { id: "base_link", type: "frame", label: "base_link", value: { x: 2, y: 0, yaw: PI / 2 }, in: "odom" },
        { id: "target", type: "selector", label: "target", value: "map", options: CHAIN_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: CHAIN_OPTIONS },
      ], args: [{ fixture: "chainTree" }, { handle: "target" }, { handle: "source" }] },
      diagnoses: [
        diagnosis("inverse-flags-ignored", "Inverse flags ignored: a step that walks parent → child must use invert(edge).", lines(
          "function lookupTransform(tree, target, source) {",
          "  var steps = directedPath(tree, target, source);",
          "  if (steps === null) return null;",
          "  var result = { x: 0, y: 0, yaw: 0 };",
          "  for (var i = 0; i < steps.length; i += 1) { result = compose(tree[steps[i].child].transform, result); }",
          "  return result;",
          "}"
        )),
        diagnosis("reversed-composition", "Composed in the wrong order: each new step goes on the left, compose(step, result).", lines(
          "function lookupTransform(tree, target, source) {",
          "  var steps = directedPath(tree, target, source);",
          "  if (steps === null) return null;",
          "  var result = { x: 0, y: 0, yaw: 0 };",
          "  for (var i = 0; i < steps.length; i += 1) { var edge = tree[steps[i].child].transform; var step = steps[i].inverse ? invert(edge) : edge; result = compose(result, step); }",
          "  return result;",
          "}"
        )),
      ],
      hints: ["Start with identity at the source frame.", "For every step, invert only the downward traversal and left-compose it.", "result = compose(stepTransform, result)."],
      cases: [
        example([ROBOT_TREE_CASE, "map", "laser"], { x: 3, y: 1, yaw: PI / 2 }, "map from laser"),
        example([ROBOT_TREE_CASE, "laser", "map"], { x: -1, y: 3, yaw: -PI / 2 }, "laser from map"),
        example([ROBOT_TREE_CASE, "odom", "laser"], { x: 2, y: 1, yaw: PI / 2 }, "odom from laser"),
        example([{ a: { parent: "rootA", transform: { x: 0, y: 0, yaw: 0 } }, b: { parent: "rootB", transform: { x: 1, y: 0, yaw: 0 } } }, "a", "b"], null, "disconnected"),
      ],
    }),
    puzzle({
      number: 18, id: "laser-point-to-map", title: "Project a Laser Point",
      goal: "Transform a measurement from laser coordinates into map coordinates.",
      concept: "If the math is right, the projected hit stays glued to the landmark while the robot moves.",
      functionName: "laserPointToMap", signature: "laserPointToMap(tree, pointInLaser) → pointInMap",
      starterSource: starter("laserPointToMap", "tree, pointInLaser"),
      referenceSource: lines(
        "function laserPointToMap(tree, pointInLaser) {",
        "  var mapFromLaser = lookupTransform(tree, \"map\", \"laser\");",
        "  return transformPoint(mapFromLaser, pointInLaser);",
        "}"
      ),
      comparator: "vector2", walkthroughChapter: "sensor-scenario",
      dependencies: ["lookup-transform", "transform-point"],
      scene: { kind: "robot-chain", view: "landmark", handles: [
        { id: "odom", type: "frame", label: "odom", value: { x: 1, y: 0.5, yaw: 0.2 } },
        { id: "base_link", type: "frame", label: "base_link", value: { x: 1.5, y: 0, yaw: 0.6 }, in: "odom" },
      ], args: [{ fixture: "chainTree" }, { fixture: "laserHit" }] },
      diagnoses: [diagnosis("wrong-direction", "Wrong direction: you applied laserFromMap. The point starts in laser, so you need mapFromLaser (target first).", lines(
        "function laserPointToMap(tree, pointInLaser) {",
        "  var laserFromMap = lookupTransform(tree, \"laser\", \"map\");",
        "  return transformPoint(laserFromMap, pointInLaser);",
        "}"
      ))],
      hints: ["The point starts in laser and must end in map.", "Ask for mapFromLaser; the target name comes first.", "transformPoint(lookupTransform(tree, \"map\", \"laser\"), pointInLaser)."],
      cases: [
        example([{ odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } }, base_link: { parent: "odom", transform: { x: 2, y: 0, yaw: 0 } }, laser: { parent: "base_link", transform: { x: 0.5, y: 0, yaw: 0 } } }, { x: 1, y: 0 }], { x: 4.5, y: 0 }, "forward laser hit"),
        example([{ odom: { parent: "map", transform: { x: 0, y: 0, yaw: PI / 2 } }, base_link: { parent: "odom", transform: { x: 1, y: 0, yaw: 0 } }, laser: { parent: "base_link", transform: { x: 0, y: 0, yaw: 0 } } }, { x: 2, y: 0 }], { x: 0, y: 3 }, "rotated map frame"),
        example([ROBOT_TREE_CASE, { x: 0, y: 1 }], { x: 2, y: 1 }, "sideways hit"),
      ],
    }),
    puzzle({
      number: 19, id: "correction-from-pose", title: "Publish map → odom",
      goal: "Turn a corrected robot pose into the map → odom transform without touching odom → base_link.",
      concept: "A localizer or SLAM node never rewrites odometry; it publishes the correction above it.",
      functionName: "correctionFromPose", signature: "correctionFromPose(mapFromBase, odomFromBase) → mapFromOdom",
      starterSource: starter("correctionFromPose", "mapFromBase, odomFromBase"),
      referenceSource: "function correctionFromPose(mapFromBase, odomFromBase) { return compose(mapFromBase, invert(odomFromBase)); }",
      comparator: "se2", walkthroughChapter: "frame-roles",
      dependencies: ["compose", "invert"],
      scene: { kind: "correction", handles: [
        { id: "odomInMap", type: "frame", label: "odom (drifted)", value: { x: 1.5, y: -0.5, yaw: 0.35 } },
        { id: "odomFromBase", type: "pose", label: "base_link (odometry)", value: { x: 2, y: 0.5, yaw: 0.2 }, in: "odomInMap" },
      ], args: [{ fixture: "mapFromBase" }, { handle: "odomFromBase" }] },
      diagnoses: [
        diagnosis("reversed", "Reversed: that is odomFromMap. map → odom must satisfy mapFromBase = compose(mapFromOdom, odomFromBase).", "function correctionFromPose(mapFromBase, odomFromBase) { return compose(odomFromBase, invert(mapFromBase)); }"),
        diagnosis("difference-only", "Subtracted poses component-wise: the odometry translation must be rotated by the yaw correction first.", "function correctionFromPose(mapFromBase, odomFromBase) { return { x: mapFromBase.x - odomFromBase.x, y: mapFromBase.y - odomFromBase.y, yaw: wrapAngle(mapFromBase.yaw - odomFromBase.yaw) }; }"),
      ],
      hints: ["mapFromBase = mapFromOdom ∘ odomFromBase; solve for mapFromOdom.", "Right-multiply both sides by invert(odomFromBase).", "Return compose(mapFromBase, invert(odomFromBase))."],
      cases: [
        example([{ x: 5, y: 3, yaw: PI / 2 }, { x: 2, y: 0, yaw: 0 }], { x: 5, y: 1, yaw: PI / 2 }, "rotated correction"),
        example([{ x: 0, y: 2, yaw: PI / 2 }, { x: 2, y: 0, yaw: 0 }], { x: 0, y: 0, yaw: PI / 2 }, "global yaw correction"),
        example([{ x: 3, y: 3, yaw: 0 }, { x: 3, y: 3, yaw: 0 }], { x: 0, y: 0, yaw: 0 }, "no drift"),
        example([{ x: 1, y: 1, yaw: PI }, { x: 0, y: 0, yaw: PI / 2 }], { x: 1, y: 1, yaw: PI / 2 }, "pure yaw drift"),
      ],
    }),
  ];

  const SAMPLE_HISTORY = [
    { time: 0, transform: { x: 0, y: 0, yaw: 0 } },
    { time: 2, transform: { x: 2, y: 0, yaw: 0 } },
    { time: 5, transform: { x: 5, y: 0, yaw: 0 } },
    { time: 9, transform: { x: 9, y: 0, yaw: 0 } },
  ];
  const DYNAMIC_EDGE_CASE = {
    parent: "map", child: "odom",
    samples: [
      { time: 0, transform: { x: 0, y: 0, yaw: 0 } },
      { time: 4, transform: { x: 4, y: 0, yaw: PI / 2 } },
      { time: 10, transform: { x: 4, y: 6, yaw: PI / 2 } },
    ],
  };
  const STAMPED_EDGES_CASE = [
    { parent: "map", child: "odom", samples: [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 10, transform: { x: 10, y: 0, yaw: 0 } }] },
    { parent: "odom", child: "base_link", samples: [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 6, transform: { x: 6, y: 0, yaw: 0 } }] },
    { parent: "base_link", child: "laser", isStatic: true, transform: { x: 1, y: 0, yaw: 0 } },
  ];
  const HALF = Math.SQRT1_2;
  const Z90 = { x: 0, y: 0, z: HALF, w: HALF };
  const Y90 = { x: 0, y: HALF, z: 0, w: HALF };
  const IDENTITY_Q = { x: 0, y: 0, z: 0, w: 1 };

  const STAGE_5_7 = [
    puzzle({
      number: 20, id: "interpolate-transform", title: "Blend Two Poses",
      goal: "Interpolate translation linearly and yaw along the shortest turn.",
      concept: "TF2 blends between the two samples that surround a query time.",
      functionName: "interpolateTransform", signature: "interpolateTransform(a, b, amount) → transform",
      starterSource: starter("interpolateTransform", "a, b, amount"),
      referenceSource: lines(
        "function interpolateTransform(a, b, amount) {",
        "  return { x: a.x + (b.x - a.x) * amount, y: a.y + (b.y - a.y) * amount, yaw: wrapAngle(a.yaw + yawDelta(a.yaw, b.yaw) * amount) };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "time-buffer",
      dependencies: ["yaw-delta", "wrap-angle"],
      scene: { kind: "pose-lerp", handles: [
        { id: "a", type: "pose", label: "a", value: { x: -3, y: -1, yaw: 2.9 } },
        { id: "b", type: "pose", label: "b", value: { x: 2.5, y: 1.5, yaw: -2.7 } },
        { id: "amount", type: "slider", label: "amount", value: 0.5, min: 0, max: 1 },
      ] },
      diagnoses: [
        diagnosis("yaw-long-way", "Yaw went the long way around: use yawDelta so the turn crosses ±π on the short side.", "function interpolateTransform(a, b, amount) { return { x: a.x + (b.x - a.x) * amount, y: a.y + (b.y - a.y) * amount, yaw: wrapAngle(a.yaw + (b.yaw - a.yaw) * amount) }; }"),
        diagnosis("amount-inverted", "Amount inverted: amount 0 must return a and amount 1 must return b.", "function interpolateTransform(a, b, amount) { return { x: b.x + (a.x - b.x) * amount, y: b.y + (a.y - b.y) * amount, yaw: wrapAngle(b.yaw + yawDelta(b.yaw, a.yaw) * amount) }; }"),
      ],
      hints: ["amount 0 selects a; amount 1 selects b.", "Blend x and y linearly; blend yaw along yawDelta(a.yaw, b.yaw).", "yaw = wrapAngle(a.yaw + yawDelta(a.yaw, b.yaw) * amount)."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, { x: 4, y: 2, yaw: PI / 2 }, 0.5], { x: 2, y: 1, yaw: PI / 4 }, "midpoint"),
        example([{ x: 0, y: 2, yaw: 170 * PI / 180 }, { x: 10, y: 6, yaw: -170 * PI / 180 }, 0.5], { x: 5, y: 4, yaw: PI }, "across the wrap"),
        example([{ x: -4, y: 8, yaw: 0.5 }, { x: 2, y: -4, yaw: 0.5 }, 0.5], { x: -1, y: 2, yaw: 0.5 }, "constant yaw"),
        example([{ x: 1, y: 1, yaw: 1 }, { x: 2, y: 2, yaw: 2 }, 0], { x: 1, y: 1, yaw: 1 }, "amount zero"),
      ],
    }),
    puzzle({
      number: 21, id: "bracket-samples", title: "Find the Surrounding Samples",
      goal: "Locate the two samples around a time and the fraction between them.",
      concept: "A buffer answers a time by bracketing it, then interpolating.",
      functionName: "bracketSamples", signature: "bracketSamples(samples, time) → { beforeIndex, afterIndex, amount }",
      starterSource: starter("bracketSamples", "samples, time"),
      referenceSource: lines(
        "function bracketSamples(samples, time) {",
        "  var last = samples.length - 1;",
        "  if (time < samples[0].time) return { beforeIndex: 0, afterIndex: 0, amount: 0 };",
        "  if (time >= samples[last].time) return { beforeIndex: last, afterIndex: last, amount: 0 };",
        "  var i = 0;",
        "  while (samples[i + 1].time <= time) i += 1;",
        "  return { beforeIndex: i, afterIndex: i + 1, amount: (time - samples[i].time) / (samples[i + 1].time - samples[i].time) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "time-buffer",
      scene: { kind: "timeline", handles: [
        { id: "time", type: "timeline", label: "time", value: 3.4, start: -1, end: 11 },
      ], args: [{ fixture: "samples" }, { handle: "time" }] },
      diagnoses: [diagnosis("amount-unnormalized", "Amount is not normalized: divide by the gap between the two samples so it runs from 0 to 1.", lines(
        "function bracketSamples(samples, time) {",
        "  var last = samples.length - 1;",
        "  if (time < samples[0].time) return { beforeIndex: 0, afterIndex: 0, amount: 0 };",
        "  if (time >= samples[last].time) return { beforeIndex: last, afterIndex: last, amount: 0 };",
        "  var i = 0;",
        "  while (samples[i + 1].time <= time) i += 1;",
        "  return { beforeIndex: i, afterIndex: i + 1, amount: time - samples[i].time };",
        "}"
      ))],
      hints: ["Find the two samples that surround the time.", "amount = (time − before.time) / (after.time − before.time); clamp outside the history.", "Walk the samples while the next one is still at or before time."],
      cases: [
        example([SAMPLE_HISTORY, 3], { beforeIndex: 1, afterIndex: 2, amount: 1 / 3 }, "between samples"),
        example([SAMPLE_HISTORY, 2], { beforeIndex: 1, afterIndex: 2, amount: 0 }, "exactly on a sample"),
        example([SAMPLE_HISTORY, -1], { beforeIndex: 0, afterIndex: 0, amount: 0 }, "before the history"),
        example([SAMPLE_HISTORY, 12], { beforeIndex: 3, afterIndex: 3, amount: 0 }, "after the history"),
        example([SAMPLE_HISTORY, 0], { beforeIndex: 0, afterIndex: 1, amount: 0 }, "on the first sample"),
      ],
    }),
    puzzle({
      number: 22, id: "latest-common-time", title: "Find a Valid Query Time",
      goal: "Intersect dynamic buffer ranges and classify past or future extrapolation.",
      concept: "TimePointZero means the latest time every edge on the path can answer.",
      functionName: "latestCommonTime", signature: "latestCommonTime(ranges, requestedTime) → availability",
      starterSource: starter("latestCommonTime", "ranges, requestedTime"),
      referenceSource: lines(
        "function latestCommonTime(ranges, requestedTime) {",
        "  var start = Math.max.apply(null, ranges.map(function (range) { return range.start; }));",
        "  var end = Math.min.apply(null, ranges.map(function (range) { return range.end; }));",
        "  if (start > end) return { ok: false, code: \"NO_COMMON_TIME\", bounds: { start: start, end: end } };",
        "  var time = requestedTime === null ? end : requestedTime;",
        "  if (time < start) return { ok: false, code: \"PAST_EXTRAPOLATION\", bounds: { start: start, end: end } };",
        "  if (time > end) return { ok: false, code: \"FUTURE_EXTRAPOLATION\", bounds: { start: start, end: end } };",
        "  return { ok: true, time: time, bounds: { start: start, end: end } };",
        "}"
      ),
      comparator: "error", walkthroughChapter: "time-buffer",
      scene: { kind: "timeline-ranges", handles: [
        { id: "requested", type: "timeline", label: "requested time", value: 5, start: 0, end: 10 },
        { id: "mode", type: "selector", label: "time", value: "requested", options: ["requested", "latest"] },
      ], args: [{ fixture: "ranges" }, { fixture: "requestedOrNull" }] },
      hints: ["The common start is the maximum start; the common end is the minimum end.", "No overlap occurs when the common start exceeds the common end.", "Use the common end for latest; classify requests below start as past and above end as future."],
      cases: [
        example([[{ start: 0, end: 8 }, { start: 2, end: 6 }], null], { ok: true, time: 6, bounds: { start: 2, end: 6 } }, "latest overlap"),
        example([[{ start: 2, end: 4 }], 1], { ok: false, code: "PAST_EXTRAPOLATION", bounds: { start: 2, end: 4 } }, "past request"),
        example([[{ start: 0, end: 1 }, { start: 2, end: 3 }], null], { ok: false, code: "NO_COMMON_TIME", bounds: { start: 2, end: 1 } }, "no overlap"),
        example([[{ start: 0, end: 5 }], 8], { ok: false, code: "FUTURE_EXTRAPOLATION", bounds: { start: 0, end: 5 } }, "future request"),
      ],
    }),
    puzzle({
      number: 23, id: "sample-edge", title: "Sample an Edge at a Time",
      goal: "Return the transform an edge reports at a time: static passthrough or bracketed interpolation.",
      concept: "Static edges are valid at every time; dynamic edges interpolate their history.",
      functionName: "sampleEdge", signature: "sampleEdge(edge, time) → transform",
      starterSource: starter("sampleEdge", "edge, time"),
      referenceSource: lines(
        "function sampleEdge(edge, time) {",
        "  if (edge.isStatic) return { x: edge.transform.x, y: edge.transform.y, yaw: edge.transform.yaw };",
        "  var bracket = bracketSamples(edge.samples, time);",
        "  return interpolateTransform(edge.samples[bracket.beforeIndex].transform, edge.samples[bracket.afterIndex].transform, bracket.amount);",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "broadcasters",
      dependencies: ["bracket-samples", "interpolate-transform"],
      scene: { kind: "timeline-frame", handles: [
        { id: "time", type: "timeline", label: "time", value: 2.5, start: -1, end: 11 },
        { id: "edgeKind", type: "selector", label: "edge", value: "dynamic", options: ["dynamic", "static"] },
      ], args: [{ fixture: "edge" }, { handle: "time" }] },
      diagnoses: [diagnosis("nearest-sample", "Snapped to the nearest sample: TF2 interpolates between the surrounding samples.", lines(
        "function sampleEdge(edge, time) {",
        "  if (edge.isStatic) return { x: edge.transform.x, y: edge.transform.y, yaw: edge.transform.yaw };",
        "  var bracket = bracketSamples(edge.samples, time);",
        "  var index = bracket.amount < 0.5 ? bracket.beforeIndex : bracket.afterIndex;",
        "  var t = edge.samples[index].transform;",
        "  return { x: t.x, y: t.y, yaw: t.yaw };",
        "}"
      ))],
      hints: ["A static edge ignores time.", "Bracket the samples, then interpolate between the two transforms.", "interpolateTransform(before.transform, after.transform, bracket.amount)."],
      cases: [
        example([DYNAMIC_EDGE_CASE, 2], { x: 2, y: 0, yaw: PI / 4 }, "halfway through the first segment"),
        example([DYNAMIC_EDGE_CASE, 7], { x: 4, y: 3, yaw: PI / 2 }, "second segment"),
        example([DYNAMIC_EDGE_CASE, 12], { x: 4, y: 6, yaw: PI / 2 }, "clamped after the history"),
        example([{ parent: "base_link", child: "laser", isStatic: true, transform: { x: 1, y: 0, yaw: 0 } }, 99], { x: 1, y: 0, yaw: 0 }, "static edge"),
      ],
    }),
    puzzle({
      number: 24, id: "quaternion-multiply", title: "Multiply Quaternions",
      goal: "Compute the Hamilton product a × b.",
      concept: "Rotations compose by quaternion multiplication, and the order matters.",
      functionName: "quaternionMultiply", signature: "quaternionMultiply(a, b) → quaternion",
      starterSource: starter("quaternionMultiply", "a, b"),
      referenceSource: lines(
        "function quaternionMultiply(a, b) {",
        "  return {",
        "    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,",
        "    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,",
        "    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,",
        "    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,",
        "  };",
        "}"
      ),
      comparator: "quaternion", walkthroughChapter: "se3",
      scene: { kind: "se3", view: "multiply", handles: [
        { id: "yawA", type: "slider", label: "a: yaw about Z", value: PI / 2, min: -PI, max: PI },
        { id: "pitchB", type: "slider", label: "b: pitch about Y", value: PI / 4, min: -PI / 2, max: PI / 2 },
      ], args: [{ fixture: "quatA" }, { fixture: "quatB" }] },
      diagnoses: [
        diagnosis("reversed-order", "Multiplied in the wrong order: quaternion products do not commute; compute a × b with a on the left.", lines(
          "function quaternionMultiply(b, a) {",
          "  return { x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y, y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x, z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w, w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z };",
          "}"
        )),
        diagnosis("component-sum", "Added components: rotations compose by the Hamilton product, not by adding quaternions.", "function quaternionMultiply(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z, w: a.w + b.w }; }"),
      ],
      hints: ["A quaternion is a scalar w plus a vector (x, y, z).", "w′ = w₁w₂ − v₁·v₂; v′ = w₁v₂ + w₂v₁ + v₁×v₂.", "Write the four component formulas of the Hamilton product with a on the left."],
      cases: [
        example([Z90, Z90], { x: 0, y: 0, z: 1, w: 0 }, "two quarter turns"),
        example([IDENTITY_Q, Z90], Z90, "identity on the left"),
        example([Z90, Y90], { x: -0.5, y: 0.5, z: 0.5, w: 0.5 }, "Z then Y"),
        example([{ x: 0, y: 0, z: 0, w: 2 }, { x: 0, y: 0, z: 0, w: 3 }], { x: 0, y: 0, z: 0, w: 6 }, "scalars multiply"),
      ],
    }),
    puzzle({
      number: 25, id: "rotate-by-quaternion", title: "Rotate with a Quaternion",
      goal: "Normalize a quaternion and rotate a 3D vector with it.",
      concept: "q v q⁻¹ rotates the pure quaternion v; the conjugate of a unit quaternion is its inverse.",
      functionName: "rotateByQuaternion", signature: "rotateByQuaternion(q, v) → vector3",
      starterSource: starter("rotateByQuaternion", "q, v"),
      referenceSource: lines(
        "function rotateByQuaternion(q, v) {",
        "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  var unit = { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };",
        "  var conjugate = { x: -unit.x, y: -unit.y, z: -unit.z, w: unit.w };",
        "  var rotated = quaternionMultiply(quaternionMultiply(unit, { x: v.x, y: v.y, z: v.z, w: 0 }), conjugate);",
        "  return { x: rotated.x, y: rotated.y, z: rotated.z };",
        "}"
      ),
      comparator: "vector3", walkthroughChapter: "se3",
      dependencies: ["quaternion-multiply"],
      scene: { kind: "se3", view: "rotate", handles: [
        { id: "yaw", type: "slider", label: "q: yaw about Z", value: PI / 2, min: -PI, max: PI },
      ], args: [{ fixture: "quat" }, { fixture: "vector" }] },
      diagnoses: [
        diagnosis("inverse-rotation", "Rotated the wrong way: q⁻¹ v q is the inverse rotation. Use q v q⁻¹.", lines(
          "function rotateByQuaternion(q, v) {",
          "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  var unit = { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };",
          "  var conjugate = { x: -unit.x, y: -unit.y, z: -unit.z, w: unit.w };",
          "  var rotated = quaternionMultiply(quaternionMultiply(conjugate, { x: v.x, y: v.y, z: v.z, w: 0 }), unit);",
          "  return { x: rotated.x, y: rotated.y, z: rotated.z };",
          "}"
        )),
        diagnosis("not-normalized", "The quaternion was not normalized first, so the vector length was scaled.", lines(
          "function rotateByQuaternion(q, v) {",
          "  var conjugate = { x: -q.x, y: -q.y, z: -q.z, w: q.w };",
          "  var rotated = quaternionMultiply(quaternionMultiply(q, { x: v.x, y: v.y, z: v.z, w: 0 }), conjugate);",
          "  return { x: rotated.x, y: rotated.y, z: rotated.z };",
          "}"
        )),
      ],
      hints: ["A valid rotation quaternion has unit length.", "Treat v as a pure quaternion with w = 0 and compute q v q⁻¹.", "For a unit q, q⁻¹ is the conjugate (−x, −y, −z, w)."],
      cases: [
        example([Z90, { x: 1, y: 0, z: 0 }], { x: 0, y: 1, z: 0 }, "Z quarter turn"),
        example([{ x: 0, y: 0, z: 0, w: 2 }, { x: 1, y: -2, z: 3 }], { x: 1, y: -2, z: 3 }, "non-unit identity"),
        example([Y90, { x: 0, y: 0, z: 1 }], { x: 1, y: 0, z: 0 }, "Y quarter turn"),
      ],
    }),
    puzzle({
      number: 26, id: "compose-se3", title: "Compose SE(3)",
      goal: "Rotate the child translation, add it to the parent translation, and multiply rotations.",
      concept: "SE(3) composition has the same rotate-then-translate structure as SE(2).",
      functionName: "composeSE3", signature: "composeSE3(aFromB, bFromC) → aFromC",
      starterSource: starter("composeSE3", "aFromB, bFromC"),
      referenceSource: lines(
        "function composeSE3(aFromB, bFromC) {",
        "  var shifted = rotateByQuaternion(aFromB.rotation, bFromC.translation);",
        "  var q = quaternionMultiply(aFromB.rotation, bFromC.rotation);",
        "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  return {",
        "    translation: { x: aFromB.translation.x + shifted.x, y: aFromB.translation.y + shifted.y, z: aFromB.translation.z + shifted.z },",
        "    rotation: { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length },",
        "  };",
        "}"
      ),
      comparator: "se3", walkthroughChapter: "se3",
      dependencies: ["rotate-by-quaternion", "quaternion-multiply"],
      scene: { kind: "se3", view: "compose", handles: [
        { id: "yawA", type: "slider", label: "a→b: yaw about Z", value: PI / 2, min: -PI, max: PI },
        { id: "pitchB", type: "slider", label: "b→c: pitch about Y", value: PI / 4, min: -PI / 2, max: PI / 2 },
      ], args: [{ fixture: "aFromB" }, { fixture: "bFromC" }] },
      diagnoses: [diagnosis("translation-unrotated", "Child translation was not rotated by the parent rotation before adding.", lines(
        "function composeSE3(aFromB, bFromC) {",
        "  var q = quaternionMultiply(aFromB.rotation, bFromC.rotation);",
        "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  return { translation: { x: aFromB.translation.x + bFromC.translation.x, y: aFromB.translation.y + bFromC.translation.y, z: aFromB.translation.z + bFromC.translation.z }, rotation: { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length } };",
        "}"
      ))],
      hints: ["SE(3) composition has the same rotate-then-translate structure as SE(2).", "Rotate bFromC.translation by aFromB.rotation before adding.", "Multiply quaternions parent × child and normalize the result."],
      cases: [
        example([{ translation: { x: 1, y: 0, z: 0 }, rotation: IDENTITY_Q }, { translation: { x: 0, y: 2, z: 0 }, rotation: IDENTITY_Q }], { translation: { x: 1, y: 2, z: 0 }, rotation: IDENTITY_Q }, "translation chain"),
        example([{ translation: { x: 1, y: 0, z: 0 }, rotation: Z90 }, { translation: { x: 1, y: 0, z: 0 }, rotation: IDENTITY_Q }], { translation: { x: 1, y: 1, z: 0 }, rotation: Z90 }, "rotated child translation"),
        example([{ translation: { x: 0, y: 0, z: 1 }, rotation: Y90 }, { translation: { x: 1, y: 0, z: 0 }, rotation: IDENTITY_Q }], { translation: { x: 0, y: 0, z: 0 }, rotation: Y90 }, "pitch pushes X down"),
      ],
    }),
    puzzle({
      number: 27, id: "stamped-lookup", title: "Answer a Stamped Lookup",
      goal: "Resolve a source-to-target transform at a requested or latest common time.",
      concept: "A lookup is a pipeline: choose the time, sample every edge, build the tree, traverse.",
      functionName: "lookupStampedTransform", signature: "lookupStampedTransform(edges, target, source, requestedTime) → result",
      starterSource: starter("lookupStampedTransform", "edges, target, source, requestedTime"),
      referenceSource: lines(
        "function lookupStampedTransform(edges, target, source, requestedTime) {",
        "  var ranges = [];",
        "  for (var i = 0; i < edges.length; i += 1) {",
        "    if (!edges[i].isStatic) ranges.push({ start: edges[i].samples[0].time, end: edges[i].samples[edges[i].samples.length - 1].time });",
        "  }",
        "  var availability = ranges.length ? latestCommonTime(ranges, requestedTime) : { ok: true, time: requestedTime === null ? 0 : requestedTime };",
        "  if (!availability.ok) return availability;",
        "  var tree = {};",
        "  for (var j = 0; j < edges.length; j += 1) {",
        "    tree = storeEdge(tree, { parent: edges[j].parent, child: edges[j].child, transform: sampleEdge(edges[j], availability.time) });",
        "  }",
        "  return { ok: true, time: availability.time, transform: lookupTransform(tree, target, source) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sandbox",
      dependencies: ["sample-edge", "latest-common-time", "store-edge", "lookup-transform"],
      scene: { kind: "robot-chain-time", handles: [
        { id: "time", type: "timeline", label: "requested time", value: 4, start: 0, end: 10 },
        { id: "mode", type: "selector", label: "time", value: "requested", options: ["requested", "latest"] },
        { id: "target", type: "selector", label: "target", value: "map", options: CHAIN_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: CHAIN_OPTIONS },
      ], args: [{ fixture: "stampedEdges" }, { handle: "target" }, { handle: "source" }, { fixture: "requestedOrNull" }] },
      hints: ["A lookup is a pipeline: choose time, sample edges, build the tree, traverse.", "Use the intersection of all dynamic histories; static edges are valid at every time.", "sampleEdge every edge at the resolved time, storeEdge each one, then lookupTransform on the sampled tree."],
      cases: [
        example([STAMPED_EDGES_CASE, "map", "laser", null], { ok: true, time: 6, transform: { x: 13, y: 0, yaw: 0 } }, "latest stamped lookup"),
        example([[{ parent: "map", child: "odom", samples: [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 5, transform: { x: 5, y: 0, yaw: 0 } }] }], "map", "odom", 8], { ok: false, code: "FUTURE_EXTRAPOLATION", bounds: { start: 0, end: 5 } }, "future request"),
        example([STAMPED_EDGES_CASE, "map", "base_link", 3], { ok: true, time: 3, transform: { x: 6, y: 0, yaw: 0 } }, "interpolated request"),
        example([STAMPED_EDGES_CASE, "laser", "map", null], { ok: true, time: 6, transform: { x: -13, y: 0, yaw: 0 } }, "inverse direction"),
      ],
    }),
  ];

  const IDENTITY_3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const ROT90_T31 = [[0, -1, 3], [1, 0, 1], [0, 0, 1]];

  const TOOLKIT_8 = [
    puzzle({
      number: 28, id: "rot-mat-2d", track: "toolkit", title: "Rotation as a Matrix",
      goal: "Build the 2×2 rotation matrix for a yaw angle.",
      concept: "The columns are the rotated x and y axes; rotateVector was this matrix all along.",
      functionName: "rotMat2d", signature: "rotMat2d(yaw) → [[c, -s], [s, c]]",
      starterSource: starter("rotMat2d", "yaw", "Row-major nested arrays: first row [cos, -sin], second row [sin, cos]."),
      referenceSource: "function rotMat2d(yaw) { var c = Math.cos(yaw), s = Math.sin(yaw); return [[c, -s], [s, c]]; }",
      comparator: "deep", walkthroughChapter: "matrix-stack",
      reference: pyref("utils/angle.py", "rot_mat_2d"),
      scene: { kind: "matrix", view: "rotation", handles: [{ id: "yaw", type: "dial", label: "yaw", value: 0.7 }] },
      diagnoses: [diagnosis("transposed", "Transposed: that matrix rotates by −yaw. The first row is [cos, −sin].", "function rotMat2d(yaw) { var c = Math.cos(yaw), s = Math.sin(yaw); return [[c, s], [-s, c]]; }")],
      hints: ["The first column is where the x axis goes: (cos, sin).", "Row-major: row 0 is [cos, −sin], row 1 is [sin, cos].", "Return [[Math.cos(yaw), -Math.sin(yaw)], [Math.sin(yaw), Math.cos(yaw)]]."],
      cases: [
        example([PI / 2], [[0, -1], [1, 0]], "quarter turn"),
        example([0], [[1, 0], [0, 1]], "identity"),
        example([PI], [[-1, 0], [0, -1]], "half turn"),
        example([-PI / 4], [[Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, Math.SQRT1_2]], "negative yaw"),
      ],
    }),
    puzzle({
      number: 29, id: "homogeneous-from-pose", track: "toolkit", title: "Pose to Homogeneous Matrix",
      goal: "Pack a pose into a 3×3 homogeneous matrix.",
      concept: "Rotation in the top-left, translation in the last column, [0 0 1] on the bottom: that is what the p5 matrix stack multiplies.",
      functionName: "homogeneousFromPose", signature: "homogeneousFromPose(transform) → 3×3",
      starterSource: starter("homogeneousFromPose", "transform", "Reuse rotMat2d for the top-left block."),
      referenceSource: lines(
        "function homogeneousFromPose(transform) {",
        "  var r = rotMat2d(transform.yaw);",
        "  return [[r[0][0], r[0][1], transform.x], [r[1][0], r[1][1], transform.y], [0, 0, 1]];",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "matrix-stack",
      dependencies: ["rot-mat-2d"],
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "update_homogeneous_matrix"),
      scene: { kind: "matrix", view: "pose", handles: [{ id: "transform", type: "frame", label: "pose", value: { x: 2, y: 1, yaw: PI / 3 } }] },
      diagnoses: [diagnosis("translation-in-last-row", "Translation landed in the bottom row: column vectors need it in the last column.", lines(
        "function homogeneousFromPose(transform) {",
        "  var r = rotMat2d(transform.yaw);",
        "  return [[r[0][0], r[0][1], 0], [r[1][0], r[1][1], 0], [transform.x, transform.y, 1]];",
        "}"
      ))],
      hints: ["The matrix must move [x, y, 1] the way transformPoint does.", "Top-left 2×2 is the rotation, last column is (x, y, 1).", "[[c, −s, x], [s, c, y], [0, 0, 1]]."],
      cases: [
        example([{ x: 2, y: 1, yaw: 0 }], [[1, 0, 2], [0, 1, 1], [0, 0, 1]], "pure translation"),
        example([{ x: 0, y: 0, yaw: PI / 2 }], [[0, -1, 0], [1, 0, 0], [0, 0, 1]], "pure rotation"),
        example([{ x: -3, y: 4, yaw: PI }], [[-1, 0, -3], [0, -1, 4], [0, 0, 1]], "half turn with offset"),
      ],
    }),
    puzzle({
      number: 30, id: "mat-mul-3", track: "toolkit", title: "Multiply Homogeneous Matrices",
      goal: "Multiply two 3×3 matrices; the right operand acts first, exactly like compose.",
      concept: "push(); translate(); rotate(); is matrix multiplication in disguise.",
      functionName: "matMul3", signature: "matMul3(a, b) → 3×3",
      starterSource: starter("matMul3", "a, b", "result[i][j] = sum over k of a[i][k] * b[k][j]."),
      referenceSource: lines(
        "function matMul3(a, b) {",
        "  var result = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];",
        "  for (var i = 0; i < 3; i += 1) {",
        "    for (var j = 0; j < 3; j += 1) {",
        "      for (var k = 0; k < 3; k += 1) result[i][j] += a[i][k] * b[k][j];",
        "    }",
        "  }",
        "  return result;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "composition",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "update_homogeneous_matrix (Hin @ H)"),
      scene: { kind: "matrix", view: "chain", handles: [
        { id: "aFromB", type: "frame", label: "b", value: { x: 2, y: 1, yaw: PI / 2 } },
        { id: "bFromC", type: "frame", label: "c", value: { x: 1.5, y: 0, yaw: PI / 4 }, in: "aFromB" },
      ], args: [{ fixture: "matrixA" }, { fixture: "matrixB" }] },
      diagnoses: [
        diagnosis("reversed-order", "Multiplied b × a: matrix products do not commute; a is on the left.", lines(
          "function matMul3(a, b) {",
          "  var result = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];",
          "  for (var i = 0; i < 3; i += 1) for (var j = 0; j < 3; j += 1) for (var k = 0; k < 3; k += 1) result[i][j] += b[i][k] * a[k][j];",
          "  return result;",
          "}"
        )),
        diagnosis("element-wise", "Multiplied element by element: a matrix product sums over the inner index.", "function matMul3(a, b) { return [[a[0][0]*b[0][0], a[0][1]*b[0][1], a[0][2]*b[0][2]], [a[1][0]*b[1][0], a[1][1]*b[1][1], a[1][2]*b[1][2]], [a[2][0]*b[2][0], a[2][1]*b[2][1], a[2][2]*b[2][2]]]; }"),
      ],
      hints: ["Each output entry is a row of a dotted with a column of b.", "Three nested loops over i, j, k.", "result[i][j] += a[i][k] * b[k][j]."],
      cases: [
        example([[[0, -1, 10], [1, 0, 0], [0, 0, 1]], [[0, -1, 1], [1, 0, 0], [0, 0, 1]]], [[-1, 0, 10], [0, -1, 1], [0, 0, 1]], "turning chain"),
        example([IDENTITY_3, ROT90_T31], ROT90_T31, "identity on the left"),
        example([[[1, 0, 2], [0, 1, -1], [0, 0, 1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]]], [[0, -1, 2], [1, 0, -1], [0, 0, 1]], "order-sensitive"),
      ],
    }),
    puzzle({
      number: 31, id: "apply-homogeneous", track: "toolkit", title: "Apply a Homogeneous Matrix",
      goal: "Move a point with a 3×3 matrix by treating it as [x, y, 1].",
      concept: "The trailing 1 is what lets one multiplication both rotate and translate.",
      functionName: "applyHomogeneous", signature: "applyHomogeneous(matrix, point) → point",
      starterSource: starter("applyHomogeneous", "matrix, point", "Multiply the first two rows by [x, y, 1]."),
      referenceSource: lines(
        "function applyHomogeneous(matrix, point) {",
        "  return { x: matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2], y: matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2] };",
        "}"
      ),
      comparator: "vector2", walkthroughChapter: "matrix-stack",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "icp_matching (Rt @ current_points + Tt)"),
      scene: { kind: "matrix", view: "point", handles: [
        { id: "transform", type: "frame", label: "source", value: { x: 3, y: 1, yaw: PI / 2 } },
        { id: "point", type: "point", label: "p", value: { x: 2, y: 0 }, in: "transform" },
      ], args: [{ fixture: "matrixOfTransform" }, { handle: "point" }] },
      diagnoses: [
        diagnosis("rotation-ignored", "Only the last column was used: the rotation block must multiply x and y.", "function applyHomogeneous(matrix, point) { return { x: point.x + matrix[0][2], y: point.y + matrix[1][2] }; }"),
        diagnosis("homogeneous-coordinate-dropped", "The trailing 1 was dropped, so the translation column never contributes.", "function applyHomogeneous(matrix, point) { return { x: matrix[0][0] * point.x + matrix[0][1] * point.y, y: matrix[1][0] * point.x + matrix[1][1] * point.y }; }"),
      ],
      hints: ["Extend the point to [x, y, 1].", "x′ = m00·x + m01·y + m02·1, and the same with row 1 for y′.", "Return { x: m[0][0]*x + m[0][1]*y + m[0][2], y: m[1][0]*x + m[1][1]*y + m[1][2] }."],
      cases: [
        example([ROT90_T31, { x: 2, y: 0 }], { x: 3, y: 3 }, "rotate then shift"),
        example([IDENTITY_3, { x: 5, y: -2 }], { x: 5, y: -2 }, "identity"),
        example([[[-1, 0, -1], [0, -1, 4], [0, 0, 1]], { x: 2, y: -3 }], { x: -3, y: 7 }, "half-turn matrix"),
      ],
    }),
    puzzle({
      number: 32, id: "pose-from-homogeneous", track: "toolkit", title: "Read a Pose Back Out",
      goal: "Extract x, y, and yaw from a homogeneous matrix.",
      concept: "The first column is the rotated x axis, so atan2 of it recovers yaw with the right sign.",
      functionName: "poseFromHomogeneous", signature: "poseFromHomogeneous(matrix) → { x, y, yaw }",
      starterSource: starter("poseFromHomogeneous", "matrix", "Translation is the last column; yaw comes from the first column."),
      referenceSource: "function poseFromHomogeneous(matrix) { return { x: matrix[0][2], y: matrix[1][2], yaw: Math.atan2(matrix[1][0], matrix[0][0]) }; }",
      comparator: "se2", walkthroughChapter: "matrix-stack",
      reference: pyref("utils/angle.py", "angle_mod"),
      scene: { kind: "matrix", view: "readback", handles: [{ id: "transform", type: "frame", label: "pose", value: { x: -1, y: 2, yaw: -PI / 3 } }], args: [{ fixture: "matrixOfTransform" }] },
      diagnoses: [
        diagnosis("acos-yaw", "acos(m00) loses the sign of the rotation: use atan2(m10, m00).", "function poseFromHomogeneous(matrix) { return { x: matrix[0][2], y: matrix[1][2], yaw: Math.acos(matrix[0][0]) }; }"),
        diagnosis("atan2-swapped", "atan2 arguments swapped: it takes (sin, cos), which are (m10, m00).", "function poseFromHomogeneous(matrix) { return { x: matrix[0][2], y: matrix[1][2], yaw: Math.atan2(matrix[0][0], matrix[1][0]) }; }"),
      ],
      hints: ["x and y sit in the last column.", "m10 is sin(yaw) and m00 is cos(yaw).", "yaw = Math.atan2(matrix[1][0], matrix[0][0])."],
      cases: [
        example([ROT90_T31], { x: 3, y: 1, yaw: PI / 2 }, "quarter turn"),
        example([[[1, 0, 5], [0, 1, -2], [0, 0, 1]]], { x: 5, y: -2, yaw: 0 }, "pure translation"),
        example([[[0.5, Math.sqrt(3) / 2, 0], [-Math.sqrt(3) / 2, 0.5, 0], [0, 0, 1]]], { x: 0, y: 0, yaw: -PI / 3 }, "negative yaw"),
      ],
    }),
    puzzle({
      number: 33, id: "invert-homogeneous", track: "toolkit", title: "Invert a Homogeneous Matrix",
      goal: "Invert a rigid 3×3 matrix without a general matrix inverse.",
      concept: "A rotation's inverse is its transpose, and the translation becomes −Rᵀt.",
      functionName: "invertHomogeneous", signature: "invertHomogeneous(matrix) → 3×3",
      starterSource: starter("invertHomogeneous", "matrix", "Transpose the rotation block; the new translation is −Rᵀ · t."),
      referenceSource: lines(
        "function invertHomogeneous(matrix) {",
        "  var r00 = matrix[0][0], r01 = matrix[0][1], r10 = matrix[1][0], r11 = matrix[1][1];",
        "  var tx = matrix[0][2], ty = matrix[1][2];",
        "  return [[r00, r10, -(r00 * tx + r10 * ty)], [r01, r11, -(r01 * tx + r11 * ty)], [0, 0, 1]];",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "composition",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "update_homogeneous_matrix"),
      scene: { kind: "matrix", view: "inverse", handles: [{ id: "transform", type: "frame", label: "b", value: { x: 3, y: 1, yaw: PI / 2 } }], args: [{ fixture: "matrixOfTransform" }] },
      diagnoses: [
        diagnosis("negated-only", "Only the translation was negated: it must also be rotated by the transposed block.", "function invertHomogeneous(matrix) { return [[matrix[0][0], matrix[0][1], -matrix[0][2]], [matrix[1][0], matrix[1][1], -matrix[1][2]], [0, 0, 1]]; }"),
        diagnosis("transpose-whole-matrix", "Transposing the whole 3×3 moves the translation into the bottom row; only the rotation block transposes.", "function invertHomogeneous(matrix) { return [[matrix[0][0], matrix[1][0], 0], [matrix[0][1], matrix[1][1], 0], [matrix[0][2], matrix[1][2], 1]]; }"),
      ],
      hints: ["For rotations, Rᵀ is R⁻¹.", "Inverse = [Rᵀ, −Rᵀ t; 0 0 1].", "Swap m01 and m10; new tx = −(m00·tx + m10·ty); new ty = −(m01·tx + m11·ty)."],
      cases: [
        example([ROT90_T31], [[0, 1, -1], [-1, 0, 3], [0, 0, 1]], "quarter-turn inverse"),
        example([[[1, 0, 2], [0, 1, -4], [0, 0, 1]]], [[1, 0, -2], [0, 1, 4], [0, 0, 1]], "translation inverse"),
        example([[[-1, 0, 1], [0, -1, 1], [0, 0, 1]]], [[-1, 0, 1], [0, -1, 1], [0, 0, 1]], "half turn is its own inverse"),
      ],
    }),
  ];

  const X90 = { x: HALF, y: 0, z: 0, w: HALF };
  const RP60 = { x: 0.4330127018922193, y: 0.4330127018922193, z: -0.25, w: 0.75 };
  const Z170 = { x: 0, y: 0, z: Math.sin(85 * PI / 180), w: Math.cos(85 * PI / 180) };
  const Z_MINUS_170 = { x: 0, y: 0, z: -Math.sin(85 * PI / 180), w: Math.cos(85 * PI / 180) };
  const RPY_SLIDERS = [
    { id: "roll", type: "slider", label: "roll", value: 0.3, min: -PI, max: PI },
    { id: "pitch", type: "slider", label: "pitch", value: 0.4, min: -PI / 2, max: PI / 2 },
    { id: "yaw", type: "slider", label: "yaw", value: 1.0, min: -PI, max: PI },
  ];

  const TOOLKIT_9 = [
    puzzle({
      number: 34, id: "quaternion-from-rpy", track: "toolkit", title: "Quaternion from Roll, Pitch, Yaw",
      goal: "Build the quaternion tf2's setRPY builds: yaw about Z, then pitch about Y, then roll about X.",
      concept: "Euler angles are three half-angle quaternions multiplied in Z-Y-X order.",
      functionName: "quaternionFromRPY", signature: "quaternionFromRPY(roll, pitch, yaw) → quaternion",
      starterSource: starter("quaternionFromRPY", "roll, pitch, yaw", "q = qz(yaw) × qy(pitch) × qx(roll), each built from half angles."),
      referenceSource: lines(
        "function quaternionFromRPY(roll, pitch, yaw) {",
        "  var qx = { x: Math.sin(roll / 2), y: 0, z: 0, w: Math.cos(roll / 2) };",
        "  var qy = { x: 0, y: Math.sin(pitch / 2), z: 0, w: Math.cos(pitch / 2) };",
        "  var qz = { x: 0, y: 0, z: Math.sin(yaw / 2), w: Math.cos(yaw / 2) };",
        "  return quaternionMultiply(quaternionMultiply(qz, qy), qx);",
        "}"
      ),
      comparator: "quaternion", walkthroughChapter: "se3",
      dependencies: ["quaternion-multiply"],
      reference: docref("tf2 · Quaternion::setRPY", "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Quaternion.html"),
      scene: { kind: "se3", view: "rpy", handles: RPY_SLIDERS },
      diagnoses: [
        diagnosis("xyz-order", "Multiplied in X-Y-Z order: setRPY applies yaw first, so the product is qz × qy × qx.", lines(
          "function quaternionFromRPY(roll, pitch, yaw) {",
          "  var qx = { x: Math.sin(roll / 2), y: 0, z: 0, w: Math.cos(roll / 2) };",
          "  var qy = { x: 0, y: Math.sin(pitch / 2), z: 0, w: Math.cos(pitch / 2) };",
          "  var qz = { x: 0, y: 0, z: Math.sin(yaw / 2), w: Math.cos(yaw / 2) };",
          "  return quaternionMultiply(quaternionMultiply(qx, qy), qz);",
          "}"
        )),
        diagnosis("half-angle-missing", "Used the full angle: a quaternion stores sin and cos of half the angle.", lines(
          "function quaternionFromRPY(roll, pitch, yaw) {",
          "  var qx = { x: Math.sin(roll), y: 0, z: 0, w: Math.cos(roll) };",
          "  var qy = { x: 0, y: Math.sin(pitch), z: 0, w: Math.cos(pitch) };",
          "  var qz = { x: 0, y: 0, z: Math.sin(yaw), w: Math.cos(yaw) };",
          "  return quaternionMultiply(quaternionMultiply(qz, qy), qx);",
          "}"
        )),
      ],
      hints: ["Each axis rotation is its own quaternion with half angles.", "Order matters: qz × qy × qx (yaw, then pitch, then roll).", "Build qx, qy, qz with sin(angle/2) on their axis and cos(angle/2) in w, then multiply."],
      cases: [
        example([0, 0, PI / 2], Z90, "yaw only"),
        example([PI / 2, 0, 0], X90, "roll only"),
        example([0, PI / 2, 0], Y90, "pitch only"),
        example([PI / 3, PI / 3, 0], RP60, "roll and pitch"),
        example([PI / 2, 0, PI / 2], { x: 0.5, y: 0.5, z: 0.5, w: 0.5 }, "roll and yaw"),
      ],
    }),
    puzzle({
      number: 35, id: "yaw-from-quaternion", track: "toolkit", title: "Yaw from a Quaternion",
      goal: "Extract the yaw angle from any quaternion, the way tf2::getYaw does.",
      concept: "The shortcut 2·atan2(z, w) only works when roll and pitch are zero.",
      functionName: "yawFromQuaternion", signature: "yawFromQuaternion(q) → radians",
      starterSource: starter("yawFromQuaternion", "q", "yaw = atan2(2(w·z + x·y), 1 − 2(y² + z²))."),
      referenceSource: "function yawFromQuaternion(q) { return Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z)); }",
      comparator: "angle", walkthroughChapter: "se3",
      reference: docref("tf2 · getYaw (tf2/utils.h)", "https://docs.ros.org/en/rolling/p/tf2/generated/namespacetf2.html"),
      scene: { kind: "se3", view: "rpy", handles: [
        { id: "roll", type: "slider", label: "roll", value: 0.6, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "pitch", value: 0.4, min: -PI / 2, max: PI / 2 },
        { id: "yaw", type: "slider", label: "yaw", value: 1.2, min: -PI, max: PI },
      ], args: [{ fixture: "quatFromRPY" }] },
      diagnoses: [diagnosis("pure-yaw-shortcut", "2·atan2(z, w) assumes no roll or pitch; use the full formula with x·y and y² terms.", "function yawFromQuaternion(q) { return 2 * Math.atan2(q.z, q.w); }")],
      hints: ["Yaw is the rotation of the body x axis projected onto the XY plane.", "Numerator 2(wz + xy); denominator 1 − 2(y² + z²).", "Return Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z))."],
      cases: [
        example([Z90], PI / 2, "pure yaw"),
        example([X90], 0, "pure roll"),
        example([RP60], 0, "roll and pitch, no yaw"),
        example([{ x: 0, y: 0, z: -HALF, w: HALF }], -PI / 2, "negative yaw"),
        example([{ x: 0.5, y: 0.5, z: 0.5, w: 0.5 }], PI / 2, "roll and yaw"),
      ],
    }),
    puzzle({
      number: 36, id: "rpy-from-quaternion", track: "toolkit", title: "Roll, Pitch, Yaw from a Quaternion",
      goal: "Recover all three Euler angles from a quaternion.",
      concept: "Pitch comes from an asin that must be clamped; roll and yaw come from atan2 pairs.",
      functionName: "rpyFromQuaternion", signature: "rpyFromQuaternion(q) → { roll, pitch, yaw }",
      starterSource: starter("rpyFromQuaternion", "q", "roll = atan2(2(wx + yz), 1 − 2(x² + y²)); pitch = asin(2(wy − zx)); reuse yawFromQuaternion."),
      referenceSource: lines(
        "function rpyFromQuaternion(q) {",
        "  var sinp = 2 * (q.w * q.y - q.z * q.x);",
        "  if (sinp > 1) sinp = 1;",
        "  if (sinp < -1) sinp = -1;",
        "  return { roll: Math.atan2(2 * (q.w * q.x + q.y * q.z), 1 - 2 * (q.x * q.x + q.y * q.y)), pitch: Math.asin(sinp), yaw: yawFromQuaternion(q) };",
        "}"
      ),
      comparator: "angles", walkthroughChapter: "se3",
      dependencies: ["yaw-from-quaternion"],
      reference: docref("tf2 · Matrix3x3::getRPY", "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Matrix3x3.html"),
      scene: { kind: "se3", view: "rpy", handles: [
        { id: "roll", type: "slider", label: "roll", value: 0.5, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "pitch", value: -0.3, min: -PI / 2, max: PI / 2 },
        { id: "yaw", type: "slider", label: "yaw", value: 2.0, min: -PI, max: PI },
      ], args: [{ fixture: "quatFromRPY" }] },
      diagnoses: [diagnosis("roll-yaw-swapped", "Roll and yaw are swapped: roll uses (wx + yz) and the x², y² terms; yaw uses (wz + xy).", lines(
        "function rpyFromQuaternion(q) {",
        "  var sinp = 2 * (q.w * q.y - q.z * q.x);",
        "  if (sinp > 1) sinp = 1;",
        "  if (sinp < -1) sinp = -1;",
        "  return { roll: yawFromQuaternion(q), pitch: Math.asin(sinp), yaw: Math.atan2(2 * (q.w * q.x + q.y * q.z), 1 - 2 * (q.x * q.x + q.y * q.y)) };",
        "}"
      ))],
      hints: ["Each angle has its own pair of quaternion terms.", "Clamp the asin argument to [−1, 1] before calling it.", "roll: atan2(2(wx + yz), 1 − 2(x² + y²)); pitch: asin(2(wy − zx)); yaw: yawFromQuaternion(q)."],
      cases: [
        example([Z90], { roll: 0, pitch: 0, yaw: PI / 2 }, "pure yaw"),
        example([X90], { roll: PI / 2, pitch: 0, yaw: 0 }, "pure roll"),
        example([RP60], { roll: PI / 3, pitch: PI / 3, yaw: 0 }, "roll and pitch"),
        example([{ x: 0.5, y: 0.5, z: 0.5, w: 0.5 }], { roll: PI / 2, pitch: 0, yaw: PI / 2 }, "roll and yaw"),
      ],
    }),
    puzzle({
      number: 37, id: "slerp-quaternion", track: "toolkit", title: "Slerp Between Rotations",
      goal: "Interpolate two quaternions along the shortest arc, the way TF2 interpolates 3D orientation.",
      concept: "Flip the sign when the dot product is negative, then weight by sines of the arc angle.",
      functionName: "slerpQuaternion", signature: "slerpQuaternion(a, b, amount) → quaternion",
      starterSource: starter("slerpQuaternion", "a, b, amount"),
      referenceSource: lines(
        "function slerpQuaternion(a, b, amount) {",
        "  var dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;",
        "  var target = b;",
        "  if (dot < 0) { dot = -dot; target = { x: -b.x, y: -b.y, z: -b.z, w: -b.w }; }",
        "  var wa, wb;",
        "  if (dot > 0.9995) { wa = 1 - amount; wb = amount; }",
        "  else { var theta = Math.acos(dot); wa = Math.sin((1 - amount) * theta) / Math.sin(theta); wb = Math.sin(amount * theta) / Math.sin(theta); }",
        "  var q = { x: wa * a.x + wb * target.x, y: wa * a.y + wb * target.y, z: wa * a.z + wb * target.z, w: wa * a.w + wb * target.w };",
        "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };",
        "}"
      ),
      comparator: "quaternion", walkthroughChapter: "time-buffer",
      reference: docref("tf2 · Quaternion::slerp", "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Quaternion.html"),
      scene: { kind: "se3", view: "slerp", handles: [
        { id: "yawA", type: "slider", label: "a: yaw", value: 2.9, min: -PI, max: PI },
        { id: "yawB", type: "slider", label: "b: yaw", value: -2.7, min: -PI, max: PI },
        { id: "amount", type: "slider", label: "amount", value: 0.5, min: 0, max: 1 },
      ], args: [{ fixture: "slerpA" }, { fixture: "slerpB" }, { handle: "amount" }] },
      diagnoses: [
        diagnosis("component-lerp", "Linear interpolation of components does not move at constant angular speed; weight by sin((1−t)θ) and sin(tθ).", lines(
          "function slerpQuaternion(a, b, amount) {",
          "  var dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;",
          "  var target = dot < 0 ? { x: -b.x, y: -b.y, z: -b.z, w: -b.w } : b;",
          "  var q = { x: (1 - amount) * a.x + amount * target.x, y: (1 - amount) * a.y + amount * target.y, z: (1 - amount) * a.z + amount * target.z, w: (1 - amount) * a.w + amount * target.w };",
          "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };",
          "}"
        )),
        diagnosis("long-way", "Took the long way around: when the dot product is negative, negate b first.", lines(
          "function slerpQuaternion(a, b, amount) {",
          "  var dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;",
          "  var wa, wb;",
          "  if (Math.abs(dot) > 0.9995) { wa = 1 - amount; wb = amount; }",
          "  else { var theta = Math.acos(dot); wa = Math.sin((1 - amount) * theta) / Math.sin(theta); wb = Math.sin(amount * theta) / Math.sin(theta); }",
          "  var q = { x: wa * a.x + wb * b.x, y: wa * a.y + wb * b.y, z: wa * a.z + wb * b.z, w: wa * a.w + wb * b.w };",
          "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };",
          "}"
        )),
      ],
      hints: ["q and −q are the same rotation, so pick the closer sign of b first.", "θ = acos(a·b); weights are sin((1−t)θ)/sin θ and sin(tθ)/sin θ.", "Fall back to a normalized linear blend when a·b > 0.9995 to avoid dividing by sin θ ≈ 0."],
      cases: [
        example([IDENTITY_Q, Z90, 0.5], { x: 0, y: 0, z: Math.sin(PI / 8), w: Math.cos(PI / 8) }, "halfway to a quarter turn"),
        example([IDENTITY_Q, Z90, 0.25], { x: 0, y: 0, z: Math.sin(PI / 16), w: Math.cos(PI / 16) }, "quarter of the way"),
        example([Z170, Z_MINUS_170, 0.5], { x: 0, y: 0, z: 1, w: 0 }, "across the wrap"),
        example([X90, Y90, 1], Y90, "amount one"),
        example([X90, Y90, 0], X90, "amount zero"),
      ],
    }),
    puzzle({
      number: 38, id: "transform-point-3d", track: "toolkit", title: "Transform a 3D Point",
      goal: "Apply an SE(3) transform to a point: rotate by the quaternion, then translate.",
      concept: "Same rotate-then-translate order as transformPoint, with a quaternion doing the rotating.",
      functionName: "transformPoint3D", signature: "transformPoint3D(aFromB, point) → vector3",
      starterSource: starter("transformPoint3D", "aFromB, point", "rotateByQuaternion first, then add the translation."),
      referenceSource: lines(
        "function transformPoint3D(aFromB, point) {",
        "  var rotated = rotateByQuaternion(aFromB.rotation, point);",
        "  return { x: rotated.x + aFromB.translation.x, y: rotated.y + aFromB.translation.y, z: rotated.z + aFromB.translation.z };",
        "}"
      ),
      comparator: "vector3", walkthroughChapter: "stamped-data",
      dependencies: ["rotate-by-quaternion"],
      reference: docref("tf2 · doTransform(PointStamped)", "https://docs.ros.org/en/rolling/p/tf2_geometry_msgs/"),
      scene: { kind: "se3", view: "point3d", handles: [
        { id: "yaw", type: "slider", label: "b: yaw", value: PI / 2, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "b: pitch", value: 0.3, min: -PI / 2, max: PI / 2 },
      ], args: [{ fixture: "aFromBSliders" }, { fixture: "point3" }] },
      diagnoses: [diagnosis("translate-then-rotate", "Translated before rotating: the offset got rotated too.", lines(
        "function transformPoint3D(aFromB, point) {",
        "  var shifted = { x: point.x + aFromB.translation.x, y: point.y + aFromB.translation.y, z: point.z + aFromB.translation.z };",
        "  return rotateByQuaternion(aFromB.rotation, shifted);",
        "}"
      ))],
      hints: ["A rigid transform rotates first, then translates.", "Rotate the point with rotateByQuaternion(aFromB.rotation, point).", "Add aFromB.translation component-wise to the rotated point."],
      cases: [
        example([{ translation: { x: 1, y: 0, z: 0 }, rotation: Z90 }, { x: 1, y: 0, z: 0 }], { x: 1, y: 1, z: 0 }, "quarter turn then shift"),
        example([{ translation: { x: 0, y: 0, z: 1 }, rotation: IDENTITY_Q }, { x: 2, y: 3, z: 4 }], { x: 2, y: 3, z: 5 }, "pure translation"),
        example([{ translation: { x: 1, y: 1, z: 1 }, rotation: Y90 }, { x: 0, y: 0, z: 1 }], { x: 2, y: 1, z: 1 }, "pitch then shift"),
      ],
    }),
    puzzle({
      number: 39, id: "invert-se3", track: "toolkit", title: "Invert an SE(3) Transform",
      goal: "Invert a translation-plus-quaternion transform.",
      concept: "The inverse rotation is the conjugate, and the inverse translation is that rotation applied to −t.",
      functionName: "invertSE3", signature: "invertSE3(aFromB) → bFromA",
      starterSource: starter("invertSE3", "aFromB", "conjugate = (−x, −y, −z, w); translation = rotate(conjugate, −t)."),
      referenceSource: lines(
        "function invertSE3(aFromB) {",
        "  var q = aFromB.rotation;",
        "  var conjugate = { x: -q.x, y: -q.y, z: -q.z, w: q.w };",
        "  var t = rotateByQuaternion(conjugate, { x: -aFromB.translation.x, y: -aFromB.translation.y, z: -aFromB.translation.z });",
        "  return { translation: t, rotation: conjugate };",
        "}"
      ),
      comparator: "se3", walkthroughChapter: "composition",
      dependencies: ["rotate-by-quaternion"],
      reference: docref("tf2 · Transform::inverse", "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Transform.html"),
      scene: { kind: "se3", view: "inverse", handles: [
        { id: "yaw", type: "slider", label: "b: yaw", value: 0.9, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "b: pitch", value: 0.4, min: -PI / 2, max: PI / 2 },
      ], args: [{ fixture: "aFromBSliders" }] },
      diagnoses: [
        diagnosis("negated-only", "Only negated the translation: it must be rotated by the conjugate as well.", lines(
          "function invertSE3(aFromB) {",
          "  var q = aFromB.rotation;",
          "  return { translation: { x: -aFromB.translation.x, y: -aFromB.translation.y, z: -aFromB.translation.z }, rotation: { x: -q.x, y: -q.y, z: -q.z, w: q.w } };",
          "}"
        )),
        diagnosis("rotation-not-inverted", "The rotation was kept as is: the inverse needs the conjugate quaternion.", lines(
          "function invertSE3(aFromB) {",
          "  var q = aFromB.rotation;",
          "  var conjugate = { x: -q.x, y: -q.y, z: -q.z, w: q.w };",
          "  var t = rotateByQuaternion(conjugate, { x: -aFromB.translation.x, y: -aFromB.translation.y, z: -aFromB.translation.z });",
          "  return { translation: t, rotation: q };",
          "}"
        )),
      ],
      hints: ["For a unit quaternion the inverse is the conjugate.", "bFromA translation = conjugate applied to −t.", "Return { translation: rotateByQuaternion(conjugate, −t), rotation: conjugate }."],
      cases: [
        example([{ translation: { x: 1, y: 0, z: 0 }, rotation: Z90 }], { translation: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: -HALF, w: HALF } }, "quarter-turn inverse"),
        example([{ translation: { x: 2, y: -4, z: 6 }, rotation: IDENTITY_Q }], { translation: { x: -2, y: 4, z: -6 }, rotation: IDENTITY_Q }, "translation inverse"),
        example([{ translation: { x: 0, y: 0, z: 1 }, rotation: Y90 }], { translation: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: -HALF, z: 0, w: HALF } }, "pitch inverse"),
      ],
    }),
    puzzle({
      number: 40, id: "optical-to-body", track: "toolkit", title: "Camera Optical Frame to Body Frame",
      goal: "Re-express a camera_optical vector (x right, y down, z forward) in the body frame (x forward, y left, z up).",
      concept: "REP-103: optical z is body x, optical x is body −y, optical y is body −z.",
      functionName: "opticalToBody", signature: "opticalToBody(v) → vector3",
      starterSource: starter("opticalToBody", "v", "body.x = v.z; body.y = −v.x; body.z = −v.y."),
      referenceSource: "function opticalToBody(v) { return { x: v.z, y: -v.x, z: -v.y }; }",
      comparator: "vector3", walkthroughChapter: "se3",
      reference: docref("REP-103 · Standard Units of Measure and Coordinate Conventions (suffix frames)", "https://www.ros.org/reps/rep-0103.html#suffix-frames"),
      scene: { kind: "se3", view: "optical", handles: [
        { id: "yaw", type: "slider", label: "ray yaw (body)", value: 0.5, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "ray pitch (body)", value: 0.2, min: -PI / 2, max: PI / 2 },
      ], args: [{ fixture: "opticalRay" }] },
      diagnoses: [
        diagnosis("axes-swapped-only", "Axes were permuted but not flipped: optical x points right, which is body −y; optical y points down, which is body −z.", "function opticalToBody(v) { return { x: v.z, y: v.x, z: v.y }; }"),
        diagnosis("body-to-optical", "That is the inverse mapping (body → optical). This puzzle converts optical → body.", "function opticalToBody(v) { return { x: -v.y, y: -v.z, z: v.x }; }"),
      ],
      hints: ["Optical z is forward, which is body x.", "Optical x is right (body −y); optical y is down (body −z).", "Return { x: v.z, y: -v.x, z: -v.y }."],
      cases: [
        example([{ x: 0, y: 0, z: 1 }], { x: 1, y: 0, z: 0 }, "optical forward"),
        example([{ x: 1, y: 0, z: 0 }], { x: 0, y: -1, z: 0 }, "optical right"),
        example([{ x: 0, y: 1, z: 0 }], { x: 0, y: 0, z: -1 }, "optical down"),
        example([{ x: 0.5, y: -0.25, z: 2 }], { x: 2, y: -0.5, z: 0.25 }, "general ray"),
      ],
    }),
  ];

  const TOOLKIT_10 = [
    puzzle({
      number: 41, id: "integrate-motion", track: "toolkit", title: "Integrate One Odometry Step",
      goal: "Advance a pose by velocity v and yaw rate ω over dt, exactly like the EKF motion model.",
      concept: "This is how odom → base_link is produced, one dead-reckoned step at a time.",
      functionName: "integrateMotion", signature: "integrateMotion(pose, v, omega, dt) → pose",
      starterSource: starter("integrateMotion", "pose, v, omega, dt", "x += v·dt·cos(yaw); y += v·dt·sin(yaw); yaw = wrapAngle(yaw + ω·dt)."),
      referenceSource: lines(
        "function integrateMotion(pose, v, omega, dt) {",
        "  return { x: pose.x + v * dt * Math.cos(pose.yaw), y: pose.y + v * dt * Math.sin(pose.yaw), yaw: wrapAngle(pose.yaw + omega * dt) };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "frame-roles",
      dependencies: ["wrap-angle"],
      reference: pyref("Localization/extended_kalman_filter/extended_kalman_filter.py", "motion_model"),
      scene: { kind: "motion", handles: [
        { id: "pose", type: "pose", label: "pose", value: { x: -2, y: -0.5, yaw: 0.4 } },
        { id: "v", type: "slider", label: "v (m/s)", value: 1.5, min: 0, max: 3 },
        { id: "omega", type: "slider", label: "ω (rad/s)", value: 0.8, min: -2, max: 2 },
        { id: "dt", type: "slider", label: "dt (s)", value: 1.0, min: 0.1, max: 2 },
      ] },
      diagnoses: [
        diagnosis("yaw-updated-first", "The translation used the new yaw: the model moves along the current heading, then turns.", lines(
          "function integrateMotion(pose, v, omega, dt) {",
          "  var yaw = wrapAngle(pose.yaw + omega * dt);",
          "  return { x: pose.x + v * dt * Math.cos(yaw), y: pose.y + v * dt * Math.sin(yaw), yaw: yaw };",
          "}"
        )),
        diagnosis("omega-ignored", "The yaw rate was ignored: yaw must advance by ω·dt.", "function integrateMotion(pose, v, omega, dt) { return { x: pose.x + v * dt * Math.cos(pose.yaw), y: pose.y + v * dt * Math.sin(pose.yaw), yaw: pose.yaw }; }"),
      ],
      hints: ["Distance travelled is v·dt along the current heading.", "Turn by ω·dt after moving, and wrap the result.", "Return { x: x + v·dt·cos(yaw), y: y + v·dt·sin(yaw), yaw: wrapAngle(yaw + ω·dt) }."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, 1, 0.1, 0.1], { x: 0.1, y: 0, yaw: 0.01 }, "PythonRobotics defaults"),
        example([{ x: 1, y: 2, yaw: PI / 2 }, 2, 0, 0.5], { x: 1, y: 3, yaw: PI / 2 }, "straight along +y"),
        example([{ x: 0, y: 0, yaw: PI }, 1, 1, PI], { x: -PI, y: 0, yaw: 0 }, "move then wrap"),
        example([{ x: 0, y: 0, yaw: 0 }, 0, 0.5, 2], { x: 0, y: 0, yaw: 1 }, "turn in place"),
      ],
    }),
    puzzle({
      number: 42, id: "dead-reckon", track: "toolkit", title: "Dead Reckoning",
      goal: "Fold a list of (v, ω, dt) commands into a final pose.",
      concept: "Odometry drift is what happens when these commands carry small errors and nothing corrects them.",
      functionName: "deadReckon", signature: "deadReckon(start, commands) → pose",
      starterSource: starter("deadReckon", "start, commands", "Apply integrateMotion for each command in order."),
      referenceSource: lines(
        "function deadReckon(start, commands) {",
        "  var pose = { x: start.x, y: start.y, yaw: start.yaw };",
        "  for (var i = 0; i < commands.length; i += 1) pose = integrateMotion(pose, commands[i].v, commands[i].omega, commands[i].dt);",
        "  return pose;",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "frame-roles",
      dependencies: ["integrate-motion"],
      reference: pyref("Localization/extended_kalman_filter/extended_kalman_filter.py", "observation (xDR dead reckoning)"),
      scene: { kind: "motion-trail", handles: [{ id: "start", type: "pose", label: "start", value: { x: -3, y: -1, yaw: 0.3 } }], args: [{ handle: "start" }, { fixture: "commands" }] },
      diagnoses: [diagnosis("commands-reversed", "Commands were applied last to first: dead reckoning replays them in order.", lines(
        "function deadReckon(start, commands) {",
        "  var pose = { x: start.x, y: start.y, yaw: start.yaw };",
        "  for (var i = commands.length - 1; i >= 0; i -= 1) pose = integrateMotion(pose, commands[i].v, commands[i].omega, commands[i].dt);",
        "  return pose;",
        "}"
      ))],
      hints: ["Start from a copy of the start pose.", "Each command is one integrateMotion step.", "Loop over commands in order and feed the result back in."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, [{ v: 1, omega: 0, dt: 1 }, { v: 1, omega: 0, dt: 1 }]], { x: 2, y: 0, yaw: 0 }, "two straight steps"),
        example([{ x: 0, y: 0, yaw: 0 }, [{ v: 0, omega: PI / 2, dt: 1 }, { v: 1, omega: 0, dt: 1 }]], { x: 0, y: 1, yaw: PI / 2 }, "turn then move"),
        example([{ x: 1, y: 1, yaw: 0 }, []], { x: 1, y: 1, yaw: 0 }, "no commands"),
        example([{ x: 0, y: 0, yaw: 0 }, [{ v: 2, omega: 1, dt: 0.5 }]], { x: 1, y: 0, yaw: 0.5 }, "single step"),
      ],
    }),
    puzzle({
      number: 43, id: "rotate-covariance", track: "toolkit", title: "Rotate a Covariance",
      goal: "Express a 2×2 position covariance in a frame rotated by yaw: R Σ Rᵀ.",
      concept: "Uncertainty is a quadratic form, so it transforms with R on both sides, not once.",
      functionName: "rotateCovariance", signature: "rotateCovariance(cov, yaw) → 2×2",
      starterSource: starter("rotateCovariance", "cov, yaw", "Compute R·Σ first, then multiply by Rᵀ on the right."),
      referenceSource: lines(
        "function rotateCovariance(cov, yaw) {",
        "  var r = rotMat2d(yaw);",
        "  var rs = [",
        "    [r[0][0] * cov[0][0] + r[0][1] * cov[1][0], r[0][0] * cov[0][1] + r[0][1] * cov[1][1]],",
        "    [r[1][0] * cov[0][0] + r[1][1] * cov[1][0], r[1][0] * cov[0][1] + r[1][1] * cov[1][1]],",
        "  ];",
        "  return [",
        "    [rs[0][0] * r[0][0] + rs[0][1] * r[0][1], rs[0][0] * r[1][0] + rs[0][1] * r[1][1]],",
        "    [rs[1][0] * r[0][0] + rs[1][1] * r[0][1], rs[1][0] * r[1][0] + rs[1][1] * r[1][1]],",
        "  ];",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["rot-mat-2d"],
      reference: pyref("Localization/extended_kalman_filter/extended_kalman_filter.py", "ekf_estimation (jF @ PEst @ jF.T)"),
      scene: { kind: "covariance", handles: [{ id: "yaw", type: "dial", label: "yaw", value: 0.6 }], args: [{ fixture: "covariance" }, { handle: "yaw" }] },
      diagnoses: [
        diagnosis("no-transpose", "Multiplied R Σ R: the right-hand factor must be the transpose Rᵀ.", lines(
          "function rotateCovariance(cov, yaw) {",
          "  var r = rotMat2d(yaw);",
          "  var rs = [[r[0][0] * cov[0][0] + r[0][1] * cov[1][0], r[0][0] * cov[0][1] + r[0][1] * cov[1][1]], [r[1][0] * cov[0][0] + r[1][1] * cov[1][0], r[1][0] * cov[0][1] + r[1][1] * cov[1][1]]];",
          "  return [[rs[0][0] * r[0][0] + rs[0][1] * r[1][0], rs[0][0] * r[0][1] + rs[0][1] * r[1][1]], [rs[1][0] * r[0][0] + rs[1][1] * r[1][0], rs[1][0] * r[0][1] + rs[1][1] * r[1][1]]];",
          "}"
        )),
        diagnosis("unchanged", "The covariance was returned as is: a rotated frame sees a rotated ellipse.", "function rotateCovariance(cov, yaw) { return [[cov[0][0], cov[0][1]], [cov[1][0], cov[1][1]]]; }"),
      ],
      hints: ["A covariance transforms as R Σ Rᵀ.", "Build R with rotMat2d, multiply Σ on the left, then Rᵀ on the right.", "(R Σ Rᵀ)[i][j] = Σₖ (RΣ)[i][k] · R[j][k]."],
      cases: [
        example([[[4, 0], [0, 1]], PI / 2], [[1, 0], [0, 4]], "quarter turn swaps the axes"),
        example([[[1, 0], [0, 1]], 0.7], [[1, 0], [0, 1]], "isotropic is invariant"),
        example([[[2, 1], [1, 2]], PI], [[2, 1], [1, 2]], "half turn is invariant"),
        example([[[4, 0], [0, 1]], PI / 4], [[2.5, 1.5], [1.5, 2.5]], "45 degrees mixes the axes"),
      ],
    }),
  ];

  const ROTATING_EDGES_CASE = [
    { parent: "map", child: "odom", samples: [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 10, transform: { x: 0, y: 0, yaw: PI } }] },
    { parent: "odom", child: "base_link", isStatic: true, transform: { x: 2, y: 0, yaw: 0 } },
  ];

  const TOOLKIT_11 = [
    puzzle({
      number: 44, id: "lookup-across-time", track: "toolkit", title: "Look Up Across Time",
      goal: "Answer tf2's advanced lookup: where was source at time t₂, seen from target at time t₁, through a fixed frame?",
      concept: "T_target(t₁)←source(t₂) = T_target(t₁)←fixed ∘ T_fixed←source(t₂); the fixed frame is the bridge between the two moments.",
      functionName: "lookupAcrossTime", signature: "lookupAcrossTime(edges, target, targetTime, source, sourceTime, fixedFrame) → result",
      starterSource: starter("lookupAcrossTime", "edges, target, targetTime, source, sourceTime, fixedFrame"),
      referenceSource: lines(
        "function lookupAcrossTime(edges, target, targetTime, source, sourceTime, fixedFrame) {",
        "  var targetFromFixed = lookupStampedTransform(edges, target, fixedFrame, targetTime);",
        "  if (!targetFromFixed.ok) return targetFromFixed;",
        "  var fixedFromSource = lookupStampedTransform(edges, fixedFrame, source, sourceTime);",
        "  if (!fixedFromSource.ok) return fixedFromSource;",
        "  return { ok: true, targetTime: targetTime, sourceTime: sourceTime, transform: compose(targetFromFixed.transform, fixedFromSource.transform) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "time-buffer",
      dependencies: ["stamped-lookup", "compose"],
      reference: docref("tf2 · Buffer::lookupTransform(target, target_time, source, source_time, fixed_frame)", "https://docs.ros.org/en/rolling/p/tf2_ros/generated/classtf2__ros_1_1Buffer.html"),
      scene: { kind: "robot-chain-time", view: "across-time", handles: [
        { id: "targetTime", type: "timeline", label: "target time t₁", value: 3, start: 0, end: 10 },
        { id: "sourceTime", type: "timeline", label: "source time t₂", value: 7, start: 0, end: 10 },
        { id: "target", type: "selector", label: "target", value: "base_link", options: CHAIN_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: CHAIN_OPTIONS },
      ], args: [{ fixture: "stampedEdges" }, { handle: "target" }, { handle: "targetTime" }, { handle: "source" }, { handle: "sourceTime" }, "map"] },
      diagnoses: [
        diagnosis("single-time", "Both ends were looked up at the target time: the source side must be sampled at sourceTime.", lines(
          "function lookupAcrossTime(edges, target, targetTime, source, sourceTime, fixedFrame) {",
          "  var targetFromFixed = lookupStampedTransform(edges, target, fixedFrame, targetTime);",
          "  if (!targetFromFixed.ok) return targetFromFixed;",
          "  var fixedFromSource = lookupStampedTransform(edges, fixedFrame, source, targetTime);",
          "  if (!fixedFromSource.ok) return fixedFromSource;",
          "  return { ok: true, targetTime: targetTime, sourceTime: sourceTime, transform: compose(targetFromFixed.transform, fixedFromSource.transform) };",
          "}"
        )),
        diagnosis("reversed-composition", "Composed in the wrong order: target←fixed goes on the left, fixed←source on the right.", lines(
          "function lookupAcrossTime(edges, target, targetTime, source, sourceTime, fixedFrame) {",
          "  var targetFromFixed = lookupStampedTransform(edges, target, fixedFrame, targetTime);",
          "  if (!targetFromFixed.ok) return targetFromFixed;",
          "  var fixedFromSource = lookupStampedTransform(edges, fixedFrame, source, sourceTime);",
          "  if (!fixedFromSource.ok) return fixedFromSource;",
          "  return { ok: true, targetTime: targetTime, sourceTime: sourceTime, transform: compose(fixedFromSource.transform, targetFromFixed.transform) };",
          "}"
        )),
      ],
      hints: ["Two ordinary stamped lookups, both through the fixed frame.", "target←fixed at t₁, then fixed←source at t₂.", "Return the first availability error, otherwise compose(targetFromFixed, fixedFromSource)."],
      cases: [
        example([STAMPED_EDGES_CASE, "base_link", 2, "base_link", 5, "map"], { ok: true, targetTime: 2, sourceTime: 5, transform: { x: 6, y: 0, yaw: 0 } }, "where the robot went"),
        example([STAMPED_EDGES_CASE, "laser", 0, "map", 6, "map"], { ok: true, targetTime: 0, sourceTime: 6, transform: { x: -1, y: 0, yaw: 0 } }, "map seen from the laser"),
        example([STAMPED_EDGES_CASE, "map", 8, "base_link", 3, "map"], { ok: false, code: "FUTURE_EXTRAPOLATION", bounds: { start: 0, end: 6 } }, "target time unavailable"),
        example([ROTATING_EDGES_CASE, "base_link", 0, "base_link", 10, "map"], { ok: true, targetTime: 0, sourceTime: 10, transform: { x: -4, y: 0, yaw: PI } }, "rotation across time"),
      ],
    }),
  ];

  function poseApply(t, p) {
    var c = Math.cos(t.yaw), s = Math.sin(t.yaw);
    return { x: c * p.x - s * p.y + t.x, y: s * p.x + c * p.y + t.y };
  }
  function poseInvert(t) {
    var c = Math.cos(t.yaw), s = Math.sin(t.yaw);
    return { x: -(c * t.x + s * t.y), y: -(-s * t.x + c * t.y), yaw: -t.yaw };
  }
  const DIAMOND = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
  const DIAMOND_ROTATED = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
  const DIAMOND_MOVED = [{ x: -2, y: 0 }, { x: -1, y: 1 }, { x: -2, y: 2 }, { x: -3, y: 1 }];
  const DIAMOND_AT_23 = DIAMOND.map((p) => ({ x: p.x + 2, y: p.y + 3 }));
  const DIAMOND_AT_12 = DIAMOND.map((p) => ({ x: p.x + 1, y: p.y + 2 }));
  const A20 = 20 * PI / 180;
  const DIAMOND_TURNED_20 = DIAMOND.map((p) => poseApply({ x: 0, y: 0, yaw: -A20 }, p));
  const LINE3 = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
  const LINE4 = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
  const LINE4_SHIFTED = [{ x: 0.1, y: 0 }, { x: 1.1, y: 0 }, { x: 2.1, y: 0 }, { x: 3.1, y: 0 }];
  const LINE4_REVERSED = [{ x: 3.1, y: 0 }, { x: 2.1, y: 0 }, { x: 1.1, y: 0 }, { x: 0.1, y: 0 }];
  const CORNER = [{ x: -1.5, y: 1 }, { x: -1, y: 1 }, { x: -0.5, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 0.5 }, { x: 0, y: 0 }, { x: 0, y: -0.5 }, { x: 0, y: -1 }];
  const CORNER_MOTION = { x: 0.3, y: -0.2, yaw: 0.15 };
  const CORNER_MOVED = [4, 0, 7, 2, 5, 1, 6, 3].map((index) => poseApply(poseInvert(CORNER_MOTION), CORNER[index]));
  const ICP_OPTIONS = { maxIterations: 30, eps: 1e-6 };

  const TOOLKIT_12 = [
    puzzle({
      number: 45, id: "centroid", track: "toolkit", title: "Centroid of a Cloud",
      goal: "Average a list of points.",
      concept: "Alignment removes the centroids first so only rotation is left to solve.",
      functionName: "centroid", signature: "centroid(points) → { x, y }",
      starterSource: starter("centroid", "points", "Sum x and y, divide by the count."),
      referenceSource: lines(
        "function centroid(points) {",
        "  var sx = 0, sy = 0;",
        "  for (var i = 0; i < points.length; i += 1) { sx += points[i].x; sy += points[i].y; }",
        "  return { x: sx / points.length, y: sy / points.length };",
        "}"
      ),
      comparator: "vector2", walkthroughChapter: "sensor-scenario",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "svd_motion_estimation (np.mean)"),
      scene: { kind: "cloud-align", view: "centroid", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "current" }] },
      hints: ["The centroid is the mean of x and the mean of y.", "Accumulate both sums in one loop.", "Return { x: sumX / n, y: sumY / n }."],
      cases: [
        example([[{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }]], { x: 1, y: 1 }, "square"),
        example([[{ x: 1, y: 1 }]], { x: 1, y: 1 }, "single point"),
        example([[{ x: -3, y: 4 }, { x: 5, y: -2 }, { x: 1, y: 7 }]], { x: 1, y: 3 }, "three points"),
      ],
    }),
    puzzle({
      number: 46, id: "cross-covariance", track: "toolkit", title: "Cross-Covariance of Two Clouds",
      goal: "Accumulate W = Σ (cᵢ − c̄)(pᵢ − p̄)ᵀ over paired points.",
      concept: "W holds every rotation clue between the clouds; PythonRobotics feeds it to an SVD.",
      functionName: "crossCovariance", signature: "crossCovariance(previous, current) → 2×2",
      starterSource: starter("crossCovariance", "previous, current", "Center both clouds with centroid, then sum the outer products c′ · p′ᵀ."),
      referenceSource: lines(
        "function crossCovariance(previous, current) {",
        "  var pm = centroid(previous), cm = centroid(current);",
        "  var w = [[0, 0], [0, 0]];",
        "  for (var i = 0; i < previous.length; i += 1) {",
        "    var px = previous[i].x - pm.x, py = previous[i].y - pm.y, cx = current[i].x - cm.x, cy = current[i].y - cm.y;",
        "    w[0][0] += cx * px; w[0][1] += cx * py; w[1][0] += cy * px; w[1][1] += cy * py;",
        "  }",
        "  return w;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      dependencies: ["centroid"],
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "svd_motion_estimation (W = c_shift @ p_shift.T)"),
      scene: { kind: "cloud-align", view: "covariance", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "previous" }, { fixture: "current" }] },
      diagnoses: [
        diagnosis("not-centered", "The clouds were not centered: subtract each centroid before the outer products.", lines(
          "function crossCovariance(previous, current) {",
          "  var w = [[0, 0], [0, 0]];",
          "  for (var i = 0; i < previous.length; i += 1) { w[0][0] += current[i].x * previous[i].x; w[0][1] += current[i].x * previous[i].y; w[1][0] += current[i].y * previous[i].x; w[1][1] += current[i].y * previous[i].y; }",
          "  return w;",
          "}"
        )),
        diagnosis("transposed", "Outer products are p′ · c′ᵀ: that is Wᵀ, which flips the recovered rotation.", lines(
          "function crossCovariance(previous, current) {",
          "  var pm = centroid(previous), cm = centroid(current);",
          "  var w = [[0, 0], [0, 0]];",
          "  for (var i = 0; i < previous.length; i += 1) {",
          "    var px = previous[i].x - pm.x, py = previous[i].y - pm.y, cx = current[i].x - cm.x, cy = current[i].y - cm.y;",
          "    w[0][0] += px * cx; w[0][1] += px * cy; w[1][0] += py * cx; w[1][1] += py * cy;",
          "  }",
          "  return w;",
          "}"
        )),
      ],
      hints: ["Center both clouds on their centroids first.", "Each pair adds the outer product of the centered current point and the centered previous point.", "w[0][0] += cx·px; w[0][1] += cx·py; w[1][0] += cy·px; w[1][1] += cy·py."],
      cases: [
        example([DIAMOND, DIAMOND_ROTATED], [[0, 2], [-2, 0]], "quarter turn"),
        example([DIAMOND, DIAMOND], [[2, 0], [0, 2]], "identical clouds"),
        example([DIAMOND_AT_23, DIAMOND_AT_12], [[2, 0], [0, 2]], "translation only"),
      ],
    }),
    puzzle({
      number: 47, id: "alignment-yaw", track: "toolkit", title: "Rotation from W",
      goal: "Read the aligning yaw straight out of the 2×2 cross-covariance.",
      concept: "In 2D the Kabsch/SVD solution collapses to one atan2; no SVD needed.",
      functionName: "alignmentYaw", signature: "alignmentYaw(W) → radians",
      starterSource: starter("alignmentYaw", "W", "yaw = atan2(W[0][1] − W[1][0], W[0][0] + W[1][1])."),
      referenceSource: "function alignmentYaw(W) { return Math.atan2(W[0][1] - W[1][0], W[0][0] + W[1][1]); }",
      comparator: "angle", walkthroughChapter: "composition",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "svd_motion_estimation (R = (u @ vh).T)"),
      scene: { kind: "cloud-align", view: "yaw", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "crossCovariance" }] },
      diagnoses: [diagnosis("sign-flipped", "The numerator is W01 − W10; swapping them recovers the inverse rotation.", "function alignmentYaw(W) { return Math.atan2(W[1][0] - W[0][1], W[0][0] + W[1][1]); }")],
      hints: ["The trace of W measures cos(yaw); the antisymmetric part measures sin(yaw).", "sin ∝ W01 − W10, cos ∝ W00 + W11.", "Return Math.atan2(W[0][1] - W[1][0], W[0][0] + W[1][1])."],
      cases: [
        example([[[0, 2], [-2, 0]]], PI / 2, "quarter turn"),
        example([[[2, 0], [0, 2]]], 0, "no rotation"),
        example([[[1, -1], [1, 1]]], -PI / 4, "negative rotation"),
        example([[[-2, 0], [0, -2]]], PI, "half turn"),
      ],
    }),
    puzzle({
      number: 48, id: "rigid-transform-from-pairs", track: "toolkit", title: "Rigid Transform from Paired Points",
      goal: "Find the transform that maps the current cloud onto the previous cloud, given index-paired points.",
      concept: "PythonRobotics' svd_motion_estimation: rotation from W, then t = p̄ − R c̄.",
      functionName: "rigidTransformFromPairs", signature: "rigidTransformFromPairs(previous, current) → { x, y, yaw }",
      starterSource: starter("rigidTransformFromPairs", "previous, current"),
      referenceSource: lines(
        "function rigidTransformFromPairs(previous, current) {",
        "  var pm = centroid(previous), cm = centroid(current);",
        "  var yaw = alignmentYaw(crossCovariance(previous, current));",
        "  var rotated = rotateVector(cm, yaw);",
        "  return { x: pm.x - rotated.x, y: pm.y - rotated.y, yaw: yaw };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "composition",
      dependencies: ["centroid", "cross-covariance", "alignment-yaw", "rotate-vector"],
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "svd_motion_estimation"),
      scene: { kind: "cloud-align", view: "rigid", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "previous" }, { fixture: "current" }] },
      diagnoses: [
        diagnosis("translation-unrotated", "t = p̄ − c̄ ignores the rotation: rotate the current centroid first, t = p̄ − R·c̄.", lines(
          "function rigidTransformFromPairs(previous, current) {",
          "  var pm = centroid(previous), cm = centroid(current);",
          "  var yaw = alignmentYaw(crossCovariance(previous, current));",
          "  return { x: pm.x - cm.x, y: pm.y - cm.y, yaw: yaw };",
          "}"
        )),
        diagnosis("reversed", "That maps previous onto current. The convention is previous ≈ T(current).", lines(
          "function rigidTransformFromPairs(previous, current) {",
          "  var pm = centroid(previous), cm = centroid(current);",
          "  var yaw = -alignmentYaw(crossCovariance(previous, current));",
          "  var rotated = rotateVector(pm, yaw);",
          "  return { x: cm.x - rotated.x, y: cm.y - rotated.y, yaw: yaw };",
          "}"
        )),
      ],
      hints: ["Centroids give the translation once the rotation is known.", "yaw from alignmentYaw(crossCovariance(previous, current)).", "t = p̄ − rotateVector(c̄, yaw)."],
      cases: [
        example([DIAMOND, DIAMOND_ROTATED], { x: 0, y: 0, yaw: PI / 2 }, "pure rotation"),
        example([DIAMOND_AT_23, DIAMOND_AT_12], { x: 1, y: 1, yaw: 0 }, "pure translation"),
        example([DIAMOND, DIAMOND_MOVED], { x: 1, y: 2, yaw: PI / 2 }, "rotation and translation"),
      ],
    }),
    puzzle({
      number: 49, id: "nearest-neighbors", track: "toolkit", title: "Nearest-Neighbour Association",
      goal: "For every current point, find the index of the nearest previous point and sum those distances.",
      concept: "Association is what turns two unordered clouds into pairs the rigid solver can use.",
      functionName: "nearestNeighbors", signature: "nearestNeighbors(previous, current) → { indexes, error }",
      starterSource: starter("nearestNeighbors", "previous, current"),
      referenceSource: lines(
        "function nearestNeighbors(previous, current) {",
        "  var indexes = [], error = 0;",
        "  for (var i = 0; i < current.length; i += 1) {",
        "    var best = 0, bestDistance = Infinity;",
        "    for (var j = 0; j < previous.length; j += 1) {",
        "      var d = Math.hypot(previous[j].x - current[i].x, previous[j].y - current[i].y);",
        "      if (d < bestDistance) { bestDistance = d; best = j; }",
        "    }",
        "    indexes.push(best);",
        "    error += bestDistance;",
        "  }",
        "  return { indexes: indexes, error: error };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "nearest_neighbor_association (this puzzle sums nearest distances)"),
      scene: { kind: "cloud-align", view: "neighbors", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "previous" }, { fixture: "currentShuffled" }] },
      diagnoses: [diagnosis("reversed-roles", "You searched from previous to current. The output has one index per current point.", lines(
        "function nearestNeighbors(previous, current) {",
        "  var indexes = [], error = 0;",
        "  for (var i = 0; i < previous.length; i += 1) {",
        "    var best = 0, bestDistance = Infinity;",
        "    for (var j = 0; j < current.length; j += 1) {",
        "      var d = Math.hypot(current[j].x - previous[i].x, current[j].y - previous[i].y);",
        "      if (d < bestDistance) { bestDistance = d; best = j; }",
        "    }",
        "    indexes.push(best);",
        "    error += bestDistance;",
        "  }",
        "  return { indexes: indexes, error: error };",
        "}"
      ))],
      hints: ["Loop over current points; for each, scan every previous point.", "Keep the smallest distance and its index.", "Sum the winning distances into error."],
      cases: [
        example([LINE3, [{ x: 2.1, y: 0 }, { x: 0.1, y: 0 }]], { indexes: [2, 0], error: 0.2 }, "two queries"),
        example([LINE3, LINE3], { indexes: [0, 1, 2], error: 0 }, "identical clouds"),
        example([[{ x: 0, y: 0 }, { x: 3, y: 4 }], [{ x: 3, y: 3 }, { x: 0, y: 1 }, { x: 1, y: 0 }]], { indexes: [1, 0, 0], error: 3 }, "shared neighbour"),
      ],
    }),
    puzzle({
      number: 50, id: "icp-step", track: "toolkit", title: "One ICP Iteration",
      goal: "Associate, estimate the rigid transform on the paired points, and move the current cloud.",
      concept: "Every ICP iteration is association followed by one closed-form alignment.",
      functionName: "icpStep", signature: "icpStep(previous, current) → { transform, moved, error }",
      starterSource: starter("icpStep", "previous, current"),
      referenceSource: lines(
        "function icpStep(previous, current) {",
        "  var match = nearestNeighbors(previous, current);",
        "  var paired = match.indexes.map(function (index) { return previous[index]; });",
        "  var transform = rigidTransformFromPairs(paired, current);",
        "  var moved = current.map(function (point) { return transformPoint(transform, point); });",
        "  return { transform: transform, moved: moved, error: match.error };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      dependencies: ["nearest-neighbors", "rigid-transform-from-pairs", "transform-point"],
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "icp_matching (loop body)"),
      scene: { kind: "cloud-align", view: "step", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "previous" }, { fixture: "currentShuffled" }] },
      diagnoses: [diagnosis("unpaired-estimate", "The rigid solve used the clouds in index order; pair each current point with its nearest previous point first.", lines(
        "function icpStep(previous, current) {",
        "  var match = nearestNeighbors(previous, current);",
        "  var transform = rigidTransformFromPairs(previous, current);",
        "  var moved = current.map(function (point) { return transformPoint(transform, point); });",
        "  return { transform: transform, moved: moved, error: match.error };",
        "}"
      ))],
      hints: ["Association first, then estimation, then application.", "paired[i] = previous[indexes[i]] lines the previous cloud up with current.", "moved = current mapped through transformPoint with the estimated transform."],
      cases: [
        example([LINE4, LINE4_SHIFTED], { transform: { x: -0.1, y: 0, yaw: 0 }, moved: LINE4, error: 0.4 }, "shifted line"),
        example([LINE4, LINE4_REVERSED], { transform: { x: -0.1, y: 0, yaw: 0 }, moved: [{ x: 3, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }], error: 0.4 }, "reversed order"),
        example([DIAMOND, DIAMOND], { transform: { x: 0, y: 0, yaw: 0 }, moved: DIAMOND, error: 0 }, "already aligned"),
      ],
    }),
    puzzle({
      number: 51, id: "icp-match", track: "toolkit", title: "Iterative Closest Point",
      goal: "Repeat icpStep until the association error stops improving, accumulating the total transform.",
      concept: "Each step's transform goes on the left of the running total, because it acts on already-moved points.",
      functionName: "icpMatch", signature: "icpMatch(previous, current, options) → { transform, error }",
      starterSource: starter("icpMatch", "previous, current, options"),
      referenceSource: lines(
        "function icpMatch(previous, current, options) {",
        "  var maxIterations = options && options.maxIterations ? options.maxIterations : 50;",
        "  var eps = options && typeof options.eps === \"number\" ? options.eps : 0.0001;",
        "  var accumulated = { x: 0, y: 0, yaw: 0 };",
        "  var points = current;",
        "  var previousError = Infinity, error = Infinity, iterations = 0;",
        "  while (iterations < maxIterations) {",
        "    var step = icpStep(previous, points);",
        "    iterations += 1;",
        "    error = step.error;",
        "    accumulated = compose(step.transform, accumulated);",
        "    points = step.moved;",
        "    var change = previousError - error;",
        "    previousError = error;",
        "    if (change < eps) break;",
        "  }",
        "  return { transform: accumulated, error: error };",
        "}"
      ),
      comparator: "deep", tolerance: 1e-3, walkthroughChapter: "sensor-scenario",
      dependencies: ["icp-step", "compose"],
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "icp_matching (this puzzle accumulates by left-multiplication)"),
      scene: { kind: "cloud-align", view: "icp", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "previous" }, { fixture: "currentShuffled" }, { fixture: "icpOptions" }] },
      diagnoses: [diagnosis("right-multiplied", "Accumulated on the right: each new step acts on already-moved points, so it goes on the left, compose(step, total).", lines(
        "function icpMatch(previous, current, options) {",
        "  var maxIterations = options && options.maxIterations ? options.maxIterations : 50;",
        "  var eps = options && typeof options.eps === \"number\" ? options.eps : 0.0001;",
        "  var accumulated = { x: 0, y: 0, yaw: 0 };",
        "  var points = current;",
        "  var previousError = Infinity, error = Infinity, iterations = 0;",
        "  while (iterations < maxIterations) {",
        "    var step = icpStep(previous, points);",
        "    iterations += 1;",
        "    error = step.error;",
        "    accumulated = compose(accumulated, step.transform);",
        "    points = step.moved;",
        "    var change = previousError - error;",
        "    previousError = error;",
        "    if (change < eps) break;",
        "  }",
        "  return { transform: accumulated, error: error };",
        "}"
      ))],
      hints: ["Keep a running transform and the moved cloud between iterations.", "total = compose(step.transform, total); stop when the error stops dropping by more than eps.", "Return the accumulated transform and the last association error."],
      cases: [
        example([LINE4, LINE4_SHIFTED, ICP_OPTIONS], { transform: { x: -0.1, y: 0, yaw: 0 }, error: 0 }, "shifted line"),
        example([DIAMOND, DIAMOND_TURNED_20, ICP_OPTIONS], { transform: { x: 0, y: 0, yaw: A20 }, error: 0 }, "turned diamond"),
        example([CORNER, CORNER_MOVED, ICP_OPTIONS], { transform: CORNER_MOTION, error: 0 }, "moved corner"),
        example([DIAMOND, DIAMOND, ICP_OPTIONS], { transform: { x: 0, y: 0, yaw: 0 }, error: 0 }, "already aligned"),
      ],
    }),
  ];

  const TF2_MATRIX3 = "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Matrix3x3.html";
  const TF2_QUATERNION = "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Quaternion.html";
  const IDENTITY_M3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const Z90_M3 = [[0, -1, 0], [1, 0, 0], [0, 0, 1]];
  const Y90_M3 = [[0, 0, 1], [0, 1, 0], [-1, 0, 0]];
  const X90_M3 = [[1, 0, 0], [0, 0, -1], [0, 1, 0]];
  const Z180_M3 = [[-1, 0, 0], [0, -1, 0], [0, 0, 1]];
  const AXIS_SLIDERS = [
    { id: "axisYaw", type: "slider", label: "axis yaw", value: 0.8, min: -PI, max: PI },
    { id: "axisPitch", type: "slider", label: "axis pitch", value: 0.5, min: -PI / 2, max: PI / 2 },
    { id: "angle", type: "slider", label: "angle", value: 1.2, min: -PI, max: PI },
  ];

  const ADVANCED_13 = [
    puzzle({
      number: 52, id: "rotation-matrix-from-quaternion", track: "advanced", title: "Quaternion to Rotation Matrix",
      goal: "Convert a quaternion into the 3×3 rotation matrix whose columns are the rotated axes.",
      concept: "Eigen, tf2::Matrix3x3, and every SLAM paper switch between these forms constantly.",
      functionName: "rotationMatrixFromQuaternion", signature: "rotationMatrixFromQuaternion(q) → 3×3",
      starterSource: starter("rotationMatrixFromQuaternion", "q", "Normalize first; then the standard 1 − 2(y² + z²), 2(xy − wz), … formula."),
      referenceSource: lines(
        "function rotationMatrixFromQuaternion(q) {",
        "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  var x = q.x / n, y = q.y / n, z = q.z / n, w = q.w / n;",
        "  return [",
        "    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],",
        "    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],",
        "    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],",
        "  ];",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "se3",
      reference: docref("tf2 · Matrix3x3::setRotation", TF2_MATRIX3),
      scene: { kind: "se3", view: "rpy", handles: RPY_SLIDERS, args: [{ fixture: "quatFromRPY" }] },
      diagnoses: [
        diagnosis("transposed", "That is the transpose, the inverse rotation: the sign pattern is +wz in row 1 column 0 and −wz in row 0 column 1.", lines(
          "function rotationMatrixFromQuaternion(q) {",
          "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  var x = q.x / n, y = q.y / n, z = q.z / n, w = q.w / n;",
          "  return [[1 - 2 * (y * y + z * z), 2 * (x * y + w * z), 2 * (x * z - w * y)], [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)], [2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y)]];",
          "}"
        )),
        diagnosis("not-normalized", "The quaternion was not normalized: a scaled quaternion produces a scaled, non-orthonormal matrix.", lines(
          "function rotationMatrixFromQuaternion(q) {",
          "  var x = q.x, y = q.y, z = q.z, w = q.w;",
          "  return [[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)], [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)], [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]];",
          "}"
        )),
      ],
      hints: ["Each column is where one axis lands: R·(1,0,0), R·(0,1,0), R·(0,0,1).", "Diagonal: 1 − 2(sum of the other two squares); off-diagonal: 2(product ± w·other).", "Row 0: [1 − 2(y²+z²), 2(xy − wz), 2(xz + wy)]; then cycle."],
      cases: [
        example([IDENTITY_Q], IDENTITY_M3, "identity"),
        example([Z90], Z90_M3, "Z quarter turn"),
        example([Y90], Y90_M3, "Y quarter turn"),
        example([X90], X90_M3, "X quarter turn"),
        example([{ x: 0, y: 0, z: 2 * HALF, w: 2 * HALF }], Z90_M3, "non-unit input"),
      ],
    }),
    puzzle({
      number: 53, id: "quaternion-from-rotation-matrix", track: "advanced", title: "Rotation Matrix to Quaternion",
      goal: "Recover a quaternion from a rotation matrix without losing precision at 180°.",
      concept: "Pick the largest of the trace and the three diagonal entries so the division is never by a tiny number.",
      functionName: "quaternionFromRotationMatrix", signature: "quaternionFromRotationMatrix(m) → quaternion",
      starterSource: starter("quaternionFromRotationMatrix", "m"),
      referenceSource: lines(
        "function quaternionFromRotationMatrix(m) {",
        "  var trace = m[0][0] + m[1][1] + m[2][2], s;",
        "  if (trace > 0) {",
        "    s = Math.sqrt(trace + 1) * 2;",
        "    return { x: (m[2][1] - m[1][2]) / s, y: (m[0][2] - m[2][0]) / s, z: (m[1][0] - m[0][1]) / s, w: 0.25 * s };",
        "  }",
        "  if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {",
        "    s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2;",
        "    return { x: 0.25 * s, y: (m[0][1] + m[1][0]) / s, z: (m[0][2] + m[2][0]) / s, w: (m[2][1] - m[1][2]) / s };",
        "  }",
        "  if (m[1][1] > m[2][2]) {",
        "    s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2;",
        "    return { x: (m[0][1] + m[1][0]) / s, y: 0.25 * s, z: (m[1][2] + m[2][1]) / s, w: (m[0][2] - m[2][0]) / s };",
        "  }",
        "  s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2;",
        "  return { x: (m[0][2] + m[2][0]) / s, y: (m[1][2] + m[2][1]) / s, z: 0.25 * s, w: (m[1][0] - m[0][1]) / s };",
        "}"
      ),
      comparator: "quaternion", walkthroughChapter: "se3",
      reference: docref("tf2 · Matrix3x3::getRotation", TF2_MATRIX3),
      scene: { kind: "se3", view: "rpy", handles: RPY_SLIDERS, args: [{ fixture: "matrixFromRPY" }] },
      diagnoses: [
        diagnosis("trace-only", "Only the trace branch was used: at 180° the trace is −1 and the square root is zero, so the result blows up. Branch on the largest diagonal entry.", lines(
          "function quaternionFromRotationMatrix(m) {",
          "  var s = Math.sqrt(m[0][0] + m[1][1] + m[2][2] + 1) * 2;",
          "  return { x: (m[2][1] - m[1][2]) / s, y: (m[0][2] - m[2][0]) / s, z: (m[1][0] - m[0][1]) / s, w: 0.25 * s };",
          "}"
        )),
        diagnosis("conjugated", "The vector part has the wrong sign: x uses m21 − m12, not m12 − m21.", lines(
          "function quaternionFromRotationMatrix(m) {",
          "  var trace = m[0][0] + m[1][1] + m[2][2], s;",
          "  if (trace > 0) { s = Math.sqrt(trace + 1) * 2; return { x: (m[1][2] - m[2][1]) / s, y: (m[2][0] - m[0][2]) / s, z: (m[0][1] - m[1][0]) / s, w: 0.25 * s }; }",
          "  if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) { s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2; return { x: -0.25 * s, y: -(m[0][1] + m[1][0]) / s, z: -(m[0][2] + m[2][0]) / s, w: (m[2][1] - m[1][2]) / s }; }",
          "  if (m[1][1] > m[2][2]) { s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2; return { x: -(m[0][1] + m[1][0]) / s, y: -0.25 * s, z: -(m[1][2] + m[2][1]) / s, w: (m[0][2] - m[2][0]) / s }; }",
          "  s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2;",
          "  return { x: -(m[0][2] + m[2][0]) / s, y: -(m[1][2] + m[2][1]) / s, z: -0.25 * s, w: (m[1][0] - m[0][1]) / s };",
          "}"
        )),
      ],
      hints: ["When the trace is positive, w = √(trace + 1) / 2 and the vector part comes from the antisymmetric entries.", "Otherwise pick the largest diagonal entry and solve for that component first.", "Four branches: trace, m00, m11, m22; each divides by s = 2·√(1 + chosen − others)."],
      cases: [
        example([IDENTITY_M3], IDENTITY_Q, "identity"),
        example([Z90_M3], Z90, "Z quarter turn"),
        example([Z180_M3], { x: 0, y: 0, z: 1, w: 0 }, "Z half turn (trace −1)"),
        example([X90_M3], X90, "X quarter turn"),
        example([Y90_M3], Y90, "Y quarter turn"),
      ],
    }),
    puzzle({
      number: 54, id: "quaternion-from-axis-angle", track: "advanced", title: "Axis-Angle to Quaternion",
      goal: "Build the quaternion for a rotation of angle about an axis.",
      concept: "A quaternion is literally (axis · sin(θ/2), cos(θ/2)); yaw quaternions were the Z-axis special case.",
      functionName: "quaternionFromAxisAngle", signature: "quaternionFromAxisAngle(axis, angle) → quaternion",
      starterSource: starter("quaternionFromAxisAngle", "axis, angle", "Normalize the axis; multiply it by sin(angle/2); w = cos(angle/2)."),
      referenceSource: lines(
        "function quaternionFromAxisAngle(axis, angle) {",
        "  var n = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);",
        "  var s = Math.sin(angle / 2);",
        "  return { x: axis.x / n * s, y: axis.y / n * s, z: axis.z / n * s, w: Math.cos(angle / 2) };",
        "}"
      ),
      comparator: "quaternion", walkthroughChapter: "se3",
      reference: docref("tf2 · Quaternion::setRotation(axis, angle)", TF2_QUATERNION),
      scene: { kind: "se3", view: "axis-angle", handles: AXIS_SLIDERS, args: [{ fixture: "axisFromSliders" }, { handle: "angle" }] },
      diagnoses: [
        diagnosis("full-angle", "Used the full angle: quaternions store half angles.", "function quaternionFromAxisAngle(axis, angle) { var n = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z); var s = Math.sin(angle); return { x: axis.x / n * s, y: axis.y / n * s, z: axis.z / n * s, w: Math.cos(angle) }; }"),
        diagnosis("axis-not-normalized", "The axis was not normalized, so the quaternion length depends on the axis length.", "function quaternionFromAxisAngle(axis, angle) { var s = Math.sin(angle / 2); return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(angle / 2) }; }"),
      ],
      hints: ["The axis must be a unit vector.", "Vector part = axis · sin(angle/2); scalar part = cos(angle/2).", "Divide the axis by its length before scaling by sin(angle/2)."],
      cases: [
        example([{ x: 0, y: 0, z: 1 }, PI / 2], Z90, "Z quarter turn"),
        example([{ x: 1, y: 0, z: 0 }, PI / 2], X90, "X quarter turn"),
        example([{ x: 0, y: 0, z: 2 }, PI], { x: 0, y: 0, z: 1, w: 0 }, "non-unit axis"),
        example([{ x: 1, y: 1, z: 0 }, PI], { x: HALF, y: HALF, z: 0, w: 0 }, "diagonal axis"),
        example([{ x: 0, y: 1, z: 0 }, 0], IDENTITY_Q, "zero angle"),
      ],
    }),
    puzzle({
      number: 55, id: "axis-angle-from-quaternion", track: "advanced", title: "Quaternion to Axis-Angle",
      goal: "Recover the rotation axis and the angle in [0, π] from a quaternion.",
      concept: "q and −q are the same rotation, so flip the sign when w is negative to get the short angle.",
      functionName: "axisAngleFromQuaternion", signature: "axisAngleFromQuaternion(q) → { axis, angle }",
      starterSource: starter("axisAngleFromQuaternion", "q", "Normalize; flip q if w < 0; angle = 2·atan2(|v|, w); axis = v / |v| (or +Z when |v| ≈ 0)."),
      referenceSource: lines(
        "function axisAngleFromQuaternion(q) {",
        "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  var x = q.x / n, y = q.y / n, z = q.z / n, w = q.w / n;",
        "  if (w < 0) { x = -x; y = -y; z = -z; w = -w; }",
        "  var s = Math.sqrt(x * x + y * y + z * z);",
        "  if (s < 1e-9) return { axis: { x: 0, y: 0, z: 1 }, angle: 0 };",
        "  return { axis: { x: x / s, y: y / s, z: z / s }, angle: 2 * Math.atan2(s, w) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "se3",
      reference: docref("tf2 · Quaternion::getAxis / getAngle", TF2_QUATERNION),
      scene: { kind: "se3", view: "axis-angle", handles: AXIS_SLIDERS, args: [{ fixture: "quatFromAxisAngle" }] },
      diagnoses: [
        diagnosis("no-flip", "A negative w gives the long way around (angle > π) and a flipped axis: negate the whole quaternion first.", lines(
          "function axisAngleFromQuaternion(q) {",
          "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  var x = q.x / n, y = q.y / n, z = q.z / n, w = q.w / n;",
          "  var s = Math.sqrt(x * x + y * y + z * z);",
          "  if (s < 1e-9) return { axis: { x: 0, y: 0, z: 1 }, angle: 0 };",
          "  return { axis: { x: x / s, y: y / s, z: z / s }, angle: 2 * Math.atan2(s, w) };",
          "}"
        )),
        diagnosis("axis-unnormalized", "The axis is the vector part divided by its length, not the raw vector part.", lines(
          "function axisAngleFromQuaternion(q) {",
          "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  var x = q.x / n, y = q.y / n, z = q.z / n, w = q.w / n;",
          "  if (w < 0) { x = -x; y = -y; z = -z; w = -w; }",
          "  var s = Math.sqrt(x * x + y * y + z * z);",
          "  if (s < 1e-9) return { axis: { x: 0, y: 0, z: 1 }, angle: 0 };",
          "  return { axis: { x: x, y: y, z: z }, angle: 2 * Math.atan2(s, w) };",
          "}"
        )),
      ],
      hints: ["|v| = sin(θ/2) and w = cos(θ/2) for a unit quaternion.", "angle = 2·atan2(|v|, w); axis = v / |v|.", "Negate q when w < 0 so the angle stays within [0, π]; return +Z with angle 0 for the identity."],
      cases: [
        example([Z90], { axis: { x: 0, y: 0, z: 1 }, angle: PI / 2 }, "Z quarter turn"),
        example([X90], { axis: { x: 1, y: 0, z: 0 }, angle: PI / 2 }, "X quarter turn"),
        example([{ x: 0, y: 0, z: 1, w: 0 }], { axis: { x: 0, y: 0, z: 1 }, angle: PI }, "half turn"),
        example([IDENTITY_Q], { axis: { x: 0, y: 0, z: 1 }, angle: 0 }, "identity"),
        example([{ x: 0, y: 0, z: -HALF, w: -HALF }], { axis: { x: 0, y: 0, z: 1 }, angle: PI / 2 }, "negated quaternion"),
      ],
    }),
  ];

  const ADVANCED_14 = [
    puzzle({
      number: 56, id: "static-from-urdf", track: "advanced", title: "Static Mount from URDF",
      goal: "Turn a URDF <origin xyz rpy> into the SE(3) transform a static broadcaster publishes.",
      concept: "Every sensor mount on a real robot is specified exactly this way; robot_state_publisher turns it into a static TF.",
      functionName: "staticFromUrdf", signature: "staticFromUrdf(xyz, rpy) → { translation, rotation }",
      starterSource: starter("staticFromUrdf", "xyz, rpy", "xyz is [x, y, z] metres; rpy is [roll, pitch, yaw] radians."),
      referenceSource: lines(
        "function staticFromUrdf(xyz, rpy) {",
        "  return { translation: { x: xyz[0], y: xyz[1], z: xyz[2] }, rotation: quaternionFromRPY(rpy[0], rpy[1], rpy[2]) };",
        "}"
      ),
      comparator: "se3", walkthroughChapter: "broadcasters",
      dependencies: ["quaternion-from-rpy"],
      reference: docref("URDF · <joint> <origin xyz rpy>", "https://wiki.ros.org/urdf/XML/joint"),
      scene: { kind: "se3", view: "urdf", handles: [
        { id: "roll", type: "slider", label: "roll", value: 0.2, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "pitch", value: -0.1, min: -PI / 2, max: PI / 2 },
        { id: "yaw", type: "slider", label: "yaw", value: 1.2, min: -PI, max: PI },
      ], args: [{ fixture: "urdfXyz" }, { fixture: "rpyArray" }] },
      diagnoses: [
        diagnosis("degrees-assumed", "URDF angles are radians already; converting from degrees shrinks them.", "function staticFromUrdf(xyz, rpy) { return { translation: { x: xyz[0], y: xyz[1], z: xyz[2] }, rotation: quaternionFromRPY(rpy[0] * Math.PI / 180, rpy[1] * Math.PI / 180, rpy[2] * Math.PI / 180) }; }"),
        diagnosis("rpy-order-swapped", "The array is [roll, pitch, yaw]; it was read as [yaw, pitch, roll].", "function staticFromUrdf(xyz, rpy) { return { translation: { x: xyz[0], y: xyz[1], z: xyz[2] }, rotation: quaternionFromRPY(rpy[2], rpy[1], rpy[0]) }; }"),
      ],
      hints: ["Translation is the xyz triple as is.", "Rotation is quaternionFromRPY(roll, pitch, yaw) with the array in that order.", "Return { translation: { x: xyz[0], y: xyz[1], z: xyz[2] }, rotation: quaternionFromRPY(rpy[0], rpy[1], rpy[2]) }."],
      cases: [
        example([[0.2, 0, 0.1], [0, 0, PI / 2]], { translation: { x: 0.2, y: 0, z: 0.1 }, rotation: Z90 }, "laser mount"),
        example([[0, 0, 0], [PI / 2, 0, 0]], { translation: { x: 0, y: 0, z: 0 }, rotation: X90 }, "roll only"),
        example([[1, 2, 3], [0, 0, 0]], { translation: { x: 1, y: 2, z: 3 }, rotation: IDENTITY_Q }, "translation only"),
        example([[0, 0, 0], [-PI / 2, 0, -PI / 2]], { translation: { x: 0, y: 0, z: 0 }, rotation: { x: -0.5, y: 0.5, z: -0.5, w: 0.5 } }, "camera optical mount"),
      ],
    }),
    puzzle({
      number: 57, id: "twist-from-poses", track: "advanced", title: "Twist from Two Poses",
      goal: "Estimate the body-frame velocity between two stamped poses.",
      concept: "Odometry messages carry a twist in the child frame; it is relativeTransform divided by dt.",
      functionName: "twistFromPoses", signature: "twistFromPoses(a, b, dt) → { vx, vy, wz }",
      starterSource: starter("twistFromPoses", "a, b, dt", "relativeTransform(a, b) is the motion seen from a; divide by dt."),
      referenceSource: lines(
        "function twistFromPoses(a, b, dt) {",
        "  var relative = relativeTransform(a, b);",
        "  return { vx: relative.x / dt, vy: relative.y / dt, wz: relative.yaw / dt };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["relative-transform"],
      reference: docref("nav_msgs/Odometry · twist is expressed in the child frame", "https://docs.ros.org/en/rolling/p/nav_msgs/msg/Odometry.html"),
      scene: { kind: "twist", handles: [
        { id: "a", type: "pose", label: "a", value: { x: -2, y: -0.5, yaw: 0.3 } },
        { id: "b", type: "pose", label: "b", value: { x: 0.5, y: 0.8, yaw: 0.9 } },
        { id: "dt", type: "slider", label: "dt (s)", value: 1.0, min: 0.1, max: 2 },
      ] },
      diagnoses: [
        diagnosis("world-frame-delta", "That is the world-frame displacement: a twist is expressed in a's body frame, so use relativeTransform first.", "function twistFromPoses(a, b, dt) { return { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt, wz: wrapAngle(b.yaw - a.yaw) / dt }; }"),
        diagnosis("no-dt", "Not divided by dt: a twist is a rate, not a displacement.", "function twistFromPoses(a, b, dt) { var relative = relativeTransform(a, b); return { vx: relative.x, vy: relative.y, wz: relative.yaw }; }"),
      ],
      hints: ["Where is b as seen from a? That is relativeTransform(a, b).", "Divide each component by dt.", "Return { vx: rel.x / dt, vy: rel.y / dt, wz: rel.yaw / dt }."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, { x: 1, y: 0, yaw: 0 }, 0.5], { vx: 2, vy: 0, wz: 0 }, "forward"),
        example([{ x: 0, y: 0, yaw: PI / 2 }, { x: 0, y: 1, yaw: PI / 2 }, 1], { vx: 1, vy: 0, wz: 0 }, "forward while facing +y"),
        example([{ x: 0, y: 0, yaw: 0 }, { x: 0, y: 0, yaw: 0.2 }, 0.1], { vx: 0, vy: 0, wz: 2 }, "turn in place"),
        example([{ x: 1, y: 1, yaw: PI }, { x: 0, y: 1, yaw: PI }, 1], { vx: 1, vy: 0, wz: 0 }, "forward while facing −x"),
      ],
    }),
    puzzle({
      number: 58, id: "deskew-scan", track: "advanced", title: "De-skew a Lidar Scan",
      goal: "Re-express every scan point, measured at its own time, in the sensor frame at the end of the scan.",
      concept: "A spinning lidar moves while it scans; without de-skewing, a straight wall bends.",
      functionName: "deskewScan", signature: "deskewScan(points, times, samples, endTime) → points",
      starterSource: starter("deskewScan", "points, times, samples, endTime"),
      referenceSource: lines(
        "function deskewScan(points, times, samples, endTime) {",
        "  var toEnd = invert(sampleEdge({ samples: samples }, endTime));",
        "  var out = [];",
        "  for (var i = 0; i < points.length; i += 1) {",
        "    var poseAtTime = sampleEdge({ samples: samples }, times[i]);",
        "    out.push(transformPoint(compose(toEnd, poseAtTime), points[i]));",
        "  }",
        "  return out;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      dependencies: ["sample-edge", "compose", "invert", "transform-point"],
      reference: docref("laser_geometry · LaserProjection::transformLaserScanToPointCloud", "https://docs.ros.org/en/rolling/p/laser_geometry/"),
      scene: { kind: "deskew", handles: [{ id: "end", type: "pose", label: "sensor at t=1", value: { x: 1.2, y: 0.3, yaw: 0.4 } }], args: [{ fixture: "rawPoints" }, { fixture: "times" }, { fixture: "samples" }, 1] },
      diagnoses: [
        diagnosis("no-interpolation", "Every point used the end pose, so nothing moved: sample the pose at each point's own time.", lines(
          "function deskewScan(points, times, samples, endTime) {",
          "  var endPose = sampleEdge({ samples: samples }, endTime);",
          "  var toEnd = invert(endPose);",
          "  return points.map(function (point) { return transformPoint(compose(toEnd, endPose), point); });",
          "}"
        )),
        diagnosis("inverse-direction", "The composition is backwards: go from the point's frame up to odom, then down into the end frame: compose(invert(endPose), poseAtTime).", lines(
          "function deskewScan(points, times, samples, endTime) {",
          "  var endPose = sampleEdge({ samples: samples }, endTime);",
          "  var out = [];",
          "  for (var i = 0; i < points.length; i += 1) {",
          "    var poseAtTime = sampleEdge({ samples: samples }, times[i]);",
          "    out.push(transformPoint(compose(invert(poseAtTime), endPose), points[i]));",
          "  }",
          "  return out;",
          "}"
        )),
      ],
      hints: ["Each point lives in the sensor frame at its own time.", "Go up to odom with the pose at that time, then down into the end frame with the inverse of the end pose.", "T = compose(invert(pose(endTime)), pose(times[i])); apply it to points[i]."],
      cases: [
        example([[{ x: 3, y: 0 }, { x: 3, y: 1 }], [0, 0.5], [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 1, transform: { x: 0, y: 0, yaw: 0 } }], 1], [{ x: 3, y: 0 }, { x: 3, y: 1 }], "stationary sensor"),
        example([[{ x: 3, y: 0 }, { x: 2.5, y: 0 }, { x: 2, y: 0 }], [0, 0.5, 1], [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 1, transform: { x: 1, y: 0, yaw: 0 } }], 1], [{ x: 2, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 0 }], "moving forward"),
        example([[{ x: 1, y: 0 }, { x: 0.5, y: 0 }], [0, 1], [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 1, transform: { x: 0, y: 0, yaw: PI / 2 } }], 1], [{ x: 0, y: -1 }, { x: 0.5, y: 0 }], "turning in place"),
        example([[], [], [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 1, transform: { x: 1, y: 0, yaw: 0 } }], 1], [], "empty scan"),
      ],
    }),
  ];

  const TF2_BUFFER_CORE = "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1BufferCore.html";
  const TF2_ROS_BUFFER = "https://docs.ros.org/en/rolling/p/tf2_ros/generated/classtf2__ros_1_1Buffer.html";
  const EMPTY_BUFFER = { duration: 10, edges: {} };
  const LASER_STATIC_EDGE = { isStatic: true, samples: [{ time: 0, parent: "base_link", transform: { x: 1, y: 0, yaw: 0 } }] };
  const ODOM_TWO = { isStatic: false, samples: [{ time: 0, parent: "map", transform: { x: 0, y: 0, yaw: 0 } }, { time: 5, parent: "map", transform: { x: 5, y: 0, yaw: 0 } }] };
  const CHAIN_BUFFER = { duration: 10, edges: {
    odom: { isStatic: false, samples: [{ time: 0, parent: "map", transform: { x: 0, y: 0, yaw: 0 } }, { time: 10, parent: "map", transform: { x: 10, y: 0, yaw: 0 } }] },
    base_link: { isStatic: false, samples: [{ time: 2, parent: "odom", transform: { x: 0, y: 0, yaw: 0 } }, { time: 9, parent: "odom", transform: { x: 7, y: 0, yaw: 0 } }] },
    laser: LASER_STATIC_EDGE,
    camera: { isStatic: false, samples: [{ time: 8, parent: "base_link", transform: { x: 0, y: 0.3, yaw: 0 } }, { time: 9, parent: "base_link", transform: { x: 0, y: 0.3, yaw: 0 } }] },
  } };
  const REPARENT_BUFFER = { duration: 10, edges: {
    odom: { isStatic: false, samples: [{ time: 0, parent: "map", transform: { x: 2, y: 0, yaw: 0 } }, { time: 10, parent: "map", transform: { x: 2, y: 0, yaw: 0 } }] },
    base_link: { isStatic: false, samples: [{ time: 0, parent: "odom", transform: { x: 1, y: 0, yaw: 0 } }, { time: 6, parent: "map", transform: { x: 5, y: 0, yaw: 0 } }, { time: 9, parent: "map", transform: { x: 5, y: 0, yaw: 0 } }] },
    laser: LASER_STATIC_EDGE,
  } };
  const ARRIVALS = [{ time: 0, arrival: 0.2 }, { time: 1, arrival: 1.3 }, { time: 2, arrival: 2.1 }, { time: 3, arrival: 3.6 }, { time: 4, arrival: 4.2 }];

  const ADVANCED_15 = [
    puzzle({
      number: 59, id: "insert-transform", track: "advanced", title: "Insert into a TF Buffer",
      goal: "Latch a static transform, or append a dynamic one and prune history older than the buffer duration.",
      concept: "This is the whole static-versus-dynamic difference: one latched sample forever, versus a sliding window of stamped samples.",
      functionName: "insertTransform", signature: "insertTransform(buffer, sample, isStatic) → newBuffer",
      starterSource: starter("insertTransform", "buffer, sample, isStatic", "sample is { child, parent, time, transform }. Return a new buffer; do not mutate."),
      referenceSource: lines(
        "function insertTransform(buffer, sample, isStatic) {",
        "  var edges = Object.assign({}, buffer.edges);",
        "  var entry = { time: sample.time, parent: sample.parent, transform: sample.transform };",
        "  if (isStatic) {",
        "    edges[sample.child] = { isStatic: true, samples: [entry] };",
        "    return { duration: buffer.duration, edges: edges };",
        "  }",
        "  var existing = edges[sample.child] && !edges[sample.child].isStatic ? edges[sample.child].samples : [];",
        "  var samples = existing.concat([entry]).sort(function (a, b) { return a.time - b.time; });",
        "  var newest = samples[samples.length - 1].time;",
        "  samples = samples.filter(function (s) { return s.time >= newest - buffer.duration; });",
        "  edges[sample.child] = { isStatic: false, samples: samples };",
        "  return { duration: buffer.duration, edges: edges };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "broadcasters",
      reference: docref("tf2 · BufferCore::setTransform and TimeCache pruning", TF2_BUFFER_CORE),
      scene: { kind: "buffer", view: "insert", handles: [
        { id: "time", type: "timeline", label: "sample time", value: 14, start: 0, end: 20 },
        { id: "kind", type: "selector", label: "edge", value: "dynamic", options: ["dynamic", "static"] },
      ], args: [{ fixture: "buffer" }, { fixture: "insertedSample" }, { fixture: "insertIsStatic" }] },
      diagnoses: [
        diagnosis("no-pruning", "Old samples were kept: a dynamic edge only holds samples newer than newest − duration.", lines(
          "function insertTransform(buffer, sample, isStatic) {",
          "  var edges = Object.assign({}, buffer.edges);",
          "  var entry = { time: sample.time, parent: sample.parent, transform: sample.transform };",
          "  if (isStatic) { edges[sample.child] = { isStatic: true, samples: [entry] }; return { duration: buffer.duration, edges: edges }; }",
          "  var existing = edges[sample.child] && !edges[sample.child].isStatic ? edges[sample.child].samples : [];",
          "  var samples = existing.concat([entry]).sort(function (a, b) { return a.time - b.time; });",
          "  edges[sample.child] = { isStatic: false, samples: samples };",
          "  return { duration: buffer.duration, edges: edges };",
          "}"
        )),
        diagnosis("static-appended", "A static transform was appended like a dynamic sample: static edges are latched, one sample that replaces the previous one.", lines(
          "function insertTransform(buffer, sample, isStatic) {",
          "  var edges = Object.assign({}, buffer.edges);",
          "  var entry = { time: sample.time, parent: sample.parent, transform: sample.transform };",
          "  var existing = edges[sample.child] ? edges[sample.child].samples : [];",
          "  var samples = existing.concat([entry]).sort(function (a, b) { return a.time - b.time; });",
          "  if (!isStatic) { var newest = samples[samples.length - 1].time; samples = samples.filter(function (s) { return s.time >= newest - buffer.duration; }); }",
          "  edges[sample.child] = { isStatic: isStatic, samples: samples };",
          "  return { duration: buffer.duration, edges: edges };",
          "}"
        )),
      ],
      hints: ["Copy buffer.edges; never modify the input.", "Static: edges[child] = { isStatic: true, samples: [entry] }.", "Dynamic: append, sort by time, then keep only samples with time ≥ newest − buffer.duration."],
      cases: [
        example([EMPTY_BUFFER, { child: "laser", parent: "base_link", time: 0, transform: { x: 1, y: 0, yaw: 0 } }, true], { duration: 10, edges: { laser: { isStatic: true, samples: [{ time: 0, parent: "base_link", transform: { x: 1, y: 0, yaw: 0 } }] } } }, "latch a static edge"),
        example([{ duration: 10, edges: { odom: ODOM_TWO } }, { child: "odom", parent: "map", time: 14, transform: { x: 14, y: 0, yaw: 0 } }, false], { duration: 10, edges: { odom: { isStatic: false, samples: [{ time: 5, parent: "map", transform: { x: 5, y: 0, yaw: 0 } }, { time: 14, parent: "map", transform: { x: 14, y: 0, yaw: 0 } }] } } }, "append and prune"),
        example([{ duration: 10, edges: { laser: LASER_STATIC_EDGE } }, { child: "laser", parent: "base_link", time: 3, transform: { x: 2, y: 0, yaw: 0 } }, true], { duration: 10, edges: { laser: { isStatic: true, samples: [{ time: 3, parent: "base_link", transform: { x: 2, y: 0, yaw: 0 } }] } } }, "republish a static edge"),
        example([{ duration: 10, edges: { odom: { isStatic: false, samples: [{ time: 0, parent: "map", transform: { x: 0, y: 0, yaw: 0 } }, { time: 8, parent: "map", transform: { x: 8, y: 0, yaw: 0 } }] } } }, { child: "odom", parent: "map", time: 4, transform: { x: 4, y: 0, yaw: 0 } }, false], { duration: 10, edges: { odom: { isStatic: false, samples: [{ time: 0, parent: "map", transform: { x: 0, y: 0, yaw: 0 } }, { time: 4, parent: "map", transform: { x: 4, y: 0, yaw: 0 } }, { time: 8, parent: "map", transform: { x: 8, y: 0, yaw: 0 } }] } } }, "out-of-order arrival"),
      ],
    }),
    puzzle({
      number: 60, id: "parent-at", track: "advanced", title: "Parent at a Time",
      goal: "Find a frame's parent at a given time, and refuse to interpolate across a reparenting.",
      concept: "TF2 allows a child's parent to change over time; the two samples around a lookup must agree.",
      functionName: "parentAt", signature: "parentAt(buffer, child, time) → parent | null",
      starterSource: starter("parentAt", "buffer, child, time"),
      referenceSource: lines(
        "function parentAt(buffer, child, time) {",
        "  var edge = buffer.edges[child];",
        "  if (!edge || !edge.samples.length) return null;",
        "  if (edge.isStatic) return edge.samples[0].parent;",
        "  var b = bracketSamples(edge.samples, time);",
        "  var before = edge.samples[b.beforeIndex], after = edge.samples[b.afterIndex];",
        "  if (b.amount === 0) return before.parent;",
        "  return before.parent === after.parent ? before.parent : null;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "tree",
      dependencies: ["bracket-samples"],
      reference: docref("tf2 · TimeCache::getParent", "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1TimeCache.html"),
      scene: { kind: "buffer", view: "parents", handles: [{ id: "time", type: "timeline", label: "time", value: 3, start: -1, end: 11 }], args: [{ fixture: "reparentBuffer" }, "base_link", { handle: "time" }] },
      diagnoses: [
        diagnosis("latest-only", "Always returned the newest sample's parent: the parent must be read at the requested time.", lines(
          "function parentAt(buffer, child, time) {",
          "  var edge = buffer.edges[child];",
          "  if (!edge || !edge.samples.length) return null;",
          "  return edge.samples[edge.samples.length - 1].parent;",
          "}"
        )),
        diagnosis("ignores-change", "Returned the earlier sample's parent even when the later one differs: interpolating across a reparenting is not allowed, return null.", lines(
          "function parentAt(buffer, child, time) {",
          "  var edge = buffer.edges[child];",
          "  if (!edge || !edge.samples.length) return null;",
          "  if (edge.isStatic) return edge.samples[0].parent;",
          "  var b = bracketSamples(edge.samples, time);",
          "  return edge.samples[b.beforeIndex].parent;",
          "}"
        )),
      ],
      hints: ["Static edges have one parent for all time.", "Bracket the dynamic samples with bracketSamples; an exact hit (amount 0) uses that sample's parent.", "If the two bracketing samples name different parents, return null."],
      cases: [
        example([REPARENT_BUFFER, "base_link", 7], "map", "after the reparenting"),
        example([REPARENT_BUFFER, "base_link", 3], null, "across the reparenting"),
        example([REPARENT_BUFFER, "base_link", -1], "odom", "before the history"),
        example([REPARENT_BUFFER, "laser", 42], "base_link", "static edge"),
        example([REPARENT_BUFFER, "camera", 1], null, "unknown child"),
        example([REPARENT_BUFFER, "base_link", 0], "odom", "exactly on a sample"),
      ],
    }),
    puzzle({
      number: 61, id: "buffer-can-transform", track: "advanced", title: "Can the Buffer Answer?",
      goal: "Decide whether a lookup is answerable: connected path, every dynamic edge on it covers the time, no reparenting in between.",
      concept: "Static edges never limit a lookup; only the dynamic edges on the actual path do.",
      functionName: "canTransform", signature: "canTransform(buffer, target, source, time) → { ok } | { ok: false, code }",
      starterSource: starter("canTransform", "buffer, target, source, time", "Codes: DISCONNECTED, PAST_EXTRAPOLATION, FUTURE_EXTRAPOLATION, PARENT_CHANGE."),
      referenceSource: lines(
        "function canTransform(buffer, target, source, time) {",
        "  var tree = {};",
        "  Object.keys(buffer.edges).forEach(function (child) {",
        "    var edge = buffer.edges[child];",
        "    tree[child] = { parent: parentAt(buffer, child, time) || edge.samples[edge.samples.length - 1].parent };",
        "  });",
        "  var steps = directedPath(tree, target, source);",
        "  if (steps === null) return { ok: false, code: \"DISCONNECTED\" };",
        "  for (var i = 0; i < steps.length; i += 1) {",
        "    var edge = buffer.edges[steps[i].child];",
        "    if (edge.isStatic) continue;",
        "    var start = edge.samples[0].time, end = edge.samples[edge.samples.length - 1].time;",
        "    if (time < start) return { ok: false, code: \"PAST_EXTRAPOLATION\" };",
        "    if (time > end) return { ok: false, code: \"FUTURE_EXTRAPOLATION\" };",
        "    if (parentAt(buffer, steps[i].child, time) === null) return { ok: false, code: \"PARENT_CHANGE\" };",
        "  }",
        "  return { ok: true };",
        "}"
      ),
      comparator: "error", walkthroughChapter: "time-buffer",
      dependencies: ["parent-at", "directed-path"],
      reference: docref("tf2_ros · Buffer::canTransform", TF2_ROS_BUFFER),
      scene: { kind: "buffer", view: "can", handles: [
        { id: "time", type: "timeline", label: "time", value: 5, start: -1, end: 12 },
        { id: "target", type: "selector", label: "target", value: "map", options: CHAIN_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: CHAIN_OPTIONS },
      ], args: [{ fixture: "buffer" }, { handle: "target" }, { handle: "source" }, { handle: "time" }] },
      diagnoses: [
        diagnosis("static-ranged", "A static edge was treated as a range around its latch time: static edges are valid at every time.", lines(
          "function canTransform(buffer, target, source, time) {",
          "  var tree = {};",
          "  Object.keys(buffer.edges).forEach(function (child) { var edge = buffer.edges[child]; tree[child] = { parent: parentAt(buffer, child, time) || edge.samples[edge.samples.length - 1].parent }; });",
          "  var steps = directedPath(tree, target, source);",
          "  if (steps === null) return { ok: false, code: \"DISCONNECTED\" };",
          "  for (var i = 0; i < steps.length; i += 1) {",
          "    var edge = buffer.edges[steps[i].child];",
          "    var start = edge.samples[0].time, end = edge.samples[edge.samples.length - 1].time;",
          "    if (time < start) return { ok: false, code: \"PAST_EXTRAPOLATION\" };",
          "    if (time > end) return { ok: false, code: \"FUTURE_EXTRAPOLATION\" };",
          "    if (parentAt(buffer, steps[i].child, time) === null) return { ok: false, code: \"PARENT_CHANGE\" };",
          "  }",
          "  return { ok: true };",
          "}"
        )),
        diagnosis("whole-buffer-range", "Every dynamic edge in the buffer was checked: only the edges on the path between target and source matter.", lines(
          "function canTransform(buffer, target, source, time) {",
          "  var tree = {};",
          "  Object.keys(buffer.edges).forEach(function (child) { var edge = buffer.edges[child]; tree[child] = { parent: parentAt(buffer, child, time) || edge.samples[edge.samples.length - 1].parent }; });",
          "  var steps = directedPath(tree, target, source);",
          "  if (steps === null) return { ok: false, code: \"DISCONNECTED\" };",
          "  var children = Object.keys(buffer.edges);",
          "  for (var i = 0; i < children.length; i += 1) {",
          "    var edge = buffer.edges[children[i]];",
          "    if (edge.isStatic) continue;",
          "    var start = edge.samples[0].time, end = edge.samples[edge.samples.length - 1].time;",
          "    if (time < start) return { ok: false, code: \"PAST_EXTRAPOLATION\" };",
          "    if (time > end) return { ok: false, code: \"FUTURE_EXTRAPOLATION\" };",
          "    if (parentAt(buffer, children[i], time) === null) return { ok: false, code: \"PARENT_CHANGE\" };",
          "  }",
          "  return { ok: true };",
          "}"
        )),
      ],
      hints: ["Build a plain tree of parents at the requested time, then reuse directedPath.", "Only the edges on the path matter, and static ones always pass.", "For each dynamic step: PAST if time < first sample, FUTURE if time > last sample, PARENT_CHANGE if parentAt is null."],
      cases: [
        example([CHAIN_BUFFER, "map", "laser", 5], { ok: true }, "inside every range"),
        example([CHAIN_BUFFER, "map", "laser", 1], { ok: false, code: "PAST_EXTRAPOLATION" }, "before base_link history"),
        example([CHAIN_BUFFER, "map", "base_link", 9.5], { ok: false, code: "FUTURE_EXTRAPOLATION" }, "after base_link history"),
        example([CHAIN_BUFFER, "map", "nowhere", 5], { ok: false, code: "DISCONNECTED" }, "unknown frame"),
        example([CHAIN_BUFFER, "laser", "base_link", 100], { ok: true }, "static-only path at any time"),
        example([CHAIN_BUFFER, "map", "base_link", 2], { ok: true }, "off-path camera edge does not matter"),
        example([REPARENT_BUFFER, "map", "base_link", 3], { ok: false, code: "PARENT_CHANGE" }, "across a reparenting"),
      ],
    }),
    puzzle({
      number: 62, id: "wait-for-transform", track: "advanced", title: "When Does the Answer Arrive?",
      goal: "Given when each sample reached the buffer, find the earliest wall time a lookup at a stamp becomes answerable.",
      concept: "Transforms arrive late. A lookup needs the sample *after* the stamp too, so nodes wait or time out.",
      functionName: "waitForTransform", signature: "waitForTransform(samples, stamp) → wallTime | null",
      starterSource: starter("waitForTransform", "samples, stamp", "samples are { time, arrival } sorted by time. Bracket the stamp; the answer is the later arrival."),
      referenceSource: lines(
        "function waitForTransform(samples, stamp) {",
        "  if (!samples.length || stamp < samples[0].time || stamp > samples[samples.length - 1].time) return null;",
        "  var b = bracketSamples(samples, stamp);",
        "  if (b.amount === 0) return samples[b.beforeIndex].arrival;",
        "  return Math.max(samples[b.beforeIndex].arrival, samples[b.afterIndex].arrival);",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "time-buffer",
      dependencies: ["bracket-samples"],
      reference: docref("tf2_ros · Buffer::canTransform(…, timeout) and waitForTransform", TF2_ROS_BUFFER),
      scene: { kind: "buffer", view: "wait", handles: [{ id: "stamp", type: "timeline", label: "requested stamp", value: 1.5, start: -0.5, end: 4.5 }], args: [{ fixture: "arrivals" }, { handle: "stamp" }] },
      diagnoses: [
        diagnosis("before-only", "Only the earlier sample's arrival was used: interpolation also needs the sample after the stamp.", lines(
          "function waitForTransform(samples, stamp) {",
          "  if (!samples.length || stamp < samples[0].time || stamp > samples[samples.length - 1].time) return null;",
          "  var b = bracketSamples(samples, stamp);",
          "  return samples[b.beforeIndex].arrival;",
          "}"
        )),
        diagnosis("stamp-not-arrival", "The sample's stamp was returned instead of its arrival time.", lines(
          "function waitForTransform(samples, stamp) {",
          "  if (!samples.length || stamp < samples[0].time || stamp > samples[samples.length - 1].time) return null;",
          "  var b = bracketSamples(samples, stamp);",
          "  return Math.max(samples[b.beforeIndex].time, samples[b.afterIndex].time);",
          "}"
        )),
      ],
      hints: ["No bracket, no answer: return null outside the stamped history.", "An exact stamp needs only that one sample's arrival.", "Otherwise the lookup waits for the later of the two bracketing arrivals."],
      cases: [
        example([ARRIVALS, 0.5], 1.3, "between samples"),
        example([ARRIVALS, 1], 1.3, "exact stamp"),
        example([ARRIVALS, 2.5], 3.6, "late arrival dominates"),
        example([ARRIVALS, 4], 4.2, "last stamp"),
        example([ARRIVALS, 4.5], null, "not yet answerable"),
        example([ARRIVALS, -1], null, "before the history"),
      ],
    }),
    puzzle({
      number: 63, id: "buffer-lookup", track: "advanced", title: "Buffer-Aware Lookup",
      goal: "Answer a lookup from a real buffer: check availability, sample every edge at the time with the right parent, then traverse.",
      concept: "Static edges pass their latched transform through; dynamic edges interpolate; parents come from parentAt.",
      functionName: "bufferLookup", signature: "bufferLookup(buffer, target, source, time) → { ok: true, transform } | { ok: false, code }",
      starterSource: starter("bufferLookup", "buffer, target, source, time"),
      referenceSource: lines(
        "function bufferLookup(buffer, target, source, time) {",
        "  var availability = canTransform(buffer, target, source, time);",
        "  if (!availability.ok) return availability;",
        "  var tree = {};",
        "  Object.keys(buffer.edges).forEach(function (child) {",
        "    var edge = buffer.edges[child];",
        "    var parent = parentAt(buffer, child, time) || edge.samples[edge.samples.length - 1].parent;",
        "    var transform = edge.isStatic ? edge.samples[0].transform : sampleEdge({ samples: edge.samples }, time);",
        "    tree = storeEdge(tree, { parent: parent, child: child, transform: transform });",
        "  });",
        "  return { ok: true, transform: lookupTransform(tree, target, source) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sandbox",
      dependencies: ["buffer-can-transform", "parent-at", "sample-edge", "store-edge", "lookup-transform"],
      reference: docref("tf2 · BufferCore::lookupTransform", TF2_BUFFER_CORE),
      scene: { kind: "buffer", view: "lookup", handles: [
        { id: "time", type: "timeline", label: "time", value: 4, start: -1, end: 12 },
        { id: "target", type: "selector", label: "target", value: "map", options: CHAIN_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: CHAIN_OPTIONS },
      ], args: [{ fixture: "buffer" }, { handle: "target" }, { handle: "source" }, { handle: "time" }] },
      diagnoses: [diagnosis("skips-availability", "The lookup never asked canTransform, so it answers with clamped data at times the buffer cannot cover.", lines(
        "function bufferLookup(buffer, target, source, time) {",
        "  var tree = {};",
        "  Object.keys(buffer.edges).forEach(function (child) {",
        "    var edge = buffer.edges[child];",
        "    var parent = parentAt(buffer, child, time) || edge.samples[edge.samples.length - 1].parent;",
        "    var transform = edge.isStatic ? edge.samples[0].transform : sampleEdge({ samples: edge.samples }, time);",
        "    tree = storeEdge(tree, { parent: parent, child: child, transform: transform });",
        "  });",
        "  var transform = lookupTransform(tree, target, source);",
        "  return transform === null ? { ok: false, code: \"DISCONNECTED\" } : { ok: true, transform: transform };",
        "}"
      ))],
      hints: ["canTransform first; return its error object unchanged.", "Static edges contribute samples[0].transform; dynamic edges contribute sampleEdge({ samples }, time).", "storeEdge each child with parentAt's answer, then lookupTransform(tree, target, source)."],
      cases: [
        example([CHAIN_BUFFER, "map", "laser", 5], { ok: true, transform: { x: 9, y: 0, yaw: 0 } }, "interpolated chain"),
        example([CHAIN_BUFFER, "map", "laser", 1], { ok: false, code: "PAST_EXTRAPOLATION" }, "unavailable time"),
        example([CHAIN_BUFFER, "laser", "base_link", 100], { ok: true, transform: { x: -1, y: 0, yaw: 0 } }, "static-only path"),
        example([REPARENT_BUFFER, "map", "base_link", 8], { ok: true, transform: { x: 5, y: 0, yaw: 0 } }, "after reparenting to map"),
        example([REPARENT_BUFFER, "map", "base_link", 2], { ok: false, code: "PARENT_CHANGE" }, "across the reparenting"),
      ],
    }),
  ];

  const CORRECTION_16 = [
    puzzle({
      number: 64, id: "points-to-odom", track: "correction", title: "Rack Points into Odom",
      goal: "Transform a laser-frame point cloud into the odom frame.",
      concept: "Every pipeline step after this one works in odom, so the rack geometry stays put while the robot moves.",
      functionName: "pointsToOdom", signature: "pointsToOdom(odomFromLaser, points) → points",
      starterSource: starter("pointsToOdom", "odomFromLaser, points", "Apply transformPoint to every point."),
      referenceSource: "function pointsToOdom(odomFromLaser, points) { return points.map(function (point) { return transformPoint(odomFromLaser, point); }); }",
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      dependencies: ["transform-point"],
      reference: navref("synthetic-input", "synthetic_world.js", "mapToOdom (the node receives rack points already in odom)"),
      scene: { kind: "aisle", view: "cloud", handles: [{ id: "robot", type: "pose", label: "base_link in odom", value: { x: 0.5, y: 0.2, yaw: 0.15 } }], args: [{ fixture: "odomFromLaser" }, { fixture: "leftPointsInLaser" }] },
      diagnoses: [diagnosis("rotation-ignored", "The points were only shifted: the laser's yaw must rotate them too.", "function pointsToOdom(odomFromLaser, points) { return points.map(function (p) { return { x: p.x + odomFromLaser.x, y: p.y + odomFromLaser.y }; }); }")],
      hints: ["Each point is a position, so rotation and translation both apply.", "transformPoint(odomFromLaser, point) for each point.", "Return points.map(...)."],
      cases: [
        example([{ x: 1, y: 0, yaw: 0 }, [{ x: 1, y: 0 }, { x: 2, y: 1 }]], [{ x: 2, y: 0 }, { x: 3, y: 1 }], "translation"),
        example([{ x: 0, y: 0, yaw: PI / 2 }, [{ x: 1, y: 0 }]], [{ x: 0, y: 1 }], "rotation"),
        example([{ x: 2, y: 1, yaw: PI }, [{ x: 1, y: 1 }, { x: 0, y: 0 }]], [{ x: 1, y: 0 }, { x: 2, y: 1 }], "half turn"),
        example([{ x: 0, y: 0, yaw: 0 }, []], [], "empty cloud"),
      ],
    }),
    puzzle({
      number: 65, id: "fit-line", track: "correction", title: "Fit a Line to Rack Points",
      goal: "Fit a normalized line a·x + b·y + c = 0 through a point cloud by total least squares.",
      concept: "The principal axis of the point covariance is the rack direction; the normal is perpendicular to it.",
      functionName: "fitLine", signature: "fitLine(points) → { a, b, c }",
      starterSource: starter("fitLine", "points", "Centroid, covariance, principal angle θ = ½·atan2(2·sxy, sxx − syy); normal (−sin θ, cos θ); sign so b > 0."),
      referenceSource: lines(
        "function fitLine(points) {",
        "  var n = points.length, mx = 0, my = 0;",
        "  for (var i = 0; i < n; i += 1) { mx += points[i].x; my += points[i].y; }",
        "  mx /= n; my /= n;",
        "  var sxx = 0, syy = 0, sxy = 0;",
        "  for (var j = 0; j < n; j += 1) { var dx = points[j].x - mx, dy = points[j].y - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }",
        "  var theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);",
        "  var a = -Math.sin(theta), b = Math.cos(theta);",
        "  var c = -(a * mx + b * my);",
        "  if (b < 0 || (Math.abs(b) < 1e-9 && a < 0)) { a = -a; b = -b; c = -c; }",
        "  return { a: a, b: b, c: c };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: navref("line-fit", "line_fitter.js", "fitLine2D inside RecursiveLinRegFitter.fitPlane"),
      scene: { kind: "aisle", view: "fit", handles: [{ id: "aisle", type: "frame", label: "aisle in odom", value: { x: 0, y: 0.3, yaw: 0.2 } }], args: [{ fixture: "leftFace" }] },
      diagnoses: [
        diagnosis("slope-intercept", "That is y = m·x + k packed as {a: m, b: −1, c: k}: the line must be normalized with a² + b² = 1 and b > 0.", lines(
          "function fitLine(points) {",
          "  var n = points.length, mx = 0, my = 0;",
          "  for (var i = 0; i < n; i += 1) { mx += points[i].x; my += points[i].y; }",
          "  mx /= n; my /= n;",
          "  var sxx = 0, sxy = 0;",
          "  for (var j = 0; j < n; j += 1) { var dx = points[j].x - mx, dy = points[j].y - my; sxx += dx * dx; sxy += dx * dy; }",
          "  var m = sxy / sxx;",
          "  return { a: m, b: -1, c: my - m * mx };",
          "}"
        )),
        diagnosis("x-only-regression", "Ordinary least squares on y(x) breaks on vertical racks; use the principal axis of the covariance.", lines(
          "function fitLine(points) {",
          "  var n = points.length, mx = 0, my = 0;",
          "  for (var i = 0; i < n; i += 1) { mx += points[i].x; my += points[i].y; }",
          "  mx /= n; my /= n;",
          "  var sxx = 0, sxy = 0;",
          "  for (var j = 0; j < n; j += 1) { var dx = points[j].x - mx, dy = points[j].y - my; sxx += dx * dx; sxy += dx * dy; }",
          "  var m = sxy / sxx, k = my - m * mx;",
          "  var norm = Math.sqrt(m * m + 1);",
          "  var a = -m / norm, b = 1 / norm, c = -k / norm;",
          "  return { a: a, b: b, c: c };",
          "}"
        )),
      ],
      hints: ["Center the points on their centroid first.", "θ = ½·atan2(2·sxy, sxx − syy) is the direction of most spread; the normal is (−sin θ, cos θ).", "c = −(a·mx + b·my); flip all three signs if b < 0 (or a < 0 when b is 0)."],
      cases: [
        example([[{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }]], { a: 0, b: 1, c: -2 }, "horizontal"),
        example([[{ x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 5 }]], { a: 1, b: 0, c: -3 }, "vertical"),
        example([[{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }]], { a: -Math.SQRT1_2, b: Math.SQRT1_2, c: 0 }, "diagonal"),
        example([[{ x: 0, y: 1 }, { x: 2, y: 2 }, { x: 4, y: 3 }]], { a: -1 / Math.sqrt(5), b: 2 / Math.sqrt(5), c: -2 / Math.sqrt(5) }, "slope one half"),
      ],
    }),
    puzzle({
      number: 66, id: "signed-line-distance", track: "correction", title: "Signed Distance to a Line",
      goal: "Compute a·x + b·y + c for a normalized line: how far, and on which side.",
      concept: "The sign tells left from right of the rack. The node uses it to pick the side for a single-rack centerline and to report the drone's distance to the middle; the transform itself is built from the line's own offset c (puzzle 74).",
      functionName: "signedLineDistance", signature: "signedLineDistance(point, line) → number",
      starterSource: starter("signedLineDistance", "point, line", "a·x + b·y + c."),
      referenceSource: "function signedLineDistance(point, line) { return line.a * point.x + line.b * point.y + line.c; }",
      comparator: "scalar", walkthroughChapter: "sensor-scenario",
      reference: navref("correction", "geometry.js", "lineSignedDistance"),
      scene: { kind: "aisle", view: "distance", handles: [{ id: "point", type: "point", label: "p", value: { x: 1, y: 0.8 } }], args: [{ handle: "point" }, { fixture: "fixedLeftLine" }] },
      diagnoses: [diagnosis("absolute", "The absolute value throws away the side: the pipeline needs the sign.", "function signedLineDistance(point, line) { return Math.abs(line.a * point.x + line.b * point.y + line.c); }")],
      hints: ["For a normalized line, a·x + b·y + c is the perpendicular distance with a sign.", "Positive means the point lies on the side the normal (a, b) points to.", "Return line.a * point.x + line.b * point.y + line.c."],
      cases: [
        example([{ x: 1, y: 0.8 }, { a: 0, b: 1, c: -1.6 }], -0.8, "below the rack"),
        example([{ x: 1, y: 2 }, { a: 0, b: 1, c: -1.6 }], 0.4, "above the rack"),
        example([{ x: 3, y: 7 }, { a: 1, b: 0, c: -3 }], 0, "on the line"),
        example([{ x: 0, y: 0 }, { a: Math.SQRT1_2, b: Math.SQRT1_2, c: -1 }], -1, "diagonal line"),
      ],
    }),
    puzzle({
      number: 67, id: "heading-from-line", track: "correction", title: "Heading of a Rack Line",
      goal: "Turn a line into the direction along it with a non-negative x component.",
      concept: "A line has two directions; choosing dx ≥ 0 makes headings from different racks comparable.",
      functionName: "headingFromLine", signature: "headingFromLine(line) → radians",
      starterSource: starter("headingFromLine", "line", "Direction (dx, dy) = (−b, a); flip both if dx < 0; atan2(dy, dx)."),
      referenceSource: lines(
        "function headingFromLine(line) {",
        "  var dx = -line.b, dy = line.a;",
        "  if (dx < 0) { dx = -dx; dy = -dy; }",
        "  return Math.atan2(dy, dx);",
        "}"
      ),
      comparator: "angle", walkthroughChapter: "sensor-scenario",
      reference: navref("heading-consensus", "geometry.js", "computeHeadingFromLineCoefficients"),
      scene: { kind: "aisle", view: "heading", handles: [{ id: "aisle", type: "frame", label: "aisle in odom", value: { x: 0, y: 0.3, yaw: 0.2 } }], args: [{ fixture: "leftLine" }] },
      diagnoses: [
        diagnosis("normal-not-direction", "That is the angle of the normal (a, b); the direction along the line is (−b, a).", "function headingFromLine(line) { return Math.atan2(line.b, line.a); }"),
        diagnosis("no-flip", "The direction was not flipped to dx ≥ 0, so the heading points backwards for half the lines.", "function headingFromLine(line) { return Math.atan2(line.a, -line.b); }"),
      ],
      hints: ["Rotate the normal by 90°: (−b, a) runs along the line.", "Flip both components when dx is negative.", "Return Math.atan2(dy, dx)."],
      cases: [
        example([{ a: 0, b: 1, c: -2 }], 0, "horizontal"),
        example([{ a: 1, b: 0, c: -3 }], PI / 2, "vertical"),
        example([{ a: -Math.SQRT1_2, b: Math.SQRT1_2, c: 0 }], PI / 4, "diagonal"),
        example([{ a: -1 / Math.sqrt(5), b: 2 / Math.sqrt(5), c: -2 / Math.sqrt(5) }], Math.atan2(1, 2), "slope one half"),
      ],
    }),
  ];

  const CORRECTION_17 = [
    puzzle({
      number: 68, id: "inlier-refit", track: "correction", title: "Refit on Inliers",
      goal: "Fit, drop the points far from the line, refit, and repeat until the inlier set settles.",
      concept: "A single outlier tilts a least-squares line; iterating on inliers removes its pull. The node's fitter only ever shrinks the inlier set, then checks the inlier ratio, the largest gap, and the line length.",
      functionName: "refitInliers", signature: "refitInliers(points, threshold, maxIterations) → { line, inliers }",
      starterSource: starter("refitInliers", "points, threshold, maxIterations", "inliers are the indexes of points within threshold of the final line."),
      referenceSource: lines(
        "function refitInliers(points, threshold, maxIterations) {",
        "  var active = points.map(function (p, i) { return i; });",
        "  var line = fitLine(points);",
        "  for (var iteration = 0; iteration < maxIterations; iteration += 1) {",
        "    line = fitLine(active.map(function (i) { return points[i]; }));",
        "    var next = [];",
        "    for (var i = 0; i < points.length; i += 1) { if (Math.abs(signedLineDistance(points[i], line)) <= threshold) next.push(i); }",
        "    var same = next.length === active.length && next.every(function (value, k) { return value === active[k]; });",
        "    active = next;",
        "    if (same || next.length < 2) break;",
        "  }",
        "  return { line: line, inliers: active };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      dependencies: ["fit-line", "signed-line-distance"],
      reference: navref("line-fit", "line_fitter.js", "RecursiveLinRegFitter.fitPlane (inlier refinement)"),
      scene: { kind: "aisle", view: "refit", handles: [{ id: "outlier", type: "point", label: "outlier", value: { x: 0.5, y: 0.9 } }], args: [{ fixture: "pointsWithOutlier" }, 0.3, 10] },
      diagnoses: [diagnosis("single-pass", "Only one fit was made: the outlier still pulled the line. Refit on the inliers until the set stops changing.", lines(
        "function refitInliers(points, threshold, maxIterations) {",
        "  var line = fitLine(points);",
        "  var inliers = [];",
        "  for (var i = 0; i < points.length; i += 1) { if (Math.abs(signedLineDistance(points[i], line)) <= threshold) inliers.push(i); }",
        "  return { line: line, inliers: inliers };",
        "}"
      ))],
      hints: ["Start with every index active.", "Each iteration: fit the active points, recompute which points are within threshold, compare with the previous set.", "Stop when the inlier list is unchanged (or fewer than two remain); return the last line and the list."],
      cases: [
        example([[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 1 }], 0.3, 10], { line: { a: 0, b: 1, c: 0 }, inliers: [0, 1, 2, 3, 4] }, "one outlier above"),
        example([[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }], 0.1, 10], { line: { a: 0, b: 1, c: 0 }, inliers: [0, 1, 2] }, "already clean"),
        example([[{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 1.5, y: 0.5 }], 0.35, 10], { line: { a: 0, b: 1, c: -2 }, inliers: [0, 1, 2, 3] }, "one outlier below"),
      ],
    }),
    puzzle({
      number: 69, id: "face-filter", track: "correction", title: "Keep the Rack Face",
      goal: "Keep only the points on the aisle-facing surface of a rack.",
      concept: "Project onto the aisle's left normal: the face is the extreme projection, interior clutter sits behind it.",
      functionName: "faceFilter", signature: "faceFilter(points, heading, side, threshold) → points",
      starterSource: starter("faceFilter", "points, heading, side, threshold", "n = (−sin heading, cos heading); left keeps s ≤ min + threshold; right keeps s ≥ max − threshold."),
      referenceSource: lines(
        "function faceFilter(points, heading, side, threshold) {",
        "  var nx = -Math.sin(heading), ny = Math.cos(heading);",
        "  var values = points.map(function (p) { return nx * p.x + ny * p.y; });",
        "  var face = side === \"left\" ? Math.min.apply(null, values) : Math.max.apply(null, values);",
        "  return points.filter(function (p, i) { return side === \"left\" ? values[i] <= face + threshold : values[i] >= face - threshold; });",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: navref("rotation-filter", "line_fitter.js", "rotationSearchFilter (the keep rule at the best angle)"),
      scene: { kind: "aisle", view: "face", handles: [{ id: "aisle", type: "frame", label: "aisle in odom", value: { x: 0, y: 0.3, yaw: 0.2 } }], args: [{ fixture: "leftWithInterior" }, { fixture: "aisleHeading" }, "left", 0.15] },
      diagnoses: [
        diagnosis("sides-swapped", "Left and right are swapped: the left rack's face is its minimum projection (closest to the aisle), the right rack's face is its maximum.", lines(
          "function faceFilter(points, heading, side, threshold) {",
          "  var nx = -Math.sin(heading), ny = Math.cos(heading);",
          "  var values = points.map(function (p) { return nx * p.x + ny * p.y; });",
          "  var face = side === \"left\" ? Math.max.apply(null, values) : Math.min.apply(null, values);",
          "  return points.filter(function (p, i) { return side === \"left\" ? values[i] >= face - threshold : values[i] <= face + threshold; });",
          "}"
        )),
        diagnosis("heading-as-normal", "Projected onto the heading itself: the rack face is measured along the normal (−sin, cos).", lines(
          "function faceFilter(points, heading, side, threshold) {",
          "  var nx = Math.cos(heading), ny = Math.sin(heading);",
          "  var values = points.map(function (p) { return nx * p.x + ny * p.y; });",
          "  var face = side === \"left\" ? Math.min.apply(null, values) : Math.max.apply(null, values);",
          "  return points.filter(function (p, i) { return side === \"left\" ? values[i] <= face + threshold : values[i] >= face - threshold; });",
          "}"
        )),
      ],
      hints: ["The left normal of the aisle is (−sin h, cos h).", "Project every point: s = n · p. The left rack's face is the smallest s; the right rack's face is the largest.", "Keep points within threshold of that extreme."],
      cases: [
        example([[{ x: 0, y: 1.6 }, { x: 1, y: 1.6 }, { x: 2, y: 1.6 }, { x: 0.5, y: 1.9 }, { x: 1.5, y: 2.0 }], 0, "left", 0.1], [{ x: 0, y: 1.6 }, { x: 1, y: 1.6 }, { x: 2, y: 1.6 }], "left rack face"),
        example([[{ x: 0, y: -1.6 }, { x: 1, y: -1.6 }, { x: 0.5, y: -1.9 }], 0, "right", 0.1], [{ x: 0, y: -1.6 }, { x: 1, y: -1.6 }], "right rack face"),
        example([[{ x: -1.6, y: 0 }, { x: -1.6, y: 1 }, { x: -1.9, y: 0.5 }], PI / 2, "left", 0.1], [{ x: -1.6, y: 0 }, { x: -1.6, y: 1 }], "aisle along +y"),
        example([[{ x: 0, y: 1.6 }, { x: 0, y: 2.0 }], 0, "left", 1], [{ x: 0, y: 1.6 }, { x: 0, y: 2.0 }], "wide threshold keeps all"),
      ],
    }),
    puzzle({
      number: 70, id: "smooth-line", track: "correction", title: "Smooth a Line Over Time",
      goal: "Blend a new line fit into the previous one with an exponential moving average.",
      concept: "Lines have a sign ambiguity, so align the new normal to the previous one before blending, then renormalize. The node keeps one such EMA per track id (plane_coefficients_ema_alpha 0.08) and restarts it when a track id changes.",
      functionName: "smoothLine", signature: "smoothLine(previous, line, alpha) → line",
      starterSource: starter("smoothLine", "previous, line, alpha", "previous may be null."),
      referenceSource: lines(
        "function smoothLine(previous, line, alpha) {",
        "  if (!previous) return { a: line.a, b: line.b, c: line.c };",
        "  var next = previous.a * line.a + previous.b * line.b < 0 ? { a: -line.a, b: -line.b, c: -line.c } : line;",
        "  var mixed = { a: alpha * next.a + (1 - alpha) * previous.a, b: alpha * next.b + (1 - alpha) * previous.b, c: alpha * next.c + (1 - alpha) * previous.c };",
        "  var n = Math.sqrt(mixed.a * mixed.a + mixed.b * mixed.b);",
        "  return n < 1e-9 ? mixed : { a: mixed.a / n, b: mixed.b / n, c: mixed.c / n };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "time-buffer",
      reference: navref("coefficient-smoothing", "pose_corrector.js", "buildBeamResultFromFit (coefficient EMA)"),
      scene: { kind: "aisle", view: "smooth", handles: [
        { id: "newC", type: "slider", label: "new line offset c", value: -2.4, min: -3.2, max: -0.8 },
        { id: "alpha", type: "slider", label: "alpha", value: 0.3, min: 0, max: 1 },
      ], args: [{ fixture: "previousLine" }, { fixture: "newLine" }, { handle: "alpha" }] },
      diagnoses: [
        diagnosis("no-sign-check", "A flipped new line cancelled the previous one: align the normals (dot product < 0 means flip all three coefficients) first.", lines(
          "function smoothLine(previous, line, alpha) {",
          "  if (!previous) return { a: line.a, b: line.b, c: line.c };",
          "  var mixed = { a: alpha * line.a + (1 - alpha) * previous.a, b: alpha * line.b + (1 - alpha) * previous.b, c: alpha * line.c + (1 - alpha) * previous.c };",
          "  var n = Math.sqrt(mixed.a * mixed.a + mixed.b * mixed.b);",
          "  return n < 1e-9 ? mixed : { a: mixed.a / n, b: mixed.b / n, c: mixed.c / n };",
          "}"
        )),
        diagnosis("no-renormalize", "The blended normal is shorter than one: renormalize a, b, and c by the same factor.", lines(
          "function smoothLine(previous, line, alpha) {",
          "  if (!previous) return { a: line.a, b: line.b, c: line.c };",
          "  var next = previous.a * line.a + previous.b * line.b < 0 ? { a: -line.a, b: -line.b, c: -line.c } : line;",
          "  return { a: alpha * next.a + (1 - alpha) * previous.a, b: alpha * next.b + (1 - alpha) * previous.b, c: alpha * next.c + (1 - alpha) * previous.c };",
          "}"
        )),
      ],
      hints: ["No previous line means nothing to blend with.", "If previous·new normals dot below zero, negate the new line's a, b, and c.", "Blend all three, then divide by the length of (a, b)."],
      cases: [
        example([null, { a: 0, b: 1, c: -2.4 }, 0.3], { a: 0, b: 1, c: -2.4 }, "first observation"),
        example([{ a: 0, b: 1, c: -2 }, { a: 0, b: 1, c: -2.4 }, 0.5], { a: 0, b: 1, c: -2.2 }, "same sign"),
        example([{ a: 0, b: 1, c: -2 }, { a: 0, b: -1, c: 2.4 }, 0.5], { a: 0, b: 1, c: -2.2 }, "flipped sign"),
        example([{ a: 1, b: 0, c: -1 }, { a: 0, b: 1, c: -1 }, 0.5], { a: Math.SQRT1_2, b: Math.SQRT1_2, c: -Math.SQRT2 }, "renormalized blend"),
      ],
    }),
    puzzle({
      number: 71, id: "consensus-heading", track: "correction", title: "Heading Consensus",
      goal: "Combine rack headings into one aisle heading, weighting by inlier count and resolving the 180° ambiguity.",
      concept: "A line heading is only known modulo π; resolve each beam toward the previous heading before averaging on the circle. The node's consensus adds an outlier gate on top of this mean (puzzle 77).",
      functionName: "consensusHeading", signature: "consensusHeading(beams, previousHeading) → radians",
      starterSource: starter("consensusHeading", "beams, previousHeading", "beams: [{ heading, inlierCount }]; previousHeading may be null (use the first beam)."),
      referenceSource: lines(
        "function consensusHeading(beams, previousHeading) {",
        "  var reference = previousHeading === null ? beams[0].heading : previousHeading;",
        "  var sx = 0, sy = 0;",
        "  for (var i = 0; i < beams.length; i += 1) {",
        "    var heading = beams[i].heading;",
        "    var alt = wrapAngle(heading + Math.PI);",
        "    if (Math.abs(wrapAngle(alt - reference)) < Math.abs(wrapAngle(heading - reference))) heading = alt;",
        "    var weight = Math.max(1, beams[i].inlierCount);",
        "    sx += Math.cos(heading) * weight;",
        "    sy += Math.sin(heading) * weight;",
        "  }",
        "  return Math.atan2(sy, sx);",
        "}"
      ),
      comparator: "angle", walkthroughChapter: "frame-roles",
      dependencies: ["wrap-angle"],
      reference: navref("heading-consensus", "heading.js", "selectConsensusHeadingSamples (weighted circular mean)"),
      scene: { kind: "aisle", view: "consensus", handles: [
        { id: "beamA", type: "dial", label: "beam A", value: 0.2, radius: 1.5 },
        { id: "beamB", type: "dial", label: "beam B", value: 2.9, radius: 2.2 },
      ], args: [{ fixture: "beams" }, 0.1] },
      diagnoses: [
        diagnosis("arithmetic-mean", "Averaging angles arithmetically breaks at the wrap: sum weighted cos and sin, then atan2.", lines(
          "function consensusHeading(beams, previousHeading) {",
          "  var reference = previousHeading === null ? beams[0].heading : previousHeading;",
          "  var total = 0, weights = 0;",
          "  for (var i = 0; i < beams.length; i += 1) {",
          "    var heading = beams[i].heading;",
          "    var alt = wrapAngle(heading + Math.PI);",
          "    if (Math.abs(wrapAngle(alt - reference)) < Math.abs(wrapAngle(heading - reference))) heading = alt;",
          "    var weight = Math.max(1, beams[i].inlierCount);",
          "    total += heading * weight; weights += weight;",
          "  }",
          "  return total / weights;",
          "}"
        )),
        diagnosis("no-resolve", "The 180° ambiguity was ignored: a rack line heading of 0.1 may really be 0.1 + π.", lines(
          "function consensusHeading(beams, previousHeading) {",
          "  var sx = 0, sy = 0;",
          "  for (var i = 0; i < beams.length; i += 1) {",
          "    var weight = Math.max(1, beams[i].inlierCount);",
          "    sx += Math.cos(beams[i].heading) * weight;",
          "    sy += Math.sin(beams[i].heading) * weight;",
          "  }",
          "  return Math.atan2(sy, sx);",
          "}"
        )),
      ],
      hints: ["For each beam, compare heading and heading + π against the reference; keep the closer one.", "Weight by max(1, inlierCount).", "Return atan2(Σ w·sin, Σ w·cos)."],
      cases: [
        example([[{ heading: 0.1, inlierCount: 5 }], 3.0], 0.1 + PI, "single beam resolved toward the previous heading"),
        example([[{ heading: 0, inlierCount: 1 }, { heading: 0.2, inlierCount: 1 }], null], 0.1, "equal weights"),
        example([[{ heading: 0, inlierCount: 3 }, { heading: 0.4, inlierCount: 1 }], null], Math.atan2(Math.sin(0.4), 3 + Math.cos(0.4)), "weighted"),
        example([[{ heading: 3.1, inlierCount: 1 }, { heading: -3.1, inlierCount: 1 }], 3.0], PI, "across the wrap"),
      ],
    }),
  ];

  function poseCompose(a, b) {
    var origin = poseApply(a, b);
    var yaw = Math.atan2(Math.sin(a.yaw + b.yaw), Math.cos(a.yaw + b.yaw));
    return { x: origin.x, y: origin.y, yaw: yaw };
  }
  const CORRECTION_LASER = { x: 0.5, y: 0, yaw: 0 };
  function rackCase(aisle, odomFromBase) {
    var toLaser = poseInvert(poseCompose(odomFromBase, CORRECTION_LASER));
    var xs = [-2, -1, 0, 1, 2];
    var left = xs.map(function (x) { return poseApply(toLaser, poseApply(aisle, { x: x, y: 1.6 })); });
    var right = xs.map(function (x) { return poseApply(toLaser, poseApply(aisle, { x: x, y: -1.6 })); });
    var a = -Math.sin(aisle.yaw), b = Math.cos(aisle.yaw);
    var centerline = { a: a, b: b, c: -(a * aisle.x + b * aisle.y) };
    var mapFromOdom = { x: 0, y: centerline.c, yaw: -aisle.yaw };
    return {
      args: [{ odomFromBase: odomFromBase, baseFromLaser: CORRECTION_LASER, leftPoints: left, rightPoints: right }, 0.3],
      expected: { heading: aisle.yaw, centerline: centerline, mapFromOdom: mapFromOdom, correctedPose: poseCompose(mapFromOdom, odomFromBase) },
    };
  }
  const RACK_CASE_1 = rackCase({ x: 0, y: 0, yaw: 0 }, { x: 2, y: 0, yaw: 0 });
  const RACK_CASE_2 = rackCase({ x: 0, y: 0.5, yaw: 0 }, { x: 2, y: 0.5, yaw: 0 });
  const RACK_CASE_3 = rackCase({ x: 0, y: 0, yaw: 0.3 }, { x: 0, y: 0, yaw: 0.3 });
  const RACK_CASE_4 = rackCase({ x: 1, y: -0.4, yaw: -0.2 }, { x: 0.5, y: 0.2, yaw: 0.1 });

  const CORRECTION_18 = [
    puzzle({
      number: 72, id: "centerline-from-racks", track: "correction", title: "Aisle Centerline from Two Racks",
      goal: "Average the two rack lines into the aisle centerline after aligning their normals with the aisle heading.",
      concept: "Both racks face the aisle; once their normals agree, the centerline is their mean. The node also measures the half width from the two offsets and rejects bad pairs (puzzle 80).",
      functionName: "centerlineFromRacks", signature: "centerlineFromRacks(leftLine, rightLine, heading) → line",
      starterSource: starter("centerlineFromRacks", "leftLine, rightLine, heading", "Align each line so its normal dots positively with (−sin heading, cos heading), average, renormalize."),
      referenceSource: lines(
        "function centerlineFromRacks(leftLine, rightLine, heading) {",
        "  var nx = -Math.sin(heading), ny = Math.cos(heading);",
        "  function align(line) { return line.a * nx + line.b * ny < 0 ? { a: -line.a, b: -line.b, c: -line.c } : { a: line.a, b: line.b, c: line.c }; }",
        "  var l = align(leftLine), r = align(rightLine);",
        "  var mixed = { a: (l.a + r.a) / 2, b: (l.b + r.b) / 2, c: (l.c + r.c) / 2 };",
        "  var n = Math.sqrt(mixed.a * mixed.a + mixed.b * mixed.b);",
        "  return { a: mixed.a / n, b: mixed.b / n, c: mixed.c / n };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      reference: navref("centerline", "pose_corrector.js", "computeDualCenterline (the midpoint; checks in puzzle 80)"),
      scene: { kind: "aisle", view: "centerline", handles: [
        { id: "leftOffset", type: "slider", label: "left rack y", value: 1.6, min: 0.8, max: 3 },
        { id: "rightOffset", type: "slider", label: "right rack y", value: -1.6, min: -3, max: -0.8 },
      ], args: [{ fixture: "leftOffsetLine" }, { fixture: "rightOffsetLine" }, 0] },
      diagnoses: [diagnosis("no-alignment", "The lines were averaged without aligning their normals; opposite signs cancel to nothing.", lines(
        "function centerlineFromRacks(leftLine, rightLine, heading) {",
        "  var mixed = { a: (leftLine.a + rightLine.a) / 2, b: (leftLine.b + rightLine.b) / 2, c: (leftLine.c + rightLine.c) / 2 };",
        "  var n = Math.sqrt(mixed.a * mixed.a + mixed.b * mixed.b);",
        "  return { a: mixed.a / n, b: mixed.b / n, c: mixed.c / n };",
        "}"
      ))],
      hints: ["The aisle's left normal is (−sin h, cos h).", "Flip a line's a, b, c when its normal dots negatively with that normal.", "Average the aligned coefficients and renormalize by the length of (a, b)."],
      cases: [
        example([{ a: 0, b: 1, c: -1.6 }, { a: 0, b: 1, c: 1.6 }, 0], { a: 0, b: 1, c: 0 }, "symmetric aisle"),
        example([{ a: 0, b: 1, c: -1.6 }, { a: 0, b: -1, c: -1.6 }, 0], { a: 0, b: 1, c: 0 }, "right line flipped"),
        example([{ a: 0, b: 1, c: -3 }, { a: 0, b: 1, c: -1 }, 0], { a: 0, b: 1, c: -2 }, "offset aisle"),
        example([{ a: 1, b: 0, c: 1.6 }, { a: 1, b: 0, c: -1.6 }, PI / 2], { a: -1, b: 0, c: 0 }, "aisle along +y"),
      ],
    }),
    puzzle({
      number: 73, id: "single-rack-centerline", track: "correction", title: "Centerline from One Rack",
      goal: "When only one rack is visible, place the centerline the expected half-width away on the robot's side.",
      concept: "Fallback: the robot is between the racks, so the aisle center lies toward the robot. The node uses the half width it calibrated on the first dual frame, and expected_rack_distance before that.",
      functionName: "centerlineFromOneRack", signature: "centerlineFromOneRack(line, heading, pose, expectedDistance) → line",
      starterSource: starter("centerlineFromOneRack", "line, heading, pose, expectedDistance"),
      referenceSource: lines(
        "function centerlineFromOneRack(line, heading, pose, expectedDistance) {",
        "  var nx = -Math.sin(heading), ny = Math.cos(heading);",
        "  var aligned = line.a * nx + line.b * ny < 0 ? { a: -line.a, b: -line.b, c: -line.c } : { a: line.a, b: line.b, c: line.c };",
        "  var signed = aligned.a * pose.x + aligned.b * pose.y + aligned.c;",
        "  var sideSign = signed >= 0 ? 1 : -1;",
        "  return { a: aligned.a, b: aligned.b, c: aligned.c - sideSign * expectedDistance };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      reference: navref("centerline", "pose_corrector.js", "buildCenterlineMeasurement (single-rack branch)"),
      scene: { kind: "aisle", view: "single", handles: [
        { id: "robot", type: "pose", label: "robot", value: { x: 0.5, y: 0.4, yaw: 0.1 } },
        { id: "rack", type: "selector", label: "visible rack", value: "left", options: ["left", "right"] },
      ], args: [{ fixture: "visibleLine" }, 0, { handle: "robot" }, 1.6] },
      diagnoses: [diagnosis("wrong-side", "The centerline was pushed away from the robot instead of toward it: subtract sideSign · expectedDistance from c.", lines(
        "function centerlineFromOneRack(line, heading, pose, expectedDistance) {",
        "  var nx = -Math.sin(heading), ny = Math.cos(heading);",
        "  var aligned = line.a * nx + line.b * ny < 0 ? { a: -line.a, b: -line.b, c: -line.c } : { a: line.a, b: line.b, c: line.c };",
        "  var signed = aligned.a * pose.x + aligned.b * pose.y + aligned.c;",
        "  var sideSign = signed >= 0 ? 1 : -1;",
        "  return { a: aligned.a, b: aligned.b, c: aligned.c + sideSign * expectedDistance };",
        "}"
      ))],
      hints: ["Align the line's normal with the aisle normal first.", "The sign of the robot's distance says which side of the rack it is on.", "Shift c by expectedDistance toward the robot: c − sideSign · expectedDistance."],
      cases: [
        example([{ a: 0, b: 1, c: -1.6 }, 0, { x: 0, y: 0, yaw: 0 }, 1.6], { a: 0, b: 1, c: 0 }, "left rack visible"),
        example([{ a: 0, b: 1, c: 1.6 }, 0, { x: 0, y: 0, yaw: 0 }, 1.6], { a: 0, b: 1, c: 0 }, "right rack visible"),
        example([{ a: 0, b: 1, c: -3 }, 0, { x: 0, y: 1, yaw: 0 }, 1.6], { a: 0, b: 1, c: -1.4 }, "offset rack"),
        example([{ a: 0, b: -1, c: 3 }, 0, { x: 0, y: 1, yaw: 0 }, 1.6], { a: 0, b: 1, c: -1.4 }, "flipped input line"),
      ],
    }),
    puzzle({
      number: 74, id: "corrected-pose-shift", track: "correction", title: "Corrected Pose: Shift by c",
      goal: "Shift the odom pose by the centerline offset c along the aisle normal, plus the x offset along the heading; keep the raw yaw.",
      concept: "The shift is a property of the line, not of the robot: every odom point moves by the same c, so the robot's y in the corrected frame is its real distance from the aisle middle. The laser node applies the same shift from its intercept (−intercept·cos h).",
      functionName: "correctedPoseFromCenterline", signature: "correctedPoseFromCenterline(pose, centerline, aisleHeading, xOffset) → pose",
      starterSource: starter("correctedPoseFromCenterline", "pose, centerline, aisleHeading, xOffset", "x + c·a + xOffset·cos h, y + c·b + xOffset·sin h, yaw unchanged."),
      referenceSource: lines(
        "function correctedPoseFromCenterline(pose, centerline, aisleHeading, xOffset) {",
        "  var c = centerline.c;",
        "  return { x: pose.x + c * centerline.a + xOffset * Math.cos(aisleHeading), y: pose.y + c * centerline.b + xOffset * Math.sin(aisleHeading), yaw: pose.yaw };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "frame-roles",
      reference: navref("correction", "pose_corrector.js", "broadcastVisionCorrectedTF"),
      scene: { kind: "aisle", view: "shift", handles: [
        { id: "robot", type: "pose", label: "robot (odom)", value: { x: 1, y: 0.7, yaw: 0.35 } },
        { id: "c", type: "slider", label: "centerline c", value: -0.4, min: -1.5, max: 1.5 },
        { id: "xOffset", type: "slider", label: "x offset", value: 0, min: -1, max: 1 },
      ], args: [{ handle: "robot" }, { fixture: "shiftCenterline" }, 0, { handle: "xOffset" }] },
      diagnoses: [
        diagnosis("robot-projection", "That pulls the robot onto the centerline by its own distance, so the corrected frame collapses onto the raw one whenever the robot flies centered (the bug fixed on 2026-09-14). Shift by the line's c instead.", "function correctedPoseFromCenterline(pose, centerline, aisleHeading, xOffset) { var d = centerline.a * pose.x + centerline.b * pose.y + centerline.c; return { x: pose.x - d * centerline.a + xOffset * Math.cos(aisleHeading), y: pose.y - d * centerline.b + xOffset * Math.sin(aisleHeading), yaw: pose.yaw }; }"),
        diagnosis("sign-flipped", "The shift went the wrong way: add c along the normal (a, b). With c = −0.4 the line sits at y = 0.4 and the frame must move down by 0.4.", "function correctedPoseFromCenterline(pose, centerline, aisleHeading, xOffset) { var c = centerline.c; return { x: pose.x - c * centerline.a + xOffset * Math.cos(aisleHeading), y: pose.y - c * centerline.b + xOffset * Math.sin(aisleHeading), yaw: pose.yaw }; }"),
        diagnosis("yaw-adopted", "The odom-side pose keeps the raw yaw; the aisle heading only enters through the map → odom rotation (puzzles 75 and 83).", "function correctedPoseFromCenterline(pose, centerline, aisleHeading, xOffset) { var c = centerline.c; return { x: pose.x + c * centerline.a + xOffset * Math.cos(aisleHeading), y: pose.y + c * centerline.b + xOffset * Math.sin(aisleHeading), yaw: aisleHeading }; }"),
      ],
      hints: ["c is how far the centerline sits from the odom origin along its normal (a, b); moving every point by c·(a, b) puts the line through the origin.", "Add the pillar x offset along the aisle heading: xOffset·(cos h, sin h).", "Return { x: x + c·a + xOffset·cos h, y: y + c·b + xOffset·sin h, yaw: pose.yaw }."],
      cases: [
        example([{ x: 2, y: 0.5, yaw: 0.3 }, { a: 0, b: 1, c: -0.4 }, 0, 0], { x: 2, y: 0.1, yaw: 0.3 }, "line at y = 0.4: the robot ends 0.1 above it"),
        example([{ x: 2, y: 0.5, yaw: 0.3 }, { a: 0, b: 1, c: 0 }, 0, 0], { x: 2, y: 0.5, yaw: 0.3 }, "line through the origin: nothing to shift, y is already the real distance"),
        example([{ x: 0.4, y: 3, yaw: 1.4 }, { a: -1, b: 0, c: 0.3 }, PI / 2, 0], { x: 0.1, y: 3, yaw: 1.4 }, "aisle along +y"),
        example([{ x: 1, y: -1, yaw: 0 }, { a: 0, b: 1, c: 0.5 }, 0, 0.25], { x: 1.25, y: -0.5, yaw: 0 }, "with an x offset"),
      ],
    }),
    puzzle({
      number: 75, id: "aisle-correction-step", track: "correction", title: "Publish map → odom from the Racks",
      goal: "Run the whole pipeline for one frame and produce the map → odom correction that keeps odom → base_link untouched.",
      concept: "The map aisle is the x-axis; the observed centerline in odom tells where odom sits relative to it: mapFromOdom = { 0, c, −heading }. That is the vision node's transform with the x offset at zero: the shift c·(a, b) rotated by −heading is exactly (0, c), so the corrected y is the robot's real distance from the middle.",
      functionName: "aisleCorrectionStep", signature: "aisleCorrectionStep(frame, threshold) → { heading, centerline, mapFromOdom, correctedPose }",
      starterSource: starter("aisleCorrectionStep", "frame, threshold", "frame = { odomFromBase, baseFromLaser, leftPoints, rightPoints } with points in the laser frame."),
      referenceSource: lines(
        "function aisleCorrectionStep(frame, threshold) {",
        "  var odomFromLaser = compose(frame.odomFromBase, frame.baseFromLaser);",
        "  var left = refitInliers(pointsToOdom(odomFromLaser, frame.leftPoints), threshold, 10);",
        "  var right = refitInliers(pointsToOdom(odomFromLaser, frame.rightPoints), threshold, 10);",
        "  var heading = consensusHeading([{ heading: headingFromLine(left.line), inlierCount: left.inliers.length }, { heading: headingFromLine(right.line), inlierCount: right.inliers.length }], null);",
        "  var centerline = centerlineFromRacks(left.line, right.line, heading);",
        "  var mapFromOdom = { x: 0, y: centerline.c, yaw: -heading };",
        "  return { heading: heading, centerline: centerline, mapFromOdom: mapFromOdom, correctedPose: transformPose(mapFromOdom, frame.odomFromBase) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["compose", "points-to-odom", "inlier-refit", "heading-from-line", "consensus-heading", "centerline-from-racks", "transform-pose"],
      reference: navref("tf-logic", "correction_transform.js", "buildVisionCorrectionTransform (x offset 0)"),
      scene: { kind: "aisle", view: "capstone", handles: [
        { id: "aisle", type: "frame", label: "aisle drift in odom", value: { x: 0.3, y: 0.4, yaw: 0.15 } },
        { id: "robot", type: "pose", label: "robot in odom", value: { x: 1, y: 0.5, yaw: 0.3 } },
      ], args: [{ fixture: "correctionFrame" }, 0.3] },
      diagnoses: [
        diagnosis("points-not-transformed", "The lines were fitted in the laser frame: transform the clouds into odom first.", lines(
          "function aisleCorrectionStep(frame, threshold) {",
          "  var left = refitInliers(frame.leftPoints, threshold, 10);",
          "  var right = refitInliers(frame.rightPoints, threshold, 10);",
          "  var heading = consensusHeading([{ heading: headingFromLine(left.line), inlierCount: left.inliers.length }, { heading: headingFromLine(right.line), inlierCount: right.inliers.length }], null);",
          "  var centerline = centerlineFromRacks(left.line, right.line, heading);",
          "  var mapFromOdom = { x: 0, y: centerline.c, yaw: -heading };",
          "  return { heading: heading, centerline: centerline, mapFromOdom: mapFromOdom, correctedPose: transformPose(mapFromOdom, frame.odomFromBase) };",
          "}"
        )),
        diagnosis("yaw-sign", "map → odom must rotate by −heading so the observed aisle lands on the map x-axis.", lines(
          "function aisleCorrectionStep(frame, threshold) {",
          "  var odomFromLaser = compose(frame.odomFromBase, frame.baseFromLaser);",
          "  var left = refitInliers(pointsToOdom(odomFromLaser, frame.leftPoints), threshold, 10);",
          "  var right = refitInliers(pointsToOdom(odomFromLaser, frame.rightPoints), threshold, 10);",
          "  var heading = consensusHeading([{ heading: headingFromLine(left.line), inlierCount: left.inliers.length }, { heading: headingFromLine(right.line), inlierCount: right.inliers.length }], null);",
          "  var centerline = centerlineFromRacks(left.line, right.line, heading);",
          "  var mapFromOdom = { x: 0, y: centerline.c, yaw: heading };",
          "  return { heading: heading, centerline: centerline, mapFromOdom: mapFromOdom, correctedPose: transformPose(mapFromOdom, frame.odomFromBase) };",
          "}"
        )),
      ],
      hints: ["odomFromLaser = compose(odomFromBase, baseFromLaser); move both clouds into odom.", "Refit each rack, take headings, consensus (previous null), then the centerline.", "mapFromOdom = { x: 0, y: centerline.c, yaw: −heading }; correctedPose = transformPose(mapFromOdom, odomFromBase)."],
      cases: [
        example(RACK_CASE_1.args, RACK_CASE_1.expected, "no drift"),
        example(RACK_CASE_2.args, RACK_CASE_2.expected, "lateral drift"),
        example(RACK_CASE_3.args, RACK_CASE_3.expected, "heading drift"),
        example(RACK_CASE_4.args, RACK_CASE_4.expected, "general drift"),
      ],
    }),
  ];

  const EKF_PY = "Localization/extended_kalman_filter/extended_kalman_filter.py";
  const PF_PY = "Localization/particle_filter/particle_filter.py";
  const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const ZERO3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const I2 = [[1, 0], [0, 1]];
  const ZERO2 = [[0, 0], [0, 0]];
  function diag3(a, b, c) { return [[a, 0, 0], [0, b, 0], [0, 0, c]]; }
  const P_AFTER_STRAIGHT = [[1, 0, 0], [0, 2, 1], [0, 1, 1]];
  const P3 = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];

  const CORRECTION_19 = [
    puzzle({
      number: 76, id: "heading-gate", track: "correction", title: "Heading Gate",
      goal: "Decide whether one rack fit may vote on the aisle heading: long enough, enough inliers, and a high enough inlier ratio.",
      concept: "A short or sparse fit has a noisy direction. The node still lets it feed the centerline offset, but not the heading; the reason names every gate it failed.",
      functionName: "isBeamReliableForHeading", signature: "isBeamReliableForHeading(beam, limits) → { valid, reason }",
      starterSource: starter("isBeamReliableForHeading", "beam, limits", "beam = { lineExtentM, inlierCount, inlierRatio }; limits = { minExtentM, minInliers, minInlierRatio }. reason lists the failed gates \"extent\", \"inliers\", \"ratio\" joined by \", \" (empty when valid)."),
      referenceSource: lines(
        "function isBeamReliableForHeading(beam, limits) {",
        "  var failures = [];",
        "  if (beam.lineExtentM < limits.minExtentM) failures.push(\"extent\");",
        "  if (beam.inlierCount < limits.minInliers) failures.push(\"inliers\");",
        "  if (beam.inlierRatio < limits.minInlierRatio) failures.push(\"ratio\");",
        "  return { valid: failures.length === 0, reason: failures.join(\", \") };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: navref("heading-gates", "heading.js", "isBeamReliableForHeading"),
      scene: { kind: "aisle", view: "gate", handles: [
        { id: "extent", type: "slider", label: "line extent (m)", value: 2.6, min: 0, max: 4 },
        { id: "inliers", type: "slider", label: "inliers", value: 700, min: 0, max: 1000 },
        { id: "ratio", type: "slider", label: "inlier ratio", value: 0.5, min: 0, max: 1 },
      ], args: [{ fixture: "gateBeam" }, { fixture: "gateLimits" }] },
      diagnoses: [
        diagnosis("any-gate", "One passing gate is not enough: all three must pass, and the reason must name exactly the gates that failed.", lines(
          "function isBeamReliableForHeading(beam, limits) {",
          "  var ok = beam.lineExtentM >= limits.minExtentM || beam.inlierCount >= limits.minInliers || beam.inlierRatio >= limits.minInlierRatio;",
          "  return { valid: ok, reason: ok ? \"\" : \"extent, inliers, ratio\" };",
          "}"
        )),
        diagnosis("ratio-ignored", "The inlier ratio gate is missing: 600 inliers out of 3000 points is still a bad heading source.", lines(
          "function isBeamReliableForHeading(beam, limits) {",
          "  var failures = [];",
          "  if (beam.lineExtentM < limits.minExtentM) failures.push(\"extent\");",
          "  if (beam.inlierCount < limits.minInliers) failures.push(\"inliers\");",
          "  return { valid: failures.length === 0, reason: failures.join(\", \") };",
          "}"
        )),
      ],
      hints: ["Check the three limits one by one and collect the names of the ones that fail.", "valid is true only when nothing failed.", "reason is the failed names joined with \", \": \"\" when valid, \"inliers, ratio\" when those two fail."],
      cases: [
        example([{ lineExtentM: 3.2, inlierCount: 680, inlierRatio: 0.68 }, { minExtentM: 2, minInliers: 500, minInlierRatio: 0.35 }], { valid: true, reason: "" }, "a good rack fit"),
        example([{ lineExtentM: 1.2, inlierCount: 680, inlierRatio: 0.68 }, { minExtentM: 2, minInliers: 500, minInlierRatio: 0.35 }], { valid: false, reason: "extent" }, "too short"),
        example([{ lineExtentM: 3.0, inlierCount: 485, inlierRatio: 0.68 }, { minExtentM: 2, minInliers: 500, minInlierRatio: 0.35 }], { valid: false, reason: "inliers" }, "the shrinking refit left it under 500"),
        example([{ lineExtentM: 2.5, inlierCount: 60, inlierRatio: 0.2 }, { minExtentM: 2, minInliers: 500, minInlierRatio: 0.35 }], { valid: false, reason: "inliers, ratio" }, "sparse and noisy"),
      ],
    }),
    puzzle({
      number: 77, id: "consensus-outlier-gate", track: "correction", title: "Consensus with an Outlier Gate",
      goal: "Take the weight-averaged circular mean of the beam headings, drop every beam farther than the threshold from it, then average the survivors again.",
      concept: "One skewed rack must not tilt the aisle. The node's gate is 3 degrees; a beam rejected here keeps feeding the centerline offset, it only loses its heading vote.",
      functionName: "selectConsensusHeading", signature: "selectConsensusHeading(samples, thresholdRad) → { valid, headingRad, accepted, rejected }",
      starterSource: starter("selectConsensusHeading", "samples, thresholdRad", "samples = [{ trackId, headingRad, weight }]. accepted / rejected are trackIds in input order. Nothing left: { valid: false, headingRad: 0, ... }."),
      referenceSource: lines(
        "function selectConsensusHeading(samples, thresholdRad) {",
        "  function mean(list) {",
        "    var sx = 0, sy = 0;",
        "    for (var i = 0; i < list.length; i += 1) { sx += list[i].weight * Math.cos(list[i].headingRad); sy += list[i].weight * Math.sin(list[i].headingRad); }",
        "    return Math.atan2(sy, sx);",
        "  }",
        "  var initial = mean(samples);",
        "  var accepted = [], rejected = [], kept = [];",
        "  for (var i = 0; i < samples.length; i += 1) {",
        "    if (Math.abs(wrapAngle(samples[i].headingRad - initial)) > thresholdRad) rejected.push(samples[i].trackId);",
        "    else { accepted.push(samples[i].trackId); kept.push(samples[i]); }",
        "  }",
        "  if (!kept.length) return { valid: false, headingRad: 0, accepted: accepted, rejected: rejected };",
        "  return { valid: true, headingRad: mean(kept), accepted: accepted, rejected: rejected };",
        "}"
      ),
      comparator: "angles", walkthroughChapter: "frame-roles",
      dependencies: ["wrap-angle"],
      reference: navref("heading-consensus", "heading.js", "selectConsensusHeadingSamples"),
      scene: { kind: "aisle", view: "outliers", handles: [
        { id: "beamA", type: "dial", label: "beam A", value: 0.5, radius: 2.6 },
        { id: "beamB", type: "dial", label: "beam B", value: 0.52, radius: 2.0 },
        { id: "beamC", type: "dial", label: "beam C", value: 0.9, radius: 1.4 },
      ], args: [{ fixture: "outlierSamples" }, 0.1] },
      diagnoses: [
        diagnosis("one-pass", "The first mean was returned as is: the skewed beam still pulls it. Reject the outliers and average again.", lines(
          "function selectConsensusHeading(samples, thresholdRad) {",
          "  var sx = 0, sy = 0, accepted = [];",
          "  for (var i = 0; i < samples.length; i += 1) { sx += samples[i].weight * Math.cos(samples[i].headingRad); sy += samples[i].weight * Math.sin(samples[i].headingRad); accepted.push(samples[i].trackId); }",
          "  return { valid: true, headingRad: Math.atan2(sy, sx), accepted: accepted, rejected: [] };",
          "}"
        )),
        diagnosis("no-wrap", "The difference to the mean was not wrapped, so a beam at −3.1 rad looks 6 rad away from a mean at π.", lines(
          "function selectConsensusHeading(samples, thresholdRad) {",
          "  function mean(list) {",
          "    var sx = 0, sy = 0;",
          "    for (var i = 0; i < list.length; i += 1) { sx += list[i].weight * Math.cos(list[i].headingRad); sy += list[i].weight * Math.sin(list[i].headingRad); }",
          "    return Math.atan2(sy, sx);",
          "  }",
          "  var initial = mean(samples);",
          "  var accepted = [], rejected = [], kept = [];",
          "  for (var i = 0; i < samples.length; i += 1) {",
          "    if (Math.abs(samples[i].headingRad - initial) > thresholdRad) rejected.push(samples[i].trackId);",
          "    else { accepted.push(samples[i].trackId); kept.push(samples[i]); }",
          "  }",
          "  if (!kept.length) return { valid: false, headingRad: 0, accepted: accepted, rejected: rejected };",
          "  return { valid: true, headingRad: mean(kept), accepted: accepted, rejected: rejected };",
          "}"
        )),
      ],
      hints: ["A weighted circular mean is atan2(Σ w·sin, Σ w·cos).", "Compare each heading with that first mean through wrapAngle; beyond the threshold it is rejected.", "Average the accepted samples again; with none accepted return valid false and heading 0."],
      cases: [
        example([[{ trackId: 1, headingRad: 0.5, weight: 2 }, { trackId: 2, headingRad: 0.52, weight: 2 }, { trackId: 3, headingRad: 0.9, weight: 1 }], 0.1], { valid: true, headingRad: 0.51, accepted: [1, 2], rejected: [3] }, "one skewed beam is dropped"),
        example([[{ trackId: 7, headingRad: 0.3, weight: 5 }], 0.1], { valid: true, headingRad: 0.3, accepted: [7], rejected: [] }, "single beam"),
        example([[{ trackId: 1, headingRad: 0.5, weight: 2 }, { trackId: 2, headingRad: 0.52, weight: 2 }], 0.1], { valid: true, headingRad: 0.51, accepted: [1, 2], rejected: [] }, "two beams agree"),
        example([[{ trackId: 1, headingRad: 3.1, weight: 1 }, { trackId: 2, headingRad: -3.1, weight: 1 }], 0.1], { valid: true, headingRad: PI, accepted: [1, 2], rejected: [] }, "across the wrap"),
        example([[{ trackId: 1, headingRad: 0, weight: 1 }, { trackId: 2, headingRad: 1, weight: 1 }], 0.1], { valid: false, headingRad: 0, accepted: [], rejected: [1, 2] }, "both too far from the mean: no consensus"),
      ],
    }),
    puzzle({
      number: 78, id: "rate-limit-heading", track: "correction", title: "Rate-Limit the Heading",
      goal: "Let the published aisle heading move at most maxRate × dt per frame toward the new consensus; an unusable dt falls back to one frame at 30 Hz.",
      concept: "The consensus can flick by a degree between frames; the controller must not see that. The node allows 0.75 degrees per second, and a jump beyond its reset threshold is handled by a full reset instead of by this clamp.",
      functionName: "rateLimitHeading", signature: "rateLimitHeading(previous, heading, dt, maxRate) → radians",
      starterSource: starter("rateLimitHeading", "previous, heading, dt, maxRate", "previous null → heading. dt outside (0, 1] → 1/30. Clamp the wrapped difference to ±maxRate·dt."),
      referenceSource: lines(
        "function rateLimitHeading(previous, heading, dt, maxRate) {",
        "  if (previous === null || maxRate <= 0) return heading;",
        "  if (!(dt > 0) || dt > 1) dt = 1 / 30;",
        "  var maxStep = maxRate * dt;",
        "  var diff = wrapAngle(heading - previous);",
        "  if (Math.abs(diff) <= maxStep) return heading;",
        "  return wrapAngle(previous + (diff > 0 ? maxStep : -maxStep));",
        "}"
      ),
      comparator: "angle", walkthroughChapter: "time-buffer",
      dependencies: ["wrap-angle"],
      reference: navref("heading-gates", "heading.js", "rateLimitHeading"),
      scene: { kind: "aisle", view: "rate", handles: [
        { id: "heading", type: "dial", label: "new consensus", value: 0.6, radius: 2.2 },
        { id: "dt", type: "slider", label: "dt (s)", value: 0.5, min: 0, max: 1.2 },
      ], args: [0.1, { handle: "heading" }, { handle: "dt" }, 0.4] },
      diagnoses: [
        diagnosis("no-wrap", "The difference was taken without wrapping, so a step across ±π runs the long way round.", lines(
          "function rateLimitHeading(previous, heading, dt, maxRate) {",
          "  if (previous === null || maxRate <= 0) return heading;",
          "  if (!(dt > 0) || dt > 1) dt = 1 / 30;",
          "  var maxStep = maxRate * dt;",
          "  var diff = heading - previous;",
          "  if (Math.abs(diff) <= maxStep) return heading;",
          "  return wrapAngle(previous + (diff > 0 ? maxStep : -maxStep));",
          "}"
        )),
        diagnosis("bad-dt-kept", "A dt of 2 s (a dropout) let the heading move 2 s worth at once; the node falls back to one 30 Hz frame.", lines(
          "function rateLimitHeading(previous, heading, dt, maxRate) {",
          "  if (previous === null || maxRate <= 0) return heading;",
          "  var maxStep = maxRate * dt;",
          "  var diff = wrapAngle(heading - previous);",
          "  if (Math.abs(diff) <= maxStep) return heading;",
          "  return wrapAngle(previous + (diff > 0 ? maxStep : -maxStep));",
          "}"
        )),
      ],
      hints: ["No previous heading: nothing to limit against.", "maxStep = maxRate·dt with dt forced to 1/30 when it is not in (0, 1].", "diff = wrapAngle(heading − previous); within ±maxStep return heading, else previous ± maxStep, wrapped."],
      cases: [
        example([0, 0.5, 1, 0.1], 0.1, "clamped to one step"),
        example([null, 0.5, 0.033, 0.013], 0.5, "first heading passes"),
        example([0, 0.05, 1, 0.1], 0.05, "small change passes"),
        example([3.1, -3.1, 0.5, 0.1], 3.15 - 2 * PI, "the short way across the wrap"),
        example([0, 0.5, 2, 0.3], 0.01, "dt of 2 s falls back to one frame"),
      ],
    }),
    puzzle({
      number: 79, id: "aisle-state-blend", track: "correction", title: "Aisle State EMA",
      goal: "Blend a new centerline measurement into the aisle state: heading on the circle, offset c linearly, half width only from a dual measurement; the first measurement is taken as is.",
      concept: "This state is what the transform is built from. Blending the heading through sin and cos keeps a state near ±π from collapsing toward zero, which a plain weighted average of the two angles would do.",
      functionName: "blendAisleState", signature: "blendAisleState(state, meas, gain) → { headingRad, centerlineC, halfWidthM }",
      starterSource: starter("blendAisleState", "state, meas, gain", "state may be null. meas = { headingRad, centerlineC, halfWidthM, dualSide }. gain is the weight on meas (0.2 dual, 0.05 single)."),
      referenceSource: lines(
        "function blendAisleState(state, meas, gain) {",
        "  if (state === null) return { headingRad: meas.headingRad, centerlineC: meas.centerlineC, halfWidthM: meas.halfWidthM };",
        "  var s = (1 - gain) * Math.sin(state.headingRad) + gain * Math.sin(meas.headingRad);",
        "  var c = (1 - gain) * Math.cos(state.headingRad) + gain * Math.cos(meas.headingRad);",
        "  return {",
        "    headingRad: Math.atan2(s, c),",
        "    centerlineC: (1 - gain) * state.centerlineC + gain * meas.centerlineC,",
        "    halfWidthM: meas.dualSide ? (1 - gain) * state.halfWidthM + gain * meas.halfWidthM : state.halfWidthM,",
        "  };",
        "}"
      ),
      comparator: "angles", walkthroughChapter: "time-buffer",
      reference: navref("pipeline", "aisle_state.js", "updateAisleState (blendAngleCircular)"),
      scene: { kind: "aisle", view: "blend", handles: [
        { id: "measHeading", type: "dial", label: "measured heading", value: 0.4, radius: 2.0 },
        { id: "measC", type: "slider", label: "measured c", value: -0.2, min: -1, max: 1 },
        { id: "gain", type: "slider", label: "gain", value: 0.2, min: 0, max: 1 },
      ], args: [{ fixture: "blendState" }, { fixture: "blendMeas" }, { handle: "gain" }] },
      diagnoses: [
        diagnosis("linear-heading", "The heading was averaged as two numbers: a state at 3.1 and a measurement at −3.1 then blend to 0 instead of π. Blend sin and cos and take atan2.", lines(
          "function blendAisleState(state, meas, gain) {",
          "  if (state === null) return { headingRad: meas.headingRad, centerlineC: meas.centerlineC, halfWidthM: meas.halfWidthM };",
          "  return {",
          "    headingRad: (1 - gain) * state.headingRad + gain * meas.headingRad,",
          "    centerlineC: (1 - gain) * state.centerlineC + gain * meas.centerlineC,",
          "    halfWidthM: meas.dualSide ? (1 - gain) * state.halfWidthM + gain * meas.halfWidthM : state.halfWidthM,",
          "  };",
          "}"
        )),
        diagnosis("gain-swapped", "gain is the weight on the new measurement, not on the state.", lines(
          "function blendAisleState(state, meas, gain) {",
          "  if (state === null) return { headingRad: meas.headingRad, centerlineC: meas.centerlineC, halfWidthM: meas.halfWidthM };",
          "  var s = gain * Math.sin(state.headingRad) + (1 - gain) * Math.sin(meas.headingRad);",
          "  var c = gain * Math.cos(state.headingRad) + (1 - gain) * Math.cos(meas.headingRad);",
          "  return {",
          "    headingRad: Math.atan2(s, c),",
          "    centerlineC: gain * state.centerlineC + (1 - gain) * meas.centerlineC,",
          "    halfWidthM: meas.dualSide ? gain * state.halfWidthM + (1 - gain) * meas.halfWidthM : state.halfWidthM,",
          "  };",
          "}"
        )),
      ],
      hints: ["No state yet: the measurement becomes the state.", "Heading: blend (1 − gain)·(cos, sin) of the state with gain·(cos, sin) of the measurement, then atan2.", "c blends linearly; the half width blends only when meas.dualSide, otherwise it is kept."],
      cases: [
        example([{ headingRad: 0, centerlineC: 0, halfWidthM: 1.6 }, { headingRad: 0.2, centerlineC: -0.4, halfWidthM: 1.5, dualSide: true }, 0.5], { headingRad: 0.1, centerlineC: -0.2, halfWidthM: 1.55 }, "half way"),
        example([null, { headingRad: 0.3, centerlineC: -0.4, halfWidthM: 1.55, dualSide: true }, 0.2], { headingRad: 0.3, centerlineC: -0.4, halfWidthM: 1.55 }, "first measurement"),
        example([{ headingRad: 3.1, centerlineC: 0, halfWidthM: 1.6 }, { headingRad: -3.1, centerlineC: 0, halfWidthM: 1.6, dualSide: true }, 0.5], { headingRad: PI, centerlineC: 0, halfWidthM: 1.6 }, "across the wrap"),
        example([{ headingRad: 0, centerlineC: -0.4, halfWidthM: 1.6 }, { headingRad: 0.4, centerlineC: -0.2, halfWidthM: 1.4, dualSide: false }, 0.2], { headingRad: Math.atan2(0.2 * Math.sin(0.4), 0.8 + 0.2 * Math.cos(0.4)), centerlineC: -0.36, halfWidthM: 1.6 }, "single-rack measurement keeps the half width"),
      ],
    }),
    puzzle({
      number: 80, id: "dual-centerline-check", track: "correction", title: "Dual Centerline with Checks",
      goal: "Align both rack lines to the aisle heading, reject the pair when their normals disagree or the half width is unrealistic, otherwise return the midpoint line and the measured half width.",
      concept: "The midpoint only means 'aisle center' when both lines are faces of the same aisle. The dot check catches a skewed or perpendicular fit, the half-width window a rack seen twice or a far wall, and the half width itself feeds the one-shot calibration.",
      functionName: "computeDualCenterline", signature: "computeDualCenterline(leftLine, rightLine, heading) → { a, b, c, halfWidth } | null",
      starterSource: starter("computeDualCenterline", "leftLine, rightLine, heading", "Align both normals to (−sin h, cos h). null when their dot < 0.7 or the half width |cL − cR| / 2 lies outside [0.3, 6]."),
      referenceSource: lines(
        "function computeDualCenterline(leftLine, rightLine, heading) {",
        "  var nx = -Math.sin(heading), ny = Math.cos(heading);",
        "  function align(line) {",
        "    var n = Math.sqrt(line.a * line.a + line.b * line.b);",
        "    var a = line.a / n, b = line.b / n, c = line.c / n;",
        "    return a * nx + b * ny < 0 ? { a: -a, b: -b, c: -c } : { a: a, b: b, c: c };",
        "  }",
        "  var l = align(leftLine), r = align(rightLine);",
        "  if (l.a * r.a + l.b * r.b < 0.7) return null;",
        "  var halfWidth = Math.abs(l.c - r.c) / 2;",
        "  if (halfWidth < 0.3 || halfWidth > 6) return null;",
        "  var a = (l.a + r.a) / 2, b = (l.b + r.b) / 2;",
        "  var norm = Math.sqrt(a * a + b * b);",
        "  return { a: a / norm, b: b / norm, c: (l.c + r.c) / 2, halfWidth: halfWidth };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      reference: navref("centerline", "pose_corrector.js", "computeDualCenterline"),
      scene: { kind: "aisle", view: "dual-check", handles: [
        { id: "leftOffset", type: "slider", label: "left rack y", value: 1.6, min: 0.8, max: 3 },
        { id: "rightOffset", type: "slider", label: "right rack y", value: -1.6, min: -3, max: -0.8 },
        { id: "rightSkew", type: "dial", label: "right rack skew", value: 0, radius: 1.0 },
      ], args: [{ fixture: "leftOffsetLine" }, { fixture: "rightSkewedLine" }, 0] },
      diagnoses: [
        diagnosis("no-dot-check", "A right rack skewed by 50° was accepted: normals that disagree (dot < 0.7) mean the pair is not two faces of one aisle.", lines(
          "function computeDualCenterline(leftLine, rightLine, heading) {",
          "  var nx = -Math.sin(heading), ny = Math.cos(heading);",
          "  function align(line) {",
          "    var n = Math.sqrt(line.a * line.a + line.b * line.b);",
          "    var a = line.a / n, b = line.b / n, c = line.c / n;",
          "    return a * nx + b * ny < 0 ? { a: -a, b: -b, c: -c } : { a: a, b: b, c: c };",
          "  }",
          "  var l = align(leftLine), r = align(rightLine);",
          "  var halfWidth = Math.abs(l.c - r.c) / 2;",
          "  if (halfWidth < 0.3 || halfWidth > 6) return null;",
          "  var a = (l.a + r.a) / 2, b = (l.b + r.b) / 2;",
          "  var norm = Math.sqrt(a * a + b * b);",
          "  return { a: a / norm, b: b / norm, c: (l.c + r.c) / 2, halfWidth: halfWidth };",
          "}"
        )),
        diagnosis("full-width", "That is the full aisle width; the half width is |cL − cR| / 2.", lines(
          "function computeDualCenterline(leftLine, rightLine, heading) {",
          "  var nx = -Math.sin(heading), ny = Math.cos(heading);",
          "  function align(line) {",
          "    var n = Math.sqrt(line.a * line.a + line.b * line.b);",
          "    var a = line.a / n, b = line.b / n, c = line.c / n;",
          "    return a * nx + b * ny < 0 ? { a: -a, b: -b, c: -c } : { a: a, b: b, c: c };",
          "  }",
          "  var l = align(leftLine), r = align(rightLine);",
          "  if (l.a * r.a + l.b * r.b < 0.7) return null;",
          "  var halfWidth = Math.abs(l.c - r.c);",
          "  if (halfWidth < 0.3 || halfWidth > 6) return null;",
          "  var a = (l.a + r.a) / 2, b = (l.b + r.b) / 2;",
          "  var norm = Math.sqrt(a * a + b * b);",
          "  return { a: a / norm, b: b / norm, c: (l.c + r.c) / 2, halfWidth: halfWidth };",
          "}"
        )),
      ],
      hints: ["Normalize each line and flip it when its normal dots negatively with (−sin h, cos h).", "Reject when the aligned normals' dot product is below 0.7 or |cL − cR| / 2 is outside [0.3, 6].", "Average a, b, c; renormalize (a, b); return the half width with the line."],
      cases: [
        example([{ a: 0, b: 1, c: -1.6 }, { a: 0, b: 1, c: 1.6 }, 0], { a: 0, b: 1, c: 0, halfWidth: 1.6 }, "symmetric aisle"),
        example([{ a: 0, b: 1, c: -1.6 }, { a: 0, b: -1, c: -1.6 }, 0], { a: 0, b: 1, c: 0, halfWidth: 1.6 }, "right line flipped"),
        example([{ a: 0, b: 1, c: -1.6 }, { a: -Math.sin(50 * PI / 180), b: Math.cos(50 * PI / 180), c: 1.6 }, 0], null, "right rack skewed 50°: rejected"),
        example([{ a: 0, b: 1, c: -0.2 }, { a: 0, b: 1, c: 0.2 }, 0], null, "0.2 m half width: rejected"),
        example([{ a: 0, b: 1, c: -3 }, { a: 0, b: 1, c: -1 }, 0], { a: 0, b: 1, c: -2, halfWidth: 1 }, "offset aisle"),
      ],
    }),
    puzzle({
      number: 81, id: "low-pass-step-limit", track: "correction", title: "Low-Pass with a Step Limit",
      goal: "Move the filtered value toward the raw one by alpha, but never by more than maxStep per frame.",
      concept: "An EMA alone still passes a big step scaled by alpha; the clamp bounds how fast the published correction can move, so the corrected TF cannot twitch.",
      functionName: "lowPassStepLimit", signature: "lowPassStepLimit(current, raw, alpha, maxStep) → number",
      starterSource: starter("lowPassStepLimit", "current, raw, alpha, maxStep", "target = alpha·raw + (1 − alpha)·current; clamp target − current to ±maxStep (maxStep ≤ 0: no clamp)."),
      referenceSource: lines(
        "function lowPassStepLimit(current, raw, alpha, maxStep) {",
        "  var target = alpha * raw + (1 - alpha) * current;",
        "  var delta = target - current;",
        "  if (maxStep > 0) delta = Math.min(maxStep, Math.max(-maxStep, delta));",
        "  return current + delta;",
        "}"
      ),
      comparator: "scalar", walkthroughChapter: "time-buffer",
      reference: navref("lateral-drift-filter", "lateral_drift_filter.js", "LateralDriftFilter.applyLowPassAndStepLimit"),
      scene: { kind: "aisle", view: "lowpass", handles: [
        { id: "raw", type: "slider", label: "raw c", value: 0.6, min: -1, max: 1 },
        { id: "alpha", type: "slider", label: "alpha", value: 0.05, min: 0, max: 1 },
        { id: "maxStep", type: "slider", label: "max step", value: 0.04, min: 0, max: 0.3 },
      ], args: [0.2, { handle: "raw" }, { handle: "alpha" }, { handle: "maxStep" }] },
      diagnoses: [
        diagnosis("clamp-target", "The clamp must bound the change from current, not the target value itself.", lines(
          "function lowPassStepLimit(current, raw, alpha, maxStep) {",
          "  var target = alpha * raw + (1 - alpha) * current;",
          "  if (maxStep > 0) target = Math.min(maxStep, Math.max(-maxStep, target));",
          "  return target;",
          "}"
        )),
        diagnosis("alpha-swapped", "alpha weights the raw value; (1 − alpha) stays on the current one.", lines(
          "function lowPassStepLimit(current, raw, alpha, maxStep) {",
          "  var target = alpha * current + (1 - alpha) * raw;",
          "  var delta = target - current;",
          "  if (maxStep > 0) delta = Math.min(maxStep, Math.max(-maxStep, delta));",
          "  return current + delta;",
          "}"
        )),
      ],
      hints: ["target = alpha·raw + (1 − alpha)·current.", "delta = target − current, clamped to [−maxStep, maxStep] when maxStep > 0.", "Return current + delta."],
      cases: [
        example([0.2, 0.6, 0.05, 0.04], 0.22, "EMA step inside the limit"),
        example([0, 1, 0.5, 1], 0.5, "no clamp needed"),
        example([0, 1, 0.5, 0.04], 0.04, "clamped"),
        example([1, 0, 0.5, 0], 0.5, "maxStep 0 disables the clamp"),
        example([0, -1, 0.5, 0.04], -0.04, "clamped downward"),
      ],
    }),
    puzzle({
      number: 82, id: "lateral-jump-guard", track: "correction", title: "Lateral Jump Guard",
      goal: "One step of LateralDriftFilter on the centerline offset c: hold an isolated jump, accept it once it has repeated for jumpConfirmFrames frames, otherwise low-pass with the step limit.",
      concept: "One frame's c can jump when a fit flips; a real shift keeps coming back. Holding for a few frames tells them apart without adding lag to the normal path. Since 2026-09-14 the node runs this on c itself, not on the drone's distance.",
      functionName: "lateralJumpGuard", signature: "lateralJumpGuard(state, raw, cfg) → { state, filteredM, held }",
      starterSource: starter("lateralJumpGuard", "state, raw, cfg", "state = { filtered, lastAcceptedRaw, pendingJumpRaw, pendingJumpCount } or null; cfg = { emaAlpha, jumpThresholdM, jumpConfirmFrames, jumpClusterThresholdM, maxStepM }. Return a NEW state object."),
      referenceSource: lines(
        "function lateralJumpGuard(state, raw, cfg) {",
        "  if (state === null) return { state: { filtered: raw, lastAcceptedRaw: raw, pendingJumpRaw: null, pendingJumpCount: 0 }, filteredM: raw, held: false };",
        "  var delta = raw - state.lastAcceptedRaw;",
        "  var isJump = cfg.jumpThresholdM > 0 && Math.abs(delta) > cfg.jumpThresholdM;",
        "  if (isJump) {",
        "    var startsCluster = state.pendingJumpRaw === null || (cfg.jumpClusterThresholdM > 0 && Math.abs(raw - state.pendingJumpRaw) > cfg.jumpClusterThresholdM);",
        "    var count = startsCluster ? 1 : state.pendingJumpCount + 1;",
        "    if (count < cfg.jumpConfirmFrames) {",
        "      return { state: { filtered: state.filtered, lastAcceptedRaw: state.lastAcceptedRaw, pendingJumpRaw: startsCluster ? raw : state.pendingJumpRaw, pendingJumpCount: count }, filteredM: state.filtered, held: true };",
        "    }",
        "  }",
        "  var filtered = lowPassStepLimit(state.filtered, raw, cfg.emaAlpha, cfg.maxStepM);",
        "  return { state: { filtered: filtered, lastAcceptedRaw: raw, pendingJumpRaw: null, pendingJumpCount: 0 }, filteredM: filtered, held: false };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "time-buffer",
      dependencies: ["low-pass-step-limit"],
      reference: navref("lateral-drift-filter", "lateral_drift_filter.js", "LateralDriftFilter.update"),
      scene: { kind: "aisle", view: "jump-guard", handles: [
        { id: "raw", type: "slider", label: "raw c this frame", value: 0.6, min: -0.5, max: 1 },
        { id: "pending", type: "selector", label: "pending jump at 0.60", value: "none", options: ["none", "one frame", "two frames"] },
      ], args: [{ fixture: "guardState" }, { handle: "raw" }, { fixture: "guardConfig" }] },
      diagnoses: [
        diagnosis("no-cluster", "Every jump frame was counted, even one far from the pending value: a jump to 0.9 after two frames at 0.6 must restart the count.", lines(
          "function lateralJumpGuard(state, raw, cfg) {",
          "  if (state === null) return { state: { filtered: raw, lastAcceptedRaw: raw, pendingJumpRaw: null, pendingJumpCount: 0 }, filteredM: raw, held: false };",
          "  var delta = raw - state.lastAcceptedRaw;",
          "  var isJump = cfg.jumpThresholdM > 0 && Math.abs(delta) > cfg.jumpThresholdM;",
          "  if (isJump) {",
          "    var count = state.pendingJumpCount + 1;",
          "    if (count < cfg.jumpConfirmFrames) {",
          "      return { state: { filtered: state.filtered, lastAcceptedRaw: state.lastAcceptedRaw, pendingJumpRaw: state.pendingJumpRaw === null ? raw : state.pendingJumpRaw, pendingJumpCount: count }, filteredM: state.filtered, held: true };",
          "    }",
          "  }",
          "  var filtered = lowPassStepLimit(state.filtered, raw, cfg.emaAlpha, cfg.maxStepM);",
          "  return { state: { filtered: filtered, lastAcceptedRaw: raw, pendingJumpRaw: null, pendingJumpCount: 0 }, filteredM: filtered, held: false };",
          "}"
        )),
        diagnosis("reference-filtered", "The jump was measured against the filtered value; the node compares with the last ACCEPTED raw value, otherwise the filter's own lag looks like a jump.", lines(
          "function lateralJumpGuard(state, raw, cfg) {",
          "  if (state === null) return { state: { filtered: raw, lastAcceptedRaw: raw, pendingJumpRaw: null, pendingJumpCount: 0 }, filteredM: raw, held: false };",
          "  var delta = raw - state.filtered;",
          "  var isJump = cfg.jumpThresholdM > 0 && Math.abs(delta) > cfg.jumpThresholdM;",
          "  if (isJump) {",
          "    var startsCluster = state.pendingJumpRaw === null || (cfg.jumpClusterThresholdM > 0 && Math.abs(raw - state.pendingJumpRaw) > cfg.jumpClusterThresholdM);",
          "    var count = startsCluster ? 1 : state.pendingJumpCount + 1;",
          "    if (count < cfg.jumpConfirmFrames) {",
          "      return { state: { filtered: state.filtered, lastAcceptedRaw: state.lastAcceptedRaw, pendingJumpRaw: startsCluster ? raw : state.pendingJumpRaw, pendingJumpCount: count }, filteredM: state.filtered, held: true };",
          "    }",
          "  }",
          "  var filtered = lowPassStepLimit(state.filtered, raw, cfg.emaAlpha, cfg.maxStepM);",
          "  return { state: { filtered: filtered, lastAcceptedRaw: raw, pendingJumpRaw: null, pendingJumpCount: 0 }, filteredM: filtered, held: false };",
          "}"
        )),
      ],
      hints: ["No state: the raw value initializes filtered and lastAcceptedRaw.", "A jump is |raw − lastAcceptedRaw| > jumpThresholdM. Near the pending value (within the cluster threshold) it extends the count, otherwise it starts a new count at 1; below jumpConfirmFrames the output is held.", "Confirmed jump or no jump: lastAcceptedRaw = raw, filtered = lowPassStepLimit(filtered, raw, emaAlpha, maxStepM), pending cleared."],
      cases: [
        example([{ filtered: 0.2, lastAcceptedRaw: 0.2, pendingJumpRaw: null, pendingJumpCount: 0 }, 0.6, { emaAlpha: 0.5, jumpThresholdM: 0.25, jumpConfirmFrames: 3, jumpClusterThresholdM: 0.08, maxStepM: 0.04 }], { state: { filtered: 0.2, lastAcceptedRaw: 0.2, pendingJumpRaw: 0.6, pendingJumpCount: 1 }, filteredM: 0.2, held: true }, "first jump frame: held"),
        example([null, 0.2, { emaAlpha: 0.5, jumpThresholdM: 0.25, jumpConfirmFrames: 3, jumpClusterThresholdM: 0.08, maxStepM: 0.04 }], { state: { filtered: 0.2, lastAcceptedRaw: 0.2, pendingJumpRaw: null, pendingJumpCount: 0 }, filteredM: 0.2, held: false }, "first value"),
        example([{ filtered: 0.2, lastAcceptedRaw: 0.2, pendingJumpRaw: 0.6, pendingJumpCount: 2 }, 0.62, { emaAlpha: 0.5, jumpThresholdM: 0.25, jumpConfirmFrames: 3, jumpClusterThresholdM: 0.08, maxStepM: 0.04 }], { state: { filtered: 0.24, lastAcceptedRaw: 0.62, pendingJumpRaw: null, pendingJumpCount: 0 }, filteredM: 0.24, held: false }, "third frame in the cluster: confirmed, then eased in"),
        example([{ filtered: 0.2, lastAcceptedRaw: 0.2, pendingJumpRaw: null, pendingJumpCount: 0 }, 0.3, { emaAlpha: 0.5, jumpThresholdM: 0.25, jumpConfirmFrames: 3, jumpClusterThresholdM: 0.08, maxStepM: 0.04 }], { state: { filtered: 0.24, lastAcceptedRaw: 0.3, pendingJumpRaw: null, pendingJumpCount: 0 }, filteredM: 0.24, held: false }, "no jump: EMA with the step clamp"),
        example([{ filtered: 0.2, lastAcceptedRaw: 0.2, pendingJumpRaw: 0.6, pendingJumpCount: 2 }, 0.9, { emaAlpha: 0.5, jumpThresholdM: 0.25, jumpConfirmFrames: 3, jumpClusterThresholdM: 0.08, maxStepM: 0.04 }], { state: { filtered: 0.2, lastAcceptedRaw: 0.2, pendingJumpRaw: 0.9, pendingJumpCount: 1 }, filteredM: 0.2, held: true }, "a different jump restarts the count"),
        example([{ filtered: 0.24, lastAcceptedRaw: 0.3, pendingJumpRaw: null, pendingJumpCount: 0 }, 0.52, { emaAlpha: 0.5, jumpThresholdM: 0.25, jumpConfirmFrames: 3, jumpClusterThresholdM: 0.08, maxStepM: 0.04 }], { state: { filtered: 0.28, lastAcceptedRaw: 0.52, pendingJumpRaw: null, pendingJumpCount: 0 }, filteredM: 0.28, held: false }, "0.22 from the last accepted raw: no jump"),
      ],
    }),
    puzzle({
      number: 83, id: "vision-correction-transform", track: "correction", title: "Vision Correction Transform",
      goal: "Turn a raw odom pose and its corrected position into the map → odom edge (the delta rotated by −aisle heading, rotation −aisle heading) and the corrected pose it implies.",
      concept: "The corrected frame is odom rotated so the aisle is its x axis and shifted so the centerline is y = 0. The child edge stays the raw FCU pose, so corrected_pose.y is the drone's real distance from the middle and its yaw is raw yaw − aisle heading.",
      functionName: "visionCorrectionTransform", signature: "visionCorrectionTransform(rawPose, corrected, aisleHeading) → { mapFromOdom, correctedPose }",
      starterSource: starter("visionCorrectionTransform", "rawPose, corrected, aisleHeading", "yaw = wrapAngle(−aisleHeading); mapFromOdom = { R(yaw)·(corrected − raw), yaw }; correctedPose = transformPose(mapFromOdom, rawPose)."),
      referenceSource: lines(
        "function visionCorrectionTransform(rawPose, corrected, aisleHeading) {",
        "  var yaw = wrapAngle(-aisleHeading);",
        "  var dx = corrected.x - rawPose.x, dy = corrected.y - rawPose.y;",
        "  var mapFromOdom = { x: Math.cos(yaw) * dx - Math.sin(yaw) * dy, y: Math.sin(yaw) * dx + Math.cos(yaw) * dy, yaw: yaw };",
        "  return { mapFromOdom: mapFromOdom, correctedPose: transformPose(mapFromOdom, rawPose) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["wrap-angle", "transform-pose"],
      reference: navref("tf-logic", "correction_transform.js", "buildVisionCorrectionTransform"),
      scene: { kind: "aisle", view: "vision-tf", handles: [
        { id: "robot", type: "pose", label: "raw FCU (odom)", value: { x: 1, y: 0.5, yaw: 0.3 } },
        { id: "c", type: "slider", label: "centerline c", value: -0.4, min: -1.5, max: 1.5 },
        { id: "aisle", type: "dial", label: "aisle heading", value: 0.15, radius: 0.9, center: { x: -2.4, y: -1.4 } },
      ], args: [{ handle: "robot" }, { fixture: "correctedFromC" }, { handle: "aisle" }] },
      diagnoses: [
        diagnosis("delta-unrotated", "The delta was written into the edge in odom axes; the map → odom edge carries it rotated by −aisle heading.", lines(
          "function visionCorrectionTransform(rawPose, corrected, aisleHeading) {",
          "  var yaw = wrapAngle(-aisleHeading);",
          "  var mapFromOdom = { x: corrected.x - rawPose.x, y: corrected.y - rawPose.y, yaw: yaw };",
          "  return { mapFromOdom: mapFromOdom, correctedPose: transformPose(mapFromOdom, rawPose) };",
          "}"
        )),
        diagnosis("yaw-positive", "The edge rotates by −aisle heading so the observed aisle lands on the map x axis; +heading turns it the other way.", lines(
          "function visionCorrectionTransform(rawPose, corrected, aisleHeading) {",
          "  var yaw = wrapAngle(aisleHeading);",
          "  var dx = corrected.x - rawPose.x, dy = corrected.y - rawPose.y;",
          "  var mapFromOdom = { x: Math.cos(yaw) * dx - Math.sin(yaw) * dy, y: Math.sin(yaw) * dx + Math.cos(yaw) * dy, yaw: yaw };",
          "  return { mapFromOdom: mapFromOdom, correctedPose: transformPose(mapFromOdom, rawPose) };",
          "}"
        )),
      ],
      hints: ["The edge's rotation is −aisleHeading, wrapped.", "Its translation is the delta (corrected − raw) rotated by that same angle.", "correctedPose = transformPose(mapFromOdom, rawPose): position R(yaw)·raw + translation, yaw raw + (−aisle heading)."],
      cases: [
        example([{ x: 2, y: 0.5, yaw: 0.3 }, { x: 2, y: 0.1 }, 0], { mapFromOdom: { x: 0, y: -0.4, yaw: 0 }, correctedPose: { x: 2, y: 0.1, yaw: 0.3 } }, "aisle along x: the edge is (0, c)"),
        example([{ x: 0.4, y: 3, yaw: 1.4 }, { x: 0.1, y: 3 }, PI / 2], { mapFromOdom: { x: 0, y: 0.3, yaw: -PI / 2 }, correctedPose: { x: 3, y: -0.1, yaw: 1.4 - PI / 2 } }, "aisle along +y: corrected y is the signed distance"),
        example([{ x: 1, y: -1, yaw: 0 }, { x: 1.25, y: -0.5 }, 0], { mapFromOdom: { x: 0.25, y: 0.5, yaw: 0 }, correctedPose: { x: 1.25, y: -0.5, yaw: 0 } }, "with an x offset"),
        example([{ x: 1, y: 1, yaw: 0.5 }, { x: 1, y: 1 }, 0.5], { mapFromOdom: { x: 0, y: 0, yaw: -0.5 }, correctedPose: { x: Math.cos(0.5) + Math.sin(0.5), y: Math.cos(0.5) - Math.sin(0.5), yaw: 0 } }, "rotation only"),
      ],
    }),
  ];

  const ESTIMATION_19 = [
    puzzle({
      number: 84, id: "diff-drive-twist", track: "estimation", title: "Wheel Speeds to Twist",
      goal: "Convert left and right wheel speeds into the body twist a differential-drive controller publishes.",
      concept: "This is where odom → base_link is born: v is the mean wheel speed, ω is their difference over the wheelbase.",
      functionName: "diffDriveTwist", signature: "diffDriveTwist(vLeft, vRight, wheelBase) → { v, omega }",
      starterSource: starter("diffDriveTwist", "vLeft, vRight, wheelBase", "v = (vL + vR) / 2; ω = (vR − vL) / wheelBase."),
      referenceSource: "function diffDriveTwist(vLeft, vRight, wheelBase) { return { v: (vLeft + vRight) / 2, omega: (vRight - vLeft) / wheelBase }; }",
      comparator: "deep", walkthroughChapter: "frame-roles",
      reference: docref("ros2_control · diff_drive_controller", "https://control.ros.org/rolling/doc/ros2_controllers/diff_drive_controller/doc/userdoc.html"),
      scene: { kind: "estimation", view: "diffdrive", handles: [
        { id: "vLeft", type: "slider", label: "left wheel (m/s)", value: 0.6, min: -1, max: 1 },
        { id: "vRight", type: "slider", label: "right wheel (m/s)", value: 0.9, min: -1, max: 1 },
      ], args: [{ handle: "vLeft" }, { handle: "vRight" }, 0.5] },
      diagnoses: [
        diagnosis("omega-sign", "Turn rate has the wrong sign: a faster right wheel turns the robot left (positive ω).", "function diffDriveTwist(vLeft, vRight, wheelBase) { return { v: (vLeft + vRight) / 2, omega: (vLeft - vRight) / wheelBase }; }"),
        diagnosis("no-wheelbase", "The wheel speed difference must be divided by the wheelbase to become rad/s.", "function diffDriveTwist(vLeft, vRight, wheelBase) { return { v: (vLeft + vRight) / 2, omega: vRight - vLeft }; }"),
      ],
      hints: ["Forward speed is the average of the two wheels.", "Turning comes from the difference, scaled by the distance between wheels.", "Return { v: (vL + vR) / 2, omega: (vR − vL) / wheelBase }."],
      cases: [
        example([1, 1, 0.5], { v: 1, omega: 0 }, "straight"),
        example([0, 1, 0.5], { v: 0.5, omega: 2 }, "pivot on the left wheel"),
        example([1, -1, 0.5], { v: 0, omega: -4 }, "spin in place"),
        example([0.2, 0.4, 0.4], { v: 0.3, omega: 0.5 }, "gentle arc"),
      ],
    }),
    puzzle({
      number: 85, id: "integrate-gyro", track: "estimation", title: "Integrate a Gyro",
      goal: "Advance an orientation quaternion by body-frame angular rates over dt.",
      concept: "Body rates rotate about the body axes, so the small rotation multiplies on the right.",
      functionName: "integrateGyro", signature: "integrateGyro(q, omega, dt) → quaternion",
      starterSource: starter("integrateGyro", "q, omega, dt", "angle = |ω|·dt about axis ω/|ω|; q ⊗ Δq."),
      referenceSource: lines(
        "function integrateGyro(q, omega, dt) {",
        "  var rate = Math.sqrt(omega.x * omega.x + omega.y * omega.y + omega.z * omega.z);",
        "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  var unit = { x: q.x / n, y: q.y / n, z: q.z / n, w: q.w / n };",
        "  if (rate * dt < 1e-12) return unit;",
        "  var delta = quaternionFromAxisAngle({ x: omega.x / rate, y: omega.y / rate, z: omega.z / rate }, rate * dt);",
        "  return quaternionMultiply(unit, delta);",
        "}"
      ),
      comparator: "quaternion", walkthroughChapter: "se3",
      dependencies: ["quaternion-multiply", "quaternion-from-axis-angle"],
      reference: docref("imu_filter_madgwick (gyro integration step)", "https://docs.ros.org/en/rolling/p/imu_filter_madgwick/"),
      scene: { kind: "se3", view: "gyro", handles: [
        { id: "wx", type: "slider", label: "ωx (rad/s)", value: 0.4, min: -2, max: 2 },
        { id: "wy", type: "slider", label: "ωy (rad/s)", value: 0.2, min: -2, max: 2 },
        { id: "wz", type: "slider", label: "ωz (rad/s)", value: 1.2, min: -2, max: 2 },
      ], args: [{ fixture: "identityQuat" }, { fixture: "omegaFromSliders" }, 0.8] },
      diagnoses: [
        diagnosis("world-frame-rates", "The increment was applied on the left, as if the rates were world-frame: gyro rates are body-frame, so q ⊗ Δq.", lines(
          "function integrateGyro(q, omega, dt) {",
          "  var rate = Math.sqrt(omega.x * omega.x + omega.y * omega.y + omega.z * omega.z);",
          "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  var unit = { x: q.x / n, y: q.y / n, z: q.z / n, w: q.w / n };",
          "  if (rate * dt < 1e-12) return unit;",
          "  var delta = quaternionFromAxisAngle({ x: omega.x / rate, y: omega.y / rate, z: omega.z / rate }, rate * dt);",
          "  return quaternionMultiply(delta, unit);",
          "}"
        )),
        diagnosis("rate-not-scaled-by-dt", "The rotation angle is |ω|·dt, not |ω|.", lines(
          "function integrateGyro(q, omega, dt) {",
          "  var rate = Math.sqrt(omega.x * omega.x + omega.y * omega.y + omega.z * omega.z);",
          "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  var unit = { x: q.x / n, y: q.y / n, z: q.z / n, w: q.w / n };",
          "  if (rate < 1e-12) return unit;",
          "  var delta = quaternionFromAxisAngle({ x: omega.x / rate, y: omega.y / rate, z: omega.z / rate }, rate);",
          "  return quaternionMultiply(unit, delta);",
          "}"
        )),
      ],
      hints: ["The angle turned in dt is |ω|·dt about the axis ω/|ω|.", "Build that as a quaternion with quaternionFromAxisAngle.", "Body-frame rates go on the right: quaternionMultiply(q, Δq)."],
      cases: [
        example([IDENTITY_Q, { x: 0, y: 0, z: PI / 2 }, 1], Z90, "yaw rate for one second"),
        example([Z90, { x: 0, y: 0, z: PI / 2 }, 1], { x: 0, y: 0, z: 1, w: 0 }, "accumulates"),
        example([IDENTITY_Q, { x: PI, y: 0, z: 0 }, 0.5], X90, "half a second"),
        example([Z90, { x: PI / 2, y: 0, z: 0 }, 1], { x: 0.5, y: 0.5, z: 0.5, w: 0.5 }, "body roll after a yaw"),
        example([Y90, { x: 0, y: 0, z: 0 }, 1], Y90, "no rotation"),
      ],
    }),
    puzzle({
      number: 86, id: "twist-in-sensor-frame", track: "estimation", title: "Twist at a Mounted Sensor",
      goal: "Express the robot's body twist at a rigidly mounted sensor frame, lever arm included.",
      concept: "A turning robot drags its sensors sideways: v_sensor = v + ω × r, then rotate into the sensor axes.",
      functionName: "twistInSensorFrame", signature: "twistInSensorFrame(twist, baseFromSensor) → twist",
      starterSource: starter("twistInSensorFrame", "twist, baseFromSensor", "r = sensor offset; v' = (vx − ω·ry, vy + ω·rx) rotated by −yaw; ω unchanged."),
      referenceSource: lines(
        "function twistInSensorFrame(twist, baseFromSensor) {",
        "  var vx = twist.vx - twist.wz * baseFromSensor.y;",
        "  var vy = twist.vy + twist.wz * baseFromSensor.x;",
        "  var local = rotateVector({ x: vx, y: vy }, -baseFromSensor.yaw);",
        "  return { vx: local.x, vy: local.y, wz: twist.wz };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "data-types",
      dependencies: ["rotate-vector"],
      reference: docref("tf2_geometry_msgs (why twists are not transformed like vectors)", "https://docs.ros.org/en/rolling/p/tf2_geometry_msgs/"),
      scene: { kind: "estimation", view: "sensor-twist", handles: [
        { id: "sensor", type: "frame", label: "sensor in base_link", value: { x: 1.2, y: 0.4, yaw: 0.6 } },
        { id: "vx", type: "slider", label: "vx (m/s)", value: 0.8, min: -1, max: 1 },
        { id: "wz", type: "slider", label: "ωz (rad/s)", value: 0.7, min: -2, max: 2 },
      ], args: [{ fixture: "twistFromSliders" }, { handle: "sensor" }] },
      diagnoses: [
        diagnosis("lever-arm-ignored", "Only rotated the velocity: a sensor off the rotation axis also moves with ω × r.", lines(
          "function twistInSensorFrame(twist, baseFromSensor) {",
          "  var local = rotateVector({ x: twist.vx, y: twist.vy }, -baseFromSensor.yaw);",
          "  return { vx: local.x, vy: local.y, wz: twist.wz };",
          "}"
        )),
        diagnosis("rotation-ignored", "The lever arm was added but the result stayed in base_link axes; rotate by −yaw into the sensor frame.", lines(
          "function twistInSensorFrame(twist, baseFromSensor) {",
          "  return { vx: twist.vx - twist.wz * baseFromSensor.y, vy: twist.vy + twist.wz * baseFromSensor.x, wz: twist.wz };",
          "}"
        )),
      ],
      hints: ["The sensor's velocity in base axes is v + ω × r with r its offset.", "In 2D, ω × r = (−ω·ry, ω·rx).", "Rotate that vector by −yaw to express it in the sensor's own axes; ω stays the same."],
      cases: [
        example([{ vx: 0, vy: 0, wz: 1 }, { x: 1, y: 0, yaw: 0 }], { vx: 0, vy: 1, wz: 1 }, "sensor ahead, pure spin"),
        example([{ vx: 0, vy: 0, wz: 1 }, { x: 0, y: 1, yaw: 0 }], { vx: -1, vy: 0, wz: 1 }, "sensor to the left, pure spin"),
        example([{ vx: 1, vy: 0, wz: 0 }, { x: 0, y: 0, yaw: PI / 2 }], { vx: 0, vy: -1, wz: 0 }, "rotated sensor, straight motion"),
        example([{ vx: 1, vy: 0, wz: 0.5 }, { x: 2, y: 0, yaw: 0 }], { vx: 1, vy: 1, wz: 0.5 }, "arc with a forward sensor"),
      ],
    }),
  ];

  const ESTIMATION_20 = [
    puzzle({
      number: 87, id: "covariance-propagate-motion", track: "estimation", title: "Propagate Covariance Through Motion",
      goal: "Compute F P Fᵀ + Q for the odometry motion model.",
      concept: "Yaw uncertainty turns into sideways position uncertainty as the robot drives; the Jacobian encodes exactly that.",
      functionName: "predictCovariance", signature: "predictCovariance(P, pose, v, dt, Q) → 3×3",
      starterSource: starter("predictCovariance", "P, pose, v, dt, Q", "F = [[1, 0, −v·dt·sin yaw], [0, 1, v·dt·cos yaw], [0, 0, 1]] at the current pose."),
      referenceSource: lines(
        "function predictCovariance(P, pose, v, dt, Q) {",
        "  var f = [[1, 0, -v * dt * Math.sin(pose.yaw)], [0, 1, v * dt * Math.cos(pose.yaw)], [0, 0, 1]];",
        "  var ft = [[f[0][0], f[1][0], f[2][0]], [f[0][1], f[1][1], f[2][1]], [f[0][2], f[1][2], f[2][2]]];",
        "  var propagated = matMul3(matMul3(f, P), ft);",
        "  return propagated.map(function (row, i) { return row.map(function (value, j) { return value + Q[i][j]; }); });",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["mat-mul-3"],
      reference: pyref(EKF_PY, "jacob_f / PPred"),
      reading: bookref("11-Extended-Kalman-Filters", "linearizing the motion model"),
      scene: { kind: "estimation", view: "predict-cov", handles: [
        { id: "pose", type: "pose", label: "pose", value: { x: -1, y: 0, yaw: 0.4 } },
        { id: "v", type: "slider", label: "v (m/s)", value: 1, min: 0, max: 2 },
        { id: "dt", type: "slider", label: "dt (s)", value: 1, min: 0.1, max: 2 },
      ], args: [{ fixture: "priorP" }, { handle: "pose" }, { handle: "v" }, { handle: "dt" }, { fixture: "smallQ" }] },
      diagnoses: [
        diagnosis("no-transpose", "The right-hand factor must be Fᵀ, not F.", lines(
          "function predictCovariance(P, pose, v, dt, Q) {",
          "  var f = [[1, 0, -v * dt * Math.sin(pose.yaw)], [0, 1, v * dt * Math.cos(pose.yaw)], [0, 0, 1]];",
          "  var propagated = matMul3(matMul3(f, P), f);",
          "  return propagated.map(function (row, i) { return row.map(function (value, j) { return value + Q[i][j]; }); });",
          "}"
        )),
        diagnosis("jacobian-identity", "P + Q ignores the motion: the Jacobian couples yaw uncertainty into position.", "function predictCovariance(P, pose, v, dt, Q) { return P.map(function (row, i) { return row.map(function (value, j) { return value + Q[i][j]; }); }); }"),
      ],
      hints: ["Differentiate integrateMotion with respect to (x, y, yaw).", "Only the yaw column is non-trivial: (−v·dt·sin yaw, v·dt·cos yaw, 1).", "Return matMul3(matMul3(F, P), Fᵀ) plus Q element-wise."],
      cases: [
        example([I3, { x: 0, y: 0, yaw: 0 }, 1, 1, ZERO3], P_AFTER_STRAIGHT, "one metre forward"),
        example([I3, { x: 0, y: 0, yaw: PI / 2 }, 1, 1, ZERO3], [[2, 0, -1], [0, 1, 0], [-1, 0, 1]], "facing +y"),
        example([ZERO3, { x: 1, y: 2, yaw: 0.3 }, 2, 0.5, diag3(0.1, 0.2, 0.3)], diag3(0.1, 0.2, 0.3), "only process noise"),
        example([I3, { x: 0, y: 0, yaw: 0 }, 0, 1, ZERO3], I3, "standing still"),
      ],
    }),
    puzzle({
      number: 88, id: "compose-uncertain", track: "estimation", title: "Compound Two Uncertain Transforms",
      goal: "Compose two transforms and their covariances to first order.",
      concept: "Uncertainty in the parent's yaw sweeps the child's position sideways; the two Jacobians capture that.",
      functionName: "composeUncertain", signature: "composeUncertain(a, b) → { transform, covariance }",
      starterSource: starter("composeUncertain", "a, b", "a and b are { transform, covariance }; covariance = J_A Σ_A J_Aᵀ + J_B Σ_B J_Bᵀ."),
      referenceSource: lines(
        "function composeUncertain(a, b) {",
        "  var ta = a.transform, tb = b.transform;",
        "  var c = Math.cos(ta.yaw), s = Math.sin(ta.yaw);",
        "  var ja = [[1, 0, -(s * tb.x + c * tb.y)], [0, 1, c * tb.x - s * tb.y], [0, 0, 1]];",
        "  var jb = [[c, -s, 0], [s, c, 0], [0, 0, 1]];",
        "  function transpose(m) { return [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]]; }",
        "  var fromA = matMul3(matMul3(ja, a.covariance), transpose(ja));",
        "  var fromB = matMul3(matMul3(jb, b.covariance), transpose(jb));",
        "  var covariance = fromA.map(function (row, i) { return row.map(function (value, j) { return value + fromB[i][j]; }); });",
        "  return { transform: compose(ta, tb), covariance: covariance };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "composition",
      dependencies: ["compose", "mat-mul-3"],
      reference: docref("Smith, Self & Cheeseman (1990), Estimating Uncertain Spatial Relationships in Robotics", "https://doi.org/10.1007/978-1-4613-8997-2_14"),
      reading: bookref("05-Multivariate-Gaussians", "correlation and covariance"),
      scene: { kind: "estimation", view: "compose-uncertain", handles: [{ id: "b", type: "frame", label: "b in a", value: { x: 1.5, y: 0.5, yaw: 0.6 } }], args: [{ fixture: "uncertainA" }, { fixture: "uncertainB" }] },
      diagnoses: [
        diagnosis("sum-only", "Covariances were added without Jacobians: the child's covariance must be rotated by the parent's yaw, and the parent's yaw uncertainty must sweep the child's offset.", lines(
          "function composeUncertain(a, b) {",
          "  var covariance = a.covariance.map(function (row, i) { return row.map(function (value, j) { return value + b.covariance[i][j]; }); });",
          "  return { transform: compose(a.transform, b.transform), covariance: covariance };",
          "}"
        )),
        diagnosis("no-yaw-lever", "J_A was taken as the identity: the parent's yaw uncertainty must sweep the child's offset (the third column of J_A).", lines(
          "function composeUncertain(a, b) {",
          "  var ta = a.transform, tb = b.transform;",
          "  var c = Math.cos(ta.yaw), s = Math.sin(ta.yaw);",
          "  var jb = [[c, -s, 0], [s, c, 0], [0, 0, 1]];",
          "  var jbt = [[c, s, 0], [-s, c, 0], [0, 0, 1]];",
          "  var fromB = matMul3(matMul3(jb, b.covariance), jbt);",
          "  var covariance = a.covariance.map(function (row, i) { return row.map(function (value, j) { return value + fromB[i][j]; }); });",
          "  return { transform: compose(ta, tb), covariance: covariance };",
          "}"
        )),
      ],
      hints: ["The transform part is just compose(a, b).", "J_A = [[1, 0, −(sinθ·xb + cosθ·yb)], [0, 1, cosθ·xb − sinθ·yb], [0, 0, 1]] with θ the parent yaw; J_B rotates by θ.", "Σ = J_A Σ_A J_Aᵀ + J_B Σ_B J_Bᵀ using matMul3."],
      cases: [
        example([{ transform: { x: 0, y: 0, yaw: 0 }, covariance: ZERO3 }, { transform: { x: 1, y: 0, yaw: 0 }, covariance: diag3(1, 2, 3) }], { transform: { x: 1, y: 0, yaw: 0 }, covariance: diag3(1, 2, 3) }, "certain parent"),
        example([{ transform: { x: 0, y: 0, yaw: PI / 2 }, covariance: ZERO3 }, { transform: { x: 1, y: 0, yaw: 0 }, covariance: diag3(1, 0, 0) }], { transform: { x: 0, y: 1, yaw: PI / 2 }, covariance: diag3(0, 1, 0) }, "rotated parent turns x noise into y noise"),
        example([{ transform: { x: 0, y: 0, yaw: 0 }, covariance: diag3(0, 0, 1) }, { transform: { x: 1, y: 0, yaw: 0 }, covariance: ZERO3 }], { transform: { x: 1, y: 0, yaw: 0 }, covariance: [[0, 0, 0], [0, 1, 1], [0, 1, 1]] }, "yaw noise sweeps the child sideways"),
        example([{ transform: { x: 2, y: 1, yaw: 0 }, covariance: diag3(0.5, 0.5, 0) }, { transform: { x: 0, y: 0, yaw: 0 }, covariance: diag3(0, 0, 0.2) }], { transform: { x: 2, y: 1, yaw: 0 }, covariance: diag3(0.5, 0.5, 0.2) }, "independent parts add"),
      ],
    }),
    puzzle({
      number: 89, id: "mahalanobis-distance", track: "estimation", title: "Mahalanobis Distance",
      goal: "Measure an innovation against its covariance: d² = yᵀ S⁻¹ y.",
      concept: "Data association gates on this, not on metres: a 1 m miss is nothing along a loose axis and huge along a tight one.",
      functionName: "mahalanobisDistance", signature: "mahalanobisDistance(innovation, covariance) → number",
      starterSource: starter("mahalanobisDistance", "innovation, covariance", "Invert the 2×2 covariance: [[d, −b], [−c, a]] / (ad − bc)."),
      referenceSource: lines(
        "function mahalanobisDistance(innovation, covariance) {",
        "  var a = covariance[0][0], b = covariance[0][1], c = covariance[1][0], d = covariance[1][1];",
        "  var det = a * d - b * c;",
        "  var ix = (d * innovation.x - b * innovation.y) / det;",
        "  var iy = (-c * innovation.x + a * innovation.y) / det;",
        "  return innovation.x * ix + innovation.y * iy;",
        "}"
      ),
      comparator: "scalar", walkthroughChapter: "sensor-scenario",
      reference: pyref("SLAM/EKFSLAM/ekf_slam.py", "search_correspond_landmark_id"),
      scene: { kind: "estimation", view: "mahalanobis", handles: [{ id: "point", type: "point", label: "innovation", value: { x: 1.2, y: 0.5 } }], args: [{ handle: "point" }, { fixture: "gateCovariance" }] },
      diagnoses: [
        diagnosis("no-inverse", "That is yᵀ S y: the covariance must be inverted.", "function mahalanobisDistance(innovation, covariance) { var x = innovation.x, y = innovation.y; return x * (covariance[0][0] * x + covariance[0][1] * y) + y * (covariance[1][0] * x + covariance[1][1] * y); }"),
        diagnosis("euclidean", "Plain squared length ignores the covariance entirely.", "function mahalanobisDistance(innovation, covariance) { return innovation.x * innovation.x + innovation.y * innovation.y; }"),
      ],
      hints: ["Invert the 2×2 covariance in closed form.", "Multiply the inverse by the innovation, then dot with the innovation again.", "For S = I this is the squared Euclidean distance."],
      cases: [
        example([{ x: 3, y: 4 }, I2], 25, "identity covariance"),
        example([{ x: 2, y: 1 }, [[4, 0], [0, 1]]], 2, "loose x axis"),
        example([{ x: 1, y: 1 }, [[2, 1], [1, 2]]], 2 / 3, "correlated"),
        example([{ x: 0, y: 0 }, [[3, 0.5], [0.5, 1]]], 0, "zero innovation"),
      ],
    }),
    puzzle({
      number: 90, id: "covariance-ellipse", track: "estimation", title: "Covariance to Ellipse",
      goal: "Turn a 2×2 covariance into the orientation and semi-axes of its uncertainty ellipse.",
      concept: "Eigenvectors are the ellipse axes; eigenvalues are variances, so the axes are their square roots times the sigma count.",
      functionName: "covarianceEllipse", signature: "covarianceEllipse(cov, sigmas) → { angle, major, minor }",
      starterSource: starter("covarianceEllipse", "cov, sigmas", "angle = ½·atan2(2b, a − d); eigenvalues = mean ± spread."),
      referenceSource: lines(
        "function covarianceEllipse(cov, sigmas) {",
        "  var a = cov[0][0], b = (cov[0][1] + cov[1][0]) / 2, d = cov[1][1];",
        "  var mean = (a + d) / 2;",
        "  var spread = Math.sqrt(Math.max(0, ((a - d) / 2) * ((a - d) / 2) + b * b));",
        "  return { angle: 0.5 * Math.atan2(2 * b, a - d), major: sigmas * Math.sqrt(Math.max(0, mean + spread)), minor: sigmas * Math.sqrt(Math.max(0, mean - spread)) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      reference: pyref("utils/plot.py", "plot_covariance_ellipse"),
      reading: bookref("05-Multivariate-Gaussians", "plot_covariance_ellipse"),
      scene: { kind: "estimation", view: "ellipse", handles: [
        { id: "angle", type: "slider", label: "angle", value: 0.5, min: -PI / 2, max: PI / 2 },
        { id: "major", type: "slider", label: "major σ", value: 1.2, min: 0.2, max: 2 },
        { id: "minor", type: "slider", label: "minor σ", value: 0.5, min: 0.1, max: 2 },
      ], args: [{ fixture: "ellipseCovariance" }, 1] },
      diagnoses: [
        diagnosis("variance-not-stddev", "The eigenvalues are variances; the semi-axes need their square roots.", lines(
          "function covarianceEllipse(cov, sigmas) {",
          "  var a = cov[0][0], b = (cov[0][1] + cov[1][0]) / 2, d = cov[1][1];",
          "  var mean = (a + d) / 2;",
          "  var spread = Math.sqrt(Math.max(0, ((a - d) / 2) * ((a - d) / 2) + b * b));",
          "  return { angle: 0.5 * Math.atan2(2 * b, a - d), major: sigmas * (mean + spread), minor: sigmas * (mean - spread) };",
          "}"
        )),
        diagnosis("angle-not-halved", "The orientation is half of atan2(2b, a − d).", lines(
          "function covarianceEllipse(cov, sigmas) {",
          "  var a = cov[0][0], b = (cov[0][1] + cov[1][0]) / 2, d = cov[1][1];",
          "  var mean = (a + d) / 2;",
          "  var spread = Math.sqrt(Math.max(0, ((a - d) / 2) * ((a - d) / 2) + b * b));",
          "  return { angle: Math.atan2(2 * b, a - d), major: sigmas * Math.sqrt(Math.max(0, mean + spread)), minor: sigmas * Math.sqrt(Math.max(0, mean - spread)) };",
          "}"
        )),
      ],
      hints: ["For a symmetric 2×2, eigenvalues are mean ± sqrt(((a − d)/2)² + b²).", "The major axis angle is ½·atan2(2b, a − d).", "Semi-axes = sigmas × sqrt(eigenvalue)."],
      cases: [
        example([[[4, 0], [0, 1]], 1], { angle: 0, major: 2, minor: 1 }, "axis-aligned"),
        example([[[1, 0], [0, 4]], 1], { angle: PI / 2, major: 2, minor: 1 }, "tall"),
        example([[[2, 1], [1, 2]], 1], { angle: PI / 4, major: Math.sqrt(3), minor: 1 }, "correlated"),
        example([I2, 2], { angle: 0, major: 2, minor: 2 }, "circle at 2σ"),
      ],
    }),
  ];

  const ESTIMATION_21 = [
    puzzle({
      number: 91, id: "ekf-predict", track: "estimation", title: "EKF Predict",
      goal: "Advance the state with the motion model and the covariance with its Jacobian.",
      concept: "Prediction is integrateMotion for the mean and predictCovariance for the spread, evaluated at the previous state.",
      functionName: "ekfPredict", signature: "ekfPredict(state, P, u, dt, Q) → { state, P }",
      starterSource: starter("ekfPredict", "state, P, u, dt, Q", "u = { v, omega }."),
      referenceSource: "function ekfPredict(state, P, u, dt, Q) { return { state: integrateMotion(state, u.v, u.omega, dt), P: predictCovariance(P, state, u.v, dt, Q) }; }",
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["integrate-motion", "covariance-propagate-motion"],
      reference: pyref(EKF_PY, "ekf_estimation (predict)"),
      reading: bookref("11-Extended-Kalman-Filters", "predict"),
      scene: { kind: "estimation", view: "ekf-predict", handles: [
        { id: "pose", type: "pose", label: "state", value: { x: -1.5, y: -0.5, yaw: 0.3 } },
        { id: "v", type: "slider", label: "v (m/s)", value: 1, min: 0, max: 2 },
        { id: "omega", type: "slider", label: "ω (rad/s)", value: 0.5, min: -2, max: 2 },
      ], args: [{ handle: "pose" }, { fixture: "priorP" }, { fixture: "control" }, 1, { fixture: "smallQ" }] },
      diagnoses: [
        diagnosis("jacobian-at-new-state", "The Jacobian was evaluated at the predicted state; linearize at the state you start from.", "function ekfPredict(state, P, u, dt, Q) { var next = integrateMotion(state, u.v, u.omega, dt); return { state: next, P: predictCovariance(P, next, u.v, dt, Q) }; }"),
        diagnosis("covariance-unchanged", "The covariance must grow with motion.", "function ekfPredict(state, P, u, dt, Q) { return { state: integrateMotion(state, u.v, u.omega, dt), P: P }; }"),
      ],
      hints: ["Mean: integrateMotion(state, u.v, u.omega, dt).", "Covariance: predictCovariance(P, state, u.v, dt, Q) with the old state.", "Return both in one object."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, I3, { v: 1, omega: 0 }, 1, ZERO3], { state: { x: 1, y: 0, yaw: 0 }, P: P_AFTER_STRAIGHT }, "straight"),
        example([{ x: 0, y: 0, yaw: 0 }, I3, { v: 1, omega: PI / 2 }, 1, ZERO3], { state: { x: 1, y: 0, yaw: PI / 2 }, P: P_AFTER_STRAIGHT }, "turning"),
        example([{ x: 1, y: 1, yaw: PI / 2 }, ZERO3, { v: 2, omega: 0 }, 0.5, diag3(0.1, 0.1, 0.1)], { state: { x: 1, y: 2, yaw: PI / 2 }, P: diag3(0.1, 0.1, 0.1) }, "only process noise"),
      ],
    }),
    puzzle({
      number: 92, id: "ekf-update-position", track: "estimation", title: "EKF Update with a Position Fix",
      goal: "Fuse a position measurement: innovation, gain, corrected state, shrunk covariance.",
      concept: "K = P Hᵀ (H P Hᵀ + R)⁻¹ decides how much to trust the fix; yaw gets corrected through its correlation with position.",
      functionName: "ekfUpdatePosition", signature: "ekfUpdatePosition(state, P, z, R) → { state, P }",
      starterSource: starter("ekfUpdatePosition", "state, P, z, R", "H picks x and y. S = P[0..1][0..1] + R; K = P Hᵀ S⁻¹; x += K·y; P = (I − K H) P."),
      referenceSource: lines(
        "function ekfUpdatePosition(state, P, z, R) {",
        "  var yx = z.x - state.x, yy = z.y - state.y;",
        "  var s00 = P[0][0] + R[0][0], s01 = P[0][1] + R[0][1], s10 = P[1][0] + R[1][0], s11 = P[1][1] + R[1][1];",
        "  var det = s00 * s11 - s01 * s10;",
        "  var i00 = s11 / det, i01 = -s01 / det, i10 = -s10 / det, i11 = s00 / det;",
        "  var k = [];",
        "  for (var r = 0; r < 3; r += 1) k.push([P[r][0] * i00 + P[r][1] * i10, P[r][0] * i01 + P[r][1] * i11]);",
        "  var next = { x: state.x + k[0][0] * yx + k[0][1] * yy, y: state.y + k[1][0] * yx + k[1][1] * yy, yaw: state.yaw + k[2][0] * yx + k[2][1] * yy };",
        "  var updated = [];",
        "  for (var i = 0; i < 3; i += 1) {",
        "    updated.push([]);",
        "    for (var j = 0; j < 3; j += 1) {",
        "      var kh0 = (i === 0 ? 1 : 0) - k[i][0], kh1 = (i === 1 ? 1 : 0) - k[i][1], kh2 = (i === 2 ? 1 : 0);",
        "      updated[i].push(kh0 * P[0][j] + kh1 * P[1][j] + kh2 * P[2][j]);",
        "    }",
        "  }",
        "  return { state: next, P: updated };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      reference: pyref(EKF_PY, "ekf_estimation (update)"),
      reading: bookref("11-Extended-Kalman-Filters", "update"),
      scene: { kind: "estimation", view: "ekf-update", handles: [
        { id: "state", type: "pose", label: "prior state", value: { x: 0, y: 0, yaw: 0.2 } },
        { id: "z", type: "point", label: "position fix z", value: { x: 1.2, y: 0.6 } },
      ], args: [{ handle: "state" }, { fixture: "updateP" }, { handle: "z" }, { fixture: "updateR" }] },
      diagnoses: [
        diagnosis("full-gain", "The state jumped all the way to the measurement: the Kalman gain weighs P against R.", lines(
          "function ekfUpdatePosition(state, P, z, R) {",
          "  var k = [[1, 0], [0, 1], [0, 0]];",
          "  var next = { x: z.x, y: z.y, yaw: state.yaw };",
          "  var updated = [];",
          "  for (var i = 0; i < 3; i += 1) {",
          "    updated.push([]);",
          "    for (var j = 0; j < 3; j += 1) {",
          "      var kh0 = (i === 0 ? 1 : 0) - k[i][0], kh1 = (i === 1 ? 1 : 0) - k[i][1], kh2 = (i === 2 ? 1 : 0);",
          "      updated[i].push(kh0 * P[0][j] + kh1 * P[1][j] + kh2 * P[2][j]);",
          "    }",
          "  }",
          "  return { state: next, P: updated };",
          "}"
        )),
        diagnosis("covariance-unchanged", "After a measurement the covariance must shrink: P = (I − K H) P.", lines(
          "function ekfUpdatePosition(state, P, z, R) {",
          "  var yx = z.x - state.x, yy = z.y - state.y;",
          "  var s00 = P[0][0] + R[0][0], s01 = P[0][1] + R[0][1], s10 = P[1][0] + R[1][0], s11 = P[1][1] + R[1][1];",
          "  var det = s00 * s11 - s01 * s10;",
          "  var i00 = s11 / det, i01 = -s01 / det, i10 = -s10 / det, i11 = s00 / det;",
          "  var k = [];",
          "  for (var r = 0; r < 3; r += 1) k.push([P[r][0] * i00 + P[r][1] * i10, P[r][0] * i01 + P[r][1] * i11]);",
          "  return { state: { x: state.x + k[0][0] * yx + k[0][1] * yy, y: state.y + k[1][0] * yx + k[1][1] * yy, yaw: state.yaw + k[2][0] * yx + k[2][1] * yy }, P: P };",
          "}"
        )),
      ],
      hints: ["Innovation y = z − (x, y).", "S is the position block of P plus R; K = P Hᵀ S⁻¹ is 3×2 (rows x, y, yaw).", "state += K·y; P = (I − K H) P, where K H has K's columns in positions x and y."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, I3, { x: 2, y: 2 }, I2], { state: { x: 1, y: 1, yaw: 0 }, P: diag3(0.5, 0.5, 1) }, "equal trust"),
        example([{ x: 0, y: 0, yaw: 0 }, I3, { x: 2, y: 2 }, ZERO2], { state: { x: 2, y: 2, yaw: 0 }, P: diag3(0, 0, 1) }, "perfect measurement"),
        example([{ x: 0, y: 0, yaw: 0 }, [[1, 0, 0.5], [0, 1, 0], [0.5, 0, 1]], { x: 2, y: 0 }, I2], { state: { x: 1, y: 0, yaw: 0.5 }, P: [[0.5, 0, 0.25], [0, 0.5, 0], [0.25, 0, 0.875]] }, "yaw corrected through correlation"),
        example([{ x: 1, y: 1, yaw: 0.3 }, I3, { x: 1, y: 1 }, I2], { state: { x: 1, y: 1, yaw: 0.3 }, P: diag3(0.5, 0.5, 1) }, "measurement agrees"),
      ],
    }),
    puzzle({
      number: 93, id: "particle-weights", track: "estimation", title: "Weight Particles by a Measurement",
      goal: "Give each particle the normalized Gaussian likelihood of the measurement.",
      concept: "A particle filter never inverts anything; it just scores hypotheses and renormalizes.",
      functionName: "particleWeights", signature: "particleWeights(particles, z, sigma) → weights",
      starterSource: starter("particleWeights", "particles, z, sigma", "w_i ∝ exp(−|p_i − z|² / (2σ²)); normalize to sum 1."),
      referenceSource: lines(
        "function particleWeights(particles, z, sigma) {",
        "  var raw = particles.map(function (p) { var dx = p.x - z.x, dy = p.y - z.y; return Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma)); });",
        "  var total = raw.reduce(function (sum, w) { return sum + w; }, 0);",
        "  if (total === 0) return raw.map(function () { return 1 / raw.length; });",
        "  return raw.map(function (w) { return w / total; });",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: pyref(PF_PY, "gauss_likelihood"),
      reading: bookref("12-Particle-Filters", "update"),
      scene: { kind: "estimation", view: "particles", handles: [
        { id: "z", type: "point", label: "measurement z", value: { x: 0.5, y: 0.3 } },
        { id: "sigma", type: "slider", label: "σ", value: 0.8, min: 0.2, max: 2 },
      ], args: [{ fixture: "particles" }, { handle: "z" }, { handle: "sigma" }] },
      diagnoses: [
        diagnosis("unnormalized", "Raw likelihoods must be divided by their sum so the weights form a distribution.", "function particleWeights(particles, z, sigma) { return particles.map(function (p) { var dx = p.x - z.x, dy = p.y - z.y; return Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma)); }); }"),
        diagnosis("no-square", "The Gaussian uses the squared distance, not the distance.", lines(
          "function particleWeights(particles, z, sigma) {",
          "  var raw = particles.map(function (p) { var dx = p.x - z.x, dy = p.y - z.y; return Math.exp(-Math.sqrt(dx * dx + dy * dy) / (2 * sigma * sigma)); });",
          "  var total = raw.reduce(function (sum, w) { return sum + w; }, 0);",
          "  return raw.map(function (w) { return w / total; });",
          "}"
        )),
      ],
      hints: ["Squared distance from each particle to z.", "exp(−d² / (2σ²)) is the unnormalized weight.", "Divide by the sum of all weights."],
      cases: [
        example([[{ x: 0, y: 0 }, { x: 2, y: 0 }], { x: 1, y: 0 }, 1], [0.5, 0.5], "equidistant"),
        example([[{ x: 0, y: 0 }, { x: 3, y: 0 }], { x: 0, y: 0 }, 1], [1 / (1 + Math.exp(-4.5)), Math.exp(-4.5) / (1 + Math.exp(-4.5))], "one particle on the fix"),
        example([[{ x: 5, y: 5 }], { x: 0, y: 0 }, 1], [1], "single particle"),
        example([[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], { x: 0, y: 0 }, 1], [1 / (1 + 2 * Math.exp(-0.5)), Math.exp(-0.5) / (1 + 2 * Math.exp(-0.5)), Math.exp(-0.5) / (1 + 2 * Math.exp(-0.5))], "three particles"),
      ],
    }),
    puzzle({
      number: 94, id: "resample-particles", track: "estimation", title: "Low-Variance Resampling",
      goal: "Draw a new particle set with one systematic sweep through the cumulative weights.",
      concept: "One random offset plus equally spaced pointers keeps the good particles without the noise of independent draws.",
      functionName: "resampleLowVariance", signature: "resampleLowVariance(particles, weights, u0) → particles",
      starterSource: starter("resampleLowVariance", "particles, weights, u0", "u0 ∈ [0, 1/N); pointer m at u0 + m/N; advance the cumulative index while it is below the pointer."),
      referenceSource: lines(
        "function resampleLowVariance(particles, weights, u0) {",
        "  var count = weights.length, out = [], index = 0;",
        "  var total = weights.reduce(function (sum, w) { return sum + w; }, 0);",
        "  var running = weights[0] / total;",
        "  for (var m = 0; m < count; m += 1) {",
        "    var u = u0 + m / count;",
        "    while (running < u && index < count - 1) { index += 1; running += weights[index] / total; }",
        "    out.push({ x: particles[index].x, y: particles[index].y });",
        "  }",
        "  return out;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: pyref(PF_PY, "re_sampling"),
      reading: bookref("12-Particle-Filters", "systematic_resample"),
      scene: { kind: "estimation", view: "resample", handles: [{ id: "u0", type: "slider", label: "u0 (start offset)", value: 0.05, min: 0, max: 0.16 }], args: [{ fixture: "resampleParticles" }, { fixture: "resampleWeights" }, { handle: "u0" }] },
      diagnoses: [
        diagnosis("max-weight-only", "Copying only the heaviest particle collapses the filter; sweep the cumulative weights instead.", lines(
          "function resampleLowVariance(particles, weights, u0) {",
          "  var best = 0;",
          "  for (var i = 1; i < weights.length; i += 1) { if (weights[i] > weights[best]) best = i; }",
          "  return weights.map(function () { return { x: particles[best].x, y: particles[best].y }; });",
          "}"
        )),
        diagnosis("no-cumulative", "Each pointer was compared with a single weight instead of the running cumulative sum.", lines(
          "function resampleLowVariance(particles, weights, u0) {",
          "  var count = weights.length, out = [], index = 0;",
          "  var total = weights.reduce(function (sum, w) { return sum + w; }, 0);",
          "  for (var m = 0; m < count; m += 1) {",
          "    var u = u0 + m / count;",
          "    while (weights[index] / total < u && index < count - 1) index += 1;",
          "    out.push({ x: particles[index].x, y: particles[index].y });",
          "  }",
          "  return out;",
          "}"
        )),
      ],
      hints: ["Normalize the weights and keep a running cumulative sum.", "Pointer m sits at u0 + m/N.", "Advance the index while the cumulative sum is below the pointer, then copy that particle."],
      cases: [
        example([P3, [1, 0, 0], 0.1], [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }], "one heavy particle"),
        example([P3, [1 / 3, 1 / 3, 1 / 3], 0.1], P3, "uniform weights keep the set"),
        example([P3, [0.5, 0.5, 0], 0.2], [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0 }], "two survivors"),
        example([[{ x: 0, y: 0 }, { x: 1, y: 0 }], [0.2, 0.8], 0.3], [{ x: 1, y: 0 }, { x: 1, y: 0 }], "heavy second particle"),
      ],
    }),
    puzzle({
      number: 95, id: "ekf-localize-step", track: "estimation", title: "One EKF Localization Step",
      goal: "Predict with odometry, then update with a position fix.",
      concept: "This is the loop every localizer runs: motion grows uncertainty, measurements shrink it.",
      functionName: "ekfLocalizeStep", signature: "ekfLocalizeStep(state, P, u, z, dt, Q, R) → { state, P }",
      starterSource: starter("ekfLocalizeStep", "state, P, u, z, dt, Q, R"),
      referenceSource: lines(
        "function ekfLocalizeStep(state, P, u, z, dt, Q, R) {",
        "  var predicted = ekfPredict(state, P, u, dt, Q);",
        "  return ekfUpdatePosition(predicted.state, predicted.P, z, R);",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["ekf-predict", "ekf-update-position"],
      reference: pyref(EKF_PY, "ekf_estimation"),
      reading: bookref("11-Extended-Kalman-Filters", "robot localization"),
      scene: { kind: "estimation", view: "ekf-step", handles: [
        { id: "state", type: "pose", label: "state before", value: { x: -1.5, y: -0.5, yaw: 0.3 } },
        { id: "z", type: "point", label: "position fix z", value: { x: -0.4, y: 0.3 } },
        { id: "v", type: "slider", label: "v (m/s)", value: 1, min: 0, max: 2 },
        { id: "omega", type: "slider", label: "ω (rad/s)", value: 0.5, min: -2, max: 2 },
      ], args: [{ handle: "state" }, { fixture: "priorP" }, { fixture: "control" }, { handle: "z" }, 1, { fixture: "smallQ" }, { fixture: "updateR" }] },
      diagnoses: [
        diagnosis("update-before-predict", "The measurement belongs to the time after the motion: predict first, then update.", lines(
          "function ekfLocalizeStep(state, P, u, z, dt, Q, R) {",
          "  var updated = ekfUpdatePosition(state, P, z, R);",
          "  return ekfPredict(updated.state, updated.P, u, dt, Q);",
          "}"
        )),
        diagnosis("no-update", "The fix was ignored: apply ekfUpdatePosition after predicting.", "function ekfLocalizeStep(state, P, u, z, dt, Q, R) { return ekfPredict(state, P, u, dt, Q); }"),
      ],
      hints: ["Two calls, in order.", "predicted = ekfPredict(state, P, u, dt, Q).", "return ekfUpdatePosition(predicted.state, predicted.P, z, R)."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, I3, { v: 1, omega: 0 }, { x: 1, y: 0 }, 1, ZERO3, I2], { state: { x: 1, y: 0, yaw: 0 }, P: [[0.5, 0, 0], [0, 2 / 3, 1 / 3], [0, 1 / 3, 2 / 3]] }, "fix agrees"),
        example([{ x: 0, y: 0, yaw: 0 }, I3, { v: 1, omega: 0 }, { x: 1, y: 1 }, 1, ZERO3, I2], { state: { x: 1, y: 2 / 3, yaw: 1 / 3 }, P: [[0.5, 0, 0], [0, 2 / 3, 1 / 3], [0, 1 / 3, 2 / 3]] }, "fix pulls sideways and corrects yaw"),
        example([{ x: 0, y: 0, yaw: 0 }, I3, { v: 1, omega: 0 }, { x: 1, y: 1 }, 1, ZERO3, ZERO2], { state: { x: 1, y: 1, yaw: 0.5 }, P: [[0, 0, 0], [0, 0, 0], [0, 0, 0.5]] }, "perfect fix"),
      ],
    }),
  ];

  const CH01 = "01-g-h-filter", CH02 = "02-Discrete-Bayes", CH04 = "04-One-Dimensional-Kalman-Filters", CH05 = "05-Multivariate-Gaussians";
  const CH06 = "06-Multivariate-Kalman-Filters", CH07 = "07-Kalman-Filter-Math", CH09 = "09-Nonlinear-Filtering", CH10 = "10-Unscented-Kalman-Filter", CH13 = "13-Smoothing";
  const M2_I = [[1, 0], [0, 1]];
  const M2_ZERO = [[0, 0], [0, 0]];
  const F_UNIT = [[1, 1], [0, 1]];
  const P_STRAIGHT_2 = [[2, 1], [1, 1]];
  const SQ3 = Math.sqrt(3);
  const SIGMA_W = [1 / 3, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
  const POLAR_P = [[1 / 3, 0], [0, PI * PI / 27]];

  const BAYES_22 = [
    puzzle({
      number: 96, id: "gh-filter-step", track: "bayes", title: "One g-h Filter Step",
      goal: "Predict with the current rate, then blend the residual into the estimate (g) and the rate (h).",
      concept: "Every filter in this track is this loop: predict, measure the residual, trust it a fraction. g and h are that fraction.",
      functionName: "ghFilterStep", signature: "ghFilterStep(x, dx, z, g, h, dt) → { x, dx }",
      starterSource: starter("ghFilterStep", "x, dx, z, g, h, dt", "prediction = x + dx·dt; residual = z − prediction; x = prediction + g·residual; dx += h·residual/dt."),
      referenceSource: lines(
        "function ghFilterStep(x, dx, z, g, h, dt) {",
        "  var prediction = x + dx * dt;",
        "  var residual = z - prediction;",
        "  return { x: prediction + g * residual, dx: dx + h * residual / dt };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: bookref(CH01, "g_h_filter"),
      scene: { kind: "bayes", view: "gh", handles: [
        { id: "z", type: "slider", label: "measurement z", value: 0.5, min: -4, max: 4 },
        { id: "g", type: "slider", label: "g (position gain)", value: 0.6, min: 0, max: 1 },
        { id: "h", type: "slider", label: "h (rate gain)", value: 0.2, min: 0, max: 1 },
      ], args: [{ fixture: "ghPrior" }, { fixture: "ghVelocity" }, { handle: "z" }, { handle: "g" }, { handle: "h" }, 1] },
      diagnoses: [
        diagnosis("residual-from-prior", "The residual was measured against the old x; compare z with the prediction x + dx·dt.", lines(
          "function ghFilterStep(x, dx, z, g, h, dt) {",
          "  var prediction = x + dx * dt;",
          "  var residual = z - x;",
          "  return { x: prediction + g * residual, dx: dx + h * residual / dt };",
          "}"
        )),
        diagnosis("h-not-over-dt", "The rate correction is h·residual/dt: a residual in metres becomes a rate only after dividing by the step.", lines(
          "function ghFilterStep(x, dx, z, g, h, dt) {",
          "  var prediction = x + dx * dt;",
          "  var residual = z - prediction;",
          "  return { x: prediction + g * residual, dx: dx + h * residual };",
          "}"
        )),
      ],
      hints: ["First move the estimate forward by dx·dt.", "The residual is z minus that prediction.", "x = prediction + g·residual; dx = dx + h·residual/dt."],
      cases: [
        example([160, 1, 158, 0.6, 0.1, 1], { x: 159.2, dx: 0.7 }, "the book's weight example"),
        example([0, 2, 3, 0.5, 0.5, 2], { x: 3.5, dx: 1.75 }, "two-second step"),
        example([10, 0, 12, 1, 0, 1], { x: 12, dx: 0 }, "g = 1 trusts the measurement"),
        example([5, 1, 6, 0, 0.2, 1], { x: 6, dx: 1 }, "no residual"),
      ],
    }),
    puzzle({
      number: 97, id: "discrete-predict", track: "bayes", title: "Discrete Bayes Predict",
      goal: "Move a belief along the hallway by offset cells, spreading it with an under/correct/over kernel and wrapping around.",
      concept: "Prediction is a convolution: motion is uncertain, so every cell's probability smears into its neighbours.",
      functionName: "discretePredict", signature: "discretePredict(belief, offset, kernel) → belief",
      starterSource: starter("discretePredict", "belief, offset, kernel", "out[i] = Σk belief[(i + 1 − k − offset) mod N] · kernel[k] for a 3-wide kernel [under, correct, over]."),
      referenceSource: lines(
        "function discretePredict(belief, offset, kernel) {",
        "  var n = belief.length, width = Math.floor(kernel.length / 2), out = [];",
        "  for (var i = 0; i < n; i += 1) {",
        "    var total = 0;",
        "    for (var k = 0; k < kernel.length; k += 1) {",
        "      var index = (((i + width - k - offset) % n) + n) % n;",
        "      total += belief[index] * kernel[k];",
        "    }",
        "    out.push(total);",
        "  }",
        "  return out;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: bookref(CH02, "predict_move_convolution"),
      scene: { kind: "bayes", view: "hallway-predict", handles: [
        { id: "offset", type: "slider", label: "move (cells, rounded)", value: 2, min: 0, max: 4 },
        { id: "pCorrect", type: "slider", label: "P(exact move)", value: 0.8, min: 0.4, max: 1 },
      ], args: [{ fixture: "hallBelief" }, { fixture: "hallOffset" }, { fixture: "hallKernel" }] },
      diagnoses: [
        diagnosis("no-wrap", "Cells past the end were dropped: the hallway is circular, so indexes must wrap with a modulo.", lines(
          "function discretePredict(belief, offset, kernel) {",
          "  var n = belief.length, width = Math.floor(kernel.length / 2), out = [];",
          "  for (var i = 0; i < n; i += 1) {",
          "    var total = 0;",
          "    for (var k = 0; k < kernel.length; k += 1) {",
          "      var index = i + width - k - offset;",
          "      if (index >= 0 && index < n) total += belief[index] * kernel[k];",
          "    }",
          "    out.push(total);",
          "  }",
          "  return out;",
          "}"
        )),
        diagnosis("kernel-mirrored", "The kernel was applied backwards: kernel[0] is the chance of moving one cell short, kernel[2] one cell too far.", lines(
          "function discretePredict(belief, offset, kernel) {",
          "  var n = belief.length, width = Math.floor(kernel.length / 2), out = [];",
          "  for (var i = 0; i < n; i += 1) {",
          "    var total = 0;",
          "    for (var k = 0; k < kernel.length; k += 1) {",
          "      var index = (((i - width + k - offset) % n) + n) % n;",
          "      total += belief[index] * kernel[k];",
          "    }",
          "    out.push(total);",
          "  }",
          "  return out;",
          "}"
        )),
      ],
      hints: ["For each output cell, sum over the kernel entries.", "The source cell for kernel[k] is i + width − k − offset, wrapped into [0, N).", "JavaScript's % can be negative: use ((v % n) + n) % n."],
      cases: [
        example([[1, 0, 0, 0, 0], 1, [0.1, 0.8, 0.1]], [0.1, 0.8, 0.1, 0, 0], "one cell, one step"),
        example([[1, 0, 0, 0, 0], 1, [0.3, 0.6, 0.1]], [0.3, 0.6, 0.1, 0, 0], "asymmetric kernel"),
        example([[0, 0, 0, 0, 1], 1, [0.1, 0.8, 0.1]], [0.8, 0.1, 0, 0, 0.1], "wraps around the end"),
        example([[0, 1, 0, 0], -1, [0.2, 0.6, 0.2]], [0.6, 0.2, 0, 0.2], "moving backwards"),
        example([[0.2, 0.2, 0.2, 0.2, 0.2], 3, [0, 1, 0]], [0.2, 0.2, 0.2, 0.2, 0.2], "uniform stays uniform"),
      ],
    }),
    puzzle({
      number: 98, id: "discrete-update", track: "bayes", title: "Discrete Bayes Update",
      goal: "Multiply the belief by the measurement likelihood and normalize.",
      concept: "Bayes' rule in one line: posterior ∝ likelihood × prior. The division by the sum is what makes it a probability again.",
      functionName: "discreteUpdate", signature: "discreteUpdate(belief, likelihood) → belief",
      starterSource: starter("discreteUpdate", "belief, likelihood", "Multiply element-wise, then divide by the total."),
      referenceSource: lines(
        "function discreteUpdate(belief, likelihood) {",
        "  var raw = belief.map(function (b, i) { return b * likelihood[i]; });",
        "  var total = raw.reduce(function (sum, value) { return sum + value; }, 0);",
        "  return raw.map(function (value) { return value / total; });",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: bookref(CH02, "update"),
      scene: { kind: "bayes", view: "hallway-update", handles: [{ id: "trust", type: "slider", label: "door likelihood scale", value: 3, min: 1, max: 6 }], args: [{ fixture: "hallBelief" }, { fixture: "doorLikelihood" }] },
      diagnoses: [
        diagnosis("unnormalized", "The product must be divided by its sum so the belief still totals one.", "function discreteUpdate(belief, likelihood) { return belief.map(function (b, i) { return b * likelihood[i]; }); }"),
        diagnosis("sum-not-product", "Likelihood and prior multiply; adding them lets an impossible cell keep probability.", lines(
          "function discreteUpdate(belief, likelihood) {",
          "  var raw = belief.map(function (b, i) { return b + likelihood[i]; });",
          "  var total = raw.reduce(function (sum, value) { return sum + value; }, 0);",
          "  return raw.map(function (value) { return value / total; });",
          "}"
        )),
      ],
      hints: ["Multiply belief[i] by likelihood[i].", "Add the products up.", "Divide each product by that total."],
      cases: [
        example([[0.25, 0.25, 0.25, 0.25], [3, 1, 1, 1]], [0.5, 1 / 6, 1 / 6, 1 / 6], "one likely cell"),
        example([[0.5, 0.5], [0, 1]], [0, 1], "an impossible cell"),
        example([[0.1, 0.9], [1, 1]], [0.1, 0.9], "uninformative measurement"),
        example([[0.2, 0.3, 0.5], [2, 2, 1]], [4 / 15, 0.4, 1 / 3], "mixed"),
      ],
    }),
    puzzle({
      number: 99, id: "gaussian-multiply", track: "bayes", title: "Multiply Two Gaussians",
      goal: "Fuse two Gaussian beliefs into one: variance-weighted mean, smaller variance.",
      concept: "The product of two Gaussians is a Gaussian, which is why a Kalman update is one formula and not an integral.",
      functionName: "gaussianMultiply", signature: "gaussianMultiply(a, b) → { mean, variance }",
      starterSource: starter("gaussianMultiply", "a, b", "mean = (σa²·μb + σb²·μa) / (σa² + σb²); variance = σa²σb² / (σa² + σb²)."),
      referenceSource: lines(
        "function gaussianMultiply(a, b) {",
        "  var total = a.variance + b.variance;",
        "  return { mean: (a.variance * b.mean + b.variance * a.mean) / total, variance: (a.variance * b.variance) / total };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: bookref(CH04, "gaussian_multiply"),
      scene: { kind: "bayes", view: "gaussians", handles: [
        { id: "meanA", type: "slider", label: "mean a", value: -1.5, min: -4, max: 4 },
        { id: "varianceA", type: "slider", label: "variance a", value: 1, min: 0.2, max: 3 },
        { id: "meanB", type: "slider", label: "mean b", value: 1.5, min: -4, max: 4 },
      ], args: [{ fixture: "gaussA" }, { fixture: "gaussB" }] },
      diagnoses: [
        diagnosis("mean-average", "A plain average ignores which belief is tighter: weight each mean by the other's variance.", "function gaussianMultiply(a, b) { var total = a.variance + b.variance; return { mean: (a.mean + b.mean) / 2, variance: (a.variance * b.variance) / total }; }"),
        diagnosis("variance-sum", "Two measurements agree more than either alone: the product's variance is smaller than both, not their sum.", "function gaussianMultiply(a, b) { var total = a.variance + b.variance; return { mean: (a.variance * b.mean + b.variance * a.mean) / total, variance: total }; }"),
      ],
      hints: ["The tighter Gaussian pulls the mean towards itself.", "mean = (σa²·μb + σb²·μa) / (σa² + σb²).", "variance = σa²·σb² / (σa² + σb²), always below both inputs."],
      cases: [
        example([{ mean: 10, variance: 1 }, { mean: 12, variance: 1 }], { mean: 11, variance: 0.5 }, "equal trust"),
        example([{ mean: 0, variance: 4 }, { mean: 2, variance: 1 }], { mean: 1.6, variance: 0.8 }, "tighter b wins"),
        example([{ mean: 3, variance: 9 }, { mean: 3, variance: 1 }], { mean: 3, variance: 0.9 }, "same mean"),
        example([{ mean: -1, variance: 2 }, { mean: 3, variance: 2 }], { mean: 1, variance: 1 }, "symmetric"),
      ],
    }),
    puzzle({
      number: 100, id: "kalman-1d-step", track: "bayes", title: "One-Dimensional Kalman Step",
      goal: "Predict by adding the movement Gaussian, then update by multiplying with the measurement Gaussian.",
      concept: "This is the whole Kalman filter in one dimension. The gain form K = P/(P + R) is the same product written differently.",
      functionName: "kalman1dStep", signature: "kalman1dStep(prior, movement, z, measurementVariance) → { mean, variance }",
      starterSource: starter("kalman1dStep", "prior, movement, z, measurementVariance", "predicted = { prior.mean + movement.mean, prior.variance + movement.variance }; then gaussianMultiply with { z, measurementVariance }."),
      referenceSource: lines(
        "function kalman1dStep(prior, movement, z, measurementVariance) {",
        "  var predicted = { mean: prior.mean + movement.mean, variance: prior.variance + movement.variance };",
        "  return gaussianMultiply(predicted, { mean: z, variance: measurementVariance });",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      dependencies: ["gaussian-multiply"],
      reference: bookref(CH04, "predict / update"),
      scene: { kind: "bayes", view: "kalman-1d", handles: [
        { id: "move", type: "slider", label: "movement mean", value: 2, min: -2, max: 4 },
        { id: "z", type: "slider", label: "measurement z", value: 1, min: -4, max: 4 },
        { id: "R", type: "slider", label: "measurement variance", value: 1, min: 0.2, max: 3 },
      ], args: [{ fixture: "prior1d" }, { fixture: "movement1d" }, { handle: "z" }, { handle: "R" }] },
      diagnoses: [
        diagnosis("update-before-predict", "The measurement was fused before the move; the measurement describes where the robot is after moving.", lines(
          "function kalman1dStep(prior, movement, z, measurementVariance) {",
          "  var updated = gaussianMultiply(prior, { mean: z, variance: measurementVariance });",
          "  return { mean: updated.mean + movement.mean, variance: updated.variance + movement.variance };",
          "}"
        )),
        diagnosis("movement-noise-dropped", "Moving adds uncertainty: the predicted variance is prior plus movement variance.", lines(
          "function kalman1dStep(prior, movement, z, measurementVariance) {",
          "  var predicted = { mean: prior.mean + movement.mean, variance: prior.variance };",
          "  return gaussianMultiply(predicted, { mean: z, variance: measurementVariance });",
          "}"
        )),
      ],
      hints: ["Predict: add the means and add the variances.", "Update: multiply the predicted Gaussian with the measurement Gaussian.", "gaussianMultiply(predicted, { mean: z, variance: measurementVariance })."],
      cases: [
        example([{ mean: 0, variance: 1 }, { mean: 1, variance: 0 }, 2, 1], { mean: 1.5, variance: 0.5 }, "move one, measure two"),
        example([{ mean: 0, variance: 1 }, { mean: 1, variance: 1 }, 2, 2], { mean: 1.5, variance: 1 }, "noisy move and measurement"),
        example([{ mean: 5, variance: 0.5 }, { mean: 0, variance: 0 }, 5, 0.5], { mean: 5, variance: 0.25 }, "standing still"),
        example([{ mean: 0, variance: 1 }, { mean: 2, variance: 0.5 }, 1, 3], { mean: 5 / 3, variance: 1 }, "loose measurement"),
      ],
    }),
  ];

  const BAYES_23 = [
    puzzle({
      number: 101, id: "mat-mul-2", track: "bayes", title: "Multiply 2×2 Matrices",
      goal: "The 2×2 product brick every multivariate filter step reuses.",
      concept: "Column j of A·B is A applied to column j of B: the product transforms the second matrix's columns.",
      functionName: "matMul2", signature: "matMul2(a, b) → 2×2",
      starterSource: starter("matMul2", "a, b", "result[i][j] = a[i][0]·b[0][j] + a[i][1]·b[1][j]."),
      referenceSource: lines(
        "function matMul2(a, b) {",
        "  return [",
        "    [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],",
        "    [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]],",
        "  ];",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "matrix-stack",
      reference: bookref(CH05, "multivariate Gaussians"),
      scene: { kind: "bayes", view: "matrix2", handles: [
        { id: "col1", type: "vector", label: "B column 1", value: { x: 1, y: 0.3 } },
        { id: "col2", type: "vector", label: "B column 2", value: { x: -0.4, y: 1 } },
      ], args: [{ fixture: "shearA" }, { fixture: "matrixFromColumns" }] },
      diagnoses: [
        diagnosis("elementwise", "That multiplies matching entries; a matrix product sums row-times-column.", "function matMul2(a, b) { return [[a[0][0] * b[0][0], a[0][1] * b[0][1]], [a[1][0] * b[1][0], a[1][1] * b[1][1]]]; }"),
        diagnosis("transposed", "The factors were swapped: matrix products do not commute, so A·B ≠ B·A.", lines(
          "function matMul2(a, b) {",
          "  return [",
          "    [b[0][0] * a[0][0] + b[0][1] * a[1][0], b[0][0] * a[0][1] + b[0][1] * a[1][1]],",
          "    [b[1][0] * a[0][0] + b[1][1] * a[1][0], b[1][0] * a[0][1] + b[1][1] * a[1][1]],",
          "  ];",
          "}"
        )),
      ],
      hints: ["Entry (i, j) is row i of a dotted with column j of b.", "Four entries, two terms each.", "Return [[r00, r01], [r10, r11]]."],
      cases: [
        example([M2_I, [[1, 2], [3, 4]]], [[1, 2], [3, 4]], "identity"),
        example([[[1, 2], [3, 4]], [[0, 1], [1, 0]]], [[2, 1], [4, 3]], "swap columns"),
        example([[[0, 1], [1, 0]], [[1, 2], [3, 4]]], [[3, 4], [1, 2]], "swap rows"),
        example([F_UNIT, F_UNIT], [[1, 2], [0, 1]], "two constant-velocity steps"),
      ],
    }),
    puzzle({
      number: 102, id: "mat-inv-2", track: "bayes", title: "Invert a 2×2 Matrix",
      goal: "The closed-form inverse: swap the diagonal, negate the off-diagonal, divide by the determinant.",
      concept: "Kalman gains divide by the innovation covariance; in two dimensions that division is this brick.",
      functionName: "matInv2", signature: "matInv2(m) → 2×2",
      starterSource: starter("matInv2", "m", "[[d, −b], [−c, a]] / (ad − bc)."),
      referenceSource: lines(
        "function matInv2(m) {",
        "  var det = m[0][0] * m[1][1] - m[0][1] * m[1][0];",
        "  return [[m[1][1] / det, -m[0][1] / det], [-m[1][0] / det, m[0][0] / det]];",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "matrix-stack",
      reference: bookref(CH07, "Kalman filter math"),
      scene: { kind: "bayes", view: "matrix2", handles: [
        { id: "col1", type: "vector", label: "M column 1", value: { x: 1.2, y: 0.4 } },
        { id: "col2", type: "vector", label: "M column 2", value: { x: -0.5, y: 1 } },
      ], args: [{ fixture: "matrixFromColumns" }] },
      diagnoses: [
        diagnosis("no-determinant", "That is the adjugate; divide every entry by the determinant ad − bc.", "function matInv2(m) { return [[m[1][1], -m[0][1]], [-m[1][0], m[0][0]]]; }"),
        diagnosis("diagonal-not-swapped", "The diagonal entries trade places in the inverse: a and d swap.", "function matInv2(m) { var det = m[0][0] * m[1][1] - m[0][1] * m[1][0]; return [[m[0][0] / det, -m[0][1] / det], [-m[1][0] / det, m[1][1] / det]]; }"),
      ],
      hints: ["det = ad − bc.", "Swap a and d, negate b and c.", "Divide all four by det."],
      cases: [
        example([[[2, 0], [0, 4]]], [[0.5, 0], [0, 0.25]], "diagonal"),
        example([[[1, 2], [3, 4]]], [[-2, 1], [1.5, -0.5]], "negative determinant"),
        example([[[0, 1], [-1, 0]]], [[0, -1], [1, 0]], "rotation by 90°"),
        example([M2_I], M2_I, "identity"),
      ],
    }),
    puzzle({
      number: 103, id: "constant-velocity-model", track: "bayes", title: "Constant-Velocity Model",
      goal: "Build the state transition F and the discrete white-noise Q for a [position, velocity] state.",
      concept: "F says how the state moves on its own; Q says how much you distrust that story per step.",
      functionName: "constantVelocityModel", signature: "constantVelocityModel(dt, processVariance) → { F, Q }",
      starterSource: starter("constantVelocityModel", "dt, processVariance", "F = [[1, dt], [0, 1]]; Q = var · [[dt⁴/4, dt³/2], [dt³/2, dt²]]."),
      referenceSource: lines(
        "function constantVelocityModel(dt, processVariance) {",
        "  var dt2 = dt * dt, dt3 = dt2 * dt, dt4 = dt3 * dt;",
        "  return { F: [[1, dt], [0, 1]], Q: [[processVariance * dt4 / 4, processVariance * dt3 / 2], [processVariance * dt3 / 2, processVariance * dt2]] };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      reference: bookref(CH06, "Q_discrete_white_noise"),
      scene: { kind: "bayes", view: "cv-model", handles: [
        { id: "dt", type: "slider", label: "dt (s)", value: 1, min: 0.2, max: 1.5 },
        { id: "variance", type: "slider", label: "process variance", value: 0.4, min: 0.1, max: 1 },
      ], args: [{ handle: "dt" }, { handle: "variance" }] },
      diagnoses: [
        diagnosis("f-without-dt", "Position advances by velocity times dt, so F's top-right entry is dt.", lines(
          "function constantVelocityModel(dt, processVariance) {",
          "  var dt2 = dt * dt, dt3 = dt2 * dt, dt4 = dt3 * dt;",
          "  return { F: [[1, 1], [0, 1]], Q: [[processVariance * dt4 / 4, processVariance * dt3 / 2], [processVariance * dt3 / 2, processVariance * dt2]] };",
          "}"
        )),
        diagnosis("q-diagonal-only", "Process noise on the velocity also moves the position, so Q has off-diagonal terms dt³/2.", lines(
          "function constantVelocityModel(dt, processVariance) {",
          "  var dt2 = dt * dt, dt4 = dt2 * dt2;",
          "  return { F: [[1, dt], [0, 1]], Q: [[processVariance * dt4 / 4, 0], [0, processVariance * dt2]] };",
          "}"
        )),
      ],
      hints: ["F: position += velocity·dt, velocity unchanged.", "Q comes from integrating white acceleration noise over dt.", "Q = var·[[dt⁴/4, dt³/2], [dt³/2, dt²]]."],
      cases: [
        example([1, 1], { F: F_UNIT, Q: [[0.25, 0.5], [0.5, 1]] }, "unit step"),
        example([2, 1], { F: [[1, 2], [0, 1]], Q: [[4, 4], [4, 4]] }, "two seconds"),
        example([0.5, 2], { F: [[1, 0.5], [0, 1]], Q: [[0.03125, 0.125], [0.125, 0.5]] }, "half second, more noise"),
        example([1, 0], { F: F_UNIT, Q: M2_ZERO }, "no process noise"),
      ],
    }),
    puzzle({
      number: 104, id: "kf-predict", track: "bayes", title: "Kalman Predict (2 States)",
      goal: "x = F x and P = F P Fᵀ + Q for the position-velocity tracker.",
      concept: "Prediction moves the mean with the model and stretches the covariance the same way, then adds process noise.",
      functionName: "kfPredict", signature: "kfPredict(x, P, F, Q) → { x, P }",
      starterSource: starter("kfPredict", "x, P, F, Q", "x is [position, velocity]."),
      referenceSource: lines(
        "function kfPredict(x, P, F, Q) {",
        "  var ft = [[F[0][0], F[1][0]], [F[0][1], F[1][1]]];",
        "  var spread = matMul2(matMul2(F, P), ft);",
        "  return {",
        "    x: [F[0][0] * x[0] + F[0][1] * x[1], F[1][0] * x[0] + F[1][1] * x[1]],",
        "    P: [[spread[0][0] + Q[0][0], spread[0][1] + Q[0][1]], [spread[1][0] + Q[1][0], spread[1][1] + Q[1][1]]],",
        "  };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["mat-mul-2"],
      reference: bookref(CH06, "predict"),
      scene: { kind: "bayes", view: "kf-predict", handles: [
        { id: "state", type: "point", label: "state (position, velocity)", value: { x: -2, y: 1 } },
        { id: "dt", type: "slider", label: "dt (s)", value: 1, min: 0.2, max: 2 },
      ], args: [{ fixture: "stateVec" }, { fixture: "kfP0" }, { fixture: "cvF" }, { fixture: "cvQ" }] },
      diagnoses: [
        diagnosis("no-transpose", "The right-hand factor must be Fᵀ.", lines(
          "function kfPredict(x, P, F, Q) {",
          "  var spread = matMul2(matMul2(F, P), F);",
          "  return {",
          "    x: [F[0][0] * x[0] + F[0][1] * x[1], F[1][0] * x[0] + F[1][1] * x[1]],",
          "    P: [[spread[0][0] + Q[0][0], spread[0][1] + Q[0][1]], [spread[1][0] + Q[1][0], spread[1][1] + Q[1][1]]],",
          "  };",
          "}"
        )),
        diagnosis("state-unchanged", "The mean must move too: x = F x.", lines(
          "function kfPredict(x, P, F, Q) {",
          "  var ft = [[F[0][0], F[1][0]], [F[0][1], F[1][1]]];",
          "  var spread = matMul2(matMul2(F, P), ft);",
          "  return { x: [x[0], x[1]], P: [[spread[0][0] + Q[0][0], spread[0][1] + Q[0][1]], [spread[1][0] + Q[1][0], spread[1][1] + Q[1][1]]] };",
          "}"
        )),
      ],
      hints: ["New x is F applied to the state vector.", "New P is matMul2(matMul2(F, P), Fᵀ).", "Add Q element-wise."],
      cases: [
        example([[0, 1], M2_I, F_UNIT, M2_ZERO], { x: [1, 1], P: P_STRAIGHT_2 }, "unit step"),
        example([[2, -1], [[4, 0], [0, 1]], [[1, 2], [0, 1]], M2_I], { x: [0, -1], P: [[9, 2], [2, 2]] }, "two seconds with noise"),
        example([[1, 0], M2_ZERO, M2_I, [[0.1, 0], [0, 0.2]]], { x: [1, 0], P: [[0.1, 0], [0, 0.2]] }, "only process noise"),
        example([[0, 0], M2_I, M2_I, M2_ZERO], { x: [0, 0], P: M2_I }, "identity model"),
      ],
    }),
    puzzle({
      number: 105, id: "kf-update", track: "bayes", title: "Kalman Update (Scalar Measurement)",
      goal: "Fuse one scalar measurement z = H x: innovation, S, gain, corrected x, shrunk P.",
      concept: "H picks what the sensor sees. Velocity is never measured here, yet it gets corrected through P's off-diagonal.",
      functionName: "kfUpdate", signature: "kfUpdate(x, P, z, H, R) → { x, P }",
      starterSource: starter("kfUpdate", "x, P, z, H, R", "H is 1×2, R a number. y = z − H x; S = H P Hᵀ + R; K = P Hᵀ / S; x += K y; P = (I − K H) P."),
      referenceSource: lines(
        "function kfUpdate(x, P, z, H, R) {",
        "  var h0 = H[0][0], h1 = H[0][1];",
        "  var y = z - (h0 * x[0] + h1 * x[1]);",
        "  var pht = [P[0][0] * h0 + P[0][1] * h1, P[1][0] * h0 + P[1][1] * h1];",
        "  var s = h0 * pht[0] + h1 * pht[1] + R;",
        "  var k = [pht[0] / s, pht[1] / s];",
        "  var ikh = [[1 - k[0] * h0, -k[0] * h1], [-k[1] * h0, 1 - k[1] * h1]];",
        "  return { x: [x[0] + k[0] * y, x[1] + k[1] * y], P: matMul2(ikh, P) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["mat-mul-2"],
      reference: bookref(CH06, "update"),
      scene: { kind: "bayes", view: "kf-update", handles: [
        { id: "state", type: "point", label: "prior (position, velocity)", value: { x: -1, y: 0.8 } },
        { id: "z", type: "slider", label: "position measurement z", value: 1, min: -4, max: 4 },
        { id: "R", type: "slider", label: "measurement variance R", value: 0.5, min: 0.1, max: 3 },
      ], args: [{ fixture: "stateVec" }, { fixture: "kfPUpdate" }, { handle: "z" }, { fixture: "hPosition" }, { handle: "R" }] },
      diagnoses: [
        diagnosis("full-gain", "The gain must divide by S = H P Hᵀ + R; without it the state jumps onto the measurement.", lines(
          "function kfUpdate(x, P, z, H, R) {",
          "  var h0 = H[0][0], h1 = H[0][1];",
          "  var y = z - (h0 * x[0] + h1 * x[1]);",
          "  var k = [h0, h1];",
          "  var ikh = [[1 - k[0] * h0, -k[0] * h1], [-k[1] * h0, 1 - k[1] * h1]];",
          "  return { x: [x[0] + k[0] * y, x[1] + k[1] * y], P: matMul2(ikh, P) };",
          "}"
        )),
        diagnosis("covariance-unchanged", "A measurement must shrink P: P = (I − K H) P.", lines(
          "function kfUpdate(x, P, z, H, R) {",
          "  var h0 = H[0][0], h1 = H[0][1];",
          "  var y = z - (h0 * x[0] + h1 * x[1]);",
          "  var pht = [P[0][0] * h0 + P[0][1] * h1, P[1][0] * h0 + P[1][1] * h1];",
          "  var s = h0 * pht[0] + h1 * pht[1] + R;",
          "  var k = [pht[0] / s, pht[1] / s];",
          "  return { x: [x[0] + k[0] * y, x[1] + k[1] * y], P: P };",
          "}"
        )),
      ],
      hints: ["P Hᵀ is a 2-vector; S = H (P Hᵀ) + R is a number.", "K = P Hᵀ / S; x += K·y.", "I − K H is 2×2 with K's entries in the column H selects; P = matMul2(I − K H, P)."],
      cases: [
        example([[0, 0], M2_I, 2, [[1, 0]], 1], { x: [1, 0], P: [[0.5, 0], [0, 1]] }, "equal trust"),
        example([[0, 0], P_STRAIGHT_2, 1, [[1, 0]], 0], { x: [1, 0.5], P: [[0, 0], [0, 0.5]] }, "perfect fix corrects velocity too"),
        example([[1, 1], M2_I, 1, [[1, 0]], 1], { x: [1, 1], P: [[0.5, 0], [0, 1]] }, "measurement agrees"),
        example([[0, 2], M2_I, 3, [[0, 1]], 1], { x: [0, 2.5], P: [[1, 0], [0, 0.5]] }, "measuring velocity instead"),
      ],
    }),
    puzzle({
      number: 106, id: "kalman-track-step", track: "bayes", title: "One Tracker Step",
      goal: "Build the model, predict, and update with a position measurement, in that order.",
      concept: "This is the book's dog tracker: constant velocity plus a noisy position sensor, one step at a time.",
      functionName: "kalmanTrackStep", signature: "kalmanTrackStep(x, P, z, dt, processVariance, R) → { x, P }",
      starterSource: starter("kalmanTrackStep", "x, P, z, dt, processVariance, R"),
      referenceSource: lines(
        "function kalmanTrackStep(x, P, z, dt, processVariance, R) {",
        "  var model = constantVelocityModel(dt, processVariance);",
        "  var predicted = kfPredict(x, P, model.F, model.Q);",
        "  return kfUpdate(predicted.x, predicted.P, z, [[1, 0]], R);",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["constant-velocity-model", "kf-predict", "kf-update"],
      reference: bookref(CH06, "pos_vel_filter"),
      scene: { kind: "bayes", view: "kf-track", handles: [
        { id: "state", type: "point", label: "state (position, velocity)", value: { x: -2.5, y: 1 } },
        { id: "z", type: "slider", label: "position measurement z", value: 0, min: -4, max: 4 },
        { id: "R", type: "slider", label: "measurement variance R", value: 0.5, min: 0.1, max: 3 },
      ], args: [{ fixture: "stateVec" }, { fixture: "kfP0" }, { handle: "z" }, 1, 0.1, { handle: "R" }] },
      diagnoses: [
        diagnosis("update-before-predict", "The measurement arrives after the motion: predict first, then update.", lines(
          "function kalmanTrackStep(x, P, z, dt, processVariance, R) {",
          "  var model = constantVelocityModel(dt, processVariance);",
          "  var updated = kfUpdate(x, P, z, [[1, 0]], R);",
          "  return kfPredict(updated.x, updated.P, model.F, model.Q);",
          "}"
        )),
        diagnosis("no-update", "The measurement was ignored; call kfUpdate after predicting.", lines(
          "function kalmanTrackStep(x, P, z, dt, processVariance, R) {",
          "  var model = constantVelocityModel(dt, processVariance);",
          "  return kfPredict(x, P, model.F, model.Q);",
          "}"
        )),
      ],
      hints: ["constantVelocityModel(dt, processVariance) gives F and Q.", "kfPredict, then kfUpdate with H = [[1, 0]].", "Return the update's result."],
      cases: [
        example([[0, 1], M2_I, 1, 1, 0, 1], { x: [1, 1], P: [[2 / 3, 1 / 3], [1 / 3, 2 / 3]] }, "measurement agrees"),
        example([[0, 1], M2_I, 2, 1, 0, 1], { x: [5 / 3, 4 / 3], P: [[2 / 3, 1 / 3], [1 / 3, 2 / 3]] }, "measurement ahead"),
        example([[0, 0], M2_I, 0, 1, 1, 0], { x: [0, 0], P: [[0, 0], [0, 1]] }, "perfect sensor, noisy model"),
      ],
    }),
  ];

  const BAYES_24 = [
    puzzle({
      number: 107, id: "sigma-points", track: "bayes", title: "Van der Merwe Sigma Points",
      goal: "Pick 2n + 1 points and weights that reproduce a 2D Gaussian's mean and covariance.",
      concept: "Instead of linearizing a function, the UKF pushes a few well-chosen points through it. These are the points.",
      functionName: "sigmaPoints", signature: "sigmaPoints(mean, P, alpha, beta, kappa) → { points, wm, wc }",
      starterSource: starter("sigmaPoints", "mean, P, alpha, beta, kappa", "n = 2; λ = α²(n + κ) − n; U = upper Cholesky of (n + λ)P; points: mean, mean ± rows of U."),
      referenceSource: lines(
        "function sigmaPoints(mean, P, alpha, beta, kappa) {",
        "  var n = 2, lambda = alpha * alpha * (n + kappa) - n, scale = n + lambda;",
        "  var a = scale * P[0][0], b = scale * P[0][1], d = scale * P[1][1];",
        "  var u00 = Math.sqrt(a), u01 = b / u00, u11 = Math.sqrt(d - u01 * u01);",
        "  var rows = [{ x: u00, y: u01 }, { x: 0, y: u11 }];",
        "  var points = [{ x: mean.x, y: mean.y }];",
        "  for (var i = 0; i < n; i += 1) points.push({ x: mean.x + rows[i].x, y: mean.y + rows[i].y });",
        "  for (var j = 0; j < n; j += 1) points.push({ x: mean.x - rows[j].x, y: mean.y - rows[j].y });",
        "  var wi = 1 / (2 * scale);",
        "  return { points: points, wm: [lambda / scale, wi, wi, wi, wi], wc: [lambda / scale + 1 - alpha * alpha + beta, wi, wi, wi, wi] };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: bookref(CH10, "MerweScaledSigmaPoints"),
      scene: { kind: "bayes", view: "sigma-points", handles: [
        { id: "mean", type: "point", label: "mean", value: { x: 0.5, y: -0.3 } },
        { id: "alpha", type: "slider", label: "α", value: 0.7, min: 0.3, max: 1 },
        { id: "kappa", type: "slider", label: "κ", value: 1, min: 0, max: 3 },
      ], args: [{ handle: "mean" }, { fixture: "utP" }, { handle: "alpha" }, 2, { handle: "kappa" }] },
      diagnoses: [
        diagnosis("no-lambda-scale", "The square root must be of (n + λ)·P, not P; the spread of the points depends on α and κ.", lines(
          "function sigmaPoints(mean, P, alpha, beta, kappa) {",
          "  var n = 2, lambda = alpha * alpha * (n + kappa) - n, scale = n + lambda;",
          "  var a = P[0][0], b = P[0][1], d = P[1][1];",
          "  var u00 = Math.sqrt(a), u01 = b / u00, u11 = Math.sqrt(d - u01 * u01);",
          "  var rows = [{ x: u00, y: u01 }, { x: 0, y: u11 }];",
          "  var points = [{ x: mean.x, y: mean.y }];",
          "  for (var i = 0; i < n; i += 1) points.push({ x: mean.x + rows[i].x, y: mean.y + rows[i].y });",
          "  for (var j = 0; j < n; j += 1) points.push({ x: mean.x - rows[j].x, y: mean.y - rows[j].y });",
          "  var wi = 1 / (2 * scale);",
          "  return { points: points, wm: [lambda / scale, wi, wi, wi, wi], wc: [lambda / scale + 1 - alpha * alpha + beta, wi, wi, wi, wi] };",
          "}"
        )),
        diagnosis("wc0-without-beta", "The covariance weight of the centre point is λ/(n+λ) + 1 − α² + β, not the mean weight.", lines(
          "function sigmaPoints(mean, P, alpha, beta, kappa) {",
          "  var n = 2, lambda = alpha * alpha * (n + kappa) - n, scale = n + lambda;",
          "  var a = scale * P[0][0], b = scale * P[0][1], d = scale * P[1][1];",
          "  var u00 = Math.sqrt(a), u01 = b / u00, u11 = Math.sqrt(d - u01 * u01);",
          "  var rows = [{ x: u00, y: u01 }, { x: 0, y: u11 }];",
          "  var points = [{ x: mean.x, y: mean.y }];",
          "  for (var i = 0; i < n; i += 1) points.push({ x: mean.x + rows[i].x, y: mean.y + rows[i].y });",
          "  for (var j = 0; j < n; j += 1) points.push({ x: mean.x - rows[j].x, y: mean.y - rows[j].y });",
          "  var wi = 1 / (2 * scale);",
          "  return { points: points, wm: [lambda / scale, wi, wi, wi, wi], wc: [lambda / scale, wi, wi, wi, wi] };",
          "}"
        )),
      ],
      hints: ["λ = α²(n + κ) − n with n = 2.", "Upper Cholesky of (n + λ)P: u00 = √a, u01 = b/u00, u11 = √(d − u01²); the two rows are (u00, u01) and (0, u11).", "Points: mean, mean + row₁, mean + row₂, mean − row₁, mean − row₂. Weights: wm₀ = λ/(n+λ), wc₀ = wm₀ + 1 − α² + β, others 1/(2(n+λ))."],
      cases: [
        example([{ x: 0, y: 0 }, M2_I, 1, 0, 1], { points: [{ x: 0, y: 0 }, { x: SQ3, y: 0 }, { x: 0, y: SQ3 }, { x: -SQ3, y: 0 }, { x: 0, y: -SQ3 }], wm: SIGMA_W, wc: SIGMA_W }, "unit covariance"),
        example([{ x: 1, y: 2 }, [[4, 0], [0, 1]], 1, 2, 1], { points: [{ x: 1, y: 2 }, { x: 1 + 2 * SQ3, y: 2 }, { x: 1, y: 2 + SQ3 }, { x: 1 - 2 * SQ3, y: 2 }, { x: 1, y: 2 - SQ3 }], wm: SIGMA_W, wc: [7 / 3, 1 / 6, 1 / 6, 1 / 6, 1 / 6] }, "β adds to wc₀"),
        example([{ x: 0, y: 0 }, [[1, 0.5], [0.5, 1]], 1, 0, 1], { points: [{ x: 0, y: 0 }, { x: SQ3, y: SQ3 / 2 }, { x: 0, y: 1.5 }, { x: -SQ3, y: -SQ3 / 2 }, { x: 0, y: -1.5 }], wm: SIGMA_W, wc: SIGMA_W }, "correlated"),
        example([{ x: 0, y: 0 }, M2_I, 0.5, 2, 1], { points: [{ x: 0, y: 0 }, { x: Math.sqrt(0.75), y: 0 }, { x: 0, y: Math.sqrt(0.75) }, { x: -Math.sqrt(0.75), y: 0 }, { x: 0, y: -Math.sqrt(0.75) }], wm: [-5 / 3, 2 / 3, 2 / 3, 2 / 3, 2 / 3], wc: [13 / 12, 2 / 3, 2 / 3, 2 / 3, 2 / 3] }, "small α pulls the points in"),
      ],
    }),
    puzzle({
      number: 108, id: "unscented-transform", track: "bayes", title: "Unscented Transform",
      goal: "Recover a mean and covariance from weighted points.",
      concept: "Weighted mean with wm, weighted scatter around that mean with wc. Push the points through any function first and this gives the transformed Gaussian.",
      functionName: "unscentedTransform", signature: "unscentedTransform(points, wm, wc) → { mean, P }",
      starterSource: starter("unscentedTransform", "points, wm, wc", "mean = Σ wm[i]·p[i]; P = Σ wc[i]·(p[i] − mean)(p[i] − mean)ᵀ."),
      referenceSource: lines(
        "function unscentedTransform(points, wm, wc) {",
        "  var mean = { x: 0, y: 0 };",
        "  for (var i = 0; i < points.length; i += 1) { mean.x += wm[i] * points[i].x; mean.y += wm[i] * points[i].y; }",
        "  var P = [[0, 0], [0, 0]];",
        "  for (var j = 0; j < points.length; j += 1) {",
        "    var dx = points[j].x - mean.x, dy = points[j].y - mean.y;",
        "    P[0][0] += wc[j] * dx * dx; P[0][1] += wc[j] * dx * dy; P[1][0] += wc[j] * dx * dy; P[1][1] += wc[j] * dy * dy;",
        "  }",
        "  return { mean: mean, P: P };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: bookref(CH10, "unscented_transform"),
      scene: { kind: "bayes", view: "unscented", handles: [{ id: "mean", type: "point", label: "mean of the sigma set", value: { x: 0.5, y: 0.2 } }], args: [{ fixture: "utPoints" }, { fixture: "utWm" }, { fixture: "utWc" }] },
      diagnoses: [
        diagnosis("wm-for-covariance", "The covariance uses the wc weights; wm is only for the mean.", lines(
          "function unscentedTransform(points, wm, wc) {",
          "  var mean = { x: 0, y: 0 };",
          "  for (var i = 0; i < points.length; i += 1) { mean.x += wm[i] * points[i].x; mean.y += wm[i] * points[i].y; }",
          "  var P = [[0, 0], [0, 0]];",
          "  for (var j = 0; j < points.length; j += 1) {",
          "    var dx = points[j].x - mean.x, dy = points[j].y - mean.y;",
          "    P[0][0] += wm[j] * dx * dx; P[0][1] += wm[j] * dx * dy; P[1][0] += wm[j] * dx * dy; P[1][1] += wm[j] * dy * dy;",
          "  }",
          "  return { mean: mean, P: P };",
          "}"
        )),
        diagnosis("covariance-around-first-point", "Deviations are taken from the weighted mean, not from the first point.", lines(
          "function unscentedTransform(points, wm, wc) {",
          "  var mean = { x: 0, y: 0 };",
          "  for (var i = 0; i < points.length; i += 1) { mean.x += wm[i] * points[i].x; mean.y += wm[i] * points[i].y; }",
          "  var P = [[0, 0], [0, 0]];",
          "  for (var j = 0; j < points.length; j += 1) {",
          "    var dx = points[j].x - points[0].x, dy = points[j].y - points[0].y;",
          "    P[0][0] += wc[j] * dx * dx; P[0][1] += wc[j] * dx * dy; P[1][0] += wc[j] * dx * dy; P[1][1] += wc[j] * dy * dy;",
          "  }",
          "  return { mean: mean, P: P };",
          "}"
        )),
      ],
      hints: ["Mean: sum wm[i] times each point.", "Then subtract that mean from every point.", "P accumulates wc[i]·(dx², dx·dy; dx·dy, dy²)."],
      cases: [
        example([[{ x: 0, y: 0 }, { x: SQ3, y: 0 }, { x: 0, y: SQ3 }, { x: -SQ3, y: 0 }, { x: 0, y: -SQ3 }], SIGMA_W, SIGMA_W], { mean: { x: 0, y: 0 }, P: M2_I }, "unit sigma set"),
        example([[{ x: 1, y: 2 }, { x: 1 + 2 * SQ3, y: 2 }, { x: 1, y: 2 + SQ3 }, { x: 1 - 2 * SQ3, y: 2 }, { x: 1, y: 2 - SQ3 }], SIGMA_W, [7 / 3, 1 / 6, 1 / 6, 1 / 6, 1 / 6]], { mean: { x: 1, y: 2 }, P: [[4, 0], [0, 1]] }, "stretched sigma set"),
        example([[{ x: 0, y: 0 }, { x: 2, y: 0 }], [0.5, 0.5], [0.5, 0.5]], { mean: { x: 1, y: 0 }, P: [[1, 0], [0, 0]] }, "two points"),
        example([[{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], [0.25, 0.5, 0.25], [0.5, 0.5, 0.5]], { mean: { x: 1, y: 1 }, P: [[1, 1], [1, 1]] }, "different weights for mean and covariance"),
      ],
    }),
    puzzle({
      number: 109, id: "unscented-polar", track: "bayes", title: "Unscented Transform of a Radar Return",
      goal: "Push a (range, bearing) Gaussian through polar → cartesian using sigma points.",
      concept: "Linearizing at the mean gives a straight ellipse; the true distribution is banana-shaped, and the sigma points feel that curvature.",
      functionName: "unscentedPolarToCartesian", signature: "unscentedPolarToCartesian(mean, P, alpha, beta, kappa) → { mean, P }",
      starterSource: starter("unscentedPolarToCartesian", "mean, P, alpha, beta, kappa", "mean.x is range, mean.y is bearing. Map each sigma point through (r·cos θ, r·sin θ), then unscentedTransform."),
      referenceSource: lines(
        "function unscentedPolarToCartesian(mean, P, alpha, beta, kappa) {",
        "  var sigma = sigmaPoints(mean, P, alpha, beta, kappa);",
        "  var mapped = sigma.points.map(function (p) { return { x: p.x * Math.cos(p.y), y: p.x * Math.sin(p.y) }; });",
        "  return unscentedTransform(mapped, sigma.wm, sigma.wc);",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      dependencies: ["sigma-points", "unscented-transform"],
      reference: bookref(CH10, "nonlinear transform of a Gaussian (see also 09-Nonlinear-Filtering)"),
      scene: { kind: "bayes", view: "polar", handles: [
        { id: "range", type: "slider", label: "range (m)", value: 2, min: 0.8, max: 2.6 },
        { id: "bearing", type: "slider", label: "bearing (rad)", value: 0.6, min: -1.4, max: 1.4 },
        { id: "sigmaTheta", type: "slider", label: "σ bearing (rad)", value: 0.4, min: 0.1, max: 0.7 },
      ], args: [{ fixture: "polarMean" }, { fixture: "polarP" }, 1, 2, 1] },
      diagnoses: [
        diagnosis("mean-through-function", "The mean was mapped directly; the unscented mean is the weighted average of the mapped points, which sits inside the curve.", lines(
          "function unscentedPolarToCartesian(mean, P, alpha, beta, kappa) {",
          "  var sigma = sigmaPoints(mean, P, alpha, beta, kappa);",
          "  var mapped = sigma.points.map(function (p) { return { x: p.x * Math.cos(p.y), y: p.x * Math.sin(p.y) }; });",
          "  var center = { x: mean.x * Math.cos(mean.y), y: mean.x * Math.sin(mean.y) };",
          "  var cov = [[0, 0], [0, 0]];",
          "  for (var i = 0; i < mapped.length; i += 1) {",
          "    var dx = mapped[i].x - center.x, dy = mapped[i].y - center.y;",
          "    cov[0][0] += sigma.wc[i] * dx * dx; cov[0][1] += sigma.wc[i] * dx * dy; cov[1][0] += sigma.wc[i] * dx * dy; cov[1][1] += sigma.wc[i] * dy * dy;",
          "  }",
          "  return { mean: center, P: cov };",
          "}"
        )),
        diagnosis("no-transform", "The sigma points were never pushed through polar → cartesian.", lines(
          "function unscentedPolarToCartesian(mean, P, alpha, beta, kappa) {",
          "  var sigma = sigmaPoints(mean, P, alpha, beta, kappa);",
          "  return unscentedTransform(sigma.points, sigma.wm, sigma.wc);",
          "}"
        )),
      ],
      hints: ["sigmaPoints(mean, P, alpha, beta, kappa) in polar space.", "Map each point: x = r·cos θ, y = r·sin θ.", "unscentedTransform(mapped, wm, wc)."],
      cases: [
        example([{ x: 2, y: 0 }, POLAR_P, 1, 0, 1], { mean: { x: 5 / 3, y: 0 }, P: [[5 / 9, 0], [0, 1]] }, "straight ahead"),
        example([{ x: 1, y: PI / 2 }, POLAR_P, 1, 0, 1], { mean: { x: 0, y: 5 / 6 }, P: [[0.25, 0], [0, 7 / 18]] }, "to the left"),
        example([{ x: 1, y: 0 }, POLAR_P, 1, 0, 1], { mean: { x: 5 / 6, y: 0 }, P: [[7 / 18, 0], [0, 0.25]] }, "closer target"),
      ],
    }),
    puzzle({
      number: 110, id: "rts-smoother-step", track: "bayes", title: "One RTS Smoother Step",
      goal: "Pull a filtered estimate towards the smoothed estimate that follows it.",
      concept: "Smoothing runs backwards: knowing where the state ended up tightens every earlier estimate.",
      functionName: "rtsSmootherStep", signature: "rtsSmootherStep(x, P, xNext, PNext, F, Q) → { x, P }",
      starterSource: starter("rtsSmootherStep", "x, P, xNext, PNext, F, Q", "Pp = F P Fᵀ + Q; K = P Fᵀ Pp⁻¹; x += K (xNext − F x); P += K (PNext − Pp) Kᵀ."),
      referenceSource: lines(
        "function rtsSmootherStep(x, P, xNext, PNext, F, Q) {",
        "  var ft = [[F[0][0], F[1][0]], [F[0][1], F[1][1]]];",
        "  var spread = matMul2(matMul2(F, P), ft);",
        "  var pp = [[spread[0][0] + Q[0][0], spread[0][1] + Q[0][1]], [spread[1][0] + Q[1][0], spread[1][1] + Q[1][1]]];",
        "  var k = matMul2(matMul2(P, ft), matInv2(pp));",
        "  var kt = [[k[0][0], k[1][0]], [k[0][1], k[1][1]]];",
        "  var fx = [F[0][0] * x[0] + F[0][1] * x[1], F[1][0] * x[0] + F[1][1] * x[1]];",
        "  var dx = [xNext[0] - fx[0], xNext[1] - fx[1]];",
        "  var dp = [[PNext[0][0] - pp[0][0], PNext[0][1] - pp[0][1]], [PNext[1][0] - pp[1][0], PNext[1][1] - pp[1][1]]];",
        "  var gain = matMul2(matMul2(k, dp), kt);",
        "  return {",
        "    x: [x[0] + k[0][0] * dx[0] + k[0][1] * dx[1], x[1] + k[1][0] * dx[0] + k[1][1] * dx[1]],",
        "    P: [[P[0][0] + gain[0][0], P[0][1] + gain[0][1]], [P[1][0] + gain[1][0], P[1][1] + gain[1][1]]],",
        "  };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "time-buffer",
      dependencies: ["mat-mul-2", "mat-inv-2"],
      reference: bookref(CH13, "rts_smoother"),
      scene: { kind: "bayes", view: "rts", handles: [
        { id: "x", type: "point", label: "filtered k (position, velocity)", value: { x: -2, y: 1 } },
        { id: "xNext", type: "point", label: "smoothed k+1", value: { x: -0.5, y: 0.8 } },
      ], args: [{ fixture: "rtsX" }, { fixture: "rtsP" }, { fixture: "rtsXNext" }, { fixture: "rtsPNext" }, { fixture: "rtsF" }, { fixture: "rtsQ" }] },
      diagnoses: [
        diagnosis("no-process-noise", "The predicted covariance Pp must include Q, exactly as in the forward predict.", lines(
          "function rtsSmootherStep(x, P, xNext, PNext, F, Q) {",
          "  var ft = [[F[0][0], F[1][0]], [F[0][1], F[1][1]]];",
          "  var pp = matMul2(matMul2(F, P), ft);",
          "  var k = matMul2(matMul2(P, ft), matInv2(pp));",
          "  var kt = [[k[0][0], k[1][0]], [k[0][1], k[1][1]]];",
          "  var fx = [F[0][0] * x[0] + F[0][1] * x[1], F[1][0] * x[0] + F[1][1] * x[1]];",
          "  var dx = [xNext[0] - fx[0], xNext[1] - fx[1]];",
          "  var dp = [[PNext[0][0] - pp[0][0], PNext[0][1] - pp[0][1]], [PNext[1][0] - pp[1][0], PNext[1][1] - pp[1][1]]];",
          "  var gain = matMul2(matMul2(k, dp), kt);",
          "  return {",
          "    x: [x[0] + k[0][0] * dx[0] + k[0][1] * dx[1], x[1] + k[1][0] * dx[0] + k[1][1] * dx[1]],",
          "    P: [[P[0][0] + gain[0][0], P[0][1] + gain[0][1]], [P[1][0] + gain[1][0], P[1][1] + gain[1][1]]],",
          "  };",
          "}"
        )),
        diagnosis("gain-not-transposed", "The covariance correction is K (PNext − Pp) Kᵀ; the right-hand factor must be transposed.", lines(
          "function rtsSmootherStep(x, P, xNext, PNext, F, Q) {",
          "  var ft = [[F[0][0], F[1][0]], [F[0][1], F[1][1]]];",
          "  var spread = matMul2(matMul2(F, P), ft);",
          "  var pp = [[spread[0][0] + Q[0][0], spread[0][1] + Q[0][1]], [spread[1][0] + Q[1][0], spread[1][1] + Q[1][1]]];",
          "  var k = matMul2(matMul2(P, ft), matInv2(pp));",
          "  var fx = [F[0][0] * x[0] + F[0][1] * x[1], F[1][0] * x[0] + F[1][1] * x[1]];",
          "  var dx = [xNext[0] - fx[0], xNext[1] - fx[1]];",
          "  var dp = [[PNext[0][0] - pp[0][0], PNext[0][1] - pp[0][1]], [PNext[1][0] - pp[1][0], PNext[1][1] - pp[1][1]]];",
          "  var gain = matMul2(matMul2(k, dp), k);",
          "  return {",
          "    x: [x[0] + k[0][0] * dx[0] + k[0][1] * dx[1], x[1] + k[1][0] * dx[0] + k[1][1] * dx[1]],",
          "    P: [[P[0][0] + gain[0][0], P[0][1] + gain[0][1]], [P[1][0] + gain[1][0], P[1][1] + gain[1][1]]],",
          "  };",
          "}"
        )),
      ],
      hints: ["Pp is the forward prediction of P: F P Fᵀ + Q.", "K = P Fᵀ Pp⁻¹ using matMul2 and matInv2.", "x += K (xNext − F x); P += K (PNext − Pp) Kᵀ."],
      cases: [
        example([[0, 1], M2_I, [1, 1], P_STRAIGHT_2, F_UNIT, M2_ZERO], { x: [0, 1], P: M2_I }, "next state agrees"),
        example([[0, 1], M2_I, [2, 1], P_STRAIGHT_2, F_UNIT, M2_ZERO], { x: [1, 1], P: M2_I }, "next state further ahead"),
        example([[0, 0], M2_I, [0, 0], M2_I, M2_I, M2_I], { x: [0, 0], P: [[0.75, 0], [0, 0.75]] }, "tighter future shrinks P"),
        example([[0, 0], M2_I, [0, 0], M2_I, F_UNIT, M2_ZERO], { x: [0, 0], P: [[2, -1], [-1, 1]] }, "correlated correction"),
      ],
    }),
  ];

  const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7, TOOLKIT_8, TOOLKIT_9, TOOLKIT_10, TOOLKIT_11, TOOLKIT_12, ADVANCED_13, ADVANCED_14, ADVANCED_15, CORRECTION_16, CORRECTION_17, CORRECTION_18, CORRECTION_19, ESTIMATION_19, ESTIMATION_20, ESTIMATION_21, BAYES_22, BAYES_23, BAYES_24));
  const byId = new Map(PUZZLES.map((entry) => [entry.id, entry]));

  function getPuzzle(id) {
    return byId.get(id) || null;
  }

  const api = Object.freeze({
    TF2_PUZZLE_STAGES: Object.freeze(STAGES.concat(TOOLKIT_STAGES, ADVANCED_STAGES, CORRECTION_STAGES, ESTIMATION_STAGES, BAYES_STAGES)),
    TF2_PUZZLE_TRACKS: TRACKS,
    TF2_PUZZLES: PUZZLES,
    getPuzzle,
  });

  Object.assign(root, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
